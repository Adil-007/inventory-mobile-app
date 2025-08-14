import saleService from '@/services/saleService';
import productService from '../../services/productService';
import warehouseService from '../../services/warehouseService';

import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState, } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../../app/store';


import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { SafeAreaView } from 'react-native-safe-area-context';

// Interfaces for typed data
interface Warehouse {
  _id: string;
  name: string;
}
interface Product {
  _id: string;
  name: string;
  brand?: string;
  price?: number;
  unit?: string;
  quantity?: number;
  warehouse?: Warehouse | string;
}

export default function AddSaleScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const userId = useSelector((state: RootState) => state.auth.user?._id);


  // State hooks
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [showProductDropdown, setShowProductDropdown] = useState<boolean>(false);
  const [productSearch, setProductSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  const [customer, setCustomer] = useState<string>('');
  const [productId, setProductId] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [amountPaid, setAmountPaid] = useState<string>('0');
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash'); // 'cash' or 'credit' terms
  const [creditTerm, setCreditTerm] = useState<string>('30');
  const [loading, setLoading] = useState<boolean>(false);
  const [productLoading, setProductLoading] = useState<boolean>(false);
  const [paymentChannel, setPaymentChannel] = useState<string>('cash'); // payment 'channel', e.g. cash or bank


  // Use a ref with proper typing for debounce timer
  const debounceTimer = useRef<number | null>(null);

  /** Fetch warehouses on mount */
  const fetchWarehouses = useCallback(async (): Promise<void> => {
    try {
      const data = await warehouseService.getAllWarehouses();
      if (Array.isArray(data)) {
        setWarehouses(data.filter(w => w?._id && w?.name));
      } else {
        setWarehouses([]);
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  /**
   * Fetch products filtered by warehouse with race condition prevention
   */
  useEffect(() => {
    let isCancelled = false;

    const loadProducts = async () => {
      if (!selectedWarehouse) {
        if (!isCancelled) {
          setProducts([]);
          setFilteredProducts([]);
          setSelectedProduct(null);
          setProductId('');
          setUnitPrice('');
          setQuantity('');
        }
        return;
      }
      if (!isCancelled) setProductLoading(true);

      try {
        if (!isCancelled) {
          const data = await productService.getProductList(selectedWarehouse);

          const productArray = Array.isArray(data) ? data : [];
          setProducts(productArray);
          setFilteredProducts(productArray);

          // Reset product selection when warehouse changes
          setSelectedProduct(null);
          setProductId('');
          setUnitPrice('');
          setQuantity('');
        }
      } catch {
        if (!isCancelled) {
          Alert.alert(t('sale.errortitle'), t('sale.errorloadproducts'));
        }
      } finally {
        if (!isCancelled) setProductLoading(false);
      }
    };

    loadProducts();

    return () => {
      isCancelled = true;
    };
  }, [selectedWarehouse, t]);

  /** Debounce product search */
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(productSearch);
    }, 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [productSearch]);

  /** Filter products by search */
  useEffect(() => {
    if (debouncedSearch) {
      const lowered = debouncedSearch.toLowerCase();
      const filtered = products.filter((p: Product) =>
        p.name.toLowerCase().includes(lowered) ||
        (p.brand?.toLowerCase().includes(lowered) ?? false)
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [debouncedSearch, products]);

  /** Handle product selection with validation of warehouse association */
  const handleProductSelect = (p: Product): void => {
    if (!selectedWarehouse) {
      Alert.alert(t('sale.errortitle'), t('sale.selectwarehousefirst'));
      return;
    }
    // Validate product belongs to selected warehouse if warehouse property exists
    const productWarehouseId =
      typeof p.warehouse === 'string' ? p.warehouse :
      p.warehouse?._id;

    if (productWarehouseId && productWarehouseId !== selectedWarehouse) {
      Alert.alert(t('sale.errortitle'), t('sale.productnotinwarehouse'));
      return;
    }

    setSelectedProduct(p);
    setProductId(p._id);
    setUnitPrice(p.price !== undefined && p.price !== null ? p.price.toString() : '');
    setQuantity('');
    setShowProductDropdown(false);
    setProductSearch('');
  };

  /** Calculate total price */
  const calculatePrice = (): number => {
    const qty = parseFloat(quantity);
    const price = parseFloat(unitPrice);
    if (isNaN(qty) || qty <= 0 || isNaN(price) || price <= 0) return 0;
    return qty * price;
  };

const validateInputs = (): boolean => {
  if (!selectedWarehouse) {
    Alert.alert(t('sale.errortitle'), t('sale.selectwarehouse'));
    return false;
  }
  if (!customer.trim()) {
    Alert.alert(t('sale.errortitle'), t('sale.fillcustomername'));
    return false;
  }
  if (!productId) {
    Alert.alert(t('sale.errortitle'), t('sale.selectproduct'));
    return false;
  }
  const qty = parseFloat(quantity);
  if (isNaN(qty) || qty <= 0) {
    Alert.alert(t('sale.errortitle'), t('sale.invalidquantity'));
    return false;
  }
  // New: check quantity does not exceed stock
  if (selectedProduct && qty > (selectedProduct.quantity ?? 0)) {
    Alert.alert(
      t('sale.errortitle'),
      t('sale.quantityExceedsStock', { available: selectedProduct.quantity }),
    );
    return false;
  }

  const price = parseFloat(unitPrice);
  if (isNaN(price) || price <= 0) {
    Alert.alert(t('sale.errortitle'), t('sale.invalidunitprice'));
    return false;
  }
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    Alert.alert(t('sale.errortitle'), t('sale.invaliddate'));
    return false;
  }
  if (!paymentMethod) {
    Alert.alert(t('sale.errortitle'), t('sale.selectpaymentmethod'));
    return false;
  }
  if (paymentMethod === 'credit') {
    const term = parseInt(creditTerm, 10);
    if (isNaN(term) || term <= 0) {
      Alert.alert(t('sale.errortitle'), t('sale.invalidcreditterm'));
      return false;
    }
  }
  const paid = parseFloat(amountPaid) || 0;
  const totalPrice = calculatePrice();
  if (paid < 0) {
    Alert.alert(t('sale.errortitle'), t('sale.invalidamountpaid'));
    return false;
  }
  if (paid > totalPrice) {
    Alert.alert(t('sale.errortitle'), t('sale.amountpaidexceedstotal'));
    return false;
  }
  return true;
};


  /** Save sale */
  const handleSave = async (): Promise<void> => {
    if (!validateInputs()) return;

    try {
      setLoading(true);
      if (!userId) {
        Alert.alert(t('sale.errortitle'), t('sale.usernotloggedin'));
        return;
      }

      const totalPrice = calculatePrice();

      // Backend to calculate amountDue & paymentStatus
      const payload = {
        customerName: customer.trim(),
        salesPerson: userId,
        product: productId,
        quantity: parseFloat(quantity),
        price: totalPrice,
        amountPaid: amountPaid.trim() === "" ? 0 : parseFloat(amountPaid),
        paymentMethod,
        paymentChannel,
        date: date.toISOString(),
        creditTerm: paymentMethod === 'credit' ? parseInt(creditTerm, 10) : undefined,
      };

      await saleService.addSale(payload);

      Alert.alert(t('sale.successtitle'), t('sale.successmessage'));

      // Reset form after success OR navigate back
      // For safety, resetting form here before navigation:
      setCustomer('');
      setSelectedWarehouse('');
      setProducts([]);
      setFilteredProducts([]);
      setSelectedProduct(null);
      setProductId('');
      setUnitPrice('');
      setQuantity('');
      setAmountPaid('0');
      setDate(new Date());
      setPaymentMethod('cash');
      setPaymentChannel('cash');
      setCreditTerm('30');

      router.replace('/sales');
    } catch {
      Alert.alert(t('sale.errortitle') || t('sale.genericerror'));
    } finally {
      setLoading(false);
    }
  };

  const warehouseDropdown = warehouses.map(w => ({
    label: w.name,
    value: w._id,
  }));

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#6d28d9', '#8b5cf6']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity onPress={() => router.replace('/sales')}>
          <Feather name="chevron-left" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('sale.recordnewsale')}</Text>
        <View style={{ width: 28 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Customer Name */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{t('sale.customername')}*</Text>
          <TextInput
            style={styles.input}
            placeholder={t('sale.customernameplaceholder')}
            placeholderTextColor="#94a3b8"
            value={customer}
            onChangeText={setCustomer}
            autoCorrect={false}
            autoCapitalize="words"
          />
        </View>

        {/* Warehouse Dropdown */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{t('sale.warehouse')}*</Text>
          <Dropdown
            style={styles.dropdown}
            placeholderStyle={styles.placeholderStyle}
            selectedTextStyle={styles.selectedTextStyle}
            inputSearchStyle={styles.inputSearchStyle}
            iconStyle={styles.iconStyle}
            data={warehouseDropdown}
            search
            maxHeight={300}
            labelField="label"
            valueField="value"
            placeholder={t('sale.selectwarehouse')}
            searchPlaceholder={t('sale.search')}
            value={selectedWarehouse}
            onChange={item => setSelectedWarehouse(item.value)}
            renderLeftIcon={() => <Feather style={styles.dropdownIcon} name="archive" size={20} color="#64748b" />}
          />
        </View>

        {/* Product Selector */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{t('sale.product')}*</Text>
          <TouchableOpacity style={styles.productSelector} onPress={() => setShowProductDropdown(true)}>
            <Text style={selectedProduct ? styles.selectedProductText : styles.placeholderStyle}>
              {selectedProduct
                ? `${selectedProduct.name} ${selectedProduct.brand ?? ''} (${selectedProduct.unit ?? ''}) - ${selectedProduct.quantity ?? 0}`
                : t('sale.selectproduct')}
            </Text>
            <Feather name="chevron-down" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Quantity and Unit Price */}
        <View style={styles.row}>
          <View style={[styles.inputContainer, { flex: 1, marginRight: 12 }]}>
            <Text style={styles.inputLabel}>{t('sale.quantity')}*</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={quantity}
              onChangeText={text => {
                // Allow only positive decimals with up to 2 decimals
                if (/^\d*\.?\d{0,2}$/.test(text)) setQuantity(text);
              }}
            />
          </View>
          <View style={[styles.inputContainer, { flex: 1 }]}>
            <Text style={styles.inputLabel}>{t('sale.unitprice')}*</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={unitPrice}
              onChangeText={text => {
                if (/^\d*\.?\d{0,2}$/.test(text)) setUnitPrice(text);
              }}
            />
          </View>
        </View>

        {/* Total Price */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{t('sale.total')}</Text>
          <View style={styles.totalContainer}>
            <Text style={styles.totalAmount}>${calculatePrice().toFixed(2)}</Text>
          </View>
        </View>

        {/* Payment Channel (cash, bank) */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{t('sale.paymentchannel')}*</Text>
          <View style={styles.paymentMethodContainer}>
            <TouchableOpacity
              style={[styles.paymentMethodButton, paymentChannel === 'cash' && styles.selectedPaymentMethod]}
              onPress={() => setPaymentChannel('cash')}
            >
              <Text style={[styles.paymentMethodText, paymentChannel === 'cash' && styles.selectedPaymentMethodText]}>
                {t('sale.cash')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.paymentMethodButton, paymentChannel === 'bank' && styles.selectedPaymentMethod]}
              onPress={() => setPaymentChannel('bank')}
            >
              <Text style={[styles.paymentMethodText, paymentChannel === 'bank' && styles.selectedPaymentMethodText]}>
                {t('sale.banktransfer')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment Method (cash or credit terms) */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{t('sale.paymentmethod')}*</Text>
          <View style={styles.paymentMethodContainer}>
            <TouchableOpacity
              style={[styles.paymentMethodButton, paymentMethod === 'cash' && styles.selectedPaymentMethod]}
              onPress={() => setPaymentMethod('cash')}
            >
              <Text style={[styles.paymentMethodText, paymentMethod === 'cash' && styles.selectedPaymentMethodText]}>
                {t('sale.paid')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.paymentMethodButton, paymentMethod === 'credit' && styles.selectedPaymentMethod]}
              onPress={() => {
                setPaymentMethod('credit');
                if (!creditTerm || creditTerm === '0') setCreditTerm('30');
              }}
            >
              <Text style={[styles.paymentMethodText, paymentMethod === 'credit' && styles.selectedPaymentMethodText]}>
                {t('sale.credit')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Credit Term & Amount Paid */}
        {paymentMethod === 'credit' && (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t('sale.credittermdays')}*</Text>
              <TextInput
                style={styles.input}
                placeholder="30"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={creditTerm}
                onChangeText={text => {
                  if (/^\d*$/.test(text)) setCreditTerm(text);
                }}
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t('sale.amountpaidpartial')}</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={amountPaid}
                onChangeText={text => {
                  if (/^\d*\.?\d{0,2}$/.test(text)) setAmountPaid(text);
                }}
              />
            </View>
          </>
        )}

        {/* Date Picker */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{t('sale.date')}*</Text>
          <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
            {/* Use local date string instead of ISO date to display */}
            <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>
          </TouchableOpacity>

          {showDatePicker &&
            (Platform.OS === 'ios' ? (
              <Modal transparent animationType="slide">
                <View style={styles.dateModalContainer}>
                  <View style={styles.dateModalContent}>
                    <DateTimePicker
                      value={date}
                      mode="date"
                      display="spinner"
                      onChange={(event, selectedDate) => {
                        if (selectedDate) setDate(selectedDate);
                      }}
                    />
                    <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.dateDoneButton}>
                      <Text style={styles.dateDoneText}>{t('sale.done')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            ) : (
              <DateTimePicker
                value={date}
                mode="date"
                display="calendar"
                onChange={(event, selectedDate) => {
                  if (selectedDate) setDate(selectedDate);
                  setShowDatePicker(false);
                }}
              />
            ))}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, loading && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#6d28d9', '#8b5cf6']}
            style={styles.gradientButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={styles.saveButtonText}>{t('sale.recordsale')}</Text>
                <Feather name="check-circle" size={22} color="#fff" />
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* Product Selection Modal */}
      <Modal visible={showProductDropdown} transparent animationType="slide" onRequestClose={() => setShowProductDropdown(false)}>
        <TouchableWithoutFeedback onPress={() => setShowProductDropdown(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{t('sale.selectproduct')}</Text>
                  <TouchableOpacity onPress={() => setShowProductDropdown(false)}>
                    <Feather name="x" size={24} color="#475569" />
                  </TouchableOpacity>
                </View>

                <View style={styles.searchContainer}>
                  <Feather name="search" size={20} color="#64748b" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder={t('sale.searchproduct')}
                    placeholderTextColor="#94a3b8"
                    value={productSearch}
                    onChangeText={setProductSearch}
                    autoFocus
                  />
                </View>

                {productLoading ? (
                  <ActivityIndicator size="large" color="#6d28d9" style={styles.loader} />
                ) : filteredProducts.length > 0 ? (
                  <FlatList
                    data={filteredProducts}
                    keyExtractor={item => item._id}
                    renderItem={({ item }) => (
                      <TouchableOpacity style={styles.productItem} onPress={() => handleProductSelect(item)}>
                        <Text style={styles.productItemText}>
                          {item.name} ({item.unit ?? ''}) - {item.quantity ?? 0}
                        </Text>
                        {item.brand && <Text style={styles.productItemBrand}>{item.brand}</Text>}
                      </TouchableOpacity>
                    )}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                  />
                ) : (
                  <View style={styles.emptyProductList}>
                    <Text style={styles.emptyProductText}>
                      {selectedWarehouse ? t('sale.noproductsinwarehouse') : t('sale.selectwarehouseFirst')}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginVertical: 20,
  },

  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dropdown: {
    height: 50,
    paddingHorizontal: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  placeholderStyle: {
    fontSize: 16,
    color: '#94a3b8',
  },
  selectedTextStyle: {
    fontSize: 16,
    color: '#1e293b',
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 16,
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  dropdownIcon: {
    marginRight: 8,
  },
  productSelector: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedProductText: {
    fontSize: 16,
    color: '#1e293b',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  totalContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    height: 50,
    justifyContent: 'center',
  },
  totalAmount: {
    fontSize: 16,
    color: '#6d28d9',
    fontWeight: '600',
    textAlign: 'right',
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentMethodButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flex: 1,
    alignItems: 'center',
  },
  selectedPaymentMethod: {
    backgroundColor: '#6d28d9',
    borderColor: '#6d28d9',
  },
  paymentMethodText: {
    color: '#475569',
    fontWeight: '600',
  },
  selectedPaymentMethodText: {
    color: '#fff',
  },
  dateInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dateText: {
    fontSize: 16,
    color: '#1e293b',
  },
  dateModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  dateModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  dateDoneButton: {
    padding: 12,
    alignItems: 'center',
  },
  dateDoneText: {
    color: '#6d28d9',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#6d28d9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 20,
  },
  gradientButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
    borderRadius: 14,
    gap: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
    paddingTop: 16,
    height: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#1e293b',
  },
  productItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  productItemText: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  productItemBrand: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  separator: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 20,
  },
  emptyProductList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyProductText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
});
