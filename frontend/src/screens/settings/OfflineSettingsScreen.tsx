import React, { useState, useEffect } from 'react';
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
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { formatDate, formatDateTime } from '../../utils/validation';

interface OfflineSettingsScreenProps {
  navigation: any;
}

const OfflineSettingsScreen: React.FC<OfflineSettingsScreenProps> = ({ navigation }) => {
  const { status, syncNow, clearOfflineData, getStorageInfo } = useOfflineSync();
  const [storageInfo, setStorageInfo] = useState<{ totalSize: number; breakdown: Record<string, number> } | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [wifiOnlySync, setWifiOnlySync] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadStorageInfo();
  }, []);

  const loadStorageInfo = async () => {
    try {
      const info = await getStorageInfo();
      setStorageInfo(info);
    } catch (error) {
      console.error('Error loading storage info:', error);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (isOnline: boolean, syncInProgress: boolean, pendingActions: number): string => {
    if (!isOnline) return '#f44336';
    if (syncInProgress) return '#FF9800';
    if (pendingActions > 0) return '#FF9800';
    return '#4CAF50';
  };

  const getStatusText = (): string => {
    if (!status.isOnline) return 'Offline - Changes will sync when reconnected';
    if (status.syncInProgress) return 'Syncing data with server...';
    if (status.pendingActions > 0) return `${status.pendingActions} changes waiting to sync`;
    return 'All data synced';
  };

  const handleManualSync = async () => {
    setIsLoading(true);
    try {
      await syncNow();
      await loadStorageInfo(); // Refresh storage info after sync
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearData = async () => {
    await clearOfflineData();
    await loadStorageInfo(); // Refresh storage info after clearing
  };

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const renderInfoRow = (label: string, value: string, color?: string) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, color && { color }]}>{value}</Text>
    </View>
  );

  const renderActionButton = (
    label: string,
    onPress: () => void,
    style: 'primary' | 'secondary' | 'danger' = 'secondary',
    disabled = false,
    loading = false
  ) => (
    <TouchableOpacity
      style={[
        styles.actionButton,
        styles[`${style}Button`],
        disabled && styles.disabledButton,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      <View style={styles.actionButtonContent}>
        {loading && <ActivityIndicator size="small" color="#fff" style={styles.buttonLoader} />}
        <Text style={[styles.actionButtonText, styles[`${style}ButtonText`]]}>
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Sync Status */}
        {renderSection('Sync Status', (
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <View style={[
                styles.statusIndicator,
                { backgroundColor: getStatusColor(status.isOnline, status.syncInProgress, status.pendingActions) }
              ]} />
              <Text style={styles.statusText}>{getStatusText()}</Text>
            </View>
            
            {renderInfoRow(
              'Connection',
              status.isOnline ? 'Online' : 'Offline',
              status.isOnline ? '#4CAF50' : '#f44336'
            )}
            
            {renderInfoRow(
              'Pending Changes',
              status.pendingActions.toString(),
              status.pendingActions > 0 ? '#FF9800' : '#666'
            )}
            
            {renderInfoRow(
              'Last Sync',
              status.lastSyncTime > 0 
                ? formatDateTime(new Date(status.lastSyncTime))
                : 'Never'
            )}

            {renderActionButton(
              'Sync Now',
              handleManualSync,
              'primary',
              !status.isOnline || status.syncInProgress,
              isLoading
            )}
          </View>
        ))}

        {/* Sync Settings */}
        {renderSection('Sync Settings', (
          <>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Auto Sync</Text>
                <Text style={styles.settingDescription}>
                  Automatically sync changes when online
                </Text>
              </View>
              <Switch
                value={autoSyncEnabled}
                onValueChange={setAutoSyncEnabled}
                trackColor={{ false: '#ccc', true: '#2196F3' }}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>WiFi Only Sync</Text>
                <Text style={styles.settingDescription}>
                  Only sync when connected to WiFi
                </Text>
              </View>
              <Switch
                value={wifiOnlySync}
                onValueChange={setWifiOnlySync}
                trackColor={{ false: '#ccc', true: '#2196F3' }}
              />
            </View>
          </>
        ))}

        {/* Storage Information */}
        {renderSection('Storage Usage', (
          <View style={styles.storageCard}>
            {storageInfo ? (
              <>
                {renderInfoRow('Total Storage', formatBytes(storageInfo.totalSize))}
                
                <View style={styles.storageBreakdown}>
                  <Text style={styles.storageBreakdownTitle}>Breakdown:</Text>
                  {Object.entries(storageInfo.breakdown).map(([key, size]) => (
                    <View key={key} style={styles.storageBreakdownRow}>
                      <Text style={styles.storageBreakdownLabel}>
                        {key.charAt(0) + key.slice(1).toLowerCase()}:
                      </Text>
                      <Text style={styles.storageBreakdownValue}>
                        {formatBytes(size)}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <ActivityIndicator size="small" color="#666" />
            )}
          </View>
        ))}

        {/* Offline Capabilities */}
        {renderSection('Offline Features', (
          <View style={styles.featuresCard}>
            <Text style={styles.featuresDescription}>
              When offline, you can still:
            </Text>
            
            <View style={styles.featuresList}>
              <Text style={styles.featureItem}>✅ View all leads and tasks</Text>
              <Text style={styles.featureItem}>✅ Add new leads and tasks</Text>
              <Text style={styles.featureItem}>✅ Edit existing data</Text>
              <Text style={styles.featureItem}>✅ Add notes and interactions</Text>
              <Text style={styles.featureItem}>⏳ Changes sync when reconnected</Text>
            </View>

            <Text style={styles.featuresNote}>
              Note: Some features like analytics and search may be limited when offline.
            </Text>
          </View>
        ))}

        {/* Data Management */}
        {renderSection('Data Management', (
          <>
            {renderActionButton(
              'Refresh Storage Info',
              loadStorageInfo,
              'secondary'
            )}
            
            {renderActionButton(
              'Clear Offline Data',
              handleClearData,
              'danger'
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
  statusCard: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  settingRow: {
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
  storageCard: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  storageBreakdown: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  storageBreakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  storageBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  storageBreakdownLabel: {
    fontSize: 12,
    color: '#666',
  },
  storageBreakdownValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  featuresCard: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  featuresDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
  },
  featuresList: {
    marginBottom: 16,
  },
  featureItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  featuresNote: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  actionButton: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  buttonLoader: {
    marginRight: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  primaryButtonText: {
    color: '#fff',
  },
  secondaryButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  secondaryButtonText: {
    color: '#333',
  },
  dangerButton: {
    backgroundColor: '#f44336',
  },
  dangerButtonText: {
    color: '#fff',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  bottomSpacer: {
    height: 32,
  },
});

export default OfflineSettingsScreen;