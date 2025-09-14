import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  FlatList
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  CommunicationTemplate,
  TemplateVariable,
  TemplateCondition,
  TemplatePreview,
  TemplateValidationResult
} from '../types/communication';
import { templateService } from '../services/templateService';
import { useCommunicationTemplates } from '../hooks/useCommunicationTemplates';

interface TemplateEditorProps {
  template?: CommunicationTemplate;
  onSave: (template: Omit<CommunicationTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
  isVisible: boolean;
}

interface VariableInputProps {
  variable: TemplateVariable;
  onUpdate: (variable: TemplateVariable) => void;
  onRemove: () => void;
}

const VariableInput: React.FC<VariableInputProps> = ({ variable, onUpdate, onRemove }) => {
  const [name, setName] = useState(variable.name);
  const [type, setType] = useState(variable.type);
  const [description, setDescription] = useState(variable.description);
  const [required, setRequired] = useState(variable.required);
  const [defaultValue, setDefaultValue] = useState(variable.defaultValue?.toString() || '');

  const handleUpdate = useCallback(() => {
    const updatedVariable: TemplateVariable = {
      name,
      type: type as TemplateVariable['type'],
      description,
      required,
      defaultValue: defaultValue || undefined
    };
    onUpdate(updatedVariable);
  }, [name, type, description, required, defaultValue, onUpdate]);

  useEffect(() => {
    handleUpdate();
  }, [handleUpdate]);

  return (
    <View style={styles.variableContainer}>
      <View style={styles.variableHeader}>
        <Text style={styles.variableTitle}>Variable: {name}</Text>
        <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
          <MaterialIcons name="delete" size={20} color="#ff4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.variableRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Variable name"
          value={name}
          onChangeText={setName}
        />
        <View style={styles.typePicker}>
          <Text style={styles.typeLabel}>Type:</Text>
          {['string', 'number', 'boolean', 'date'].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeOption, type === t && styles.typeOptionSelected]}
              onPress={() => setType(t as TemplateVariable['type'])}
            >
              <Text style={[styles.typeText, type === t && styles.typeTextSelected]}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
      />

      <View style={styles.variableRow}>
        <TouchableOpacity
          style={[styles.checkbox, required && styles.checkboxChecked]}
          onPress={() => setRequired(!required)}
        >
          {required && <MaterialIcons name="check" size={16} color="#fff" />}
        </TouchableOpacity>
        <Text style={styles.checkboxLabel}>Required</Text>

        <TextInput
          style={[styles.input, { flex: 1, marginLeft: 10 }]}
          placeholder="Default value (optional)"
          value={defaultValue}
          onChangeText={setDefaultValue}
        />
      </View>
    </View>
  );
};

