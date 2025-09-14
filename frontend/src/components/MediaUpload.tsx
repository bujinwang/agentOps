import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
// Note: Using React Native's built-in file handling
// In a real implementation, you would install and use expo-image-picker
// For now, we'll use a simplified approach
import { PropertyMediaCreate, MediaType } from '../types/property';

const { width } = Dimensions.get('window');

interface MediaUploadProps {
  propertyId: number;
  onMediaUploaded: (media: any) => void;
  onUploadError: (error: string) => void;
  maxFiles?: number;
  allowedTypes?: MediaType[];
  maxFileSize?: number; // in MB
  disabled?: boolean;
}

interface UploadFile {
  id: string;
  file: any;
  name: string;
  size: number;
  type: string;
  uri: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

const MediaUpload: React.FC<MediaUploadProps> = ({
  propertyId,
  onMediaUploaded,
  onUploadError,
  maxFiles = 10,
  allowedTypes = ['photo', 'video', 'virtual_tour'],
  maxFileSize = 50, // 50MB default
  disabled = false
}) => {
  const [filesToUpload, setFilesToUpload] = useState<UploadFile[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // File validation
  const validateFile = useCallback((file: any): { isValid: boolean; error?: string; mediaType?: MediaType } => {
    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxFileSize) {
      return { isValid: false, error: `File size exceeds ${maxFileSize}MB limit` };
    }

    // Determine media type based on MIME type
    let mediaType: MediaType | undefined;
    const mimeType = file.type || file.mimeType;

    if (mimeType?.startsWith('image/')) {
      if (!allowedTypes.includes('photo')) {
        return { isValid: false, error: 'Photo uploads not allowed' };
      }
      mediaType = 'photo';
    } else if (mimeType?.startsWith('video/')) {
      if (!allowedTypes.includes('video')) {
        return { isValid: false, error: 'Video uploads not allowed' };
      }
      mediaType = 'video';
    } else if (mimeType?.includes('tour') || file.name?.toLowerCase().includes('tour')) {
      if (!allowedTypes.includes('virtual_tour')) {
        return { isValid: false, error: 'Virtual tour uploads not allowed' };
      }
      mediaType = 'virtual_tour';
    } else {
      return { isValid: false, error: 'Unsupported file type' };
    }

    return { isValid: true, mediaType };
  }, [allowedTypes, maxFileSize]);

  // Handle file selection from device (simplified for demo)
  const handleFileSelection = useCallback(async () => {
    if (disabled) return;

    // For demo purposes, we'll simulate file selection
    // In a real implementation, you would use expo-image-picker or react-native-image-picker
    Alert.alert(
      'File Selection',
      'File picker would open here. In a real implementation, this would use expo-image-picker or react-native-image-picker.',
      [
        {
          text: 'Simulate Photo Upload',
          onPress: () => {
            const mockFile: UploadFile = {
              id: `upload_${Date.now()}_${Math.random()}`,
              file: { uri: 'mock://photo.jpg' },
              name: `photo_${Date.now()}.jpg`,
              size: 2048000, // 2MB
              type: 'image/jpeg',
              uri: 'mock://photo.jpg',
              progress: 0,
              status: 'pending'
            };

            const totalFiles = filesToUpload.length + 1;
            if (totalFiles > maxFiles) {
              Alert.alert('Too Many Files', `Maximum ${maxFiles} files allowed`);
              return;
            }

            setFilesToUpload(prev => [...prev, mockFile]);
          }
        },
        {
          text: 'Simulate Video Upload',
          onPress: () => {
            const mockFile: UploadFile = {
              id: `upload_${Date.now()}_${Math.random()}`,
              file: { uri: 'mock://video.mp4' },
              name: `video_${Date.now()}.mp4`,
              size: 10240000, // 10MB
              type: 'video/mp4',
              uri: 'mock://video.mp4',
              progress: 0,
              status: 'pending'
            };

            const totalFiles = filesToUpload.length + 1;
            if (totalFiles > maxFiles) {
              Alert.alert('Too Many Files', `Maximum ${maxFiles} files allowed`);
              return;
            }

            setFilesToUpload(prev => [...prev, mockFile]);
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  }, [disabled, filesToUpload.length, maxFiles]);

  // Handle camera capture (simplified for demo)
  const handleCameraCapture = useCallback(async () => {
    if (disabled) return;

    // For demo purposes, we'll simulate camera capture
    // In a real implementation, you would use expo-image-picker
    Alert.alert(
      'Camera Capture',
      'Camera would open here. In a real implementation, this would use expo-image-picker.',
      [
        {
          text: 'Simulate Camera Photo',
          onPress: () => {
            const mockFile: UploadFile = {
              id: `upload_${Date.now()}_${Math.random()}`,
              file: { uri: 'mock://camera_photo.jpg' },
              name: `camera_${Date.now()}.jpg`,
              size: 1536000, // 1.5MB
              type: 'image/jpeg',
              uri: 'mock://camera_photo.jpg',
              progress: 0,
              status: 'pending'
            };

            const totalFiles = filesToUpload.length + 1;
            if (totalFiles > maxFiles) {
              Alert.alert('Too Many Files', `Maximum ${maxFiles} files allowed`);
              return;
            }

            setFilesToUpload(prev => [...prev, mockFile]);
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  }, [disabled, filesToUpload.length, maxFiles]);

  // Remove file from upload queue
  const removeFile = useCallback((fileId: string) => {
    setFilesToUpload(prev => prev.filter(file => file.id !== fileId));
  }, []);

  // Upload files
  const handleUploadFiles = useCallback(async () => {
    if (filesToUpload.length === 0 || isUploading) return;

    setIsUploading(true);

    try {
      // Here you would implement the actual upload logic
      // For now, we'll simulate the upload process
      for (const file of filesToUpload) {
        if (file.status === 'pending') {
          // Update status to uploading
          setFilesToUpload(prev =>
            prev.map(f =>
              f.id === file.id ? { ...f, status: 'uploading' as const } : f
            )
          );

          // Simulate upload progress
          for (let progress = 0; progress <= 100; progress += 10) {
            await new Promise(resolve => setTimeout(resolve, 100));
            setFilesToUpload(prev =>
              prev.map(f =>
                f.id === file.id ? { ...f, progress } : f
              )
            );
          }

          // Simulate successful upload
          setFilesToUpload(prev =>
            prev.map(f =>
              f.id === file.id ? { ...f, status: 'completed' as const, progress: 100 } : f
            )
          );

          // Call the callback with uploaded media data
          const mediaData = {
            property_id: propertyId,
            media_type: 'photo' as MediaType, // This would be determined by file type
            url: `https://example.com/uploads/${file.name}`,
            title: file.name,
            file_size: file.size,
            mime_type: file.type
          };

          onMediaUploaded(mediaData);
        }
      }

      // Clear completed uploads after a delay
      setTimeout(() => {
        setFilesToUpload(prev => prev.filter(f => f.status !== 'completed'));
      }, 2000);

    } catch (error) {
      onUploadError('Failed to upload files');
      setFilesToUpload(prev =>
        prev.map(f =>
          f.status === 'uploading' ? { ...f, status: 'error' as const, error: 'Upload failed' } : f
        )
      );
    } finally {
      setIsUploading(false);
    }
  }, [filesToUpload, isUploading, propertyId, onMediaUploaded, onUploadError]);

  // Render upload area
  const renderUploadArea = () => (
    <TouchableOpacity
      style={[styles.uploadArea, isDragActive && styles.uploadAreaActive, disabled && styles.uploadAreaDisabled]}
      onPress={handleFileSelection}
      disabled={disabled}
    >
      <MaterialIcons
        name="cloud-upload"
        size={48}
        color={disabled ? '#ccc' : '#007AFF'}
      />
      <Text style={[styles.uploadText, disabled && styles.uploadTextDisabled]}>
        {isDragActive ? 'Drop files here' : 'Tap to select files or drag and drop'}
      </Text>
      <Text style={[styles.uploadSubtext, disabled && styles.uploadSubtextDisabled]}>
        Supports: {allowedTypes.join(', ')} • Max {maxFileSize}MB per file
      </Text>
    </TouchableOpacity>
  );

  // Render action buttons
  const renderActionButtons = () => (
    <View style={styles.actionButtons}>
      <TouchableOpacity
        style={[styles.actionButton, styles.cameraButton]}
        onPress={handleCameraCapture}
        disabled={disabled}
      >
        <MaterialIcons name="camera-alt" size={20} color="#fff" />
        <Text style={styles.actionButtonText}>Camera</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButton, styles.galleryButton]}
        onPress={handleFileSelection}
        disabled={disabled}
      >
        <MaterialIcons name="photo-library" size={20} color="#fff" />
        <Text style={styles.actionButtonText}>Gallery</Text>
      </TouchableOpacity>

      {filesToUpload.length > 0 && (
        <TouchableOpacity
          style={[styles.actionButton, styles.uploadButton, isUploading && styles.uploadButtonDisabled]}
          onPress={handleUploadFiles}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <MaterialIcons name="file-upload" size={20} color="#fff" />
          )}
          <Text style={styles.actionButtonText}>
            {isUploading ? 'Uploading...' : `Upload (${filesToUpload.length})`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Render file list
  const renderFileList = () => (
    <View style={styles.fileList}>
      {filesToUpload.map((file) => (
        <View key={file.id} style={styles.fileItem}>
          <View style={styles.fileInfo}>
            <MaterialIcons
              name={file.type.startsWith('image/') ? 'image' : 'videocam'}
              size={24}
              color="#666"
            />
            <View style={styles.fileDetails}>
              <Text style={styles.fileName} numberOfLines={1}>
                {file.name}
              </Text>
              <Text style={styles.fileSize}>
                {(file.size / (1024 * 1024)).toFixed(1)}MB
              </Text>
            </View>
          </View>

          <View style={styles.fileActions}>
            {file.status === 'uploading' && (
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${file.progress}%` }]} />
                <Text style={styles.progressText}>{file.progress}%</Text>
              </View>
            )}

            {file.status === 'error' && (
              <Text style={styles.errorText}>{file.error}</Text>
            )}

            {file.status === 'completed' && (
              <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
            )}

            {(file.status === 'pending' || file.status === 'error') && (
              <TouchableOpacity
                onPress={() => removeFile(file.id)}
                style={styles.removeButton}
              >
                <MaterialIcons name="close" size={20} color="#ff4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {renderUploadArea()}
      {renderActionButtons()}
      {filesToUpload.length > 0 && renderFileList()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
    marginBottom: 16,
  },
  uploadAreaActive: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  uploadAreaDisabled: {
    borderColor: '#ccc',
    backgroundColor: '#f5f5f5',
  },
  uploadText: {
    fontSize: 16,
    color: '#333',
    marginTop: 12,
    textAlign: 'center',
  },
  uploadTextDisabled: {
    color: '#ccc',
  },
  uploadSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  uploadSubtextDisabled: {
    color: '#ccc',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  cameraButton: {
    backgroundColor: '#4CAF50',
  },
  galleryButton: {
    backgroundColor: '#2196F3',
  },
  uploadButton: {
    backgroundColor: '#FF9800',
  },
  uploadButtonDisabled: {
    backgroundColor: '#ccc',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  fileList: {
    marginTop: 16,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileDetails: {
    marginLeft: 12,
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  fileSize: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  fileActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    minWidth: 35,
  },
  errorText: {
    fontSize: 12,
    color: '#ff4444',
  },
  removeButton: {
    padding: 4,
  },
});

export default MediaUpload;