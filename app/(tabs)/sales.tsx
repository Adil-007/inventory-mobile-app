import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../app/store';
import useNetworkStatus from '../../hooks/useNetworkStatus';
import saleService from '../../services/saleService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type SaleItem = {
  id: string;
  product: string;
  image: string | null;
  unit: string;
  brand: string;
  category: string;
  customer: string;
  salesperson: string;
  qty: number;
  price: number;
  totalAmount: number;
  unitPrice: number;
  amountPaid: number;
  amountDue: number;
  paymentStatus: string;
  paymentChannel: string;
  date: Date;
  formattedDate: string;
  status: string;
  dueDate: string;
};

type Filters = {
  status: string;
  paymentStatus: string;
  paymentChannel: string;
  startDate: string;
  endDate: string;
};

export default function SalesPage() {
  const { t } = useTranslation();
  const { isConnected } = useNetworkStatus();

  const [sales, setSales] = useState<SaleItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState<boolean>(false);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(null);
  const [showEndDatePicker, setShowEndDatePicker] = useState<boolean>(false);
  const [tempDate, setTempDate] = useState<Date | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filters, setFilters] = useState<Filters>({
    status: '',
    paymentStatus: '',
    paymentChannel: '',
    startDate: '',
    endDate: '',
  });
  const [pendingFilters, setPendingFilters] = useState<Filters>(filters);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const userRole = useSelector((state: RootState) => state.auth.user?.role);

  const isFetchingRef = useRef(false);

  // Offline alert shown once per offline event
  const [offlineErrorShown, setOfflineErrorShown] = useState(false);

  // Debounce and reset pagination when filters/search change
  const [debouncedParams, setDebouncedParams] = useState({
    searchQuery,
    filters,
  });

  // Debounce searchQuery and filters changes to reduce fetch calls
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedParams({ searchQuery, filters });
      // Reset pagination to page 1 when filters or search change
      setPagination((p) => ({ ...p, page: 1 }));
    }, 700);
    return () => clearTimeout(handler);
  }, [searchQuery, filters]);

  // Show offline alert only once per offline event
  useEffect(() => {
    if (!isConnected && !offlineErrorShown) {
      setOfflineErrorShown(true);
    } else if (isConnected && offlineErrorShown) {
      setOfflineErrorShown(false);
    }
  }, [isConnected, offlineErrorShown, t]);

  // Fetch sales data with concurrency control
  const fetchSales = useCallback(
    async (page = 1, limit = 50) => {
      if (!isConnected) {
        setLoading(false);
        return;
      }
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        setLoading(true);
        setError(null);

        const { sales: raw, total, totalPages } = await saleService.getAllSales({
          page,
          limit,
          search: debouncedParams.searchQuery,
          status: debouncedParams.filters.status,
          paymentStatus: debouncedParams.filters.paymentStatus,
          paymentChannel: debouncedParams.filters.paymentChannel,
          startDate: debouncedParams.filters.startDate,
          endDate: debouncedParams.filters.endDate,
          sortField: 'date',
          sortOrder: 'desc',
        });

        const formatted: SaleItem[] = raw.map((sale: any) => ({
          id: sale._id,
          product: sale.product?.name || t('sales.unknown'),
          image: sale.product?.image || null,
          unit: sale.product?.unit || '',
          brand: sale.product?.brand || '',
          category: sale.product?.category?.name || '',
          customer: sale.customerName,
          salesperson: sale.salesPerson?.name || t('sales.unknown'),
          qty: sale.quantity,
          price: sale.price,
          unitPrice: sale.price / sale.quantity,
          totalAmount: sale.price,
          amountPaid: sale.amountPaid,
          amountDue: sale.amountDue,
          paymentStatus: sale.paymentStatus,
          paymentChannel: sale.paymentChannel || '',
          date: new Date(sale.date),
          formattedDate: new Date(sale.date).toLocaleDateString(),
          status: sale.status.charAt(0).toUpperCase() + sale.status.slice(1),
          dueDate: sale.dueDate ? new Date(sale.dueDate).toLocaleDateString() : t('sales.na'),
        }));

        setSales(formatted);
        setPagination({ page, limit, total, totalPages });
      } finally {
        setLoading(false);
        isFetchingRef.current = false;
      }
    },
    [debouncedParams, isConnected, t]
  );

  // Fetch sales on screen focus

    useEffect(() => {
      fetchSales(1);
    }, [fetchSales]);

  // Refetch when page changes
  useEffect(() => {
    fetchSales(pagination.page);
  }, [pagination.page, fetchSales]);

  const handleDelete = (id: string) => {
    Alert.alert(
      t('sales.deleteSale'),
      t('sales.confirmDeleteSale'),
      [
        { text: t('sales.cancel'), style: 'cancel' },
        {
          text: t('sales.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(id);
              await saleService.deleteSale(id);
              fetchSales(pagination.page);
            } catch {
              Alert.alert(t('sales.error'), t('sales.failedToDelete'));
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const handleFullPayment = (saleId: string, totalAmount: number) => {
    Alert.alert(
      t('sales.markAsPaid'),
      t('sales.confirmMarkAsPaid'),
      [
        { text: t('sales.cancel'), style: 'cancel' },
        {
          text: t('sales.confirm'),
          style: 'default',
          onPress: async () => {
            try {
              await saleService.markAsPaid(saleId, {
                amountPaid: totalAmount,
                amountDue: 0,
                paymentStatus: 'paid',
                paymentDate: new Date().toISOString(),
              } as any);
              Alert.alert(t('sales.success'), t('sales.paymentRecorded'));
              fetchSales(pagination.page);
            } catch {
              Alert.alert(t('sales.error'), t('sales.failedToUpdatePayment'));
            }
          },
        },
      ]
    );
  };

  const applyFilters = () => {
    if (
      pendingFilters.startDate &&
      pendingFilters.endDate &&
      new Date(pendingFilters.startDate) > new Date(pendingFilters.endDate)
    ) {
      Alert.alert(t('sales.error'), t('sales.endDateBeforeStartError'));
      return;
    }
    setFilters(pendingFilters);
    setShowFilters(false);
  };

  // Clear filters handler
  const clearFilters = () => {
    setFilters({ status: '', paymentStatus: '', paymentChannel: '', startDate: '', endDate: '' });
    setSearchQuery('');
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchSales(1);
    setShowFilters(false);
  };

  const handleStartDateConfirm = (selectedDate: Date) => {
    setShowStartDatePicker(false);
    setPendingFilters(prev => ({
      ...prev,
      startDate: selectedDate.toISOString(),
      endDate: prev.endDate && new Date(prev.endDate) < selectedDate ? '' : prev.endDate
    }));
  };

  const handleEndDateConfirm = (selectedDate: Date) => {
    setShowEndDatePicker(false);
    setPendingFilters(prev => ({
      ...prev,
      endDate: selectedDate.toISOString()
    }));
    setTempEndDate(null);
  };

  const handleEdit = (id: string) => {
    router.push(`/sales/edit/${id}`);
  };


  const handleApproval = async (id: string, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        await saleService.approveSale(id);
        Alert.alert(t('sales.success'), t('sales.saleApproved'));
      } else {
        await saleService.rejectSale(id);
        Alert.alert(t('sales.success'), t('sales.saleRejected'));
      }
      fetchSales(pagination.page);
    } catch {
      Alert.alert(t('sales.error'), t('sales.failedToUpdateSale'));
    }
  };

  const formatDisplayDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#10b981';
      case 'partial': return '#f59e0b';
      case 'credit': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getPaymentMethodIcon = (status: string) => {
    switch (status) {
      case 'credit': return 'credit-card';
      case 'partial': return 'percent';
      case 'paid': return 'check-circle';
      default: return 'alert-circle';
    }
  };

  const getImageSource = (uri: string | null | undefined) =>
    uri ? { uri } : require('../../assets/images/placeholder-image.png');


return (
  <SafeAreaView style={styles.safeArea}>
      {isConnected === false && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>{t('common.offlineMessage')}</Text>
        </View>
      )}

      {loading && sales.length === 0 ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      ) : (
    <View style={styles.container}>

      {/* Pull to Refresh Hint */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 8 }}>
        <Feather name="chevron-down" size={16} color="#94a3b8" />
        <Text style={{ color: '#94a3b8', marginLeft: 4 }}>{t('sales.pullToRefresh')}</Text>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('sales.title')}</Text>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilters(true)}>
          <Feather name="filter" size={20} color="#6366f1" />
          <Text style={styles.filterBtnText}>{t('sales.filters')}</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={18} color="#94a3b8" />
        <TextInput
          placeholder={t('sales.searchPlaceholder')}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
          placeholderTextColor="#94a3b8"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Feather name="x" size={18} color="#94a3b8" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Active Filters */}
      {(filters.paymentStatus || filters.paymentChannel || filters.startDate || filters.endDate) && (
        <View style={styles.activeFilters}>
          <Text style={styles.activeFiltersText}>{t('sales.active')}:</Text>

          {filters.paymentStatus && (
            <View style={styles.filterPill}>
              <Text style={styles.filterPillText}>
                {t(`sales.paymentStatus.${filters.paymentStatus}`)}
              </Text>
              <TouchableOpacity onPress={() => setFilters({ ...filters, paymentStatus: '' })}>
                <Feather name="x" size={14} color="#64748b" />
              </TouchableOpacity>
            </View>
          )}

          {filters.paymentChannel && (
            <View style={styles.filterPill}>
              <Text style={styles.filterPillText}>
                {t(`sales.paymentChannel.${filters.paymentChannel.toLowerCase()}`)}
              </Text>
              <TouchableOpacity onPress={() => setFilters({ ...filters, paymentChannel: '' })}>
                <Feather name="x" size={14} color="#64748b" />
              </TouchableOpacity>
            </View>
          )}

          {/* Start Date badge */}
          {filters.startDate && (
            <View style={styles.filterPill}>
              <Text style={styles.filterPillText}>
                {t('sales.startDate')}: {formatDisplayDate(filters.startDate)}
              </Text>
              <TouchableOpacity onPress={() => setFilters({ ...filters, startDate: '' })}>
                <Feather name="x" size={14} color="#64748b" />
              </TouchableOpacity>
            </View>
          )}

          {/* End Date badge */}
          {filters.endDate && (
            <View style={styles.filterPill}>
              <Text style={styles.filterPillText}>
                {t('sales.endDate')}: {formatDisplayDate(filters.endDate)}
              </Text>
              <TouchableOpacity onPress={() => setFilters({ ...filters, endDate: '' })}>
                <Feather name="x" size={14} color="#64748b" />
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity onPress={clearFilters}>
            <Text style={styles.clearFilters}>{t('sales.clearAll')}</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      {/* Sales List */}
      <FlatList
        data={sales}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={() => fetchSales(pagination.page)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          error ? (
            <View style={styles.emptyState}>
              <Feather name="alert-triangle" size={48} color="#ef4444" />
              <Text style={styles.emptyText}>{t('sales.error')}</Text>
              <Text style={styles.emptySubtext}>{error}</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Feather name="package" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>{t('sales.noSales')}</Text>
              <Text style={styles.emptySubtext}>{t('sales.tryAdjusting')}</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              {
                borderLeftWidth: 4,
                borderLeftColor:
                  item.status === t('sales.status.approved')
                    ? '#10b981'
                    : item.status === t('sales.status.pending')
                    ? '#f59e0b'
                    : '#ef4444',
              },
            ]}
          >
            {/* Card Header */}
            <View style={styles.cardHeader}>
              <Image
                source={getImageSource(item.image)}
                style={styles.image}
                defaultSource={require('../../assets/images/placeholder-image.png')}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.productName}>{item.product}</Text>
                <Text style={styles.customerName}>{item.customer}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.statusBadge}>{item.status}</Text>
                <View
                  style={[
                    styles.paymentBadge,
                    {
                      backgroundColor: getPaymentStatusColor(item.paymentStatus) + '20',
                      borderColor: getPaymentStatusColor(item.paymentStatus),
                    },
                  ]}
                >
                  <Feather
                    name={getPaymentMethodIcon(item.paymentStatus)}
                    size={14}
                    color={getPaymentStatusColor(item.paymentStatus)}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      color: getPaymentStatusColor(item.paymentStatus),
                      marginLeft: 4,
                    }}
                  >
                    {t(`sales.paymentStatus.${item.paymentStatus}`)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Sale Details */}
            <View style={styles.detailsRow}>
              <Text style={styles.detailText}>
                {t('sales.qty')}: {item.qty} {item.unit}
              </Text>
              <Text style={styles.detailText}>
                {t('sales.unitPrice')}: ETB {item.unitPrice}
              </Text>
              <Text style={styles.detailText}>
                {t('sales.total')}: ETB {item.totalAmount}
              </Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailText}>
                {t('sales.paymentMethod')}: {/* Label like "Payment Method" */}
              </Text>
              <Text style={styles.detailText}>
                {item.paymentChannel
                  ? t(`sales.paymentChannel.${item.paymentChannel}`)
                  : t('sales.paymentChannel.unknown')}
              </Text>
            </View>

            <View style={styles.detailsRow}>
              <Text style={styles.detailText}>
                {t('sales.date')}: {item.formattedDate}
              </Text>
              <Text style={styles.detailText}>
                {t('sales.salesperson')}: {item.salesperson}
              </Text>
            </View>

            {/* Payment Progress */}
            {['credit', 'partial'].includes(item.paymentStatus) && (
              <View style={{ marginTop: 6 }}>
                <View style={styles.progressBar}>
                  <View
                    style={{
                      width: `${(item.amountPaid / item.totalAmount) * 100}%`,
                      height: 6,
                      backgroundColor: getPaymentStatusColor(item.paymentStatus),
                      borderRadius: 4,
                    }}
                  />
                </View>
                <View style={styles.detailsRow}>
                  <Text style={{ fontSize: 12 }}>
                    {t('sales.paid')}: ETB {item.amountPaid}
                  </Text>
                  <Text style={{ fontSize: 12 }}>
                    {t('sales.due')}: ETB {item.amountDue}
                  </Text>
                  <Text style={{ fontSize: 12 }}>
                    {t('sales.dueDate')}: {item.dueDate}
                  </Text>
                </View>
              </View>
            )}


            {/* Actions */}
            <View style={[styles.detailsRow, { marginTop: 8, justifyContent: 'flex-end', alignItems: 'center' }]}>
              {(userRole === 'admin' || userRole === 'superadmin') && (
                <>
                  {/* Edit: disabled if status is 'rejected' */}
                  {item.status.toLowerCase() !== 'rejected' && (
                    <TouchableOpacity onPress={() => handleEdit(item.id)} style={{ marginRight: 16 }}>
                      <Feather name="edit-3" size={18} color="#3b82f6" />
                    </TouchableOpacity>
                  )}
                  
                  {/* Delete: always shown regardless of status */}
                  <TouchableOpacity
                    onPress={() => handleDelete(item.id)}
                    style={{ marginRight: 16 }}
                    disabled={deletingId === item.id} // disable only for this row while deleting
                  >
                    {deletingId === item.id ? (
                      <ActivityIndicator size="small" color="#ef4444" />
                    ) : (
                      <Feather name="trash-2" size={18} color="#ef4444" />
                    )}
                  </TouchableOpacity>
                </>
              )}

              {(item.paymentStatus === 'credit' || item.paymentStatus === 'partial') && item.status.toLowerCase() !== 'rejected' &&
                (userRole === 'admin' || userRole === 'superadmin') && (
                  <TouchableOpacity
                    style={styles.paidButton}
                    onPress={() => handleFullPayment(item.id, item.totalAmount)}
                  >
                    <Feather name="check-circle" size={16} color="#fff" />
                    <Text style={styles.paidButtonText}>{t('sales.paidFully')}</Text>
                  </TouchableOpacity>
                )}

              {(userRole === 'admin' || userRole === 'superadmin') &&
                item.status.toLowerCase() === 'pending' &&
                item.status.toLowerCase() !== 'rejected' &&  (
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity onPress={() => handleApproval(item.id, 'approve')}>
                      <Feather name="check-circle" size={18} color="#10b981" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleApproval(item.id, 'reject')}>
                      <Feather name="x-circle" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                )}
            </View>
          </View>
        )}
      />

      {/* Pagination Controls */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 12 }}>
        <TouchableOpacity
          style={[styles.paginationButton, pagination.page <= 1 && styles.disabledButton]}
          onPress={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
          disabled={pagination.page <= 1}
        >
          <Text style={styles.paginationButtonText}>{t('previous')}</Text>
        </TouchableOpacity>

        <Text style={{ marginHorizontal: 12 }}>
          {t('page')} {pagination.page} {t('of')} {pagination.totalPages}
        </Text>

        <TouchableOpacity
          style={[styles.paginationButton, pagination.page >= pagination.totalPages && styles.disabledButton]}
          onPress={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
          disabled={pagination.page >= pagination.totalPages}
        >
          <Text style={styles.paginationButtonText}>{t('next')}</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Modal */}
      <Modal visible={showFilters} transparent animationType="slide" onRequestClose={() => setShowFilters(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.filterModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('sales.filters')}</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Feather name="x" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {/* Filter by Payment Channel */}
              <View style={styles.filterSection}>
                <Text style={styles.sectionTitle}>{t('sales.filterByPaymentChannel')}</Text>
                <View style={styles.filterOptions}>
                  {['', 'cash', 'bank'].map((channel) => (
                    <TouchableOpacity
                      key={channel || 'all'}
                      style={[
                        styles.filterOption,
                        pendingFilters.paymentChannel === channel && styles.selectedFilterOption
                      ]}
                      onPress={() => setPendingFilters((prev) => ({ ...prev, paymentChannel: channel }))}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          pendingFilters.paymentChannel === channel && styles.selectedFilterOptionText,
                        ]}
                      >
                        {channel ? t(`sale.${channel}`) : t('sales.allPaymentChannels')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Filter by Payment Status */}
              <View style={styles.filterSection}>
                <Text style={styles.sectionTitle}>{t('sales.filterByPayment')}</Text>
                <View style={styles.filterOptions}>
                  {['', 'paid', 'partial', 'credit'].map((payment) => (
                    <TouchableOpacity
                      key={payment || 'all'}
                      style={[styles.filterOption, pendingFilters.paymentStatus === payment && styles.selectedFilterOption]}
                      onPress={() => setPendingFilters((prev) => ({ ...prev, paymentStatus: payment }))}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          pendingFilters.paymentStatus === payment && styles.selectedFilterOptionText,
                        ]}
                      >
                        {payment ? t(`sales.paymentStatus.${payment}`) : t('sales.allPayments')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {/* Filter by Date */}
              <View style={styles.filterSection}>
                <Text style={styles.sectionTitle}>{t('sales.filterByDate')}</Text>
                
                <View style={styles.dateRow}>
                  {/* Start Date */}
                  <View style={styles.dateInputContainer}>
                    <Text style={styles.dateLabel}>{t('sales.startDate')}</Text>
                    <TouchableOpacity
                      style={styles.dateButton}
                      onPress={() => {
                        setTempDate(null);
                        setShowStartDatePicker(true);
                      }}
                    >
                      <Feather name="calendar" size={16} color="#64748b" style={styles.dateIcon} />
                      <Text style={styles.dateButtonText}>
                        {pendingFilters.startDate
                          ? formatDisplayDate(pendingFilters.startDate)
                          : t('sales.selectDate')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* End Date */}
                  <View style={styles.dateInputContainer}>
                    <Text style={styles.dateLabel}>{t('sales.endDate')}</Text>
                    <TouchableOpacity
                      style={[
                        styles.dateButton,
                        pendingFilters.startDate && !pendingFilters.endDate && styles.dateButtonWarning
                      ]}
                      onPress={() => {
                        if (!pendingFilters.startDate) {
                          Alert.alert(t('sales.error'), t('sales.selectStartDateFirst'));
                          return;
                        }
                        setTempEndDate(null);
                        setShowEndDatePicker(true);
                      }}
                      disabled={!pendingFilters.startDate}
                    >
                      <Feather name="calendar" size={16} color="#64748b" style={styles.dateIcon} />
                      <Text style={styles.dateButtonText}>
                        {pendingFilters.endDate
                          ? formatDisplayDate(pendingFilters.endDate)
                          : t('sales.selectDate')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Date Pickers */}
                {showStartDatePicker && (
                  <Modal transparent animationType="slide">
                    <View style={styles.datePickerModal}>
                      <View style={styles.datePickerContainer}>
                        <DateTimePicker
                          value={tempDate || (pendingFilters.startDate ? new Date(pendingFilters.startDate) : new Date())}
                          mode="date"
                          display="spinner"
                          onChange={(event, date) => date && setTempDate(date)}
                        />
                        <View style={styles.datePickerButtons}>
                          <TouchableOpacity 
                            style={styles.datePickerButton} 
                            onPress={() => setShowStartDatePicker(false)}
                          >
                            <Text style={styles.datePickerButtonText}>{t('cancel')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[styles.datePickerButton, styles.datePickerConfirmButton]}
                            onPress={() => tempDate && handleStartDateConfirm(tempDate)}
                          >
                            <Text style={styles.datePickerConfirmButtonText}>{t('confirm')}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </Modal>
                )}

                {showEndDatePicker && (
                  <Modal transparent animationType="slide">
                    <View style={styles.datePickerModal}>
                      <View style={styles.datePickerContainer}>
                        <DateTimePicker
                          value={tempEndDate || 
                                (pendingFilters.endDate ? new Date(pendingFilters.endDate) : 
                                pendingFilters.startDate ? new Date(pendingFilters.startDate) : 
                                new Date())}
                          mode="date"
                          display="spinner"
                          minimumDate={pendingFilters.startDate ? new Date(pendingFilters.startDate) : undefined}
                          onChange={(event, date) => date && setTempEndDate(date)}
                        />
                        <View style={styles.datePickerButtons}>
                          <TouchableOpacity 
                            style={styles.datePickerButton} 
                            onPress={() => setShowEndDatePicker(false)}
                          >
                            <Text style={styles.datePickerButtonText}>{t('cancel')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[styles.datePickerButton, styles.datePickerConfirmButton]}
                            onPress={() => tempEndDate && handleEndDateConfirm(tempEndDate)}
                          >
                            <Text style={styles.datePickerConfirmButtonText}>{t('confirm')}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </Modal>
                )}

                {/* Date Range Error */}
                {pendingFilters.startDate && pendingFilters.endDate && 
                  new Date(pendingFilters.startDate) > new Date(pendingFilters.endDate) && (
                    <Text style={styles.errorText}>
                      {t('sales.endDateBeforeStartError')}
                    </Text>
                )}
              </View>

            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => {
                  setPendingFilters({ status: '', paymentStatus: '', paymentChannel: '', startDate: '', endDate: '' }); // ✅ include it
                }}
              >
                <Text style={styles.resetButtonText}>{t('sales.resetFilters')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.applyButton} 
                onPress={applyFilters}>
                <Text style={styles.applyButtonText}>{t('sales.applyFilters')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Button */}
      <TouchableOpacity style={styles.addButton} onPress={() => router.push('/sales/add')}>
        <Feather name="plus" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
    )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  datePickerModal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  datePickerContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  datePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  datePickerButton: {
    padding: 10,
    marginLeft: 10,
  },
  datePickerConfirmButton: {
    backgroundColor: '#6366f1',
    borderRadius: 5,
  },
  datePickerButtonText: {
    color: '#6366f1',
    fontWeight: '500',
  },
  datePickerConfirmButtonText: {
    color: '#fff',
    fontWeight: '500',
  },

  // ===== Date Input Styles =====
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  dateInputContainer: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
    fontWeight: '500',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  dateButtonWarning: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  dateIcon: {
    marginRight: 8,
  },
    emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
    emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  dateButtonText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '400',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
    errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 8,
    marginHorizontal: 12,
    borderRadius: 4,
    marginBottom: 8,
  },
  filterSection: {
  marginBottom: 16,
},
saleRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingVertical: 4,
  borderBottomWidth: StyleSheet.hairlineWidth,
  borderBottomColor: '#e2e8f0', // slate-200
},

saleLabel: {
  fontSize: 14,
  fontWeight: '500',
  color: '#475569', // slate-600
},

saleValue: {
  fontSize: 14,
  fontWeight: '400',
  color: '#334155', // slate-800
},


sectionTitle: {
  fontSize: 16,
  fontWeight: '600',
  marginBottom: 8,
  color: '#334155', // matches other titles
},

filterOptions: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8, // RN 0.71+ supports gap, otherwise use marginRight/marginBottom
},

