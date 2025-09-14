import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Text,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import MaterialTextField from '../../components/MaterialTextField';
import MaterialSnackbar from '../../components/MaterialSnackbar';
import { useTheme } from '../../contexts/ThemeContext';
import { apiService } from '../../services/api';
import {
  MaterialColors,
  MaterialSpacing,
  MaterialTypography,
  MaterialShape
} from '../../styles/MaterialDesign';

interface Template {
  template_id?: number;
  name: string;
  type: 'email' | 'sms';
  subject?: string;
  content: string;
  variables: Record<string, string>;
  is_default?: boolean;
}

interface RouteParams {
  templateId?: number;
  templateType?: 'email' | 'sms';
}

const TemplateEditorScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const params = route.params as RouteParams;

  const [template, setTemplate] = useState<Template>({
    name: '',
    type: params?.templateType || 'email',
    subject: '',
    content: '',
    variables: {},
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, string>>({});
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    if (params?.templateId) {
      loadTemplate(params.templateId);
    }
  }, [params?.templateId]);

  const loadTemplate = async (templateId: number) => {
    try {
      setLoading(true);
      const response = await apiService.getTemplate(templateId);
      setTemplate(response.data);
    } catch (error) {
      console.error('Error loading template:', error);
      showSnackbar('Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const handleSave = async () => {
    if (!template.name.trim() || !template.content.trim()) {
      Alert.alert('Validation Error', 'Name and content are required');
      return;
    }

    if (template.type === 'email' && !template.subject?.trim()) {
      Alert.alert('Validation Error', 'Subject is required for email templates');
      return;
    }

    try {
      setSaving(true);
      const templateData = {
        ...template,
        variables: template.variables,
      };

      if (template.template_id) {
        await apiService.updateTemplate(template.template_id, templateData);
        showSnackbar('Template updated successfully');
      } else {
        await apiService.createTemplate(templateData);
        showSnackbar('Template created successfully');
        navigation.goBack();
      }
    } catch (error: any) {
      console.error('Error saving template:', error);
      const errorMessage = error.response?.data?.message || 'Failed to save template';
      Alert.alert('Save Error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    try {
      const response = await apiService.previewTemplate(template.template_id!, previewData);
      Alert.alert('Template Preview', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.error('Error previewing template:', error);
      Alert.alert('Preview Error', 'Failed to preview template');
    }
  };

  const addVariable = () => {
    const newVar = `variable${Object.keys(template.variables).length + 1}`;
    setTemplate(prev => ({
      ...prev,
      variables: {
        ...prev.variables,
        [newVar]: 'Description',
      },
    }));
  };

  const updateVariable = (key: string, description: string) => {
    setTemplate(prev => ({
      ...prev,
      variables: {
        ...prev.variables,
        [key]: description,
      },
    }));
  };

  const removeVariable = (key: string) => {
    setTemplate(prev => {
      const newVariables = { ...prev.variables };
      delete newVariables[key];
      return {
        ...prev,
        variables: newVariables,
      };
    });
  };

  const insertVariable = (variable: string) => {
    const variableTag = `{{${variable}}}`;
    setTemplate(prev => ({
      ...prev,
      content: prev.content + variableTag,
    }));
  };

  const renderVariableChips = () => {
    return Object.entries(template.variables).map(([key, description]) => (
      <TouchableOpacity
        key={key}
        style={styles.variableChip}
        onPress={() => insertVariable(key)}
      >
        <Text style={styles.variableChipText}>{`${key}: ${description}`}</Text>
      </TouchableOpacity>
    ));
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.card}>
          <MaterialTextField
            label="Template Name"
            value={template.name}
            onChangeText={(text) => setTemplate(prev => ({ ...prev, name: text }))}
            placeholder="Enter template name"
          />

          <View style={styles.typeContainer}>
            <TouchableOpacity
              style={[styles.typeButton, template.type === 'email' && styles.typeButtonSelected]}
              onPress={() => setTemplate(prev => ({ ...prev, type: 'email' }))}
            >
              <Text style={[styles.typeButtonText, template.type === 'email' && styles.typeButtonTextSelected]}>
                Email
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, template.type === 'sms' && styles.typeButtonSelected]}
              onPress={() => setTemplate(prev => ({ ...prev, type: 'sms' }))}
            >
              <Text style={[styles.typeButtonText, template.type === 'sms' && styles.typeButtonTextSelected]}>
                SMS
              </Text>
            </TouchableOpacity>
          </View>

          {template.type === 'email' && (
            <MaterialTextField
              label="Email Subject"
              value={template.subject || ''}
              onChangeText={(text) => setTemplate(prev => ({ ...prev, subject: text }))}
              placeholder="Enter email subject"
            />
          )}

          <MaterialTextField
            label="Content"
            value={template.content}
            onChangeText={(text) => setTemplate(prev => ({ ...prev, content: text }))}
            placeholder="Enter template content"
            multiline
            numberOfLines={6}
          />

          <View style={styles.variablesSection}>
            <Text style={styles.sectionTitle}>Template Variables</Text>
            <Text style={styles.sectionSubtitle}>Click chips below to insert variables</Text>

            <View style={styles.variableChips}>
              {renderVariableChips()}
              <TouchableOpacity
                style={styles.addVariableChip}
                onPress={addVariable}
              >
                <Text style={styles.addVariableChipText}>+ Add Variable</Text>
              </TouchableOpacity>
            </View>
          </View>

          {template.template_id && (
            <View style={styles.previewSection}>
              <Text style={styles.sectionTitle}>Preview</Text>
              <MaterialTextField
                label="Preview Data (JSON)"
                value={JSON.stringify(previewData, null, 2)}
                onChangeText={(text) => {
                  try {
                    setPreviewData(JSON.parse(text));
                  } catch (error) {
                    // Invalid JSON, ignore
                  }
                }}
                placeholder='{"first_name": "John", "last_name": "Doe"}'
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={styles.previewButton}
                onPress={handlePreview}
              >
                <Text style={styles.previewButtonText}>Preview Template</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save Template'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {snackbarVisible && (
        <View style={styles.snackbar}>
          <Text style={styles.snackbarText}>{snackbarMessage}</Text>
          <TouchableOpacity onPress={() => setSnackbarVisible(false)}>
            <Text style={styles.snackbarDismiss}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  },
  card: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  typeContainer: {
    flexDirection: 'row',
    marginVertical: 16,
    gap: 8,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  typeButtonSelected: {
    backgroundColor: MaterialColors.primary[500],
    borderColor: MaterialColors.primary[500],
  },
  typeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  typeButtonTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  variablesSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  variableChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  variableChip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  variableChipText: {
    fontSize: 14,
    color: '#333',
  },
  addVariableChip: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  addVariableChipText: {
    fontSize: 14,
    color: 'white',
    fontWeight: 'bold',
  },
  previewSection: {
    marginTop: 16,
  },
  previewButton: {
    backgroundColor: MaterialColors.secondary[500],
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  previewButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonContainer: {
    padding: 16,
  },
  saveButton: {
    backgroundColor: MaterialColors.primary[500],
    padding: 16,
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
  snackbar: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    backgroundColor: '#333',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  snackbarText: {
    color: 'white',
    fontSize: 14,
    flex: 1,
  },
  snackbarDismiss: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 16,
  },
});

export default TemplateEditorScreen;