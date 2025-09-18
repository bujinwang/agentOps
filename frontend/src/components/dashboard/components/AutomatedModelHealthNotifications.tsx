import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { MaterialColors, MaterialSpacing, MaterialTypography } from '../../../styles/MaterialDesign';
import { ModelHealth, DriftDetection } from '../../../types/ml';

interface AutomatedModelHealthNotificationsProps {
  modelHealth: ModelHealth;
  recentDrift: DriftDetection | null;
  onAcknowledgeNotification: (notificationId: string) => void;
  onConfigureAlerts: () => void;
  onViewHealthHistory: () => void;
}

interface HealthMetricCardProps {
  title: string;
  status: 'pass' | 'fail';
  current: number;
  threshold: number;
  unit: string;
  message: string;
}

const HealthMetricCard: React.FC<HealthMetricCardProps> = ({
  title,
  status,
  current,
  threshold,
  unit,
  message
}) => {
  const getStatusColor = (status: 'pass' | 'fail') => {
    return status === 'pass' ? MaterialColors.secondary[600] : MaterialColors.error[500];
  };

  const getStatusIcon = (status: 'pass' | 'fail') => {
    return status === 'pass' ? '✅' : '❌';
  };

  return (
    <View style={[styles.metricCard, { borderLeftColor: getStatusColor(status) }]}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricIcon}>{getStatusIcon(status)}</Text>
        <Text style={styles.metricTitle}>{title}</Text>
        <Text style={[styles.metricStatus, { color: getStatusColor(status) }]}>
          {status.toUpperCase()}
        </Text>
      </View>

      <View style={styles.metricValues}>
        <Text style={styles.metricCurrent}>
          {current.toFixed(2)}{unit}
        </Text>
        <Text style={styles.metricThreshold}>
          Threshold: {threshold.toFixed(2)}{unit}
        </Text>
      </View>

      <Text style={styles.metricMessage}>{message}</Text>
    </View>
  );
};

interface NotificationItemProps {
  id: string;
  type: 'drift' | 'performance' | 'health' | 'maintenance';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  acknowledged: boolean;
  onAcknowledge: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  id,
  type,
  title,
  message,
  severity,
  timestamp,
  acknowledged,
  onAcknowledge
}) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return MaterialColors.error[600];
      case 'high':
        return MaterialColors.error[500];
      case 'medium':
        return MaterialColors.primary[500];
      case 'low':
        return MaterialColors.primary[400];
      default:
        return MaterialColors.neutral[500];
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'drift':
        return '📊';
      case 'performance':
        return '⚡';
      case 'health':
        return '❤️';
      case 'maintenance':
        return '🔧';
      default:
        return '📢';
    }
  };

  const handleAcknowledge = () => {
    Alert.alert(
      'Acknowledge Notification',
      'Mark this notification as acknowledged?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Acknowledge', onPress: onAcknowledge },
      ]
    );
  };

  return (
    <View style={[styles.notificationCard, acknowledged && styles.notificationAcknowledged]}>
      <View style={styles.notificationHeader}>
        <View style={styles.notificationTypeRow}>
          <Text style={styles.notificationIcon}>{getTypeIcon(type)}</Text>
          <Text style={styles.notificationTitle}>{title}</Text>
        </View>
        <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(severity) }]}>
          <Text style={styles.severityText}>{severity.toUpperCase()}</Text>
        </View>
      </View>

      <Text style={styles.notificationMessage}>{message}</Text>

      <View style={styles.notificationFooter}>
        <Text style={styles.notificationTime}>
          {new Date(timestamp).toLocaleString()}
        </Text>
        {!acknowledged && (
          <TouchableOpacity
            style={styles.acknowledgeButton}
            onPress={handleAcknowledge}
          >
            <Text style={styles.acknowledgeButtonText}>Acknowledge</Text>
          </TouchableOpacity>
        )}
        {acknowledged && (
          <Text style={styles.acknowledgedText}>✓ Acknowledged</Text>
        )}
      </View>
    </View>
  );
};

interface AlertRuleProps {
  rule: {
    id: string;
    name: string;
    type: string;
    threshold: number;
    enabled: boolean;
    lastTriggered?: string;
  };
  onToggle: () => void;
}

