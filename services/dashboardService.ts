import apiClient from '../lib/apiClient';

const getSummary = async () => {
  const res = await apiClient.get('/dashboard/summary');
  return res.data;
};

const getRecentActivity = async () => {
  const res = await apiClient.get('/dashboard/recent-activity');
  return res.data;
};

const getThreshold = async () => {
  const res = await apiClient.get('/dashboard/threshold');
  return res.data;
};

const getOutOfStock = async () => {
  const res = await apiClient.get('/dashboard/out-of-stock');
  return res.data;
};

const getLowStock = async () => {
  const res = await apiClient.get('/dashboard/low-stock');
  return res.data;
};

const updateThreshold = async (threshold: number) => {
  const res = await apiClient.put('/dashboard/threshold', { threshold });
  return res.data;
};

export default {
  getSummary,
  getRecentActivity,
  getThreshold,
  updateThreshold,
  getOutOfStock,
  getLowStock
};
