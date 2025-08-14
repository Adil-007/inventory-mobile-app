import apiClient from '../lib/apiClient';

interface AdminCreationPayload {
  name: string;
  email: string;
  password: string;
}

interface AdminVerificationPayload {
  email: string;
  code: string;
}
const initiateAdminCreation = async (payload: AdminCreationPayload) => {
  try {
    const res = await apiClient.post('/admins/initiate-admin', payload);
    return res.data;
  } catch (err: any) {
    throw err.response?.data || { message: 'Something went wrong during admin initiation' };
  }
};

const verifyAdminCode = async (payload: AdminVerificationPayload) => {
  try {
    const res = await apiClient.post('/admins/verify-admin', payload);
    return res.data;
  } catch (err: any) {
    throw err.response?.data || { message: 'Verification failed' };
  }
};

export default {
  initiateAdminCreation,
  verifyAdminCode,
};
