import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useSettings } from '../../contexts/SettingsContext';
import { useScreenLayout } from '../../hooks/useScreenLayout';

interface SettingsScreenProps {
  navigation: any;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { containerStyle, contentStyle, responsive, theme } = useScreenLayout();
  const { settings, profile, isLoading, updateSettings, resetSettings, exportData, deleteAccount } = useSettings();
  const [isSaving, setIsSaving] = useState(false);

  const dynamicStyles = useMemo(() => ({
    button: { minHeight: responsive.getTouchTargetSize(44) },
    settingRow: { minHeight: responsive.getTouchTargetSize(56) },
  }), [responsive]);

  const handleSettingChange = async (category: string, key: string, value: any) => {
    try {
      setIsSaving(true);
      const newSettings = {
        [category]: {
          [key]: value,
        },
      };
      await updateSettings(newSettings);
    } catch (error) {
      Alert.alert('Error', 'Failed to update setting');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetSettings();
              Alert.alert('Success', 'Settings have been reset to default values');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset settings');
            }
          },
        },
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Data',
      'This will export all your data including leads, tasks, and interactions. You will receive an email with the export file.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: async () => {
            try {
              await exportData();
            } catch (error) {
              Alert.alert('Error', 'Failed to export data');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'Type "DELETE" to confirm account deletion.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'DELETE',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteAccount();
                      // Navigate to auth screen
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'Auth' }],
                      });
                    } catch (error) {
                      Alert.alert('Error', 'Failed to delete account');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const renderSwitch = (
    label: string,
    value: boolean,
    onValueChange: (value: boolean) => void,
    description?: string
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#ccc', true: '#2196F3' }}
        disabled={isSaving}
      />
    </View>
  );

  const renderPicker = (
    label: string,
    value: string,
    onValueChange: (value: string) => void,
    options: Array<{ label: string; value: string }>,
    description?: string
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={value}
          onValueChange={onValueChange}
          style={styles.picker}
          enabled={!isSaving}
        >
          {options.map((option) => (
            <Picker.Item key={option.value} label={option.label} value={option.value} />
          ))}
        </Picker>
      </View>
    </View>
  );

  const renderActionButton = (
    label: string,
    onPress: () => void,
    style: 'primary' | 'secondary' | 'danger' = 'secondary',
    description?: string
  ) => (
    <TouchableOpacity
      style={[styles.actionButton, styles[`${style}Button`]]}
      onPress={onPress}
      disabled={isSaving}
    >
      <View style={styles.actionButtonContent}>
        <Text style={[styles.actionButtonText, styles[`${style}ButtonText`]]}>{label}</Text>
        {description && (
          <Text style={[styles.actionButtonDescription, styles[`${style}ButtonDescription`]]}>
            {description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, containerStyle]}>
      <ScrollView contentContainerStyle={[styles.scrollContainer, contentStyle]}>
        {/* Profile Section */}
        {renderSection('Profile', (
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('ProfileSettings')}
          >
            <View style={styles.profileInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {profile?.firstName?.[0]?.toUpperCase() || '?'}
                </Text>
              </View>
              <View style={styles.profileDetails}>
                <Text style={styles.profileName}>
                  {profile?.firstName} {profile?.lastName}
                </Text>
                <Text style={styles.profileEmail}>{profile?.email}</Text>
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}

        {/* Appearance */}
        {renderSection('Appearance', (
          <>
            {renderPicker(
              'Theme',
              settings.theme,
              (value) => handleSettingChange('theme', 'theme', value),
              [
                { label: 'Light', value: 'light' },
                { label: 'Dark', value: 'dark' },
                { label: 'System', value: 'system' },
              ],
              'Follow system setting or choose manually'
            )}
            {renderSwitch(
              'Compact Mode',
              settings.display.compactMode,
              (value) => handleSettingChange('display', 'compactMode', value),
              'Show more items on screen'
            )}
            {renderSwitch(
              'Show Avatars',
              settings.display.showAvatars,
              (value) => handleSettingChange('display', 'showAvatars', value),
              'Display user profile pictures'
            )}
            {renderSwitch(
              'Relative Dates',
              settings.display.showRelativeDates,
              (value) => handleSettingChange('display', 'showRelativeDates', value),
              'Show "2 hours ago" instead of exact time'
            )}
          </>
        ))}

        {/* Localization */}
        {renderSection('Localization', (
          <>
            {renderPicker(
              'Currency',
              settings.display.currency,
              (value) => handleSettingChange('display', 'currency', value),
              [
                { label: 'Canadian Dollar (CAD)', value: 'CAD' },
                { label: 'US Dollar (USD)', value: 'USD' },
              ]
            )}
            {renderPicker(
              'Date Format',
              settings.display.dateFormat,
              (value) => handleSettingChange('display', 'dateFormat', value),
              [
                { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
                { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
                { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' },
              ]
            )}
            {renderPicker(
              'Time Format',
              settings.display.timeFormat,
              (value) => handleSettingChange('display', 'timeFormat', value),
              [
                { label: '12 Hour (AM/PM)', value: '12h' },
                { label: '24 Hour', value: '24h' },
              ]
            )}
          </>
        ))}

        {/* Notifications */}
        {renderSection('Notifications', (
          <>
            {renderSwitch(
              'Enable Notifications',
              settings.notifications.enabled,
              (value) => handleSettingChange('notifications', 'enabled', value),
              'Allow push notifications'
            )}
            {settings.notifications.enabled && (
              <>
                {renderSwitch(
                  'Task Reminders',
                  settings.notifications.taskReminders,
                  (value) => handleSettingChange('notifications', 'taskReminders', value),
                  'Reminders for due tasks'
                )}
                {renderSwitch(
                  'Lead Updates',
                  settings.notifications.leadUpdates,
                  (value) => handleSettingChange('notifications', 'leadUpdates', value),
                  'New leads and status changes'
                )}
                {renderSwitch(
                  'Follow-up Reminders',
                  settings.notifications.followUpReminders,
                  (value) => handleSettingChange('notifications', 'followUpReminders', value),
                  'Remind to follow up with leads'
                )}
                {renderSwitch(
                  'Marketing Updates',
                  settings.notifications.marketingUpdates,
                  (value) => handleSettingChange('notifications', 'marketingUpdates', value),
                  'Product updates and tips'
                )}
                {renderSwitch(
                  'Sound',
                  settings.notifications.soundEnabled,
                  (value) => handleSettingChange('notifications', 'soundEnabled', value)
                )}
                {renderSwitch(
                  'Vibration',
                  settings.notifications.vibrationEnabled,
                  (value) => handleSettingChange('notifications', 'vibrationEnabled', value)
                )}
              </>
            )}
          </>
        ))}

        {/* Sync & Backup */}
        {renderSection('Sync & Backup', (
          <>
            {renderSwitch(
              'Auto Sync',
              settings.sync.autoSync,
              (value) => handleSettingChange('sync', 'autoSync', value),
              'Automatically sync data with server'
            )}
            {settings.sync.autoSync && (
              <>
                {renderPicker(
                  'Sync Frequency',
                  settings.sync.syncFrequency,
                  (value) => handleSettingChange('sync', 'syncFrequency', value),
                  [
                    { label: 'Real-time', value: 'real-time' },
                    { label: 'Every 5 minutes', value: '5min' },
                    { label: 'Every 15 minutes', value: '15min' },
                    { label: 'Every 30 minutes', value: '30min' },
                    { label: 'Manual only', value: 'manual' },
                  ]
                )}
                {renderSwitch(
                  'WiFi Only',
                  settings.sync.wifiOnly,
                  (value) => handleSettingChange('sync', 'wifiOnly', value),
                  'Only sync when connected to WiFi'
                )}
              </>
            )}
            {renderSwitch(
              'Auto Backup',
              settings.backup.autoBackup,
              (value) => handleSettingChange('backup', 'autoBackup', value),
              'Automatically backup data to cloud'
            )}
            {settings.backup.autoBackup && (
              <>
                {renderPicker(
                  'Backup Frequency',
                  settings.backup.backupFrequency,
                  (value) => handleSettingChange('backup', 'backupFrequency', value),
                  [
                    { label: 'Daily', value: 'daily' },
                    { label: 'Weekly', value: 'weekly' },
                    { label: 'Monthly', value: 'monthly' },
                  ]
                )}
                {renderSwitch(
                  'Include Photos',
                  settings.backup.includePhotos,
                  (value) => handleSettingChange('backup', 'includePhotos', value),
                  'Include photos and attachments in backup'
                )}
              </>
            )}
          </>
        ))}

        {/* Privacy */}
        {renderSection('Privacy', (
          <>
            {renderSwitch(
              'Crash Reporting',
              settings.privacy.crashReporting,
              (value) => handleSettingChange('privacy', 'crashReporting', value),
              'Help improve the app by sharing crash reports'
            )}
            {renderSwitch(
              'Analytics',
              settings.privacy.analyticsEnabled,
              (value) => handleSettingChange('privacy', 'analyticsEnabled', value),
              'Allow anonymous usage analytics'
            )}
            {renderSwitch(
              'Data Sharing',
              settings.privacy.dataSharing,
              (value) => handleSettingChange('privacy', 'dataSharing', value),
              'Share data with partners (never personal info)'
            )}
          </>
        ))}

        {/* Account Actions */}
        {renderSection('Account', (
          <>
            {renderActionButton(
              'Export My Data',
              handleExportData,
              'secondary',
              'Download all your data'
            )}
            {renderActionButton(
              'Reset Settings',
              handleResetSettings,
              'secondary',
              'Reset all settings to default values'
            )}
            {renderActionButton(
              'Delete Account',
              handleDeleteAccount,
              'danger',
              'Permanently delete your account and all data'
            )}
          </>
        ))}

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
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 12,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
  },
  chevron: {
    fontSize: 24,
    color: '#ccc',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
  },
  pickerContainer: {
    minWidth: 120,
  },
  picker: {
    height: 40,
  },
  actionButton: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  actionButtonContent: {
    padding: 16,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  actionButtonDescription: {
    fontSize: 12,
  },
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  primaryButtonText: {
    color: '#fff',
  },
  primaryButtonDescription: {
    color: '#e3f2fd',
  },
  secondaryButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  secondaryButtonText: {
    color: '#333',
  },
  secondaryButtonDescription: {
    color: '#666',
  },
  dangerButton: {
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: '#f44336',
  },
  dangerButtonText: {
    color: '#d32f2f',
  },
  dangerButtonDescription: {
    color: '#f44336',
  },
  bottomSpacer: {
    height: 32,
  },
});

export default SettingsScreen;