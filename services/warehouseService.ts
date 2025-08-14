import apiClient from '../lib/apiClient';

interface WarehouseData {
  name: string;
  location?: string;
}

// Get all warehouses
const getAllWarehouses = async () => {
  const response = await apiClient.get('/warehouses');
  return response.data;
};

// Add a new warehouse
const addWarehouse = async (warehouseData: WarehouseData) => {
  const response = await apiClient.post('/warehouses', warehouseData);
  return response.data;
};

// Update a warehouse
const updateWarehouse = async (warehouseId: string, updatedData: WarehouseData) => {
  const response = await apiClient.put(`/warehouses/${warehouseId}`, updatedData);
  return response.data;
};

// Delete a warehouse
const deleteWarehouse = async (warehouseId: string) => {
  const response = await apiClient.delete(`/warehouses/${warehouseId}`);
  return response.data;
};

export default {
  getAllWarehouses,
  addWarehouse,
  updateWarehouse,
  deleteWarehouse,
};
