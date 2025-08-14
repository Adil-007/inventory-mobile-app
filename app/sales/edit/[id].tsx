import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { useSelector } from 'react-redux';
import { RootState } from '../../../app/store';

import productService from '@/services/productService';
import saleService from '@/services/saleService';
import warehouseService from '@/services/warehouseService';

interface Warehouse {
  _id: string;
  name: string;
}
interface Product {
  _id: string;
  name: string;
  brand?: string;
  price?: number;          // assumed unit price
  quantity?: number;       // current stock (needed for validation)
  warehouse?: Warehouse | string;
}

export default function EditSaleScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id as string) ?? '';
  const userId = useSelector((state: RootState) => state.auth.user?._id);

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [originalWarehouse, setOriginalWarehouse] = useState<string>('');

  const [productsLoading, setProductsLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [showProductDropdown, setShowProductDropdown] = useState<boolean>(false);
  const [productSearch, setProductSearch] = useState<string>('');

  const [customer, setCustomer] = useState<string>('');
  const [productId, setProductId] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [unitPrice, setUnitPrice] = useState<string>(''); // FIX: always per-unit
  const [quantity, setQuantity] = useState<string>('');
  const [amountPaid, setAmountPaid] = useState<string>('0');

  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [creditTerm, setCreditTerm] = useState<string>('30');
  const [paymentChannel, setPaymentChannel] = useState<string>('cash');

  const [loading, setLoading] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [, setOriginalSale] = useState<any>(null);

  useEffect(() => {
    const fetchSaleDetails = async () => {
      try {
        const data = await saleService.getSaleById(id);
        console.log("backend:", data);

        setCustomer(data.customerName ?? '');

        const warehouseId = typeof data.product?.warehouse === 'string'
          ? data.product.warehouse
          : data.product?.warehouse?._id;
        if (warehouseId) {
          setSelectedWarehouse(warehouseId);
          setOriginalWarehouse(warehouseId);
        }

        setProductId(data.product?._id ?? '');
        setSelectedProduct(data.product as Product ?? null);

        // FIX: store pure unit price
        if (data.price && data.quantity) {
          setUnitPrice((data.price / data.quantity).toString());
        } else {
          setUnitPrice('0');
        }

        setQuantity(data.quantity?.toString() ?? '');
        setAmountPaid(data.amountPaid?.toString() ?? '0');

        setDate(new Date(data.date));
        setOriginalSale(data);

        const pm = ['paid'].includes(data.paymentStatus)
          ? 'cash'
          : (['credit', 'partial'].includes(data.paymentStatus) ? 'credit' : 'cash');
        setPaymentMethod(pm);

        setCreditTerm(
          data.paymentMethod === 'credit' || data.paymentStatus === 'partial'
            ? (data.creditTerm?.toString() ?? '30')
            : ''
        );
      } catch {
        Alert.alert(t('editSale.errorTitle'), t('editSale.errorFetchSaleDetails'));
      }
    };

    (async () => {
      try {
        const warehousesData = await warehouseService.getAllWarehouses();
        setWarehouses(warehousesData);
        await fetchSaleDetails();
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [id, t]);

  const fetchProductsByWarehouse = useCallback(async () => {
    if (!selectedWarehouse) return;
    try {
      setProductsLoading(true);
      const data = await productService.getByWarehouse(selectedWarehouse);
      setProducts(data);
      setFilteredProducts(data);
    } catch {
      Alert.alert(t('editSale.errorTitle'), t('editSale.errorFetchProducts'));
    } finally {
      setProductsLoading(false);
    }
  }, [selectedWarehouse, t]);

  useEffect(() => {
    if (!selectedWarehouse) return;

    if (selectedWarehouse !== originalWarehouse) {
      setSelectedProduct(null);
      setProductId('');
      setUnitPrice('');
      setProductSearch('');
      setProducts([]);
      setFilteredProducts([]);
    }

    fetchProductsByWarehouse();
  }, [selectedWarehouse, fetchProductsByWarehouse, originalWarehouse]);

  useEffect(() => {
    if (!productId || selectedProduct) return;
    if (!products.length) return;

    const match = products.find(p => p._id === productId);
    if (match) {
      setSelectedProduct(match);
      // FIX: ensure DB stores unit price; fallback prevents total price mistake
      setUnitPrice(match.price?.toString() ?? '');
    }
  }, [products, productId, selectedProduct]);

  useEffect(() => {
    if (productSearch) {
      const filtered = products.filter(
        (p) =>
          p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
          (p.brand?.toLowerCase().includes(productSearch.toLowerCase()) ?? false),
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [productSearch, products]);

  const handleProductSelect = useCallback((product: Product) => {
    setSelectedProduct(product);
    setProductId(product._id);
    // FIX: set pure unit price from DB
    setUnitPrice(product.price?.toString() ?? '');
    setShowProductDropdown(false);
  }, []);

  const handleOpenProductDropdown = () => {
    setShowProductDropdown(true);
    if (selectedWarehouse && products.length === 0) {
      fetchProductsByWarehouse();
    }
  };

  const calculatePrice = (): number => {
    const qty = parseFloat(quantity);
    const price = parseFloat(unitPrice);
    if (isNaN(qty) || isNaN(price)) return 0;
    return qty * price;
  };

    useEffect(() => {
    if (initialLoading) return;
    if (paymentMethod !== 'cash') return;

    const qty = parseFloat(quantity) || 0;
    const price = parseFloat(unitPrice) || 0;
    const total = qty * price;

    setAmountPaid(total.toString());
    }, [quantity, unitPrice, paymentMethod, initialLoading]);


  const validateInputs = (): boolean => {
    if (!selectedWarehouse) {
      Alert.alert(t('sale.errortitle'), t('sale.selectwarehouse'));
      return false;
    }
    if (!customer.trim()) {
      Alert.alert(t('sale.errortitle'), t('sale.fillcustomername'));
      return false;
    }
    if (!productId || !selectedProduct) {
      Alert.alert(t('sale.errortitle'), t('sale.selectproduct'));
      return false;
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert(t('sale.errortitle'), t('sale.invalidquantity'));
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
    const totalPrice = qty * price;

    if (paid < 0) {
      Alert.alert(t('sale.errortitle'), t('sale.invalidamountpaid'));
      return false;
    }

    if (paid > totalPrice) {
      Alert.alert(t('sale.errortitle'), t('sale.amountpaidexceedstotal'));
      return false;
    }

    if (paymentMethod === 'cash' && paid !== totalPrice) {
      Alert.alert(t('sale.errortitle'), t('sale.cashPaymentFullAmount'));
      return false;
    }

    return true;
  };

  const handleUpdate = async () => {
    if (!validateInputs()) return;

    try {
      setLoading(true);

      const qty = parseFloat(quantity);
      const pricePerUnit = parseFloat(unitPrice); // FIX: confirmed unit price
      const totalPrice = qty * pricePerUnit;

      const paid = paymentMethod === 'credit'
        ? (amountPaid.trim() === '' ? 0 : parseFloat(amountPaid))
        : totalPrice;

      const payload: any = {
        customerName: customer.trim(),
        salesPerson: userId,
        product: productId,
        quantity: qty,
        price: pricePerUnit, // FIX: send unit price only
        amountPaid: paid,
        paymentMethod,
        paymentChannel,
        date: date.toISOString(),
      };

      if (paymentMethod === 'credit') {
        payload.creditTerm = parseInt(creditTerm, 10);
      }

      await saleService.updateSale(id, payload);

      Alert.alert(t('editSale.successTitle'), t('editSale.successMessage'));
      router.replace('/sales');
    } catch (error: any) {
      if (error.response) {
        const data = error.response.data;
        const lowerError = `${data.error || ''} ${JSON.stringify(data.details || {})}`.toLowerCase();

        if (lowerError.includes('stock') || lowerError.includes('insufficient')) {
          Alert.alert(
            t('editSale.errorTitle'),
            t('sale.quantityExceedsStock', {
              available: data.details?.available ?? 'unknown',
              requested: data.details?.requested ?? data.details?.requestedIncrease ?? quantity,
            }),
          );
          return;
        }

        Alert.alert(
          t('editSale.errorTitle'),
          data.message || data.error || t('editSale.errorMessage') || 'An error occurred.',
        );
      } else {
        Alert.alert(t('editSale.errorTitle'), t('editSale.errorMessage') || 'An error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };


  // ---------- Loading ----------
  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6d28d9" />
      </View>
    );
  }

  // ---------- Dropdown data ----------
  const warehouseDropdown = warehouses.map((w) => ({ label: w.name, value: w._id }));

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#6d28d9', '#8b5cf6']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity onPress={() => router.replace('/sales')}>
          <Feather name="chevron-left" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('editSale.headerTitle')}</Text>
        <View style={{ width: 28 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.formCard}>
          {/* Customer Name */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t('editSale.customerName')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('editSale.customerNamePlaceholder')}
              placeholderTextColor="#94a3b8"
              value={customer}
              onChangeText={setCustomer}
            />
          </View>

          {/* Warehouse */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t('editSale.warehouse')}</Text>
            <View style={styles.dropdownContainer}>
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
                placeholder={t('editSale.selectWarehouse')}
                searchPlaceholder={t('editSale.search')}
                value={selectedWarehouse}
                onChange={(item) => setSelectedWarehouse(item.value)}
                renderLeftIcon={() => (
                  <Feather style={styles.dropdownIcon} name="archive" size={20} color="#64748b" />
                )}
              />
            </View>
          </View>

          {/* Product */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t('editSale.product')}</Text>
            <TouchableOpacity style={styles.productSelector} onPress={handleOpenProductDropdown}>
              <Text style={selectedProduct ? styles.selectedProductText : styles.placeholderStyle}>
                {selectedProduct?.name || t('editSale.selectProduct')}
              </Text>
              <Feather name="chevron-down" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Quantity / Unit Price / Total */}
          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 12 }]}>
              <Text style={styles.inputLabel}>{t('editSale.quantity')}</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
              />
            </View>

            <View style={[styles.inputContainer, { flex: 1, marginRight: 12 }]}>
              <Text style={styles.inputLabel}>{t('editSale.unitPrice')}</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={unitPrice}
                onChangeText={setUnitPrice}
              />
            </View>

            <View style={[styles.inputContainer, { flex: 1 }]}>
              <Text style={styles.inputLabel}>{t('editSale.total')}</Text>
              <View style={styles.totalContainer}>
                <Text style={styles.totalAmount}>${calculatePrice().toFixed(2)}</Text>
              </View>
            </View>
          </View>

          {/* Payment Channel */}
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

          {/* Payment Method (cash/credit) */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t('editSale.paymentMethod')}</Text>
            <View style={styles.paymentMethodContainer}>
              <TouchableOpacity
                style={[styles.paymentMethodButton, paymentMethod === 'cash' && styles.selectedPaymentMethod]}
                onPress={() => setPaymentMethod('cash')}
              >
                <Text style={[styles.paymentMethodText, paymentMethod === 'cash' && styles.selectedPaymentMethodText]}>
                  {t('editSale.cash')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.paymentMethodButton, paymentMethod === 'credit' && styles.selectedPaymentMethod]}
                onPress={() => setPaymentMethod('credit')}
              >
                <Text style={[styles.paymentMethodText, paymentMethod === 'credit' && styles.selectedPaymentMethodText]}>
                  {t('editSale.credit')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Credit Term */}
          <View style={[styles.inputContainer, { display: paymentMethod === 'credit' ? 'flex' : 'none' }]}>
            <Text style={styles.inputLabel}>{t('editSale.creditTermDays')}</Text>
            <TextInput
              style={styles.input}
              placeholder="30"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={creditTerm}
              onChangeText={setCreditTerm}
            />
          </View>

          {/* Amount Paid (credit only) */}
          <View style={[styles.inputContainer, { display: paymentMethod === 'credit' ? 'flex' : 'none' }]}>
            <Text style={styles.inputLabel}>{t('editSale.amountPaidPartial')}</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={amountPaid}
              onChangeText={setAmountPaid}
            />
          </View>

          {/* Date */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t('editSale.date')}</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateInput}>
              <Text style={styles.dateText}>{date.toISOString().split('T')[0]}</Text>
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
                        <Text style={styles.dateDoneText}>{t('editSale.updateSale')}</Text>
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
                    setShowDatePicker(false);
                    if (selectedDate) setDate(selectedDate);
                  }}
                />
              ))}
          </View>
        </View>

        {/* Update */}
        <TouchableOpacity style={styles.saveButton} onPress={handleUpdate} activeOpacity={0.9} disabled={loading}>
          <LinearGradient colors={['#6d28d9', '#8b5cf6']} style={styles.gradientButton} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={styles.saveButtonText}>{t('editSale.updateSale')}</Text>
                <Feather name="check-circle" size={22} color="#fff" />
              </>
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
                  <Text style={styles.modalTitle}>{t('editSale.selectProductTitle')}</Text>
                  <TouchableOpacity onPress={() => setShowProductDropdown(false)}>
                    <Feather name="x" size={24} color="#475569" />
                  </TouchableOpacity>
                </View>

                <View style={styles.searchContainer}>
                  <Feather name="search" size={20} color="#64748b" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder={t('editSale.searchProduct')}
                    placeholderTextColor="#94a3b8"
                    value={productSearch}
                    onChangeText={setProductSearch}
                    autoFocus
                  />
                </View>

                {productsLoading ? (
                  <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                    <ActivityIndicator size="large" color="#6d28d9" />
                    <Text style={{ marginTop: 10, color: '#6d28d9' }}>{t('editSale.loadingProducts')}</Text>
                  </View>
                ) : filteredProducts.length > 0 ? (
                  <FlatList
                    data={filteredProducts}
                    keyExtractor={(item) => item._id}
                    renderItem={({ item }) => (
                      <TouchableOpacity style={styles.productItem} onPress={() => handleProductSelect(item)}>
                        <Text style={styles.productItemText}>{item.name}</Text>
                        {item.brand && <Text style={styles.productItemBrand}>{item.brand}</Text>}
                      </TouchableOpacity>
                    )}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                  />
                ) : (
                  <View style={styles.emptyProductList}>
                    <Text style={styles.emptyProductText}>
                      {selectedWarehouse ? t('editSale.noProductsInWarehouse') : t('sale.selectwarehouseFirst')}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
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
    scrollContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    formCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
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
    dropdownContainer: {
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        paddingHorizontal: 8,
    },
    dropdown: {
        height: 50,
        paddingHorizontal: 8,
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
    saveButton: {
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#6d28d9',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
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
    dueDateText: {
        marginTop: 8,
        fontWeight: '600',
        color: '#6d28d9',
        fontSize: 14,
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
