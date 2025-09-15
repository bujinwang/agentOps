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
import TemplateEditor from './TemplateEditor';
import TemplateLibrary from './TemplateLibrary';
import { CommunicationTemplate } from '../types/communication';

interface WorkflowTemplateEditorProps {
  workflowId: string;
  onTemplateSelect: (template: CommunicationTemplate) => void;
  onTemplateCreate: (template: Omit<CommunicationTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  isVisible: boolean;
  onClose: () => void;
}

interface ChannelTemplate {
  channel: 'email' | 'sms' | 'in_app';
  template: CommunicationTemplate | null;
  characterLimit?: number;
}

const WorkflowTemplateEditor: React.FC<WorkflowTemplateEditorProps> = ({
  workflowId,
  onTemplateSelect,
  onTemplateCreate,
  isVisible,
  onClose
}) => {
  const [selectedChannel, setSelectedChannel] = useState<'email' | 'sms' | 'in_app'>('email');
  const [channelTemplates, setChannelTemplates] = useState<Record<string, ChannelTemplate>>({
    email: { channel: 'email', template: null },
    sms: { channel: 'sms', template: null, characterLimit: 160 },
    in_app: { channel: 'in_app', template: null }
  });
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CommunicationTemplate | undefined>();

  const channels = [
    { key: 'email', label: 'Email', icon: 'email', color: '#2196F3' },
    { key: 'sms', label: 'SMS', icon: 'sms', color: '#4CAF50' },
    { key: 'in_app', label: 'In-App', icon: 'notifications', color: '#FF9800' }
  ];

  const handleChannelSelect = (channel: 'email' | 'sms' | 'in_app') => {
    setSelectedChannel(channel);
  };

  const handleCreateTemplate = useCallback(() => {
    const channelConfig = channelTemplates[selectedChannel];
    const templateData = {
      name: `${selectedChannel.charAt(0).toUpperCase() + selectedChannel.slice(1)} Template`,
      category: 'followup',
      subjectTemplate: selectedChannel === 'email' ? 'Follow-up: {{leadName}}' : undefined,
      contentTemplate: selectedChannel === 'email'
        ? 'Hi {{leadName}},\n\nI wanted to follow up on your recent inquiry about properties in {{location}}. We have some exciting new listings that match your criteria.\n\nWould you be available for a quick call to discuss your options?\n\nBest regards,\n{{agentName}}'
        : selectedChannel === 'sms'
        ? 'Hi {{leadName}}! We have new properties matching your search in {{location}}. Call us at {{phoneNumber}} to learn more!'
        : 'Hi {{leadName}}, we have new properties that match your search criteria. Tap to view them now!',
      variables: {
        leadName: { name: 'leadName', type: 'string', description: 'Lead\'s full name', required: true },
        location: { name: 'location', type: 'string', description: 'Property location preference', required: false },
        agentName: { name: 'agentName', type: 'string', description: 'Agent\'s name', required: false },
        phoneNumber: { name: 'phoneNumber', type: 'string', description: 'Contact phone number', required: false }
      },
      conditions: [],
      isActive: true
    };

    setEditingTemplate(undefined);
    setShowTemplateEditor(true);
  }, [selectedChannel, channelTemplates]);

  const handleEditTemplate = (template: CommunicationTemplate) => {
    setEditingTemplate(template);
    setShowTemplateEditor(true);
  };

  const handleSelectTemplate = (template: CommunicationTemplate) => {
    const updatedTemplates = {
      ...channelTemplates,
      [selectedChannel]: {
        ...channelTemplates[selectedChannel],
        template
      }
    };
    setChannelTemplates(updatedTemplates);
    setShowTemplateLibrary(false);
  };

  const handleSaveTemplate = async (templateData: Omit<CommunicationTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await onTemplateCreate(templateData);
      setShowTemplateEditor(false);
      // Refresh template list or update local state
    } catch (error) {
      Alert.alert('Error', 'Failed to save template');
    }
  };

  const handleTestTemplate = (channel: 'email' | 'sms' | 'in_app') => {
    const channelTemplate = channelTemplates[channel];
    if (!channelTemplate.template) {
      Alert.alert('No Template', `Please select or create a ${channel} template first.`);
      return;
    }

    // Mock test data
    const testData = {
      leadName: 'John Doe',
      location: 'Downtown',
      agentName: 'Sarah Johnson',
      phoneNumber: '(555) 123-4567'
    };

    let renderedContent = channelTemplate.template.contentTemplate;
    let renderedSubject = channelTemplate.template.subjectTemplate;

    // Simple variable replacement for testing
    Object.entries(testData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      renderedContent = renderedContent.replace(regex, value);
      if (renderedSubject) {
        renderedSubject = renderedSubject.replace(regex, value);
      }
    });

