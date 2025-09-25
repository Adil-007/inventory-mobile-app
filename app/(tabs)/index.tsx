import { Feather } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Linking, // NEW
  Platform,
  RefreshControl,
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
import i18n from '../../i18n';
import dashboardService from '../../services/dashboardService';
import AddCategoryModal from '../categories/add';
import AddWarehouseModal from '../warehouses/add';

// NEW
import VersionCheck from 'react-native-version-check';

const iconMap = {
  product: { name: 'check-circle', color: '#4CAF50', bg: '#e6f7ee' },
  transfer: { name: 'truck', color: '#2196F3', bg: '#e6f0ff' },
  lowstock: { name: 'alert-circle', color: '#FF9800', bg: '#fff3e6' },
  canceled: { name: 'x-circle', color: '#F44336', bg: '#ffebee' },
  pending: { name: 'clock', color: '#9E9E9E', bg: '#f5f5f5' },
  sale: { name: 'dollar-sign', color: '#10b981', bg: '#ecfdf5' },
};

const MAX_RECENT_ACTIVITY = 10;

type ActivityItem = {
  type: keyof typeof iconMap;
  title: string;
  desc: string;
  time: string | number | Date;
};

export default function HomeScreen() {
  const { t } = useTranslation();
  const userRole = useSelector((state: RootState) => state.auth.user?.role || '');
  const token = useSelector((state: RootState) => state.auth.accessToken);
  const { isConnected } = useNetworkStatus();

  const [language, setLanguage] = useState(i18n.language);
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [threshold, setThreshold] = useState('5');
  const [summaryData, setSummaryData] = useState({
    totalProducts: 0,
    lowStockCount: 0,
    todaySalesTotal: 0,
    threshold: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  const [, setSummaryError] = useState<string | null>(null);
  const [, setActivityError] = useState<string | null>(null);
  const [offlineErrorShown, setOfflineErrorShown] = useState(false);

  const isFetchingSummaryRef = useRef(false);
  const isFetchingActivityRef = useRef(false);

  // 🔹 Force Update Check
  useEffect(() => {
    const checkForUpdate = async () => {
      try {
        const latestVersion = await VersionCheck.getLatestVersion({
          provider: 'appStore',
          appID: '6751286477' // replace with your App Store numeric ID
        });

        const currentVersion = VersionCheck.getCurrentVersion();

        const updateNeeded = VersionCheck.needUpdate({
          currentVersion,
          latestVersion,
        });

        if (updateNeeded.isNeeded) {
          Alert.alert(
            'Update Required',
            `A new version (v${latestVersion}) is available. Please update to continue.`,
            [
              {
                text: 'Update Now',
                onPress: async () => {
                  const url = await VersionCheck.getAppStoreUrl({
                    appID: '6751286477'
                  });
                  Linking.openURL(url);
                },
              },
            ],
            { cancelable: false }
          );
        }
      } catch (err) {
        console.log('Version check failed:', err);
      }
    };

    checkForUpdate();
  }, []);


  // Language toggle function
  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'am' : 'en';
    i18n.changeLanguage(newLang);
    setLanguage(newLang);
  };

  const fetchSummaryData = useCallback(async () => {
    if (!isConnected) {
      setSummaryError(t('common.offlineMessage'));
      if (!offlineErrorShown) {
        setOfflineErrorShown(true);
      }
      return;
    }
    setOfflineErrorShown(false);

    if (isFetchingSummaryRef.current) return;
    isFetchingSummaryRef.current = true;
    setSummaryError(null);

    try {
      const res = await dashboardService.getSummary();
      const thresholdRes = await dashboardService.getThreshold();
      setSummaryData({
        totalProducts: res.totalProducts || 0,
        lowStockCount: res.lowStockCount || 0,
        todaySalesTotal: res.todaySalesTotal || 0,
        threshold: thresholdRes.threshold || 0,
      });
      setThreshold(String(thresholdRes.threshold || 5));
    } catch {
      // No alert here - global apiClient handles alerts
      setSummaryError(t('dashboard.failedToLoadSummary'));
      // if (__DEV__) console.error('Failed to fetch summary data', err);
    } finally {
      isFetchingSummaryRef.current = false;
    }
  }, [t, isConnected, offlineErrorShown]);

  const fetchRecentActivity = useCallback(async () => {
    if (!isConnected) {
      setActivityError(t('common.offlineMessage'));
      if (!offlineErrorShown) {
        setOfflineErrorShown(true);
      }
      return;
    }
    setOfflineErrorShown(false);

    if (isFetchingActivityRef.current) return;
    isFetchingActivityRef.current = true;
    setActivityError(null);

    try {
      const res = await dashboardService.getRecentActivity();
      setActivityFeed(res);
    } catch {
      setActivityError(t('dashboard.failedToLoadActivity'));
      // if (__DEV__) console.error('Failed to fetch recent activity', err);
    } finally {
      isFetchingActivityRef.current = false;
    }
  }, [t, isConnected, offlineErrorShown]);

    useEffect(() => {
    if (!token) return; // Stop if not logged in yet
    fetchSummaryData();
    fetchRecentActivity();
  }, [token, isConnected, fetchRecentActivity, fetchSummaryData]);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await Promise.all([fetchSummaryData(), fetchRecentActivity()]);
    } catch{
      // if (__DEV__) console.error('Dashboard refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSaveThreshold = async () => {
    const numeric = Math.max(1, parseInt(threshold || '1', 10));
    try {
      await dashboardService.updateThreshold(numeric);
      Keyboard.dismiss();
      Alert.alert(t('dashboard.success'), t('dashboard.thresholdUpdated'));
      await Promise.all([fetchSummaryData(), fetchRecentActivity()]);
    } catch {
      // if (__DEV__) console.error('Failed to save Threshold:', err);
    }
  };

  const summaryCards = [
    {
      title: t('dashboard.totalProducts'),
      count: summaryData.totalProducts,
      icon: 'box',
      bg: '#6366f1',
      textColor: '#fff',
    },
    {
      title: t('dashboard.lowStock'),
      count: summaryData.lowStockCount,
      icon: 'alert-circle',
      bg: '#f59e0b',
      textColor: '#fff',
    },
    {
      title: t('dashboard.todaySales'),
      count: `ETB ${summaryData.todaySalesTotal.toLocaleString()}`,
      icon: 'dollar-sign',
      bg: '#10b981',
      textColor: '#fff',
    }
  ];

  const allQuickActions = [
    {
      title: t('dashboard.addItem'),
      icon: 'plus',
      color: '#6366f1',
      onPress: () => router.push('/products/add'),
      roles: ['admin', 'superadmin'],
    },
    {
      title: t('dashboard.addSale'),
      icon: 'dollar-sign',
      color: '#10b981',
      onPress: () => router.push('/sales/add'),
      roles: ['admin', 'user', 'superadmin'],
    },
    {
      title: t('dashboard.addCategory'),
      icon: 'home',
      color: '#0ea5e9',
      onPress: () => setShowCategoryModal(true),
      roles: ['admin', 'superadmin'],
    },
    {
      title: t('dashboard.addWarehouse'),
      icon: 'home',
      color: '#0ea5e9',
      onPress: () => setShowWarehouseModal(true),
      roles: ['admin', 'superadmin'],
    },
    {
      title: t('dashboard.editProfile'),
      icon: 'user',
      color: '#6366f1',
      onPress: () => router.push('/settings/edit-profile'),
      roles: ['admin', 'superadmin', 'user'],
    }
  ];

  const quickActions = allQuickActions.filter((action) => action.roles.includes(userRole));
  const limitedActivityFeed = activityFeed.slice(0, MAX_RECENT_ACTIVITY);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Offline Banner */}
      {isConnected === false && offlineErrorShown && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>{t('common.offlineMessage')}</Text>
        </View>
      )}

      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 20, backgroundColor: '#f8fafc' }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View>
            {/* Pull to Refresh Hint */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 8 }}>
              <Feather name="chevron-down" size={16} color="#94a3b8" />
              <Text style={{ color: '#94a3b8', marginLeft: 4 }}>{t('sales.pullToRefresh')}</Text>
            </View>

            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.greeting}>{t('dashboard.welcome')}</Text>
                <Text style={styles.title}>{t('dashboard.title')}</Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity onPress={toggleLanguage} style={styles.langBtn}>
                  <Feather name="globe" size={20} color="#6366f1" />
                  <Text style={{ marginLeft: 6, color: '#6366f1', fontWeight: '600' }}>
                    {language === 'en' ? 'አማ' : 'EN'}
                  </Text>
                </TouchableOpacity>

                {quickActions
                  .filter(action => action.title === t('dashboard.editProfile'))
                  .map((action, idx) => (
                    <TouchableOpacity key={idx} onPress={action.onPress} style={styles.profileBtn}>
                      <Feather name={action.icon as any} size={22} color={action.color || '#6366f1'} />
                    </TouchableOpacity>
                  ))}
              </View>
            </View>

            {/* Summary Cards */}
            <View style={styles.summaryContainer}>
              {summaryCards.map((item, idx) => (
                <View key={idx} style={[styles.summaryCard, { backgroundColor: item.bg }]}>
                  <View style={styles.cardIconContainer}>
                    <Feather name={item.icon as any} size={20} color={item.textColor} />
                  </View>
                  <Text style={[styles.cardTitle, { color: item.textColor }]}>{item.title}</Text>
                  <Text style={[styles.cardCount, { color: item.textColor }]}>{item.count}</Text>
                </View>
              ))}
            </View>

            {/* Low Stock Threshold */}
            <View style={styles.thresholdContainer}>
              <Text style={styles.thresholdLabel}>{t('dashboard.lowStockThreshold')}</Text>
              <View style={styles.thresholdInputContainer}>
                <TextInput
                  style={styles.thresholdInput}
                  keyboardType="numeric"
                  value={threshold}
                  onChangeText={(text) => setThreshold(text)}
                  blurOnSubmit={true}
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
                <TouchableOpacity
                  style={styles.thresholdSaveButton}
                  onPress={handleSaveThreshold}
                >
                  <Text style={styles.thresholdSaveText}>{t('dashboard.save')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>{t('dashboard.quickActions')}</Text>
            <View style={styles.actionsRow}>
              {quickActions
                .filter(action => action.title !== t('dashboard.editProfile'))
                .map((action, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.actionBtn, { backgroundColor: `${action.color}20` }]}
                    onPress={action.onPress}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
                      <Feather name={action.icon as any} size={18} color="#fff" />
                    </View>
                    <Text style={styles.actionText}>{action.title}</Text>
                  </TouchableOpacity>
                ))}
            </View>

            {/* Recent Activity */}
            <View style={styles.activityHeader}>
              <Text style={styles.sectionTitle}>{t('dashboard.recentActivity')}</Text>
            </View>
            {limitedActivityFeed.length === 0 ? (
              <Text style={{ textAlign: 'center', marginTop: 20, color: '#64748b' }}>
                {t('dashboard.noActivity')}
              </Text>
            ) : (
              limitedActivityFeed.map((item, index) => {
                const icon = iconMap[item.type] || iconMap['product'];
                return (
                  <View key={index} style={[styles.activityItem, { backgroundColor: icon.bg }]}>
                    <View style={[styles.activityIcon, { backgroundColor: `${icon.color}20` }]}>
                      <Feather name={icon.name as any} size={16} color={icon.color} />
                    </View>
                    <View style={styles.activityTextContainer}>
                      <Text style={styles.activityTitle}>{item.title}</Text>
                      <Text style={styles.activityDesc}>{item.desc}</Text>
                    </View>
                    <Text style={[styles.activityTime, { color: icon.color }]}>
                      {formatDistanceToNow(new Date(item.time), { addSuffix: true })}
                    </Text>
                  </View>
                );
              })
            )}

            {/* Modals */}
            <AddWarehouseModal
              visible={showWarehouseModal}
              onClose={() => setShowWarehouseModal(false)}
              onSuccess={() => setShowWarehouseModal(false)}
            />
            <AddCategoryModal
              visible={showCategoryModal}
              onClose={() => setShowCategoryModal(false)}
              onSuccess={() => setShowCategoryModal(false)}
            />
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  thresholdContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  thresholdLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  thresholdInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  thresholdInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f8fafc',
  },
  thresholdSaveButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  thresholdSaveText: {
    color: '#fff',
    fontWeight: '600',
  },
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24,
  },
  greeting: { fontSize: 14, color: '#64748b' },
  title: { fontSize: 24, fontWeight: '700', color: '#1e293b' },
  profileBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#e0e7ff',
    justifyContent: 'center', alignItems: 'center',
  },
  langBtn: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6,
    borderRadius: 8, backgroundColor: '#e0e7ff',
  },
  summaryContainer: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, gap: 12,
  },
  summaryCard: {
    flex: 1, padding: 16, borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  cardIconContainer: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  cardTitle: { fontSize: 12, fontWeight: '600', marginBottom: 4, opacity: 0.9 },
  cardCount: { fontSize: 20, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 12 },
  actionsRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24,
    gap: 12, flexWrap: 'wrap',
  },
  actionBtn: {
    width: '48%', padding: 16, borderRadius: 12, flexDirection: 'row',
    alignItems: 'center', shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1,
    shadowRadius: 2, elevation: 1,
  },
  actionIcon: {
    width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  actionText: { fontSize: 14, fontWeight: '500', color: '#1e293b' },
  activityHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  viewAll: { color: '#6366f1', fontWeight: '500', fontSize: 14 },
  activityList: { paddingBottom: 20 },
  activityItem: {
    flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12,
    marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  activityIcon: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  activityTextContainer: { flex: 1 },
  activityTitle: { fontWeight: '600', color: '#1e293b', marginBottom: 2 },
  activityDesc: { color: '#64748b', fontSize: 12 },
  activityTime: { fontSize: 12, fontWeight: '500' },
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
