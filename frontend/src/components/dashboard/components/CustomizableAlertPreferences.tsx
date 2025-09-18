import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, TextInput, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { MaterialColors } from '../../../styles/MaterialDesign';

interface AlertPreferences {
  // Lead alerts
  highValueLeads: {
    enabled: boolean;
    threshold: number;
    channels: NotificationChannel[];
  };
  urgentFollowUps: {
    enabled: boolean;
    daysThreshold: number;
    channels: NotificationChannel[];
  };
  conversionOpportunities: {
    enabled: boolean;
    probabilityThreshold: number;
    valueThreshold: number;
    channels: NotificationChannel[];
  };

  // Model alerts
  modelPerformance: {
    enabled: boolean;
    accuracyThreshold: number;
    driftThreshold: number;
    channels: NotificationChannel[];
  };
  modelHealth: {
    enabled: boolean;
    retrainReminderDays: number;
    channels: NotificationChannel[];
  };

  // General settings
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  maxAlertsPerDay: number;
}

type NotificationChannel = 'push' | 'email' | 'sms' | 'in_app';

interface CustomizableAlertPreferencesProps {
  currentPreferences: AlertPreferences;
  onPreferencesChange: (preferences: AlertPreferences) => void;
  onSave: () => void;
  onReset: () => void;
}

