import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  ScrollView,
  Modal,
  StatusBar,
  Platform,
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { PropertyMedia, MediaType } from '../types/property';

const { width, height } = Dimensions.get('window');

interface MediaViewerProps {
  visible: boolean;
  media: PropertyMedia[];
  initialIndex?: number;
  onClose: () => void;
  onDelete?: (mediaId: number) => void;
  onSetPrimary?: (mediaId: number) => void;
  onEdit?: (media: PropertyMedia) => void;
  showActions?: boolean;
  primaryMediaId?: number;
}

const MediaViewer: React.FC<MediaViewerProps> = ({
  visible,
  media,
  initialIndex = 0,
  onClose,
  onDelete,
  onSetPrimary,
  onEdit,
  showActions = false,
  primaryMediaId
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showInfo, setShowInfo] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const scrollViewRef = useRef<ScrollView>(null);

  // Reset zoom when media changes
  useEffect(() => {
    setZoomLevel(1);
  }, [currentIndex]);

  // Handle scroll to current media
  useEffect(() => {
    if (visible && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: currentIndex * width,
        animated: false
      });
    }
  }, [currentIndex, visible]);

  const currentMedia = media[currentIndex];
  const isPrimary = currentMedia?.id === primaryMediaId;

  // Handle scroll event to update current index
  const handleScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);

    if (roundIndex !== currentIndex && roundIndex >= 0 && roundIndex < media.length) {
      setCurrentIndex(roundIndex);
    }
  };

  // Handle zoom
  const handleZoom = (direction: 'in' | 'out') => {
    const newZoom = direction === 'in'
      ? Math.min(zoomLevel * 1.5, 3)
      : Math.max(zoomLevel / 1.5, 0.5);

    setZoomLevel(newZoom);
  };

  // Handle delete
  const handleDelete = () => {
    if (!currentMedia || !onDelete) return;

    Alert.alert(
      'Delete Media',
      `Are you sure you want to delete "${currentMedia.title || 'this media'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete(currentMedia.id);
            // Close viewer if this was the last media
            if (media.length === 1) {
              onClose();
            } else if (currentIndex === media.length - 1) {
              setCurrentIndex(currentIndex - 1);
            }
          }
        }
      ]
    );
  };

  // Handle set primary
  const handleSetPrimary = () => {
    if (!currentMedia || !onSetPrimary) return;
    onSetPrimary(currentMedia.id);
  };

  // Render media content
  const renderMediaContent = (item: PropertyMedia, index: number) => {
    const isVideo = item.media_type === 'video';

    return (
      <View key={item.id} style={styles.mediaContainer}>
        <ScrollView
          style={styles.mediaScrollView}
          contentContainerStyle={styles.mediaContent}
          minimumZoomScale={0.5}
          maximumZoomScale={3}
          zoomScale={zoomLevel}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        >
          {isVideo ? (
            <View style={styles.videoContainer}>
              <View style={styles.videoPlaceholder}>
                <MaterialIcons name="play-circle-filled" size={80} color="#fff" />
                <Text style={styles.videoText}>Video Player</Text>
                <Text style={styles.videoSubtext}>
                  Video playback would be implemented here
                </Text>
              </View>
            </View>
          ) : (
            <Image
              source={{ uri: item.url }}
              style={styles.mediaImage}
              resizeMode="contain"
            />
          )}
        </ScrollView>

        {/* Media info overlay */}
        {showInfo && (
          <View style={styles.infoOverlay}>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>
                {item.title || `Media ${item.id}`}
              </Text>
              {item.description && (
                <Text style={styles.infoDescription}>{item.description}</Text>
              )}
              <View style={styles.infoDetails}>
                <Text style={styles.infoDetail}>
                  Type: {getMediaTypeLabel(item.media_type)}
                </Text>
                <Text style={styles.infoDetail}>
                  Size: {formatFileSize(item.file_size)}
                </Text>
                <Text style={styles.infoDetail}>
                  Uploaded: {new Date(item.created_at).toLocaleDateString()}
                </Text>
                {item.updated_at !== item.created_at && (
                  <Text style={styles.infoDetail}>
                    Updated: {new Date(item.updated_at).toLocaleDateString()}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  // Render header
  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={onClose} style={styles.headerButton}>
        <MaterialIcons name="close" size={24} color="#fff" />
      </TouchableOpacity>

      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>
          {currentIndex + 1} of {media.length}
        </Text>
        {currentMedia && (
          <Text style={styles.headerSubtitle}>
            {currentMedia.title || `Media ${currentMedia.id}`}
          </Text>
        )}
      </View>

      <View style={styles.headerActions}>
        <TouchableOpacity
          onPress={() => setShowInfo(!showInfo)}
          style={styles.headerButton}
        >
          <MaterialIcons
            name={showInfo ? "info" : "info-outline"}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render footer controls
  const renderFooter = () => (
    <View style={styles.footer}>
      {/* Navigation */}
      <View style={styles.navigation}>
        <TouchableOpacity
          onPress={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
        >
          <MaterialIcons name="chevron-left" size={32} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setCurrentIndex(Math.min(media.length - 1, currentIndex + 1))}
          disabled={currentIndex === media.length - 1}
          style={[styles.navButton, currentIndex === media.length - 1 && styles.navButtonDisabled]}
        >
          <MaterialIcons name="chevron-right" size={32} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Zoom controls */}
      <View style={styles.zoomControls}>
        <TouchableOpacity
          onPress={() => handleZoom('out')}
          style={styles.zoomButton}
        >
          <MaterialIcons name="zoom-out" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.zoomText}>{Math.round(zoomLevel * 100)}%</Text>

        <TouchableOpacity
          onPress={() => handleZoom('in')}
          style={styles.zoomButton}
        >
          <MaterialIcons name="zoom-in" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Action buttons */}
      {showActions && (
        <View style={styles.actionButtons}>
          {onEdit && (
            <TouchableOpacity onPress={() => onEdit(currentMedia)} style={styles.actionButton}>
              <MaterialIcons name="edit" size={24} color="#fff" />
            </TouchableOpacity>
          )}

          {!isPrimary && onSetPrimary && (
            <TouchableOpacity onPress={handleSetPrimary} style={styles.actionButton}>
              <MaterialIcons name="star" size={24} color="#fff" />
            </TouchableOpacity>
          )}

          {onDelete && (
            <TouchableOpacity onPress={handleDelete} style={[styles.actionButton, styles.deleteButton]}>
              <MaterialIcons name="delete" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  if (!visible || !currentMedia) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <View style={styles.container}>
        {/* Header */}
        {renderHeader()}

        {/* Media content */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scrollContent}
        >
          {media.map((item, index) => renderMediaContent(item, index))}
        </ScrollView>

        {/* Footer */}
        {renderFooter()}
      </View>
    </Modal>
  );
};

// Helper functions
const getMediaTypeLabel = (type: MediaType): string => {
  const labels: Record<MediaType, string> = {
    photo: 'Photo',
    video: 'Video',
    virtual_tour: 'Virtual Tour',
    floor_plan: 'Floor Plan',
    document: 'Document'
  };
  return labels[type] || type;
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return 'Unknown';

  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#ccc',
    marginTop: 2,
  },
  headerActions: {
    width: 40,
    alignItems: 'flex-end',
  },
  scrollContent: {
    flexGrow: 1,
  },
  mediaContainer: {
    width,
    height: height - 140, // Account for header and footer
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaScrollView: {
    flex: 1,
    width,
  },
  mediaContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaImage: {
    width: width - 32,
    height: height - 200,
    borderRadius: 8,
  },
  videoContainer: {
    width: width - 32,
    height: height - 200,
    backgroundColor: '#333',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholder: {
    alignItems: 'center',
  },
  videoText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  videoSubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
    textAlign: 'center',
  },
  infoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 16,
  },
  infoContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  infoDescription: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 12,
    lineHeight: 20,
  },
  infoDetails: {
    gap: 4,
  },
  infoDetail: {
    fontSize: 12,
    color: '#ccc',
  },
  footer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    paddingTop: 16,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  zoomButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  zoomText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    minWidth: 60,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.8)',
  },
});

export default MediaViewer;