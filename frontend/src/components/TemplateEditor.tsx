import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { CommunicationTemplate, TemplateVariable, TemplateCategory, CommunicationChannel, TemplateStatus } from '../types/template';
import { templateRenderingService } from '../services/templateRenderingService';
import { templateVariableService } from '../services/templateVariableService';

const { width: screenWidth } = Dimensions.get('window');

// Template categories and communication channels constants
const TEMPLATE_CATEGORIES = {
  initial_contact: { name: 'Initial Contact', icon: 'handshake' },
  follow_up: { name: 'Follow-up', icon: 'clock' },
  property_showing: { name: 'Property Showing', icon: 'home' },
  proposal: { name: 'Proposal', icon: 'file-text' },
  negotiation: { name: 'Negotiation', icon: 'scale' },
  closing: { name: 'Closing', icon: 'trophy' },
  thank_you: { name: 'Thank You', icon: 'heart' },
  nurturing: { name: 'Nurturing', icon: 'seedling' },
  re_engagement: { name: 'Re-engagement', icon: 'refresh' },
};

const COMMUNICATION_CHANNELS = {
  email: { name: 'Email', icon: 'mail' },
  sms: { name: 'SMS', icon: 'message-square' },
  in_app: { name: 'In-App', icon: 'smartphone' },
  push: { name: 'Push', icon: 'bell' },
};

interface TemplateEditorProps {
  template?: CommunicationTemplate;
  onSave: (template: CommunicationTemplate) => void;
  onCancel: () => void;
  isNew?: boolean;
}

interface DragItem {
  id: string;
  type: 'text' | 'variable' | 'image';
  content: string;
  position: { x: number; y: number };
}

