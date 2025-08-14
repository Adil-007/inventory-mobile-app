import * as SecureStore from 'expo-secure-store';
import api from '../lib/apiClient';

interface LoginCredentials {
  email: string;
  password: string;
}

const login = async (credentials: LoginCredentials) => {
  const { data } = await api.post('/auth/login', credentials);
  return data as { accessToken: string; user: any };
};

const refreshAccessToken = async () => {
  const { data } = await api.post('/auth/refresh-token');
  return data; // { accessToken }
};


const logout = async () => {
  try { await api.post('/auth/logout'); } catch {}
  await Promise.all([
    SecureStore.deleteItemAsync('accessToken'),
    SecureStore.deleteItemAsync('user'),
    SecureStore.deleteItemAsync('userId'),
  ]);
};


// GET ACCESS TOKEN
const getAccessToken = async () => {
  return await SecureStore.getItemAsync('accessToken');
};


// ✅ STEP 1: Request Password Reset
const requestPasswordReset = async (email: string, newPassword: string) => {
  const res = await api.post('/auth/request-password-reset', {
    email,
    newPassword
  });
  return res.data;
};

// ✅ STEP 2: Verify Reset Code and Finalize
const verifyPasswordReset = async (email: string, code: string, newPassword: string) => {
  const res = await api.post('/auth/verify-password-reset', {
    email,
    code,
    newPassword
  });
  return res.data;
};

const authService = {
  login,
  logout,
  getAccessToken,
  refreshAccessToken,
  requestPasswordReset,
  verifyPasswordReset,
};

export default authService;
