import i18n from '../i18n';
import apiClient from '../lib/apiClient';

interface Product {
  _id: string;
  name: string;
  brand: string;
  quantity: number;
  category: {
    _id: string;
    name: string;
  };
  unit: string;
  warehouse: {
    _id: string;
    name: string;
  };
  image?: string;
  buyingPrice?: number;
  sellingPrice?: number;
  createdAt?: string;
}


interface PaginatedProducts {
  products: Product[];
  total: number;
  totalPages: number;
}

export interface NewProduct {
  name: string;
  brand?: string;
  quantity: number;
  category: string;
  unit: string;
  warehouse: string;
  image?: string | null;
  buyingPrice?: number | null;
  sellingPrice?: number | null;
  status?: 'approved' | 'rejected';
}

interface GetProductsParams {
  page?: number;
  limit?: number;
  warehouse?: string;
  category?: string;
  stockStatus?: 'in' | 'low' | 'out';
  search?: string;
  sortField?: 'name' | 'quantity' | 'createdAt' | 'price';
  sortOrder?: 'asc' | 'desc';
}

// ✅ Upload image to backend-controlled Firebase
const uploadImage = async (imageFileUri: string): Promise<string | null> => {
  try {
    const formData = new FormData();
    formData.append('image', {
      uri: imageFileUri,
      name: `product-${Date.now()}.jpg`,
      type: 'image/jpeg',
    } as any);

    const res = await apiClient.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return res.data.imageUrl;
  } catch {
    if (__DEV__) {
      // console.error('Image upload failed:', err);
    }
    throw new Error(i18n.t('products.imageUploadFailed'));
  }
};

const addProduct = async (data: NewProduct) => {
  try {
    const res = await apiClient.post('/products', data);
    return res.data;
  } catch (err: any) {
    if (__DEV__) {
      // console.error('Add product failed:', err.response?.data || err.message);
    }
    throw err.response?.data || { message: i18n.t('products.addFailed') };
  }
};

const getAllProducts = async (params?: GetProductsParams): Promise<PaginatedProducts> => {
  try {
    const cleanParams = {
      page: params?.page,
      limit: params?.limit,
      ...(params?.warehouse && { warehouse: params.warehouse }),
      ...(params?.category && { category: params.category }),
      ...(params?.stockStatus && { stockStatus: params.stockStatus }),
      ...(params?.search && { q: params.search }),
      ...(params?.sortField && { sortField: params.sortField }),
      ...(params?.sortOrder && { sortOrder: params.sortOrder }),
    };

    const res = await apiClient.get('/products', { params: cleanParams });
    return res.data;
  } catch (err: any) {
    if (__DEV__) {
      // console.error('Get products failed:', err.response?.data || err.message);
    }
    throw err.response?.data || { message: i18n.t('products.fetchFailed') };
  }
};

const getProductList = async (warehouseId?: string) => {
  try {
    const url = warehouseId
      ? `/products/list?warehouseId=${warehouseId}`
      : `/products/list`;
    const res = await apiClient.get(url);
    return res.data;
  } catch (err: any) {
    if (__DEV__) {
      // console.error('Get product list failed:', err.response?.data || err.message);
    }
    throw err.response?.data || { message: i18n.t('products.fetchFailed') };
  }
};

const getByWarehouse = async (warehouseId: string) => {
  try {
    const res = await apiClient.get(`/products/by-warehouse/${warehouseId}`);
    return res.data;
  } catch (err: any) {
    if (__DEV__) {
      // console.error('Get by warehouse failed:', err.response?.data || err.message);
    }
    throw err.response?.data || { message: i18n.t('products.fetchFailed') };
  }
};

const getProductById = async (id: string) => {
  try {
    const res = await apiClient.get(`/products/${id}`);
    return res.data;
  } catch (err: any) {
    if (__DEV__) {
      // console.error('Get product by ID failed:', err.response?.data || err.message);
    }
    throw err.response?.data || { message: i18n.t('products.fetchFailed') };
  }
};

const editProduct = async (id: string, data: Partial<Product>) => {
  try {
    const res = await apiClient.put(`/products/${id}`, data);
    return res.data;
  } catch (err: any) {
    if (__DEV__) {
      // console.error('Edit product failed:', err.response?.data || err.message);
    }
    throw err.response?.data || { message: i18n.t('products.updateFailed') };
  }
};

const deleteProduct = async (id: string) => {
  try {
    const res = await apiClient.delete(`/products/${id}`);
    return res.data;
  } catch (err: any) {
    if (__DEV__) {
      // console.error('Delete product failed:', err.response?.data || err.message);
    }
    throw err.response?.data || { message: i18n.t('products.deleteFailed') };
  }
};

export default {
  uploadImage,
  addProduct,
  getAllProducts,
  getProductById,
  editProduct,
  deleteProduct,
  getProductList,
  getByWarehouse,
};
