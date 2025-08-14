import { fetchMonthlySummary, fetchYearlyTrends, getAvailableYears } from '@/services/reportService';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Dropdown } from 'react-native-element-dropdown';

import useNetworkStatus from '../hooks/useNetworkStatus';
import categoryService from '../services/categoryService';
import dashboardService from '../services/dashboardService';

// Constants
const CHART_CONFIG = {
  backgroundColor: '#fff',
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(71, 85, 105, ${opacity})`,
  fillShadowGradient: '#6366f1',
  fillShadowGradientOpacity: 0.1,
  propsForDots: {
    r: 4,
    strokeWidth: 1,
    stroke: '#6366f1',
  },
};

interface StockItem {
  brand?: string;
  name?: string;
  quantity?: number;
  currentStock?: number;
  category?: {
    _id?: string;
    name?: string;
  };
}


const MONTHS = ['ALL', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SCREEN_WIDTH = Dimensions.get('window').width - 32;

interface Trend {
  income: number;
  expense: number;
}

interface ReportData {
  income?: number;
  expense?: number;
  lowStockItems?: any[];
  outOfStockItems?: any[];
  monthlyTrends?: Trend[];
}

const SummaryCard = React.memo(({ icon, label, value, color, additionalText }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  additionalText?: string;
}) => (
  <View style={[styles.card, { borderLeftColor: color }]}>
    <View style={styles.cardHeader}>
      {icon}
      <Text style={styles.cardLabel}>{label}</Text>
    </View>
    <Text style={styles.cardValue}>
      {value}
      {additionalText && (
        <Text style={[styles.profitPercentage, { color }]}>
          {additionalText}
        </Text>
      )}
    </Text>
  </View>
));

SummaryCard.displayName = 'SummaryCard';

const ExportCard = React.memo(({ 
  type, 
  title, 
  subtitle, 
  icon, 
  color, 
  loading, 
  onPress 
}: {
  type: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  loading: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={styles.exportCard}
    onPress={onPress}
    disabled={loading}
    accessibilityLabel={`Export ${title}`}
    accessibilityRole="button"
  >
    <View style={[styles.exportIconContainer, { backgroundColor: `${color}20` }]}>
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        icon
      )}
    </View>
    <Text style={styles.exportTitle}>{title}</Text>
    <Text style={styles.exportSubtitle}>{subtitle}</Text>
  </TouchableOpacity>
));

ExportCard.displayName = 'ExportCard';


export default function ReportsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isConnected } = useNetworkStatus();

  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(0);
  const [exportType, setExportType] = useState<'financial' | 'lowStock' | 'outOfStock' | null>(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [categories, setCategories] = useState<{ label: string; value: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [yearlyTotals, setYearlyTotals] = useState({ income: 0, expense: 0, profit: 0 });
  const [, setError] = useState<string | null>(null);
  const [offlineErrorShown, setOfflineErrorShown] = useState(false);

  const isFetchingRef = useRef(false);

  const loadReport = useCallback(async () => {
    if (!isConnected) {
      setLoading(false);
      setRefreshing(false);
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

      if (selectedMonth === 0) {
        const trendData = await fetchYearlyTrends(selectedYear);
// In the loadReport function, update the reduce calls:
        const yearlyIncome = trendData.reduce((sum: number, month: Trend) => sum + month.income, 0);
        const yearlyExpense = trendData.reduce((sum: number, month: Trend) => sum + month.expense, 0);

        setYearlyTotals({
          income: yearlyIncome,
          expense: yearlyExpense,
          profit: yearlyIncome - yearlyExpense
        });

        setReportData({ monthlyTrends: trendData });
      } else {
        const summary = await fetchMonthlySummary(selectedYear, selectedMonth - 1);
        const trendData = await fetchYearlyTrends(selectedYear);

        setReportData({
          ...summary,
          monthlyTrends: trendData
        });
      }
    } catch {
      setError(t('reports.errorLoading'));
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFetchingRef.current = false;
    }
  }, [selectedMonth, selectedYear, isConnected, offlineErrorShown, t]);

  const loadAvailableYears = useCallback(async () => {
    if (!isConnected) {
      setError(t('common.offlineMessage'));
      if (!offlineErrorShown) {
        setOfflineErrorShown(true);
      }
      return;
    }
    
    setOfflineErrorShown(false);

    try {
      const available = await getAvailableYears();
      setYears(available);
      if (available.length > 0 && !available.includes(selectedYear)) {
        setSelectedYear(available[0]);
      }
      await loadReport();
      setInitialLoad(false);
    } catch {
      setError(t('reports.errorYearsLoading'));
    }
  }, [selectedYear, loadReport, isConnected, offlineErrorShown, t]);

  useEffect(() => {
    loadAvailableYears();
  }, [loadAvailableYears]);

  useEffect(() => {
    if (!initialLoad) {
      loadReport();
    }
  }, [initialLoad, loadReport]);

  const onRefresh = () => {
    setRefreshing(true);
    loadReport();
  };

  const isLoading = loading || (!reportData && initialLoad);

  const income = selectedMonth === 0 ? yearlyTotals.income : reportData?.income || 0;
  const expense = selectedMonth === 0 ? yearlyTotals.expense : reportData?.expense || 0;
  const profit = income - expense;
  const profitPercentage = useMemo(() => 
    income ? ((profit / income) * 100).toFixed(1) : '0', 
    [income, profit]
  );

const generateFinancialReportHTML = () => `
    <html>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #1e293b; }
          .brand { font-family: 'Poppins', sans-serif; font-size: 22px; font-weight: 700; color: #4f46e5; }
          .header { display: flex; justify-content: space-between; align-items: center; }
          h1 { color: #4f46e5; margin-bottom: 4px; }
          .date { font-size: 12px; color: #64748b; }
          .cards { display: flex; gap: 16px; margin-top: 20px; }
          .card { flex: 1; border-radius: 10px; padding: 16px; color: #fff; }
          .income { background: linear-gradient(135deg, #16a34a, #22c55e); }
          .expenses { background: linear-gradient(135deg, #dc2626, #ef4444); }
          .profit { background: linear-gradient(135deg, #4f46e5, #6366f1); }
          .card h3 { margin: 0 0 8px; font-size: 16px; }
          .card p { font-size: 18px; font-weight: bold; margin: 0; }
          .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>${t('reports.financialReport')}</h1>
            <div class="date">${selectedMonth === 0 ? selectedYear : `${MONTHS[selectedMonth]} ${selectedYear}`}</div>
          </div>
          <div class="brand">Ease Stock</div>
        </div>
        <div class="cards">
          <div class="card income">
            <h3>${t('reports.income')}</h3>
            <p>ETB ${income.toLocaleString()}</p>
          </div>
          <div class="card expenses">
            <h3>${t('reports.expenses')}</h3>
            <p>ETB ${expense.toLocaleString()}</p>
          </div>
          <div class="card profit">
            <h3>${t('reports.profit')}</h3>
            <p>ETB ${profit.toLocaleString()} (${profitPercentage}%)</p>
          </div>
        </div>
        <div class="footer">Generated by Ease Stock</div>
      </body>
    </html>
  `;

  const generateStockReportHTML = (type: 'lowStock' | 'outOfStock', items: StockItem[]) => {
    const grouped = items.reduce((acc: Record<string, StockItem[]>, item) => {
      const cat = item.category?.name || t('common.uncategorized');
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {});

    return `
      <html>
        <head>
          <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #1e293b; }
            .brand { font-family: 'Poppins', sans-serif; font-size: 22px; font-weight: 700; color: ${type === 'lowStock' ? '#d97706' : '#dc2626'}; }
            .header { display: flex; justify-content: space-between; align-items: center; }
            h1 { color: ${type === 'lowStock' ? '#d97706' : '#dc2626'}; margin-bottom: 4px; }
            .date { font-size: 12px; color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: left; }
            th { background-color: #f1f5f9; }
            .category-title { background-color: #e2e8f0; padding: 8px; font-weight: bold; margin-top: 20px; }
            .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>${type === 'lowStock' ? t('reports.lowStockReport') : t('reports.outOfStockReport')}</h1>
              <div class="date">${selectedMonth === 0 ? selectedYear : `${MONTHS[selectedMonth]} ${selectedYear}`}</div>
            </div>
            <div class="brand">Ease Stock</div>
          </div>
          ${
            Object.keys(grouped).length > 0
              ? Object.entries(grouped)
                  .map(([category, products]) => `
                  <div class="category-title">${category}</div>
                  <table>
                    <thead>
                      <tr>
                        <th>${t('common.brand')}</th>
                        <th>${t('common.name')}</th>
                        <th>${t('common.quantity')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${products.map(item => `
                        <tr>
                          <td>${item.brand || '-'}</td>
                          <td>${item.name || '-'}</td>
                          <td>${item.quantity ?? item.currentStock ?? 0}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                `).join('')
              : `<p style="text-align:center; margin-top:40px;">${t('reports.noItemsFound')}</p>`
          }
          <div class="footer">Generated by Ease Stock</div>
        </body>
      </html>
    `;
  };

  // ====== EXPORT HANDLER ======
  const handleExport = async (type: 'financial' | 'lowStock' | 'outOfStock', categoryId?: string) => {
    setExportType(type);
    try {
      let html = '';
      if (type === 'financial') {
        html = generateFinancialReportHTML();
      } else {
        let items = type === 'lowStock'
          ? await dashboardService.getLowStock()
          : await dashboardService.getOutOfStock();

        if (categoryId && categoryId !== 'all') {
          items = items.filter((item: StockItem) => item.category?._id === categoryId);
        }
        html = generateStockReportHTML(type, items);
      }

      const { uri } = await Print.printToFileAsync({ html });
      const downloadsDir = `${FileSystem.documentDirectory}downloads/`;
      await FileSystem.makeDirectoryAsync(downloadsDir, { intermediates: true });

      const filename = `${type}_report_${selectedYear}_${MONTHS[selectedMonth]}.pdf`;
      const newUri = `${downloadsDir}${filename}`;
      await FileSystem.moveAsync({ from: uri, to: newUri });

      await Sharing.shareAsync(newUri);
    } catch {
      Alert.alert(t('reports.errorExporting'));
    } finally {
      setExportType(null);
    }
  };

  // ====== CATEGORY MODAL TRIGGER ======
  const openCategoryModal = async (type: 'lowStock' | 'outOfStock') => {
    try {
      const res = await categoryService.getAllCategories();
      const formatted = [{ label: 'All Categories', value: 'all' }, ...res.map((c: any) => ({ label: c.name, value: c._id }))];
      setCategories(formatted);
      setSelectedCategory('all');
      setExportType(type);
      setCategoryModalVisible(true);
    } catch {
      Alert.alert('Error', 'Failed to load categories');
    }
  };

  const confirmCategorySelection = () => {
    setCategoryModalVisible(false);
    handleExport(exportType as 'lowStock' | 'outOfStock', selectedCategory);
  };

  return (
    <SafeAreaView style={styles.container}>
      {isConnected === false && offlineErrorShown && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>{t('common.offlineMessage')}</Text>
        </View>
      )}
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        accessibilityLabel="Reports screen"
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity 
            onPress={() => router.replace('/more')} 
            style={styles.backBtn}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Feather name="arrow-left" size={22} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.title} accessibilityRole="header">{t('reports.title')}</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Year Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.selectorScroll}
          contentContainerStyle={styles.selectorScrollContent}
          accessibilityLabel="Year selection"
        >
          {years.map((yr) => (
            <TouchableOpacity
              key={yr}
              onPress={() => setSelectedYear(yr)}
              style={[styles.yearBtn, selectedYear === yr && styles.activeBtn]}
              accessibilityLabel={`Select year ${yr}`}
              accessibilityState={{ selected: selectedYear === yr }}
            >
              <Text style={[styles.yearText, selectedYear === yr && styles.activeText]}>{yr}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Month Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.monthScroll}
          contentContainerStyle={styles.monthScrollContent}
          accessibilityLabel="Month selection"
        >
          {MONTHS.map((m, idx) => (
            <TouchableOpacity
              key={m}
              style={[styles.monthBtn, selectedMonth === idx && styles.activeBtn]}
              onPress={() => setSelectedMonth(idx)}
              accessibilityLabel={idx === 0 ? "Select all months" : `Select month ${m}`}
              accessibilityState={{ selected: selectedMonth === idx }}
            >
              <Text style={[styles.monthText, selectedMonth === idx && styles.activeText]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>{t('reports.loadingReportData')}</Text>
          </View>
        ) : (
          <>
            {/* Summary Cards */}
            <View style={styles.cardsRow} accessibilityLabel="Financial summary">
              <SummaryCard
                icon={<Feather name="trending-up" size={16} color="#16a34a" />}
                label={t('reports.income')}
                value={`ETB ${income.toLocaleString()}`}
                color="#16a34a"
              />
              
              <SummaryCard
                icon={<Feather name="trending-down" size={16} color="#dc2626" />}
                label={t('reports.expenses')}
                value={`ETB ${expense.toLocaleString()}`}
                color="#dc2626"
              />
              
              <SummaryCard
                icon={<MaterialIcons name="attach-money" size={16} color="#4f46e5" />}
                label={t('reports.profit')}
                value={`ETB ${profit.toLocaleString()}`}
                color={profit >= 0 ? '#16a34a' : '#dc2626'}
                additionalText={`(${profit >= 0 ? '+' : ''}${profitPercentage}%)`}
              />
            </View>

            {/* Monthly Trends Chart */}
            {reportData?.monthlyTrends ? (
              <>
                <Text style={styles.sectionTitle} accessibilityRole="header">
                  {t('reports.monthlyTrendsFor', { year: selectedYear })}
                </Text>
                <View accessibilityLabel="Monthly trends chart">
                  <LineChart
                    data={{
                      labels: reportData.monthlyTrends.map((_, i) => MONTHS[i + 1]),
                      datasets: [
                        {
                          data: reportData.monthlyTrends.map(m => m.income),
                          color: () => '#16a34a',
                          strokeWidth: 2,
                        },
                        {
                          data: reportData.monthlyTrends.map(m => m.expense),
                          color: () => '#dc2626',
                          strokeWidth: 2,
                        }
                      ]
                    }}
                    width={SCREEN_WIDTH}
                    height={220}
                    chartConfig={{
                      ...CHART_CONFIG,
                      formatYLabel: (value) => {
                        const num = Number(value);
                        return num >= 1000 ? `ETB ${num / 1000}k` : `ETB ${num}`;
                      }
                    }}
                    bezier
                    style={styles.chart}
                    fromZero
                  />
                </View>
              </>
            ) : (
              <View style={styles.noDataContainer}>
                <Feather name="bar-chart-2" size={40} color="#94a3b8" />
                <Text style={styles.noDataText}>
                  {loading ? t('reports.loadingTrendData') : t('reports.noTrendData')}
                </Text>
              </View>
            )}

            {/* Export Reports */}
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {t('reports.exportReports')}
            </Text>
            <View style={styles.exportGrid}>
              <ExportCard
                type="financial"
                title={t('reports.financialReport')}
                subtitle={t('reports.financialReportSubtitle')}
                icon={<Feather name="file-text" size={24} color="#6366f1" />}
                color="#6366f1"
                loading={exportType === 'financial'}
                onPress={() => handleExport('financial')}
              />

              <ExportCard
                type="lowStock"
                title={t('reports.lowStock')}
                subtitle={t('reports.lowStockSubtitle')}
                icon={<Feather name="alert-triangle" size={24} color="#d97706" />}
                color="#d97706"
                loading={exportType === 'lowStock'}
                onPress={() => openCategoryModal('lowStock')}
              />

              <ExportCard
                type="outOfStock"
                title={t('reports.outOfStock')}
                subtitle={t('reports.outOfStockSubtitle')}
                icon={<Feather name="x-octagon" size={24} color="#dc2626" />}
                color="#dc2626"
                loading={exportType === 'outOfStock'}
                onPress={() => openCategoryModal('outOfStock')}
              />
            </View>
            <Modal
              visible={categoryModalVisible}
              transparent
              animationType="fade"
              onRequestClose={() => setCategoryModalVisible(false)}
            >
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
                <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 10 }}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>
                    {t('reports.selectCategory')}
                  </Text>

                  <Dropdown
                    data={categories}
                    labelField="label"
                    valueField="value"
                    value={selectedCategory}
                    onChange={item => setSelectedCategory(item.value)}
                    style={{
                      borderWidth: 1,
                      borderColor: '#e5e7eb',
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      marginBottom: 20
                    }}
                  />

                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
                    <TouchableOpacity
                      onPress={() => setCategoryModalVisible(false)}
                      style={{ padding: 10 }}
                    >
                      <Text style={{ color: '#64748b' }}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={confirmCategorySelection}
                      style={{ backgroundColor: '#6366f1', padding: 10, borderRadius: 6 }}
                    >
                      <Text style={{ color: '#fff' }}>{t('common.confirm')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backBtn: {
    padding: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    flex: 1,
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
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  errorText: {
    color: '#b91c1c',
    textAlign: 'center',
    marginBottom: 8,
  },
  retryButton: {
    padding: 8,
    backgroundColor: '#ef4444',
    borderRadius: 4,
  },
  retryText: {
    color: 'white',
    fontWeight: '500',
  },
  selectorScroll: {
    marginBottom: 12,
  },
  selectorScrollContent: {
    paddingHorizontal: 8,
  },
  yearBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
  },
  activeBtn: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  yearText: {
    color: '#64748b',
    fontWeight: '600',
  },
  activeText: {
    color: '#6366f1',
  },
  monthScroll: {
    marginBottom: 20,
  },
  monthScrollContent: {
    paddingHorizontal: 8,
  },
  monthBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
  },
  monthText: {
    fontWeight: '500',
    color: '#1e293b',
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  card: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    borderLeftWidth: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  cardValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  profitPercentage: {
    fontSize: 14,
    marginLeft: 4,
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 12,
    color: '#1e293b',
    marginTop: 8,
  },
  chart: {
    borderRadius: 12,
    marginBottom: 24,
    backgroundColor: '#fff',
    padding: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    marginBottom: 24,
  },
  noDataText: {
    marginTop: 16,
    color: '#64748b',
    fontSize: 16,
  },
  exportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  exportCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  exportIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  exportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  exportSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    color: '#64748b',
    fontSize: 16,
  },
});