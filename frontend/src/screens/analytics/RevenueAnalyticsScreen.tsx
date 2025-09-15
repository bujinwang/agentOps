import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
  RefreshControl,
  Alert,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Mock data for demonstration
const mockRevenueSummary = {
  totalRevenue: 1000000,
  totalCommissions: 100000,
  netIncome: 850000,
  activeAgents: 12
};

const mockCommissionAnalytics = {
  totalCommissionAmount: 100000,
  paidCommissions: 75000,
  pendingCommissions: 25000,
  avgCommissionRate: 10.0
};

const { width } = Dimensions.get('window');

const RevenueAnalyticsScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  // Load analytics data
  const loadAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Error loading analytics data:', error);
      Alert.alert(
        'Error',
        'Failed to load analytics data. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate start date based on time range
  const calculateStartDate = (range: string): string => {
    const now = new Date();
    switch (range) {
      case '7d':
        now.setDate(now.getDate() - 7);
        break;
      case '30d':
        now.setDate(now.getDate() - 30);
        break;
      case '90d':
        now.setDate(now.getDate() - 90);
        break;
      case '1y':
        now.setFullYear(now.getFullYear() - 1);
        break;
      default:
        now.setDate(now.getDate() - 30);
    }
    return now.toISOString().split('T')[0];
  };

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAnalyticsData();
    setRefreshing(false);
  }, [loadAnalyticsData]);

  // Load data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadAnalyticsData();
    }, [loadAnalyticsData])
  );

  // Handle time range change
  const handleTimeRangeChange = (range: '7d' | '30d' | '90d' | '1y') => {
    setTimeRange(range);
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <MaterialCommunityIcons
          name="chart-line-variant"
          size={48}
          color="#666"
        />
        <Text style={styles.loadingText}>Loading Analytics...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['#007AFF']}
          tintColor="#007AFF"
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <MaterialCommunityIcons
          name="chart-line-variant"
          size={28}
          color="#007AFF"
        />
        <View style={styles.headerText}>
          <Text style={styles.title}>Revenue Analytics</Text>
          <Text style={styles.subtitle}>Real-time business insights</Text>
        </View>
      </View>

      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.timeRangeScroll}
        >
          {[
            { key: '7d', label: '7 Days' },
            { key: '30d', label: '30 Days' },
            { key: '90d', label: '90 Days' },
            { key: '1y', label: '1 Year' },
          ].map((range) => (
            <TouchableOpacity
              key={range.key}
              style={[
                styles.timeRangeButton,
                timeRange === range.key && styles.timeRangeButtonActive,
              ]}
              onPress={() => setTimeRange(range.key as any)}
            >
              <Text
                style={[
                  styles.timeRangeButtonText,
                  timeRange === range.key && styles.timeRangeButtonTextActive,
                ]}
              >
                {range.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* KPI Cards */}
      <View style={styles.kpiContainer}>
        <View style={[styles.kpiCard, { backgroundColor: '#28a74520' }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#28a74530' }]}>
            <MaterialCommunityIcons name="cash-multiple" size={24} color="#28a745" />
          </View>
          <View style={styles.kpiContent}>
            <Text style={styles.kpiTitle}>Total Revenue</Text>
            <Text style={styles.kpiValue}>{formatCurrency(mockRevenueSummary.totalRevenue)}</Text>
            <View style={styles.changeContainer}>
              <MaterialCommunityIcons name="trending-up" size={14} color="#28a745" />
              <Text style={[styles.changeText, { color: '#28a745' }]}>+12.5%</Text>
            </View>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: '#007bff20' }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#007bff30' }]}>
            <MaterialCommunityIcons name="account-cash" size={24} color="#007bff" />
          </View>
          <View style={styles.kpiContent}>
            <Text style={styles.kpiTitle}>Total Commissions</Text>
            <Text style={styles.kpiValue}>{formatCurrency(mockCommissionAnalytics.totalCommissionAmount)}</Text>
            <View style={styles.changeContainer}>
              <MaterialCommunityIcons name="trending-up" size={14} color="#28a745" />
              <Text style={[styles.changeText, { color: '#28a745' }]}>+8.2%</Text>
            </View>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: '#ffc10720' }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#ffc10730' }]}>
            <MaterialCommunityIcons name="trending-up" size={24} color="#ffc107" />
          </View>
          <View style={styles.kpiContent}>
            <Text style={styles.kpiTitle}>Net Income</Text>
            <Text style={styles.kpiValue}>{formatCurrency(mockRevenueSummary.netIncome)}</Text>
            <View style={styles.changeContainer}>
              <MaterialCommunityIcons name="trending-up" size={14} color="#28a745" />
              <Text style={[styles.changeText, { color: '#28a745' }]}>+15.3%</Text>
            </View>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: '#6f42c120' }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#6f42c130' }]}>
            <MaterialCommunityIcons name="account-group" size={24} color="#6f42c1" />
          </View>
          <View style={styles.kpiContent}>
            <Text style={styles.kpiTitle}>Active Agents</Text>
            <Text style={styles.kpiValue}>{mockRevenueSummary.activeAgents}</Text>
            <View style={styles.changeContainer}>
              <MaterialCommunityIcons name="trending-up" size={14} color="#28a745" />
              <Text style={[styles.changeText, { color: '#28a745' }]}>+5.1%</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Commission Summary */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="account-cash" size={20} color="#007AFF" />
          <Text style={styles.sectionTitle}>Commission Summary</Text>
        </View>
        <View style={styles.commissionGrid}>
          <View style={styles.commissionItem}>
            <Text style={styles.commissionLabel}>Total</Text>
            <Text style={styles.commissionValue}>
              {formatCurrency(mockCommissionAnalytics.totalCommissionAmount)}
            </Text>
          </View>
          <View style={styles.commissionItem}>
            <Text style={styles.commissionLabel}>Paid</Text>
            <Text style={styles.commissionValue}>
              {formatCurrency(mockCommissionAnalytics.paidCommissions)}
            </Text>
          </View>
          <View style={styles.commissionItem}>
            <Text style={styles.commissionLabel}>Pending</Text>
            <Text style={styles.commissionValue}>
              {formatCurrency(mockCommissionAnalytics.pendingCommissions)}
            </Text>
          </View>
          <View style={styles.commissionItem}>
            <Text style={styles.commissionLabel}>Avg Rate</Text>
            <Text style={styles.commissionValue}>
              {mockCommissionAnalytics.avgCommissionRate.toFixed(1)}%
            </Text>
          </View>
        </View>
      </View>

      {/* Revenue Breakdown */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="chart-donut" size={20} color="#007AFF" />
          <Text style={styles.sectionTitle}>Revenue Breakdown</Text>
        </View>
        <View style={styles.breakdownContainer}>
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownHeader}>
              <View style={[styles.colorDot, { backgroundColor: '#28a745' }]} />
              <Text style={styles.breakdownCategory}>Residential Sales</Text>
              <Text style={styles.breakdownAmount}>$450K</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '45%', backgroundColor: '#28a745' }]} />
            </View>
            <Text style={styles.breakdownPercent}>45.0%</Text>
          </View>

          <View style={styles.breakdownItem}>
            <View style={styles.breakdownHeader}>
              <View style={[styles.colorDot, { backgroundColor: '#007bff' }]} />
              <Text style={styles.breakdownCategory}>Commercial Sales</Text>
              <Text style={styles.breakdownAmount}>$320K</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '32%', backgroundColor: '#007bff' }]} />
            </View>
            <Text style={styles.breakdownPercent}>32.0%</Text>
          </View>

          <View style={styles.breakdownItem}>
            <View style={styles.breakdownHeader}>
              <View style={[styles.colorDot, { backgroundColor: '#ffc107' }]} />
              <Text style={styles.breakdownCategory}>Rental Income</Text>
              <Text style={styles.breakdownAmount}>$150K</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '15%', backgroundColor: '#ffc107' }]} />
            </View>
            <Text style={styles.breakdownPercent}>15.0%</Text>
          </View>

          <View style={styles.breakdownItem}>
            <View style={styles.breakdownHeader}>
              <View style={[styles.colorDot, { backgroundColor: '#6f42c1' }]} />
              <Text style={styles.breakdownCategory}>Property Management</Text>
              <Text style={styles.breakdownAmount}>$80K</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '8%', backgroundColor: '#6f42c1' }]} />
            </View>
            <Text style={styles.breakdownPercent}>8.0%</Text>
          </View>
        </View>
      </View>

      {/* Export Actions */}
      <View style={styles.exportContainer}>
        <TouchableOpacity style={styles.exportButton}>
          <MaterialCommunityIcons name="file-pdf-box" size={20} color="#fff" />
          <Text style={styles.exportButtonText}>Export PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exportButton}>
          <MaterialCommunityIcons name="file-excel" size={20} color="#fff" />
          <Text style={styles.exportButtonText}>Export Excel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerText: {
    marginLeft: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 2,
  },
  timeRangeContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  timeRangeScroll: {
    paddingHorizontal: 20,
  },
  timeRangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dee2e6',
    backgroundColor: '#fff',
  },
  timeRangeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  timeRangeButtonText: {
    fontSize: 14,
    color: '#495057',
  },
  timeRangeButtonTextActive: {
    color: '#fff',
  },
  kpiContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    justifyContent: 'space-between',
  },
  chartContainer: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionContainer: {
    margin: 20,
    marginTop: 0,
  },
  exportContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    paddingTop: 0,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#28a745',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 0.45,
    justifyContent: 'center',
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  kpiContent: {
    flex: 1,
  },
  kpiTitle: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginLeft: 8,
  },
  commissionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  commissionItem: {
    alignItems: 'center',
    flex: 1,
  },
  commissionLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  commissionValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
  },
  breakdownContainer: {
    gap: 12,
  },
  breakdownItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  breakdownCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    flex: 1,
  },
  breakdownAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  breakdownPercent: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'right',
  },
});

export default RevenueAnalyticsScreen;