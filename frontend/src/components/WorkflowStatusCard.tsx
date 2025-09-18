import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { WorkflowStatus, Workflow } from '../services/WorkflowIntegrationService';
import { styles } from '../styles/WorkflowStatusCardStyles';

interface WorkflowStatusCardProps {
  status: WorkflowStatus;
  onWorkflowSelect: (workflow: Workflow) => void;
  onViewDetails: (workflow: Workflow) => void;
}

export const WorkflowStatusCard: React.FC<WorkflowStatusCardProps> = ({
  status,
  onWorkflowSelect,
  onViewDetails
}) => {
  const getStatusColor = (workflowStatus: string) => {
    switch (workflowStatus) {
      case 'active':
        return '#34C759';
      case 'paused':
        return '#FF9500';
      case 'completed':
        return '#007AFF';
      case 'cancelled':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const getStatusIcon = (workflowStatus: string) => {
    switch (workflowStatus) {
      case 'active':
        return 'play-arrow';
      case 'paused':
        return 'pause';
      case 'completed':
        return 'check-circle';
      case 'cancelled':
        return 'cancel';
      default:
        return 'help';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const renderWorkflowItem = (workflow: Workflow) => (
    <View key={workflow.id} style={styles.workflowItem}>
      <View style={styles.workflowHeader}>
        <View style={styles.workflowInfo}>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(workflow.status) }]}>
            <MaterialIcons
              name={getStatusIcon(workflow.status)}
              size={16}
              color="#FFFFFF"
            />
          </View>
          <View style={styles.workflowDetails}>
            <Text style={styles.workflowName} numberOfLines={1}>
              {workflow.name || `Workflow ${workflow.id.slice(-8)}`}
            </Text>
            <Text style={styles.workflowMeta}>
              Step {workflow.currentStep || 0} of {workflow.totalSteps || 0} •
              Created {formatDate(workflow.createdAt)}
            </Text>
          </View>
        </View>

        <View style={styles.workflowActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onWorkflowSelect(workflow)}
          >
            <MaterialIcons name="settings" size={20} color="#007AFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onViewDetails(workflow)}
          >
            <MaterialIcons name="visibility" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      {workflow.nextExecution && (
        <View style={styles.nextExecution}>
          <MaterialIcons name="schedule" size={14} color="#8E8E93" />
          <Text style={styles.nextExecutionText}>
            Next: {new Date(workflow.nextExecution).toLocaleString()}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Workflow Status</Text>
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#34C759' }]}>
              {status.activeWorkflows}
            </Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#FF9500' }]}>
              {status.pausedWorkflows}
            </Text>
            <Text style={styles.statLabel}>Paused</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#007AFF' }]}>
              {status.completedWorkflows}
            </Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.workflowsList} showsVerticalScrollIndicator={false}>
        {status.workflows.active.length > 0 && (
          <View style={styles.workflowSection}>
            <Text style={styles.sectionTitle}>Active Workflows</Text>
            {status.workflows.active.map(renderWorkflowItem)}
          </View>
        )}

        {status.workflows.paused.length > 0 && (
          <View style={styles.workflowSection}>
            <Text style={styles.sectionTitle}>Paused Workflows</Text>
            {status.workflows.paused.map(renderWorkflowItem)}
          </View>
        )}

        {status.workflows.completed.length > 0 && (
          <View style={styles.workflowSection}>
            <Text style={styles.sectionTitle}>Recent Completions</Text>
            {status.workflows.completed.slice(0, 3).map(renderWorkflowItem)}
          </View>
        )}

        {status.totalWorkflows === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="work-outline" size={48} color="#8E8E93" />
            <Text style={styles.emptyStateTitle}>No Active Workflows</Text>
            <Text style={styles.emptyStateText}>
              Automated follow-up workflows will appear here when leads reach scoring thresholds.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};