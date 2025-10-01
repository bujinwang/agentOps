import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  StatusBar
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import PropertyList from '../components/PropertyList';
import { Property } from '../types/property';
import { useScreenLayout } from '../hooks/useScreenLayout';

const PropertyListScreen: React.FC = () => {
  const { containerStyle, contentStyle, responsive, theme } = useScreenLayout();
  const navigation = useNavigation();
  const [refreshKey, setRefreshKey] = useState(0);

  const dynamicStyles = useMemo(() => ({
    container: containerStyle,
  }), [containerStyle]);

  const handlePropertyPress = (property: Property) => {
    // Navigate to property detail screen
    (navigation as any).navigate('PropertyDetail', { property });
  };

  const handleCreateProperty = () => {
    // Navigate to property form screen for creating
    (navigation as any).navigate('PropertyForm', { mode: 'create' });
  };

  const handleEditProperty = (property: Property) => {
    // Navigate to property form screen for editing
    (navigation as any).navigate('PropertyForm', { mode: 'edit', property });
  };

  const handleDeleteProperty = (property: Property) => {
    // The delete confirmation is handled in the PropertyList component
    // This callback is called after successful deletion
    // Force a refresh of the list
    setRefreshKey(prev => prev + 1);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <PropertyList
        key={refreshKey} // Force re-render when needed
        onPropertyPress={handlePropertyPress}
        onCreateProperty={handleCreateProperty}
        onEditProperty={handleEditProperty}
        onDeleteProperty={handleDeleteProperty}
        showActions={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});

export default PropertyListScreen;