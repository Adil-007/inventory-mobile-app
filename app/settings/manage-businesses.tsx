import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import businessService from '../../services/businessService';

interface Business {
  _id: string;
  name: string;
  subscriptionStatus: 'active' | 'suspended';
  createdAt: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
}

interface BusinessUsers {
  [key: string]: User[];
}

interface BusinessStats {
  active: number;
  suspended: number;
  total: number;
}

export default function ManageBusinessesScreen() {
  const { t } = useTranslation();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBusinessId, setExpandedBusinessId] = useState<string | null>(null);
  const [businessUsers, setBusinessUsers] = useState<BusinessUsers>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<BusinessStats>({ active: 0, suspended: 0, total: 0 });
  const router = useRouter();



  const fetchBusinesses = useCallback(async () => {
    try {
      setLoading(true);
      const data = await businessService.getAllBusinesses();
      setBusinesses(data);
      setFilteredBusinesses(data);
      calculateStats(data);
    } catch{
      Alert.alert(t('manageBusinesses.error'), t('manageBusinesses.fetchError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]); // include any external dependencies like `t`

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);


  const calculateStats = (data: Business[]) => {
    const active = data.filter(b => b.subscriptionStatus === 'active').length;
    const suspended = data.filter(b => b.subscriptionStatus === 'suspended').length;
    setStats({ active, suspended, total: data.length });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBusinesses();
  };

  const handleToggleSubscription = async (businessId: string) => {
    try {
      await businessService.toggleSubscriptionStatus(businessId);
      fetchBusinesses();
    } catch{
      Alert.alert(t('manageBusinesses.error'), t('manageBusinesses.toggleError'));
    }
  };

  const handleToggleExpand = async (businessId: string) => {
    if (expandedBusinessId === businessId) {
      setExpandedBusinessId(null);
      return;
    }

    try {
      const users = await businessService.getUsersByBusiness(businessId);
      setBusinessUsers((prev) => ({ ...prev, [businessId]: users }));
      setExpandedBusinessId(businessId);
    } catch{
      Alert.alert(t('manageBusinesses.error'), t('manageBusinesses.userFetchError'));
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    const filtered = businesses.filter((b) =>
      b.name.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredBusinesses(filtered);
  };

  const getStatusColor = (status: 'active' | 'suspended') => {
    return status === 'active' ? '#10B981' : '#EF4444';
  };

  const renderItem = ({ item }: { item: Business }) => {
    const isExpanded = expandedBusinessId === item._id;
    const rotateValue = new Animated.Value(0);

    if (isExpanded) {
      Animated.timing(rotateValue, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    } else {
      Animated.timing(rotateValue, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }

    const rotate = rotateValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.businessInfo}>
            <Text style={styles.businessName}>{item.name}</Text>
            <Text style={styles.createdDate}>
              {t('manageBusinesses.joined')}: {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.subscriptionStatus) }]}>
            <Text style={styles.statusText}>{t(`manageBusinesses.${item.subscriptionStatus}`)}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, {
              backgroundColor: item.subscriptionStatus === 'active' ? '#EF4444' : '#10B981',
              flex: 1, marginRight: 8
            }]}
            onPress={() => handleToggleSubscription(item._id)}
          >
            <Feather name={item.subscriptionStatus === 'active' ? 'slash' : 'check-circle'} size={16} color="#fff" />
            <Text style={styles.actionText}>
              {item.subscriptionStatus === 'active'
                ? t('manageBusinesses.suspend')
                : t('manageBusinesses.activate')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#6366F1', flex: 1 }]}
            onPress={() => handleToggleExpand(item._id)}
          >
            <Feather name="users" size={16} color="#fff" />
            <Text style={styles.actionText}>
              {isExpanded ? t('manageBusinesses.hideUsers') : t('manageBusinesses.showUsers')}
            </Text>
            <Animated.View style={{ transform: [{ rotate }], marginLeft: 4 }}>
              <Feather name="chevron-down" size={16} color="#fff" />
            </Animated.View>
          </TouchableOpacity>
        </View>

        {isExpanded && (
          <View style={styles.userList}>
            {businessUsers[item._id]?.length > 0 ? (
              <ScrollView style={{ maxHeight: 200 }}>
                {businessUsers[item._id].map((user) => (
                  <View key={user._id} style={styles.userItem}>
                    <View style={styles.userAvatar}>
                      <Feather name="user" size={14} color="#6B7280" />
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{user.name}</Text>
                      <Text style={styles.userEmail}>{user.email}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.noUsersText}>{t('manageBusinesses.noUsers')}</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/settings')} style={styles.backButton}>
            <Feather name="arrow-left" size={20} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Business Management</Text>
          <Text style={styles.headerSubtitle}>Manage all registered businesses</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: '#EFF6FF' }]}>
            <Text style={[styles.statNumber, { color: '#3B82F6' }]}>{stats.total}</Text>
            <Text style={styles.statLabel}>{t('manageBusinesses.total')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#ECFDF5' }]}>
            <Text style={[styles.statNumber, { color: '#10B981' }]}>{stats.active}</Text>
            <Text style={styles.statLabel}>{t('manageBusinesses.active')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FEF2F2' }]}>
            <Text style={[styles.statNumber, { color: '#EF4444' }]}>{stats.suspended}</Text>
            <Text style={styles.statLabel}>{t('manageBusinesses.suspended')}</Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Feather name="search" size={18} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            placeholder={t('manageBusinesses.search')}
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={handleSearch}
            style={styles.searchInput}
          />
          {searchQuery && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Feather name="x" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={filteredBusinesses}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 24 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#6366F1']}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Feather name="briefcase" size={48} color="#E5E7EB" />
                <Text style={styles.emptyText}>{t('manageBusinesses.empty')}</Text>
                {searchQuery && (
                  <TouchableOpacity onPress={() => handleSearch('')}>
                    <Text style={styles.clearSearchText}>{t('manageBusinesses.clearSearch')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 32 : 0,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    marginBottom: 12,
    padding: 4,
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  createdDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  userList: {
    marginTop: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  userAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  userEmail: {
    fontSize: 12,
    color: '#6B7280',
  },
  noUsersText: {
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 16,
    marginBottom: 8,
  },
  clearSearchText: {
    color: '#6366F1',
    fontWeight: '500',
  },
});
