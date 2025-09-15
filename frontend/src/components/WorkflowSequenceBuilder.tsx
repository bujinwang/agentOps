import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  FlatList
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export interface WorkflowStep {
  id: string;
  sequence: number;
  channel: 'email' | 'sms' | 'in_app';
  templateId: string;
  delayMinutes: number;
  conditions?: WorkflowCondition[];
  isActive: boolean;
}

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains';
  value: any;
  weight?: number;
}

interface WorkflowSequenceBuilderProps {
  steps: WorkflowStep[];
  onStepsChange: (steps: WorkflowStep[]) => void;
  onTemplateSelect: (stepId: string) => void;
  isVisible: boolean;
  onClose: () => void;
}

interface StepCardProps {
  step: WorkflowStep;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  drag: () => void;
  isActive: boolean;
}

const StepCard: React.FC<StepCardProps> = ({
  step,
  index,
  onEdit,
  onDelete,
  onToggleActive,
  drag,
  isActive
}) => {
  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return 'email';
      case 'sms': return 'sms';
      case 'in_app': return 'notifications';
      default: return 'message';
    }
  };

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'email': return '#2196F3';
      case 'sms': return '#4CAF50';
      case 'in_app': return '#FF9800';
      default: return '#666';
    }
  };

  const formatDelay = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`;
  };

  return (
    <View style={[styles.stepCard, !isActive && styles.stepCardInactive]}>
      <View style={styles.stepHeader}>
        <View style={styles.stepLeft}>
          <TouchableOpacity onLongPress={drag} style={styles.dragHandle}>
            <MaterialIcons name="drag-handle" size={20} color="#666" />
          </TouchableOpacity>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>{index + 1}</Text>
          </View>
        </View>

        <View style={styles.stepActions}>
          <TouchableOpacity onPress={onToggleActive} style={styles.actionButton}>
            <MaterialIcons
              name={isActive ? "visibility" : "visibility-off"}
              size={20}
              color={isActive ? "#4CAF50" : "#666"}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={onEdit} style={styles.actionButton}>
            <MaterialIcons name="edit" size={20} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
            <MaterialIcons name="delete" size={20} color="#ff4444" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.stepContent}>
        <View style={styles.stepInfo}>
          <View style={[styles.channelBadge, { backgroundColor: getChannelColor(step.channel) }]}>
            <MaterialIcons name={getChannelIcon(step.channel) as any} size={16} color="#fff" />
            <Text style={styles.channelText}>
              {step.channel.toUpperCase()}
            </Text>
          </View>

          <View style={styles.delayInfo}>
            <MaterialIcons name="schedule" size={16} color="#666" />
            <Text style={styles.delayText}>
              Delay: {formatDelay(step.delayMinutes)}
            </Text>
          </View>
        </View>

        <Text style={styles.templateId}>Template: {step.templateId}</Text>

        {step.conditions && step.conditions.length > 0 && (
          <View style={styles.conditionsContainer}>
            <Text style={styles.conditionsLabel}>Conditions:</Text>
            {step.conditions.map((condition, idx) => (
              <Text key={idx} style={styles.conditionText}>
                {condition.field} {condition.operator.replace('_', ' ')} {condition.value}
              </Text>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

interface StepEditorProps {
  step: WorkflowStep | null;
  onSave: (step: WorkflowStep) => void;
  onCancel: () => void;
  isVisible: boolean;
}

const StepEditor: React.FC<StepEditorProps> = ({ step, onSave, onCancel, isVisible }) => {
  const [channel, setChannel] = useState<'email' | 'sms' | 'in_app'>(step?.channel || 'email');
  const [templateId, setTemplateId] = useState(step?.templateId || '');
  const [delayMinutes, setDelayMinutes] = useState(step?.delayMinutes?.toString() || '0');
  const [isActive, setIsActive] = useState(step?.isActive ?? true);

  const handleSave = () => {
    if (!templateId.trim()) {
      Alert.alert('Validation Error', 'Please enter a template ID.');
      return;
    }

    const delay = parseInt(delayMinutes) || 0;
    if (delay < 0) {
      Alert.alert('Validation Error', 'Delay cannot be negative.');
      return;
    }

    const stepData: WorkflowStep = {
      id: step?.id || `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sequence: step?.sequence || 0,
      channel,
      templateId: templateId.trim(),
      delayMinutes: delay,
      conditions: step?.conditions || [],
      isActive
    };

    onSave(stepData);
  };

  const channels = [
    { key: 'email', label: 'Email', icon: 'email' },
    { key: 'sms', label: 'SMS', icon: 'sms' },
    { key: 'in_app', label: 'In-App', icon: 'notifications' }
  ];

  if (!isVisible) return null;

  return (
    <Modal visible={isVisible} animationType="slide" onRequestClose={onCancel}>
      <View style={styles.editorContainer}>
        <View style={styles.editorHeader}>
          <Text style={styles.editorTitle}>
            {step ? 'Edit Step' : 'Add Step'}
          </Text>
          <TouchableOpacity onPress={onCancel}>
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.editorContent}>
          {/* Channel Selection */}
          <View style={styles.editorSection}>
            <Text style={styles.sectionLabel}>Communication Channel</Text>
            <View style={styles.channelGrid}>
              {channels.map((ch) => (
                <TouchableOpacity
                  key={ch.key}
                  style={[
                    styles.channelOption,
                    channel === ch.key && styles.channelOptionSelected
                  ]}
                  onPress={() => setChannel(ch.key as 'email' | 'sms' | 'in_app')}
                >
                  <MaterialIcons name={ch.icon as any} size={24} color={channel === ch.key ? "#fff" : "#666"} />
                  <Text style={[
                    styles.channelOptionText,
                    channel === ch.key && styles.channelOptionTextSelected
                  ]}>
                    {ch.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Template Selection */}
          <View style={styles.editorSection}>
            <Text style={styles.sectionLabel}>Template ID</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter template ID"
              value={templateId}
              onChangeText={setTemplateId}
            />
          </View>

          {/* Delay Configuration */}
          <View style={styles.editorSection}>
            <Text style={styles.sectionLabel}>Delay (minutes)</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              value={delayMinutes}
              onChangeText={setDelayMinutes}
              keyboardType="numeric"
            />
            <Text style={styles.helperText}>
              Delay before this step executes after the previous step
            </Text>
          </View>

          {/* Active Status */}
          <View style={styles.editorSection}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setIsActive(!isActive)}
            >
              <View style={[styles.checkbox, isActive && styles.checkboxChecked]}>
                {isActive && <MaterialIcons name="check" size={16} color="#fff" />}
              </View>
              <Text style={styles.checkboxLabel}>Step is active</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={styles.editorFooter}>
          <TouchableOpacity
            style={[styles.editorButton, styles.cancelButton]}
            onPress={onCancel}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.editorButton, styles.saveButton]}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>Save Step</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const WorkflowSequenceBuilder: React.FC<WorkflowSequenceBuilderProps> = ({
  steps,
  onStepsChange,
  onTemplateSelect,
  isVisible,
  onClose
}) => {
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [showStepEditor, setShowStepEditor] = useState(false);

  const handleAddStep = () => {
    setEditingStep(null);
    setShowStepEditor(true);
  };

  const handleEditStep = (step: WorkflowStep) => {
    setEditingStep(step);
    setShowStepEditor(true);
  };

  const handleDeleteStep = (stepId: string) => {
    Alert.alert(
      'Delete Step',
      'Are you sure you want to delete this step?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedSteps = steps.filter(step => step.id !== stepId);
            onStepsChange(updatedSteps.map((step, index) => ({ ...step, sequence: index })));
          }
        }
      ]
    );
  };

  const handleToggleStepActive = (stepId: string) => {
    const updatedSteps = steps.map(step =>
      step.id === stepId ? { ...step, isActive: !step.isActive } : step
    );
    onStepsChange(updatedSteps);
  };

  const handleSaveStep = (stepData: WorkflowStep) => {
    let updatedSteps: WorkflowStep[];

    if (editingStep) {
      // Update existing step
      updatedSteps = steps.map(step =>
        step.id === editingStep.id ? { ...stepData, id: editingStep.id } : step
      );
    } else {
      // Add new step
      updatedSteps = [...steps, { ...stepData, sequence: steps.length }];
    }

    onStepsChange(updatedSteps);
    setShowStepEditor(false);
    setEditingStep(null);
  };

  const handleDragEnd = ({ data }: { data: WorkflowStep[] }) => {
    const updatedSteps = data.map((step, index) => ({ ...step, sequence: index }));
    onStepsChange(updatedSteps);
  };

  const renderStep = ({ item }: { item: WorkflowStep }) => (
    <StepCard
      step={item}
      index={item.sequence}
      onEdit={() => handleEditStep(item)}
      onDelete={() => handleDeleteStep(item.id)}
      onToggleActive={() => handleToggleStepActive(item.id)}
      drag={() => {}} // Placeholder for drag functionality
      isActive={true}
    />
  );

  const handleTestSequence = () => {
    if (steps.length === 0) {
      Alert.alert('No Steps', 'Add some steps to the sequence before testing.');
      return;
    }

    let totalDelay = 0;
    const testResults = steps.map((step, index) => {
      const stepDelay = totalDelay;
      totalDelay += step.delayMinutes;

      return {
        step: index + 1,
        channel: step.channel,
        template: step.templateId,
        delay: stepDelay,
        active: step.isActive
      };
    });

    Alert.alert(
      'Sequence Test Results',
      `Total steps: ${steps.length}\nTotal delay: ${totalDelay} minutes\n\n` +
      testResults.map(r =>
        `Step ${r.step}: ${r.channel.toUpperCase()} (${r.active ? 'Active' : 'Inactive'}) - Delay: ${r.delay}m`
      ).join('\n')
    );
  };

  if (!isVisible) return null;

  return (
    <Modal visible={isVisible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Workflow Sequence Builder</Text>
          <TouchableOpacity onPress={onClose}>
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.toolbar}>
          <TouchableOpacity
            style={[styles.toolbarButton, styles.primaryButton]}
            onPress={handleAddStep}
          >
            <MaterialIcons name="add" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Add Step</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolbarButton, styles.secondaryButton]}
            onPress={handleTestSequence}
          >
            <MaterialIcons name="play-arrow" size={20} color="#007AFF" />
            <Text style={styles.secondaryButtonText}>Test Sequence</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sequenceInfo}>
          <Text style={styles.sequenceText}>
            {steps.length} step{steps.length !== 1 ? 's' : ''} in sequence
          </Text>
          <Text style={styles.dragHint}>
            Long press and drag steps to reorder
          </Text>
        </View>

        <FlatList
          data={steps}
          keyExtractor={(item) => item.id}
          renderItem={renderStep}
          contentContainerStyle={styles.stepsList}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialIcons name="timeline" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>No steps in sequence</Text>
              <Text style={styles.emptyStateSubtext}>Add your first step to get started</Text>
            </View>
          }
        />

        <StepEditor
          step={editingStep}
          onSave={handleSaveStep}
          onCancel={() => setShowStepEditor(false)}
          isVisible={showStepEditor}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  toolbar: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  toolbarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  sequenceInfo: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f9f9f9',
  },
  sequenceText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  dragHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  stepsList: {
    padding: 16,
  },
  stepCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  stepCardInactive: {
    opacity: 0.6,
    borderColor: '#ccc',
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dragHandle: {
    padding: 4,
    marginRight: 8,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  stepContent: {
    flex: 1,
  },
  stepInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  channelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  channelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  delayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  delayText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  templateId: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  conditionsContainer: {
    marginTop: 8,
  },
  conditionsLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 4,
  },
  conditionText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  editorContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  editorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  editorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  editorContent: {
    flex: 1,
    padding: 16,
  },
  editorSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  channelGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  channelOption: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
    minWidth: 80,
  },
  channelOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  channelOptionText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  channelOptionTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
  },
  editorFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  editorButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
