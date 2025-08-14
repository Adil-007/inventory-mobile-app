import expenseService from '@/services/expenseService';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

export default function EditExpenseScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [expense, setExpense] = useState<any>(null);

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [paymentMethodOpen, setPaymentMethodOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [category, setCategory] = useState('');

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [date, setDate] = useState(new Date());
  const [receipt, setReceipt] = useState(false);

  const [categories, setCategories] = useState<
    { label: string; value: string; icon: () => React.ReactNode }[]
  >([]);

  const [paymentMethods, setPaymentMethods] = useState<
    { label: string; value: string; icon: () => React.ReactNode }[]
  >([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await expenseService.getExpenseOptions();
        setCategories(
          res.categories.map((cat: string) => ({
            label: cat,
            value: cat,
            icon: () => <Feather name="tag" size={18} color="#6366f1" />,
          }))
        );
        setPaymentMethods(
          res.paymentMethods.map((method: string) => ({
            label: method,
            value: method,
            icon: () => <Feather name="credit-card" size={18} color="#6366f1" />,
          }))
        );

        const exp = await expenseService.getExpenseById(id as string);
        setExpense(exp);
        setAmount(exp.amount.toString());
        setDescription(exp.description || '');
        setCategory(exp.category);
        setPaymentMethod(exp.paymentMethod);
        setDate(new Date(exp.date));
        setReceipt(exp.receipt);
      } catch {
        Alert.alert(t('editExpenseModal.errorTitle'), t('editExpenseModal.errorLoading'));
        router.replace('/expenses');
      }
    };

    fetchData();
  }, [id, t, router]);

  const handleUpdate = async () => {
    if (!amount || isNaN(Number(amount))) {
      Alert.alert(t('editExpenseModal.validationTitle'), t('editExpenseModal.validationAmount'));
      return;
    }

    try {
      setLoading(true);
      await expenseService.editExpense(id as string, {
        amount: Number(amount),
        description,
        category,
        paymentMethod,
        date: date.toISOString().split('T')[0],
        receipt,
      });
      Alert.alert(t('editExpenseModal.successTitle'), t('editExpenseModal.successUpdate'));
      router.replace('/expenses');
    } catch {
      Alert.alert(t('editExpenseModal.errorTitle'), t('editExpenseModal.errorUpdate'));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | string) => {
    if (date instanceof Date) {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }

    if (typeof date === 'string') {
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
    }

    return t('editExpenseModal.invalidDate');
  };

  if (!expense) return <ActivityIndicator style={{ marginTop: 100 }} />;

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (selectedDate) setDate(selectedDate);
    } else if (selectedDate) {
      setDate(selectedDate);
    }
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <View style={styles.headerContainer}>
          <LinearGradient colors={['#6366f1', '#8b5cf6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.headerGradient}>
            <View style={styles.headerContent}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
                <Feather name="chevron-left" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{t('editExpenseModal.editExpense')}</Text>
              <View style={styles.headerRightPlaceholder} />
            </View>
          </LinearGradient>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          {/* Amount Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('editExpenseModal.amount')}</Text>
            <View style={styles.amountContainer}>
              <Text style={styles.currencySymbol}>ETB</Text>
              <TextInput
                style={[styles.input, styles.amountInput]}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          {/* Category */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('editExpenseModal.category')}</Text>
            <DropDownPicker
              open={categoryOpen}
              value={category}
              items={categories}
              setOpen={setCategoryOpen}
              setValue={setCategory}
              setItems={setCategories}
              placeholder={t('editExpenseModal.selectCategory')}
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownContainer}
              listMode="MODAL"
              modalTitle={t('editExpenseModal.selectCategory')}
              modalTitleStyle={styles.modalTitle}
            />
          </View>

          {/* Payment Method */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('editExpenseModal.paymentMethod')}</Text>
            <DropDownPicker
              open={paymentMethodOpen}
              value={paymentMethod}
              items={paymentMethods}
              setOpen={setPaymentMethodOpen}
              setValue={setPaymentMethod}
              setItems={setPaymentMethods}
              placeholder={t('editExpenseModal.selectPaymentMethod')}
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownContainer}
              listMode="MODAL"
              modalTitle={t('editExpenseModal.selectPaymentMethod')}
              modalTitleStyle={styles.modalTitle}
            />
          </View>

          {/* Date Input Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('editExpenseModal.date')}</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={[styles.input, styles.dateInput]}>
              <Feather name="calendar" size={18} color="#64748b" style={styles.dateIcon} />
              <Text style={styles.dateText}>{formatDate(date)}</Text>
            </TouchableOpacity>
          </View>

          {/* Date Picker */}
          {showDatePicker && (
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={onDateChange}
              />
              {Platform.OS === 'ios' && (
                <View style={styles.datePickerButtons}>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => {
                      setShowDatePicker(false);
                      setDate(expense.date);
                    }}
                  >
                    <Text style={styles.datePickerButtonText}>{t('editExpenseModal.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.datePickerButton, styles.datePickerDoneButton]} onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.datePickerDoneButtonText}>{t('editExpenseModal.done')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('editExpenseModal.descriptionOptional')}</Text>
            <TextInput
              style={[styles.input, styles.descriptionInput]}
              placeholder={t('editExpenseModal.descriptionPlaceholder')}
              value={description}
              onChangeText={setDescription}
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Receipt Toggle */}
          <View style={[styles.inputGroup, styles.receiptContainer]}>
            <Text style={styles.label}>{t('editExpenseModal.includeReceipt')}</Text>
            <TouchableOpacity
              onPress={() => setReceipt(!receipt)}
              style={[styles.receiptButton, receipt ? styles.receiptButtonActive : styles.receiptButtonInactive]}
            >
              <View style={[styles.receiptToggle, receipt ? styles.receiptToggleActive : styles.receiptToggleInactive]} />
              <Text style={styles.receiptText}>{receipt ? t('editExpenseModal.yes') : t('editExpenseModal.no')}</Text>
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity style={styles.submitButton} onPress={handleUpdate} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="check" size={20} color="#fff" />
                <Text style={styles.submitText}>{t('editExpenseModal.updateExpense')}</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ...styles unchanged from your original code, no changes needed for types here...

const styles = StyleSheet.create({
datePickerContainer: {
  marginBottom: 20,
  backgroundColor: '#f8fafc',
  borderRadius: 12,
  padding: Platform.OS === 'ios' ? 10 : 0,
  borderWidth: Platform.OS === 'ios' ? 1 : 0,
  borderColor: '#e2e8f0',
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
    datePickerButtonText: {
    color: '#64748b',
    fontSize: 16,
    },
    datePickerDoneButton: {
    marginLeft: 16,
    },
    datePickerDoneButtonText: {
    color: '#6366f1',
    fontWeight: '600',
    fontSize: 16,
    },
  headerContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 10,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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

  // Update these existing styles:
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
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

  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
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
});