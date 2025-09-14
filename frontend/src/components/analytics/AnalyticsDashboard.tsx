import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MaterialColors, MaterialSpacing, MaterialTypography, MaterialElevation } from '../../styles/MaterialDesign';
import { useResponsive } from '../../hooks/useResponsive';
import { InsightsDashboard } from '../insights';
import KPICard from './KPICard';
import ConversionFunnel from './ConversionFunnel';
import TrendChart from './TrendChart';
import ComparisonChart from './ComparisonChart';
import LeadAnalytics from './LeadAnalytics';

const { width: screenWidth } = Dimensions.get('window');

interface AnalyticsDashboardProps {
  leadId?: number;
  showInsights?: boolean;
  onInsightSelect?: (insight: any) => void;
  onRecommendationSelect?: (insightId: string, recommendationId: string) => void;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  leadId,
  showInsights = true,
  onInsightSelect,
  onRecommendationSelect
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'insights' | 'performance'>('overview');
  const { deviceType, getResponsiveSpacing } = useResponsive();

  // Mock data for demonstration - in real app, this would come from services
  const kpiData = [
    {
      title: 'Total Leads',
      value: 1247,
      trend: { value: 12.5, label: 'vs last month', direction: 'up' as const },
      icon: <MaterialCommunityIcons name="account-group" size={24} color={MaterialColors.primary[500]} />,
      color: MaterialColors.primary[500],
    },
    {
      title: 'Conversion Rate',
      value: 23.4,
      format: 'percentage' as const,
      trend: { value: 3.2, label: 'vs last month', direction: 'up' as const },
      icon: <MaterialCommunityIcons name="trending-up" size={24} color={MaterialColors.secondary[500]} />,
      color: MaterialColors.secondary[500],
    },
    {
      title: 'Avg Response Time',
      value: 4.2,
      subtitle: 'hours',
      trend: { value: 8.1, label: 'vs last month', direction: 'down' as const },
      icon: <MaterialCommunityIcons name="clock-outline" size={24} color={MaterialColors.warning[500]} />,
      color: MaterialColors.warning[500],
    },
    {
      title: 'Revenue',
      value: 89250,
      format: 'currency' as const,
      trend: { value: 15.3, label: 'vs last month', direction: 'up' as const },
      icon: <MaterialCommunityIcons name="cash" size={24} color={MaterialColors.secondary[600]} />,
      color: MaterialColors.secondary[600],
    },
  ];

