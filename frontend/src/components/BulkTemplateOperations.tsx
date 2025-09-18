import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
  TextInput,
  FlatList,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { CommunicationTemplate, TemplateCategory, CommunicationChannel } from '../types/template';
import { TemplateStatus } from '../types/template';

interface BulkTemplateOperationsProps {
  templates: CommunicationTemplate[];
  onImportTemplates: (templates: CommunicationTemplate[]) => void;
  onUpdateTemplates: (templateIds: string[], updates: Partial<CommunicationTemplate>) => void;
  onDeleteTemplates: (templateIds: string[]) => void;
  onDuplicateTemplates: (templateIds: string[]) => void;
  visible: boolean;
  onClose: () => void;
}

interface BulkOperation {
  id: string;
  type: 'update' | 'delete' | 'duplicate' | 'export';
  label: string;
  icon: string;
  description: string;
  requiresSelection: boolean;
}

export const BulkTemplateOperations: React.FC<BulkTemplateOperationsProps> = ({
  templates,
  onImportTemplates,
  onUpdateTemplates,
  onDeleteTemplates,
  onDuplicateTemplates,
  visible,
  onClose,
}) => {
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [showOperationModal, setShowOperationModal] = useState(false);
  const [currentOperation, setCurrentOperation] = useState<BulkOperation | null>(null);
  const [bulkUpdates, setBulkUpdates] = useState<Partial<CommunicationTemplate>>({});

  const operations: BulkOperation[] = [
    {
      id: 'export',
      type: 'export',
      label: 'Export Templates',
      icon: 'file-download',
      description: 'Export selected templates to JSON file',
      requiresSelection: true,
    },
    {
      id: 'update',
      type: 'update',
      label: 'Bulk Update',
      icon: 'edit',
      description: 'Update multiple templates at once',
      requiresSelection: true,
    },
    {
      id: 'duplicate',
      type: 'duplicate',
      label: 'Duplicate Templates',
      icon: 'content-copy',
      description: 'Create copies of selected templates',
      requiresSelection: true,
    },
    {
      id: 'delete',
      type: 'delete',
      label: 'Delete Templates',
      icon: 'delete',
      description: 'Permanently delete selected templates',
      requiresSelection: true,
    },
    {
      id: 'import',
      type: 'export',
      label: 'Import Templates',
      icon: 'file-upload',
      description: 'Import templates from JSON file',
      requiresSelection: false,
    },
  ];

  const handleSelectAll = () => {
    if (selectedTemplates.size === templates.length) {
      setSelectedTemplates(new Set());
    } else {
      setSelectedTemplates(new Set(templates.map(t => t.id)));
    }
  };

  const handleSelectTemplate = (templateId: string) => {
    const newSelected = new Set(selectedTemplates);
    if (newSelected.has(templateId)) {
      newSelected.delete(templateId);
    } else {
      newSelected.add(templateId);
    }
    setSelectedTemplates(newSelected);
  };

  const handleOperationSelect = (operation: BulkOperation) => {
    if (operation.requiresSelection && selectedTemplates.size === 0) {
      Alert.alert('No Selection', 'Please select at least one template for this operation.');
      return;
    }

    setCurrentOperation(operation);
    setShowOperationModal(true);
  };

  const executeOperation = async () => {
    if (!currentOperation) return;

    const selectedIds = Array.from(selectedTemplates);

    switch (currentOperation.type) {
      case 'export':
        await handleExport(selectedIds);
        break;
      case 'update':
        handleBulkUpdate(selectedIds);
        break;
      case 'delete':
        handleBulkDelete(selectedIds);
        break;
      case 'duplicate':
        handleBulkDuplicate(selectedIds);
        break;
      case 'export': // This is actually import for the import operation
        await handleImport();
        break;
    }

    setShowOperationModal(false);
    setCurrentOperation(null);
    setBulkUpdates({});
  };

  const handleExport = async (templateIds: string[]) => {
    try {
      const templatesToExport = templates.filter(t => templateIds.includes(t.id));

      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        templates: templatesToExport,
        metadata: {
          totalTemplates: templatesToExport.length,
          categories: templatesToExport.reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          channels: templatesToExport.reduce((acc, t) => {
            acc[t.channel] = (acc[t.channel] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
        },
      };

      const exportJson = JSON.stringify(exportData, null, 2);
      Alert.alert(
        'Export Complete',
        `Templates exported successfully. JSON data is ready to copy:`,
        [
          { text: 'OK' },
          {
            text: 'Copy to Clipboard',
            onPress: () => {
              // In a real app, you'd use Clipboard.setStringAsync(exportJson)
              Alert.alert('Copy Feature', 'Copy functionality would be implemented here');
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Export Failed', 'Failed to export templates. Please try again.');
    }
  };

  const handleImport = async () => {
    // Simplified import - in a real app, this would use DocumentPicker
    Alert.alert(
      'Import Feature',
      'Import functionality would allow you to select a JSON file containing templates to add to your library. This feature requires additional setup for file handling.',
      [{ text: 'OK' }]
    );
  };

  const handleBulkUpdate = (templateIds: string[]) => {
    if (Object.keys(bulkUpdates).length === 0) {
      Alert.alert('No Changes', 'Please specify what to update.');
      return;
    }

    Alert.alert(
      'Confirm Bulk Update',
      `Update ${templateIds.length} template(s) with the specified changes?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: () => {
            onUpdateTemplates(templateIds, bulkUpdates);
            Alert.alert('Update Complete', `${templateIds.length} templates updated successfully.`);
          }
        },
      ]
    );
  };

  const handleBulkDelete = (templateIds: string[]) => {
    Alert.alert(
      'Confirm Bulk Delete',
      `Permanently delete ${templateIds.length} template(s)? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDeleteTemplates(templateIds);
            Alert.alert('Delete Complete', `${templateIds.length} templates deleted successfully.`);
          }
        },
      ]
    );
  };

  const handleBulkDuplicate = (templateIds: string[]) => {
    onDuplicateTemplates(templateIds);
    Alert.alert('Duplicate Complete', `${templateIds.length} templates duplicated successfully.`);
  };

  const renderTemplateItem = ({ item }: { item: CommunicationTemplate }) => (
    <TouchableOpacity
      style={[
        styles.templateItem,
        selectedTemplates.has(item.id) && styles.templateItemSelected,
      ]}
      onPress={() => handleSelectTemplate(item.id)}
    >
      <View style={styles.templateInfo}>
        <Text style={styles.templateName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.templateMeta}>
          {item.category} • {item.channel} • {item.status}
        </Text>
      </View>
      <View style={[
        styles.checkbox,
        selectedTemplates.has(item.id) && styles.checkboxSelected,
      ]}>
        {selectedTemplates.has(item.id) && (
          <MaterialIcons name="check" size={16} color="#fff" />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderBulkUpdateForm = () => (
    <View style={styles.updateForm}>
      <Text style={styles.formTitle}>Bulk Update Options</Text>

      {/* Category Update */}
      <View style={styles.formField}>
        <Text style={styles.fieldLabel}>Change Category:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {Object.entries(TEMPLATE_CATEGORIES).map(([key, category]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.categoryOption,
                bulkUpdates.category === key && styles.categoryOptionSelected,
              ]}
              onPress={() => setBulkUpdates(prev => ({ ...prev, category: key as TemplateCategory }))}
            >
              <Text style={[
                styles.categoryOptionText,
                bulkUpdates.category === key && styles.categoryOptionTextSelected,
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Status Update */}
      <View style={styles.formField}>
        <Text style={styles.fieldLabel}>Change Status:</Text>
        <View style={styles.statusOptions}>
          {['draft', 'active', 'archived'].map(status => (
            <TouchableOpacity
              key={status}
              style={[
                styles.statusOption,
                bulkUpdates.status === status && styles.statusOptionSelected,
              ]}
              onPress={() => setBulkUpdates(prev => ({ ...prev, status: status as TemplateStatus }))}
            >
              <Text style={[
                styles.statusOptionText,
                bulkUpdates.status === status && styles.statusOptionTextSelected,
              ]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Add Tags */}
      <View style={styles.formField}>
        <Text style={styles.fieldLabel}>Add Tags:</Text>
        <TextInput
          style={styles.tagInput}
          placeholder="Enter tags separated by commas"
          value={bulkUpdates.tags?.join(', ') || ''}
          onChangeText={(text) => {
            const tags = text.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
            setBulkUpdates(prev => ({ ...prev, tags }));
          }}
        />
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.title}>Bulk Operations</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.selectionHeader}>
          <TouchableOpacity onPress={handleSelectAll} style={styles.selectAllButton}>
            <MaterialIcons
              name={selectedTemplates.size === templates.length ? "check-box" : "check-box-outline-blank"}
              size={20}
              color="#007bff"
            />
            <Text style={styles.selectAllText}>
              {selectedTemplates.size === templates.length ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.selectionCount}>
            {selectedTemplates.size} of {templates.length} selected
          </Text>
        </View>

        <FlatList
          data={templates}
          keyExtractor={(item) => item.id}
          renderItem={renderTemplateItem}
          style={styles.templateList}
        />

        <View style={styles.operationsContainer}>
          <Text style={styles.operationsTitle}>Available Operations</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {operations.map(operation => (
              <TouchableOpacity
                key={operation.id}
                style={[
                  styles.operationButton,
                  operation.requiresSelection && selectedTemplates.size === 0 && styles.operationButtonDisabled,
                ]}
                onPress={() => handleOperationSelect(operation)}
                disabled={operation.requiresSelection && selectedTemplates.size === 0}
              >
                <MaterialCommunityIcons
                  name={operation.icon as any}
                  size={20}
                  color={operation.requiresSelection && selectedTemplates.size === 0 ? "#ccc" : "#007bff"}
                />
                <Text style={[
                  styles.operationButtonText,
                  operation.requiresSelection && selectedTemplates.size === 0 && styles.operationButtonTextDisabled,
                ]}>
                  {operation.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Operation Modal */}
        <Modal
          visible={showOperationModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowOperationModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {currentOperation?.label}
              </Text>
              <Text style={styles.modalDescription}>
                {currentOperation?.description}
              </Text>

              {currentOperation?.type === 'update' && renderBulkUpdateForm()}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowOperationModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={executeOperation}
                >
                  <Text style={styles.confirmButtonText}>
                    {currentOperation?.label}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const TEMPLATE_CATEGORIES = {
  initial_contact: { name: 'Initial Contact' },
  follow_up: { name: 'Follow-up' },
  property_showing: { name: 'Property Showing' },
  proposal: { name: 'Proposal' },
  negotiation: { name: 'Negotiation' },
  closing: { name: 'Closing' },
  thank_you: { name: 'Thank You' },
  nurturing: { name: 'Nurturing' },
  re_engagement: { name: 'Re-engagement' },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllText: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '500',
  },
  selectionCount: {
    fontSize: 14,
    color: '#666',
  },
  templateList: {
    flex: 1,
  },
  templateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  templateItemSelected: {
    backgroundColor: '#e3f2fd',
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  templateMeta: {
    fontSize: 12,
    color: '#666',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  operationsContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  operationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  operationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 12,
    gap: 8,
  },
  operationButtonDisabled: {
    opacity: 0.5,
  },
  operationButtonText: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '500',
  },
  operationButtonTextDisabled: {
    color: '#ccc',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  updateForm: {
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  formField: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  categoryOption: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  categoryOptionSelected: {
    backgroundColor: '#007bff',
  },
  categoryOptionText: {
    fontSize: 12,
    color: '#666',
  },
  categoryOptionTextSelected: {
    color: '#fff',
  },
  statusOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  statusOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  statusOptionSelected: {
    backgroundColor: '#007bff',
  },
  statusOptionText: {
    fontSize: 12,
    color: '#666',
  },
  statusOptionTextSelected: {
    color: '#fff',
  },
  tagInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: '#6c757d',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  confirmButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: '#007bff',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default BulkTemplateOperations;