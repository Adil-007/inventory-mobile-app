import i18n from '../i18n'; // ✅ import i18n instance for translations
import apiClient from '../lib/apiClient';

const deleteBusinessData = async () => {
  try {
    const response = await apiClient.delete('/data/delete-business-data');
    return response.data;
  } catch (error: any) {
    if (__DEV__) {
      console.error('❌ Delete data error:', error.response?.data || error.message);
    }
    throw error.response?.data || { message: i18n.t('common.unknownError') };
  }
};

export default {
  deleteBusinessData,
};
