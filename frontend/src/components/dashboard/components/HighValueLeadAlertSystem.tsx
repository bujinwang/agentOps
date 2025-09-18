import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { MaterialColors } from '../../../styles/MaterialDesign';
import { Lead, AlertThreshold, AlertType } from '../../../types/dashboard';

interface HighValueLeadAlertSystemProps {
  leads: Lead[];
  onLeadAction: (leadId: string, action: string) => void;
  onDismissAlert: (alertId: string) => void;
}

interface LeadAlert {
  id: string;
  leadId: string;
  type: AlertType;
  message: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: Date;
  lead: Lead;
}

const ALERT_THRESHOLDS: AlertThreshold = {
  highValueScore: 85,
  urgentFollowUp: 7, // days since last contact
  conversionProbability: 70,
  dealValue: 500000,
};

const HighValueLeadAlertSystem: React.FC<HighValueLeadAlertSystemProps> = ({
  leads,
  onLeadAction,
  onDismissAlert,
}) => {
  const [alerts, setAlerts] = useState<LeadAlert[]>([]);
  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  // Generate alerts based on lead data
  const generateAlerts = useCallback(() => {
    const newAlerts: LeadAlert[] = [];

    leads.forEach(lead => {
      // High-value lead alert
      if (lead.score >= ALERT_THRESHOLDS.highValueScore) {
        newAlerts.push({
          id: `high-value-${lead.id}`,
          leadId: lead.id,
          type: 'high_value',
          message: `${lead.name} has a high score of ${lead.score}/100`,
          priority: 'high',
          timestamp: new Date(),
          lead,
        });
      }

      // Urgent follow-up alert
      const daysSinceLastContact = Math.floor(
        (Date.now() - new Date(lead.lastContact).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLastContact >= ALERT_THRESHOLDS.urgentFollowUp) {
        newAlerts.push({
          id: `urgent-followup-${lead.id}`,
          leadId: lead.id,
          type: 'urgent_followup',
          message: `${lead.name} hasn't been contacted in ${daysSinceLastContact} days`,
          priority: 'high',
          timestamp: new Date(),
          lead,
        });
      }

      // High conversion probability alert
      if (lead.conversionProbability >= ALERT_THRESHOLDS.conversionProbability) {
        newAlerts.push({
          id: `high-probability-${lead.id}`,
          leadId: lead.id,
          type: 'conversion_opportunity',
          message: `${lead.name} has ${lead.conversionProbability}% conversion probability`,
          priority: 'medium',
          timestamp: new Date(),
          lead,
        });
      }

      // High deal value alert
      if (lead.estimatedValue >= ALERT_THRESHOLDS.dealValue) {
        newAlerts.push({
          id: `high-value-deal-${lead.id}`,
          leadId: lead.id,
          type: 'high_value_deal',
          message: `${lead.name} has estimated deal value of $${lead.estimatedValue.toLocaleString()}`,
          priority: 'medium',
          timestamp: new Date(),
          lead,
        });
      }
    });

    setAlerts(newAlerts);
  }, [leads]);

  useEffect(() => {
    generateAlerts();
  }, [generateAlerts]);

  const filteredAlerts = alerts.filter(alert =>
    filterPriority === 'all' || alert.priority === filterPriority
  );

  const getAlertIcon = (type: AlertType) => {
    switch (type) {
      case 'high_value':
        return 'star';
      case 'urgent_followup':
        return 'schedule';
      case 'conversion_opportunity':
        return 'trending-up';
      case 'high_value_deal':
        return 'attach-money';
      default:
        return 'notifications';
    }
  };

  const getAlertColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return MaterialColors.error[500];
      case 'medium':
        return MaterialColors.warning[500];
      case 'low':
        return MaterialColors.primary[300];
      default:
        return MaterialColors.primary[500];
    }
  };

  const handleAlertAction = (alert: LeadAlert, action: string) => {
    onLeadAction(alert.leadId, action);
    onDismissAlert(alert.id);
  };

  const handleDismiss = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    onDismissAlert(alertId);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Lead Alerts</Text>
        <View style={styles.filterContainer}>
          {(['all', 'high', 'medium', 'low'] as const).map(priority => (
            <TouchableOpacity
              key={priority}
              style={[
                styles.filterButton,
                filterPriority === priority && styles.filterButtonActive,
              ]}
              onPress={() => setFilterPriority(priority)}
            >
              <Text
                style={[
                  styles.filterText,
                  filterPriority === priority && styles.filterTextActive,
                ]}
              >
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView style={styles.alertsContainer}>
        {filteredAlerts.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="notifications-off" size={48} color={MaterialColors.neutral[500]} />
            <Text style={styles.emptyText}>No alerts at this time</Text>
          </View>
        ) : (
          filteredAlerts.map(alert => (
            <View key={alert.id} style={[styles.alertCard, { borderLeftColor: getAlertColor(alert.priority) }]}>
              <View style={styles.alertHeader}>
                <View style={styles.alertIcon}>
                  <MaterialIcons
                    name={getAlertIcon(alert.type)}
                    size={24}
                    color={getAlertColor(alert.priority)}
                  />
                </View>
                <View style={styles.alertContent}>
                  <Text style={styles.alertMessage}>{alert.message}</Text>
                  <Text style={styles.alertTimestamp}>
                    {alert.timestamp.toLocaleTimeString()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.dismissButton}
                  onPress={() => handleDismiss(alert.id)}
                >
                  <MaterialIcons name="close" size={20} color={MaterialColors.neutral[500]} />
                </TouchableOpacity>
              </View>

              <View style={styles.alertActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.primaryAction]}
                  onPress={() => handleAlertAction(alert, 'contact')}
                >
                  <MaterialIcons name="call" size={16} color={MaterialColors.onPrimary} />
                  <Text style={styles.actionButtonText}>Contact Now</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.secondaryAction]}
                  onPress={() => handleAlertAction(alert, 'view')}
                >
                  <MaterialIcons name="visibility" size={16} color={MaterialColors.primary[500]} />
                  <Text style={[styles.actionButtonText, styles.secondaryActionText]}>View Details</Text>
                </TouchableOpacity>
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
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
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
    fontSize: 16,
    color: MaterialColors.neutral[600],
    marginTop: 16,
  },
  alertCard: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  alertIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  alertContent: {
    flex: 1,
  },
  alertMessage: {
    fontSize: 14,
    color: MaterialColors.onSurface,
    lineHeight: 20,
  },
  alertTimestamp: {
    fontSize: 12,
    color: MaterialColors.neutral[600],
    marginTop: 4,
  },
  dismissButton: {
    padding: 4,
  },
  alertActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
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
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: MaterialColors.onPrimary,
  },
  secondaryActionText: {
    color: MaterialColors.primary[500],
  },
});

export default HighValueLeadAlertSystem;