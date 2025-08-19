import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { Alert } from 'react-native';
import { logout, setAccessToken } from '../app/store/authSlice';
import { store } from '../app/store/index';
import { isOnline } from '../services/networkService'; // ✅ new import

const apiClient = axios.create({
  baseURL: 'http://172.20.10.4:5000/api',
  withCredentials: true,
});

// =========================================
// ===== Debounced Alert Helper ============

let isAlertShown = false;

function showAlert(title: string, message: string) {
  if (isAlertShown) return;
  isAlertShown = true;
  Alert.alert(title, message, [
    {
      text: 'OK',
      onPress: () => {
        isAlertShown = false;
      },
    },
  ]);
}

// =========================================
// ==== REFRESH TOKEN LOGIC ====

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

const addSubscriber = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

// ==== REQUEST INTERCEPTOR ====
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // ✅ Check network before any request
    if (!isOnline()) {
      return Promise.reject({ isOffline: true, message: 'No internet connection' });
    }

    // ✅ Attach token
    const state = store.getState();
    const token = state.auth.accessToken;
    if (token) {
      config.headers = config.headers ?? {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ==== RESPONSE INTERCEPTOR ====
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    // ✅ Offline request blocked
    if (error.isOffline) {
      showAlert('No Internet', 'Please check your connection and try again.');
      return Promise.reject(error);
    }

    // ✅ Global network/server error handling
    if (!error.response) {
      showAlert(
        'Network Error',
        'Unable to reach the server. Please check your connection or try again later.'
      );
      return Promise.reject(error);
    }

    if (error.response.status >= 500) {
      showAlert(
        'Server Error',
        'Something went wrong on our end. Please try again later.'
      );
      return Promise.reject(error);
    }

    const originalRequest = error.config;

    // ===== Refresh Token Logic (unchanged) =====
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'ACCESS_EXPIRED' &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          addSubscriber((token: string) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post<{ accessToken: string }>(
          'http://172.20.10.4:5000/api/auth/refresh-token',
          {},
          { withCredentials: true }
        );

        store.dispatch(setAccessToken(data.accessToken));
        onRefreshed(data.accessToken);

        originalRequest.headers['Authorization'] = `Bearer ${data.accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        const state = store.getState();
        if (state.auth.accessToken) {
          showAlert('Session Expired', 'Your session has expired. Please log in again.');
        }
        store.dispatch(logout());
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Refresh token expired or invalid
    if (
      error.response?.status === 401 &&
      ['REFRESH_EXPIRED', 'REFRESH_INVALID', 'ACCESS_INVALID', 'NO_ACCESS_TOKEN'].includes(
        error.response?.data?.code
      )
    ) {
      const state = store.getState();
      if (state.auth.accessToken) {
        showAlert('Session Expired', 'Your session has expired. Please log in again.');
      }
      store.dispatch(logout());
    }

    return Promise.reject(error);
  }
);

export default apiClient;