const AlertRule: React.FC<AlertRuleProps> = ({ rule, onToggle }) => {
  return (
    <View style={styles.ruleCard}>
      <View style={styles.ruleHeader}>
        <Text style={styles.ruleName}>{rule.name}</Text>
        <TouchableOpacity
          style={[styles.ruleToggle, rule.enabled && styles.ruleToggleEnabled]}
          onPress={onToggle}
        >
          <Text style={[styles.ruleToggleText, rule.enabled && styles.ruleToggleTextEnabled]}>
            {rule.enabled ? 'ON' : 'OFF'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.ruleDetails}>
        <Text style={styles.ruleType}>{rule.type}</Text>
        <Text style={styles.ruleThreshold}>
          Threshold: {rule.threshold.toFixed(2)}
        </Text>
        {rule.lastTriggered && (
          <Text style={styles.ruleLastTriggered}>
            Last triggered: {new Date(rule.lastTriggered).toLocaleString()}
          </Text>
        )}
      </View>
    </View>
  );
};

export const AutomatedModelHealthNotifications: React.FC<AutomatedModelHealthNotificationsProps> = ({
  modelHealth,
  recentDrift,
  onAcknowledgeNotification,
  onConfigureAlerts,
  onViewHealthHistory,
}) => {
  const [activeTab, setActiveTab] = useState<'health' | 'notifications' | 'rules'>('health');
  const [acknowledgedNotifications, setAcknowledgedNotifications] = useState<Set<string>>(new Set());

  // Mock notifications data - in real app this would come from props
  const mockNotifications = [
    {
      id: 'drift-001',
      type: 'drift' as const,
      title: 'Model Drift Detected',
      message: 'Feature drift detected in user engagement patterns. Accuracy may be affected.',
      severity: 'high' as const,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      acknowledged: false,
    },
    {
      id: 'perf-001',
      type: 'performance' as const,
      title: 'Performance Degradation',
      message: 'Response time increased by 15% over the last hour.',
      severity: 'medium' as const,
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      acknowledged: false,
    },
    {
      id: 'health-001',
      type: 'health' as const,
      title: 'Model Health Check',
      message: 'All health checks passed. Model is performing optimally.',
      severity: 'low' as const,
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      acknowledged: true,
    },
  ];

  const mockAlertRules = [
    {
      id: 'drift-rule',
      name: 'Feature Drift Alert',
      type: 'Drift Detection',
      threshold: 0.05,
      enabled: true,
      lastTriggered: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'accuracy-rule',
      name: 'Accuracy Drop Alert',
      type: 'Performance',
      threshold: 0.02,
      enabled: true,
    },
    {
      id: 'latency-rule',
      name: 'High Latency Alert',
      type: 'Performance',
      threshold: 500,
      enabled: false,
    },
  ];

  const notifications = useMemo(() => {
    return mockNotifications.map(notification => ({
      ...notification,
      acknowledged: acknowledgedNotifications.has(notification.id),
    }));
  }, [acknowledgedNotifications]);

  const handleAcknowledgeNotification = (notificationId: string) => {
    setAcknowledgedNotifications(prev => new Set([...prev, notificationId]));
    onAcknowledgeNotification(notificationId);
  };

  const handleToggleRule = (ruleId: string) => {
    // In real app, this would update the rule status
    console.log('Toggling rule:', ruleId);
  };

  const getOverallHealthStatus = () => {
    if (modelHealth.status === 'critical') return 'critical';
    if (modelHealth.status === 'warning') return 'high';
    if (recentDrift?.detected) return 'high';
    return 'low';
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'critical':
        return MaterialColors.error[600];
      case 'high':
        return MaterialColors.error[500];
      case 'medium':
        return MaterialColors.primary[500];
      case 'low':
        return MaterialColors.secondary[600];
      default:
        return MaterialColors.neutral[500];
    }
  };

  const renderHealthTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.healthOverview}>
        <View style={[styles.healthStatus, { borderLeftColor: getHealthStatusColor(modelHealth.status) }]}>
          <Text style={styles.healthStatusTitle}>Overall Health</Text>
          <Text style={[styles.healthStatusValue, { color: getHealthStatusColor(modelHealth.status) }]}>
            {modelHealth.status.toUpperCase()}
          </Text>
          <Text style={styles.healthLastChecked}>
            Last checked: {new Date(modelHealth.lastChecked).toLocaleString()}
          </Text>
        </View>
      </View>

      <View style={styles.metricsSection}>
        <Text style={styles.sectionTitle}>Health Metrics</Text>
        <HealthMetricCard
          title="Accuracy"
          status={modelHealth.checks.accuracy.status}
          current={modelHealth.checks.accuracy.current}
          threshold={modelHealth.checks.accuracy.threshold}
          unit="%"
          message={modelHealth.checks.accuracy.message}
        />
        <HealthMetricCard
          title="Drift Detection"
          status={modelHealth.checks.drift.status}
          current={recentDrift?.metrics.featureDrift || 0}
          threshold={0.05}
          unit=""
          message={modelHealth.checks.drift.message}
        />
        <HealthMetricCard
          title="Response Time"
          status={modelHealth.checks.performance.status}
          current={modelHealth.checks.performance.latency}
          threshold={modelHealth.checks.performance.threshold}
          unit="ms"
          message={modelHealth.checks.performance.message}
        />
        <HealthMetricCard
          title="Data Quality"
          status={modelHealth.checks.dataQuality.status}
          current={modelHealth.checks.dataQuality.completeness}
          threshold={modelHealth.checks.dataQuality.threshold}
          unit="%"
          message={modelHealth.checks.dataQuality.message}
        />
      </View>

      {recentDrift?.detected && (
        <View style={styles.driftAlert}>
          <Text style={styles.driftAlertTitle}>🚨 Active Drift Alert</Text>
          <Text style={styles.driftAlertMessage}>
            Model drift detected with severity: {recentDrift.severity}
          </Text>
          <Text style={styles.driftAlertTime}>
            Detected: {new Date(recentDrift.detectedAt).toLocaleString()}
          </Text>
        </View>
      )}
    </ScrollView>
  );

  const renderNotificationsTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.notificationsHeader}>
        <Text style={styles.sectionTitle}>Recent Notifications</Text>
        <TouchableOpacity style={styles.historyButton} onPress={onViewHealthHistory}>
          <Text style={styles.historyButtonText}>View History</Text>
        </TouchableOpacity>
      </View>

      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          {...notification}
          onAcknowledge={() => handleAcknowledgeNotification(notification.id)}
        />
      ))}

      {notifications.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No notifications at this time</Text>
        </View>
      )}
    </ScrollView>
  );

  const renderRulesTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.rulesHeader}>
        <Text style={styles.sectionTitle}>Alert Rules</Text>
        <TouchableOpacity style={styles.configureButton} onPress={onConfigureAlerts}>
          <Text style={styles.configureButtonText}>Configure</Text>
        </TouchableOpacity>
      </View>

      {mockAlertRules.map(rule => (
        <AlertRule
          key={rule.id}
          rule={rule}
          onToggle={() => handleToggleRule(rule.id)}
        />
      ))}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Model Health Notifications</Text>
        <Text style={styles.subtitle}>
          Automated monitoring and alerts for model performance
        </Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'health' && styles.tabActive]}
          onPress={() => setActiveTab('health')}
        >
          <Text style={[styles.tabText, activeTab === 'health' && styles.tabTextActive]}>
            Health Status
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'notifications' && styles.tabActive]}
          onPress={() => setActiveTab('notifications')}
        >
          <Text style={[styles.tabText, activeTab === 'notifications' && styles.tabTextActive]}>
            Notifications ({notifications.filter(n => !n.acknowledged).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'rules' && styles.tabActive]}
          onPress={() => setActiveTab('rules')}
        >
          <Text style={[styles.tabText, activeTab === 'rules' && styles.tabTextActive]}>
            Alert Rules
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'health' && renderHealthTab()}
      {activeTab === 'notifications' && renderNotificationsTab()}
      {activeTab === 'rules' && renderRulesTab()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MaterialColors.neutral[50],
  },
  header: {
    padding: MaterialSpacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: MaterialColors.neutral[200],
  },
  title: {
    ...MaterialTypography.headlineSmall,
    color: MaterialColors.neutral[900],
    marginBottom: MaterialSpacing.xs,
  },
  subtitle: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[600],
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: MaterialSpacing.lg,
    paddingVertical: MaterialSpacing.sm,
    backgroundColor: MaterialColors.surface,
  },
  tab: {
    flex: 1,
    paddingVertical: MaterialSpacing.sm,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: MaterialColors.primary[100],
  },
  tabText: {
    ...MaterialTypography.labelMedium,
    color: MaterialColors.neutral[700],
  },
  tabTextActive: {
    color: MaterialColors.primary[700],
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    padding: MaterialSpacing.lg,
  },
  healthOverview: {
    marginBottom: MaterialSpacing.lg,
  },
  healthStatus: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    padding: MaterialSpacing.lg,
    borderLeftWidth: 4,
    elevation: 2,
  },
  healthStatusTitle: {
    ...MaterialTypography.titleMedium,
    color: MaterialColors.neutral[900],
    marginBottom: MaterialSpacing.sm,
  },
  healthStatusValue: {
    ...MaterialTypography.headlineMedium,
    fontWeight: 'bold',
    marginBottom: MaterialSpacing.xs,
  },
  healthLastChecked: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
  },
  metricsSection: {
    gap: MaterialSpacing.md,
  },
  sectionTitle: {
    ...MaterialTypography.titleMedium,
    color: MaterialColors.neutral[900],
    marginBottom: MaterialSpacing.md,
  },
  metricCard: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    padding: MaterialSpacing.lg,
    borderLeftWidth: 4,
    elevation: 2,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: MaterialSpacing.md,
  },
  metricIcon: {
    fontSize: 20,
    marginRight: MaterialSpacing.sm,
  },
  metricTitle: {
    ...MaterialTypography.titleSmall,
    color: MaterialColors.neutral[900],
    flex: 1,
  },
  metricStatus: {
    ...MaterialTypography.labelSmall,
    fontWeight: '600',
  },
  metricValues: {
    marginBottom: MaterialSpacing.sm,
  },
  metricCurrent: {
    ...MaterialTypography.headlineSmall,
    color: MaterialColors.neutral[900],
    fontWeight: 'bold',
  },
  metricThreshold: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
  },
  metricMessage: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[700],
  },
  driftAlert: {
    backgroundColor: MaterialColors.error[50],
    borderRadius: 12,
    padding: MaterialSpacing.lg,
    borderWidth: 1,
    borderColor: MaterialColors.error[200],
    marginTop: MaterialSpacing.lg,
  },
  driftAlertTitle: {
    ...MaterialTypography.titleMedium,
    color: MaterialColors.error[700],
    marginBottom: MaterialSpacing.sm,
  },
  driftAlertMessage: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.error[600],
    marginBottom: MaterialSpacing.sm,
  },
  driftAlertTime: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.error[500],
  },
  notificationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: MaterialSpacing.md,
  },
  historyButton: {
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.sm,
    backgroundColor: MaterialColors.primary[500],
    borderRadius: 8,
  },
  historyButtonText: {
    ...MaterialTypography.labelMedium,
    color: MaterialColors.onPrimary,
  },
  notificationCard: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    padding: MaterialSpacing.lg,
    marginBottom: MaterialSpacing.md,
    elevation: 2,
  },
  notificationAcknowledged: {
    opacity: 0.6,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: MaterialSpacing.sm,
  },
  notificationTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  notificationIcon: {
    fontSize: 20,
    marginRight: MaterialSpacing.sm,
  },
  notificationTitle: {
    ...MaterialTypography.titleSmall,
    color: MaterialColors.neutral[900],
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: MaterialSpacing.sm,
    paddingVertical: MaterialSpacing.xs,
    borderRadius: 12,
  },
  severityText: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.onPrimary,
    fontWeight: '600',
  },
  notificationMessage: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[700],
    marginBottom: MaterialSpacing.md,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationTime: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[500],
  },
  acknowledgeButton: {
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.sm,
    backgroundColor: MaterialColors.secondary[500],
    borderRadius: 8,
  },
  acknowledgeButtonText: {
    ...MaterialTypography.labelMedium,
    color: MaterialColors.onSecondary,
  },
  acknowledgedText: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.secondary[600],
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: MaterialSpacing.xl,
  },
  emptyStateText: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[500],
  },
  rulesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: MaterialSpacing.md,
  },
  configureButton: {
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.sm,
    backgroundColor: MaterialColors.primary[500],
    borderRadius: 8,
  },
  configureButtonText: {
    ...MaterialTypography.labelMedium,
    color: MaterialColors.onPrimary,
  },
  ruleCard: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    padding: MaterialSpacing.lg,
    marginBottom: MaterialSpacing.md,
    elevation: 2,
  },
  ruleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: MaterialSpacing.md,
  },
  ruleName: {
    ...MaterialTypography.titleSmall,
    color: MaterialColors.neutral[900],
    flex: 1,
  },
  ruleToggle: {
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.sm,
    backgroundColor: MaterialColors.neutral[200],
    borderRadius: 20,
  },
  ruleToggleEnabled: {
    backgroundColor: MaterialColors.secondary[500],
  },
  ruleToggleText: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.neutral[700],
    fontWeight: '600',
  },
  ruleToggleTextEnabled: {
    color: MaterialColors.onSecondary,
  },
  ruleDetails: {
    gap: MaterialSpacing.sm,
  },
  ruleType: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[700],
  },
  ruleThreshold: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
  },
  ruleLastTriggered: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[500],
  },
});

export default AutomatedModelHealthNotifications;