import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { apiService } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/validation';

interface AnalyticsScreenProps {
  navigation: any;
}

interface DashboardStats {
  totalLeads: number;
  newLeads: number;
  activeTasks: number;
  completedTasks: number;
  leadsThisMonth: number;
  conversionRate: number;
  recentActivity: any[];
}

interface LeadStats {
  leadsByStatus: Array<{ status: string; count: number }>;
  leadsBySource: Array<{ source: string; count: number }>;
  leadsByPriority: Array<{ priority: string; count: number }>;
  leadsOverTime: Array<{ date: string; count: number }>;
}

const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ navigation }) => {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [leadStats, setLeadStats] = useState<LeadStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'quarter'>('month');

  const screenWidth = Dimensions.get('window').width;
  const cardWidth = (screenWidth - 48) / 2;

  useEffect(() => {
    loadAnalyticsData();
  }, [timeframe]);

  const loadAnalyticsData = async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const [dashboardResponse, leadStatsResponse] = await Promise.all([
        apiService.getDashboardStats(),
        apiService.getLeadStats(timeframe),
      ]);

      setDashboardStats(dashboardResponse.data);
      setLeadStats(leadStatsResponse.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadAnalyticsData(true);
  };

  const renderTimeframeTabs = () => (
    <View style={styles.timeframeTabs}>
      {(['week', 'month', 'quarter'] as const).map((period) => (
        <TouchableOpacity
          key={period}
          style={[styles.timeframeTab, timeframe === period && styles.activeTimeframeTab]}
          onPress={() => setTimeframe(period)}
        >
          <Text style={[styles.timeframeTabText, timeframe === period && styles.activeTimeframeTabText]}>
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStatsCard = (title: string, value: string | number, subtitle?: string, color?: string) => (
    <View style={[styles.statsCard, { width: cardWidth }]}>
      <Text style={styles.statsCardTitle}>{title}</Text>
      <Text style={[styles.statsCardValue, color && { color }]}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Text>
      {subtitle && (
        <Text style={styles.statsCardSubtitle}>{subtitle}</Text>
      )}
    </View>
  );

  const renderListCard = (title: string, data: Array<{ [key: string]: string | number }>, keyField: string, valueField: string) => (
    <View style={styles.listCard}>
      <Text style={styles.listCardTitle}>{title}</Text>
      <View style={styles.listContent}>
        {data.slice(0, 5).map((item, index) => {
          const total = data.reduce((sum, d) => sum + Number(d[valueField]), 0);
          const percentage = total > 0 ? ((Number(item[valueField]) / total) * 100).toFixed(1) : '0';
          
          return (
            <View key={index} style={styles.listItem}>
              <View style={styles.listItemLeft}>
                <Text style={styles.listItemLabel}>{item[keyField]}</Text>
                <Text style={styles.listItemValue}>{item[valueField]}</Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBar, 
                    { width: `${percentage}%` }
                  ]} 
                />
                <Text style={styles.percentageText}>{percentage}%</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );

  const renderConversionFunnel = () => {
    if (!leadStats) return null;

    const statusOrder = ['New', 'Contacted', 'Qualified', 'Showing Scheduled', 'Offer Made', 'Closed Won'];
    const statusData = statusOrder.map(status => {
      const found = leadStats.leadsByStatus.find(s => s.status === status);
      return { status, count: found ? found.count : 0 };
    });

    const maxCount = Math.max(...statusData.map(s => s.count));

    return (
      <View style={styles.funnelCard}>
        <Text style={styles.funnelCardTitle}>Lead Conversion Funnel</Text>
        <View style={styles.funnelContent}>
          {statusData.map((item, index) => {
            const width = maxCount > 0 ? Math.max((item.count / maxCount) * 100, 10) : 10;
            const color = getStatusColor(item.status);
            
            return (
              <View key={index} style={styles.funnelStage}>
                <View style={styles.funnelStageInfo}>
                  <Text style={styles.funnelStageLabel}>{item.status}</Text>
                  <Text style={styles.funnelStageValue}>{item.count}</Text>
                </View>
                <View style={styles.funnelBarContainer}>
                  <View 
                    style={[
                      styles.funnelBar, 
                      { width: `${width}%`, backgroundColor: color }
                    ]} 
                  />
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'New': return '#FF9800';
      case 'Contacted': return '#2196F3';
      case 'Qualified': return '#9C27B0';
      case 'Showing Scheduled': return '#607D8B';
      case 'Offer Made': return '#FF5722';
      case 'Closed Won': return '#4CAF50';
      default: return '#666';
    }
  };

  const renderRecentActivity = () => {
    if (!dashboardStats?.recentActivity?.length) return null;

    return (
      <View style={styles.activityCard}>
        <Text style={styles.activityCardTitle}>Recent Activity</Text>
        <View style={styles.activityList}>
          {dashboardStats.recentActivity.slice(0, 10).map((activity, index) => (
            <View key={index} style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Text style={styles.activityIconText}>
                  {activity.type === 'Lead Created' ? '✨' : 
                   activity.type === 'Email Sent' ? '📧' : 
                   activity.type === 'Call Logged' ? '📞' : '📝'}
                </Text>
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityType}>{activity.type}</Text>
                <Text style={styles.activityDescription} numberOfLines={1}>
                  {activity.content || `${activity.type} activity`}
                </Text>
                <Text style={styles.activityTime}>
                  {formatDate(activity.interactionDate)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  if (isLoading && !dashboardStats) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Analytics Dashboard</Text>
          <Text style={styles.headerSubtitle}>Performance insights and metrics</Text>
        </View>

        {/* Timeframe Selector */}
        {renderTimeframeTabs()}

        {/* Key Metrics */}
        {dashboardStats && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Key Metrics</Text>
            <View style={styles.statsGrid}>
              {renderStatsCard('Total Leads', dashboardStats.totalLeads, 'All time', '#2196F3')}
              {renderStatsCard('New Leads', dashboardStats.newLeads, 'This period', '#4CAF50')}
              {renderStatsCard('Active Tasks', dashboardStats.activeTasks, 'Pending', '#FF9800')}
              {renderStatsCard('Completed Tasks', dashboardStats.completedTasks, 'This period', '#9C27B0')}
              {renderStatsCard('Monthly Leads', dashboardStats.leadsThisMonth, 'This month', '#607D8B')}
              {renderStatsCard(
                'Conversion Rate',
                `${dashboardStats.conversionRate.toFixed(1)}%`,
                'Lead to client',
                dashboardStats.conversionRate > 15 ? '#4CAF50' : dashboardStats.conversionRate > 10 ? '#FF9800' : '#f44336'
              )}
            </View>
          </View>
        )}

        {/* Lead Distribution Charts */}
        {leadStats && (
          <>
            {renderConversionFunnel()}
            
            {renderListCard('Leads by Source', leadStats.leadsBySource, 'source', 'count')}
            
            {renderListCard('Leads by Priority', leadStats.leadsByPriority, 'priority', 'count')}
          </>
        )}

        {/* Recent Activity */}
        {renderRecentActivity()}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  timeframeTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  timeframeTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTimeframeTab: {
    backgroundColor: '#2196F3',
  },
  timeframeTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTimeframeTabText: {
    color: '#fff',
  },
  statsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statsCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statsCardTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  statsCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statsCardSubtitle: {
    fontSize: 10,
    color: '#999',
  },
  listCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  listCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  listContent: {
    gap: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listItemLeft: {
    flex: 1,
    marginRight: 12,
  },
  listItemLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginBottom: 2,
  },
  listItemValue: {
    fontSize: 12,
    color: '#666',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#2196F3',
    borderRadius: 3,
    minWidth: 4,
  },
  percentageText: {
    fontSize: 10,
    color: '#666',
    marginLeft: 8,
    width: 30,
    textAlign: 'right',
  },
  funnelCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  funnelCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  funnelContent: {
    gap: 12,
  },
  funnelStage: {
    marginBottom: 8,
  },
  funnelStageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  funnelStageLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  funnelStageValue: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  funnelBarContainer: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  funnelBar: {
    height: '100%',
    borderRadius: 4,
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  activityCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityIconText: {
    fontSize: 16,
  },
  activityContent: {
    flex: 1,
  },
  activityType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  activityDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 10,
    color: '#999',
  },
  bottomSpacer: {
    height: 32,
  },
});

export default AnalyticsScreen;