    Alert.alert(
      `${channel.toUpperCase()} Template Test`,
      `Subject: ${renderedSubject || 'N/A'}\n\nContent: ${renderedContent}`,
      [{ text: 'OK' }]
    );
  };

  const handleSaveWorkflowTemplates = () => {
    // Validate that at least one template is configured
    const configuredTemplates = Object.values(channelTemplates).filter(ct => ct.template !== null);

    if (configuredTemplates.length === 0) {
      Alert.alert('Validation Error', 'Please configure at least one template for the workflow.');
      return;
    }

    // Pass the configured templates back to the workflow
    onTemplateSelect(channelTemplates[selectedChannel].template!);
    onClose();
  };

  const renderChannelCard = (channel: typeof channels[0]) => {
    const channelTemplate = channelTemplates[channel.key as keyof typeof channelTemplates];
    const hasTemplate = channelTemplate.template !== null;

    return (
      <TouchableOpacity
        key={channel.key}
        style={[
          styles.channelCard,
          selectedChannel === channel.key && styles.channelCardSelected,
          { borderColor: channel.color }
        ]}
        onPress={() => handleChannelSelect(channel.key as 'email' | 'sms' | 'in_app')}
      >
        <View style={styles.channelHeader}>
          <MaterialIcons name={channel.icon as any} size={24} color={channel.color} />
          <Text style={[styles.channelLabel, { color: channel.color }]}>
            {channel.label}
          </Text>
          {hasTemplate && (
            <View style={[styles.templateIndicator, { backgroundColor: channel.color }]}>
              <MaterialIcons name="check" size={12} color="#fff" />
            </View>
          )}
        </View>

        {hasTemplate ? (
          <View style={styles.templateInfo}>
            <Text style={styles.templateName} numberOfLines={1}>
              {channelTemplate.template!.name}
            </Text>
            <Text style={styles.templateCategory}>
              {channelTemplate.template!.category}
            </Text>
          </View>
        ) : (
          <Text style={styles.noTemplateText}>No template configured</Text>
        )}

        {channel.key === 'sms' && (
          <Text style={styles.characterLimit}>
            Character limit: {channelTemplate.characterLimit}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderChannelActions = () => {
    const channelTemplate = channelTemplates[selectedChannel];

    return (
      <View style={styles.channelActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryAction]}
          onPress={() => setShowTemplateLibrary(true)}
        >
          <MaterialIcons name="library-books" size={20} color="#fff" />
          <Text style={styles.primaryActionText}>Select Template</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryAction]}
          onPress={handleCreateTemplate}
        >
          <MaterialIcons name="add" size={20} color="#007AFF" />
          <Text style={styles.secondaryActionText}>Create New</Text>
        </TouchableOpacity>

        {channelTemplate.template && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryAction]}
              onPress={() => handleEditTemplate(channelTemplate.template!)}
            >
              <MaterialIcons name="edit" size={20} color="#007AFF" />
              <Text style={styles.secondaryActionText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.tertiaryAction]}
              onPress={() => handleTestTemplate(selectedChannel)}
            >
              <MaterialIcons name="play-arrow" size={20} color="#666" />
              <Text style={styles.tertiaryActionText}>Test</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  if (!isVisible) return null;

  return (
    <Modal visible={isVisible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Workflow Templates</Text>
          <TouchableOpacity onPress={onClose}>
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Channel Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Communication Channels</Text>
            <Text style={styles.sectionSubtitle}>
              Configure templates for different communication methods
            </Text>

            <View style={styles.channelsGrid}>
              {channels.map(renderChannelCard)}
            </View>
          </View>

          {/* Channel Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {channels.find(c => c.key === selectedChannel)?.label} Templates
            </Text>
            {renderChannelActions()}
          </View>

          {/* Template Preview */}
          {channelTemplates[selectedChannel].template && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Template Preview</Text>
              <View style={styles.templatePreview}>
                {channelTemplates[selectedChannel].template!.subjectTemplate && (
                  <View style={styles.previewSection}>
                    <Text style={styles.previewLabel}>Subject:</Text>
                    <Text style={styles.previewText}>
                      {channelTemplates[selectedChannel].template!.subjectTemplate}
                    </Text>
                  </View>
                )}
                <View style={styles.previewSection}>
                  <Text style={styles.previewLabel}>Content:</Text>
                  <Text style={styles.previewText}>
                    {channelTemplates[selectedChannel].template!.contentTemplate}
                  </Text>
                </View>
                <View style={styles.previewSection}>
                  <Text style={styles.previewLabel}>Variables:</Text>
                  <Text style={styles.previewText}>
                    {Object.keys(channelTemplates[selectedChannel].template!.variables).join(', ')}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.footerButton, styles.cancelButton]}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.footerButton, styles.saveButton]}
            onPress={handleSaveWorkflowTemplates}
          >
            <Text style={styles.saveButtonText}>Save Templates</Text>
          </TouchableOpacity>
        </View>

        {/* Template Editor Modal */}
        <TemplateEditor
          template={editingTemplate}
          onSave={handleSaveTemplate}
          onCancel={() => setShowTemplateEditor(false)}
          isVisible={showTemplateEditor}
        />

        {/* Template Library Modal */}
        <Modal visible={showTemplateLibrary} animationType="slide">
          <TemplateLibrary
            onSelectTemplate={handleSelectTemplate}
            onCreateTemplate={() => {
              setShowTemplateLibrary(false);
              handleCreateTemplate();
            }}
            onEditTemplate={(template) => {
              setShowTemplateLibrary(false);
              handleEditTemplate(template);
            }}
          />
          <TouchableOpacity
            style={styles.libraryCloseButton}
            onPress={() => setShowTemplateLibrary(false)}
          >
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </Modal>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  channelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  channelCard: {
    width: '30%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  channelCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  channelHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  channelLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  templateIndicator: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateInfo: {
    alignItems: 'center',
  },
  templateName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  templateCategory: {
    fontSize: 10,
    color: '#666',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  noTemplateText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  characterLimit: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  },
  channelActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    minWidth: 100,
    justifyContent: 'center',
  },
  primaryAction: {
    backgroundColor: '#007AFF',
  },
  primaryActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  secondaryAction: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  secondaryActionText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  tertiaryAction: {
    backgroundColor: '#f5f5f5',
  },
  tertiaryActionText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  templatePreview: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
  },
  previewSection: {
    marginBottom: 12,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  previewText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerButton: {
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
  libraryCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default WorkflowTemplateEditor;