import apiClient from '../lib/apiClient';

// Logged-in user's profile type (you can adjust as needed)
interface UpdateProfileData {
  name: string;
  email: string;
  phone: string;
}

interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

interface InitiateUserPayload {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role?: string; // e.g., 'user' | 'admin'
}

interface VerifyUserPayload {
  email: string;
  code: string;
}

// Fetch logged-in user's profile
const getProfile = async () => {
  const res = await apiClient.get('/users/me');
  return res.data;
};

// Update logged-in user's profile
const updateProfile = async (data: UpdateProfileData) => {
  const res = await apiClient.put('/users/me', data);
  return res.data;
};

// Change password
const changePassword = async (data: ChangePasswordData) => {
  const res = await apiClient.put('/users/change-password', data);
  return res.data;
};

// Admin: Get all users
const getAllUsers = async () => {
  const res = await apiClient.get('/users');
  return res.data.users;
};

// Admin Step 1: Initiate user creation (sends verification code to email)
const initiateUserCreate = async (user: InitiateUserPayload) => {
  const res = await apiClient.post('/users/initiate', user);
  return res.data.tempUserId;
};

// Admin Step 2: Finalize user creation with verification code
const verifyUser = async ({ email, code }: VerifyUserPayload) => {
  const res = await apiClient.post('/users/verify', { email, code });
  return res.data.user;
};

// Admin: Delete user
const deleteUser = async (id: string) => {
  const res = await apiClient.delete(`/users/${id}`);
  return res.data;
};

export default {
  getProfile,
  updateProfile,
  changePassword,
  getAllUsers,
  initiateUserCreate,
  verifyUser,
  deleteUser,
};
