import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { MaterialColors } from '../../../styles/MaterialDesign';
import { Lead } from '../../../types/dashboard';

interface ConversionOpportunityAlertsProps {
  leads: Lead[];
  onLeadAction: (leadId: string, action: string) => void;
  onMarkAsConverted: (leadId: string) => void;
}

interface ConversionAlert {
  id: string;
  leadId: string;
  lead: Lead;
  conversionProbability: number;
  dealValue: number;
  urgencyScore: number; // Calculated based on probability and value
  timeToConvert: number; // Days until predicted conversion
  recommendedActions: string[];
  riskLevel: 'high' | 'medium' | 'low';
}

const CONVERSION_THRESHOLDS = {
  highProbability: 75,
  mediumProbability: 60,
  highValue: 300000,
  mediumValue: 150000,
};

const { width: screenWidth } = Dimensions.get('window');

const ConversionOpportunityAlerts: React.FC<ConversionOpportunityAlertsProps> = ({
  leads,
  onLeadAction,
  onMarkAsConverted,
}) => {
  const [alerts, setAlerts] = useState<ConversionAlert[]>([]);
  const [sortBy, setSortBy] = useState<'probability' | 'value' | 'urgency'>('urgency');

  // Generate conversion opportunity alerts
  const generateAlerts = useCallback(() => {
    const newAlerts: ConversionAlert[] = [];

    leads.forEach(lead => {
      if (lead.conversionProbability >= CONVERSION_THRESHOLDS.mediumProbability ||
          lead.estimatedValue >= CONVERSION_THRESHOLDS.mediumValue) {

        // Calculate urgency score (0-100)
        const probabilityScore = (lead.conversionProbability / 100) * 60;
        const valueScore = Math.min((lead.estimatedValue / CONVERSION_THRESHOLDS.highValue) * 40, 40);
        const urgencyScore = probabilityScore + valueScore;

        // Determine risk level
        let riskLevel: 'high' | 'medium' | 'low' = 'low';
        if (urgencyScore >= 70) riskLevel = 'high';
        else if (urgencyScore >= 50) riskLevel = 'medium';

        // Calculate time to convert (simplified estimation)
        const timeToConvert = Math.max(1, Math.floor((100 - lead.conversionProbability) / 10));

        // Generate recommended actions
        const recommendedActions = [];
        if (lead.conversionProbability >= CONVERSION_THRESHOLDS.highProbability) {
          recommendedActions.push('Schedule immediate presentation');
          recommendedActions.push('Prepare proposal package');
        } else {
          recommendedActions.push('Send personalized follow-up');
          recommendedActions.push('Offer virtual tour/meeting');
        }

        if (lead.estimatedValue >= CONVERSION_THRESHOLDS.highValue) {
          recommendedActions.push('Escalate to senior agent');
        }

        newAlerts.push({
          id: `conversion-${lead.id}`,
          leadId: lead.id,
          lead,
          conversionProbability: lead.conversionProbability,
          dealValue: lead.estimatedValue,
          urgencyScore,
          timeToConvert,
          recommendedActions,
          riskLevel,
        });
      }
    });

    // Sort alerts based on selected criteria
    newAlerts.sort((a, b) => {
      switch (sortBy) {
        case 'probability':
          return b.conversionProbability - a.conversionProbability;
        case 'value':
          return b.dealValue - a.dealValue;
        case 'urgency':
        default:
          return b.urgencyScore - a.urgencyScore;
      }
    });

    setAlerts(newAlerts);
  }, [leads, sortBy]);

  useEffect(() => {
    generateAlerts();
  }, [generateAlerts]);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high':
        return MaterialColors.error[500];
      case 'medium':
        return MaterialColors.warning[500];
      case 'low':
        return MaterialColors.secondary[500];
      default:
        return MaterialColors.primary[500];
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'high':
        return 'local-fire-department';
      case 'medium':
        return 'warning';
      case 'low':
        return 'lightbulb';
      default:
        return 'trending-up';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleAction = (alert: ConversionAlert, action: string) => {
    onLeadAction(alert.leadId, action);
  };

  const handleMarkConverted = (alert: ConversionAlert) => {
    onMarkAsConverted(alert.leadId);
    setAlerts(prev => prev.filter(a => a.id !== alert.id));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Conversion Opportunities</Text>
        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>Sort by:</Text>
          {(['urgency', 'probability', 'value'] as const).map(sortOption => (
            <TouchableOpacity
              key={sortOption}
              style={[
                styles.sortButton,
                sortBy === sortOption && styles.sortButtonActive,
              ]}
              onPress={() => setSortBy(sortOption)}
            >
              <Text
                style={[
                  styles.sortText,
                  sortBy === sortOption && styles.sortTextActive,
                ]}
              >
                {sortOption.charAt(0).toUpperCase() + sortOption.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView style={styles.alertsContainer}>
        {alerts.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="trending-up" size={48} color={MaterialColors.neutral[400]} />
            <Text style={styles.emptyText}>No conversion opportunities at this time</Text>
            <Text style={styles.emptySubtext}>Keep monitoring your leads for new opportunities.</Text>
          </View>
        ) : (
          alerts.map(alert => (
            <View key={alert.id} style={styles.alertCard}>
              <View style={styles.alertHeader}>
                <View style={styles.riskIndicator}>
                  <MaterialIcons
                    name={getRiskIcon(alert.riskLevel)}
                    size={24}
                    color={MaterialColors.onPrimary}
                  />
                </View>
                <View style={styles.alertContent}>
                  <View style={styles.alertTitleRow}>
                    <Text style={styles.leadName}>{alert.lead.name}</Text>
                    <View style={[styles.riskBadge, { backgroundColor: getRiskColor(alert.riskLevel) }]}>
                      <Text style={styles.riskText}>{alert.riskLevel.toUpperCase()}</Text>
                    </View>
                  </View>

                  <View style={styles.metricsRow}>
                    <View style={styles.metric}>
                      <Text style={styles.metricLabel}>Conversion</Text>
                      <Text style={styles.metricValue}>{alert.conversionProbability}%</Text>
                    </View>
                    <View style={styles.metric}>
                      <Text style={styles.metricLabel}>Value</Text>
                      <Text style={styles.metricValue}>{formatCurrency(alert.dealValue)}</Text>
                    </View>
                    <View style={styles.metric}>
                      <Text style={styles.metricLabel}>Time</Text>
                      <Text style={styles.metricValue}>{alert.timeToConvert}d</Text>
                    </View>
                  </View>

                  <View style={styles.actionsList}>
                    <Text style={styles.actionsTitle}>Recommended Actions:</Text>
                    {alert.recommendedActions.slice(0, 2).map((action, index) => (
                      <Text key={index} style={styles.actionItem}>• {action}</Text>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.alertActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.primaryAction]}
                  onPress={() => handleAction(alert, 'contact')}
                >
                  <MaterialIcons name="call" size={16} color={MaterialColors.onPrimary} />
                  <Text style={styles.actionButtonText}>Contact Now</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.secondaryAction]}
                  onPress={() => handleAction(alert, 'schedule')}
                >
                  <MaterialIcons name="schedule" size={16} color={MaterialColors.primary[500]} />
                  <Text style={[styles.actionButtonText, styles.secondaryActionText]}>Schedule</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.successAction]}
                  onPress={() => handleMarkConverted(alert)}
                >
                  <MaterialIcons name="check-circle" size={16} color={MaterialColors.onPrimary} />
                  <Text style={styles.actionButtonText}>Mark Won</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.urgencyIndicator}>
                <View style={[styles.urgencyBar, { width: `${alert.urgencyScore}%` }]} />
                <Text style={styles.urgencyText}>Urgency: {Math.round(alert.urgencyScore)}/100</Text>
              </View>
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
    marginBottom: 12,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortLabel: {
    fontSize: 14,
    color: MaterialColors.neutral[600],
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MaterialColors.neutral[200],
  },
  sortButtonActive: {
    backgroundColor: MaterialColors.primary[500],
    borderColor: MaterialColors.primary[500],
  },
  sortText: {
    fontSize: 12,
    color: MaterialColors.neutral[600],
  },
  sortTextActive: {
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
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  riskIndicator: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: MaterialColors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  leadName: {
    fontSize: 18,
    fontWeight: '600',
    color: MaterialColors.onSurface,
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  riskText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: MaterialColors.onPrimary,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metric: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: MaterialColors.neutral[600],
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: MaterialColors.onSurface,
  },
  actionsList: {
    marginBottom: 12,
  },
  actionsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: MaterialColors.onSurface,
    marginBottom: 4,
  },
  actionItem: {
    fontSize: 12,
    color: MaterialColors.neutral[700],
    marginBottom: 2,
  },
  alertActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
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
  successAction: {
    backgroundColor: MaterialColors.secondary[500],
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: MaterialColors.onPrimary,
  },
  secondaryActionText: {
    color: MaterialColors.primary[500],
  },
  urgencyIndicator: {
    marginTop: 8,
  },
  urgencyBar: {
    height: 4,
    backgroundColor: MaterialColors.primary[500],
    borderRadius: 2,
    marginBottom: 4,
  },
  urgencyText: {
    fontSize: 12,
    color: MaterialColors.neutral[600],
    textAlign: 'center',
  },
});

export default ConversionOpportunityAlerts;