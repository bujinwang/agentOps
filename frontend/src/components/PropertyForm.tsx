import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Switch,
  Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import {
  Property,
  PropertyCreate,
  PropertyUpdate,
  PropertyType,
  PropertyStatus,
  ListingType,
  RentPeriod,
  PROPERTY_TYPES,
  PROPERTY_STATUSES,
  LISTING_TYPES,
  validatePropertyAddress,
  validatePropertyPrice
} from '../types/property';

interface PropertyFormProps {
  property?: Property;
  onSubmit: (data: PropertyCreate | PropertyUpdate) => void;
  onCancel: () => void;
  isLoading?: boolean;
  submitButtonText?: string;
}

interface FormData extends PropertyCreate {
  // Additional form fields
  saveAsDraft?: boolean;
}

const PropertyForm: React.FC<PropertyFormProps> = ({
  property,
  onSubmit,
  onCancel,
  isLoading = false,
  submitButtonText = property ? 'Update Property' : 'Create Property'
}) => {
  const [formData, setFormData] = useState<FormData>({
    property_type: 'single_family',
    status: 'active',
    listing_type: 'sale',
    address: {
      street: '',
      city: '',
      state: '',
      zip_code: '',
      country: 'US'
    },
    details: {},
    features: {
      interior: [],
      exterior: [],
      appliances: [],
      utilities: [],
      community: []
    },
    marketing: {},
    ...property
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Initialize form with existing property data
  useEffect(() => {
    if (property) {
      setFormData({
        ...property,
        saveAsDraft: false
      });
    }
  }, [property]);

  // Update form field
  const updateField = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when field is modified
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Update nested field
  const updateNestedField = (parent: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent as keyof FormData] as any,
        [field]: value
      }
    }));

    // Clear error for nested field
    const errorKey = `${parent}.${field}`;
    if (errors[errorKey]) {
      setErrors(prev => ({
        ...prev,
        [errorKey]: ''
      }));
    }
  };

  // Mark field as touched
  const markTouched = (field: string) => {
    setTouched(prev => ({
      ...prev,
      [field]: true
    }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.property_type) {
      newErrors.property_type = 'Property type is required';
    }

    // Address validation
    const addressValidation = validatePropertyAddress(formData.address);
    if (!addressValidation.isValid) {
      addressValidation.errors.forEach(error => {
        newErrors[error.field] = error.message;
      });
    }

    // Price validation
    const priceValidation = validatePropertyPrice(formData);
    if (!priceValidation.isValid) {
      priceValidation.errors.forEach(error => {
        newErrors[error.field] = error.message;
      });
    }

    // Additional validations
    if (formData.listing_type === 'rent' && !formData.rent_price) {
      newErrors.rent_price = 'Rent price is required for rental listings';
    }

    if (formData.price_min && formData.price_max && formData.price_min > formData.price_max) {
      newErrors.price_range = 'Minimum price cannot be greater than maximum price';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = () => {
    // Mark all fields as touched
    const allFields = [
      'property_type', 'address.street', 'address.city', 'address.state', 'address.zip_code'
    ];
    const newTouched: Record<string, boolean> = {};
    allFields.forEach(field => {
      newTouched[field] = true;
    });
    setTouched(newTouched);

    if (validateForm()) {
      // Remove form-specific fields before submitting
      const { saveAsDraft, ...submitData } = formData;
      onSubmit(submitData);
    } else {
      Alert.alert('Validation Error', 'Please fix the errors in the form before submitting.');
    }
  };

  // Render form field
  const renderField = (
    label: string,
    field: string,
    component: React.ReactNode,
    required = false
  ) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      {component}
      {touched[field] && errors[field] && (
        <Text style={styles.errorText}>{errors[field]}</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          {/* Property Type */}
          {renderField(
            'Property Type',
            'property_type',
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.property_type}
                onValueChange={(value) => updateField('property_type', value)}
                style={styles.picker}
              >
                {Object.entries(PROPERTY_TYPES).map(([key, label]) => (
                  <Picker.Item key={key} label={label} value={key} />
                ))}
              </Picker>
            </View>,
            true
          )}

          {/* Status */}
          {renderField(
            'Status',
            'status',
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.status}
                onValueChange={(value) => updateField('status', value)}
                style={styles.picker}
              >
                {Object.entries(PROPERTY_STATUSES).map(([key, label]) => (
                  <Picker.Item key={key} label={label} value={key} />
                ))}
              </Picker>
            </View>
          )}

          {/* Listing Type */}
          {renderField(
            'Listing Type',
            'listing_type',
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.listing_type}
                onValueChange={(value) => updateField('listing_type', value)}
                style={styles.picker}
              >
                {Object.entries(LISTING_TYPES).map(([key, label]) => (
                  <Picker.Item key={key} label={label} value={key} />
                ))}
              </Picker>
            </View>
          )}

          {/* MLS Number */}
          {renderField(
            'MLS Number',
            'mls_number',
            <TextInput
              style={styles.textInput}
              value={formData.mls_number || ''}
              onChangeText={(value) => updateField('mls_number', value)}
              onBlur={() => markTouched('mls_number')}
              placeholder="Enter MLS number"
              keyboardType="numeric"
            />
          )}

          {/* Address Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Address</Text>

            {renderField(
              'Street Address',
              'address.street',
              <TextInput
                style={styles.textInput}
                value={formData.address.street}
                onChangeText={(value) => updateNestedField('address', 'street', value)}
                onBlur={() => markTouched('address.street')}
                placeholder="123 Main Street"
              />,
              true
            )}

            {renderField(
              'City',
              'address.city',
              <TextInput
                style={styles.textInput}
                value={formData.address.city}
                onChangeText={(value) => updateNestedField('address', 'city', value)}
                onBlur={() => markTouched('address.city')}
                placeholder="Springfield"
              />,
              true
            )}

            <View style={styles.row}>
              {renderField(
                'State',
                'address.state',
                <TextInput
                  style={[styles.textInput, styles.halfWidth]}
                  value={formData.address.state}
                  onChangeText={(value) => updateNestedField('address', 'state', value)}
                  onBlur={() => markTouched('address.state')}
                  placeholder="IL"
                  maxLength={2}
                  autoCapitalize="characters"
                />,
                true
              )}

              {renderField(
                'ZIP Code',
                'address.zip_code',
                <TextInput
                  style={[styles.textInput, styles.halfWidth]}
                  value={formData.address.zip_code}
                  onChangeText={(value) => updateNestedField('address', 'zip_code', value)}
                  onBlur={() => markTouched('address.zip_code')}
                  placeholder="62701"
                  keyboardType="numeric"
                  maxLength={10}
                />,
                true
              )}
            </View>

            {renderField(
              'Neighborhood',
              'address.neighborhood',
              <TextInput
                style={styles.textInput}
                value={formData.address.neighborhood || ''}
                onChangeText={(value) => updateNestedField('address', 'neighborhood', value)}
                placeholder="Downtown"
              />
            )}
          </View>

          {/* Pricing Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pricing</Text>

            {formData.listing_type === 'sale' && (
              <>
                {renderField(
                  'Sale Price',
                  'price',
                  <TextInput
                    style={styles.textInput}
                    value={formData.price?.toString() || ''}
                    onChangeText={(value) => updateField('price', value ? parseFloat(value) : undefined)}
                    onBlur={() => markTouched('price')}
                    placeholder="450000"
                    keyboardType="numeric"
                  />
                )}

                <View style={styles.row}>
                  {renderField(
                    'Min Price',
                    'price_min',
                    <TextInput
                      style={[styles.textInput, styles.halfWidth]}
                      value={formData.price_min?.toString() || ''}
                      onChangeText={(value) => updateField('price_min', value ? parseFloat(value) : undefined)}
                      placeholder="400000"
                      keyboardType="numeric"
                    />
                  )}

                  {renderField(
                    'Max Price',
                    'price_max',
                    <TextInput
                      style={[styles.textInput, styles.halfWidth]}
                      value={formData.price_max?.toString() || ''}
                      onChangeText={(value) => updateField('price_max', value ? parseFloat(value) : undefined)}
                      placeholder="500000"
                      keyboardType="numeric"
                    />
                  )}
                </View>
              </>
            )}

            {(formData.listing_type === 'rent' || formData.listing_type === 'both') && (
              <>
                {renderField(
                  'Rent Price',
                  'rent_price',
                  <TextInput
                    style={styles.textInput}
                    value={formData.rent_price?.toString() || ''}
                    onChangeText={(value) => updateField('rent_price', value ? parseFloat(value) : undefined)}
                    onBlur={() => markTouched('rent_price')}
                    placeholder="2000"
                    keyboardType="numeric"
                  />,
                  formData.listing_type === 'rent'
                )}

                {renderField(
                  'Rent Period',
                  'rent_period',
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.rent_period || 'month'}
                      onValueChange={(value) => updateField('rent_period', value)}
                      style={styles.picker}
                    >
                      <Picker.Item label="Per Month" value="month" />
                      <Picker.Item label="Per Week" value="week" />
                      <Picker.Item label="Per Day" value="day" />
                    </Picker>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Property Details Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Property Details</Text>

            <View style={styles.row}>
              {renderField(
                'Bedrooms',
                'details.bedrooms',
                <TextInput
                  style={[styles.textInput, styles.halfWidth]}
                  value={formData.details?.bedrooms?.toString() || ''}
                  onChangeText={(value) => updateNestedField('details', 'bedrooms', value ? parseFloat(value) : undefined)}
                  placeholder="3"
                  keyboardType="numeric"
                />
              )}

              {renderField(
                'Bathrooms',
                'details.bathrooms',
                <TextInput
                  style={[styles.textInput, styles.halfWidth]}
                  value={formData.details?.bathrooms?.toString() || ''}
                  onChangeText={(value) => updateNestedField('details', 'bathrooms', value ? parseFloat(value) : undefined)}
                  placeholder="2"
                  keyboardType="numeric"
                />
              )}
            </View>

            <View style={styles.row}>
              {renderField(
                'Square Feet',
                'details.square_feet',
                <TextInput
                  style={[styles.textInput, styles.halfWidth]}
                  value={formData.details?.square_feet?.toString() || ''}
                  onChangeText={(value) => updateNestedField('details', 'square_feet', value ? parseInt(value) : undefined)}
                  placeholder="2200"
                  keyboardType="numeric"
                />
              )}

              {renderField(
                'Lot Size (acres)',
                'details.lot_size',
                <TextInput
                  style={[styles.textInput, styles.halfWidth]}
                  value={formData.details?.lot_size?.toString() || ''}
                  onChangeText={(value) => updateNestedField('details', 'lot_size', value ? parseFloat(value) : undefined)}
                  placeholder="0.25"
                  keyboardType="numeric"
                />
              )}
            </View>

            <View style={styles.row}>
              {renderField(
                'Year Built',
                'details.year_built',
                <TextInput
                  style={[styles.textInput, styles.halfWidth]}
                  value={formData.details?.year_built?.toString() || ''}
                  onChangeText={(value) => updateNestedField('details', 'year_built', value ? parseInt(value) : undefined)}
                  placeholder="1995"
                  keyboardType="numeric"
                  maxLength={4}
                />
              )}

              {renderField(
                'Stories',
                'details.stories',
                <TextInput
                  style={[styles.textInput, styles.halfWidth]}
                  value={formData.details?.stories?.toString() || ''}
                  onChangeText={(value) => updateNestedField('details', 'stories', value ? parseInt(value) : undefined)}
                  placeholder="2"
                  keyboardType="numeric"
                />
              )}
            </View>
          </View>

          {/* Content Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Content</Text>

            {renderField(
              'Title',
              'title',
              <TextInput
                style={styles.textInput}
                value={formData.title || ''}
                onChangeText={(value) => updateField('title', value)}
                placeholder="Beautiful 3BR/2BA Home"
              />
            )}

            {renderField(
              'Description',
              'description',
              <TextInput
                style={[styles.textInput, styles.multiline]}
                value={formData.description || ''}
                onChangeText={(value) => updateField('description', value)}
                placeholder="Describe the property..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            )}

            {renderField(
              'Public Remarks',
              'public_remarks',
              <TextInput
                style={[styles.textInput, styles.multiline]}
                value={formData.public_remarks || ''}
                onChangeText={(value) => updateField('public_remarks', value)}
                placeholder="Additional remarks for public display..."
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            )}
          </View>

          {/* Save as Draft Option */}
          {!property && (
            <View style={styles.section}>
              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>Save as Draft</Text>
                <Switch
                  value={formData.saveAsDraft || false}
                  onValueChange={(value) => updateField('saveAsDraft', value)}
                />
              </View>
              <Text style={styles.switchDescription}>
                Save this property as a draft to complete later
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Form Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={onCancel}
          disabled={isLoading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.submitButton]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <Text style={styles.submitButtonText}>Saving...</Text>
          ) : (
            <Text style={styles.submitButtonText}>{submitButtonText}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#ff4444',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  halfWidth: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    marginTop: 4,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  switchDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default PropertyForm;