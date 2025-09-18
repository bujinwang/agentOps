import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { MaterialColors } from '../../../styles/MaterialDesign';
import { Lead } from '../../../types/dashboard';

interface UrgentFollowUpNotificationsProps {
  leads: Lead[];
  onLeadAction: (leadId: string, action: string) => void;
  onSnoozeNotification: (leadId: string, snoozeUntil: Date) => void;
}

interface FollowUpNotification {
  id: string;
  leadId: string;
  lead: Lead;
  daysSinceLastContact: number;
  urgencyLevel: 'critical' | 'high' | 'medium' | 'low';
  recommendedAction: string;
  snoozedUntil?: Date;
  lastNotified: Date;
}

const URGENCY_THRESHOLDS = {
  critical: 14, // 2+ weeks - immediate action required
  high: 10,     // 10+ days - urgent follow-up needed
  medium: 7,    // 1+ week - follow-up recommended
  low: 3,       // 3+ days - gentle reminder
};

const UrgentFollowUpNotifications: React.FC<UrgentFollowUpNotificationsProps> = ({
  leads,
  onLeadAction,
  onSnoozeNotification,
}) => {
  const [notifications, setNotifications] = useState<FollowUpNotification[]>([]);
  const [filterUrgency, setFilterUrgency] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');

  // Generate follow-up notifications based on lead data
  const generateNotifications = useCallback(() => {
    const newNotifications: FollowUpNotification[] = [];

    leads.forEach(lead => {
      const daysSinceLastContact = Math.floor(
        (Date.now() - new Date(lead.lastContact).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastContact >= URGENCY_THRESHOLDS.low) {
        let urgencyLevel: 'critical' | 'high' | 'medium' | 'low' = 'low';
        let recommendedAction = 'Send follow-up email';

        if (daysSinceLastContact >= URGENCY_THRESHOLDS.critical) {
          urgencyLevel = 'critical';
          recommendedAction = 'Immediate phone call required';
        } else if (daysSinceLastContact >= URGENCY_THRESHOLDS.high) {
          urgencyLevel = 'high';
          recommendedAction = 'Schedule urgent follow-up call';
        } else if (daysSinceLastContact >= URGENCY_THRESHOLDS.medium) {
          urgencyLevel = 'medium';
          recommendedAction = 'Send personalized follow-up message';
        }

        newNotifications.push({
          id: `followup-${lead.id}`,
          leadId: lead.id,
          lead,
          daysSinceLastContact,
          urgencyLevel,
          recommendedAction,
          lastNotified: new Date(),
        });
      }
    });

    // Sort by urgency (critical first) and then by days since contact
    newNotifications.sort((a, b) => {
      const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const urgencyDiff = urgencyOrder[b.urgencyLevel] - urgencyOrder[a.urgencyLevel];
      if (urgencyDiff !== 0) return urgencyDiff;
      return b.daysSinceLastContact - a.daysSinceLastContact;
    });

    setNotifications(newNotifications);
  }, [leads]);

  useEffect(() => {
    generateNotifications();
  }, [generateNotifications]);

  const filteredNotifications = notifications.filter(notification =>
    filterUrgency === 'all' || notification.urgencyLevel === filterUrgency
  );

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
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

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'warning';
      case 'high':
        return 'schedule';
      case 'medium':
        return 'access-time';
      case 'low':
        return 'notifications';
      default:
        return 'info';
    }
  };

  const getUrgencyLabel = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'CRITICAL';
      case 'high':
        return 'HIGH';
      case 'medium':
        return 'MEDIUM';
      case 'low':
        return 'LOW';
      default:
        return 'INFO';
    }
  };

  const handleAction = (notification: FollowUpNotification, action: string) => {
    onLeadAction(notification.leadId, action);
  };

  const handleSnooze = (notification: FollowUpNotification) => {
    const snoozeOptions = [
      { label: '1 hour', value: 1 * 60 * 60 * 1000 },
      { label: '4 hours', value: 4 * 60 * 60 * 1000 },
      { label: 'Tomorrow', value: 24 * 60 * 60 * 1000 },
      { label: 'Next week', value: 7 * 24 * 60 * 60 * 1000 },
    ];

    Alert.alert(
      'Snooze Notification',
      `Snooze follow-up for ${notification.lead.name}?`,
      [
        ...snoozeOptions.map(option => ({
          text: option.label,
          onPress: () => {
            const snoozeUntil = new Date(Date.now() + option.value);
            onSnoozeNotification(notification.leadId, snoozeUntil);
            setNotifications(prev =>
              prev.filter(n => n.id !== notification.id)
            );
          },
        })),
        {
          text: 'Cancel',
          style: 'cancel' as const,
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Follow-Up Notifications</Text>
        <View style={styles.filterContainer}>
          {(['all', 'critical', 'high', 'medium', 'low'] as const).map(urgency => (
            <TouchableOpacity
              key={urgency}
              style={[
                styles.filterButton,
                filterUrgency === urgency && styles.filterButtonActive,
              ]}
              onPress={() => setFilterUrgency(urgency)}
            >
              <Text
                style={[
                  styles.filterText,
                  filterUrgency === urgency && styles.filterTextActive,
                ]}
              >
                {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView style={styles.notificationsContainer}>
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="check-circle" size={48} color={MaterialColors.secondary[500]} />
            <Text style={styles.emptyText}>All leads are up to date!</Text>
            <Text style={styles.emptySubtext}>No urgent follow-ups needed at this time.</Text>
          </View>
        ) : (
          filteredNotifications.map(notification => (
            <View key={notification.id} style={styles.notificationCard}>
              <View style={styles.notificationHeader}>
                <View style={styles.urgencyIndicator}>
                  <MaterialIcons
                    name={getUrgencyIcon(notification.urgencyLevel)}
                    size={20}
                    color={MaterialColors.onPrimary}
                  />
                </View>
                <View style={styles.notificationContent}>
                  <View style={styles.notificationTitleRow}>
                    <Text style={styles.leadName}>{notification.lead.name}</Text>
                    <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(notification.urgencyLevel) }]}>
                      <Text style={styles.urgencyText}>{getUrgencyLabel(notification.urgencyLevel)}</Text>
                    </View>
                  </View>
                  <Text style={styles.lastContact}>
                    Last contacted {notification.daysSinceLastContact} days ago
                  </Text>
                  <Text style={styles.recommendedAction}>
                    {notification.recommendedAction}
                  </Text>
                </View>
              </View>

              <View style={styles.notificationActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.primaryAction]}
                  onPress={() => handleAction(notification, 'call')}
                >
                  <MaterialIcons name="call" size={16} color={MaterialColors.onPrimary} />
                  <Text style={styles.actionButtonText}>Call Now</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.secondaryAction]}
                  onPress={() => handleAction(notification, 'email')}
                >
                  <MaterialIcons name="email" size={16} color={MaterialColors.primary[500]} />
                  <Text style={[styles.actionButtonText, styles.secondaryActionText]}>Send Email</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.tertiaryAction]}
                  onPress={() => handleSnooze(notification)}
                >
                  <MaterialIcons name="snooze" size={16} color={MaterialColors.neutral[600]} />
                  <Text style={[styles.actionButtonText, styles.tertiaryActionText]}>Snooze</Text>
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
  notificationsContainer: {
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
  notificationCard: {
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
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  urgencyIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: MaterialColors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  leadName: {
    fontSize: 16,
    fontWeight: '600',
    color: MaterialColors.onSurface,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: MaterialColors.onPrimary,
  },
  lastContact: {
    fontSize: 14,
    color: MaterialColors.neutral[700],
    marginBottom: 4,
  },
  recommendedAction: {
    fontSize: 14,
    color: MaterialColors.primary[600],
    fontStyle: 'italic',
  },
  notificationActions: {
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
});

export default UrgentFollowUpNotifications;