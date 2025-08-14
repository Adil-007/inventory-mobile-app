import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import i18n from '../i18n'; // ✅ to access translations
import apiClient from '../lib/apiClient';

const downloadImportTemplate = async () => {
  try {
    const url = `${apiClient.defaults.baseURL}/templates/template.xlsx`;
    const fileName = 'template.xlsx';
    const localPath = FileSystem.documentDirectory + fileName;

    const fileExists = await FileSystem.getInfoAsync(localPath);
    if (fileExists.exists) {
      await FileSystem.deleteAsync(localPath, { idempotent: true });
    }

    const { uri } = await FileSystem.downloadAsync(url, localPath);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri);
    } else {
      alert(i18n.t('common.sharingNotAvailable'));
    }
  } catch (error: any) {
    if (__DEV__) {
      console.error('❌ Download error:', error.message);
    }
    throw new Error(i18n.t('common.downloadFailed'));
  }
};

const uploadImportFile = async (file: { uri: string; name: string; mimeType?: string }) => {
  try {
    const formData = new FormData();

    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type:
        file.mimeType ||
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    } as any);

    const response = await apiClient.post('/import/products', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error: any) {
    if (__DEV__) {
      console.error('❌ Upload error:', error?.response?.data || error.message);
    }
    throw new Error(i18n.t('common.uploadFailed'));
  }
};

const parseExcelFile = async (file: any) => {
  try {
    const fileUri = file.assets?.[0]?.uri || file.uri;

    const b64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const workbook = XLSX.read(b64, { type: 'base64' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet);

    const normalized = jsonData.map((row: any) => ({
      name: row.Name,
      category: row.Category,
      unit: row.Unit,
      quantity: row.Quantity,
      warehouse: row.Warehouse,
      brand: row.Brand,
    }));

    return { data: normalized, errors: [] };
  } catch (err: any) {
    if (__DEV__) {
      console.error('Excel parsing error:', err.message);
    }
    throw new Error(i18n.t('importProducts.invalidTemplate'));
  }
};

export default {
  downloadImportTemplate,
  uploadImportFile,
  parseExcelFile,
};
