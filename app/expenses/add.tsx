import expenseService from '@/services/expenseService';
import { Feather } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';

import useNetworkStatus from '../../hooks/useNetworkStatus'; // Adjust import path as needed

export default function AddExpenseScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isConnected } = useNetworkStatus();

  const [categories, setCategories] = useState<{ label: string; value: string }[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<{ label: string; value: string }[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [paymentMethodOpen, setPaymentMethodOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [date, setDate] = useState(new Date());
  const [receipt, setReceipt] = useState(false);

  // Track offline alert shown only once per offline event
  const [offlineErrorShown, setOfflineErrorShown] = useState(false);

  useEffect(() => {
    const fetchOptions = async () => {
      if (!isConnected) {
        if (!offlineErrorShown) {
          Alert.alert(t('common.offlineTitle'), t('common.offlineMessage'));
          setOfflineErrorShown(true);
        }
        setLoadingError(t('expense.failedToLoadOptions'));
        return;
      }
      setOfflineErrorShown(false);
      setLoadingError(null);

      setLoading(true);
      try {
        const res = await expenseService.getExpenseOptions();

        const formattedCategories = res.categories.map((cat: string) => ({
          label: cat,
          value: cat,
          icon: () => <Feather name="tag" size={18} color="#6366f1" />,
        }));

        const formattedMethods = res.paymentMethods.map((method: string) => ({
          label: method,
          value: method,
          icon: () => <Feather name="credit-card" size={18} color="#6366f1" />,
        }));

        setCategories(formattedCategories);
        setPaymentMethods(formattedMethods);

        // Default selection on first option
        setCategory(res.categories[0] || '');
        setPaymentMethod(res.paymentMethods[0] || '');
      } catch {
        // Avoid alert here to prevent alert spam since apiClient handles global errors
        setLoadingError(t('expense.failedToLoadOptions'));
      } finally {
        setLoading(false);
      }
    };

    fetchOptions();
  }, [t, isConnected, offlineErrorShown]);


  const handleSubmit = async () => {
    if (!amount || isNaN(Number(amount))) {
      Alert.alert(t('expense.validationTitle'), t('expense.validationAmount'));
      return;
    }

    try {
      setLoading(true);
      await expenseService.addExpense({
        amount: Number(amount),
        description,
        category,
        paymentMethod,
        date: date.toISOString().split('T')[0],
        receipt,
      });
      Alert.alert(t('expense.successTitle'), t('expense.successMessage'));
      router.replace('/expenses');
    } catch {
      Alert.alert(t('expense.errorTitle'), t('expense.errorAddExpense'));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.headerContainer}>
          <LinearGradient
            colors={['#6366f1', '#8b5cf6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <TouchableOpacity
                onPress={() => router.replace('/expenses')}
                style={styles.backButton}
                activeOpacity={0.7}
              >
                <Feather name="chevron-left" size={24} color="#fff" />
              </TouchableOpacity>

              <Text style={styles.headerTitle}>{t('expense.addNewExpense')}</Text>

              <View style={styles.headerRightPlaceholder} />
            </View>
          </LinearGradient>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          {/* Show inline loading error */}
          {loadingError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{loadingError}</Text>
            </View>
          )}

          {/* Amount Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('expense.amount')}</Text>
            <View style={styles.amountContainer}>
              <Text style={styles.currencySymbol}>ETB</Text>
              <TextInput
                style={[styles.input, styles.amountInput]}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
                placeholderTextColor="#94a3b8"
                autoFocus
              />
            </View>
          </View>

          {/* Category Dropdown */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('expense.category')}</Text>
            <DropDownPicker
              open={categoryOpen}
              value={category}
              items={categories}
              setOpen={setCategoryOpen}
              setValue={setCategory}
              setItems={setCategories}
              placeholder={t('expense.selectCategory')}
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownContainer}
              textStyle={styles.dropdownText}
              listMode="MODAL"
              modalProps={{
                animationType: 'slide',
              }}
              modalTitle={t('expense.selectCategory')}
              modalTitleStyle={styles.modalTitle}
              ArrowDownIconComponent={() => <Feather name="chevron-down" size={18} color="#64748b" />}
              ArrowUpIconComponent={() => <Feather name="chevron-up" size={18} color="#64748b" />}
              zIndex={3000}
              zIndexInverse={1000}
              listItemContainerStyle={styles.listItem}
              listItemLabelStyle={styles.listItemLabel}
              selectedItemContainerStyle={styles.selectedItem}
              selectedItemLabelStyle={styles.selectedItemLabel}
            />
          </View>

          {/* Payment Method Dropdown */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('expense.paymentMethod')}</Text>
            <DropDownPicker
              open={paymentMethodOpen}
              value={paymentMethod}
              items={paymentMethods}
              setOpen={setPaymentMethodOpen}
              setValue={setPaymentMethod}
              setItems={setPaymentMethods}
              placeholder={t('expense.selectPaymentMethod')}
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownContainer}
              textStyle={styles.dropdownText}
              listMode="MODAL"
              modalProps={{
                animationType: 'slide',
              }}
              modalTitle={t('expense.selectPaymentMethod')}
              modalTitleStyle={styles.modalTitle}
              ArrowDownIconComponent={() => <Feather name="chevron-down" size={18} color="#64748b" />}
              ArrowUpIconComponent={() => <Feather name="chevron-up" size={18} color="#64748b" />}
              zIndex={2000}
              zIndexInverse={2000}
              listItemContainerStyle={styles.listItem}
              listItemLabelStyle={styles.listItemLabel}
              selectedItemContainerStyle={styles.selectedItem}
              selectedItemLabelStyle={styles.selectedItemLabel}
            />
          </View>

          {/* Date Picker */}
          {showDatePicker && (
            <View>
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
              />
              {Platform.OS === 'ios' && (
                <View style={styles.datePickerButtons}>
                  <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowDatePicker(false)} />
                  <TouchableOpacity
                    style={[styles.datePickerButton, styles.datePickerDoneButton]}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.datePickerDoneButtonText}>{t('expense.done')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Description Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('expense.descriptionOptional')}</Text>
            <TextInput
              style={[styles.input, styles.descriptionInput]}
              placeholder={t('expense.descriptionPlaceholder')}
              value={description}
              onChangeText={setDescription}
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Date Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('expense.date')}</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={[styles.input, styles.dateInput]}>
              <Feather name="calendar" size={18} color="#64748b" style={styles.dateIcon} />
              <Text style={styles.dateText}>{formatDate(date)}</Text>
            </TouchableOpacity>
          </View>

          {/* Receipt Toggle */}
          <View style={[styles.inputGroup, styles.receiptContainer]}>
            <Text style={styles.label}>{t('expense.includeReceipt')}</Text>
            <TouchableOpacity
              onPress={() => setReceipt(!receipt)}
              style={[styles.receiptButton, receipt ? styles.receiptButtonActive : styles.receiptButtonInactive]}
            >
              <View style={[styles.receiptToggle, receipt ? styles.receiptToggleActive : styles.receiptToggleInactive]} />
              <Text style={styles.receiptText}>{receipt ? t('expense.yes') : t('expense.no')}</Text>
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="check" size={20} color="#fff" />
                <Text style={styles.submitText}>{t('expense.addExpense')}</Text>
              </>
            )}
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
  header: {
    paddingTop: Platform.OS === 'android' ? 40 : 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  headerRightPlaceholder: {
    width: 40,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#f8fafc',
    fontSize: 16,
    color: '#1e293b',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingLeft: 16,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    borderWidth: 0,
    paddingLeft: 0,
  },
  descriptionInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateIcon: {
    marginRight: 12,
  },
  dateText: {
    fontSize: 16,
    color: '#1e293b',
  },
  datePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 10,
    backgroundColor: '#f8fafc',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  datePickerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  datePickerDoneButton: {
    marginLeft: 16,
  },
  datePickerDoneButtonText: {
    color: '#6366f1',
    fontWeight: '600',
    fontSize: 16,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    marginTop: 4,
  },
  dropdownText: {
    fontSize: 16,
    color: '#1e293b',
  },
  listItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  listItemLabel: {
    fontSize: 16,
    color: '#1e293b',
  },
  selectedItem: {
    backgroundColor: '#eef2ff',
  },
  selectedItemLabel: {
    color: '#6366f1',
    fontWeight: '600',
  },
  modalTitle: {
    fontWeight: '600',
    fontSize: 18,
    color: '#1e293b',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  receiptContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptButton: {
    width: 80,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  receiptButtonActive: {
    backgroundColor: '#d1fae5',
  },
  receiptButtonInactive: {
    backgroundColor: '#e5e7eb',
  },
  receiptToggle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    position: 'absolute',
  },
  receiptToggleActive: {
    backgroundColor: '#10b981',
    right: 4,
  },
  receiptToggleInactive: {
    backgroundColor: '#9ca3af',
    left: 4,
  },
  receiptText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginHorizontal: 12,
  },
  submitButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
