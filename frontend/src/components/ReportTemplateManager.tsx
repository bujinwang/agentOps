import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Alert, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { exportService, ReportTemplate } from '../services/exportService';

interface ReportTemplateManagerProps {
  onTemplateSelected?: (template: ReportTemplate) => void;
  onTemplateCreated?: (template: ReportTemplate) => void;
  onTemplateUpdated?: (template: ReportTemplate) => void;
  onTemplateDeleted?: (templateId: string) => void;
}

const ReportTemplateManager: React.FC<ReportTemplateManagerProps> = ({
  onTemplateSelected,
  onTemplateCreated,
  onTemplateUpdated,
  onTemplateDeleted
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState<Partial<ReportTemplate>>({
    name: '',
    description: '',
    sections: [],
    defaultOptions: {
      format: 'pdf',
      includeCharts: true
    }
  });

  React.useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = useCallback(() => {
    const loadedTemplates = exportService.getTemplates();
    setTemplates(loadedTemplates);
  }, []);

  const handleCreateTemplate = useCallback(() => {
    if (!newTemplate.name || !newTemplate.description) {
      Alert.alert('Error', 'Please provide a name and description for the template');
      return;
    }

    setIsCreating(true);
    try {
      // In a real implementation, this would save to a backend or local storage
      // For now, we'll just simulate creation
      const template: ReportTemplate = {
        id: `custom-${Date.now()}`,
        name: newTemplate.name!,
        description: newTemplate.description!,
        sections: newTemplate.sections || [],
        defaultOptions: newTemplate.defaultOptions || {
          format: 'pdf',
          includeCharts: true
        }
      };

      // Add to templates list (in real app, this would be persisted)
      setTemplates(prev => [...prev, template]);

      onTemplateCreated?.(template);

      setNewTemplate({
        name: '',
        description: '',
        sections: [],
        defaultOptions: {
          format: 'pdf',
          includeCharts: true
        }
      });

      Alert.alert('Success', 'Template created successfully');
    } catch (error) {
      console.error('Failed to create template:', error);
      Alert.alert('Error', 'Failed to create template');
    } finally {
      setIsCreating(false);
    }
  }, [newTemplate, onTemplateCreated]);

  const handleSelectTemplate = useCallback((template: ReportTemplate) => {
    setSelectedTemplate(template);
    onTemplateSelected?.(template);
    setIsModalVisible(false);
  }, [onTemplateSelected]);

  const handleDeleteTemplate = useCallback((templateId: string) => {
    Alert.alert(
      'Delete Template',
      'Are you sure you want to delete this template?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // In a real implementation, this would delete from backend
            setTemplates(prev => prev.filter(t => t.id !== templateId));
            onTemplateDeleted?.(templateId);
            Alert.alert('Success', 'Template deleted successfully');
          }
        }
      ]
    );
  }, [onTemplateDeleted]);

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf': return 'picture-as-pdf';
      case 'excel': return 'table-chart';
      case 'csv': return 'file-download';
      default: return 'description';
    }
  };

  const getFormatColor = (format: string) => {
    switch (format) {
      case 'pdf': return '#FF5722';
      case 'excel': return '#4CAF50';
      case 'csv': return '#2196F3';
      default: return '#9E9E9E';
    }
  };

  const renderTemplateCard = (template: ReportTemplate) => (
    <View
      key={template.id}
      style={{
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E5E5'
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#1C1C1E', marginBottom: 4 }}>
            {template.name}
          </Text>
          <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
            {template.description}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons
                name={getFormatIcon(template.defaultOptions.format)}
                size={16}
                color={getFormatColor(template.defaultOptions.format)}
              />
              <Text style={{ fontSize: 12, color: '#666', marginLeft: 4 }}>
                {template.defaultOptions.format.toUpperCase()}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons
                name={template.defaultOptions.includeCharts ? 'show-chart' : 'table-chart'}
                size={16}
                color="#666"
              />
              <Text style={{ fontSize: 12, color: '#666', marginLeft: 4 }}>
                {template.defaultOptions.includeCharts ? 'Charts' : 'Data Only'}
              </Text>
            </View>

            <Text style={{ fontSize: 12, color: '#666' }}>
              {template.sections.length} sections
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => handleSelectTemplate(template)}
            style={{
              backgroundColor: '#007AFF',
              borderRadius: 6,
              paddingHorizontal: 12,
              paddingVertical: 8
            }}
          >
            <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
              Use Template
            </Text>
          </TouchableOpacity>

          {!template.id.startsWith('custom-') && (
            <TouchableOpacity
              onPress={() => handleDeleteTemplate(template.id)}
              style={{
                backgroundColor: '#FF5722',
                borderRadius: 6,
                paddingHorizontal: 12,
                paddingVertical: 8
              }}
            >
              <MaterialIcons name="delete" size={14} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Template Sections Preview */}
      <View style={{ marginTop: 12 }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#1C1C1E', marginBottom: 8 }}>
          Sections:
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {template.sections.map((section, index) => (
            <View
              key={index}
              style={{
                backgroundColor: '#F8F9FA',
                borderRadius: 4,
                paddingHorizontal: 8,
                paddingVertical: 4
              }}
            >
              <Text style={{ fontSize: 11, color: '#666' }}>
                {section.title}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <>
      <TouchableOpacity
        onPress={() => setIsModalVisible(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#6F42C1',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 8
        }}
      >
        <MaterialIcons name="description" size={20} color="white" />
        <Text style={{ color: 'white', fontWeight: '600', marginLeft: 8 }}>
          Manage Templates
        </Text>
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 20,
            backgroundColor: 'white',
            borderBottomWidth: 1,
            borderBottomColor: '#E5E5E5'
          }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1C1C1E' }}>
              Report Templates
            </Text>
            <TouchableOpacity
              onPress={() => setIsModalVisible(false)}
              style={{ padding: 8 }}
            >
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1, padding: 20 }}>
            {/* Built-in Templates */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16, color: '#1C1C1E' }}>
                Built-in Templates
              </Text>
              {templates.filter(t => !t.id.startsWith('custom-')).map(renderTemplateCard)}
            </View>

            {/* Custom Templates */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16, color: '#1C1C1E' }}>
                Custom Templates ({templates.filter(t => t.id.startsWith('custom-')).length})
              </Text>
              {templates.filter(t => t.id.startsWith('custom-')).length === 0 ? (
                <View style={{
                  backgroundColor: 'white',
                  borderRadius: 8,
                  padding: 20,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#E5E5E5'
                }}>
                  <MaterialIcons name="add" size={48} color="#CCC" />
                  <Text style={{ fontSize: 16, color: '#666', marginTop: 12, textAlign: 'center' }}>
                    No custom templates yet
                  </Text>
                  <Text style={{ fontSize: 14, color: '#999', marginTop: 4, textAlign: 'center' }}>
                    Create your first custom template below
                  </Text>
                </View>
              ) : (
                templates.filter(t => t.id.startsWith('custom-')).map(renderTemplateCard)
              )}
            </View>

            {/* Create New Template */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16, color: '#1C1C1E' }}>
                Create New Template
              </Text>

              <View style={{
                backgroundColor: 'white',
                borderRadius: 8,
                padding: 16,
                borderWidth: 1,
                borderColor: '#E5E5E5'
              }}>
                {/* Template Name */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1C1C1E', marginBottom: 8 }}>
                    Template Name
                  </Text>
                  <TextInput
                    value={newTemplate.name}
                    onChangeText={(text) => setNewTemplate(prev => ({ ...prev, name: text }))}
                    placeholder="Enter template name..."
                    style={{
                      borderWidth: 1,
                      borderColor: '#E5E5E5',
                      borderRadius: 6,
                      padding: 12,
                      fontSize: 16,
                      backgroundColor: '#FAFAFA'
                    }}
                  />
                </View>

                {/* Template Description */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1C1C1E', marginBottom: 8 }}>
                    Description
                  </Text>
                  <TextInput
                    value={newTemplate.description}
                    onChangeText={(text) => setNewTemplate(prev => ({ ...prev, description: text }))}
                    placeholder="Describe what this template includes..."
                    multiline
                    numberOfLines={3}
                    style={{
                      borderWidth: 1,
                      borderColor: '#E5E5E5',
                      borderRadius: 6,
                      padding: 12,
                      fontSize: 16,
                      backgroundColor: '#FAFAFA',
                      textAlignVertical: 'top'
                    }}
                  />
                </View>

                {/* Default Format */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1C1C1E', marginBottom: 8 }}>
                    Default Format
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {(['pdf', 'excel', 'csv'] as const).map((format) => (
                      <TouchableOpacity
                        key={format}
                        onPress={() => setNewTemplate(prev => ({
                          ...prev,
                          defaultOptions: {
                            ...prev.defaultOptions!,
                            format
                          }
                        }))}
                        style={{
                          flex: 1,
                          padding: 12,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: newTemplate.defaultOptions?.format === format ? '#007AFF' : '#E5E5E5',
                          backgroundColor: newTemplate.defaultOptions?.format === format ? '#E3F2FD' : 'white',
                          alignItems: 'center'
                        }}
                      >
                        <MaterialIcons
                          name={getFormatIcon(format)}
                          size={20}
                          color={newTemplate.defaultOptions?.format === format ? '#007AFF' : '#666'}
                        />
                        <Text style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: newTemplate.defaultOptions?.format === format ? '#007AFF' : '#1C1C1E',
                          marginTop: 4
                        }}>
                          {format.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Create Button */}
                <TouchableOpacity
                  onPress={handleCreateTemplate}
                  disabled={isCreating}
                  style={{
                    backgroundColor: isCreating ? '#CCC' : '#28A745',
                    borderRadius: 8,
                    padding: 16,
                    alignItems: 'center',
                    opacity: isCreating ? 0.6 : 1
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
                    {isCreating ? 'Creating...' : 'Create Template'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

export default ReportTemplateManager;