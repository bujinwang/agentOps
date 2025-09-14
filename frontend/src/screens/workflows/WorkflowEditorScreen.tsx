import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
} from 'react-native';
import MaterialTextField from '../../components/MaterialTextField';
import { MaterialColors, MaterialSpacing, MaterialTypography } from '../../styles/MaterialDesign';
import { apiService } from '../../services/api';

interface Workflow {
  workflow_id?: number;
  name: string;
  description: string;
  trigger_score_min: number;
  trigger_score_max: number | null;
  is_active: boolean;
}

interface Sequence {
  sequence_id?: number;
  step_number: number;
  action_type: 'email' | 'sms' | 'task' | 'notification';
  template_id?: number;
  delay_hours: number;
  is_active: boolean;
}

const WorkflowEditorScreen: React.FC = () => {
  const [workflow, setWorkflow] = useState<Workflow>({
    name: '',
    description: '',
    trigger_score_min: 70,
    trigger_score_max: null,
    is_active: true,
  });

  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!workflow.name.trim() || !workflow.description.trim()) {
      Alert.alert('Validation Error', 'Name and description are required');
      return;
    }

    if (workflow.trigger_score_min < 0 || workflow.trigger_score_min > 100) {
      Alert.alert('Validation Error', 'Trigger score must be between 0 and 100');
      return;
    }

    try {
      setSaving(true);
      const workflowData = {
        ...workflow,
        sequences: sequences,
      };

      if (workflow.workflow_id) {
        await apiService.updateWorkflow(workflow.workflow_id, workflowData);
        Alert.alert('Success', 'Workflow updated successfully');
      } else {
        await apiService.createWorkflow(workflowData);
        Alert.alert('Success', 'Workflow created successfully');
      }
    } catch (error: any) {
      console.error('Error saving workflow:', error);
      const errorMessage = error.response?.data?.message || 'Failed to save workflow';
      Alert.alert('Save Error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const addSequence = () => {
    const newSequence: Sequence = {
      step_number: sequences.length + 1,
      action_type: 'email',
      delay_hours: 0,
      is_active: true,
    };
    setSequences([...sequences, newSequence]);
  };

  const updateSequence = (index: number, updates: Partial<Sequence>) => {
    const updatedSequences = [...sequences];
    updatedSequences[index] = { ...updatedSequences[index], ...updates };
    setSequences(updatedSequences);
  };

  const removeSequence = (index: number) => {
    const updatedSequences = sequences.filter((_, i) => i !== index);
    // Re-number the remaining sequences
    updatedSequences.forEach((seq, i) => {
      seq.step_number = i + 1;
    });
    setSequences(updatedSequences);
  };

  const renderSequenceCard = (sequence: Sequence, index: number) => (
    <View key={index} style={styles.sequenceCard}>
      <View style={styles.sequenceHeader}>
        <Text style={styles.sequenceTitle}>Step {sequence.step_number}</Text>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeSequence(index)}
        >
          <Text style={styles.removeButtonText}>Remove</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sequenceContent}>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Action Type:</Text>
          <View style={styles.actionTypeContainer}>
            {(['email', 'sms', 'task', 'notification'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.actionTypeButton,
                  sequence.action_type === type && styles.actionTypeButtonSelected
                ]}
                onPress={() => updateSequence(index, { action_type: type })}
              >
                <Text style={[
                  styles.actionTypeButtonText,
                  sequence.action_type === type && styles.actionTypeButtonTextSelected
                ]}>
                  {type.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {(sequence.action_type === 'email' || sequence.action_type === 'sms') && (
          <MaterialTextField
            label="Template ID"
            value={sequence.template_id?.toString() || ''}
            onChangeText={(text) => updateSequence(index, { template_id: parseInt(text) || undefined })}
            placeholder="Enter template ID"
            keyboardType="number-pad"
          />
        )}

        <MaterialTextField
          label="Delay Hours"
          value={sequence.delay_hours.toString()}
          onChangeText={(text) => updateSequence(index, { delay_hours: parseInt(text) || 0 })}
          placeholder="Hours to wait before this step"
          keyboardType="number-pad"
        />
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <MaterialTextField
          label="Workflow Name"
          value={workflow.name}
          onChangeText={(text) => setWorkflow(prev => ({ ...prev, name: text }))}
          placeholder="Enter workflow name"
        />

        <MaterialTextField
          label="Description"
          value={workflow.description}
          onChangeText={(text) => setWorkflow(prev => ({ ...prev, description: text }))}
          placeholder="Describe what this workflow does"
          multiline
          numberOfLines={3}
        />

        <View style={styles.scoreContainer}>
          <MaterialTextField
            label="Min Trigger Score"
            value={workflow.trigger_score_min.toString()}
            onChangeText={(text) => setWorkflow(prev => ({
              ...prev,
              trigger_score_min: parseInt(text) || 0
            }))}
            placeholder="Minimum score to trigger"
            keyboardType="number-pad"
          />

          <MaterialTextField
            label="Max Trigger Score (Optional)"
            value={workflow.trigger_score_max?.toString() || ''}
            onChangeText={(text) => setWorkflow(prev => ({
              ...prev,
              trigger_score_max: text ? parseInt(text) : null
            }))}
            placeholder="Maximum score (leave empty for no max)"
            keyboardType="number-pad"
          />
        </View>

        <View style={styles.activeContainer}>
          <TouchableOpacity
            style={[styles.activeButton, workflow.is_active && styles.activeButtonSelected]}
            onPress={() => setWorkflow(prev => ({ ...prev, is_active: !prev.is_active }))}
          >
            <Text style={[styles.activeButtonText, workflow.is_active && styles.activeButtonTextSelected]}>
              {workflow.is_active ? 'Active' : 'Inactive'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sequencesSection}>
        <View style={styles.sequencesHeader}>
          <Text style={styles.sectionTitle}>Workflow Sequences</Text>
          <TouchableOpacity
            style={styles.addSequenceButton}
            onPress={addSequence}
          >
            <Text style={styles.addSequenceButtonText}>+ Add Step</Text>
          </TouchableOpacity>
        </View>

        {sequences.length === 0 ? (
          <View style={styles.emptySequences}>
            <Text style={styles.emptyText}>No sequences defined</Text>
            <Text style={styles.emptySubtext}>Add steps to define what happens when the workflow triggers</Text>
          </View>
        ) : (
          sequences.map(renderSequenceCard)
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save Workflow'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: MaterialSpacing.md,
  },
  card: {
    backgroundColor: 'white',
    padding: MaterialSpacing.md,
    marginBottom: MaterialSpacing.md,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreContainer: {
    flexDirection: 'row',
    gap: MaterialSpacing.md,
  },
  activeContainer: {
    marginTop: MaterialSpacing.md,
  },
  activeButton: {
    padding: MaterialSpacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: MaterialColors.neutral[300],
    alignItems: 'center',
  },
  activeButtonSelected: {
    backgroundColor: MaterialColors.secondary[500],
    borderColor: MaterialColors.secondary[500],
  },
  activeButtonText: {
    color: MaterialColors.neutral[700],
    fontWeight: 'bold',
  },
  activeButtonTextSelected: {
    color: 'white',
  },
  sequencesSection: {
    marginBottom: MaterialSpacing.xl,
  },
  sequencesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: MaterialSpacing.md,
  },
  sectionTitle: {
    ...MaterialTypography.headlineSmall,
    color: MaterialColors.neutral[900],
  },
  addSequenceButton: {
    backgroundColor: MaterialColors.primary[500],
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.sm,
    borderRadius: 8,
  },
  addSequenceButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  emptySequences: {
    backgroundColor: 'white',
    padding: MaterialSpacing.xl,
    borderRadius: 12,
    alignItems: 'center',
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
  sequenceCard: {
    backgroundColor: 'white',
    padding: MaterialSpacing.md,
    marginBottom: MaterialSpacing.md,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sequenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: MaterialSpacing.md,
  },
  sequenceTitle: {
    ...MaterialTypography.titleMedium,
    color: MaterialColors.neutral[900],
  },
  removeButton: {
    backgroundColor: MaterialColors.error[500],
    paddingHorizontal: MaterialSpacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  removeButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sequenceContent: {
    gap: MaterialSpacing.md,
  },
  fieldRow: {
    marginBottom: MaterialSpacing.md,
  },
  fieldLabel: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[700],
    marginBottom: MaterialSpacing.xs,
  },
  actionTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: MaterialSpacing.sm,
  },
  actionTypeButton: {
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: MaterialColors.neutral[300],
  },
  actionTypeButtonSelected: {
    backgroundColor: MaterialColors.primary[500],
    borderColor: MaterialColors.primary[500],
  },
  actionTypeButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: MaterialColors.neutral[700],
  },
  actionTypeButtonTextSelected: {
    color: 'white',
  },
  buttonContainer: {
    padding: MaterialSpacing.md,
  },
  saveButton: {
    backgroundColor: MaterialColors.primary[500],
    padding: MaterialSpacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default WorkflowEditorScreen;