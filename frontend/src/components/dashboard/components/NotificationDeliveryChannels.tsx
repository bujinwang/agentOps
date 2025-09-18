import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { MaterialColors } from '../../../styles/MaterialDesign';

interface NotificationChannel {
  id: string;
  type: 'push' | 'email' | 'sms';
  name: string;
  enabled: boolean;
  config: {
    email?: string;
    phone?: string;
    deviceToken?: string;
  };
  status: 'connected' | 'disconnected' | 'error';
  lastTest?: Date;
}

interface NotificationDeliveryChannelsProps {
  onChannelUpdate: (channelId: string, updates: Partial<NotificationChannel>) => void;
  onTestChannel: (channelId: string) => Promise<boolean>;
  onSendTestNotification: (channelId: string, message: string) => Promise<boolean>;
}

const NotificationDeliveryChannels: React.FC<NotificationDeliveryChannelsProps> = ({
  onChannelUpdate,
  onTestChannel,
  onSendTestNotification,
}) => {
  const [channels, setChannels] = useState<NotificationChannel[]>([
    {
      id: 'push-1',
      type: 'push',
      name: 'Mobile Push Notifications',
      enabled: true,
      config: {},
      status: 'connected',
    },
    {
      id: 'email-1',
      type: 'email',
      name: 'Email Notifications',
      enabled: false,
      config: { email: '' },
      status: 'disconnected',
    },
    {
      id: 'sms-1',
      type: 'sms',
      name: 'SMS Notifications',
      enabled: false,
      config: { phone: '' },
      status: 'disconnected',
    },
  ]);

  const [testMessage, setTestMessage] = useState('Test notification from Predictive Lead Insights Dashboard');
  const [testingChannel, setTestingChannel] = useState<string | null>(null);

  const updateChannel = (channelId: string, updates: Partial<NotificationChannel>) => {
    setChannels(prev =>
      prev.map(channel =>
        channel.id === channelId ? { ...channel, ...updates } : channel
      )
    );
    onChannelUpdate(channelId, updates);
  };

  const toggleChannel = (channelId: string) => {
    const channel = channels.find(c => c.id === channelId);
    if (!channel) return;

    const newEnabled = !channel.enabled;
    updateChannel(channelId, { enabled: newEnabled });
  };

  const updateChannelConfig = (channelId: string, configKey: string, value: string) => {
    const channel = channels.find(c => c.id === channelId);
    if (!channel) return;

    updateChannel(channelId, {
      config: { ...channel.config, [configKey]: value }
    });
  };

  const testChannelConnection = async (channelId: string) => {
    setTestingChannel(channelId);
    try {
      const success = await onTestChannel(channelId);
      const status: 'connected' | 'disconnected' | 'error' = success ? 'connected' : 'error';

      updateChannel(channelId, {
        status,
        lastTest: new Date()
      });

      Alert.alert(
        'Test Result',
        success ? 'Channel connection successful!' : 'Channel connection failed. Please check your settings.'
      );
    } catch (error) {
      updateChannel(channelId, {
        status: 'error',
        lastTest: new Date()
      });
      Alert.alert('Test Failed', 'Unable to test channel connection. Please try again.');
    } finally {
      setTestingChannel(null);
    }
  };

  const sendTestNotification = async (channelId: string) => {
    if (!testMessage.trim()) {
      Alert.alert('Error', 'Please enter a test message');
      return;
    }

    setTestingChannel(channelId);
    try {
      const success = await onSendTestNotification(channelId, testMessage);
      Alert.alert(
        'Test Notification',
        success ? 'Test notification sent successfully!' : 'Failed to send test notification.'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to send test notification. Please try again.');
    } finally {
      setTestingChannel(null);
    }
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'push':
        return 'notifications';
      case 'email':
        return 'email';
      case 'sms':
        return 'sms';
      default:
        return 'notifications';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return MaterialColors.secondary[500];
      case 'error':
        return MaterialColors.error[500];
      case 'disconnected':
      default:
        return MaterialColors.neutral[400];
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'error':
        return 'Error';
      case 'disconnected':
      default:
        return 'Not Configured';
    }
  };

  const renderChannelConfig = (channel: NotificationChannel) => {
    switch (channel.type) {
      case 'email':
        return (
          <View style={styles.configSection}>
            <Text style={styles.configLabel}>Email Address</Text>
            <TextInput
              style={styles.configInput}
              value={channel.config.email || ''}
              onChangeText={(value) => updateChannelConfig(channel.id, 'email', value)}
              placeholder="your.email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        );
      case 'sms':
        return (
          <View style={styles.configSection}>
            <Text style={styles.configLabel}>Phone Number</Text>
            <TextInput
              style={styles.configInput}
              value={channel.config.phone || ''}
              onChangeText={(value) => updateChannelConfig(channel.id, 'phone', value)}
              placeholder="+1 (555) 123-4567"
              keyboardType="phone-pad"
            />
          </View>
        );
      case 'push':
        return (
          <View style={styles.configSection}>
            <Text style={styles.configText}>
              Push notifications are automatically configured for this device.
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notification Channels</Text>
        <Text style={styles.subtitle}>Configure how you receive alerts</Text>
      </View>

      <ScrollView style={styles.channelsContainer}>
        {channels.map(channel => (
          <View key={channel.id} style={styles.channelCard}>
            <View style={styles.channelHeader}>
              <View style={styles.channelInfo}>
                <View style={styles.channelIcon}>
                  <MaterialIcons
                    name={getChannelIcon(channel.type) as any}
                    size={24}
                    color={channel.enabled ? MaterialColors.primary[500] : MaterialColors.neutral[400]}
                  />
                </View>
                <View style={styles.channelDetails}>
                  <Text style={styles.channelName}>{channel.name}</Text>
                  <View style={styles.statusContainer}>
                    <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(channel.status) }]} />
                    <Text style={styles.statusText}>{getStatusText(channel.status)}</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  channel.enabled && styles.toggleButtonActive,
                ]}
                onPress={() => toggleChannel(channel.id)}
              >
                <MaterialIcons
                  name={channel.enabled ? 'toggle-on' : 'toggle-off'}
                  size={32}
                  color={channel.enabled ? MaterialColors.primary[500] : MaterialColors.neutral[400]}
                />
              </TouchableOpacity>
            </View>

            {channel.enabled && (
              <View style={styles.channelConfig}>
                {renderChannelConfig(channel)}

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.testButton]}
                    onPress={() => testChannelConnection(channel.id)}
                    disabled={testingChannel === channel.id}
                  >
                    <MaterialIcons name="sync" size={16} color={MaterialColors.primary[500]} />
                    <Text style={styles.testButtonText}>
                      {testingChannel === channel.id ? 'Testing...' : 'Test Connection'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.sendTestButton]}
                    onPress={() => sendTestNotification(channel.id)}
                    disabled={testingChannel === channel.id || channel.status !== 'connected'}
                  >
                    <MaterialIcons name="send" size={16} color={MaterialColors.onPrimary} />
                    <Text style={styles.sendTestButtonText}>Send Test</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.testSection}>
        <Text style={styles.testSectionTitle}>Test Message</Text>
        <TextInput
          style={styles.testMessageInput}
          value={testMessage}
          onChangeText={setTestMessage}
          placeholder="Enter test message..."
          multiline
          numberOfLines={3}
        />
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
  channelsContainer: {
    flex: 1,
    padding: 16,
  },
  channelCard: {
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
  channelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  channelIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: MaterialColors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  channelDetails: {
    flex: 1,
  },
  channelName: {
    fontSize: 16,
    fontWeight: '600',
    color: MaterialColors.onSurface,
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: MaterialColors.neutral[600],
  },
  toggleButton: {
    padding: 8,
  },
  toggleButtonActive: {
    // Active state styling if needed
  },
  channelConfig: {
    borderTopWidth: 1,
    borderTopColor: MaterialColors.neutral[100],
    paddingTop: 16,
  },
  configSection: {
    marginBottom: 16,
  },
  configLabel: {
    fontSize: 14,
    color: MaterialColors.neutral[700],
    marginBottom: 8,
  },
  configInput: {
    borderWidth: 1,
    borderColor: MaterialColors.neutral[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: MaterialColors.onSurface,
    backgroundColor: MaterialColors.surface,
  },
  configText: {
    fontSize: 14,
    color: MaterialColors.neutral[600],
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
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
  testButton: {
    backgroundColor: MaterialColors.neutral[100],
    borderWidth: 1,
    borderColor: MaterialColors.primary[500],
  },
  testButtonText: {
    fontSize: 12,
    color: MaterialColors.primary[500],
    fontWeight: '500',
  },
  sendTestButton: {
    backgroundColor: MaterialColors.primary[500],
  },
  sendTestButtonText: {
    fontSize: 12,
    color: MaterialColors.onPrimary,
    fontWeight: '500',
  },
  testSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: MaterialColors.neutral[200],
  },
  testSectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: MaterialColors.onSurface,
    marginBottom: 8,
  },
  testMessageInput: {
    borderWidth: 1,
    borderColor: MaterialColors.neutral[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: MaterialColors.onSurface,
    backgroundColor: MaterialColors.surface,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});

export default NotificationDeliveryChannels;