const TemplateEditor: React.FC<TemplateEditorProps> = ({
  template,
  onSave,
  onCancel,
  isVisible
}) => {
  const [name, setName] = useState(template?.name || '');
  const [category, setCategory] = useState(template?.category || '');
  const [subjectTemplate, setSubjectTemplate] = useState(template?.subjectTemplate || '');
  const [contentTemplate, setContentTemplate] = useState(template?.contentTemplate || '');
  const [variables, setVariables] = useState<Record<string, TemplateVariable>>(template?.variables || {});
  const [conditions, setConditions] = useState<TemplateCondition[]>(template?.conditions || []);
  const [isActive, setIsActive] = useState(template?.isActive ?? true);
  const [showPreview, setShowPreview] = useState(false);
  const [preview, setPreview] = useState<TemplatePreview | null>(null);
  const [validation, setValidation] = useState<TemplateValidationResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { generatePreview, validateTemplate } = useCommunicationTemplates();

  const categories = [
    'onboarding',
    'followup',
    'engagement',
    'nurturing',
    'closing',
    'retention',
    'reactivation'
  ];

  const handleAddVariable = useCallback(() => {
    const newVarName = `var${Object.keys(variables).length + 1}`;
    const newVariable: TemplateVariable = {
      name: newVarName,
      type: 'string',
      description: '',
      required: false
    };
    setVariables(prev => ({ ...prev, [newVarName]: newVariable }));
  }, [variables]);

  const handleUpdateVariable = useCallback((oldName: string, updatedVariable: TemplateVariable) => {
    setVariables(prev => {
      const newVars = { ...prev };
      delete newVars[oldName];
      newVars[updatedVariable.name] = updatedVariable;
      return newVars;
    });
  }, []);

  const handleRemoveVariable = useCallback((varName: string) => {
    setVariables(prev => {
      const newVars = { ...prev };
      delete newVars[varName];
      return newVars;
    });
  }, []);

  const handleInsertVariable = useCallback((varName: string) => {
    const cursorPosition = contentTemplate.length;
    const beforeCursor = contentTemplate.slice(0, cursorPosition);
    const afterCursor = contentTemplate.slice(cursorPosition);
    const variableText = `{{${varName}}}`;

    setContentTemplate(beforeCursor + variableText + afterCursor);
  }, [contentTemplate]);

  const handlePreview = useCallback(() => {
    const templateData: CommunicationTemplate = {
      id: template?.id || 0,
      name,
      category,
      subjectTemplate: subjectTemplate || undefined,
      contentTemplate,
      variables,
      conditions,
      isActive,
      createdAt: template?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const previewResult = templateService.generatePreview(templateData);
    setPreview(previewResult);
    setShowPreview(true);
  }, [name, category, subjectTemplate, contentTemplate, variables, conditions, isActive, template]);

  const handleValidate = useCallback(() => {
    const templateData: CommunicationTemplate = {
      id: template?.id || 0,
      name,
      category,
      subjectTemplate: subjectTemplate || undefined,
      contentTemplate,
      variables,
      conditions,
      isActive,
      createdAt: template?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const validationResult = templateService.validateTemplate(templateData);
    setValidation(validationResult);

    if (!validationResult.isValid) {
      Alert.alert(
        'Validation Errors',
        validationResult.errors.join('\n'),
        [{ text: 'OK' }]
      );
    }
  }, [name, category, subjectTemplate, contentTemplate, variables, conditions, isActive, template]);

  const handleSave = useCallback(async () => {
    // Validate before saving
    const templateData: CommunicationTemplate = {
      id: template?.id || 0,
      name,
      category,
      subjectTemplate: subjectTemplate || undefined,
      contentTemplate,
      variables,
      conditions,
      isActive,
      createdAt: template?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const validationResult = templateService.validateTemplate(templateData);
    if (!validationResult.isValid) {
      Alert.alert(
        'Cannot Save',
        'Please fix validation errors before saving:\n\n' + validationResult.errors.join('\n'),
        [{ text: 'OK' }]
      );
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        name,
        category,
        subjectTemplate: subjectTemplate || undefined,
        contentTemplate,
        variables,
        conditions,
        isActive
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to save template');
    } finally {
      setIsSaving(false);
    }
  }, [name, category, subjectTemplate, contentTemplate, variables, conditions, isActive, template, onSave]);

  const renderVariableList = () => (
    <View style={styles.variablesSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Template Variables</Text>
        <TouchableOpacity onPress={handleAddVariable} style={styles.addButton}>
          <MaterialIcons name="add" size={20} color="#007AFF" />
          <Text style={styles.addButtonText}>Add Variable</Text>
        </TouchableOpacity>
      </View>

      {Object.entries(variables).map(([varName, variable]) => (
        <VariableInput
          key={varName}
          variable={variable}
          onUpdate={(updated) => handleUpdateVariable(varName, updated)}
          onRemove={() => handleRemoveVariable(varName)}
        />
      ))}

      {Object.keys(variables).length === 0 && (
        <Text style={styles.emptyText}>No variables defined. Add variables to personalize your template.</Text>
      )}
    </View>
  );

  const renderPreviewModal = () => (
    <Modal visible={showPreview} animationType="slide" onRequestClose={() => setShowPreview(false)}>
      <View style={styles.previewContainer}>
        <View style={styles.previewHeader}>
          <Text style={styles.previewTitle}>Template Preview</Text>
          <TouchableOpacity onPress={() => setShowPreview(false)}>
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.previewContent}>
          {preview?.subject && (
            <View style={styles.previewSection}>
              <Text style={styles.previewLabel}>Subject:</Text>
              <Text style={styles.previewText}>{preview.subject}</Text>
            </View>
          )}

          <View style={styles.previewSection}>
            <Text style={styles.previewLabel}>Content:</Text>
            <Text style={styles.previewText}>{preview.content}</Text>
          </View>

          {preview?.validationErrors.length > 0 && (
            <View style={styles.previewSection}>
              <Text style={styles.previewErrorLabel}>Errors:</Text>
              {preview.validationErrors.map((error, index) => (
                <Text key={index} style={styles.previewErrorText}>• {error}</Text>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );

  if (!isVisible) return null;

  return (
    <Modal visible={isVisible} animationType="slide" onRequestClose={onCancel}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {template ? 'Edit Template' : 'Create Template'}
          </Text>
          <TouchableOpacity onPress={onCancel}>
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <TextInput
              style={styles.input}
              placeholder="Template name"
              value={name}
              onChangeText={setName}
            />

            <View style={styles.categoryPicker}>
              <Text style={styles.categoryLabel}>Category:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryOption, category === cat && styles.categorySelected]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[styles.categoryText, category === cat && styles.categoryTextSelected]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.checkboxRow}>
              <TouchableOpacity
                style={[styles.checkbox, isActive && styles.checkboxChecked]}
                onPress={() => setIsActive(!isActive)}
              >
                {isActive && <MaterialIcons name="check" size={16} color="#fff" />}
              </TouchableOpacity>
              <Text style={styles.checkboxLabel}>Active</Text>
            </View>
          </View>

          {/* Subject Template */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Subject Template (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter subject template..."
              value={subjectTemplate}
              onChangeText={setSubjectTemplate}
              multiline
            />
          </View>

          {/* Content Template */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Content Template</Text>
              <View style={styles.variableButtons}>
                {Object.keys(variables).map((varName) => (
                  <TouchableOpacity
                    key={varName}
                    style={styles.variableButton}
                    onPress={() => handleInsertVariable(varName)}
                  >
                    <Text style={styles.variableButtonText}>{varName}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TextInput
              style={[styles.input, styles.contentInput]}
              placeholder="Enter your template content here... Use {{variableName}} to insert variables."
              value={contentTemplate}
              onChangeText={setContentTemplate}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Variables */}
          {renderVariableList()}

          {/* Validation Results */}
          {validation && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Validation</Text>
              {validation.errors.length > 0 && (
                <View style={styles.validationSection}>
                  <Text style={styles.validationTitle}>Errors:</Text>
                  {validation.errors.map((error, index) => (
                    <Text key={index} style={styles.errorText}>• {error}</Text>
                  ))}
                </View>
              )}
              {validation.warnings.length > 0 && (
                <View style={styles.validationSection}>
                  <Text style={styles.validationTitle}>Warnings:</Text>
                  {validation.warnings.map((warning, index) => (
                    <Text key={index} style={styles.warningText}>• {warning}</Text>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleValidate}
          >
            <Text style={styles.secondaryButtonText}>Validate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handlePreview}
          >
            <Text style={styles.secondaryButtonText}>Preview</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onCancel}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton, isSaving && styles.disabledButton]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={[styles.primaryButtonText, isSaving && styles.disabledText]}>
              {isSaving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Preview Modal */}
        {renderPreviewModal()}
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
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  contentInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  categoryPicker: {
    marginBottom: 12,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  categorySelected: {
    backgroundColor: '#007AFF',
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
  },
  categoryTextSelected: {
    color: '#fff',
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
  variablesSection: {
    marginTop: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  addButtonText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 4,
  },
  variableContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
  },
  variableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  variableTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  removeButton: {
    padding: 4,
  },
  variableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  typePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  typeLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  typeOption: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    marginRight: 4,
  },
  typeOptionSelected: {
    backgroundColor: '#007AFF',
  },
  typeText: {
    fontSize: 12,
    color: '#666',
  },
  typeTextSelected: {
    color: '#fff',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  variableButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  variableButton: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 4,
    marginBottom: 4,
  },
  variableButtonText: {
    fontSize: 12,
    color: '#333',
  },
  validationSection: {
    marginTop: 8,
  },
  validationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#ff4444',
    marginBottom: 2,
  },
  warningText: {
    fontSize: 14,
    color: '#ff8800',
    marginBottom: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#ff4444',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  disabledText: {
    color: '#999',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  previewContent: {
    flex: 1,
    padding: 16,
  },
  previewSection: {
    marginBottom: 16,
  },
  previewLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  previewText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  previewErrorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff4444',
    marginBottom: 8,
  },
  previewErrorText: {
    fontSize: 14,
    color: '#ff4444',
    marginBottom: 4,
  },
});

export default TemplateEditor;