filterOption: {
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#cbd5e1', // slate-300
  backgroundColor: '#f8fafc', // slate-50
},

selectedFilterOption: {
  backgroundColor: '#6366f1', // indigo-500
  borderColor: '#6366f1',
},

filterOptionText: {
  fontSize: 14,
  color: '#334155', // slate-800
},

selectedFilterOptionText: {
  color: '#fff',
  fontWeight: '600',
},

paymentChannelText: {
  fontSize: 14,
  fontWeight: '500',
  color: '#475569', // slate-600
  marginTop: 2,
},

  paginationButton: {
  backgroundColor: '#6366f1',
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 6,
},
disabledButton: {
  backgroundColor: '#cbd5e1',
},
paginationButtonText: {
  color: '#fff',
  fontWeight: '600',
},

  paidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginLeft: 'auto',
  },
  offlineBanner: {
    backgroundColor: '#ef4444',
    padding: 8,
    alignItems: 'center'
  },
  offlineText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  paidButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 12,
  },
  activeFiltersText: {
    fontSize: 12,
    color: '#64748b',
    marginRight: 8,
    marginLeft: 10,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  filterPillText: {
    fontSize: 12,
    color: '#334155',
    marginRight: 4,
  },
  clearFilters: {
    fontSize: 12,
    color: '#6366f1',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  filterBtnText: {
    marginLeft: 6,
    color: '#6366f1',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    color: '#1e293b',
  },
  listContent: {
    paddingBottom: 80,
    paddingHorizontal: 13,
    paddingTop: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    marginHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  image: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 16,
    backgroundColor: '#e2e8f0',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    color: '#64748b',
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    color: '#fff',
    backgroundColor: '#1e40af',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#334155',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    marginVertical: 6,
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  filterModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  modalContent: {
    padding: 16,
  },

  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  resetButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  resetButtonText: {
    color: '#64748b',
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#6366f1',
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
