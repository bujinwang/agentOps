import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { CommunicationTemplate, TemplateVersion } from '../types/template';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface TemplateVersioningProps {
  template: CommunicationTemplate;
  onRestoreVersion: (version: TemplateVersion) => void;
  onCreateVersion: (changes: string) => void;
  visible: boolean;
  onClose: () => void;
}

interface VersionItemProps {
  version: TemplateVersion;
  isCurrent: boolean;
  onRestore: () => void;
  onViewDetails: () => void;
}

const VersionItem: React.FC<VersionItemProps> = ({
  version,
  isCurrent,
  onRestore,
  onViewDetails,
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getVersionStatus = () => {
    if (isCurrent) return { text: 'Current', color: '#28a745' };
    if (version.isActive) return { text: 'Active', color: '#007bff' };
    return { text: 'Archived', color: '#6c757d' };
  };

  const status = getVersionStatus();

  return (
    <TouchableOpacity style={styles.versionItem} onPress={onViewDetails}>
      <View style={styles.versionHeader}>
        <View style={styles.versionInfo}>
          <Text style={styles.versionNumber}>Version {version.version}</Text>
          <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
            <Text style={styles.statusText}>{status.text}</Text>
          </View>
        </View>
        <View style={styles.versionActions}>
          {!isCurrent && (
            <TouchableOpacity onPress={onRestore} style={styles.restoreButton}>
              <MaterialIcons name="restore" size={16} color="#007bff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onViewDetails} style={styles.detailsButton}>
            <MaterialIcons name="expand-more" size={16} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.versionDate}>{formatDate(version.createdAt)}</Text>
      <Text style={styles.versionAuthor}>by User #{version.createdBy}</Text>

      {version.changeLog && (
        <Text style={styles.changeLog} numberOfLines={2}>
          {version.changeLog}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export const TemplateVersioning: React.FC<TemplateVersioningProps> = ({
  template,
  onRestoreVersion,
  onCreateVersion,
  visible,
  onClose,
}) => {
  const [selectedVersion, setSelectedVersion] = useState<TemplateVersion | null>(null);
  const [showCreateVersion, setShowCreateVersion] = useState(false);
  const [newVersionChanges, setNewVersionChanges] = useState('');

  // Sort versions by version number (descending)
  const sortedVersions = [...template.versions].sort((a, b) => b.version - a.version);

  const handleRestoreVersion = (version: TemplateVersion) => {
    Alert.alert(
      'Restore Version',
      `Are you sure you want to restore to Version ${version.version}? This will create a new version with the current content.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: () => {
            onRestoreVersion(version);
            onClose();
          }
        },
      ]
    );
  };

  const handleCreateVersion = () => {
    if (!newVersionChanges.trim()) {
      Alert.alert('Validation Error', 'Please describe the changes made');
      return;
    }

    onCreateVersion(newVersionChanges.trim());
    setNewVersionChanges('');
    setShowCreateVersion(false);
  };

  const renderVersionDetails = () => {
    if (!selectedVersion) return null;

    const currentContent = template.content;
    const versionContent = selectedVersion.content;

    // Simple diff - in a real app, you'd use a proper diff library
    const hasChanges = currentContent !== versionContent;

    return (
      <Modal
        visible={!!selectedVersion}
        animationType="slide"
        onRequestClose={() => setSelectedVersion(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedVersion(null)}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Version {selectedVersion.version} Details</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.versionMeta}>
              <Text style={styles.metaLabel}>Created:</Text>
              <Text style={styles.metaValue}>
                {new Date(selectedVersion.createdAt).toLocaleString()}
              </Text>

              <Text style={styles.metaLabel}>Author:</Text>
              <Text style={styles.metaValue}>User #{selectedVersion.createdBy}</Text>

              {selectedVersion.changeLog && (
                <>
                  <Text style={styles.metaLabel}>Changes:</Text>
                  <Text style={styles.metaValue}>{selectedVersion.changeLog}</Text>
                </>
              )}
            </View>

            {selectedVersion.subject && (
              <View style={styles.contentSection}>
                <Text style={styles.sectionTitle}>Subject</Text>
                <Text style={styles.contentText}>{selectedVersion.subject}</Text>
              </View>
            )}

            <View style={styles.contentSection}>
              <Text style={styles.sectionTitle}>Content</Text>
              <ScrollView style={styles.contentPreview}>
                <Text style={styles.contentText}>{versionContent}</Text>
              </ScrollView>
            </View>

            {hasChanges && (
              <View style={styles.diffSection}>
                <Text style={styles.diffTitle}>Changes from Current Version</Text>
                <Text style={styles.diffText}>
                  {currentContent.length !== versionContent.length
                    ? `Content length changed from ${versionContent.length} to ${currentContent.length} characters`
                    : 'Content has been modified'
                  }
                </Text>
              </View>
            )}
          </ScrollView>

          {!selectedVersion.isActive && (
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.restoreButtonLarge}
                onPress={() => handleRestoreVersion(selectedVersion)}
              >
                <MaterialIcons name="restore" size={20} color="#fff" />
                <Text style={styles.restoreButtonText}>Restore This Version</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    );
  };

  const renderCreateVersion = () => (
    <Modal
      visible={showCreateVersion}
      animationType="slide"
      onRequestClose={() => setShowCreateVersion(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowCreateVersion(false)}>
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Create New Version</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          <Text style={styles.createVersionLabel}>
            Describe the changes you've made to create this new version:
          </Text>

          <TextInput
            style={styles.changesInput}
            multiline
            placeholder="e.g., Updated subject line, improved content, fixed variable references..."
            value={newVersionChanges}
            onChangeText={setNewVersionChanges}
            textAlignVertical="top"
          />

          <View style={styles.versionPreview}>
            <Text style={styles.previewLabel}>Current Content Preview:</Text>
            <Text style={styles.previewText} numberOfLines={3}>
              {template.content}
            </Text>
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowCreateVersion(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateVersion}
          >
            <Text style={styles.createButtonText}>Create Version</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.title}>Version History</Text>
          <TouchableOpacity
            onPress={() => setShowCreateVersion(true)}
            style={styles.createVersionButton}
          >
            <MaterialIcons name="add" size={20} color="#007bff" />
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>{template.name}</Text>

        <ScrollView style={styles.versionList}>
          {sortedVersions.map((version) => (
            <VersionItem
              key={version.id}
              version={version}
              isCurrent={version.id === template.currentVersion.id}
              onRestore={() => handleRestoreVersion(version)}
              onViewDetails={() => setSelectedVersion(version)}
            />
          ))}

          {sortedVersions.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialIcons name="history" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>No version history</Text>
              <Text style={styles.emptyStateSubtext}>
                Create your first version to start tracking changes
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.versionCount}>
            {sortedVersions.length} version{sortedVersions.length !== 1 ? 's' : ''} total
          </Text>
        </View>

        {renderVersionDetails()}
        {renderCreateVersion()}
      </View>
    </Modal>
  );
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
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  createVersionButton: {
    padding: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  versionList: {
    flex: 1,
    padding: 16,
  },
  versionItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  versionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  versionInfo: {
    flex: 1,
  },
  versionNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  versionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  restoreButton: {
    padding: 8,
    backgroundColor: '#e3f2fd',
    borderRadius: 6,
  },
  detailsButton: {
    padding: 8,
  },
  versionDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  versionAuthor: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  changeLog: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  versionCount: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  versionMeta: {
    marginBottom: 16,
  },
  metaLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 14,
    color: '#666',
  },
  contentSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  contentPreview: {
    maxHeight: 200,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
  },
  contentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  diffSection: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  diffTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 4,
  },
  diffText: {
    fontSize: 14,
    color: '#856404',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  restoreButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 6,
    gap: 8,
  },
  restoreButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  createVersionLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
  },
  changesInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  versionPreview: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  previewText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  createButton: {
    flex: 1,
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginLeft: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default TemplateVersioning;