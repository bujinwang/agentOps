import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { WorkflowHistoryEntry, Workflow } from '../services/WorkflowIntegrationService';
import { styles } from '../styles/LeadWorkflowHistoryStyles';

interface LeadWorkflowHistoryProps {
  history: WorkflowHistoryEntry[];
  onWorkflowSelect: (workflow: Workflow) => void;
  maxItems?: number;
}

export const LeadWorkflowHistory: React.FC<LeadWorkflowHistoryProps> = ({
  history,
  onWorkflowSelect,
  maxItems = 20
}) => {
  const getEventIcon = (eventType: string) => {
    switch (eventType.toLowerCase()) {
      case 'status_change':
        return 'swap-horiz';
      case 'workflow_override':
        return 'settings';
      case 'communication':
        return 'send';
      case 'step_completed':
        return 'check-circle';
      case 'workflow_started':
        return 'play-arrow';
      case 'workflow_paused':
        return 'pause';
      case 'workflow_cancelled':
        return 'cancel';
      default:
        return 'info';
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType.toLowerCase()) {
      case 'status_change':
        return '#007AFF';
      case 'workflow_override':
        return '#FF9500';
      case 'communication':
        return '#34C759';
      case 'step_completed':
        return '#34C759';
      case 'workflow_started':
        return '#34C759';
      case 'workflow_paused':
        return '#FF9500';
      case 'workflow_cancelled':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const formatEventDescription = (entry: WorkflowHistoryEntry) => {
    const { eventType, oldValue, newValue, reason } = entry;

    switch (eventType.toLowerCase()) {
      case 'status_change':
        return `Lead status changed from "${oldValue}" to "${newValue}"`;
      case 'workflow_override':
        return `Workflow ${newValue} by agent`;
      case 'communication':
        return `Communication sent via ${newValue}`;
      case 'step_completed':
        return `Workflow step completed`;
      case 'workflow_started':
        return `Workflow started`;
      case 'workflow_paused':
        return `Workflow paused`;
      case 'workflow_cancelled':
        return `Workflow cancelled`;
      default:
        return reason || eventType;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours < 1) {
      return `${Math.floor(diffMs / (1000 * 60))}m ago`;
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`;
    } else if (diffDays < 7) {
      return `${Math.floor(diffDays)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderHistoryItem = ({ item }: { item: WorkflowHistoryEntry }) => (
    <View style={styles.historyItem}>
      <View style={styles.eventIcon}>
        <MaterialIcons
          name={getEventIcon(item.eventType)}
          size={20}
          color={getEventColor(item.eventType)}
        />
      </View>

      <View style={styles.eventContent}>
        <Text style={styles.eventDescription}>
          {formatEventDescription(item)}
        </Text>

        <View style={styles.eventMeta}>
          <Text style={styles.eventTimestamp}>
            {formatTimestamp(item.timestamp)}
          </Text>

          {item.changedBy && (
            <Text style={styles.eventUser}>
              by User #{item.changedBy}
            </Text>
          )}
        </View>

        {item.workflow && (
          <TouchableOpacity
            style={styles.workflowLink}
            onPress={() => onWorkflowSelect(item.workflow!)}
          >
            <MaterialIcons name="link" size={14} color="#007AFF" />
            <Text style={styles.workflowLinkText}>
              {item.workflow.name || `Workflow ${item.workflow.id.slice(-8)}`}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const displayHistory = maxItems ? history.slice(0, maxItems) : history;

  if (displayHistory.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="history" size={48} color="#8E8E93" />
        <Text style={styles.emptyTitle}>No Activity Yet</Text>
        <Text style={styles.emptyText}>
          Workflow activity and lead status changes will appear here.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={displayHistory}
        keyExtractor={(item) => `${item.id}-${item.timestamp}`}
        renderItem={renderHistoryItem}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};