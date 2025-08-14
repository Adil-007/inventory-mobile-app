import apiClient from '../lib/apiClient';
import authService from '../services/authService';

// Get summary for a specific month (income, expense, low stock, out of stock)
export const fetchMonthlySummary = async (year: number, month: number) => {
  const accessToken = await authService.getAccessToken();

  const res = await apiClient.get('/reports/summary', {
    params: { year, month },
    headers: {
      Authorization: `Bearer ${accessToken}` // ✅ attach token
    }
  });

  return res.data;
};

// Get income/expense trend data for the full year (used in line chart)
export const fetchYearlyTrends = async (year: number) => {
  const accessToken = await authService.getAccessToken();

  const res = await apiClient.get('/reports/trends', {
    params: { year },
    headers: {
      Authorization: `Bearer ${accessToken}` // ✅ attach token
    }
  });

  return res.data;
};

// Get list of years that contain sales or expenses
export const getAvailableYears = async () => {
  const accessToken = await authService.getAccessToken();

  const res = await apiClient.get('/reports/years', {
    headers: {
      Authorization: `Bearer ${accessToken}` // ✅ attach token
    }
  });

  return res.data;
};

// Export as default object
const reportService = {
  fetchMonthlySummary,
  fetchYearlyTrends,
  getAvailableYears
};

export default reportService;