  const tabs = [
    { key: 'overview', label: 'Overview', icon: 'view-dashboard' },
    { key: 'leads', label: 'Leads', icon: 'account-group' },
    { key: 'insights', label: 'Insights', icon: 'lightbulb-on' },
    { key: 'performance', label: 'Performance', icon: 'chart-line' },
  ];

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.tab,
            activeTab === tab.key && styles.activeTab
          ]}
          onPress={() => setActiveTab(tab.key as any)}
          accessibilityLabel={`${tab.label} tab`}
          accessibilityState={{ selected: activeTab === tab.key }}
        >
          <MaterialCommunityIcons
            name={tab.icon as any}
            size={20}
            color={activeTab === tab.key ? MaterialColors.primary[500] : MaterialColors.neutral[600]}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === tab.key && styles.activeTabText
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOverviewTab = () => {
    const responsiveSpacing = getResponsiveSpacing(MaterialSpacing.md);

    return (
      <ScrollView
        style={styles.tabContent}
        contentContainerStyle={{ padding: responsiveSpacing }}
        showsVerticalScrollIndicator={false}
      >
        {/* KPI Cards */}
        <View style={styles.kpiGrid}>
          {kpiData.map((kpi, index) => (
            <View key={index} style={styles.kpiCard}>
              <KPICard {...kpi} />
            </View>
          ))}
        </View>

        {/* Charts Section */}
        <View style={styles.chartsSection}>
          <Text style={[styles.sectionTitle, { color: MaterialColors.onSurface }]}>
            Performance Trends
          </Text>

          <View style={styles.chartContainer}>
            <TrendChart
              title="Lead Conversion Trend"
              data={[
                { date: '2024-01-01', value: 18.5, label: 'Jan' },
                { date: '2024-02-01', value: 21.2, label: 'Feb' },
                { date: '2024-03-01', value: 19.8, label: 'Mar' },
                { date: '2024-04-01', value: 22.1, label: 'Apr' },
                { date: '2024-05-01', value: 23.4, label: 'May' },
              ]}
              trendColor={MaterialColors.primary[500]}
            />
          </View>

          <View style={styles.chartContainer}>
            <ConversionFunnel
              data={[
                { stage_name: 'New Lead', stage_order: 1, lead_count: 1000, avg_probability: 0.1, total_value: 500000 },
                { stage_name: 'Initial Contact', stage_order: 2, lead_count: 750, avg_probability: 0.2, total_value: 375000 },
                { stage_name: 'Qualified', stage_order: 3, lead_count: 450, avg_probability: 0.4, total_value: 225000 },
                { stage_name: 'Proposal Sent', stage_order: 4, lead_count: 180, avg_probability: 0.6, total_value: 90000 },
                { stage_name: 'Closed Won', stage_order: 5, lead_count: 85, avg_probability: 0.9, total_value: 42500 },
              ]}
            />
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderInsightsTab = () => {
    if (!showInsights) {
      return (
        <View style={styles.centeredContent}>
          <MaterialCommunityIcons
            name="lightbulb-off-outline"
            size={48}
            color={MaterialColors.neutral[400]}
          />
          <Text style={[styles.emptyText, { color: MaterialColors.neutral[600] }]}>
            Insights are currently disabled
          </Text>
        </View>
      );
    }

    return (
      <InsightsDashboard
        leadId={leadId}
        onInsightSelect={onInsightSelect}
        onRecommendationSelect={onRecommendationSelect}
      />
    );
  };

  const renderPerformanceTab = () => {
    const responsiveSpacing = getResponsiveSpacing(MaterialSpacing.md);

    return (
      <ScrollView
        style={styles.tabContent}
        contentContainerStyle={{ padding: responsiveSpacing }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.chartsSection}>
          <Text style={[styles.sectionTitle, { color: MaterialColors.onSurface }]}>
            Detailed Performance Analysis
          </Text>

          <View style={styles.chartContainer}>
            <ComparisonChart
              title="Agent Performance Comparison"
              data={[
                { label: 'Agent A', values: { performance: 85, benchmark: 75 } },
                { label: 'Agent B', values: { performance: 92, benchmark: 75 } },
                { label: 'Agent C', values: { performance: 78, benchmark: 75 } },
                { label: 'Team Avg', values: { performance: 75, benchmark: 75 } },
              ]}
              categories={['performance', 'benchmark']}
              categoryLabels={{ performance: 'Performance', benchmark: 'Benchmark' }}
              categoryColors={{ performance: MaterialColors.primary[500], benchmark: MaterialColors.secondary[500] }}
            />
          </View>

          <View style={styles.chartContainer}>
            <TrendChart
              title="Response Time Trends"
              data={[
                { date: '2024-01-01', value: 6.2, label: 'Week 1' },
                { date: '2024-01-08', value: 5.8, label: 'Week 2' },
                { date: '2024-01-15', value: 4.9, label: 'Week 3' },
                { date: '2024-01-22', value: 4.2, label: 'Week 4' },
              ]}
              trendColor={MaterialColors.warning[500]}
            />
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderLeadsTab = () => {
    return (
      <LeadAnalytics
        timeRange="30d"
        onLeadSelect={(leadId) => {
          // Handle lead selection - could navigate to lead detail
          console.log('Selected lead:', leadId);
        }}
        showFilters={true}
      />
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'leads':
        return renderLeadsTab();
      case 'insights':
        return renderInsightsTab();
      case 'performance':
        return renderPerformanceTab();
      default:
        return renderOverviewTab();
    }
  };

  return (
    <View style={styles.container}>
      {renderTabBar()}
      {renderTabContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MaterialColors.background,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: MaterialColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: MaterialColors.neutral[200],
    ...MaterialElevation.level1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: MaterialSpacing.md,
    paddingHorizontal: MaterialSpacing.sm,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: MaterialColors.primary[500],
  },
  tabText: {
    ...MaterialTypography.labelLarge,
    color: MaterialColors.neutral[600],
    marginLeft: MaterialSpacing.xs,
  },
  activeTabText: {
    color: MaterialColors.primary[500],
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  kpiGrid: {
    flexDirection: screenWidth > 600 ? 'row' : 'column',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  kpiCard: {
    width: screenWidth > 600 ? '48%' : '100%',
    marginBottom: MaterialSpacing.md,
  },
  chartsSection: {
    marginTop: MaterialSpacing.lg,
  },
  sectionTitle: {
    ...MaterialTypography.headlineSmall,
    marginBottom: MaterialSpacing.md,
  },
  chartContainer: {
    marginBottom: MaterialSpacing.lg,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: MaterialSpacing.xl,
  },
  emptyText: {
    ...MaterialTypography.bodyLarge,
    textAlign: 'center',
    marginTop: MaterialSpacing.md,
  },
});

export default AnalyticsDashboard;