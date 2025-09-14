import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
  Image,
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { PropertyMedia, MediaType } from '../types/property';

const { width } = Dimensions.get('window');
const numColumns = 3;
const itemWidth = (width - 48) / numColumns; // 48 = padding * 2 + gap * 2

interface MediaGalleryProps {
  media: PropertyMedia[];
  onMediaPress: (media: PropertyMedia) => void;
  onMediaLongPress?: (media: PropertyMedia) => void;
  onSetPrimary?: (mediaId: number) => void;
  onDelete?: (mediaId: number) => void;
  showActions?: boolean;
  viewMode?: 'grid' | 'carousel';
  primaryMediaId?: number;
}

const MediaGallery: React.FC<MediaGalleryProps> = ({
  media,
  onMediaPress,
  onMediaLongPress,
  onSetPrimary,
  onDelete,
  showActions = false,
  viewMode = 'grid',
  primaryMediaId
}) => {
  const [currentViewMode, setCurrentViewMode] = useState<'grid' | 'carousel'>(viewMode);
  const [selectedMedia, setSelectedMedia] = useState<PropertyMedia | null>(null);

  // Sort media: primary first, then by creation date
  const sortedMedia = useMemo(() => {
    return [...media].sort((a, b) => {
      // Primary media first
      if (a.id === primaryMediaId) return -1;
      if (b.id === primaryMediaId) return 1;

      // Then by creation date (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [media, primaryMediaId]);

  // Handle media selection
  const handleMediaPress = (item: PropertyMedia) => {
    if (currentViewMode === 'carousel') {
      setSelectedMedia(item);
    } else {
      onMediaPress(item);
    }
  };

  // Handle long press for actions
  const handleLongPress = (item: PropertyMedia) => {
    if (showActions && onMediaLongPress) {
      onMediaLongPress(item);
    }
  };

  // Render media item
  const renderMediaItem = ({ item }: { item: PropertyMedia }) => {
    const isPrimary = item.id === primaryMediaId;
    const isVideo = item.media_type === 'video';

    return (
      <TouchableOpacity
        style={[styles.mediaItem, { width: itemWidth }]}
        onPress={() => handleMediaPress(item)}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.url }}
            style={styles.mediaImage}
            resizeMode="cover"
          />

          {/* Primary indicator */}
          {isPrimary && (
            <View style={styles.primaryBadge}>
              <MaterialIcons name="star" size={16} color="#FFD700" />
            </View>
          )}

          {/* Video indicator */}
          {isVideo && (
            <View style={styles.videoBadge}>
              <MaterialIcons name="play-circle-filled" size={24} color="#fff" />
            </View>
          )}

          {/* Media type indicator */}
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>
              {getMediaTypeLabel(item.media_type)}
            </Text>
          </View>

          {/* Actions overlay (shown on long press or when selected) */}
          {showActions && selectedMedia?.id === item.id && (
            <View style={styles.actionsOverlay}>
              <View style={styles.actionButtons}>
                {!isPrimary && onSetPrimary && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.primaryButton]}
                    onPress={() => {
                      onSetPrimary(item.id);
                      setSelectedMedia(null);
                    }}
                  >
                    <MaterialIcons name="star" size={16} color="#fff" />
                  </TouchableOpacity>
                )}

                {onDelete && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => {
                      Alert.alert(
                        'Delete Media',
                        'Are you sure you want to delete this media?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: () => {
                              onDelete(item.id);
                              setSelectedMedia(null);
                            }
                          }
                        ]
                      );
                    }}
                  >
                    <MaterialIcons name="delete" size={16} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Media info */}
        <View style={styles.mediaInfo}>
          <Text style={styles.mediaTitle} numberOfLines={1}>
            {item.title || `Media ${item.id}`}
          </Text>
          <Text style={styles.mediaDate}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Render carousel view
  const renderCarouselView = () => {
    if (sortedMedia.length === 0) {
      return renderEmptyState();
    }

    return (
      <View style={styles.carouselContainer}>
        <FlatList
          data={sortedMedia}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMediaItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContent}
          snapToInterval={width}
          decelerationRate="fast"
        />

        {/* Carousel indicators */}
        <View style={styles.carouselIndicators}>
          {sortedMedia.map((_, index) => (
            <View
              key={index}
              style={[
                styles.carouselIndicator,
                index === 0 && styles.activeCarouselIndicator
              ]}
            />
          ))}
        </View>
      </View>
    );
  };

  // Render grid view
  const renderGridView = () => {
    if (sortedMedia.length === 0) {
      return renderEmptyState();
    }

    return (
      <FlatList
        data={sortedMedia}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMediaItem}
        numColumns={numColumns}
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="image" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Media Yet</Text>
      <Text style={styles.emptySubtitle}>
        Upload photos and videos to showcase this property
      </Text>
    </View>
  );

  // Render view mode toggle
  const renderViewToggle = () => (
    <View style={styles.viewToggle}>
      <TouchableOpacity
        style={[
          styles.toggleButton,
          currentViewMode === 'grid' && styles.activeToggleButton
        ]}
        onPress={() => setCurrentViewMode('grid')}
      >
        <MaterialIcons name="grid-view" size={20} color={currentViewMode === 'grid' ? '#007AFF' : '#666'} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.toggleButton,
          currentViewMode === 'carousel' && styles.activeToggleButton
        ]}
        onPress={() => setCurrentViewMode('carousel')}
      >
        <MaterialIcons name="view-carousel" size={20} color={currentViewMode === 'carousel' ? '#007AFF' : '#666'} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header with view toggle */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Media Gallery ({sortedMedia.length})
        </Text>
        {sortedMedia.length > 0 && renderViewToggle()}
      </View>

      {/* Media content */}
      {currentViewMode === 'grid' ? renderGridView() : renderCarouselView()}

      {/* Media stats */}
      {sortedMedia.length > 0 && (
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            {sortedMedia.filter(m => m.media_type === 'photo').length} photos • {' '}
            {sortedMedia.filter(m => m.media_type === 'video').length} videos • {' '}
            {sortedMedia.filter(m => m.media_type === 'virtual_tour').length} tours
          </Text>
        </View>
      )}
    </View>
  );
};

// Helper function to get media type label
const getMediaTypeLabel = (type: MediaType): string => {
  const labels: Record<MediaType, string> = {
    photo: 'Photo',
    video: 'Video',
    virtual_tour: 'Tour',
    floor_plan: 'Floor Plan',
    document: 'Document'
  };
  return labels[type] || type;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 2,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  activeToggleButton: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  gridContainer: {
    padding: 16,
  },
  mediaItem: {
    margin: 4,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  imageContainer: {
    position: 'relative',
    height: itemWidth,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  primaryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -12 }, { translateY: -12 }],
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  actionsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#FFD700',
  },
  deleteButton: {
    backgroundColor: '#ff4444',
  },
  mediaInfo: {
    padding: 8,
  },
  mediaTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  mediaDate: {
    fontSize: 10,
    color: '#666',
  },
  carouselContainer: {
    flex: 1,
  },
  carouselContent: {
    paddingHorizontal: 16,
  },
  carouselIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  carouselIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
    marginHorizontal: 4,
  },
  activeCarouselIndicator: {
    backgroundColor: '#007AFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  statsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f8f8',
  },
  statsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});

export default MediaGallery;