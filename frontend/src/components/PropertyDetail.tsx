import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Alert,
  Share
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Property, PropertyMedia, getPropertyTypeLabel, getPropertyStatusLabel, getListingTypeLabel } from '../types/property';

const { width } = Dimensions.get('window');

interface PropertyDetailProps {
  property: Property;
  media?: PropertyMedia[];
  onEdit?: () => void;
  onDelete?: () => void;
  onBack?: () => void;
  onShare?: () => void;
  onViewMedia?: (media: PropertyMedia) => void;
  showActions?: boolean;
}

const PropertyDetail: React.FC<PropertyDetailProps> = ({
  property,
  media = [],
  onEdit,
  onDelete,
  onBack,
  onShare,
  onViewMedia,
  showActions = false
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Get primary media or first available
  const primaryMedia = media.find(m => m.is_primary) || media[0];
  const displayMedia = media.length > 0 ? media : [];

  // Format price
  const formatPrice = (price?: number): string => {
    if (!price) return 'Price TBD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Format address
  const formatAddress = (address: Property['address']): string => {
    const parts = [
      address.street,
      address.city,
      address.state,
      address.zip_code
    ].filter(Boolean);

    return parts.join(', ');
  };

  // Handle share
  const handleShare = async () => {
    try {
      const message = `${property.title || 'Property'}\n${formatAddress(property.address)}\n${formatPrice(property.price)}\n\n${property.description || ''}`;

      await Share.share({
        message,
        title: property.title || 'Property Details'
      });
    } catch (error) {
      Alert.alert('Error', 'Unable to share property details');
    }
  };

  // Handle delete confirmation
  const handleDelete = () => {
    Alert.alert(
      'Delete Property',
      `Are you sure you want to delete "${property.title || 'this property'}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {property.title || 'Property Details'}
        </Text>

        <View style={styles.headerActions}>
          {onShare && (
            <TouchableOpacity onPress={onShare || handleShare} style={styles.iconButton}>
              <MaterialIcons name="share" size={24} color="#666" />
            </TouchableOpacity>
          )}
          {showActions && onEdit && (
            <TouchableOpacity onPress={onEdit} style={styles.iconButton}>
              <MaterialIcons name="edit" size={24} color="#666" />
            </TouchableOpacity>
          )}
          {showActions && onDelete && (
            <TouchableOpacity onPress={handleDelete} style={[styles.iconButton, styles.deleteButton]}>
              <MaterialIcons name="delete" size={24} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Property Images */}
        {displayMedia.length > 0 && (
          <View style={styles.imageSection}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(event) => {
                const slideSize = event.nativeEvent.layoutMeasurement.width;
                const index = event.nativeEvent.contentOffset.x / slideSize;
                const roundIndex = Math.round(index);
                setActiveImageIndex(roundIndex);
              }}
              scrollEventThrottle={16}
            >
              {displayMedia.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.imageContainer}
                  onPress={() => onViewMedia?.(item)}
                >
                  <Image
                    source={{ uri: item.url }}
                    style={styles.propertyImage}
                    resizeMode="cover"
                  />
                  {item.is_primary && (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryText}>Primary</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Image indicators */}
            {displayMedia.length > 1 && (
              <View style={styles.imageIndicators}>
                {displayMedia.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.indicator,
                      index === activeImageIndex && styles.activeIndicator
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Property Information */}
        <View style={styles.content}>
          {/* Price and Status */}
          <View style={styles.priceSection}>
            <Text style={styles.price}>{formatPrice(property.price)}</Text>
            <View style={styles.statusContainer}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(property.status) }]}>
                <Text style={styles.statusText}>
                  {getPropertyStatusLabel(property.status)}
                </Text>
              </View>
              <View style={styles.listingTypeBadge}>
                <Text style={styles.listingTypeText}>
                  {getListingTypeLabel(property.listing_type)}
                </Text>
              </View>
            </View>
          </View>

          {/* Address */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Address</Text>
            <Text style={styles.address}>{formatAddress(property.address)}</Text>
            {property.address.neighborhood && (
              <Text style={styles.neighborhood}>{property.address.neighborhood}</Text>
            )}
          </View>

          {/* Property Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Property Details</Text>
            <View style={styles.detailsGrid}>
              <DetailItem label="Type" value={getPropertyTypeLabel(property.property_type)} />
              {property.details?.bedrooms && (
                <DetailItem label="Bedrooms" value={property.details.bedrooms.toString()} />
              )}
              {property.details?.bathrooms && (
                <DetailItem label="Bathrooms" value={property.details.bathrooms.toString()} />
              )}
              {property.details?.half_bathrooms && (
                <DetailItem label="Half Baths" value={property.details.half_bathrooms.toString()} />
              )}
              {property.details?.square_feet && (
                <DetailItem label="Square Feet" value={property.details.square_feet.toLocaleString()} />
              )}
              {property.details?.lot_size && (
                <DetailItem label="Lot Size" value={`${property.details.lot_size} acres`} />
              )}
              {property.details?.year_built && (
                <DetailItem label="Year Built" value={property.details.year_built.toString()} />
              )}
              {property.details?.garage_spaces && (
                <DetailItem label="Garage Spaces" value={property.details.garage_spaces.toString()} />
              )}
              {property.details?.parking_spaces && (
                <DetailItem label="Parking Spaces" value={property.details.parking_spaces.toString()} />
              )}
              {property.details?.stories && (
                <DetailItem label="Stories" value={property.details.stories.toString()} />
              )}
            </View>
          </View>

          {/* Description */}
          {property.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{property.description}</Text>
            </View>
          )}

          {/* Features */}
          {property.features && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Features</Text>
              {property.features.interior?.length > 0 && (
                <FeatureList title="Interior" features={property.features.interior} />
              )}
              {property.features.exterior?.length > 0 && (
                <FeatureList title="Exterior" features={property.features.exterior} />
              )}
              {property.features.appliances?.length > 0 && (
                <FeatureList title="Appliances" features={property.features.appliances} />
              )}
              {property.features.utilities?.length > 0 && (
                <FeatureList title="Utilities" features={property.features.utilities} />
              )}
              {property.features.community?.length > 0 && (
                <FeatureList title="Community" features={property.features.community} />
              )}
            </View>
          )}

          {/* Marketing Information */}
          {property.marketing && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Showing Information</Text>
              {property.marketing.show_instructions && (
                <Text style={styles.marketingText}>{property.marketing.show_instructions}</Text>
              )}
              {property.marketing.occupancy && (
                <Text style={styles.marketingText}>Occupancy: {property.marketing.occupancy}</Text>
              )}
              {property.marketing.possession_date && (
                <Text style={styles.marketingText}>
                  Possession: {new Date(property.marketing.possession_date).toLocaleDateString()}
                </Text>
              )}
            </View>
          )}

          {/* MLS Information */}
          {property.mls_number && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>MLS Information</Text>
              <Text style={styles.mlsNumber}>MLS #: {property.mls_number}</Text>
            </View>
          )}

          {/* System Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>System Information</Text>
            <Text style={styles.systemText}>
              Created: {new Date(property.created_at).toLocaleDateString()}
            </Text>
            <Text style={styles.systemText}>
              Last Updated: {new Date(property.updated_at).toLocaleDateString()}
            </Text>
            {property.last_synced_at && (
              <Text style={styles.systemText}>
                Last Synced: {new Date(property.last_synced_at).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

// Helper component for detail items
const DetailItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.detailItem}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

// Helper component for feature lists
const FeatureList: React.FC<{ title: string; features: string[] }> = ({ title, features }) => (
  <View style={styles.featureSection}>
    <Text style={styles.featureTitle}>{title}</Text>
    <View style={styles.featureGrid}>
      {features.map((feature, index) => (
        <Text key={index} style={styles.featureItem}>• {feature}</Text>
      ))}
    </View>
  </View>
);

// Helper function for status colors
const getStatusColor = (status: Property['status']): string => {
  const colors: Record<Property['status'], string> = {
    active: '#4CAF50',
    pending: '#FF9800',
    sold: '#F44336',
    off_market: '#9E9E9E',
    withdrawn: '#607D8B',
    expired: '#795548'
  };
  return colors[status] || '#666';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 16,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    // Additional styling for delete button if needed
  },
  scrollView: {
    flex: 1,
  },
  imageSection: {
    height: 250,
  },
  imageContainer: {
    width,
    height: 250,
    position: 'relative',
  },
  propertyImage: {
    width: '100%',
    height: '100%',
  },
  primaryBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(0, 123, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  primaryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  imageIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
  },
  priceSection: {
    marginBottom: 24,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listingTypeBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  listingTypeText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  address: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  neighborhood: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailItem: {
    width: '50%',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  description: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  featureSection: {
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  featureItem: {
    width: '50%',
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    paddingRight: 8,
  },
  marketingText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  mlsNumber: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  systemText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
});

export default PropertyDetail;