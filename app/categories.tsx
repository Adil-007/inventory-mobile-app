import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
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

import { useSelector } from 'react-redux';
import AddCategoryModal from '../app/categories/add';
import EditCategoryModal from '../app/categories/edit/[id]';
import { RootState } from '../app/store';
import useNetworkStatus from '../hooks/useNetworkStatus';
import categoryService from '../services/categoryService';

interface Category {
  _id: string;
  name: string;
  productCount?: number;
}

interface CategoryCount {
  categoryId: string;
  count: number;
}

export default function CategoriesPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const userRole = useSelector((state: RootState) => state.auth.user?.role);
  const { isConnected } = useNetworkStatus();

  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [animation] = useState(new Animated.Value(0));
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  // Offline alert shown once per offline event
  const [offlineErrorShown, setOfflineErrorShown] = useState(false);

  const fetchCategories = useCallback(async () => {
    if (!isConnected) {
      setError(t('common.offlineMessage') || 'No internet connection');
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
      const categories = await categoryService.getAllCategories();
      const counts = await categoryService.getCategoryCounts();

      const categoriesWithCounts = categories.map((cat: Category) => {
        const countEntry = counts.find((c: CategoryCount) => c.categoryId === cat._id);
        return {
          ...cat,
          productCount: countEntry?.count || 0,
        };
      });
      setCategories(categoriesWithCounts);
    } catch {
      // No alert here to avoid duplicates; just inline error
      setError(t('categoriesPage.errorLoading') || 'Failed to load categories');
    } finally {
      isFetchingRef.current = false;
    }
  }, [t, isConnected, offlineErrorShown]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCategories();
    setRefreshing(false);
  };

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (categoryId: string) => {
    Alert.alert(
      t('categoriesPage.confirmDeleteTitle'),
      t('categoriesPage.confirmDeleteMessage'),
      [
        { text: t('categoriesPage.cancel'), style: 'cancel' },
        {
          text: t('categoriesPage.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await categoryService.deleteCategory(categoryId);
              await fetchCategories();
            } catch {
              Alert.alert(
                t('categoriesPage.deleteErrorTitle'),
                t('categoriesPage.deleteErrorMessage')
              );
            }
          },
        },
      ]
    );
  };

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
      {/* Offline Banner */}
      {isConnected === false && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>{t('common.offlineMessage')}</Text>
        </View>
      )}
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/more')}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.title}>{t('categoriesPage.title')}</Text>
          <View style={styles.headerRightPlaceholder} />
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={18} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            placeholder={t('categoriesPage.searchPlaceholder')}
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        {/* Inline error message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Category List */}
        <FlatList
          data={filteredCategories}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#6366f1']}
              tintColor="#6366f1"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="tag" size={48} color="#e2e8f0" />
              <Text style={styles.emptyText}>{t('categoriesPage.noCategoriesFound')}</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery
                  ? t('categoriesPage.tryDifferentSearch')
                  : t('categoriesPage.createFirstCategory')}
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <Animated.View
              key={item._id}
              style={[
                styles.card,
                {
                  opacity: 1,
                  transform: [{ translateY: 1 }],
                },
              ]}
            >
              <View style={styles.categoryInfo}>
                <View style={[styles.iconContainer, { backgroundColor: getRandomColor(index) }]}>
                  <Feather name="tag" size={20} color="#fff" />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.categoryName}>{item.name}</Text>
                  <Text style={styles.productCount}>
                    {t('categoriesPage.productsCount', { count: item.productCount || 0 })}
                  </Text>
                </View>
              </View>
              {(userRole === 'admin' || userRole === 'superadmin') && (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.editBtn]}
                    onPress={() => {
                      setSelectedCategory(item);
                      setShowEditModal(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Feather name="edit-3" size={16} color="#6366f1" />
                    <Text style={styles.actionText}>{t('categoriesPage.edit')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => handleDelete(item._id)}
                    activeOpacity={0.7}
                  >
                    <Feather name="trash-2" size={16} color="#ef4444" />
                    <Text style={[styles.actionText, { color: '#ef4444' }]}>
                      {t('categoriesPage.deleteBtn')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </Animated.View>
          )}
        />

        {/* Add Button */}
        {(userRole === 'admin' || userRole === 'superadmin') && (
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity style={styles.addButton} onPress={animateButton} activeOpacity={0.8}>
              <Feather name="plus" size={24} color="#fff" />
            </TouchableOpacity>
          </Animated.View>
        )}

        <AddCategoryModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            fetchCategories();
            setShowAddModal(false);
          }}
        />
        <EditCategoryModal
          visible={showEditModal}
          category={selectedCategory}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            fetchCategories();
            setShowEditModal(false);
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const getRandomColor = (index: number): string => {
  const colors = [
    '#6366f1',
    '#8b5cf6',
    '#ec4899',
    '#f43f5e',
    '#f97316',
    '#f59e0b',
    '#10b981',
    '#14b8a6',
    '#0ea5e9',
    '#3b82f6',
  ];
  return colors[index % colors.length];
};

const styles = StyleSheet.create({
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
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  productCount: {
    fontSize: 14,
    color: '#64748b',
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
