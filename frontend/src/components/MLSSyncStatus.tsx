import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Card, Button, ProgressBar, Chip, IconButton, Divider } from 'react-native-paper';
import { MLSSyncStatusProps, MLSSyncStatus as IMLSSyncStatus, MLSSyncOptions } from '../types/mls';

const MLSSyncStatus: React.FC<MLSSyncStatusProps> = ({
  syncId,
  showHistory = false,
  onSyncStart,
  onSyncStop
}) => {
  const [currentSync, setCurrentSync] = useState<IMLSSyncStatus | null>(null);
  const [syncHistory, setSyncHistory] = useState<IMLSSyncStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (syncId) {
      loadSyncStatus();
    }
    if (showHistory) {
      loadSyncHistory();
    }
  }, [syncId, showHistory]);

  const loadSyncStatus = async () => {
    if (!syncId) return;

    setIsLoading(true);
    try {
      // In a real implementation, this would call the sync service
      // For now, we'll simulate with mock data
      const mockStatus: IMLSSyncStatus = {
        id: syncId,
        status: 'running',
        startTime: new Date(Date.now() - 300000), // 5 minutes ago
        recordsProcessed: 245,
        recordsUpdated: 180,
        recordsCreated: 65,
        recordsFailed: 12,
        progress: 68,
        errors: [
          {
            id: 'err_001',
            timestamp: new Date(),
            type: 'api',
            message: 'Rate limit exceeded for MLS provider',
            retryable: true,
            resolved: false
          }
        ]
      };
      setCurrentSync(mockStatus);
    } catch (error) {
      console.error('Failed to load sync status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSyncHistory = async () => {
    // Mock history data
    const mockHistory: IMLSSyncStatus[] = [
      {
        id: 'sync_001',
        status: 'completed',
        startTime: new Date(Date.now() - 3600000), // 1 hour ago
        endTime: new Date(Date.now() - 3300000), // 55 minutes ago
        recordsProcessed: 500,
        recordsUpdated: 350,
        recordsCreated: 150,
        recordsFailed: 8,
        progress: 100,
        errors: []
      },
      {
        id: 'sync_002',
        status: 'failed',
        startTime: new Date(Date.now() - 7200000), // 2 hours ago
        endTime: new Date(Date.now() - 6900000), // 1h 55m ago
        recordsProcessed: 200,
        recordsUpdated: 120,
        recordsCreated: 80,
        recordsFailed: 25,
        progress: 40,
        errors: [
          {
            id: 'err_002',
            timestamp: new Date(),
            type: 'network',
            message: 'Connection timeout',
            retryable: true,
            resolved: false
          }
        ]
      }
    ];
    setSyncHistory(mockHistory);
  };

  const handleStartSync = async () => {
    const options: MLSSyncOptions = {
      fullSync: false,
      skipDuplicates: false,
      validateData: true,
      maxRecords: 1000
    };

    if (onSyncStart) {
      await onSyncStart(options);
      loadSyncStatus(); // Refresh status
    }
  };

  const handleStopSync = async () => {
    if (onSyncStop) {
      await onSyncStop();
      loadSyncStatus(); // Refresh status
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return '#2196F3';
      case 'completed': return '#4CAF50';
      case 'failed': return '#F44336';
      case 'paused': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return 'sync';
      case 'completed': return 'check-circle';
      case 'failed': return 'alert-circle';
      case 'paused': return 'pause-circle';
      default: return 'help-circle';
    }
  };

  const formatDuration = (start: Date, end?: Date) => {
    const endTime = end || new Date();
    const duration = endTime.getTime() - start.getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString();
  };

  if (isLoading) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.loadingText}>Loading sync status...</Text>
        </Card.Content>
      </Card>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Current Sync Status */}
      {currentSync && (
        <Card style={styles.card}>
          <Card.Title
            title="Current Sync"
            subtitle={`ID: ${currentSync.id}`}
            left={(props) => (
              <IconButton
                {...props}
                icon={getStatusIcon(currentSync.status)}
                iconColor={getStatusColor(currentSync.status)}
              />
            )}
          />
          <Card.Content>
            <View style={styles.statusRow}>
              <Chip
                mode="outlined"
                style={[styles.statusChip, { borderColor: getStatusColor(currentSync.status) }]}
                textStyle={{ color: getStatusColor(currentSync.status) }}
              >
                {currentSync.status.toUpperCase()}
              </Chip>
              <Text style={styles.progressText}>
                {currentSync.progress}% Complete
              </Text>
            </View>

            <ProgressBar
              progress={currentSync.progress / 100}
              color={getStatusColor(currentSync.status)}
              style={styles.progressBar}
            />

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Processed</Text>
                <Text style={styles.statValue}>{currentSync.recordsProcessed}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Updated</Text>
                <Text style={styles.statValue}>{currentSync.recordsUpdated}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Created</Text>
                <Text style={styles.statValue}>{currentSync.recordsCreated}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Failed</Text>
                <Text style={[styles.statValue, { color: '#F44336' }]}>
                  {currentSync.recordsFailed}
                </Text>
              </View>
            </View>

            {currentSync.startTime && (
              <Text style={styles.durationText}>
                Duration: {formatDuration(currentSync.startTime, currentSync.endTime)}
              </Text>
            )}

            {currentSync.errors.length > 0 && (
              <View style={styles.errorsSection}>
                <Text style={styles.errorsTitle}>Errors ({currentSync.errors.length})</Text>
                {currentSync.errors.slice(0, 3).map((error) => (
                  <Text key={error.id} style={styles.errorText}>
                    • {error.message}
                  </Text>
                ))}
                {currentSync.errors.length > 3 && (
                  <Text style={styles.moreErrorsText}>
                    ... and {currentSync.errors.length - 3} more
                  </Text>
                )}
              </View>
            )}

            <View style={styles.buttonRow}>
              {currentSync.status === 'running' ? (
                <Button
                  mode="contained"
                  onPress={handleStopSync}
                  style={styles.stopButton}
                >
                  Stop Sync
                </Button>
              ) : (
                <Button
                  mode="contained"
                  onPress={handleStartSync}
                  style={styles.startButton}
                >
                  Start Sync
                </Button>
              )}
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Sync History */}
      {showHistory && syncHistory.length > 0 && (
        <Card style={[styles.card, styles.historyCard]}>
          <Card.Title title="Sync History" />
          <Card.Content>
            {syncHistory.map((sync, index) => (
              <View key={sync.id}>
                <View style={styles.historyItem}>
                  <View style={styles.historyHeader}>
                    <Chip
                      mode="outlined"
                      style={[styles.miniStatusChip, { borderColor: getStatusColor(sync.status) }]}
                      textStyle={{ color: getStatusColor(sync.status), fontSize: 12 }}
                    >
                      {sync.status.toUpperCase()}
                    </Chip>
                    <Text style={styles.historyDate}>
                      {sync.startTime ? formatDate(sync.startTime) : 'Unknown'}
                    </Text>
                  </View>

                  <View style={styles.historyStats}>
                    <Text style={styles.historyStat}>
                      {sync.recordsProcessed} processed
                    </Text>
                    <Text style={styles.historyStat}>
                      {sync.recordsFailed} failed
                    </Text>
                  </View>

                  {sync.endTime && sync.startTime && (
                    <Text style={styles.historyDuration}>
                      Duration: {formatDuration(sync.startTime, sync.endTime)}
                    </Text>
                  )}
                </View>

                {index < syncHistory.length - 1 && <Divider style={styles.divider} />}
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* No Current Sync */}
      {!currentSync && !isLoading && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.noSyncText}>No active sync</Text>
            <Button
              mode="contained"
              onPress={handleStartSync}
              style={styles.startButton}
            >
              Start New Sync
            </Button>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 4,
  },
  historyCard: {
    marginTop: 8,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statusChip: {
    borderWidth: 1,
  },
  miniStatusChip: {
    borderWidth: 1,
    height: 28,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  progressBar: {
    height: 8,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  statItem: {
    width: '48%',
    marginBottom: 12,
    marginRight: '4%',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  durationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  errorsSection: {
    marginBottom: 16,
  },
  errorsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#F44336',
    marginBottom: 4,
  },
  moreErrorsText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  historyItem: {
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
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
    fontSize: 14,
    color: '#333',
  },
  historyDuration: {
    fontSize: 12,
    color: '#666',
  },
  divider: {
    marginVertical: 8,
  },
  noSyncText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
});

export default MLSSyncStatus;