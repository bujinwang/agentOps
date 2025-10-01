import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  StatusBar,
  TouchableOpacity,
  Text
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import MediaUpload from '../components/MediaUpload';
import MediaGallery from '../components/MediaGallery';
import MediaViewer from '../components/MediaViewer';
import { PropertyMedia } from '../types/property';
import { useScreenLayout } from '../hooks/useScreenLayout';

interface RouteParams {
  propertyId: number;
  propertyTitle?: string;
}

const MediaManagementScreen: React.FC = () => {
  const { containerStyle, contentStyle, responsive, theme } = useScreenLayout();
  const navigation = useNavigation();
  const route = useRoute();
  const { propertyId, propertyTitle } = route.params as RouteParams;

  const dynamicStyles = useMemo(() => ({
    button: { minHeight: responsive.getTouchTargetSize(44) },
  }), [responsive]);

  const [media, setMedia] = useState<PropertyMedia[]>([]);
  const [primaryMediaId, setPrimaryMediaId] = useState<number | undefined>();
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Load media on mount
  useEffect(() => {
    loadMedia();
  }, [propertyId]);

  const loadMedia = async () => {
    setIsLoading(true);
    try {
      // In a real implementation, this would call the API
      // For now, we'll simulate loading some sample media
      const sampleMedia: PropertyMedia[] = [
        {
          id: 1,
          property_id: propertyId,
          media_type: 'photo',
          url: 'https://example.com/photo1.jpg',
          title: 'Living Room',
          description: 'Spacious living room with hardwood floors',
          file_size: 2048000,
          mime_type: 'image/jpeg',
          is_primary: true,
          is_featured: true,
          sort_order: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 2,
          property_id: propertyId,
          media_type: 'photo',
          url: 'https://example.com/photo2.jpg',
          title: 'Kitchen',
          description: 'Modern kitchen with granite countertops',
          file_size: 1536000,
          mime_type: 'image/jpeg',
          is_primary: false,
          is_featured: false,
          sort_order: 2,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 3,
          property_id: propertyId,
          media_type: 'video',
          url: 'https://example.com/video1.mp4',
          title: 'Property Tour',
          description: 'Complete walkthrough of the property',
          file_size: 10240000,
          mime_type: 'video/mp4',
          is_primary: false,
          is_featured: true,
          sort_order: 3,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      setMedia(sampleMedia);
      const primary = sampleMedia.find(m => m.is_primary);
      setPrimaryMediaId(primary?.id);
    } catch (error) {
      Alert.alert('Error', 'Failed to load media');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMediaUploaded = (newMedia: any) => {
    // Add the new media to the list
    const mediaItem: PropertyMedia = {
      id: Date.now(), // Temporary ID
      property_id: propertyId,
      media_type: newMedia.media_type,
      url: newMedia.url,
      title: newMedia.title,
      description: '',
      file_size: newMedia.file_size,
      mime_type: newMedia.mime_type,
      is_primary: false,
      is_featured: false,
      sort_order: media.length + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setMedia(prev => [...prev, mediaItem]);
  };

  const handleMediaUploadError = (error: string) => {
    Alert.alert('Upload Error', error);
  };

  const handleMediaPress = (selectedMedia: PropertyMedia) => {
    const index = media.findIndex(m => m.id === selectedMedia.id);
    if (index !== -1) {
      setViewerInitialIndex(index);
      setViewerVisible(true);
    }
  };

  const handleMediaLongPress = (selectedMedia: PropertyMedia) => {
    // Show quick actions menu
    Alert.alert(
      'Media Actions',
      `What would you like to do with "${selectedMedia.title || 'this media'}"?`,
      [
        {
          text: 'View Full Screen',
          onPress: () => handleMediaPress(selectedMedia)
        },
        {
          text: 'Set as Primary',
          onPress: () => handleSetPrimary(selectedMedia.id)
        },
        {
          text: 'Edit Details',
          onPress: () => handleEditMedia(selectedMedia)
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeleteMedia(selectedMedia.id)
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const handleSetPrimary = async (mediaId: number) => {
    try {
      // Update primary status
      setMedia(prev => prev.map(m => ({
        ...m,
        is_primary: m.id === mediaId
      })));
      setPrimaryMediaId(mediaId);

      // In a real implementation, this would call the API
      Alert.alert('Success', 'Primary media updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update primary media');
    }
  };

  const handleDeleteMedia = async (mediaId: number) => {
    const mediaToDelete = media.find(m => m.id === mediaId);
    if (!mediaToDelete) return;

    Alert.alert(
      'Delete Media',
      `Are you sure you want to delete "${mediaToDelete.title || 'this media'}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Remove from local state
              setMedia(prev => prev.filter(m => m.id !== mediaId));

              // Update primary if this was the primary
              if (primaryMediaId === mediaId) {
                const newPrimary = media.find(m => m.id !== mediaId);
                setPrimaryMediaId(newPrimary?.id);
              }

              // In a real implementation, this would call the API
              Alert.alert('Success', 'Media deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete media');
            }
          }
        }
      ]
    );
  };

  const handleEditMedia = (selectedMedia: PropertyMedia) => {
    // Navigate to edit screen or show edit modal
    Alert.alert(
      'Edit Media',
      'Media editing functionality would be implemented here',
      [{ text: 'OK' }]
    );
  };

  const handleBack = () => {
    (navigation as any).goBack();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {propertyTitle || 'Property'} Media
          </Text>
          <Text style={styles.headerSubtitle}>
            {media.length} media file{media.length !== 1 ? 's' : ''}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <MaterialIcons name="more-vert" size={24} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Upload Section */}
      <View style={styles.uploadSection}>
        <MediaUpload
          propertyId={propertyId}
          onMediaUploaded={handleMediaUploaded}
          onUploadError={handleMediaUploadError}
          maxFiles={20}
          allowedTypes={['photo', 'video', 'virtual_tour']}
          maxFileSize={50}
        />
      </View>

      {/* Gallery Section */}
      <View style={styles.gallerySection}>
        <MediaGallery
          media={media}
          onMediaPress={handleMediaPress}
          onMediaLongPress={handleMediaLongPress}
          onSetPrimary={handleSetPrimary}
          onDelete={handleDeleteMedia}
          showActions={true}
          primaryMediaId={primaryMediaId}
        />
      </View>

      {/* Media Viewer Modal */}
      <MediaViewer
        visible={viewerVisible}
        media={media}
        initialIndex={viewerInitialIndex}
        onClose={() => setViewerVisible(false)}
        onDelete={handleDeleteMedia}
        onSetPrimary={handleSetPrimary}
        onEdit={handleEditMedia}
        showActions={true}
        primaryMediaId={primaryMediaId}
      />

      {/* Loading overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Loading media...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  headerActions: {
    width: 40,
    alignItems: 'flex-end',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadSection: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gallerySection: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
});

export default MediaManagementScreen;