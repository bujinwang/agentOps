import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { MaterialColors } from '../../../styles/MaterialDesign';
import { ModelPerformance } from '../../../types/dashboard';

interface ModelPerformanceAlertDashboardProps {
  modelPerformance: ModelPerformance[];
  onModelAction: (modelId: string, action: string) => void;
  onAcknowledgeAlert: (alertId: string) => void;
}

interface PerformanceAlert {
  id: string;
  modelId: string;
  type: 'drift' | 'accuracy' | 'performance' | 'health';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  metric: string;
  value: number;
  threshold: number;
  trend: 'improving' | 'stable' | 'declining';
  timestamp: Date;
  acknowledged: boolean;
}

const PERFORMANCE_THRESHOLDS = {
  accuracy: { critical: 0.7, high: 0.8, medium: 0.85 },
  drift: { critical: 0.3, high: 0.2, medium: 0.1 },
  performance: { critical: 0.5, high: 0.7, medium: 0.8 },
};

const { width: screenWidth } = Dimensions.get('window');

const ModelPerformanceAlertDashboard: React.FC<ModelPerformanceAlertDashboardProps> = ({
  modelPerformance,
  onModelAction,
  onAcknowledgeAlert,
}) => {
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [selectedModel, setSelectedModel] = useState<string>('all');

  // Generate performance alerts based on model data
  const generateAlerts = useCallback(() => {
    const newAlerts: PerformanceAlert[] = [];

    modelPerformance.forEach(model => {
      const modelId = model.modelId;

      // Accuracy alerts
      if (model.accuracy < PERFORMANCE_THRESHOLDS.accuracy.critical) {
        newAlerts.push({
          id: `accuracy-${modelId}`,
          modelId,
          type: 'accuracy',
          severity: 'critical',
          title: 'Critical Accuracy Drop',
          description: `${model.modelId} accuracy has dropped below acceptable threshold`,
          metric: 'Accuracy',
          value: model.accuracy,
          threshold: PERFORMANCE_THRESHOLDS.accuracy.critical,
          trend: 'declining',
          timestamp: new Date(),
          acknowledged: false,
        });
      } else if (model.accuracy < PERFORMANCE_THRESHOLDS.accuracy.high) {
        newAlerts.push({
          id: `accuracy-${modelId}`,
          modelId,
          type: 'accuracy',
          severity: 'high',
          title: 'Low Model Accuracy',
          description: `${model.modelId} accuracy is below optimal threshold`,
          metric: 'Accuracy',
          value: model.accuracy,
          threshold: PERFORMANCE_THRESHOLDS.accuracy.high,
          trend: 'stable',
          timestamp: new Date(),
          acknowledged: false,
        });
      }

      // Drift detection alerts
      if (model.driftDetected && model.driftSeverity === 'high') {
        newAlerts.push({
          id: `drift-${modelId}`,
          modelId,
          type: 'drift',
          severity: 'critical',
          title: 'Severe Model Drift Detected',
          description: `${model.modelId} has experienced significant performance drift`,
          metric: 'Drift Severity',
          value: model.driftSeverity === 'high' ? 0.8 : model.driftSeverity === 'medium' ? 0.5 : 0.2,
          threshold: PERFORMANCE_THRESHOLDS.drift.critical,
          trend: 'declining',
          timestamp: new Date(),
          acknowledged: false,
        });
      }

      // Performance alerts
      if (model.f1Score < PERFORMANCE_THRESHOLDS.performance.critical) {
        newAlerts.push({
          id: `performance-${modelId}`,
          modelId,
          type: 'performance',
          severity: 'high',
          title: 'Poor Model Performance',
          description: `${model.modelId} F1-Score indicates poor overall performance`,
          metric: 'F1-Score',
          value: model.f1Score,
          threshold: PERFORMANCE_THRESHOLDS.performance.critical,
          trend: 'declining',
          timestamp: new Date(),
          acknowledged: false,
        });
      }

      // Health alerts
      const daysSinceRetrained = Math.floor(
        (Date.now() - new Date(model.lastRetrained).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceRetrained > 30) {
        newAlerts.push({
          id: `health-${modelId}`,
          modelId,
          type: 'health',
          severity: daysSinceRetrained > 60 ? 'critical' : 'medium',
          title: 'Model Needs Retraining',
          description: `${model.modelId} hasn't been retrained in ${daysSinceRetrained} days`,
          metric: 'Days Since Retrained',
          value: daysSinceRetrained,
          threshold: 30,
          trend: 'stable',
          timestamp: new Date(),
          acknowledged: false,
        });
      }
    });

    // Sort by severity and timestamp
    newAlerts.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    setAlerts(newAlerts);
  }, [modelPerformance]);

  useEffect(() => {
    generateAlerts();
  }, [generateAlerts]);

  const filteredAlerts = alerts.filter(alert => {
    const severityMatch = filterSeverity === 'all' || alert.severity === filterSeverity;
    const modelMatch = selectedModel === 'all' || alert.modelId === selectedModel;
    return severityMatch && modelMatch;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return MaterialColors.error[500];
      case 'high':
        return MaterialColors.error[400];
      case 'medium':
        return MaterialColors.warning[500];
      case 'low':
        return MaterialColors.primary[400];
      default:
        return MaterialColors.primary[500];
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'notifications';
      default:
        return 'assessment';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'drift':
        return 'trending-down';
      case 'accuracy':
        return 'timeline';
      case 'performance':
        return 'speed';
      case 'health':
        return 'health-and-safety';
      default:
        return 'analytics';
    }
  };

  const handleAcknowledge = (alertId: string) => {
    setAlerts(prev =>
      prev.map(alert =>
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      )
    );
    onAcknowledgeAlert(alertId);
  };

  const handleModelAction = (alert: PerformanceAlert, action: string) => {
    onModelAction(alert.modelId, action);
  };

  const getModelOptions = () => {
    const models = [...new Set(modelPerformance.map(m => m.modelId))];
    return ['all', ...models];
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Model Performance Alerts</Text>

        <View style={styles.filtersContainer}>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Severity:</Text>
            {(['all', 'critical', 'high', 'medium', 'low'] as const).map(severity => (
              <TouchableOpacity
                key={severity}
                style={[
                  styles.filterButton,
                  filterSeverity === severity && styles.filterButtonActive,
                ]}
                onPress={() => setFilterSeverity(severity)}
              >
                <Text
                  style={[
                    styles.filterText,
                    filterSeverity === severity && styles.filterTextActive,
                  ]}
                >
                  {severity.charAt(0).toUpperCase() + severity.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Model:</Text>
            {getModelOptions().map(modelId => (
              <TouchableOpacity
                key={modelId}
                style={[
                  styles.filterButton,
                  selectedModel === modelId && styles.filterButtonActive,
                ]}
                onPress={() => setSelectedModel(modelId)}
              >
                <Text
                  style={[
                    styles.filterText,
                    selectedModel === modelId && styles.filterTextActive,
                  ]}
                >
                  {modelId === 'all' ? 'All Models' : modelId}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <ScrollView style={styles.alertsContainer}>
        {filteredAlerts.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="check-circle" size={48} color={MaterialColors.secondary[500]} />
            <Text style={styles.emptyText}>All models performing well!</Text>
            <Text style={styles.emptySubtext}>No performance alerts at this time.</Text>
          </View>
        ) : (
          filteredAlerts.map(alert => (
            <View key={alert.id} style={[styles.alertCard, alert.acknowledged && styles.acknowledgedCard]}>
              <View style={styles.alertHeader}>
                <View style={styles.alertIconContainer}>
                  <MaterialIcons
                    name={getSeverityIcon(alert.severity)}
                    size={24}
                    color={getSeverityColor(alert.severity)}
                  />
                </View>
                <View style={styles.alertContent}>
                  <View style={styles.alertTitleRow}>
                    <Text style={styles.alertTitle}>{alert.title}</Text>
                    <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(alert.severity) }]}>
                      <Text style={styles.severityText}>{alert.severity.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.alertDescription}>{alert.description}</Text>
                  <View style={styles.alertMetrics}>
                    <Text style={styles.metricText}>
                      {alert.metric}: {alert.value.toFixed(3)} (Threshold: {alert.threshold.toFixed(3)})
                    </Text>
                    <Text style={styles.modelText}>Model: {alert.modelId}</Text>
                  </View>
                </View>
                <View style={styles.typeIcon}>
                  <MaterialIcons
                    name={getTypeIcon(alert.type)}
                    size={20}
                    color={MaterialColors.neutral[500]}
                  />
                </View>
              </View>

              <View style={styles.alertActions}>
                {!alert.acknowledged && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.primaryAction]}
                    onPress={() => handleAcknowledge(alert.id)}
                  >
                    <MaterialIcons name="check" size={16} color={MaterialColors.onPrimary} />
                    <Text style={styles.actionButtonText}>Acknowledge</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.actionButton, styles.secondaryAction]}
                  onPress={() => handleModelAction(alert, 'retrain')}
                >
                  <MaterialIcons name="refresh" size={16} color={MaterialColors.primary[500]} />
                  <Text style={[styles.actionButtonText, styles.secondaryActionText]}>Retrain</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.tertiaryAction]}
                  onPress={() => handleModelAction(alert, 'analyze')}
                >
                  <MaterialIcons name="analytics" size={16} color={MaterialColors.neutral[600]} />
                  <Text style={[styles.actionButtonText, styles.tertiaryActionText]}>Analyze</Text>
                </TouchableOpacity>
              </View>

              {alert.acknowledged && (
                <View style={styles.acknowledgedBanner}>
                  <MaterialIcons name="check-circle" size={16} color={MaterialColors.secondary[500]} />
                  <Text style={styles.acknowledgedText}>Acknowledged</Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MaterialColors.surface,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: MaterialColors.neutral[200],
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: MaterialColors.onSurface,
    marginBottom: 16,
  },
  filtersContainer: {
    gap: 12,
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    color: MaterialColors.neutral[600],
    minWidth: 60,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MaterialColors.neutral[200],
  },
  filterButtonActive: {
    backgroundColor: MaterialColors.primary[500],
    borderColor: MaterialColors.primary[500],
  },
  filterText: {
    fontSize: 12,
    color: MaterialColors.neutral[600],
  },
  filterTextActive: {
    color: MaterialColors.onPrimary,
  },
  alertsContainer: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: MaterialColors.onSurface,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: MaterialColors.neutral[600],
    marginTop: 8,
    textAlign: 'center',
  },
  alertCard: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: MaterialColors.neutral[200],
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  acknowledgedCard: {
    opacity: 0.7,
    borderColor: MaterialColors.secondary[200],
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  alertIconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  alertContent: {
    flex: 1,
  },
  alertTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: MaterialColors.onSurface,
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  severityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: MaterialColors.onPrimary,
  },
  alertDescription: {
    fontSize: 14,
    color: MaterialColors.neutral[700],
    lineHeight: 20,
    marginBottom: 8,
  },
  alertMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricText: {
    fontSize: 12,
    color: MaterialColors.neutral[600],
    fontFamily: 'monospace',
  },
  modelText: {
    fontSize: 12,
    color: MaterialColors.primary[600],
    fontWeight: '500',
  },
  typeIcon: {
    marginLeft: 12,
    marginTop: 2,
  },
  alertActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  primaryAction: {
    backgroundColor: MaterialColors.primary[500],
  },
  secondaryAction: {
    backgroundColor: MaterialColors.surface,
    borderWidth: 1,
    borderColor: MaterialColors.primary[500],
  },
  tertiaryAction: {
    backgroundColor: MaterialColors.neutral[100],
    borderWidth: 1,
    borderColor: MaterialColors.neutral[300],
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: MaterialColors.onPrimary,
  },
  secondaryActionText: {
    color: MaterialColors.primary[500],
  },
  tertiaryActionText: {
    color: MaterialColors.neutral[700],
  },
  acknowledgedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MaterialColors.secondary[50],
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 12,
    gap: 6,
  },
  acknowledgedText: {
    fontSize: 12,
    color: MaterialColors.secondary[700],
    fontWeight: '500',
  },
});

export default ModelPerformanceAlertDashboard;