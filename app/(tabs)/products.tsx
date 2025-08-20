import categoryService from '@/services/categoryService';
import warehouseService from '@/services/warehouseService';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../app/store';
import useNetworkStatus from '../../hooks/useNetworkStatus';
import productService from '../../services/productService';

type Product = {
  _id: string;
  name: string;
  brand: string;
  quantity: number;
  category: {
    _id: string;
    name: string;
  };
  unit: string;
  warehouse: {
    _id: string;
    name: string;
  };
  image?: string;
  buyingPrice?: number;
  sellingPrice?: number;
  createdAt?: string;
};

type SortOption = {
  id: string;
  label: string;
  value: keyof Product;
  order: 'asc' | 'desc';
};

type Filters = {
  category: string;
  warehouse: string;
  stockStatus: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const validSortFields: ('name' | 'quantity' | 'createdAt')[] = ['name', 'quantity', 'createdAt'];

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ProductsPage() {
  const { isConnected } = useNetworkStatus();
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
  });
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const userRole = useSelector((state: RootState) => state.auth.user?.role);
  const { t } = useTranslation();

  const [filters, setFilters] = useState<Filters>({
    category: '',
    warehouse: '',
    stockStatus: '',
  });
  const [pendingFilters, setPendingFilters] = useState<Filters>(filters);
  const [sortOption, setSortOption] = useState<SortOption | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [warehouseList, setWarehouseList] = useState<{ _id: string; name: string }[]>([]);
  const [categoryList, setCategoryList] = useState<{ _id: string; name: string }[]>([]);

  // Concurrency refs
  const isFetchingInitialDataRef = useRef(false);
  const isFetchingProductsRef = useRef(false);

  // Offline alert shown state - only once per offline event
  const [offlineErrorShown, setOfflineErrorShown] = useState(false);

  const SORT_OPTIONS = useMemo<SortOption[]>(
    () => [
      { id: '1', label: t('products.nameAZ'), value: 'name', order: 'asc' },
      { id: '2', label: t('products.nameZA'), value: 'name', order: 'desc' },
      { id: '3', label: t('products.quantityLowHigh'), value: 'quantity', order: 'asc' },
      { id: '4', label: t('products.quantityHighLow'), value: 'quantity', order: 'desc' },
      { id: '5', label: t('products.dateNewest'), value: 'createdAt', order: 'desc' },
      { id: '6', label: t('products.dateOldest'), value: 'createdAt', order: 'asc' },
    ],
    [t]
  );

  // Set default sort option once
  useEffect(() => {
    if (!sortOption) {
      setSortOption(SORT_OPTIONS[0]);
    }
  }, [SORT_OPTIONS, sortOption]);

  // Offline Alert: Debounced, once per offline event
  useEffect(() => {
    if (!isConnected && !offlineErrorShown) {
      setOfflineErrorShown(true);
    } else if (isConnected && offlineErrorShown) {
      setOfflineErrorShown(false);
    }
  }, [isConnected, offlineErrorShown, t]);

  // Fetch initial warehouses and categories
  const fetchInitialData = useCallback(async () => {
    if (!isConnected) {
      setLoading(false);
      return;
    }
    if (isFetchingInitialDataRef.current) return;
    isFetchingInitialDataRef.current = true;

    try {
      const [warehouses, categories] = await Promise.all([
        warehouseService.getAllWarehouses(),
        categoryService.getAllCategories(),
      ]);
      setWarehouseList(warehouses);
      setCategoryList(categories);
    } finally {
      isFetchingInitialDataRef.current = false;
    }
  }, [isConnected]);

  // Debounce searchQuery, filters, sortOption; on any change reset page to 1 and update params
  const [debouncedParams, setDebouncedParams] = useState({
    searchQuery,
    filters,
    sortOption,
  });

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedParams({ searchQuery, filters, sortOption });
      // Reset pagination to page 1 when params change
      setPagination((p) => ({ ...p, page: 1 }));
    }, 700);
    return () => clearTimeout(handler);
  }, [searchQuery, filters, sortOption]);

  // Fetch products with given page (default 1)
  const fetchProducts = useCallback(
    async (page = 1, limit = 50) => {
      if (!isConnected) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      if (isFetchingProductsRef.current) return;
      isFetchingProductsRef.current = true;

      try {
        if (page === 1 && !refreshing) setLoading(true);
        if (refreshing) setRefreshing(true);

        const { products: newProducts, total, totalPages } = await productService.getAllProducts({
          page,
          limit,
          search: debouncedParams.searchQuery,
          warehouse: debouncedParams.filters.warehouse,
          category: debouncedParams.filters.category,
          stockStatus: debouncedParams.filters.stockStatus as 'in' | 'low' | 'out',
          sortField: validSortFields.includes(debouncedParams.sortOption?.value as any)
            ? (debouncedParams.sortOption?.value as 'name' | 'quantity' | 'createdAt')
            : 'createdAt',
          sortOrder: debouncedParams.sortOption?.order ?? 'desc',
        });

        setProducts(newProducts);
        setPagination({ page, limit, total, totalPages });
        setError(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
        isFetchingProductsRef.current = false;
      }
    },
    [debouncedParams, isConnected, refreshing]
  );

  // Initial data fetch on mount
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Fetch products when debouncedParams or pagination.page changes
  useEffect(() => {
    fetchProducts(pagination.page);
  }, [debouncedParams, pagination.page, fetchProducts]);

  // Pull-to-refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProducts(1);
  };

  // Apply filters from the modal
  const applyFilters = () => {
    setFilters(pendingFilters);
    setShowFilters(false);
  };

  // Clear filters and reset sorting, search, pagination
  const clearFilters = () => {
    setFilters({ category: '', warehouse: '', stockStatus: '' });
    setPendingFilters({ category: '', warehouse: '', stockStatus: '' });
    setSearchQuery('');
    setSortOption(SORT_OPTIONS[0]);
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchProducts(1);
    setShowFilters(false);
  };

  const getImageSource = (uri: string | undefined | null) => {
    if (!uri) return require('../../assets/images/placeholder-image.png');
    return { uri };
  };
  return (
    <SafeAreaView style={styles.safeArea}>
      {isConnected === false && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>{t('common.offlineMessage')}</Text>
        </View>
      )}
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      ) : (
      <View style={styles.container}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 8 }}>
          <Feather name="chevron-down" size={16} color="#94a3b8" />
          <Text style={{ color: '#94a3b8', marginLeft: 4 }}>{t('products.pulltorefresh')}</Text>
        </View>

        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('products.title')}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.sortButton} onPress={() => setShowFilters(true)}>
              <Feather name="filter" size={20} color="#6366f1" />
              <Text style={styles.filterButtonText}>{t('products.filters')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sortButton} onPress={() => setShowSort(true)}>
              <Feather name="sliders" size={20} color="#6366f1" />
              <Text style={styles.filterButtonText}>{t('products.sort')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('products.searchPlaceholder')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94a3b8"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Feather name="x" size={18} color="#94a3b8" />
          </TouchableOpacity>
        ) : null}
        </View>

        {(filters.category || filters.warehouse || filters.stockStatus || (sortOption && sortOption.id !== SORT_OPTIONS[0].id)) && (
          <View style={styles.activeFilters}>
            <Text style={styles.activeFiltersText}>{t('products.active')}</Text>
            {filters.category && (
              <View style={styles.filterPill}>
                <Text style={styles.filterPillText}>
                  {categoryList.find(c => c._id === filters.category)?.name || filters.category}
                </Text>
                <TouchableOpacity onPress={() => setFilters({ ...filters, category: '' })}>
                  <Feather name="x" size={14} color="#64748b" />
                </TouchableOpacity>
              </View>
            )}
            {filters.warehouse && (
              <View style={styles.filterPill}>
                <Text style={styles.filterPillText}>                  
                  {warehouseList.find(w => w._id === filters.warehouse)?.name || filters.warehouse}
                </Text>
                <TouchableOpacity onPress={() => setFilters({ ...filters, warehouse: '' })}>
                  <Feather name="x" size={14} color="#64748b" />
                </TouchableOpacity>
              </View>
            )}
            {filters.stockStatus && (
              <View style={styles.filterPill}>
                <Text style={styles.filterPillText}>
                  {filters.stockStatus === 'out'
                    ? t('products.outOfStock')
                    : filters.stockStatus === 'low'
                      ? t('products.lowStock')
                      : t('products.inStock')}
                </Text>
                <TouchableOpacity onPress={() => setFilters({ ...filters, stockStatus: '' })}>
                  <Feather name="x" size={14} color="#64748b" />
                </TouchableOpacity>
              </View>
            )}
            {sortOption && sortOption.id !== SORT_OPTIONS[0].id && (
              <View style={styles.filterPill}>
                <Text style={styles.filterPillText}>{sortOption.label}</Text>
                <TouchableOpacity onPress={() => setSortOption(SORT_OPTIONS[0])}>
                  <Feather name="x" size={14} color="#64748b" />
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity
              onPress={() => {
                clearFilters();
                setSortOption(SORT_OPTIONS[0]);
              }}
            >
              <Text style={styles.clearFilters}>{t('products.clearAll')}</Text>
            </TouchableOpacity>
          </View>
        )}

          <FlatList
            data={products}
            keyExtractor={(item) => item._id}
            onRefresh={onRefresh}
            refreshing={refreshing}
            ListEmptyComponent={
              error ? (
                <View style={styles.emptyState}>
                  <Feather name="alert-triangle" size={48} color="#ef4444" />
                  <Text style={styles.emptyText}>{t('products.error')}</Text>
                  <Text style={styles.emptySubtext}>{error}</Text>
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Feather name="package" size={48} color="#cbd5e1" />
                  <Text style={styles.emptyText}>{t('products.noProducts')}</Text>
                  <Text style={styles.emptySubtext}>{t('products.tryAdjusting')}</Text>
                </View>
              )
            }
            renderItem={({ item }) => (
              <View
                style={[
                  styles.card,
                  item.quantity === 0
                    ? styles.outOfStock
                    : item.quantity <= 5
                      ? styles.lowStock
                      : {},
                ]}
              >
                <TouchableOpacity onPress={() => setPreviewImageUrl(item.image ?? null)}>
                  <Image
                    source={getImageSource(item.image)}
                    style={styles.image}
                    defaultSource={require('../../assets/images/placeholder-image.png')}
                  />
                </TouchableOpacity>
                <View style={styles.info}>
                  <View style={styles.infoHeader}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={styles.stockIndicator}>
                      <View
                        style={[
                          styles.stockDot,
                          item.quantity === 0
                            ? { backgroundColor: '#ef4444' }
                            : item.quantity <= 5
                              ? { backgroundColor: '#f59e0b' }
                              : { backgroundColor: '#10b981' },
                        ]}
                      />
                      <Text
                        style={[
                          styles.stockText,
                          item.quantity === 0
                            ? { color: '#ef4444' }
                            : item.quantity <= 5
                              ? { color: '#f59e0b' }
                              : { color: '#10b981' },
                        ]}
                      >
                        {item.quantity === 0
                          ? t('products.outOfStock')
                          : item.quantity <= 5
                            ? t('products.lowStock')
                            : t('products.inStock')}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.meta}>
                    {item.brand} • {item.category?.name || t('products.unknownCategory')}
                  </Text>
                  <Text style={styles.meta}>{item.warehouse?.name || t('products.unknownWarehouse')}</Text>
                  <View style={styles.quantityRow}>
                    <Text style={styles.quantity}>
                      <Text style={styles.bold}>{item.quantity}</Text> {item.unit}
                    </Text>
                  </View>
                  <View style={styles.priceContainer}>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>{t('products.buyingPrice')}:</Text>
                      <Text style={styles.priceValue}>
                        ETB {item.buyingPrice?.toLocaleString() ?? '-'}
                      </Text>
                    </View>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>{t('products.sellingPrice')}:</Text>
                      <Text style={[styles.priceValue, styles.sellingPrice]}>
                        ETB {item.sellingPrice?.toLocaleString() ?? '-'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.actions}>
                  {(userRole === 'admin' || userRole === 'superadmin') && (
                    <>
                      <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => router.push(`/products/edit/${item._id}`)}
                      >
                        <Feather name="edit" size={18} color="#6366f1" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => {
                          Alert.alert(
                            t('products.delete'),
                            t('products.confirmDelete'),
                            [
                              { text: t('products.cancel'), style: 'cancel' },
                              {
                                text: t('products.delete'),
                                style: 'destructive',
                                onPress: async () => {
                                  try {
                                    await productService.deleteProduct(item._id);
                                    fetchProducts();
                                  } catch {
                                    Alert.alert(t('products.error'), t('products.failedToLoad'));
                                  }
                                },
                              },
                            ]
                          );
                        }}
                      >
                        <Feather name="trash-2" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            )}
          />
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

          {(userRole === 'admin' || userRole === 'superadmin') && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/products/add')}
              accessibilityLabel={t('products.addProduct')}
            >
              <Feather name="plus" size={24} color="#fff" />
            </TouchableOpacity>
          )}

        <Modal
          visible={!!previewImageUrl}
          transparent={true}
          onRequestClose={() => setPreviewImageUrl(null)}
        >
          <View style={styles.modalContainer}>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setPreviewImageUrl(null)}>
              <Feather name="x" size={28} color="#fff" />
            </TouchableOpacity>
            <Image
              source={getImageSource(previewImageUrl ?? undefined)}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          </View>
        </Modal>

        <Modal
          visible={showFilters}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowFilters(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowFilters(false)}>
            <View style={styles.modalOverlay} />
          </TouchableWithoutFeedback>
          <View style={styles.filterModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('products.filterProducts')}</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Feather name="x" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <View style={styles.filterSection}>
                <Text style={styles.sectionTitle}>{t('products.filterBy')}</Text>
                <Text style={styles.filterLabel}>{t('products.category')}</Text>
              <View style={styles.optionsContainer}>
                {categoryList.map((category) => (
                  <TouchableOpacity
                    key={category._id}
                    style={[
                      styles.filterOption,
                      pendingFilters.category === category._id && styles.selectedFilterOption,
                    ]}
                    onPress={() =>
                      setPendingFilters(prev => ({
                        ...prev,
                        category: prev.category === category._id ? '' : category._id
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        pendingFilters.category === category._id && styles.selectedFilterOptionText,
                      ]}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Warehouses */}
              <Text style={styles.filterLabel}>{t('products.warehouse')}</Text>
              <View style={styles.optionsContainer}>
                {warehouseList.map((warehouse) => (
                  <TouchableOpacity
                    key={warehouse._id}
                    style={[
                      styles.filterOption,
                      filters.warehouse === warehouse._id && styles.selectedFilterOption,
                    ]}
                    onPress={() =>
                      setPendingFilters(prev => ({
                        ...prev,
                        warehouse: prev.warehouse === warehouse._id ? '' : warehouse._id
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        pendingFilters.warehouse === warehouse._id && styles.selectedFilterOptionText,
                      ]}
                    >
                      {warehouse.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

                <Text style={styles.filterLabel}>{t('products.stockStatus')}</Text>
                <View style={styles.optionsContainer}>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      pendingFilters.stockStatus === 'in' && styles.selectedFilterOption,
                    ]}
                    onPress={() =>
                     setPendingFilters((prev) => ({ ...prev, stockStatus: prev.stockStatus === 'in' ? '' : 'in',}))}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        pendingFilters.stockStatus === 'in' && styles.selectedFilterOptionText,
                      ]}
                    >
                      {t('products.inStock')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      pendingFilters.stockStatus === 'low' && styles.selectedFilterOption,
                    ]}
                    onPress={() => setPendingFilters((prev) => ({ ...prev, stockStatus: prev.stockStatus === 'low' ? '' : 'low',}))}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        pendingFilters.stockStatus === 'low' && styles.selectedFilterOptionText,
                      ]}
                    >
                      {t('products.lowStock')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      filters.stockStatus === 'out' && styles.selectedFilterOption,
                    ]}
                    onPress={() => setPendingFilters((prev) => ({ ...prev, stockStatus: prev.stockStatus === 'out' ? '' : 'out',}))}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        pendingFilters.stockStatus === 'out' && styles.selectedFilterOptionText,
                      ]}
                    >
                      {t('products.outOfStock')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  setPendingFilters({ category: '', warehouse: '', stockStatus: '', });
                  setSortOption(SORT_OPTIONS[0]);
                }}
              >
                <Text style={styles.clearButtonText}>{t('products.resetAll')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={() => applyFilters()}>
                <Text style={styles.applyButtonText}>{t('products.apply')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showSort}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowSort(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowSort(false)}>
            <View style={styles.modalOverlay} />
          </TouchableWithoutFeedback>
          <View style={styles.filterModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('products.sortProducts')}</Text>
              <TouchableOpacity onPress={() => setShowSort(false)}>
                <Feather name="x" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <View style={styles.filterSection}>
                <Text style={styles.sectionTitle}>{t('products.sortBy')}</Text>
                {SORT_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.optionItem,
                      sortOption && sortOption.id === option.id && styles.selectedOptionItem,
                    ]}
                    onPress={() => {
                      setSortOption(option);
                      setShowSort(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        sortOption && sortOption.id === option.id && styles.selectedOptionText,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {sortOption && sortOption.id === option.id && (
                      <Feather name="check" size={18} color="#6366f1" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </Modal>
      </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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

  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: Platform.OS === 'android' ? 16 : 0,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#e0e7ff',
    borderRadius: 8,
    marginTop: 10,
  },
  filterButtonText: {
    marginLeft: 6,
    color: '#6366f1',
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  searchLoading: {
    marginLeft: 8,
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
  card: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    alignItems: 'center',
  },
  outOfStock: {
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  lowStock: {
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
    backgroundColor: '#e2e8f0',
  },
  info: {
    flex: 1,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    marginRight: 8,
  },
  stockIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '500',
  },
  meta: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 2,
  },
  quantityRow: {
    marginTop: 8,
  },
  quantity: {
    fontSize: 14,
    color: '#1e293b',
  },
  bold: {
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginLeft: 12,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
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
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
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
  loadingMore: {
    paddingVertical: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  fullScreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  filterModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
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
  filterSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  selectedOptionItem: {
    backgroundColor: '#f8fafc',
  },
  optionText: {
    fontSize: 15,
    color: '#334155',
  },
  selectedOptionText: {
    color: '#6366f1',
    fontWeight: '500',
  },
  filterLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectedFilterOption: {
    backgroundColor: '#e0e7ff',
    borderColor: '#c7d2fe',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#334155',
  },
  selectedFilterOptionText: {
    color: '#4f46e5',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  clearButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    marginRight: 8,
  },
  clearButtonText: {
    color: '#64748b',
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    borderRadius: 8,
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  priceContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  sellingPrice: {
    color: '#10b981',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  priceLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  priceValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '700',
  },
});