import { Feather } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTranslation } from 'react-i18next';

import productService from '../../services/productService';
import transferService from '../../services/transferService';
import warehouseService from '../../services/warehouseService';

import useNetworkStatus from '../../hooks/useNetworkStatus'; // Network status hook

interface Warehouse {
  _id: string;
  name: string;
}

interface Product {
  _id: string;
  name: string;
  price: number;
  unit: string;
  quantity: number;
}

export default function AddTransferScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { isConnected } = useNetworkStatus();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);


  const [sourceWarehouse, setSourceWarehouse] = useState<string>('');
  const [destinationWarehouse, setDestinationWarehouse] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [quantity, setQuantity] = useState<string>('');
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  const [showProductDropdown, setShowProductDropdown] = useState<boolean>(false);
  const [productSearch, setProductSearch] = useState<string>('');

  const [warehousesLoading, setWarehousesLoading] = useState<boolean>(false);
  const [productsLoading, setProductsLoading] = useState<boolean>(false);

  const [warehousesError, setWarehousesError] = useState<string | null>(null);
  const [productsError, setProductsError] = useState<string | null>(null);

  // Track offline alert shown only once per offline event
  const [offlineErrorShown, setOfflineErrorShown] = useState(false);

  useEffect(() => {
    const fetchWarehouses = async () => {
      if (!isConnected) {
        if (!offlineErrorShown) {
          setOfflineErrorShown(true);
        }
        setWarehousesError(t('addTransfer.failedToLoadWarehouses'));
        setWarehousesLoading(false);
        return;
      }
      setOfflineErrorShown(false);
      setWarehousesError(null);
      setWarehousesLoading(true);

      try {
        const data = await warehouseService.getAllWarehouses();
        setWarehouses(data);
      } catch {
        // Avoid alert here, just inline error
        setWarehousesError(t('addTransfer.failedToLoadWarehouses'));
      } finally {
        setWarehousesLoading(false);
      }
    };
    fetchWarehouses();
  }, [t, isConnected, offlineErrorShown]);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!sourceWarehouse) return;

      if (!isConnected) {
        if (!offlineErrorShown) {
          Alert.alert(t('common.offlineTitle'), t('common.offlineMessage'));
          setOfflineErrorShown(true);
        }
        setProductsError(t('addTransfer.failedToLoadProducts'));
        setProductsLoading(false);
        return;
      }
      setOfflineErrorShown(false);
      setProductsError(null);
      setProductsLoading(true);

      try {
        const data = await productService.getByWarehouse(sourceWarehouse);
        setProducts(data);
        setFilteredProducts(data);
      } catch {
        // Avoid alert here; just inline error
        setProductsError(t('addTransfer.failedToLoadProducts'));
      } finally {
        setProductsLoading(false);
      }
    };
    fetchProducts();
  }, [sourceWarehouse, t, isConnected, offlineErrorShown]);

  const handleTransfer = async () => {
    if (isSubmitting) return; // <-- Prevent multiple taps

    if (!sourceWarehouse || !destinationWarehouse || !selectedProduct || !quantity) {
      Alert.alert(t('addTransfer.missingInfo'), t('addTransfer.fillRequiredFields'));
      return;
    }

    if (sourceWarehouse === destinationWarehouse) {
      Alert.alert(t('addTransfer.invalidSelection'), t('addTransfer.differentWarehouses'));
      return;
    }

    if (Number(quantity) > selectedProduct.quantity) {
      Alert.alert(
        t('addTransfer.insufficientStock'),
        t('addTransfer.onlyAvailable', { quantity: selectedProduct.quantity, unit: selectedProduct.unit }),
      );
      return;
    }

    setIsSubmitting(true);  // <-- disable subsequent submits here

    try {
      await transferService.addTransfer({
        sourceWarehouse,
        destinationWarehouse,
        product: selectedProduct._id,
        quantity: Number(quantity),
        date: date.toISOString().split('T')[0],
      });

      Alert.alert(t('addTransfer.success'), t('addTransfer.transferCreated'));
      setTimeout(() => router.back(), 1500);
    } catch {
      Alert.alert(t('addTransfer.error'), t('addTransfer.transferFailed'));
    } finally {
      setIsSubmitting(false); // <-- re-enable button here after finishing
    }
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(false);
    setDate(currentDate);
  };

  const handleOpenProductModal = () => {
    if (!sourceWarehouse) {
      Alert.alert(t('addTransfer.selectSourceFirst'), t('addTransfer.selectSourceFirstMsg'));
      return;
    }
    setShowProductDropdown(true);
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setShowProductDropdown(false);
  };

  const handleSearch = (text: string) => {
    setProductSearch(text);
    const filtered = products.filter((p) => p.name.toLowerCase().includes(text.toLowerCase()));
    setFilteredProducts(filtered);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <StatusBar backgroundColor="#f8fafc" barStyle="dark-content" />
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.headerContainer}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
                <Feather name="arrow-left" size={24} color="#1e293b" />
              </TouchableOpacity>
              <Text style={styles.headerText}>{t('addTransfer.title')}</Text>
              <View style={{ width: 24 }} />
            </View>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.sectionLabel}>{t('addTransfer.sourceWarehouse')}</Text>

            {warehousesError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{warehousesError}</Text>
              </View>
            )}

            {warehousesLoading ? (
              <ActivityIndicator size="large" color="#6366f1" />
            ) : (
              <View style={styles.warehouseGrid}>
                {warehouses.map((wh) => (
                  <TouchableOpacity
                    key={wh._id}
                    style={[
                      styles.warehouseButton,
                      sourceWarehouse === wh._id && styles.selectedWarehouseButton,
                    ]}
                    onPress={() => {
                      setSourceWarehouse(wh._id);
                      setSelectedProduct(null);
                      setProductSearch('');
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.warehouseButtonContent}>
                      <Feather
                        name="database"
                        size={18}
                        color={sourceWarehouse === wh._id ? '#fff' : '#6366f1'}
                      />
                      <Text
                        style={[
                          styles.warehouseButtonText,
                          sourceWarehouse === wh._id && styles.selectedWarehouseButtonText,
                        ]}
                      >
                        {wh.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.sectionLabel}>{t('addTransfer.destinationWarehouse')}</Text>
            <View style={styles.warehouseGrid}>
              {warehouses.map((wh) => (
                <TouchableOpacity
                  key={wh._id}
                  style={[
                    styles.warehouseButton,
                    destinationWarehouse === wh._id && styles.selectedWarehouseButton,
                  ]}
                  onPress={() => setDestinationWarehouse(wh._id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.warehouseButtonContent}>
                    <Feather
                      name="archive"
                      size={18}
                      color={destinationWarehouse === wh._id ? '#fff' : '#10b981'}
                    />
                    <Text
                      style={[
                        styles.warehouseButtonText,
                        destinationWarehouse === wh._id && styles.selectedWarehouseButtonText,
                      ]}
                    >
                      {wh.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>{t('addTransfer.product')}</Text>
            <TouchableOpacity onPress={handleOpenProductModal} style={styles.productInput} activeOpacity={0.7}>
              <View style={styles.productInputContent}>
                {selectedProduct ? (
                  <>
                    <Text style={styles.productInputText}>{selectedProduct.name}</Text>
                    <Text style={styles.productInputDetails}>
                      {selectedProduct.price} / {selectedProduct.unit}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.productPlaceholder}>{t('addTransfer.selectProduct')}</Text>
                )}
                <Feather name="chevron-down" size={20} color="#94a3b8" />
              </View>
            </TouchableOpacity>

            {productsError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{productsError}</Text>
              </View>
            )}

            {selectedProduct && (
              <View style={styles.stockInfoContainer}>
                <Text style={styles.stockInfoText}>
                  {t('addTransfer.available')}:{' '}
                  <Text style={styles.stockQuantity}>
                    {selectedProduct.quantity} {selectedProduct.unit}
                  </Text>
                </Text>
              </View>
            )}

            <Text style={styles.sectionLabel}>{t('addTransfer.quantity')}</Text>
            <View style={styles.quantityContainer}>
              <TextInput
                style={styles.quantityInput}
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
                placeholder={t('addTransfer.enterQuantity')}
                placeholderTextColor="#94a3b8"
              />
              {selectedProduct && <Text style={styles.quantityUnit}>{selectedProduct.unit}</Text>}
            </View>

            <Text style={styles.sectionLabel}>{t('addTransfer.transferDate')}</Text>
            <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
              <View style={styles.dateInputContent}>
                <Feather name="calendar" size={18} color="#6366f1" />
                <Text style={styles.dateInputText}>
                  {date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker value={date} mode="date" display="spinner" onChange={handleDateChange} />
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              (!sourceWarehouse || !destinationWarehouse || !selectedProduct || !quantity || isSubmitting) &&
                styles.submitButtonDisabled,
            ]}
            onPress={handleTransfer}
            disabled={!sourceWarehouse || !destinationWarehouse || !selectedProduct || !quantity || isSubmitting} // disable during submit
            activeOpacity={0.7}
          >
            <Text style={styles.submitButtonText}>{t('addTransfer.createTransfer')}</Text>
            <Feather name="truck" size={20} color="#fff" style={styles.submitButtonIcon} />
          </TouchableOpacity>
        </ScrollView>

        <Modal visible={showProductDropdown} transparent animationType="slide" onRequestClose={() => setShowProductDropdown(false)}>
          <TouchableWithoutFeedback onPress={() => setShowProductDropdown(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContainer}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{t('addTransfer.selectProductTitle')}</Text>
                    <TouchableOpacity onPress={() => setShowProductDropdown(false)} style={styles.modalCloseButton} activeOpacity={0.7}>
                      <Feather name="x" size={24} color="#64748b" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.searchContainer}>
                    <Feather name="search" size={20} color="#64748b" style={styles.searchIcon} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder={t('addTransfer.searchProducts')}
                      placeholderTextColor="#94a3b8"
                      value={productSearch}
                      onChangeText={handleSearch}
                      autoFocus
                    />
                  </View>

                  {productsLoading ? (
                    <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                      <ActivityIndicator size="large" color="#6d28d9" />
                      <Text style={{ color: '#6d28d9', marginTop: 10 }}>
                        {t('addTransfer.loadingProducts')}
                      </Text>
                    </View>
                  ) : (
                    <FlatList
                      data={filteredProducts}
                      keyExtractor={(item) => item._id}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={styles.productItem}
                          onPress={() => handleProductSelect(item)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.productItemContent}>
                            <Text style={styles.productItemName}>{item.name}</Text>
                            <View style={styles.productItemDetails}>
                              <Text style={styles.productItemPrice}>{item.price}</Text>
                              <Text style={styles.productItemUnit}>/ {item.unit}</Text>
                              <Text style={styles.productItemStock}>
                                {item.quantity} {t('addTransfer.available')}
                              </Text>
                            </View>
                          </View>
                          <Feather name="chevron-right" size={18} color="#cbd5e1" />
                        </TouchableOpacity>
                      )}
                      ListEmptyComponent={
                        <View style={styles.emptyState}>
                          <Feather name="package" size={40} color="#e2e8f0" />
                          <Text style={styles.emptyStateText}>{t('addTransfer.noProductsFound')}</Text>
                        </View>
                      }
                      contentContainerStyle={styles.listContent}
                    />
                  )}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
    headerContainer: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: '#f8fafc',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  backButton: {
    padding: 4,
  },
  headerText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: 'Inter_700Bold',
  },
  formContainer: {
    paddingHorizontal: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginTop: 20,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  warehouseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  warehouseButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minWidth: '48%',
    flex: 1,
  },
  selectedWarehouseButton: {
    backgroundColor: '#6366f1',
    borderColor: '#4f46e5',
  },
  warehouseButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  warehouseButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
    flex: 1,
  },
  selectedWarehouseButtonText: {
    color: '#fff',
  },
  productInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  productInputContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productInputText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  productInputDetails: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 8,
  },
  productPlaceholder: {
    fontSize: 16,
    color: '#94a3b8',
    flex: 1,
  },
  stockInfoContainer: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  stockInfoText: {
    fontSize: 13,
    color: '#64748b',
  },
  stockQuantity: {
    fontWeight: '600',
    color: '#1e293b',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  quantityInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
  },
  quantityUnit: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#64748b',
  },
  dateInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dateInputContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  dateInputText: {
    fontSize: 16,
    color: '#1e293b',
  },
  submitButton: {
    marginHorizontal: 20,
    marginTop: 32,
    backgroundColor: '#6366f1',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: '#c7d2fe',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  submitButtonIcon: {
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '95%',
    minHeight: '60%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  modalCloseButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    margin: 20,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#1e293b',
    fontSize: 16,
  },
  productItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  productItemContent: {
    flex: 1,
  },
  productItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  productItemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productItemPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#10b981',
  },
  productItemUnit: {
    fontSize: 14,
    color: '#64748b',
  },
  productItemStock: {
    fontSize: 13,
    color: '#94a3b8',
    marginLeft: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 16,
    color: '#94a3b8',
  },
  listContent: {
    paddingBottom: 40,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 8,
    marginVertical: 6,
    borderRadius: 4,
    marginHorizontal: 20,
  },
  errorText: {
    color: '#b91c1c',
    textAlign: 'center',
  },
});
