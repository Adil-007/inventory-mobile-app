import apiClient from '../lib/apiClient';

interface SaleData {
  product: string;
  warehouse?: string; // ✅ optional
  quantity: number;
  price: number;
  amountPaid: number;
  paymentStatus?: 'paid' | 'partial' | 'credit'; // ✅ optional
  status?: 'pending' | 'approved' | 'rejected'; // ✅ optional
  customerName: string;
  date: string;
  creditTerm?: number;
  dueDate?: string;
  createdBy?: string;
}


interface PaymentData {
  amountPaid: number;
  date: string;
  method?: string;
}

interface GetSalesParams {
  page?: number;
  limit?: number;
  search?: string; // this will be sent as `q` to backend
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string;
  paymentStatus?: string; // Added
  paymentChannel?: string;
  warehouse?: string;
  startDate?: string;
  endDate?: string;
}

const saleService = {
  // Get all sales with pagination, search, sort, and filters
  getAllSales: async (params?: GetSalesParams) => {
    const cleanParams = {
      page: params?.page,
      limit: params?.limit,
      ...(params?.search && { q: params.search }), // ✅ match backend `q`
      ...(params?.sortField && { sortField: params.sortField }),
      ...(params?.sortOrder && { sortOrder: params.sortOrder }),
      ...(params?.status && { status: params.status }),
      ...(params?.paymentStatus && { paymentStatus: params.paymentStatus }), // ✅ Added
      ...(params?.paymentChannel && { paymentChannel: params.paymentChannel }), // ✅ Added
      ...(params?.warehouse && { warehouse: params.warehouse }),
      ...(params?.startDate && { startDate: params.startDate }),
      ...(params?.endDate && { endDate: params.endDate }),
    };

    const res = await apiClient.get('/sales', { params: cleanParams });
    return res.data; // { sales, total, page, totalPages }
  },

  // Add new sale
  addSale: async (data: SaleData) => {
    const res = await apiClient.post('/sales', data, {
      headers: { 'Content-Type': 'application/json' },
    });
    return res.data;
  },

  // Get a sale by ID
  getSaleById: async (id: string) => {
    const res = await apiClient.get(`/sales/${id}`);
    return res.data;
  },

  // Update a sale
  updateSale: async (id: string, data: Partial<SaleData>) => {
    const res = await apiClient.put(`/sales/${id}`, data, {
      headers: { 'Content-Type': 'application/json' },
    });
    return res.data;
  },

  // Mark as paid
  markAsPaid: async (saleId: string, paymentData: PaymentData) => {
    const res = await apiClient.put(`/sales/${saleId}/mark-paid`, paymentData);
    return res.data;
  },

  // Delete a sale
  deleteSale: async (id: string) => {
    const res = await apiClient.delete(`/sales/${id}`);
    return res.data;
  },

  // Approve a sale
  approveSale: async (id: string) => {
    const res = await apiClient.put(`/sales/${id}/approve`);
    return res.data;
  },

  // Reject a sale
  rejectSale: async (id: string) => {
    const res = await apiClient.put(`/sales/${id}/reject`);
    return res.data;
  },
};

export default saleService;
