import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Card, Button, SegmentedButtons, Chip, IconButton, FAB } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import MLSSyncStatus from '../components/MLSSyncStatus';
import MLSErrorHandler from '../components/MLSErrorHandler';
import { MLSError, MLSSyncOptions } from '../types/mls';

const MLSManagementScreen: React.FC = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('overview');
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [errors, setErrors] = useState<MLSError[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Mock data for demonstration
      setSyncStatus({
        lastSync: new Date(Date.now() - 3600000), // 1 hour ago
        totalProperties: 1250,
        activeListings: 890,
        syncsToday: 3,
        errorCount: 5
      });

      setErrors([
        {
          id: 'err_001',
          timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
          type: 'api',
          message: 'Rate limit exceeded for RETS provider',
          details: 'HTTP 429 response from MLS API',
          retryable: true,
          resolved: false
        },
        {
          id: 'err_002',
          timestamp: new Date(Date.now() - 900000), // 15 minutes ago
          type: 'data',
          message: 'Invalid property data format',
          details: 'Missing required fields in MLS response',
          mlsRecordId: 'MLS123456',
          retryable: false,
          resolved: false
        }
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncStart = async (options: MLSSyncOptions) => {
    Alert.alert(
      'Start MLS Sync',
      `Start ${options.fullSync ? 'full' : 'incremental'} sync?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: async () => {
            // In a real implementation, this would call the sync service
            console.log('Starting MLS sync with options:', options);
            Alert.alert('Success', 'MLS sync started successfully');
          }
        }
      ]
    );
  };

  const handleSyncStop = async () => {
    Alert.alert(
      'Stop MLS Sync',
      'Are you sure you want to stop the current sync?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop',
          onPress: async () => {
            // In a real implementation, this would call the sync service
            console.log('Stopping MLS sync');
            Alert.alert('Success', 'MLS sync stopped');
          }
        }
      ]
    );
  };

  const handleErrorResolve = async (errorId: string) => {
    // In a real implementation, this would call the error service
    console.log('Resolving error:', errorId);
    setErrors(prev => prev.filter(error => error.id !== errorId));
  };

  const handleErrorRetry = async (errorId: string) => {
    // In a real implementation, this would retry the failed operation
    console.log('Retrying error:', errorId);
    Alert.alert('Success', 'Error retry initiated');
  };

  const renderOverviewTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* Quick Stats */}
      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Card.Content>
            <Text style={styles.statValue}>{syncStatus?.totalProperties || 0}</Text>
            <Text style={styles.statLabel}>Total Properties</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content>
            <Text style={styles.statValue}>{syncStatus?.activeListings || 0}</Text>
            <Text style={styles.statLabel}>Active Listings</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content>
            <Text style={styles.statValue}>{syncStatus?.syncsToday || 0}</Text>
            <Text style={styles.statLabel}>Syncs Today</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content>
            <Text style={[styles.statValue, { color: '#F44336' }]}>
              {syncStatus?.errorCount || 0}
            </Text>
            <Text style={styles.statLabel}>Errors</Text>
          </Card.Content>
        </Card>
      </View>

      {/* Last Sync Info */}
      <Card style={styles.card}>
        <Card.Title title="Last Sync Information" />
        <Card.Content>
          <View style={styles.syncInfo}>
            <Text style={styles.syncInfoLabel}>Last Sync:</Text>
            <Text style={styles.syncInfoValue}>
              {syncStatus?.lastSync ? syncStatus.lastSync.toLocaleString() : 'Never'}
            </Text>
          </View>
          <View style={styles.syncInfo}>
            <Text style={styles.syncInfoLabel}>Status:</Text>
            <Chip mode="outlined" style={styles.statusChip}>
              SUCCESS
            </Chip>
          </View>
        </Card.Content>
      </Card>

      {/* Quick Actions */}
      <Card style={styles.card}>
        <Card.Title title="Quick Actions" />
        <Card.Content>
          <View style={styles.quickActions}>
            <Button
              mode="contained"
              onPress={() => handleSyncStart({ fullSync: false, skipDuplicates: false, validateData: true })}
              style={styles.actionButton}
            >
              Start Sync
            </Button>
            <Button
              mode="outlined"
              onPress={() => setActiveTab('sync')}
              style={styles.actionButton}
            >
              View Sync Status
            </Button>
            <Button
              mode="outlined"
              onPress={() => setActiveTab('errors')}
              style={styles.actionButton}
            >
              View Errors
            </Button>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );

  const renderSyncTab = () => (
    <MLSSyncStatus
      showHistory={true}
      onSyncStart={handleSyncStart}
      onSyncStop={handleSyncStop}
    />
  );

  const renderErrorsTab = () => (
    <MLSErrorHandler
      errors={errors}
      onResolve={handleErrorResolve}
      onRetry={handleErrorRetry}
      maxDisplay={20}
    />
  );

  const renderSettingsTab = () => (
    <ScrollView style={styles.tabContent}>
      <Card style={styles.card}>
        <Card.Title title="MLS Configuration" />
        <Card.Content>
          <Text style={styles.settingsText}>
            MLS provider settings and configuration options would be displayed here.
          </Text>
          <Button mode="outlined" style={styles.settingsButton}>
            Configure MLS Providers
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Sync Settings" />
        <Card.Content>
          <Text style={styles.settingsText}>
            Configure automatic sync schedules and data processing options.
          </Text>
          <Button mode="outlined" style={styles.settingsButton}>
            Sync Settings
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Data Mapping" />
        <Card.Content>
          <Text style={styles.settingsText}>
            Configure how MLS data fields map to internal property fields.
          </Text>
          <Button mode="outlined" style={styles.settingsButton}>
            Field Mapping
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>MLS Management</Text>
        <IconButton
          icon="cog"
          size={24}
          onPress={() => setActiveTab('settings')}
        />
      </View>

      {/* Tab Navigation */}
      <SegmentedButtons
        value={activeTab}
        onValueChange={setActiveTab}
        buttons={[
          { value: 'overview', label: 'Overview' },
          { value: 'sync', label: 'Sync Status' },
          { value: 'errors', label: 'Errors' },
          { value: 'settings', label: 'Settings' }
        ]}
        style={styles.segmentedButtons}
      />

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'sync' && renderSyncTab()}
      {activeTab === 'errors' && renderErrorsTab()}
      {activeTab === 'settings' && renderSettingsTab()}

      {/* Floating Action Button */}
      <FAB
        icon="sync"
        style={styles.fab}
        onPress={() => handleSyncStart({ fullSync: false, skipDuplicates: false, validateData: true })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    elevation: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  segmentedButtons: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    marginBottom: 8,
    marginRight: '4%',
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  card: {
    marginBottom: 16,
    elevation: 4,
  },
  syncInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  syncInfoLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    width: 80,
  },
  syncInfoValue: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  statusChip: {
    height: 28,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
    marginVertical: 4,
    minWidth: 120,
  },
  settingsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  settingsButton: {
    alignSelf: 'flex-start',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
  },
});

export default MLSManagementScreen;