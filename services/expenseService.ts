import apiClient from '../lib/apiClient';

export interface ExpensePayload {
  amount: number;
  date: string;
  category: string;
  paymentMethod: string;
  note?: string;
  receiptProvided?: boolean;
  description: string;  // Add this line
  receipt: boolean;
}

// Create a new expense
const addExpense = async (data: ExpensePayload) => {
  const res = await apiClient.post('/expenses', data);
  return res.data;
};

// Get all expenses
const getAllExpenses = async () => {
  const res = await apiClient.get('/expenses');
  return res.data;
};

// Get a single expense by ID
const getExpenseById = async (id: string) => {
  const res = await apiClient.get(`/expenses/${id}`);
  return res.data;
};

// Update an expense by ID
const editExpense = async (id: string, data: ExpensePayload) => {
  const res = await apiClient.put(`/expenses/${id}`, data);
  return res.data;
};

// Delete an expense by ID
const deleteExpense = async (id: string) => {
  const res = await apiClient.delete(`/expenses/${id}`);
  return res.data;
};

// ✅ NEW: Get categories and payment methods from backend enum
const getExpenseOptions = async () => {
  const res = await apiClient.get('/config/expense-options');
  return res.data;
};

export default {
  addExpense,
  getAllExpenses,
  getExpenseById,
  editExpense,
  deleteExpense,
  getExpenseOptions, // ✅ Exported here
};
