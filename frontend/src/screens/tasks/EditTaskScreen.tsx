// Edit existing task screen

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

import { Task, TaskForm, TaskPriority, Lead } from '../../types';
import { apiService } from '../../services/api';
import { validateTaskForm, getErrorMessage, hasError } from '../../utils/validation';
import { useScreenLayout } from '../../hooks/useScreenLayout';
import { useLoadingState } from '../../utils/loadingState';
import { TaskDetailSkeleton } from '../../components/common/SkeletonCard';

interface EditTaskScreenProps {
  route: {
    params: {
      taskId: number;
    };
  };
  navigation: any;
}

const EditTaskScreen: React.FC<EditTaskScreenProps> = ({ route, navigation }) => {
  const { taskId } = route.params;
  const { containerStyle, contentStyle, responsive, theme } = useScreenLayout();

  const dynamicStyles = useMemo(() => ({
    input: { minHeight: responsive.getTouchTargetSize(48) },
    button: { minHeight: responsive.getTouchTargetSize(48) },
  }), [responsive]);

  const [formData, setFormData] = useState<TaskForm>({
    title: '',
    description: '',
    dueDate: '',
    priority: 'Medium',
    leadId: undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const loadingState = useLoadingState({ isLoading: true });

  useEffect(() => {
    loadTaskAndLeads();
  }, [taskId]);

  const loadTaskAndLeads = async () => {
    try {
      // Load task data
      const taskResponse = await apiService.getTaskWithLoading(taskId, {
        onStart: () => loadingState.startLoading('Loading task details…'),
        onComplete: loadingState.stopLoading,
        onError: (message) => loadingState.setError(message),
      });

      if (taskResponse?.data) {
        const task = taskResponse.data;
        setFormData({
          title: task.title,
          description: task.description || '',
          dueDate: task.dueDate || '',
          priority: task.priority as TaskPriority,
          leadId: task.leadId || undefined,
        });
      }

      // Load leads for dropdown
      const leadsResponse = await apiService.getLeads({ limit: 100 });
      setLeads(leadsResponse.data || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load task';
      loadingState.setError(message);
      Alert.alert('Error', message);
    }
  };

  const handleInputChange = (field: keyof TaskForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const validation = validateTaskForm(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      Alert.alert('Validation Error', 'Please fix the errors below');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrors({});

      await apiService.updateTask(taskId, {
        title: formData.title,
        description: formData.description || null,
        dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
        priority: formData.priority,
        leadId: formData.leadId || null,
      } as any);

      Alert.alert(
        'Success',
        'Task updated successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update task';
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateForInput = (dateString: string): string => {
    if (!dateString) return '';
    return dateString.split('T')[0]; // Extract YYYY-MM-DD from ISO string
  };

  const handleDateChange = (dateString: string) => {
    // Convert YYYY-MM-DD to ISO string for storage
    if (dateString) {
      const date = new Date(dateString);
      handleInputChange('dueDate', date.toISOString());
    } else {
      handleInputChange('dueDate', '');
    }
  };

  if (loadingState.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <TaskDetailSkeleton animated theme="auto" />
      </View>
    );
  }

  if (loadingState.error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Unable to load task</Text>
        <Text style={styles.errorMessage}>{loadingState.error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadTaskAndLeads}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Task Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Task Details</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={[styles.input, hasError(errors, 'title') && styles.inputError]}
              value={formData.title}
              onChangeText={(value) => handleInputChange('title', value)}
              placeholder="Task title"
              editable={!isSubmitting}
            />
            {hasError(errors, 'title') && (
              <Text style={styles.errorText}>
                {getErrorMessage(errors, 'title')}
              </Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(value) => handleInputChange('description', value)}
              placeholder="Task description and notes"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isSubmitting}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>Priority</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.priority}
                  onValueChange={(value) => handleInputChange('priority', value)}
                  enabled={!isSubmitting}
                  style={styles.picker}
                >
                  <Picker.Item label="High Priority" value="High" />
                  <Picker.Item label="Medium Priority" value="Medium" />
                  <Picker.Item label="Low Priority" value="Low" />
                </Picker>
              </View>
            </View>

            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>Due Date</Text>
              <TextInput
                style={styles.input}
                value={formatDateForInput(formData.dueDate || '')}
                onChangeText={handleDateChange}
                placeholder="YYYY-MM-DD"
                editable={!isSubmitting}
              />
            </View>
          </View>
        </View>

        {/* Link to Lead */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Link to Lead (Optional)</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Associated Lead</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.leadId}
                onValueChange={(value) => handleInputChange('leadId', value)}
                enabled={!isSubmitting}
                style={styles.picker}
              >
                <Picker.Item label="No lead selected" value={undefined} />
                {leads.map((lead) => (
                  <Picker.Item
                    key={lead.leadId}
                    label={`${lead.firstName} ${lead.lastName} - ${lead.email}`}
                    value={lead.leadId}
                  />
                ))}
              </Picker>
            </View>
            <Text style={styles.helperText}>
              Link this task to a specific lead for better organization
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Updating Task...' : 'Update Task'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={isSubmitting}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#d32f2f',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    flex: 0.48,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#f44336',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 4,
  },
  buttonContainer: {
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 32,
  },
});

export default EditTaskScreen;
