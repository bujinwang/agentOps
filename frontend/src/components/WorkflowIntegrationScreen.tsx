import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { WorkflowIntegrationService } from '../services/WorkflowIntegrationService';
import { LeadWorkflowHistory } from '../components/LeadWorkflowHistory';
import { WorkflowStatusCard } from '../components/WorkflowStatusCard';
import { WorkflowOverrideModal } from '../components/WorkflowOverrideModal';
import { styles } from '../styles/WorkflowIntegrationStyles';

interface RouteParams {
  leadId: number;
  leadName?: string;
}

export const WorkflowIntegrationScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { leadId, leadName } = route.params as RouteParams;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workflowStatus, setWorkflowStatus] = useState(null);
  const [workflowHistory, setWorkflowHistory] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [showOverrideModal, setShowOverrideModal] = useState(false);

  const workflowService = new WorkflowIntegrationService();

  useEffect(() => {
    loadWorkflowData();
  }, [leadId]);

  const loadWorkflowData = async () => {
    try {
      setLoading(true);

      // Load workflow status and history in parallel
      const [status, history] = await Promise.all([
        workflowService.getLeadWorkflowStatus(leadId),
        workflowService.getLeadWorkflowHistory(leadId, { limit: 20 })
      ]);

      setWorkflowStatus(status);
      setWorkflowHistory(history);
    } catch (error) {
      console.error('Failed to load workflow data:', error);
      Alert.alert('Error', 'Failed to load workflow data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadWorkflowData();
    setRefreshing(false);
  };

  const handleWorkflowOverride = (workflow: any) => {
    setSelectedWorkflow(workflow);
    setShowOverrideModal(true);
  };

  const handleOverrideSubmit = async (operation: string, reason?: string) => {
    if (!selectedWorkflow) return;

    try {
      await workflowService.overrideWorkflow(selectedWorkflow.id, operation, reason);
      setShowOverrideModal(false);
      setSelectedWorkflow(null);

      // Refresh data to show updated status
      await loadWorkflowData();

      Alert.alert('Success', `Workflow ${operation}d successfully`);
    } catch (error) {
      console.error('Workflow override failed:', error);
      Alert.alert('Error', 'Failed to override workflow');
    }
  };

  const handleViewWorkflowDetails = (workflow: any) => {
    navigation.navigate('WorkflowDetails', {
      workflowId: workflow.id,
      leadId,
      leadName
    });
  };

  const handleBulkOperation = () => {
    navigation.navigate('BulkWorkflowOperations', { leadId });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading workflow data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Workflow Integration</Text>
            <Text style={styles.headerSubtitle}>
              {leadName || `Lead #${leadId}`}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.bulkButton}
            onPress={handleBulkOperation}
          >
            <MaterialIcons name="group-work" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* Workflow Status Summary */}
        {workflowStatus && (
          <WorkflowStatusCard
            status={workflowStatus}
            onWorkflowSelect={handleWorkflowOverride}
            onViewDetails={handleViewWorkflowDetails}
          />
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('WorkflowAnalytics', { leadId })}
          >
            <MaterialIcons name="analytics" size={20} color="#007AFF" />
            <Text style={styles.quickActionText}>Analytics</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('WorkflowTemplates', { leadId })}
          >
            <MaterialIcons name="template" size={20} color="#007AFF" />
            <Text style={styles.quickActionText}>Templates</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('WorkflowSettings', { leadId })}
          >
            <MaterialIcons name="settings" size={20} color="#007AFF" />
            <Text style={styles.quickActionText}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Workflow History */}
        <View style={styles.historySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('FullWorkflowHistory', { leadId })}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          <LeadWorkflowHistory
            history={workflowHistory}
            onWorkflowSelect={handleWorkflowOverride}
            maxItems={10}
          />
        </View>

        {/* Status Change Integration */}
        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>Lead Status Integration</Text>
          <Text style={styles.sectionDescription}>
            Changes to lead status will automatically affect associated workflows:
          </Text>

          <View style={styles.statusRules}>
            <View style={styles.statusRule}>
              <MaterialIcons name="cancel" size={20} color="#FF3B30" />
              <Text style={styles.statusRuleText}>
                <Text style={styles.statusRuleBold}>Closed/Lost:</Text> Cancels all active workflows
              </Text>
            </View>

            <View style={styles.statusRule}>
              <MaterialIcons name="pause" size={20} color="#FF9500" />
              <Text style={styles.statusRuleText}>
                <Text style={styles.statusRuleBold}>Lost:</Text> Pauses workflows for later resumption
              </Text>
            </View>

            <View style={styles.statusRule}>
              <MaterialIcons name="play-arrow" size={20} color="#34C759" />
              <Text style={styles.statusRuleText}>
                <Text style={styles.statusRuleBold}>Qualified/Contacted:</Text> Resumes paused workflows
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Workflow Override Modal */}
      <WorkflowOverrideModal
        visible={showOverrideModal}
        workflow={selectedWorkflow}
        onSubmit={handleOverrideSubmit}
        onCancel={() => {
          setShowOverrideModal(false);
          setSelectedWorkflow(null);
        }}
      />
    </View>
  );
};