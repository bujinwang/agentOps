import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { MLSSyncStatus, MLSError, MLSConfig } from '../types/mls';
import { createMLSSyncManager } from '../services/mlsSyncService';
import { createMLSService } from '../services/mlsApiService';

const MLSSyncDashboard: React.FC = () => {
  const { theme } = useTheme();
  const [syncStatus, setSyncStatus] = useState<MLSSyncStatus | null>(null);
  const [syncHistory, setSyncHistory] = useState<MLSSyncStatus[]>([]);
  const [errors, setErrors] = useState<MLSError[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize MLS services
  const mlsConfig: MLSConfig = {
    provider: 'reso',
    endpoint: 'https://api.example.com',
    credentials: {
      username: 'demo',
      password: 'demo',
      clientId: 'demo-client',
      clientSecret: 'demo-secret'
    },
    rateLimit: 1000,
    syncInterval: 60,
    enabled: true
  };

  const mlsService = createMLSService(mlsConfig);
  const syncManager = createMLSSyncManager(mlsService, mlsConfig);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Get active syncs (simulating current sync status)
      const activeSyncs = await syncManager.getActiveSyncs();
      const currentStatus = activeSyncs.length > 0 ? activeSyncs[0] : null;

      // For demo purposes, create mock history and errors
      const mockHistory: MLSSyncStatus[] = [
        {
          id: 'sync_001',
          status: 'completed',
          startTime: new Date(Date.now() - 3600000),
          endTime: new Date(Date.now() - 3000000),
          recordsProcessed: 150,
          recordsUpdated: 120,
          recordsCreated: 30,
          recordsFailed: 0,
          errors: [],
          progress: 100
        }
      ];

      const mockErrors: MLSError[] = [];

      setSyncStatus(currentStatus);
      setSyncHistory(mockHistory);
      setErrors(mockErrors);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboardData();
    setIsRefreshing(false);
  };

  const handleStartSync = async () => {
    setIsLoading(true);
    try {
      await syncManager.startSync();
      await loadDashboardData();
    } catch (error) {
      console.error('Failed to start sync:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopSync = async () => {
    try {
      // Get the current sync ID to stop
      const activeSyncs = await syncManager.getActiveSyncs();
      if (activeSyncs.length > 0) {
        await syncManager.stopSync(activeSyncs[0].id);
        await loadDashboardData();
      }
    } catch (error) {
      console.error('Failed to stop sync:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return '#4CAF50';
      case 'completed':
        return '#2196F3';
      case 'failed':
        return '#F44336';
      case 'paused':
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return 'sync';
      case 'completed':
        return 'check-circle';
      case 'failed':
        return 'alert-circle';
      case 'paused':
        return 'pause-circle';
      default:
        return 'circle';
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const formatDuration = (start: Date, end?: Date) => {
    const endTime = end || new Date();
    const duration = endTime.getTime() - new Date(start).getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>MLS Sync Dashboard</Text>
        <Text style={styles.subtitle}>Monitor and manage MLS data synchronization</Text>
      </View>

      {/* Current Status Card */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <MaterialCommunityIcons
            name={getStatusIcon(syncStatus?.status || 'idle')}
            size={24}
            color={getStatusColor(syncStatus?.status || 'idle')}
          />
          <Text style={[styles.statusText, { color: getStatusColor(syncStatus?.status || 'idle') }]}>
            {syncStatus?.status?.toUpperCase() || 'IDLE'}
          </Text>
        </View>

        {syncStatus && (
          <View style={styles.statusDetails}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Records Processed:</Text>
              <Text style={styles.statusValue}>{syncStatus.recordsProcessed}</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Records Updated:</Text>
              <Text style={styles.statusValue}>{syncStatus.recordsUpdated}</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Records Created:</Text>
              <Text style={styles.statusValue}>{syncStatus.recordsCreated}</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Progress:</Text>
              <Text style={styles.statusValue}>{syncStatus.progress}%</Text>
            </View>
            {syncStatus.startTime && (
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Duration:</Text>
                <Text style={styles.statusValue}>
                  {formatDuration(syncStatus.startTime, syncStatus.endTime)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Control Buttons */}
        <View style={styles.controls}>
          {syncStatus?.status === 'running' ? (
            <TouchableOpacity
              style={[styles.controlButton, styles.stopButton]}
              onPress={handleStopSync}
            >
              <MaterialCommunityIcons name="stop" size={20} color="#fff" />
              <Text style={styles.controlButtonText}>Stop Sync</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.controlButton, styles.startButton]}
              onPress={handleStartSync}
              disabled={isLoading}
            >
              <MaterialCommunityIcons
                name={isLoading ? 'loading' : 'play'}
                size={20}
                color="#fff"
              />
              <Text style={styles.controlButtonText}>
                {isLoading ? 'Starting...' : 'Start Sync'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.controlButton, styles.refreshButton]}
            onPress={handleRefresh}
          >
            <MaterialCommunityIcons name="refresh" size={20} color="#666" />
            <Text style={[styles.controlButtonText, styles.refreshText]}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Errors Section */}
      {errors.length > 0 && (
        <View style={styles.errorsCard}>
          <Text style={styles.sectionTitle}>Recent Errors</Text>
          {errors.slice(0, 5).map((error) => (
            <View key={error.id} style={styles.errorItem}>
              <MaterialCommunityIcons name="alert-circle" size={20} color="#F44336" />
              <View style={styles.errorContent}>
                <Text style={styles.errorType}>{error.type.toUpperCase()}</Text>
                <Text style={styles.errorMessage}>{error.message}</Text>
                <Text style={styles.errorTimestamp}>
                  {formatDate(error.timestamp)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Sync History */}
      <View style={styles.historyCard}>
        <Text style={styles.sectionTitle}>Sync History</Text>
        {syncHistory.slice(0, 10).map((historyItem) => (
          <View key={historyItem.id} style={styles.historyItem}>
            <View style={styles.historyHeader}>
              <MaterialCommunityIcons
                name={getStatusIcon(historyItem.status)}
                size={20}
                color={getStatusColor(historyItem.status)}
              />
              <Text style={[styles.historyStatus, { color: getStatusColor(historyItem.status) }]}>
                {historyItem.status.toUpperCase()}
              </Text>
              <Text style={styles.historyDate}>
                {historyItem.startTime ? formatDate(historyItem.startTime) : 'N/A'}
              </Text>
            </View>
            <View style={styles.historyStats}>
              <Text style={styles.historyStat}>
                Processed: {historyItem.recordsProcessed}
              </Text>
              <Text style={styles.historyStat}>
                Updated: {historyItem.recordsUpdated}
              </Text>
              <Text style={styles.historyStat}>
                Created: {historyItem.recordsCreated}
              </Text>
            </View>
            {historyItem.errors.length > 0 && (
              <Text style={styles.historyErrors}>
                Errors: {historyItem.errors.length}
              </Text>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  statusCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  statusDetails: {
    marginBottom: 20,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    justifyContent: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  refreshButton: {
    backgroundColor: '#E0E0E0',
  },
  controlButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  refreshText: {
    color: '#666',
  },
  errorsCard: {
    margin: 16,
    marginTop: 0,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  errorItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  errorContent: {
    flex: 1,
    marginLeft: 12,
  },
  errorType: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  errorTimestamp: {
    fontSize: 12,
    color: '#666',
  },
  historyCard: {
    margin: 16,
    marginTop: 0,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 32,
  },
  historyItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
    flex: 1,
  },
  historyDate: {
    fontSize: 12,
    color: '#666',
  },
  historyStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  historyStat: {
    fontSize: 12,
    color: '#666',
  },
  historyErrors: {
    fontSize: 12,
    color: '#F44336',
  },
});

export default MLSSyncDashboard;