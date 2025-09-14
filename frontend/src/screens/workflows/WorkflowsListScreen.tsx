import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  RefreshControl,
  Text,
} from 'react-native';
import { MaterialColors, MaterialSpacing, MaterialTypography } from '../../styles/MaterialDesign';
import { apiService } from '../../services/api';

interface Workflow {
  workflow_id: number;
  name: string;
  description: string;
  trigger_score_min: number;
  trigger_score_max: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  sequence_count: number;
}

const WorkflowsListScreen: React.FC = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    loadWorkflows();
  }, [filter]);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const params = filter === 'all' ? {} : { is_active: filter === 'active' };
      const response = await apiService.getWorkflows(params);
      setWorkflows(response.data);
    } catch (error) {
      console.error('Error loading workflows:', error);
      Alert.alert('Error', 'Failed to load workflows');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadWorkflows();
  };

  const handleDeleteWorkflow = (workflow: Workflow) => {
    Alert.alert(
      'Delete Workflow',
      `Are you sure you want to delete "${workflow.name}"? This will also delete all associated sequences.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteWorkflow(workflow.workflow_id),
        },
      ]
    );
  };

  const deleteWorkflow = async (workflowId: number) => {
    try {
      await apiService.deleteWorkflow(workflowId);
      setWorkflows(prev => prev.filter(w => w.workflow_id !== workflowId));
      Alert.alert('Success', 'Workflow deleted successfully');
    } catch (error) {
      console.error('Error deleting workflow:', error);
      Alert.alert('Error', 'Failed to delete workflow');
    }
  };

  const handleToggleActive = async (workflow: Workflow) => {
    try {
      await apiService.updateWorkflow(workflow.workflow_id, {
        ...workflow,
        is_active: !workflow.is_active,
      });
      loadWorkflows(); // Refresh the list
      Alert.alert('Success', `Workflow ${!workflow.is_active ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error toggling workflow status:', error);
      Alert.alert('Error', 'Failed to update workflow status');
    }
  };

  const renderWorkflowCard = (workflow: Workflow) => (
    <View key={workflow.workflow_id} style={styles.workflowCard}>
      <View style={styles.workflowHeader}>
        <View style={styles.workflowInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.workflowName}>{workflow.name}</Text>
            <View style={[styles.statusBadge, workflow.is_active ? styles.activeBadge : styles.inactiveBadge]}>
              <Text style={styles.statusBadgeText}>{workflow.is_active ? 'Active' : 'Inactive'}</Text>
            </View>
          </View>
          <Text style={styles.workflowDescription} numberOfLines={2}>
            {workflow.description}
          </Text>
        </View>
      </View>

      <View style={styles.workflowDetails}>
        <Text style={styles.triggerText}>
          Trigger: Score {workflow.trigger_score_min}{workflow.trigger_score_max ? ` - ${workflow.trigger_score_max}` : '+'}
        </Text>
        <Text style={styles.sequenceText}>
          {workflow.sequence_count} sequence{workflow.sequence_count !== 1 ? 's' : ''}
        </Text>
        <Text style={styles.dateText}>
          Updated: {new Date(workflow.updated_at).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.workflowActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            // TODO: Implement edit workflow functionality
            Alert.alert('Coming Soon', 'Edit workflow functionality will be available soon.');
          }}
        >
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => handleToggleActive(workflow)}
        >
          <Text style={styles.secondaryButtonText}>
            {workflow.is_active ? 'Deactivate' : 'Activate'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.dangerButton]}
          onPress={() => handleDeleteWorkflow(workflow)}
        >
          <Text style={styles.dangerButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFilterButtons = () => (
    <View style={styles.filterContainer}>
      <TouchableOpacity
        style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
        onPress={() => setFilter('all')}
      >
        <Text style={[styles.filterButtonText, filter === 'all' && styles.filterButtonTextActive]}>
          All ({workflows.length})
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.filterButton, filter === 'active' && styles.filterButtonActive]}
        onPress={() => setFilter('active')}
      >
        <Text style={[styles.filterButtonText, filter === 'active' && styles.filterButtonTextActive]}>
          Active ({workflows.filter(w => w.is_active).length})
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.filterButton, filter === 'inactive' && styles.filterButtonActive]}
        onPress={() => setFilter('inactive')}
      >
        <Text style={[styles.filterButtonText, filter === 'inactive' && styles.filterButtonTextActive]}>
          Inactive ({workflows.filter(w => !w.is_active).length})
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Workflows</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            // TODO: Implement create new workflow functionality
            Alert.alert('Coming Soon', 'Create new workflow functionality will be available soon.');
          }}
        >
          <Text style={styles.addButtonText}>+ New Workflow</Text>
        </TouchableOpacity>
      </View>

      {renderFilterButtons()}

      <ScrollView
        style={styles.workflowsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading workflows...</Text>
          </View>
        ) : workflows.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No workflows found</Text>
            <Text style={styles.emptySubtext}>
              {filter === 'all'
                ? 'Create your first workflow to get started'
                : `No ${filter} workflows found. Try a different filter or create a new one.`
              }
            </Text>
          </View>
        ) : (
          workflows.map(renderWorkflowCard)
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: MaterialSpacing.md,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    ...MaterialTypography.headlineSmall,
    color: MaterialColors.neutral[900],
  },
  addButton: {
    backgroundColor: MaterialColors.primary[500],
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.sm,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: MaterialSpacing.md,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    flex: 1,
    padding: MaterialSpacing.sm,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 2,
  },
  filterButtonActive: {
    backgroundColor: MaterialColors.primary[500],
  },
  filterButtonText: {
    ...MaterialTypography.labelMedium,
    color: MaterialColors.neutral[700],
  },
  filterButtonTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  workflowsList: {
    flex: 1,
    padding: MaterialSpacing.md,
  },
  workflowCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: MaterialSpacing.md,
    marginBottom: MaterialSpacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  workflowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: MaterialSpacing.sm,
  },
  workflowInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: MaterialSpacing.xs,
  },
  workflowName: {
    ...MaterialTypography.titleMedium,
    color: MaterialColors.neutral[900],
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: MaterialSpacing.sm,
    paddingVertical: 4,
    borderRadius: 16,
    marginLeft: MaterialSpacing.sm,
  },
  activeBadge: {
    backgroundColor: MaterialColors.secondary[100],
  },
  inactiveBadge: {
    backgroundColor: MaterialColors.neutral[100],
  },
  statusBadgeText: {
    ...MaterialTypography.labelSmall,
    fontWeight: 'bold',
  },
  workflowDescription: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[600],
  },
  workflowDetails: {
    marginBottom: MaterialSpacing.md,
  },
  triggerText: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[700],
    marginBottom: MaterialSpacing.xs,
  },
  sequenceText: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[700],
    marginBottom: MaterialSpacing.xs,
  },
  dateText: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[500],
  },
  workflowActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: MaterialColors.primary[500],
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.sm,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: MaterialColors.primary[500],
  },
  secondaryButtonText: {
    color: MaterialColors.primary[500],
  },
  dangerButton: {
    backgroundColor: MaterialColors.error[500],
  },
  dangerButtonText: {
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: MaterialSpacing.xl,
  },
  loadingText: {
    ...MaterialTypography.bodyLarge,
    color: MaterialColors.neutral[500],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: MaterialSpacing.xl,
  },
  emptyText: {
    ...MaterialTypography.headlineSmall,
    color: MaterialColors.neutral[700],
    marginBottom: MaterialSpacing.sm,
  },
  emptySubtext: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[500],
    textAlign: 'center',
  },
});

export default WorkflowsListScreen;