export const TemplateEditor: React.FC<TemplateEditorProps> = ({
  template,
  onSave,
  onCancel,
  isNew = false,
}) => {
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [category, setCategory] = useState<TemplateCategory>(template?.category || 'initial_contact');
  const [channel, setChannel] = useState<CommunicationChannel>(template?.channel || 'email');
  const [subject, setSubject] = useState(template?.subject || '');
  const [content, setContent] = useState(template?.content || '');
  const [selectedVariable, setSelectedVariable] = useState<TemplateVariable | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [dragItems, setDragItems] = useState<DragItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);

  const scrollViewRef = useRef<ScrollView>(null);
  const contentInputRef = useRef<TextInput>(null);

  // Memoize available variables to prevent unnecessary recalculations
  const availableVariables = useMemo(() => {
    const allVariables = templateVariableService.getAllVariableDefinitions();
    return allVariables.filter(variable => {
      // Filter variables based on channel appropriateness
      if (channel === 'sms') {
        // For SMS, prefer shorter, essential variables
        return variable.category !== 'Property Details' || variable.name === 'propertyAddress';
      }
      // For email and in-app, include all variables
      return true;
    }).map(variable => ({
      id: variable.name,
      name: variable.name,
      displayName: variable.description,
      type: variable.type,
      source: variable.source,
      description: variable.description,
      required: variable.required,
      fallback: variable.fallback,
      validation: variable.validation,
      examples: variable.examples,
      category: variable.category
    }));
  }, [channel]);

  useEffect(() => {
    if (template?.content) {
      setContent(template.content);
      setCursorPosition(template.content.length);
    }
  }, [template]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Cleanup any subscriptions or timers if needed
      setDragItems([]);
      setIsDragging(false);
    };
  }, []);

  // Validate state consistency
  useEffect(() => {
    // Ensure cursor position is within content bounds
    if (cursorPosition > content.length) {
      setCursorPosition(content.length);
    }
    if (cursorPosition < 0) {
      setCursorPosition(0);
    }
  }, [content, cursorPosition]);

  const handlePreview = async () => {
    // Validate required fields before preview
    if (!content.trim()) {
      Alert.alert('Validation Error', 'Please enter template content before previewing');
      return;
    }

    if (channel === 'email' && !subject.trim()) {
      Alert.alert('Validation Error', 'Email templates require a subject for preview');
      return;
    }

    try {
      const templateData = {
        id: template?.id || 'preview',
        name: name.trim() || 'Preview Template',
        description: description.trim(),
        category,
        channel,
        status: 'draft',
        subject: channel === 'email' ? subject.trim() : undefined,
        content: content.trim(),
        variables: availableVariables,
        conditions: template?.conditions || [],
        tags: template?.tags || [],
        priority: template?.priority || 1,
        isDefault: template?.isDefault || false,
        createdBy: template?.createdBy || 1,
        updatedBy: 1,
        createdAt: template?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        currentVersion: {
          id: template?.currentVersion?.id || '1',
          version: template?.currentVersion?.version || 1,
          templateId: template?.id || 'preview',
          content: content.trim(),
          subject: channel === 'email' ? subject.trim() : undefined,
          variables: availableVariables,
          conditions: template?.conditions || [],
          createdBy: template?.createdBy || 1,
          createdAt: template?.createdAt || new Date().toISOString(),
          changeLog: 'Preview version',
          isActive: true,
        },
        versions: template?.versions || [],
      };

      const result = await templateRenderingService.previewTemplate(templateData as CommunicationTemplate);

      if (!result || !result.content) {
        throw new Error('Preview service returned invalid response');
      }

      setPreviewContent(result.content);
      setIsPreviewMode(true);
    } catch (error) {
      console.error('Preview error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to preview template';
      Alert.alert('Preview Error', errorMessage);
    }
  };

  const insertVariable = useCallback((variable: TemplateVariable) => {
    const variableText = `{{${variable.name}}}`;
    const currentContent = content;

    // Use the tracked cursor position or fallback to end of content
    const insertPosition = cursorPosition >= 0 ? cursorPosition : currentContent.length;

    const newContent = currentContent.slice(0, insertPosition) + variableText + currentContent.slice(insertPosition);
    setContent(newContent);

    // Update cursor position to after the inserted variable
    const newCursorPosition = insertPosition + variableText.length;
    setCursorPosition(newCursorPosition);

    // Focus back to content input and set cursor position
    setTimeout(() => {
      contentInputRef.current?.focus();
      // Note: React Native TextInput doesn't have a direct way to set cursor position
      // This would require a more complex solution with a custom text input component
    }, 100);
  }, [content, cursorPosition]);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Template name is required');
      return;
    }

    if (!content.trim()) {
      Alert.alert('Validation Error', 'Template content is required');
      return;
    }

    if (channel === 'email' && !subject.trim()) {
      Alert.alert('Validation Error', 'Email templates require a subject');
      return;
    }

    const templateData: CommunicationTemplate = {
      id: template?.id || `template_${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      category,
      channel,
      status: 'draft' as TemplateStatus,
      subject: channel === 'email' ? subject.trim() : undefined,
      content: content.trim(),
      variables: availableVariables,
      conditions: template?.conditions || [],
      tags: template?.tags || [],
      priority: template?.priority || 1,
      isDefault: template?.isDefault || false,
      createdBy: template?.createdBy || 1,
      updatedBy: 1,
      createdAt: template?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentVersion: {
        id: template?.currentVersion?.id || '1',
        version: template?.currentVersion?.version || 1,
        templateId: template?.id || `template_${Date.now()}`,
        content: content.trim(),
        subject: channel === 'email' ? subject.trim() : undefined,
        variables: availableVariables,
        conditions: template?.conditions || [],
        createdBy: 1,
        createdAt: new Date().toISOString(),
        changeLog: isNew ? 'Initial creation' : 'Updated content',
        isActive: true,
      },
      versions: template?.versions || [],
    };

    onSave(templateData);
  };

  const renderVariablePalette = () => (
    <View style={styles.variablePalette}>
      <Text style={styles.paletteTitle}>Available Variables</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {availableVariables.map((variable) => (
          <TouchableOpacity
            key={variable.id}
            style={styles.variableChip}
            onPress={() => insertVariable(variable)}
          >
            <Text style={styles.variableChipText}>{variable.displayName}</Text>
            <MaterialIcons name="add" size={16} color="#007bff" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderFormattingToolbar = () => (
    <View style={styles.formattingToolbar}>
      <TouchableOpacity style={styles.formatButton}>
        <MaterialIcons name="format-bold" size={20} color="#666" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.formatButton}>
        <MaterialIcons name="format-italic" size={20} color="#666" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.formatButton}>
        <MaterialIcons name="format-underline" size={20} color="#666" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.formatButton}>
        <MaterialIcons name="format-list-bulleted" size={20} color="#666" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.formatButton}>
        <MaterialIcons name="link" size={20} color="#666" />
      </TouchableOpacity>
    </View>
  );

  const renderContentEditor = () => (
    <View style={styles.contentContainer}>
      {channel === 'email' && renderFormattingToolbar()}
      <TextInput
        ref={contentInputRef}
        style={[
          styles.contentInput,
          channel === 'email' && styles.emailContentInput,
          channel === 'sms' && styles.smsContentInput,
        ]}
        multiline
        placeholder={`Enter ${channel} template content...`}
        value={content}
        onChangeText={(text) => {
          setContent(text);
          // Reset cursor position when content changes
          setCursorPosition(text.length);
        }}
        onSelectionChange={(event) => {
          // Track cursor position for variable insertion
          const selection = event.nativeEvent.selection;
          setCursorPosition(selection.start);
        }}
        textAlignVertical="top"
        maxLength={channel === 'sms' ? 160 : undefined}
        selection={{ start: cursorPosition, end: cursorPosition }}
      />
      {channel === 'sms' && (
        <Text style={styles.charCount}>
          {content.length}/160 characters
        </Text>
      )}
    </View>
  );

  const renderPreview = () => (
    <View style={styles.previewContainer}>
      <View style={styles.previewHeader}>
        <Text style={styles.previewTitle}>Template Preview</Text>
        <TouchableOpacity onPress={() => setIsPreviewMode(false)}>
          <MaterialIcons name="edit" size={24} color="#007bff" />
        </TouchableOpacity>
      </View>
      {channel === 'email' && subject && (
        <View style={styles.subjectPreview}>
          <Text style={styles.subjectLabel}>Subject:</Text>
          <Text style={styles.subjectText}>{subject}</Text>
        </View>
      )}
      <ScrollView style={styles.previewContent}>
        <Text style={styles.previewText}>{previewContent}</Text>
      </ScrollView>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
          <MaterialIcons name="close" size={24} color="#666" />
        </TouchableOpacity>
        <Text style={styles.title}>
          {isNew ? 'Create Template' : 'Edit Template'}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handlePreview} style={styles.previewButton}>
            <MaterialIcons name="visibility" size={20} color="#007bff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <MaterialIcons name="save" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {isPreviewMode ? renderPreview() : (
          <>
            {/* Basic Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Basic Information</Text>

              <TextInput
                style={styles.input}
                placeholder="Template name"
                value={name}
                onChangeText={setName}
              />

              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="Template description"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={2}
              />

              {/* Category and Channel Selection */}
              <View style={styles.row}>
                <View style={styles.pickerContainer}>
                  <Text style={styles.pickerLabel}>Category</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {Object.entries(TEMPLATE_CATEGORIES).map(([key, cat]) => (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.categoryChip,
                          category === key && styles.categoryChipSelected,
                        ]}
                        onPress={() => setCategory(key as TemplateCategory)}
                      >
                        <Text style={[
                          styles.categoryChipText,
                          category === key && styles.categoryChipTextSelected,
                        ]}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.pickerContainer}>
                  <Text style={styles.pickerLabel}>Channel</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {Object.entries(COMMUNICATION_CHANNELS).map(([key, ch]) => (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.channelChip,
                          channel === key && styles.channelChipSelected,
                        ]}
                        onPress={() => setChannel(key as CommunicationChannel)}
                      >
                        <Text style={[
                          styles.channelChipText,
                          channel === key && styles.channelChipTextSelected,
                        ]}>
                          {ch.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>

            {/* Subject (for email only) */}
            {channel === 'email' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Email Subject</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Email subject line"
                  value={subject}
                  onChangeText={setSubject}
                />
              </View>
            )}

            {/* Variable Palette */}
            {renderVariablePalette()}

            {/* Content Editor */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Template Content ({channel.toUpperCase()})
              </Text>
              {renderContentEditor()}
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  cancelButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  previewButton: {
    padding: 8,
  },
  saveButton: {
    backgroundColor: '#007bff',
    padding: 8,
    borderRadius: 6,
  },
  scrollContainer: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
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
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    marginBottom: 12,
  },
  pickerContainer: {
    marginBottom: 8,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  categoryChip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#007bff',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
  },
  categoryChipTextSelected: {
    color: '#fff',
  },
  channelChip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  channelChipSelected: {
    backgroundColor: '#28a745',
  },
  channelChipText: {
    fontSize: 14,
    color: '#666',
  },
  channelChipTextSelected: {
    color: '#fff',
  },
  variablePalette: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  paletteTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  variableChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    gap: 4,
  },
  variableChipText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  formattingToolbar: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  formatButton: {
    padding: 8,
    marginRight: 4,
    borderRadius: 4,
  },
  contentContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  contentInput: {
    padding: 12,
    fontSize: 16,
    minHeight: 200,
  },
  emailContentInput: {
    // Additional styling for email content
  },
  smsContentInput: {
    minHeight: 100,
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#666',
    padding: 8,
    backgroundColor: '#f8f9fa',
  },
  previewContainer: {
    flex: 1,
    padding: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  subjectPreview: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  subjectLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  subjectText: {
    fontSize: 16,
    color: '#333',
  },
  previewContent: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
  },
  previewText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
});

export default TemplateEditor;