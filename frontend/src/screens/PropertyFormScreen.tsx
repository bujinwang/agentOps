import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  StatusBar
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useProperties } from '../hooks/useProperties';
import PropertyForm from '../components/PropertyForm';
import { PropertyCreate, PropertyUpdate } from '../types/property';

type FormMode = 'create' | 'edit';

interface RouteParams {
  mode: FormMode;
  property?: any; // Property from navigation
}

const PropertyFormScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { mode, property: routeProperty } = route.params as RouteParams;

  const {
    createProperty,
    updateProperty,
    isCreating,
    isUpdating
  } = useProperties();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = mode === 'edit';
  const isLoading = isEditMode ? isUpdating : isCreating;

  const handleSubmit = async (data: PropertyCreate | PropertyUpdate) => {
    setIsSubmitting(true);

    try {
      let result;

      if (isEditMode && routeProperty) {
        // Update existing property
        result = await updateProperty(routeProperty.id, data as PropertyUpdate);
      } else {
        // Create new property
        result = await createProperty(data as PropertyCreate);
      }

      if (result) {
        // Success - navigate back to list
        Alert.alert(
          'Success',
          `Property ${isEditMode ? 'updated' : 'created'} successfully!`,
          [
            {
              text: 'OK',
              onPress: () => {
                (navigation as any).goBack();
              }
            }
          ]
        );
      } else {
        // Error already handled by the hook
      }
    } catch (error) {
      Alert.alert(
        'Error',
        `Failed to ${isEditMode ? 'update' : 'create'} property. Please try again.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Check if there are unsaved changes
    Alert.alert(
      'Discard Changes',
      'Are you sure you want to discard your changes?',
      [
        { text: 'Keep Editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            (navigation as any).goBack();
          }
        }
      ]
    );
  };

  const getSubmitButtonText = () => {
    if (isSubmitting) {
      return isEditMode ? 'Updating...' : 'Creating...';
    }
    return isEditMode ? 'Update Property' : 'Create Property';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <PropertyForm
        property={isEditMode ? routeProperty : undefined}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading || isSubmitting}
        submitButtonText={getSubmitButtonText()}
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

export default PropertyFormScreen;