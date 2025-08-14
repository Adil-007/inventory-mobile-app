import { Feather } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTranslation } from 'react-i18next';

import productService from '../../../services/productService';
import transferService from '../../../services/transferService';
import warehouseService from '../../../services/warehouseService';

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

export default function EditTransferScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: { id: string } }, 'params'>>();
  const { id } = route.params;
  const { t } = useTranslation();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [sourceWarehouse, setSourceWarehouse] = useState<string>('');
  const [destinationWarehouse, setDestinationWarehouse] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<string>('');
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Locking warehouses by setting these flags after data is loaded
  const [warehousesLocked, setWarehousesLocked] = useState<boolean>(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [transfer, whData] = await Promise.all([
          transferService.getTransferById(id),
          warehouseService.getAllWarehouses(),
        ]);

        if (!whData || whData.length === 0) {
          Alert.alert(t('editTransfer.error'), t('editTransfer.noWarehouses'));
          return;
        }

        setWarehouses(whData);
        setSourceWarehouse(transfer.sourceWarehouse._id);
        setDestinationWarehouse(transfer.destinationWarehouse._id);
        setQuantity(transfer.quantity.toString());
        setDate(new Date(transfer.date));

        const prodData = (await productService.getByWarehouse(transfer.sourceWarehouse._id)) as Product[];

        const matchedProduct = prodData.find((p) => p._id === transfer.product._id);
        setSelectedProduct(matchedProduct || null);

        setWarehousesLocked(true); // Lock the warehouses after initial loading
      } catch {
        Alert.alert(t('editTransfer.error'), t('editTransfer.loadFailed'));
      }
    };

    fetchInitialData();
  }, [id, t]);

