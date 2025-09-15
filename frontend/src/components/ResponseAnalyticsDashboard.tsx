import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { responseTrackingService, ResponseAnalytics } from '../services/responseTrackingService';

const { width } = Dimensions.get('window');

interface ResponseAnalyticsDashboardProps {
  leadId?: number;
  workflowId?: string;
  onClose?: () => void;
}

export const ResponseAnalyticsDashboard: React.FC<ResponseAnalyticsDashboardProps> = ({
  leadId,
  workflowId,
  onClose,
}) => {
  const [analytics, setAnalytics] = useState<ResponseAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [leadName, setLeadName] = useState<string>('');

  useEffect(() => {
    loadAnalytics();
    if (leadId) {
      setLeadName(`Lead ${leadId}`); // Simple fallback for lead name
    }
  }, [leadId, workflowId, timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = responseTrackingService.getResponseAnalytics(leadId!, workflowId);
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      Alert.alert('Error', 'Failed to load response analytics');
    } finally {
      setLoading(false);
    }
  };

  const getEngagementScoreColor = (score: number): string => {
    if (score >= 80) return '#4CAF50'; // Green
    if (score >= 60) return '#FF9800'; // Orange
    if (score >= 40) return '#FF5722'; // Deep Orange
    return '#F44336'; // Red
  };

  const getEngagementScoreLabel = (score: number): string => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#ffa726',
    },
  };

  const renderEngagementOverview = () => {
    if (!analytics) return null;

    const engagementData = [
      {
        name: 'Email',
        engagement: analytics.openRate,
        total: analytics.totalEmails,
        color: '#2196F3',
        legendFontColor: '#333',
        legendFontSize: 12,
      },
      {
        name: 'SMS',
        engagement: analytics.deliveryRate,
        total: analytics.totalSMS,
        color: '#4CAF50',
        legendFontColor: '#333',
        legendFontSize: 12,
      },
      {
        name: 'In-App',
        engagement: (analytics.interactedInApp / Math.max(analytics.totalInApp, 1)) * 100,
        total: analytics.totalInApp,
        color: '#FF9800',
        legendFontColor: '#333',
        legendFontSize: 12,
      },
    ];

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Engagement Overview</Text>

        <View style={styles.metricGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{analytics.engagementScore.toFixed(1)}</Text>
            <Text style={styles.metricLabel}>Engagement Score</Text>
            <Text style={[styles.metricStatus, { color: getEngagementScoreColor(analytics.engagementScore) }]}>
              {getEngagementScoreLabel(analytics.engagementScore)}
            </Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{analytics.openRate.toFixed(1)}%</Text>
            <Text style={styles.metricLabel}>Email Open Rate</Text>
            <Text style={styles.metricSubtext}>
              {analytics.openedEmails}/{analytics.totalEmails} opened
            </Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{analytics.deliveryRate.toFixed(1)}%</Text>
            <Text style={styles.metricLabel}>SMS Delivery Rate</Text>
            <Text style={styles.metricSubtext}>
              {analytics.deliveredSMS}/{analytics.totalSMS} delivered
            </Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {analytics.averageResponseTime > 0 ? `${(analytics.averageResponseTime / 60).toFixed(1)}m` : 'N/A'}
            </Text>
            <Text style={styles.metricLabel}>Avg Response Time</Text>
            <Text style={styles.metricSubtext}>Time to engagement</Text>
          </View>
        </View>

        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Channel Performance</Text>
          {engagementData.map((item, index) => (
            <View key={index} style={styles.channelItem}>
              <Text style={styles.channelName}>{item.name}</Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(item.engagement, 100)}%`,
                      backgroundColor: item.color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.channelValue}>
                {item.engagement.toFixed(1)}% ({item.total} total)
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderEmailAnalytics = () => {
    if (!analytics || analytics.totalEmails === 0) return null;

    const emailData = [
      {
        name: 'Sent',
        value: analytics.totalEmails,
        color: '#2196F3',
      },
      {
        name: 'Opened',
        value: analytics.openedEmails,
        color: '#4CAF50',
      },
      {
        name: 'Clicked',
        value: analytics.clickedEmails,
        color: '#FF9800',
      },
      {
        name: 'Bounced',
        value: analytics.bouncedEmails,
        color: '#F44336',
      },
    ];

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Email Performance</Text>

        <View style={styles.metricRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{analytics.totalEmails}</Text>
            <Text style={styles.metricLabel}>Total Sent</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{analytics.openedEmails}</Text>
            <Text style={styles.metricLabel}>Opened</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{analytics.clickedEmails}</Text>
            <Text style={styles.metricLabel}>Clicked</Text>
          </View>
        </View>

        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Email Status Breakdown</Text>
          {emailData.map((item, index) => (
            <View key={index} style={styles.channelItem}>
              <Text style={styles.channelName}>{item.name}</Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${(item.value / Math.max(...emailData.map(d => d.value), 1)) * 100}%`,
                      backgroundColor: item.color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.channelValue}>{item.value} emails</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderSMSAnalytics = () => {
    if (!analytics || analytics.totalSMS === 0) return null;

    const smsData = [
      {
        name: 'Sent',
        value: analytics.totalSMS,
        color: '#2196F3',
      },
      {
        name: 'Delivered',
        value: analytics.deliveredSMS,
        color: '#4CAF50',
      },
      {
        name: 'Failed',
        value: analytics.failedSMS,
        color: '#F44336',
      },
    ];

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SMS Performance</Text>

        <View style={styles.metricRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{analytics.totalSMS}</Text>
            <Text style={styles.metricLabel}>Total Sent</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{analytics.deliveredSMS}</Text>
            <Text style={styles.metricLabel}>Delivered</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{analytics.failedSMS}</Text>
            <Text style={styles.metricLabel}>Failed</Text>
          </View>
        </View>

        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>SMS Delivery Status</Text>
          {smsData.map((item, index) => (
            <View key={index} style={styles.channelItem}>
              <Text style={styles.channelName}>{item.name}</Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${(item.value / Math.max(...smsData.map(d => d.value), 1)) * 100}%`,
                      backgroundColor: item.color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.channelValue}>{item.value} SMS</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderInAppAnalytics = () => {
    if (!analytics || analytics.totalInApp === 0) return null;

    const inAppData = [
      {
        name: 'Sent',
        value: analytics.totalInApp,
        color: '#2196F3',
      },
      {
        name: 'Displayed',
        value: analytics.displayedInApp,
        color: '#4CAF50',
      },
      {
        name: 'Interacted',
        value: analytics.interactedInApp,
        color: '#FF9800',
      },
      {
        name: 'Dismissed',
        value: analytics.dismissedInApp,
        color: '#F44336',
      },
    ];

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>In-App Notification Performance</Text>

        <View style={styles.metricRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{analytics.totalInApp}</Text>
            <Text style={styles.metricLabel}>Total Sent</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{analytics.displayedInApp}</Text>
            <Text style={styles.metricLabel}>Displayed</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{analytics.interactedInApp}</Text>
            <Text style={styles.metricLabel}>Interacted</Text>
          </View>
        </View>

        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>In-App Engagement</Text>
          {inAppData.map((item, index) => (
            <View key={index} style={styles.channelItem}>
              <Text style={styles.channelName}>{item.name}</Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${(item.value / Math.max(...inAppData.map(d => d.value), 1)) * 100}%`,
                      backgroundColor: item.color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.channelValue}>{item.value} notifications</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderTimeRangeSelector = () => (
    <View style={styles.timeRangeContainer}>
      <Text style={styles.timeRangeLabel}>Time Range:</Text>
      {(['7d', '30d', '90d'] as const).map((range) => (
        <TouchableOpacity
          key={range}
          style={[styles.timeRangeButton, timeRange === range && styles.timeRangeButtonActive]}
          onPress={() => setTimeRange(range)}
        >
          <Text style={[styles.timeRangeButtonText, timeRange === range && styles.timeRangeButtonTextActive]}>
            {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  if (!analytics) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No analytics data available</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          Response Analytics {leadName ? `for ${leadName}` : ''}
        </Text>
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        )}
      </View>

      {renderTimeRangeSelector()}

      {renderEngagementOverview()}
      {renderEmailAnalytics()}
      {renderSMSAnalytics()}
      {renderInAppAnalytics()}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Last Activity</Text>
        <Text style={styles.lastActivityText}>
          {analytics.lastActivity.toLocaleDateString()} at {analytics.lastActivity.toLocaleTimeString()}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f44336',
    borderRadius: 6,
  },
  closeButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  timeRangeLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 16,
    color: '#333',
  },
  timeRangeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
  },
  timeRangeButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  timeRangeButtonText: {
    fontSize: 14,
    color: '#666',
  },
  timeRangeButtonTextActive: {
    color: '#ffffff',
  },
  section: {
    backgroundColor: '#ffffff',
    margin: 8,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  metricStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  metricSubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  chartContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  lastActivityText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  channelItem: {
    marginBottom: 12,
  },
  channelName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  channelValue: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
});

export default ResponseAnalyticsDashboard;