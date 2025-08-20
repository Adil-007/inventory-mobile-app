import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../app/store';

import useNetworkStatus from '../hooks/useNetworkStatus'; // add your network hook
import transferService from '../services/transferService';

interface Warehouse {
  _id: string;
  name: string;
}

interface Product {
  name?: string;
  image?: string;
  unit?: string;
}

interface Transfer {
  _id: string;
  product?: Product;
  quantity: number;
  sourceWarehouse?: Warehouse;
  destinationWarehouse?: Warehouse;
  date: string;
}

interface Filters {
  source: string;
  destination: string;
}

export default function TransfersPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isConnected } = useNetworkStatus();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [filters, setFilters] = useState<Filters>({ source: '', destination: '' });
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [, setError] = useState<string | null>(null);

  const userRole = useSelector((state: RootState) => state.auth.user?.role);

  // Concurrency ref to avoid double fetches
  const isFetchingRef = useRef(false);

  // Show offline alert once per offline event
  const [offlineErrorShown, setOfflineErrorShown] = useState(false);

  // Fetch transfers with network, error, and concurrency handling
  const fetchTransfers = useCallback(async () => {
    if (!isConnected) {
      setLoading(false);
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
      const data = await transferService.getAllTransfers();
      setTransfers(data);
    } catch {
      // No blocking alert to avoid duplicate with apiClient global alerts
      setError(t('transfers.errorFetch'));
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [isConnected, offlineErrorShown, t]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  useFocusEffect(
    useCallback(() => {
      fetchTransfers();
    }, [fetchTransfers])
  );

  const handleDelete = async (transferId: string) => {
    Alert.alert(
      t('transfers.confirmDeleteTitle'),
      t('transfers.confirmDeleteMessage'),
      [
        { text: t('transfers.cancel'), style: 'cancel' },
        {
          text: t('transfers.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await transferService.deleteTransfer(transferId);
              await fetchTransfers();
              Alert.alert(t('transfers.successDelete'));
            } catch {
              Alert.alert(t('transfers.errorDelete'));
            }
          },
        },
      ],
    );
  };

  const filteredTransfers = transfers.filter(t => {
    const search = searchQuery.toLowerCase();
    const matchesSearch =
      t.product?.name?.toLowerCase().includes(search) ||
      t.sourceWarehouse?.name?.toLowerCase().includes(search) ||
      t.destinationWarehouse?.name?.toLowerCase().includes(search);

    const matchSource = !filters.source || t.sourceWarehouse?.name === filters.source;
    const matchDest = !filters.destination || t.destinationWarehouse?.name === filters.destination;

    return matchesSearch && matchSource && matchDest;
  });

  const sources = [...new Set(transfers.map(t => t.sourceWarehouse?.name).filter(Boolean))] as string[];
  const destinations = [...new Set(transfers.map(t => t.destinationWarehouse?.name).filter(Boolean))] as string[];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Offline Banner */}
        {isConnected === false && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineText}>{t('common.offlineMessage')}</Text>
          </View>
        )}
        {/* Pull to Refresh Hint */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 8 }}>
          <Feather name="chevron-down" size={16} color="#94a3b8" />
          <Text style={{ color: '#94a3b8', marginLeft: 4 }}>{t('transfers.pullToRefresh')}</Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.leftGroup}>
            <TouchableOpacity onPress={() => router.replace('/more')} style={styles.backButton}>
              <Feather name="chevron-left" size={28} color="#0f0f0f" />
            </TouchableOpacity>
            <Text style={styles.title}>{t('transfers.title')}</Text>
          </View>

          <TouchableOpacity
            onPress={() => setShowFilters(true)}
            style={styles.filterButton}
            activeOpacity={0.7}
          >
            <Feather name="filter" size={20} color="#fff" />
            <Text style={styles.filterText}>{t('transfers.filters')}</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('transfers.searchPlaceholder')}
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearch}>
              <Feather name="x" size={18} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
        {/* Transfers List */}
        {filteredTransfers.length > 0 ? (
          <FlatList
            data={filteredTransfers}
            keyExtractor={item => item._id}
            refreshing={loading}
            onRefresh={fetchTransfers}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => router.push({ pathname: '/transfers/edit/[id]', params: { id: item._id } })}
                  style={{ flexDirection: 'row', flex: 1 }}
                >
                  <Image
                    source={{ uri: item.product?.image || 'https://via.placeholder.com/60' }}
                    style={styles.image}
                  />
                  <View style={styles.details}>
                    <View style={styles.detailHeader}>
                      <Text style={styles.name} numberOfLines={1}>{item.product?.name}</Text>
                      <Text style={styles.quantity}>{item.quantity} {item.product?.unit}</Text>
                    </View>
                    <View style={styles.transferInfo}>
                      <View style={styles.warehouseInfo}>
                        <Feather name="arrow-up" size={14} color="#ef4444" />
                        <Text style={styles.warehouseText}>{item.sourceWarehouse?.name}</Text>
                      </View>
                      <View style={styles.warehouseInfo}>
                        <Feather name="arrow-down" size={14} color="#10b981" />
                        <Text style={styles.warehouseText}>{item.destinationWarehouse?.name}</Text>
                      </View>
                    </View>
                    <View style={styles.dateContainer}>
                      <Feather name="calendar" size={14} color="#64748b" />
                      <Text style={styles.dateText}>
                        {new Date(item.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {(userRole === 'admin' || userRole === 'superadmin') && (
                  <View style={styles.actionsContainer}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => router.push({
                        pathname: '/transfers/edit/[id]',
                        params: { id: item._id },
                      })}
                    >
                      <Feather name="edit-2" size={16} color="#3b82f6" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#fee2e2' }]}
                      onPress={() => handleDelete(item._id)}
                    >
                      <Feather name="trash-2" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          />
        ) : (
          !loading && (
            <View style={styles.emptyState}>
              <Feather name="package" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>{t('transfers.noTransfersFound')}</Text>
              <Text style={styles.emptySubtext}>{t('transfers.tryAdjustingFilters')}</Text>
            </View>
          )
        )}

        {/* Add Button for Admin */}
        {(userRole === 'admin' || userRole === 'superadmin') && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/transfers/add')}
            activeOpacity={0.8}
            accessibilityLabel={t('transfers.addTransfer')}
          >
            <Feather name="plus" size={28} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Filters Modal */}
        <Modal visible={showFilters} transparent animationType="slide" onRequestClose={() => setShowFilters(false)}>
          <TouchableWithoutFeedback onPress={() => setShowFilters(false)}>
            <View style={styles.modalOverlay} />
          </TouchableWithoutFeedback>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('transfers.filterTransfers')}</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Feather name="x" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.label}>{t('transfers.fromWarehouse')}</Text>
              <View style={styles.optionsContainer}>
                {sources.map(source => (
                  <TouchableOpacity
                    key={source}
                    onPress={() => setFilters(prev => ({ ...prev, source }))}
                    style={[styles.optionButton, filters.source === source && styles.selectedOption]}
                  >
                    <Text style={[styles.optionText, filters.source === source && styles.selectedOptionText]}>{source}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.label}>{t('transfers.toWarehouse')}</Text>
              <View style={styles.optionsContainer}>
                {destinations.map(dest => (
                  <TouchableOpacity
                    key={dest}
                    onPress={() => setFilters(prev => ({ ...prev, destination: dest }))}
                    style={[styles.optionButton, filters.destination === dest && styles.selectedOption]}
                  >
                    <Text style={[styles.optionText, filters.destination === dest && styles.selectedOptionText]}>{dest}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setFilters({ source: '', destination: '' })}
                activeOpacity={0.7}
              >
                <Text style={styles.clearText}>{t('transfers.resetFilters')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setShowFilters(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.applyText}>{t('transfers.applyFilters')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#f8fafc' 
  },
  container: { 
    flex: 1, 
    padding: 20,
    backgroundColor: '#f8fafc'
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingVertical: 16,
    alignItems: 'center', 
    marginBottom: 20 
  },
  backButton: {
    marginRight: 8,
  },
  title: { 
    fontSize: 28, 
    fontWeight: '700', 
    color: '#1e293b',
    fontFamily: 'Inter_700Bold'
  },
  filterButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    backgroundColor: '#6366f1', 
    paddingHorizontal: 16,
    paddingVertical: 10, 
    borderRadius: 12,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
  },
  filterText: { 
    color: '#fff', 
    fontWeight: '600',
    fontSize: 14
  },
  searchContainer: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 14, 
    alignItems: 'center', 
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1
  },
  searchIcon: {
    marginRight: 10
  },
  searchInput: { 
    flex: 1, 
    color: '#1e293b',
    fontSize: 16
  },
  clearSearch: {
    padding: 4
  },
  listContent: {
    paddingBottom: 100
  },
  card: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 12, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  image: { 
    width: 60, 
    height: 60, 
    borderRadius: 12, 
    marginRight: 16,
    backgroundColor: '#e2e8f0'
  },
  details: { 
    flex: 1,
    justifyContent: 'space-between'
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  name: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#1e293b',
    flex: 1,
    marginRight: 8
  },
  quantity: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1'
  },
  transferInfo: {
    marginBottom: 8
  },
  warehouseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  warehouseText: {
    fontSize: 14,
    color: '#475569',
    marginLeft: 6
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  dateText: {
    fontSize: 13,
    color: '#64748b',
    marginLeft: 6
  },
  actionsContainer: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    marginLeft: 8
  },
  actionButton: {
    backgroundColor: '#dbeafe',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4
  },
  addButton: { 
    position: 'absolute', 
    right: 24, 
    bottom: 24, 
    backgroundColor: '#6366f1', 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.4)' 
  },
  modal: { 
    backgroundColor: '#fff', 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    padding: 24,
    paddingBottom: 32,
    maxHeight: '80%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#1e293b' 
  },
  filterSection: {
    marginBottom: 20
  },
  label: { 
    fontSize: 14, 
    fontWeight: '600', 
    marginBottom: 12,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  optionButton: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  optionText: {
    fontSize: 14,
    color: '#334155'
  },
  selectedOption: {
    backgroundColor: '#e0e7ff',
    borderColor: '#c7d2fe'
  },
  selectedOptionText: {
    color: '#4f46e5',
    fontWeight: '600'
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16
  },
  clearButton: { 
    flex: 1,
    backgroundColor: '#f1f5f9', 
    padding: 16, 
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  clearText: { 
    color: '#64748b',
    fontWeight: '600',
    fontSize: 16
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  applyText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16
  },

  // Offline banner styles
  offlineBanner: {
    backgroundColor: '#fee2e2',
    padding: 8,
    marginVertical: 6,
    borderRadius: 4,
  },
  offlineText: {
    color: '#b91c1c',
    textAlign: 'center',
  },

  // Inline error message styles
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 8,
    marginVertical: 6,
    borderRadius: 4,
  },
  errorText: {
    color: '#b91c1c',
    textAlign: 'center',
  },
});
