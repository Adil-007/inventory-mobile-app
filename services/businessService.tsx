import apiClient from '../lib/apiClient';

// 1. Get all businesses
const getAllBusinesses = async () => {
  const res = await apiClient.get('/businesses');
  return res.data;
};

// 2. Toggle subscriptionStatus for a business
const toggleSubscriptionStatus = async (businessId: string) => {
  const res = await apiClient.patch(`/businesses/${businessId}/toggle-subscription`);
  return res.data;
};

// 3. Get users under a specific business
const getUsersByBusiness = async (businessId: string) => {
  const res = await apiClient.get(`/businesses/${businessId}/users`);
  return res.data;
};

const businessService = {
  getAllBusinesses,
  toggleSubscriptionStatus,
  getUsersByBusiness,
};

export default businessService;
