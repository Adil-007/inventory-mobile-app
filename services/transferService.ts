import axios from '../lib/apiClient';

const getAllTransfers = async () => {
  const response = await axios.get('/transfers');
  return response.data;
};

const getTransferById = async (id: string) => {
  const response = await axios.get(`/transfers/${id}`);
  return response.data;
};

const addTransfer = async (transferData: {
  sourceWarehouse: string;
  destinationWarehouse: string;
  product: string;
  quantity: number;
  date: string;
}) => {
  const response = await axios.post('/transfers', transferData);
  return response.data;
};

const updateTransfer = async (
  id: string,
  transferData: {
    sourceWarehouse: string;
    destinationWarehouse: string;
    product: string;
    quantity: number;
    date: string;
  }
) => {
  const response = await axios.put(`/transfers/${id}`, transferData);
  return response.data;
};

const deleteTransfer = async (id: string) => {
  const response = await axios.delete(`/transfers/${id}`);
  return response.data;
};

export default {
  getAllTransfers,
  getTransferById, // ✅ now included
  addTransfer,
  updateTransfer,
  deleteTransfer,
};
