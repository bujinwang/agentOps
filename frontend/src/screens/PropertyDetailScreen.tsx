import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  StatusBar
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useProperties } from '../hooks/useProperties';
import PropertyDetail from '../components/PropertyDetail';
import { Property, PropertyMedia } from '../types/property';

const PropertyDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { property: initialProperty } = route.params as { property: Property };

  const {
    currentProperty,
    propertyMedia,
    isLoadingProperty,
    isLoadingMedia,
    loadProperty,
    loadPropertyMedia,
    recordPropertyView
  } = useProperties();

  const [property, setProperty] = useState<Property>(initialProperty);

  // Load property details and media on mount
  useEffect(() => {
    const loadData = async () => {
      await loadProperty(initialProperty.id);
      await loadPropertyMedia(initialProperty.id);

      // Record property view for analytics
      await recordPropertyView(initialProperty.id);
    };

    loadData();
  }, [initialProperty.id, loadProperty, loadPropertyMedia, recordPropertyView]);

  // Use loaded property data if available
  useEffect(() => {
    if (currentProperty) {
      setProperty(currentProperty);
    }
  }, [currentProperty]);

  const handleBack = () => {
    (navigation as any).goBack();
  };

  const handleEdit = () => {
    (navigation as any).navigate('PropertyForm', {
      mode: 'edit',
      property
    });
  };

  const handleDelete = async () => {
    // Navigate back to list - the actual delete is handled by confirmation in PropertyDetail
    (navigation as any).goBack();
  };

  const handleShare = async () => {
    // Share functionality is handled in PropertyDetail component
    // This callback can be used for additional share logic if needed
  };

  const handleViewMedia = (media: PropertyMedia) => {
    // Navigate to media viewer or handle media viewing
    // For now, just show an alert with media details
    Alert.alert(
      'Media Details',
      `Type: ${media.media_type}\nTitle: ${media.title || 'No title'}\nDescription: ${media.description || 'No description'}`,
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <PropertyDetail
        property={property}
        media={propertyMedia}
        onBack={handleBack}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onShare={handleShare}
        onViewMedia={handleViewMedia}
        showActions={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

export default PropertyDetailScreen;