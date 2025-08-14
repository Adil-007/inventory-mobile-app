import expenseService from '@/services/expenseService';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import useNetworkStatus from '../hooks/useNetworkStatus'; // Adjust path if needed

interface Expense {
  id?: string;
  _id?: string;
  category: string;
  description?: string;
  amount: number | string;
  paymentMethod: string;
  receipt: boolean;
  date: string | Date;
}

interface Filters {
  category: string;
  paymentMethod: string;
  hasReceipt: boolean | null;
}

export default function ExpensesPage() {
  const { t } = useTranslation();
  const { isConnected } = useNetworkStatus();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [filters, setFilters] = useState<Filters>({
    category: '',
    paymentMethod: '',
    hasReceipt: null,
  });
  const addButtonScale = useRef(new Animated.Value(1)).current;

  // Error state for inline error messages
  const [error, setError] = useState<string | null>(null);

  // Concurrency ref to avoid overlapping fetches
  const isFetchingRef = useRef(false);

  // Show offline alert only once per offline event
  const [offlineErrorShown, setOfflineErrorShown] = useState(false);

  // Extract unique categories and payment methods from expenses
  const categories = [...new Set(expenses.map(expense => expense.category))].sort();
  const paymentMethods = [...new Set(expenses.map(expense => expense.paymentMethod))].sort();

  // Fetch expenses with network and concurrency handling
  const fetchExpenses = useCallback(async () => {
    if (!isConnected) {
      setLoading(false);
      setError(t('common.offlineMessage'));
      if (!offlineErrorShown) {
        setOfflineErrorShown(true);
      }
      return;
    }
    setOfflineErrorShown(false);

    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    setError(null);
    try {
      setLoading(true);
      const data = await expenseService.getAllExpenses();
      setExpenses(data);
    } catch {
      // No blocking alert here; the apiClient will handle global alerts.
      setError(t('expenses.failedToLoad') || 'Failed to load expenses');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [isConnected, offlineErrorShown, t]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchExpenses();
    setRefreshing(false);
  };

  // Filter expenses according to search and filters state
  const filteredExpenses = expenses.filter(expense => {
    const lowerSearch = searchQuery.toLowerCase();
    const matchesSearch =
      expense.category.toLowerCase().includes(lowerSearch) ||
      (expense.description ? expense.description.toLowerCase().includes(lowerSearch) : false);

    const matchesCategory = !filters.category || expense.category === filters.category;
    const matchesPaymentMethod = !filters.paymentMethod || expense.paymentMethod === filters.paymentMethod;
    const matchesReceipt = filters.hasReceipt === null || expense.receipt === filters.hasReceipt;

    return matchesSearch && matchesCategory && matchesPaymentMethod && matchesReceipt;
  });

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);

  // Delete with confirmation
  const handleDeleteExpense = (id: string) => {
    Alert.alert(
      t('expenses.deleteExpenseConfirmTitle'),
      t('expenses.deleteExpenseConfirmMessage'),
      [
        { text: t('expenses.cancel'), style: 'cancel' },
        {
          text: t('expenses.deleteConfirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await expenseService.deleteExpense(id);
              await fetchExpenses();
            } catch {
              Alert.alert(t('expenses.deleteExpenseConfirmTitle'), t('expenses.deleteExpenseConfirmMessage'));
            }
          },
        },
      ],
    );
  };

  // Edit navigation
  const handleEdit = (expense: Expense) => {
    const expenseId = expense.id || expense._id;
    if (!expenseId) return;
    router.push(`/expenses/edit/${expenseId}`);
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      paymentMethod: '',
      hasReceipt: null,
    });
  };

  const animateAddButton = () => {
    Animated.sequence([
      Animated.timing(addButtonScale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(addButtonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => router.push('/expenses/add'));
  };

  const applyFilters = () => setShowFilters(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Offline Banner */}
      {isConnected === false && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>{t('common.offlineMessage')}</Text>
        </View>
      )}
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/more')} style={styles.backButton} activeOpacity={0.7}>
            <Feather name="chevron-left" size={34} color="#6366f1" />
          </TouchableOpacity>

          <Text style={styles.title}>{t('expenses.title')}</Text>

          <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(true)} activeOpacity={0.7}>
            <Feather name="filter" size={20} color="#6366f1" />
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{t('expenses.totalExpenses')}</Text>
          <Text style={styles.summaryAmount}>ETB {totalExpenses.toFixed(2)}</Text>
          <Text style={styles.summarySubtext}>{t('expenses.recordsCount', { count: filteredExpenses.length })}</Text>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={18} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('expenses.searchPlaceholder')}
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        {/* Active Filters */}
        {(filters.category || filters.paymentMethod || filters.hasReceipt !== null) && (
          <View style={styles.activeFilters}>
            <Text style={styles.activeFiltersText}>{t('expenses.activeFilters')}</Text>
            <View style={styles.filterPillsContainer}>
              {filters.category && (
                <View style={styles.filterPill}>
                  <Text style={styles.filterPillText}>{filters.category}</Text>
                  <TouchableOpacity onPress={() => setFilters({ ...filters, category: '' })} style={styles.filterPillClose}>
                    <Feather name="x" size={14} color="#64748b" />
                  </TouchableOpacity>
                </View>
              )}
              {filters.paymentMethod && (
                <View style={styles.filterPill}>
                  <Text style={styles.filterPillText}>{filters.paymentMethod}</Text>
                  <TouchableOpacity onPress={() => setFilters({ ...filters, paymentMethod: '' })} style={styles.filterPillClose}>
                    <Feather name="x" size={14} color="#64748b" />
                  </TouchableOpacity>
                </View>
              )}
              {filters.hasReceipt !== null && (
                <View style={styles.filterPill}>
                  <Text style={styles.filterPillText}>
                    {filters.hasReceipt ? t('expenses.withReceipt') : t('expenses.withoutReceipt')}
                  </Text>
                  <TouchableOpacity onPress={() => setFilters({ ...filters, hasReceipt: null })} style={styles.filterPillClose}>
                    <Feather name="x" size={14} color="#64748b" />
                  </TouchableOpacity>
                </View>
              )}
              <TouchableOpacity onPress={clearFilters} style={styles.clearFilters}>
                <Text style={styles.clearFiltersText}>{t('expenses.clearFilters')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Inline error message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Expenses List or Loading */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>{t('expenses.loading')}</Text>
          </View>
        ) : (
          <FlatList
            data={filteredExpenses}
            keyExtractor={(item) => item.id || item._id || Math.random().toString()}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366f1']} tintColor="#6366f1" />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Feather name="dollar-sign" size={48} color="#e2e8f0" />
                <Text style={styles.emptyText}>
                  {searchQuery ? t('expenses.noMatchingExpenses') : t('expenses.noExpenses')}
                </Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery ? t('expenses.tryDifferentSearch') : t('expenses.addNewExpense')}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.categoryContainer}>
                    <View style={[styles.categoryIcon, { backgroundColor: getCategoryColor(item.category) }]}>
                      <Feather name="shopping-bag" size={16} color="#fff" />
                    </View>
                    <Text style={styles.category} numberOfLines={1}>
                      {item.category}
                    </Text>
                  </View>
                  <Text style={styles.amount}>ETB {Number(item.amount).toFixed(2)}</Text>
                </View>

                {item.description && <Text style={styles.description} numberOfLines={2}>{item.description}</Text>}

                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <Feather name="calendar" size={14} color="#64748b" />
                    <Text style={styles.detailText}>
                      {new Date(item.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Feather name="credit-card" size={14} color="#64748b" />
                    <Text style={styles.detailText}>{item.paymentMethod}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Feather name="paperclip" size={14} color={item.receipt ? '#10b981' : '#ef4444'} />
                    <Text
                      style={[
                        styles.detailText,
                        { color: item.receipt ? '#10b981' : '#ef4444' },
                      ]}
                    >
                      {item.receipt ? t('expenses.hasReceipt') : t('expenses.noReceipt')}
                    </Text>
                  </View>
                </View>

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.editBtn]}
                    onPress={() => handleEdit(item)}
                    activeOpacity={0.7}
                  >
                    <Feather name="edit-3" size={16} color="#6366f1" />
                    <Text style={styles.actionText}>{t('expenses.edit')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => {
                      const id = item.id || item._id;
                      if (id) {
                        handleDeleteExpense(id);
                      } else {
                        Alert.alert("Error", "Expense not found.");
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Feather name="trash-2" size={16} color="#ef4444" />
                    <Text style={[styles.actionText, { color: '#ef4444' }]}>{t('expenses.delete')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}

        {/* Add Expense Button */}
        <Animated.View style={[styles.addButtonContainer, { transform: [{ scale: addButtonScale }] }]}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={animateAddButton}
            activeOpacity={0.8}
            accessibilityLabel={t('expenses.addExpenseAccessibilityLabel')}
          >
            <Feather name="plus" size={24} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Filter Modal */}
      <Modal visible={showFilters} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('expenses.filterExpenses')}</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Feather name="x" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Category Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>{t('expenses.category')}</Text>
                <View style={styles.filterOptions}>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[styles.filterOption, filters.category === category && styles.filterOptionSelected]}
                      onPress={() =>
                        setFilters((prev) => ({
                          ...prev,
                          category: prev.category === category ? '' : category,
                        }))
                      }
                    >
                      <Text style={[styles.filterOptionText, filters.category === category && styles.filterOptionTextSelected]}>
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Payment Method Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>{t('expenses.paymentMethod')}</Text>
                <View style={styles.filterOptions}>
                  {paymentMethods.map((method) => (
                    <TouchableOpacity
                      key={method}
                      style={[styles.filterOption, filters.paymentMethod === method && styles.filterOptionSelected]}
                      onPress={() =>
                        setFilters((prev) => ({
                          ...prev,
                          paymentMethod: prev.paymentMethod === method ? '' : method,
                        }))
                      }
                    >
                      <Text
                        style={[styles.filterOptionText, filters.paymentMethod === method && styles.filterOptionTextSelected]}
                      >
                        {method}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Receipt Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>{t('expenses.receipt')}</Text>
                <View style={styles.receiptFilterOptions}>
                  <TouchableOpacity
                    style={[styles.receiptFilterOption, filters.hasReceipt === true && styles.receiptFilterOptionSelected]}
                    onPress={() =>
                      setFilters((prev) => ({
                        ...prev,
                        hasReceipt: prev.hasReceipt === true ? null : true,
                      }))
                    }
                  >
                    <Feather name="check" size={16} color={filters.hasReceipt === true ? '#10b981' : '#64748b'} />
                    <Text style={[styles.receiptFilterOptionText, filters.hasReceipt === true && styles.receiptFilterOptionTextSelected]}>
                      {t('expenses.withReceipt')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.receiptFilterOption, filters.hasReceipt === false && styles.receiptFilterOptionSelected]}
                    onPress={() =>
                      setFilters((prev) => ({
                        ...prev,
                        hasReceipt: prev.hasReceipt === false ? null : false,
                      }))
                    }
                  >
                    <Feather name="x" size={16} color={filters.hasReceipt === false ? '#ef4444' : '#64748b'} />
                    <Text style={[styles.receiptFilterOptionText, filters.hasReceipt === false && styles.receiptFilterOptionTextSelected]}>
                      {t('expenses.withoutReceipt')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
                <Text style={styles.clearFiltersButtonText}>{t('expenses.clearAll')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyFiltersButton} onPress={applyFilters}>
                <Text style={styles.applyFiltersButtonText}>{t('expenses.applyFilters')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    Food: '#f59e0b',
    Transport: '#3b82f6',
    Shopping: '#ec4899',
    Entertainment: '#8b5cf6',
    Utilities: '#10b981',
    Health: '#ef4444',
    Other: '#64748b',
    Rent: '#8b5cf6',
  };
  return colors[category] || '#6366f1';
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterOptionSelected: {
    backgroundColor: '#e0e7ff',
    borderColor: '#6366f1',
  },
  filterOptionText: {
    color: '#334155',
    fontSize: 14,
  },
  filterOptionTextSelected: {
    color: '#6366f1',
    fontWeight: '600',
  },
  receiptFilterOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  receiptFilterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  receiptFilterOptionSelected: {
    backgroundColor: '#f0fdf4',
    borderColor: '#10b981',
  },
  receiptFilterOptionText: {
    color: '#334155',
    fontSize: 14,
  },
  receiptFilterOptionTextSelected: {
    color: '#10b981',
    fontWeight: '600',
  },
  clearFiltersButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    marginRight: 10,
  },
  clearFiltersButtonText: {
    color: '#6366f1',
    fontWeight: '600',
  },
  applyFiltersButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    alignItems: 'center',
  },
  applyFiltersButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  backButton: {
    padding: 2,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  filterButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  summaryCard: {
    backgroundColor: '#6366f1',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryLabel: {
    color: '#e0e7ff',
    fontSize: 14,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  summaryAmount: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  summarySubtext: {
    color: '#c7d2fe',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  activeFilters: {
    marginBottom: 16,
  },
  activeFiltersText: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  filterPillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  filterPillText: {
    fontSize: 12,
    color: '#334155',
    marginRight: 6,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  filterPillClose: {
    padding: 2,
  },
  clearFilters: {
    marginLeft: 8,
  },
  clearFiltersText: {
    fontSize: 12,
    color: '#6366f1',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#64748b',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  listContent: {
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  categoryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  category: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  description: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 6,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editBtn: {
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  deleteBtn: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  addButtonContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
  },
  addButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  offlineBanner: {
    backgroundColor: '#fee2e2',
    padding: 8,
    marginVertical: 6,
    borderRadius: 4,
    marginHorizontal: 20,
  },
  offlineText: {
    color: '#b91c1c',
    textAlign: 'center',
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
