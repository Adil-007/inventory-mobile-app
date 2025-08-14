import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../app/store'; // adjust path if inside a subfolder

import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AddWarehouseModal from '../app/warehouses/add';
import EditWarehouseModal from '../app/warehouses/edit/[id]';
import useNetworkStatus from '../hooks/useNetworkStatus'; // assume you have this hook
import warehouseService from '../services/warehouseService';

interface Warehouse {
  _id: string;
  name: string;
  location: string;
}

export default function WarehousesPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isConnected } = useNetworkStatus();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const animation = useRef(new Animated.Value(0)).current;
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const userRole = useSelector((state: RootState) => state.auth.user?.role);

  // Avoid concurrent fetches
  const isFetchingRef = useRef(false);

  // Offline alert shown once per offline event
  const [offlineErrorShown, setOfflineErrorShown] = useState(false);

  // Fetch warehouses with offline and concurrency check
  const fetchWarehouses = useCallback(async () => {
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
      const data = await warehouseService.getAllWarehouses();
      setWarehouses(data);
    } catch {
      // Don't alert here for network/server error - apiClient handles global alerts
      // Just set inline error message for user feedback
      setError(t('warehouses.errorLoading'));
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [isConnected, offlineErrorShown, t]);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWarehouses();
    setRefreshing(false);
  };

  const handleDelete = (warehouseId: string) => {
    Alert.alert(
      t('warehouses.confirmDeleteTitle'),
      t('warehouses.confirmDeleteMessage'),
      [
        { text: t('warehouses.cancel'), style: 'cancel' },
        {
          text: t('warehouses.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await warehouseService.deleteWarehouse(warehouseId);
              await fetchWarehouses();
            } catch {
              Alert.alert(t('warehouses.errorTitle'), t('warehouses.errorDelete'));
            }
          },
        },
      ]
    );
  };

  const filtered = warehouses.filter(
    (w) =>
      w.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const animateButton = () => {
    Animated.sequence([
      Animated.timing(animation, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(animation, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => setShowAddModal(true));
  };

  const buttonScale = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.9],
  });

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
          <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/more')} activeOpacity={0.7}>
            <Feather name="arrow-left" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.title}>{t('warehouses.title')}</Text>
          <View style={styles.headerRightPlaceholder} />
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={18} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('warehouses.searchPlaceholder')}
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>{t('warehouses.loading')}</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366f1']} tintColor="#6366f1" />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Feather name="archive" size={48} color="#e2e8f0" />
                <Text style={styles.emptyText}>
                  {searchQuery ? t('warehouses.noMatching') : t('warehouses.noWarehouses')}
                </Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery ? t('warehouses.tryDifferentSearch') : t('warehouses.addFirst')}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Feather name="home" size={20} color="#6366f1" style={styles.warehouseIcon} />
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Feather name="map-pin" size={14} color="#64748b" />
                  <Text style={styles.detail} numberOfLines={2}>
                    {item.location}
                  </Text>
                </View>
                {(userRole === 'admin' || userRole === 'superadmin') && (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.editBtn]}
                      activeOpacity={0.7}
                      onPress={() => {
                        setSelectedWarehouse(item);
                        setShowEditModal(true);
                      }}
                    >
                      <Feather name="edit-3" size={16} color="#6366f1" />
                      <Text style={styles.actionText}>{t('warehouses.edit')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.deleteBtn]}
                      onPress={() => handleDelete(item._id)}
                      activeOpacity={0.7}
                    >
                      <Feather name="trash-2" size={16} color="#ef4444" />
                      <Text style={[styles.actionText, { color: '#ef4444' }]}>{t('warehouses.delete')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          />
        )}

        {/* Admin-only Add Button */}
        {(userRole === 'admin' || userRole === 'superadmin') && (
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={animateButton}
              activeOpacity={0.8}
              accessibilityLabel={t('warehouses.add')}
            >
              <Feather name="plus" size={24} color="#fff" />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Add/Edit Modals */}
        <AddWarehouseModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            fetchWarehouses();
            setShowAddModal(false);
          }}
        />
        <EditWarehouseModal
          visible={showEditModal}
          warehouse={selectedWarehouse}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            fetchWarehouses();
            setShowEditModal(false);
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
  container: {
    flex: 1,
    paddingHorizontal: 12,
  },
  // offline banner styles
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
  // error message style
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  headerRightPlaceholder: { width: 40 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
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
  listContent: {
    paddingBottom: 100,
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
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  warehouseIcon: {
    marginRight: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detail: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 8,
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
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
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
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
});

