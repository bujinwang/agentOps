import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Image,
  Platform
} from 'react-native';
import { PropertyMedia, PropertyMediaUpdate } from '../types/property';

export interface MediaEditorProps {
  media: PropertyMedia;
  onSave: (updates: PropertyMediaUpdate) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => void;
  style?: any;
}

export interface MediaEditorState {
  title: string;
  description: string;
  is_primary: boolean;
  isLoading: boolean;
  hasChanges: boolean;
}

/**
 * Media editor component for editing media metadata
 */
export const MediaEditor: React.FC<MediaEditorProps> = ({
  media,
  onSave,
  onCancel,
  onDelete,
  style
}) => {
  const [state, setState] = useState<MediaEditorState>({
    title: media.title || '',
    description: media.description || '',
    is_primary: media.is_primary || false,
    isLoading: false,
    hasChanges: false
  });

  /**
   * Update state and track changes
   */
  const updateState = (updates: Partial<MediaEditorState>) => {
    setState(prevState => ({
      ...prevState,
      ...updates,
      hasChanges: true
    }));
  };

  /**
   * Handle title change
   */
  const handleTitleChange = (title: string) => {
    updateState({ title });
  };

  /**
   * Handle description change
   */
  const handleDescriptionChange = (description: string) => {
    updateState({ description });
  };

  /**
   * Handle primary toggle
   */
  const handlePrimaryToggle = () => {
    updateState({ is_primary: !state.is_primary });
  };

  /**
   * Handle save
   */
  const handleSave = async () => {
    if (!state.hasChanges) {
      onCancel();
      return;
    }

    setState(prevState => ({ ...prevState, isLoading: true }));

    try {
      const updates: PropertyMediaUpdate = {
        id: media.id
      };

      if (state.title !== (media.title || '')) {
        updates.title = state.title;
      }

      if (state.description !== (media.description || '')) {
        updates.description = state.description;
      }

      // Note: is_primary updates would need to be handled separately
      // as it's not included in PropertyMediaUpdate type

      await onSave(updates);
    } catch (error) {
      Alert.alert(
        'Save Failed',
        error instanceof Error ? error.message : 'Failed to save media changes'
      );
    } finally {
      setState(prevState => ({ ...prevState, isLoading: false }));
    }
  };

  /**
   * Handle delete
   */
  const handleDelete = () => {
    Alert.alert(
      'Delete Media',
      'Are you sure you want to delete this media? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete?.()
        }
      ]
    );
  };

  /**
   * Render media preview
   */
  const renderMediaPreview = () => {
    if (media.media_type === 'photo') {
      return (
        <Image
          source={{ uri: media.url }}
          style={styles.mediaPreview}
          resizeMode="cover"
        />
      );
    }

    if (media.media_type === 'video') {
      return (
        <View style={styles.videoPreview}>
          <Text style={styles.videoIcon}>🎥</Text>
          <Text style={styles.videoText}>Video</Text>
        </View>
      );
    }

    if (media.media_type === 'virtual_tour') {
      return (
        <View style={styles.virtualTourPreview}>
          <Text style={styles.virtualTourIcon}>🏠</Text>
          <Text style={styles.virtualTourText}>Virtual Tour</Text>
        </View>
      );
    }

    return (
      <View style={styles.unknownPreview}>
        <Text style={styles.unknownIcon}>📎</Text>
        <Text style={styles.unknownText}>Media</Text>
      </View>
    );
  };

  return (
    <ScrollView style={[styles.container, style]}>
      {/* Media Preview */}
      <View style={styles.previewSection}>
        {renderMediaPreview()}
      </View>

      {/* Form Fields */}
      <View style={styles.formSection}>
        {/* Title Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.textInput}
            value={state.title}
            onChangeText={handleTitleChange}
            placeholder="Enter media title"
            maxLength={200}
          />
        </View>

        {/* Description Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.textInput, styles.descriptionInput]}
            value={state.description}
            onChangeText={handleDescriptionChange}
            placeholder="Enter media description"
            multiline
            numberOfLines={3}
            maxLength={500}
            textAlignVertical="top"
          />
        </View>

        {/* Primary Toggle */}
        <View style={styles.toggleGroup}>
          <Text style={styles.label}>Primary Media</Text>
          <TouchableOpacity
            style={[styles.toggleButton, state.is_primary && styles.toggleButtonActive]}
            onPress={handlePrimaryToggle}
          >
            <Text style={[styles.toggleText, state.is_primary && styles.toggleTextActive]}>
              {state.is_primary ? 'Yes' : 'No'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Media Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            Type: {media.media_type}
          </Text>
          <Text style={styles.infoText}>
            Size: {formatFileSize(media.file_size || 0)}
          </Text>
          <Text style={styles.infoText}>
            Sort Order: {media.sort_order}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={onCancel}
          disabled={state.isLoading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.saveButton, (!state.hasChanges || state.isLoading) && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={!state.hasChanges || state.isLoading}
        >
          <Text style={[styles.saveButtonText, (!state.hasChanges || state.isLoading) && styles.buttonTextDisabled]}>
            {state.isLoading ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Delete Button */}
      {onDelete && (
        <View style={styles.deleteSection}>
          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            onPress={handleDelete}
            disabled={state.isLoading}
          >
            <Text style={styles.deleteButtonText}>Delete Media</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  previewSection: {
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  mediaPreview: {
    width: 200,
    height: 150,
    borderRadius: 8
  },
  videoPreview: {
    width: 200,
    height: 150,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  videoIcon: {
    fontSize: 48,
    marginBottom: 8
  },
  videoText: {
    fontSize: 16,
    color: '#666'
  },
  virtualTourPreview: {
    width: 200,
    height: 150,
    backgroundColor: '#e8f4f8',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  virtualTourIcon: {
    fontSize: 48,
    marginBottom: 8
  },
  virtualTourText: {
    fontSize: 16,
    color: '#666'
  },
  unknownPreview: {
    width: 200,
    height: 150,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  unknownIcon: {
    fontSize: 48,
    marginBottom: 8
  },
  unknownText: {
    fontSize: 16,
    color: '#666'
  },
  formSection: {
    padding: 16
  },
  inputGroup: {
    marginBottom: 16
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff'
  },
  descriptionInput: {
    height: 80,
    textAlignVertical: 'top'
  },
  toggleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff'
  },
  toggleButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
  },
  toggleText: {
    fontSize: 16,
    color: '#666'
  },
  toggleTextActive: {
    color: '#fff'
  },
  infoSection: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  actionsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0'
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8
  },
  buttonDisabled: {
    opacity: 0.5
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600'
  },
  saveButton: {
    backgroundColor: '#007AFF'
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  buttonTextDisabled: {
    color: '#ccc'
  },
  deleteSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0'
  },
  deleteButton: {
    backgroundColor: '#FF3B30'
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default MediaEditor;