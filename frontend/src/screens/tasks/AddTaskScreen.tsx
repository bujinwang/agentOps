// Add new task screen

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

import { TaskForm, TaskPriority, Lead } from '../../types';
import { apiService } from '../../services/api';
import { validateTaskForm, getErrorMessage, hasError } from '../../utils/validation';
import { useScreenLayout } from '../../hooks/useScreenLayout';

interface AddTaskScreenProps {
  route?: {
    params?: {
      leadId?: number;
      leadName?: string;
    };
  };
  navigation: any;
}

const AddTaskScreen: React.FC<AddTaskScreenProps> = ({ route, navigation }) => {
  const leadId = route?.params?.leadId;
  const leadName = route?.params?.leadName;
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
    leadId: leadId,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      const response = await apiService.getLeads({ limit: 100 });
      setLeads(response.data || []);
    } catch (error) {
      console.error('Error loading leads:', error);
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

      await apiService.createTask(formData);

      Alert.alert(
        'Success',
        'Task created successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create task';
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

  const taskTemplates = [
    { title: 'Follow up with client', description: 'Check in on lead progress and answer any questions' },
    { title: 'Send property listings', description: 'Curate and send relevant property listings' },
    { title: 'Schedule property viewing', description: 'Arrange showing for interested properties' },
    { title: 'Prepare CMA report', description: 'Create comparative market analysis' },
    { title: 'Call for mortgage pre-approval', description: 'Connect client with mortgage broker' },
    { title: 'Draft purchase agreement', description: 'Prepare offer documentation' },
  ];

  const useTemplate = (template: { title: string; description: string }) => {
    setFormData(prev => ({
      ...prev,
      title: template.title,
      description: template.description,
    }));
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        {leadName && (
          <View style={styles.linkedLeadHeader}>
            <Text style={styles.linkedLeadText}>📋 Creating task for: {leadName}</Text>
          </View>
        )}

        {/* Quick Templates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Templates</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.templatesContainer}>
              {taskTemplates.map((template, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.templateCard}
                  onPress={() => useTemplate(template)}
                >
                  <Text style={styles.templateTitle}>{template.title}</Text>
                  <Text style={styles.templateDescription} numberOfLines={2}>
                    {template.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

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

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Creating Task...' : 'Create Task'}
          </Text>
        </TouchableOpacity>

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
  scrollContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  linkedLeadHeader: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  linkedLeadText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '500',
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
  templatesContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  templateCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    width: 200,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  templateTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
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
  submitButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 32,
  },
});

export default AddTaskScreen;