const handleUpdate = async () => {
    if (isUpdating) return; // prevent multiple taps

    if (!sourceWarehouse || !destinationWarehouse || !selectedProduct || !quantity) {
      Alert.alert(t('editTransfer.missingInfo'), t('editTransfer.fillRequiredFields'));
      return;
    }

    if (sourceWarehouse === destinationWarehouse) {
      Alert.alert(t('editTransfer.invalidSelection'), t('editTransfer.differentWarehouses'));
      return;
    }

    if (Number(quantity) > selectedProduct.quantity) {
      Alert.alert(
        t('editTransfer.insufficientStock'),
        t('editTransfer.onlyAvailable', { quantity: selectedProduct.quantity, unit: selectedProduct.unit }),
      );
      return;
    }

    setIsUpdating(true); // disable button here

    try {
      await transferService.updateTransfer(id, {
        sourceWarehouse,
        destinationWarehouse,
        product: selectedProduct._id,
        quantity: Number(quantity),
        date: date.toISOString().split('T')[0],
      });

      Alert.alert(t('editTransfer.success'), t('editTransfer.transferUpdated'));
      setTimeout(() => router.back(), 1500);
    } catch {
      Alert.alert(t('editTransfer.error'), t('editTransfer.updateFailed'));
    } finally {
      setIsUpdating(false); // re-enable button here
    }
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'set' && selectedDate) {
      setDate(selectedDate);
    }
    setShowDatePicker(false);
  };

  // Handler to show alert when trying to press locked warehouse buttons:
  const onWarehousePressLocked = () => {
    Alert.alert(
      t('editTransfer.lockedWarehouseTitle') || "Cannot Change Warehouse",
      t('editTransfer.lockedWarehouseMessage') ||
        "Warehouses cannot be changed for this transfer. If you want to select different warehouses, please delete and create a new transfer."
    );
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
          {/* Header */}
          <View style={styles.headerContainer}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
                <Feather name="arrow-left" size={24} color="#1e293b" />
              </TouchableOpacity>
              <Text style={styles.headerText}>{t('editTransfer.title')}</Text>
              <View style={{ width: 24 }} />
            </View>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            {/* Source Warehouse */}
            <Text style={styles.sectionLabel}>{t('editTransfer.sourceWarehouse')}</Text>
            <View style={styles.warehouseGrid}>
              {warehouses.length > 0 &&
                warehouses.map((wh) => (
                  <TouchableOpacity
                    key={wh._id}
                    style={[
                      styles.warehouseButton,
                      sourceWarehouse === wh._id && styles.selectedWarehouseButton,
                    ]}
                    // Disable pressing to lock warehouse selection
                    disabled={warehousesLocked}
                    onPress={() => {
                      if (warehousesLocked) {
                        onWarehousePressLocked();
                        return;
                      }
                      setSourceWarehouse(wh._id);
                      setSelectedProduct(null);
                    }}
                    activeOpacity={warehousesLocked ? 1 : 0.7}
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

            {/* Destination Warehouse */}
            <Text style={styles.sectionLabel}>{t('editTransfer.destinationWarehouse')}</Text>
            <View style={styles.warehouseGrid}>
              {warehouses.length > 0 &&
                warehouses.map((wh) => (
                  <TouchableOpacity
                    key={wh._id}
                    style={[
                      styles.warehouseButton,
                      destinationWarehouse === wh._id && styles.selectedWarehouseButton,
                    ]}
                    disabled={warehousesLocked}
                    onPress={() => {
                      if (warehousesLocked) {
                        onWarehousePressLocked();
                        return;
                      }
                      setDestinationWarehouse(wh._id);
                    }}
                    activeOpacity={warehousesLocked ? 1 : 0.7}
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

            {/* Product */}
            <Text style={styles.sectionLabel}>{t('editTransfer.product')}</Text>
            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  t('editTransfer.lockedProductTitle') || "Cannot Change Product",
                  t('editTransfer.lockedProductMessage') ||
                    "If you don't wish to proceed with this product, please delete the transfer and create a new one."
                )
              }
              style={styles.productInput}
              activeOpacity={0.7}
            >
              <View style={styles.productInputContent}>
                {selectedProduct ? (
                  <>
                    <Text style={styles.productInputText}>{selectedProduct.name}</Text>
                    <Text style={styles.productInputDetails}>
                      {selectedProduct.price} / {selectedProduct.unit}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.productPlaceholder}>{t('editTransfer.selectProduct')}</Text>
                )}
                <Feather name="chevron-down" size={20} color="#94a3b8" />
              </View>
            </TouchableOpacity>

            {/* Stock Info */}
            {selectedProduct && (
              <View style={styles.stockInfoContainer}>
                <Text style={styles.stockInfoText}>
                  {t('editTransfer.available')}:{' '}
                  <Text style={styles.stockQuantity}>
                    {selectedProduct.quantity} {selectedProduct.unit}
                  </Text>
                </Text>
              </View>
            )}

            {/* Date Picker */}
            {showDatePicker && (
              <View style={{ backgroundColor: '#fff', padding: 20 }}>
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                />
                <TouchableOpacity
                  onPress={() => setShowDatePicker(false)}
                  style={{ marginTop: 10, alignItems: 'center' }}
                >
                  <Text style={{ color: '#6366f1', fontWeight: '600', fontSize: 16 }}>
                    {t('editTransfer.done')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Quantity */}
            <Text style={styles.sectionLabel}>{t('editTransfer.quantity')}</Text>
            <View style={styles.quantityContainer}>
              <TextInput
                style={styles.quantityInput}
                keyboardType="numeric"
                value={quantity}
                onChangeText={(text) => {
                  // Validate that input is numeric or empty
                  if (/^\d*$/.test(text)) {
                    setQuantity(text);
                  }
                }}
                placeholder={t('editTransfer.enterQuantity')}
                placeholderTextColor="#94a3b8"
              />
              {selectedProduct && <Text style={styles.quantityUnit}>{selectedProduct.unit}</Text>}
            </View>

            {/* Transfer Date */}
            <Text style={styles.sectionLabel}>{t('editTransfer.transferDate')}</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
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
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              (!sourceWarehouse || !destinationWarehouse || !selectedProduct || !quantity || isUpdating) &&
                styles.submitButtonDisabled,
            ]}
            onPress={handleUpdate}
            disabled={!sourceWarehouse || !destinationWarehouse || !selectedProduct || !quantity || isUpdating} // disable while updating
            activeOpacity={0.7}
          >
            <Text style={styles.submitButtonText}>{t('editTransfer.updateTransfer')}</Text>
            <Feather name="check" size={20} color="#fff" style={styles.submitButtonIcon} />
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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

  headerContainer: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: '#f8fafc',
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
    maxHeight: '80%',
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
});
