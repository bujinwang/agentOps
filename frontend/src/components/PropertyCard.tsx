import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Property, getPropertyTypeLabel, getPropertyStatusLabel, getListingTypeLabel } from '../types/property';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // Two cards per row with padding

interface PropertyCardProps {
  property: Property;
  media?: PropertyMedia[];
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

import { PropertyMedia } from '../types/property';

const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  media = [],
  onPress,
  onEdit,
  onDelete,
  showActions = false
}) => {
  // Get primary media URL
  const primaryMedia = media.find(m => m.is_primary);
  const imageUrl = primaryMedia?.url || 'https://via.placeholder.com/300x200?text=No+Image';

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

  // Get status color
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

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Property Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(property.status) }]}>
          <Text style={styles.statusText}>
            {getPropertyStatusLabel(property.status)}
          </Text>
        </View>

        {/* Listing Type Badge */}
        <View style={styles.listingTypeBadge}>
          <Text style={styles.listingTypeText}>
            {getListingTypeLabel(property.listing_type)}
          </Text>
        </View>

        {/* Actions Menu (if enabled) */}
        {showActions && (
          <View style={styles.actionsContainer}>
            {onEdit && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <MaterialIcons name="edit" size={20} color="#fff" />
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <MaterialIcons name="delete" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Property Details */}
      <View style={styles.detailsContainer}>
        {/* Price */}
        <Text style={styles.price}>
          {formatPrice(property.price)}
        </Text>

        {/* Address */}
        <Text style={styles.address} numberOfLines={2}>
          {formatAddress(property.address)}
        </Text>

        {/* Property Type and Details */}
        <View style={styles.propertyInfo}>
          <Text style={styles.propertyType}>
            {getPropertyTypeLabel(property.property_type)}
          </Text>

          {/* Key details */}
          <View style={styles.keyDetails}>
            {property.details?.bedrooms && (
              <Text style={styles.detailText}>
                {property.details.bedrooms} bed
              </Text>
            )}
            {property.details?.bathrooms && (
              <Text style={styles.detailText}>
                {property.details.bathrooms} bath
              </Text>
            )}
            {property.details?.square_feet && (
              <Text style={styles.detailText}>
                {property.details.square_feet.toLocaleString()} sqft
              </Text>
            )}
          </View>
        </View>

        {/* MLS Number (if available) */}
        {property.mls_number && (
          <Text style={styles.mlsNumber}>
            MLS: {property.mls_number}
          </Text>
        )}

        {/* Last Updated */}
        <Text style={styles.lastUpdated}>
          Updated {new Date(property.updated_at).toLocaleDateString()}
        </Text>
      </View>

      {/* Property Features Preview */}
      {property.features?.interior?.length > 0 && (
        <View style={styles.featuresContainer}>
          <Text style={styles.featuresText} numberOfLines={1}>
            {property.features.interior.slice(0, 3).join(' • ')}
            {property.features.interior.length > 3 && ' • ...'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: cardWidth,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    height: 140,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  listingTypeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  listingTypeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  actionsContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    backgroundColor: 'rgba(0, 123, 255, 0.9)',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: 'rgba(220, 53, 69, 0.9)',
  },
  detailsContainer: {
    padding: 12,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
    marginBottom: 8,
  },
  propertyInfo: {
    marginBottom: 8,
  },
  propertyType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  keyDetails: {
    flexDirection: 'row',
    gap: 12,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
  },
  mlsNumber: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 4,
  },
  lastUpdated: {
    fontSize: 11,
    color: '#999',
  },
  featuresContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  featuresText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default PropertyCard;