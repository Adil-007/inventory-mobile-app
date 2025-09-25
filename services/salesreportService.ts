import apiClient from '../lib/apiClient';

const reportService = {
  getSalesReport: async (filters: any) => {
    try {
      const res = await apiClient.post("/salesreport/report", filters);
      return res.data;
    } catch (error: any) {
      console.error("Error fetching sales report:", error);
      throw error.response?.data || { error: "Failed to fetch sales report" };
    }
  },
};


export default reportService;