const CustomizableAlertPreferences: React.FC<CustomizableAlertPreferencesProps> = ({
  currentPreferences,
  onPreferencesChange,
  onSave,
  onReset,
}) => {
  const [preferences, setPreferences] = useState<AlertPreferences>(currentPreferences);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setPreferences(currentPreferences);
  }, [currentPreferences]);

  const updatePreferences = (updates: Partial<AlertPreferences>) => {
    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);
    onPreferencesChange(newPreferences);
    setHasChanges(true);
  };

  const updateNestedPreference = (
    category: keyof AlertPreferences,
    subcategory: string,
    updates: any
  ) => {
    const newPreferences = {
      ...preferences,
      [category]: {
        ...(preferences[category] as any),
        [subcategory]: updates,
      },
    };
    setPreferences(newPreferences);
    onPreferencesChange(newPreferences);
    setHasChanges(true);
  };

  const toggleChannel = (
    category: keyof AlertPreferences,
    subcategory: string,
    channel: NotificationChannel
  ) => {
    const categoryData = preferences[category] as any;
    const currentChannels = categoryData[subcategory].channels;
    const newChannels = currentChannels.includes(channel)
      ? currentChannels.filter((c: NotificationChannel) => c !== channel)
      : [...currentChannels, channel];

    updateNestedPreference(category, subcategory, { channels: newChannels });
  };

  const handleSave = () => {
    onSave();
    setHasChanges(false);
    Alert.alert('Success', 'Alert preferences saved successfully!');
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Preferences',
      'Are you sure you want to reset all preferences to default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            onReset();
            setHasChanges(false);
          },
        },
      ]
    );
  };

  const renderChannelToggles = (
    category: keyof AlertPreferences,
    subcategory: string,
    channels: NotificationChannel[]
  ) => {
    const channelOptions: { key: NotificationChannel; label: string; icon: string }[] = [
      { key: 'push', label: 'Push', icon: 'notifications' },
      { key: 'email', label: 'Email', icon: 'email' },
      { key: 'sms', label: 'SMS', icon: 'sms' },
      { key: 'in_app', label: 'In-App', icon: 'chat' },
    ];

    return (
      <View style={styles.channelsContainer}>
        {channelOptions.map(option => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.channelToggle,
              channels.includes(option.key) && styles.channelToggleActive,
            ]}
            onPress={() => toggleChannel(category, subcategory, option.key)}
          >
            <MaterialIcons
              name={option.icon as any}
              size={16}
              color={channels.includes(option.key) ? MaterialColors.onPrimary : MaterialColors.neutral[600]}
            />
            <Text
              style={[
                styles.channelText,
                channels.includes(option.key) && styles.channelTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Alert Preferences</Text>
        <Text style={styles.subtitle}>Customize how and when you receive notifications</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Lead Alerts Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lead Alerts</Text>

          {/* High Value Leads */}
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceHeader}>
              <Text style={styles.preferenceTitle}>High Value Leads</Text>
              <Switch
                value={preferences.highValueLeads.enabled}
                onValueChange={(value) =>
                  updateNestedPreference('highValueLeads', 'enabled', value)
                }
                trackColor={{ false: MaterialColors.neutral[300], true: MaterialColors.primary[200] }}
                thumbColor={preferences.highValueLeads.enabled ? MaterialColors.primary[500] : MaterialColors.neutral[500]}
              />
            </View>

            {preferences.highValueLeads.enabled && (
              <View style={styles.preferenceDetails}>
                <View style={styles.thresholdContainer}>
                  <Text style={styles.thresholdLabel}>Score Threshold:</Text>
                  <TextInput
                    style={styles.thresholdInput}
                    value={preferences.highValueLeads.threshold.toString()}
                    onChangeText={(value) =>
                      updateNestedPreference('highValueLeads', 'threshold', parseInt(value) || 0)
                    }
                    keyboardType="numeric"
                    placeholder="85"
                  />
                </View>
                {renderChannelToggles('highValueLeads', 'channels', preferences.highValueLeads.channels)}
              </View>
            )}
          </View>

          {/* Urgent Follow-ups */}
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceHeader}>
              <Text style={styles.preferenceTitle}>Urgent Follow-ups</Text>
              <Switch
                value={preferences.urgentFollowUps.enabled}
                onValueChange={(value) =>
                  updateNestedPreference('urgentFollowUps', 'enabled', value)
                }
                trackColor={{ false: MaterialColors.neutral[300], true: MaterialColors.primary[200] }}
                thumbColor={preferences.urgentFollowUps.enabled ? MaterialColors.primary[500] : MaterialColors.neutral[500]}
              />
            </View>

            {preferences.urgentFollowUps.enabled && (
              <View style={styles.preferenceDetails}>
                <View style={styles.thresholdContainer}>
                  <Text style={styles.thresholdLabel}>Days Threshold:</Text>
                  <TextInput
                    style={styles.thresholdInput}
                    value={preferences.urgentFollowUps.daysThreshold.toString()}
                    onChangeText={(value) =>
                      updateNestedPreference('urgentFollowUps', 'daysThreshold', parseInt(value) || 0)
                    }
                    keyboardType="numeric"
                    placeholder="7"
                  />
                </View>
                {renderChannelToggles('urgentFollowUps', 'channels', preferences.urgentFollowUps.channels)}
              </View>
            )}
          </View>

          {/* Conversion Opportunities */}
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceHeader}>
              <Text style={styles.preferenceTitle}>Conversion Opportunities</Text>
              <Switch
                value={preferences.conversionOpportunities.enabled}
                onValueChange={(value) =>
                  updateNestedPreference('conversionOpportunities', 'enabled', value)
                }
                trackColor={{ false: MaterialColors.neutral[300], true: MaterialColors.primary[200] }}
                thumbColor={preferences.conversionOpportunities.enabled ? MaterialColors.primary[500] : MaterialColors.neutral[500]}
              />
            </View>

            {preferences.conversionOpportunities.enabled && (
              <View style={styles.preferenceDetails}>
                <View style={styles.thresholdRow}>
                  <View style={styles.thresholdContainer}>
                    <Text style={styles.thresholdLabel}>Probability %:</Text>
                    <TextInput
                      style={styles.thresholdInput}
                      value={preferences.conversionOpportunities.probabilityThreshold.toString()}
                      onChangeText={(value) =>
                        updateNestedPreference('conversionOpportunities', 'probabilityThreshold', parseInt(value) || 0)
                      }
                      keyboardType="numeric"
                      placeholder="60"
                    />
                  </View>
                  <View style={styles.thresholdContainer}>
                    <Text style={styles.thresholdLabel}>Value $:</Text>
                    <TextInput
                      style={styles.thresholdInput}
                      value={preferences.conversionOpportunities.valueThreshold.toString()}
                      onChangeText={(value) =>
                        updateNestedPreference('conversionOpportunities', 'valueThreshold', parseInt(value) || 0)
                      }
                      keyboardType="numeric"
                      placeholder="150000"
                    />
                  </View>
                </View>
                {renderChannelToggles('conversionOpportunities', 'channels', preferences.conversionOpportunities.channels)}
              </View>
            )}
          </View>
        </View>

        {/* Model Alerts Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Model Alerts</Text>

          {/* Model Performance */}
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceHeader}>
              <Text style={styles.preferenceTitle}>Model Performance</Text>
              <Switch
                value={preferences.modelPerformance.enabled}
                onValueChange={(value) =>
                  updateNestedPreference('modelPerformance', 'enabled', value)
                }
                trackColor={{ false: MaterialColors.neutral[300], true: MaterialColors.primary[200] }}
                thumbColor={preferences.modelPerformance.enabled ? MaterialColors.primary[500] : MaterialColors.neutral[500]}
              />
            </View>

            {preferences.modelPerformance.enabled && (
              <View style={styles.preferenceDetails}>
                <View style={styles.thresholdRow}>
                  <View style={styles.thresholdContainer}>
                    <Text style={styles.thresholdLabel}>Accuracy:</Text>
                    <TextInput
                      style={styles.thresholdInput}
                      value={preferences.modelPerformance.accuracyThreshold.toString()}
                      onChangeText={(value) =>
                        updateNestedPreference('modelPerformance', 'accuracyThreshold', parseFloat(value) || 0)
                      }
                      keyboardType="numeric"
                      placeholder="0.8"
                    />
                  </View>
                  <View style={styles.thresholdContainer}>
                    <Text style={styles.thresholdLabel}>Drift:</Text>
                    <TextInput
                      style={styles.thresholdInput}
                      value={preferences.modelPerformance.driftThreshold.toString()}
                      onChangeText={(value) =>
                        updateNestedPreference('modelPerformance', 'driftThreshold', parseFloat(value) || 0)
                      }
                      keyboardType="numeric"
                      placeholder="0.2"
                    />
                  </View>
                </View>
                {renderChannelToggles('modelPerformance', 'channels', preferences.modelPerformance.channels)}
              </View>
            )}
          </View>

          {/* Model Health */}
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceHeader}>
              <Text style={styles.preferenceTitle}>Model Health</Text>
              <Switch
                value={preferences.modelHealth.enabled}
                onValueChange={(value) =>
                  updateNestedPreference('modelHealth', 'enabled', value)
                }
                trackColor={{ false: MaterialColors.neutral[300], true: MaterialColors.primary[200] }}
                thumbColor={preferences.modelHealth.enabled ? MaterialColors.primary[500] : MaterialColors.neutral[500]}
              />
            </View>

            {preferences.modelHealth.enabled && (
              <View style={styles.preferenceDetails}>
                <View style={styles.thresholdContainer}>
                  <Text style={styles.thresholdLabel}>Retrain Reminder (days):</Text>
                  <TextInput
                    style={styles.thresholdInput}
                    value={preferences.modelHealth.retrainReminderDays.toString()}
                    onChangeText={(value) =>
                      updateNestedPreference('modelHealth', 'retrainReminderDays', parseInt(value) || 0)
                    }
                    keyboardType="numeric"
                    placeholder="30"
                  />
                </View>
                {renderChannelToggles('modelHealth', 'channels', preferences.modelHealth.channels)}
              </View>
            )}
          </View>
        </View>

        {/* General Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General Settings</Text>

          {/* Quiet Hours */}
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceHeader}>
              <Text style={styles.preferenceTitle}>Quiet Hours</Text>
              <Switch
                value={preferences.quietHours.enabled}
                onValueChange={(value) =>
                  updateNestedPreference('quietHours', 'enabled', value)
                }
                trackColor={{ false: MaterialColors.neutral[300], true: MaterialColors.primary[200] }}
                thumbColor={preferences.quietHours.enabled ? MaterialColors.primary[500] : MaterialColors.neutral[500]}
              />
            </View>

            {preferences.quietHours.enabled && (
              <View style={styles.preferenceDetails}>
                <View style={styles.timeInputs}>
                  <View style={styles.timeInput}>
                    <Text style={styles.timeLabel}>Start:</Text>
                    <TextInput
                      style={styles.timeField}
                      value={preferences.quietHours.startTime}
                      onChangeText={(value) =>
                        updateNestedPreference('quietHours', 'startTime', value)
                      }
                      placeholder="22:00"
                    />
                  </View>
                  <View style={styles.timeInput}>
                    <Text style={styles.timeLabel}>End:</Text>
                    <TextInput
                      style={styles.timeField}
                      value={preferences.quietHours.endTime}
                      onChangeText={(value) =>
                        updateNestedPreference('quietHours', 'endTime', value)
                      }
                      placeholder="08:00"
                    />
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Frequency */}
          <View style={styles.preferenceItem}>
            <Text style={styles.preferenceTitle}>Notification Frequency</Text>
            <View style={styles.frequencyOptions}>
              {(['immediate', 'hourly', 'daily', 'weekly'] as const).map(freq => (
                <TouchableOpacity
                  key={freq}
                  style={[
                    styles.frequencyOption,
                    preferences.frequency === freq && styles.frequencyOptionActive,
                  ]}
                  onPress={() => updatePreferences({ frequency: freq })}
                >
                  <Text
                    style={[
                      styles.frequencyText,
                      preferences.frequency === freq && styles.frequencyTextActive,
                    ]}
                  >
                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Max Alerts */}
          <View style={styles.preferenceItem}>
            <Text style={styles.preferenceTitle}>Max Alerts Per Day</Text>
            <TextInput
              style={styles.maxAlertsInput}
              value={preferences.maxAlertsPerDay.toString()}
              onChangeText={(value) =>
                updatePreferences({ maxAlertsPerDay: parseInt(value) || 10 })
              }
              keyboardType="numeric"
              placeholder="10"
            />
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.resetButton]}
          onPress={handleReset}
        >
          <Text style={styles.resetButtonText}>Reset to Default</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.saveButton,
            !hasChanges && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={!hasChanges}
        >
          <Text style={[styles.saveButtonText, !hasChanges && styles.saveButtonTextDisabled]}>
            Save Preferences
          </Text>
        </TouchableOpacity>
      </View>
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: MaterialColors.neutral[600],
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: MaterialColors.onSurface,
    marginBottom: 16,
  },
  preferenceItem: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: MaterialColors.neutral[200],
  },
  preferenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  preferenceTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: MaterialColors.onSurface,
  },
  preferenceDetails: {
    marginTop: 12,
  },
  thresholdContainer: {
    marginBottom: 12,
  },
  thresholdRow: {
    flexDirection: 'row',
    gap: 12,
  },
  thresholdLabel: {
    fontSize: 14,
    color: MaterialColors.neutral[700],
    marginBottom: 4,
  },
  thresholdInput: {
    borderWidth: 1,
    borderColor: MaterialColors.neutral[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: MaterialColors.onSurface,
    backgroundColor: MaterialColors.surface,
  },
  channelsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  channelToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MaterialColors.neutral[300],
    gap: 6,
  },
  channelToggleActive: {
    backgroundColor: MaterialColors.primary[500],
    borderColor: MaterialColors.primary[500],
  },
  channelText: {
    fontSize: 12,
    color: MaterialColors.neutral[600],
  },
  channelTextActive: {
    color: MaterialColors.onPrimary,
  },
  timeInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  timeInput: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 14,
    color: MaterialColors.neutral[700],
    marginBottom: 4,
  },
  timeField: {
    borderWidth: 1,
    borderColor: MaterialColors.neutral[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: MaterialColors.onSurface,
    backgroundColor: MaterialColors.surface,
  },
  frequencyOptions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  frequencyOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MaterialColors.neutral[300],
  },
  frequencyOptionActive: {
    backgroundColor: MaterialColors.primary[500],
    borderColor: MaterialColors.primary[500],
  },
  frequencyText: {
    fontSize: 12,
    color: MaterialColors.neutral[600],
  },
  frequencyTextActive: {
    color: MaterialColors.onPrimary,
  },
  maxAlertsInput: {
    borderWidth: 1,
    borderColor: MaterialColors.neutral[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: MaterialColors.onSurface,
    backgroundColor: MaterialColors.surface,
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: MaterialColors.neutral[200],
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: MaterialColors.neutral[100],
    borderWidth: 1,
    borderColor: MaterialColors.neutral[300],
  },
  resetButtonText: {
    fontSize: 14,
    color: MaterialColors.neutral[700],
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: MaterialColors.primary[500],
  },
  saveButtonDisabled: {
    backgroundColor: MaterialColors.neutral[300],
  },
  saveButtonText: {
    fontSize: 14,
    color: MaterialColors.onPrimary,
    fontWeight: '500',
  },
  saveButtonTextDisabled: {
    color: MaterialColors.neutral[500],
  },
});

export default CustomizableAlertPreferences;