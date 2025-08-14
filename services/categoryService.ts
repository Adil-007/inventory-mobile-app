import apiClient from '../lib/apiClient';

const categoryService = {
  // Get all categories
  getAllCategories: async () => {
    const res = await apiClient.get('/categories');
    return res.data;
  },

  // ✅ Get category counts (product count per category)
  getCategoryCounts: async () => {
    const res = await apiClient.get('/categories/counts');
    return res.data;
  },

  // Create a new category
  createCategory: async (categoryData: { name: string }) => {
    const res = await apiClient.post('/categories', categoryData);
    return res.data;
  },

  // Update existing category by ID
  updateCategory: async (id: string, updatedData: { name: string }) => {
    const res = await apiClient.put(`/categories/${id}`, updatedData);
    return res.data;
  },

  // Delete category by ID
  deleteCategory: async (id: string) => {
    const res = await apiClient.delete(`/categories/${id}`);
    return res.data;
  },
};

export default categoryService;
