import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Card, Button, Chip, IconButton, Divider, List } from 'react-native-paper';
import { MLSErrorHandlerProps, MLSError } from '../types/mls';

const MLSErrorHandler: React.FC<MLSErrorHandlerProps> = ({
  errors,
  onResolve,
  onRetry,
  maxDisplay = 10
}) => {
  const [expandedError, setExpandedError] = useState<string | null>(null);

  const unresolvedErrors = errors.filter(error => !error.resolved);
  const displayErrors = unresolvedErrors.slice(0, maxDisplay);
  const hasMoreErrors = unresolvedErrors.length > maxDisplay;

  const getErrorIcon = (type: string) => {
    switch (type) {
      case 'api': return 'api';
      case 'data': return 'database';
      case 'validation': return 'alert-circle-check';
      case 'network': return 'wifi-off';
      case 'auth': return 'shield-alert';
      default: return 'alert-circle';
    }
  };

  const getErrorColor = (type: string) => {
    switch (type) {
      case 'api': return '#FF9800';
      case 'data': return '#2196F3';
      case 'validation': return '#4CAF50';
      case 'network': return '#9C27B0';
      case 'auth': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getSeverityColor = (retryable: boolean) => {
    return retryable ? '#FF9800' : '#F44336'; // Orange for retryable, red for permanent
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleString();
  };

  const handleResolve = async (errorId: string) => {
    Alert.alert(
      'Resolve Error',
      'Are you sure you want to mark this error as resolved?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resolve',
          onPress: () => {
            if (onResolve) {
              onResolve(errorId);
            }
          }
        }
      ]
    );
  };

  const handleRetry = async (errorId: string) => {
    if (onRetry) {
      await onRetry(errorId);
    }
  };

  const toggleExpanded = (errorId: string) => {
    setExpandedError(expandedError === errorId ? null : errorId);
  };

  const getErrorSummary = () => {
    const summary: { [key: string]: number } = {};
    unresolvedErrors.forEach(error => {
      summary[error.type] = (summary[error.type] || 0) + 1;
    });
    return summary;
  };

  if (unresolvedErrors.length === 0) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.emptyState}>
            <IconButton icon="check-circle" size={48} iconColor="#4CAF50" />
            <Text style={styles.emptyTitle}>No Errors</Text>
            <Text style={styles.emptySubtitle}>All MLS sync errors have been resolved</Text>
          </View>
        </Card.Content>
      </Card>
    );
  }

  const summary = getErrorSummary();

  return (
    <ScrollView style={styles.container}>
      {/* Error Summary */}
      <Card style={styles.card}>
        <Card.Title title="Error Summary" />
        <Card.Content>
          <View style={styles.summaryGrid}>
            {Object.entries(summary).map(([type, count]) => (
              <View key={type} style={styles.summaryItem}>
                <Chip
                  mode="outlined"
                  style={[styles.summaryChip, { borderColor: getErrorColor(type) }]}
                  textStyle={{ color: getErrorColor(type) }}
                >
                  {type}: {count}
                </Chip>
              </View>
            ))}
          </View>
          <Text style={styles.totalText}>
            Total unresolved errors: {unresolvedErrors.length}
          </Text>
        </Card.Content>
      </Card>

      {/* Error List */}
      <Card style={styles.card}>
        <Card.Title
          title={`Errors (${displayErrors.length}${hasMoreErrors ? '+' : ''})`}
          subtitle={hasMoreErrors ? `Showing first ${maxDisplay} of ${unresolvedErrors.length}` : undefined}
        />
        <Card.Content>
          {displayErrors.map((error, index) => (
            <View key={error.id}>
              <List.Item
                title={error.message}
                description={`Type: ${error.type} • ${formatTimestamp(error.timestamp)}`}
                left={(props) => (
                  <IconButton
                    {...props}
                    icon={getErrorIcon(error.type)}
                    iconColor={getErrorColor(error.type)}
                  />
                )}
                right={(props) => (
                  <View style={styles.actionButtons}>
                    <IconButton
                      {...props}
                      icon="chevron-down"
                      onPress={() => toggleExpanded(error.id)}
                      style={{ transform: [{ rotate: expandedError === error.id ? '180deg' : '0deg' }] }}
                    />
                  </View>
                )}
                onPress={() => toggleExpanded(error.id)}
              />

              {/* Expanded Error Details */}
              {expandedError === error.id && (
                <View style={styles.expandedContent}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Error ID:</Text>
                    <Text style={styles.detailValue}>{error.id}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Type:</Text>
                    <Chip
                      mode="outlined"
                      style={[styles.typeChip, { borderColor: getErrorColor(error.type) }]}
                      textStyle={{ color: getErrorColor(error.type) }}
                    >
                      {error.type.toUpperCase()}
                    </Chip>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Retryable:</Text>
                    <Chip
                      mode="outlined"
                      style={[styles.retryChip, { borderColor: getSeverityColor(error.retryable) }]}
                      textStyle={{ color: getSeverityColor(error.retryable) }}
                    >
                      {error.retryable ? 'YES' : 'NO'}
                    </Chip>
                  </View>

                  {error.details && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Details:</Text>
                      <Text style={styles.detailValue}>
                        {typeof error.details === 'string'
                          ? error.details
                          : JSON.stringify(error.details, null, 2)
                        }
                      </Text>
                    </View>
                  )}

                  {error.mlsRecordId && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>MLS Record ID:</Text>
                      <Text style={styles.detailValue}>{error.mlsRecordId}</Text>
                    </View>
                  )}

                  {/* Action Buttons */}
                  <View style={styles.buttonRow}>
                    {error.retryable && (
                      <Button
                        mode="outlined"
                        onPress={() => handleRetry(error.id)}
                        style={styles.retryButton}
                      >
                        Retry
                      </Button>
                    )}
                    <Button
                      mode="contained"
                      onPress={() => handleResolve(error.id)}
                      style={styles.resolveButton}
                    >
                      Mark Resolved
                    </Button>
                  </View>
                </View>
              )}

              {index < displayErrors.length - 1 && <Divider style={styles.divider} />}
            </View>
          ))}

          {hasMoreErrors && (
            <View style={styles.moreErrorsContainer}>
              <Text style={styles.moreErrorsText}>
                ... and {unresolvedErrors.length - maxDisplay} more errors
              </Text>
              <Button mode="text" onPress={() => {}}>
                View All Errors
              </Button>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Bulk Actions */}
      {unresolvedErrors.length > 1 && (
        <Card style={styles.card}>
          <Card.Title title="Bulk Actions" />
          <Card.Content>
            <View style={styles.bulkActions}>
              <Button
                mode="outlined"
                onPress={() => Alert.alert('Bulk Retry', 'Retry all retryable errors?')}
                style={styles.bulkButton}
              >
                Retry All
              </Button>
              <Button
                mode="outlined"
                onPress={() => Alert.alert('Bulk Resolve', 'Mark all errors as resolved?')}
                style={styles.bulkButton}
              >
                Resolve All
              </Button>
            </View>
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  summaryItem: {
    marginRight: 8,
    marginBottom: 8,
  },
  summaryChip: {
    borderWidth: 1,
  },
  totalText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  expandedContent: {
    paddingLeft: 72, // Align with list item content
    paddingRight: 16,
    paddingBottom: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginVertical: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    width: 120,
  },
  detailValue: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  typeChip: {
    borderWidth: 1,
    height: 28,
  },
  retryChip: {
    borderWidth: 1,
    height: 28,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  retryButton: {
    marginRight: 8,
  },
  resolveButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    marginVertical: 8,
  },
  moreErrorsContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  moreErrorsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  bulkActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  bulkButton: {
    flex: 1,
    marginHorizontal: 4,
  },
});

export default MLSErrorHandler;