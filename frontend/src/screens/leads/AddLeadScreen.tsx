// Enhanced lead creation form with Material Design UX improvements

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

import { LeadForm, PropertyType } from '../../types';
import { apiService } from '../../services/api';
import { validateLeadForm, getErrorMessage, hasError, parseCurrency } from '../../utils/validation';
import MaterialTextField from '../../components/MaterialTextField';
import { MaterialColors, MaterialSpacing, MaterialTypography, MaterialShape, MaterialElevation } from '../../styles/MaterialDesign';
import { ActionIcon } from '../../components/MaterialIcon';

interface AddLeadScreenProps {
  navigation: any;
}

const AddLeadScreen: React.FC<AddLeadScreenProps> = ({ navigation }) => {
  const [formData, setFormData] = useState<LeadForm>({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    source: 'Manual Entry',
    budgetMin: '',
    budgetMax: '',
    desiredLocation: '',
    propertyType: undefined,
    bedroomsMin: '',
    bathroomsMin: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPropertyDetails, setShowPropertyDetails] = useState(false);
  const [validationStatus, setValidationStatus] = useState<Record<string, 'idle' | 'valid' | 'invalid'>>({});

  const scrollViewRef = useRef<ScrollView>(null);

  const sources = [
    'Website Form',
    'Facebook Ad',
    'Manual Entry',
    'Referral',
    'Walk-in',
    'Phone Call',
    'Email',
    'Other',
  ];

  const propertyTypes: PropertyType[] = [
    'Condo',
    'House',
    'Townhouse',
    'Land',
    'Other',
  ];

  const handleInputChange = useCallback((field: keyof LeadForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Real-time validation for touched fields
    if (touched[field]) {
      const fieldValidation = validateField(field, value);
      setErrors(prev => ({ ...prev, [field]: fieldValidation.error }));
      setValidationStatus(prev => ({ ...prev, [field]: fieldValidation.status }));
    }
  }, [touched]);

  const handleBlur = useCallback((field: keyof LeadForm) => {
    setTouched(prev => ({ ...prev, [field]: true }));

    // Validate on blur
    const value = formData[field] as string;
    const fieldValidation = validateField(field, value);
    setErrors(prev => ({ ...prev, [field]: fieldValidation.error }));
    setValidationStatus(prev => ({ ...prev, [field]: fieldValidation.status }));
  }, [formData]);

  const validateField = (field: keyof LeadForm, value: string) => {
    let error = '';
    let status: 'idle' | 'valid' | 'invalid' = 'idle';

    switch (field) {
      case 'firstName':
      case 'lastName':
        if (!value.trim()) {
          error = `${field === 'firstName' ? 'First' : 'Last'} name is required`;
          status = 'invalid';
        } else if (value.length < 2) {
          error = 'Name must be at least 2 characters';
          status = 'invalid';
        } else {
          status = 'valid';
        }
        break;
      case 'email':
        if (!value.trim()) {
          error = 'Email is required';
          status = 'invalid';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = 'Please enter a valid email address';
          status = 'invalid';
        } else {
          status = 'valid';
        }
        break;
      case 'phoneNumber':
        if (value && !/^\+?[\d\s\-\(\)]{10,}$/.test(value.replace(/\s/g, ''))) {
          error = 'Please enter a valid phone number';
          status = 'invalid';
        } else if (value) {
          status = 'valid';
        }
        break;
      case 'budgetMin':
      case 'budgetMax':
        if (value && (isNaN(Number(value)) || Number(value) <= 0)) {
          error = 'Please enter a valid positive number';
          status = 'invalid';
        } else if (value) {
          status = 'valid';
        }
        break;
      case 'bedroomsMin':
      case 'bathroomsMin':
        if (value && (isNaN(Number(value)) || Number(value) <= 0)) {
          error = `${field === 'bedroomsMin' ? 'Bedrooms' : 'Bathrooms'} must be a positive number`;
          status = 'invalid';
        } else if (value) {
          status = 'valid';
        }
        break;
    }

    return { error, status };
  };

  const handleCurrencyChange = (field: 'budgetMin' | 'budgetMax', value: string) => {
    const cleanValue = parseCurrency(value);
    handleInputChange(field, cleanValue);
  };

  const togglePropertyDetails = () => {
    setShowPropertyDetails(!showPropertyDetails);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const validation = validateLeadForm(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      Alert.alert('Validation Error', 'Please fix the errors below');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrors({});

      await apiService.createLead(formData);

      Alert.alert(
        'Success',
        'Lead created successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create lead';
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrencyDisplay = (value: string): string => {
    if (!value) return '';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return num.toLocaleString();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Personal Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ActionIcon name="person" size={24} color={MaterialColors.primary[600]} />
            <Text style={styles.sectionTitle}>Personal Information</Text>
          </View>

          <View style={styles.row}>
            <MaterialTextField
              label="First Name"
              value={formData.firstName}
              onChangeText={(value) => handleInputChange('firstName', value)}
              placeholder="Enter first name"
              error={hasError(errors, 'firstName')}
              errorText={getErrorMessage(errors, 'firstName')}
              disabled={isSubmitting}
              required
              autoCapitalize="words"
              leftIcon={validationStatus.firstName === 'valid' ? 'check-circle' : undefined}
              style={styles.halfWidth}
            />

            <MaterialTextField
              label="Last Name"
              value={formData.lastName}
              onChangeText={(value) => handleInputChange('lastName', value)}
              placeholder="Enter last name"
              error={hasError(errors, 'lastName')}
              errorText={getErrorMessage(errors, 'lastName')}
              disabled={isSubmitting}
              required
              autoCapitalize="words"
              leftIcon={validationStatus.lastName === 'valid' ? 'check-circle' : undefined}
              style={styles.halfWidth}
            />
          </View>

          <MaterialTextField
            label="Email"
            value={formData.email}
            onChangeText={(value) => handleInputChange('email', value)}
            placeholder="email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={hasError(errors, 'email')}
            errorText={getErrorMessage(errors, 'email')}
            disabled={isSubmitting}
            required
            leftIcon="email"
            rightIcon={validationStatus.email === 'valid' ? 'check-circle' : undefined}
          />

          <MaterialTextField
            label="Phone Number"
            value={formData.phoneNumber}
            onChangeText={(value) => handleInputChange('phoneNumber', value)}
            placeholder="(555) 123-4567"
            keyboardType="phone-pad"
            error={hasError(errors, 'phoneNumber')}
            errorText={getErrorMessage(errors, 'phoneNumber')}
            disabled={isSubmitting}
            leftIcon="call"
            rightIcon={validationStatus.phoneNumber === 'valid' ? 'check-circle' : undefined}
          />

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Lead Source *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.source}
                onValueChange={(value) => handleInputChange('source', value)}
                enabled={!isSubmitting}
                style={styles.picker}
              >
                {sources.map((source) => (
                  <Picker.Item key={source} label={source} value={source} />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        {/* Property Requirements */}
        <View style={styles.section}>
          <TouchableWithoutFeedback onPress={togglePropertyDetails}>
            <View style={styles.sectionHeader}>
              <ActionIcon
                name="home"
                size={24}
                color={MaterialColors.primary[600]}
              />
              <Text style={styles.sectionTitle}>Property Requirements</Text>
              <ActionIcon
                name={showPropertyDetails ? 'expand-less' : 'expand-more'}
                size={24}
                color={MaterialColors.neutral[600]}
              />
            </View>
          </TouchableWithoutFeedback>

          {showPropertyDetails && (
            <Animated.View style={styles.expandedSection}>
              <View style={styles.row}>
                <MaterialTextField
                  label="Min Budget ($)"
                  value={formatCurrencyDisplay(formData.budgetMin || '')}
                  onChangeText={(value) => handleCurrencyChange('budgetMin', value)}
                  placeholder="500,000"
                  keyboardType="number-pad"
                  error={hasError(errors, 'budgetMin')}
                  errorText={getErrorMessage(errors, 'budgetMin')}
                  disabled={isSubmitting}
                  leftIcon="attach-money"
                  rightIcon={validationStatus.budgetMin === 'valid' ? 'check-circle' : undefined}
                  style={styles.halfWidth}
                />

                <MaterialTextField
                  label="Max Budget ($)"
                  value={formatCurrencyDisplay(formData.budgetMax || '')}
                  onChangeText={(value) => handleCurrencyChange('budgetMax', value)}
                  placeholder="750,000"
                  keyboardType="number-pad"
                  error={hasError(errors, 'budgetMax')}
                  errorText={getErrorMessage(errors, 'budgetMax')}
                  disabled={isSubmitting}
                  leftIcon="attach-money"
                  rightIcon={validationStatus.budgetMax === 'valid' ? 'check-circle' : undefined}
                  style={styles.halfWidth}
                />
              </View>

              <MaterialTextField
                label="Desired Location"
                value={formData.desiredLocation}
                onChangeText={(value) => handleInputChange('desiredLocation', value)}
                placeholder="Downtown Toronto, Mississauga, etc."
                autoCapitalize="words"
                disabled={isSubmitting}
                leftIcon="location-on"
              />

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Property Type</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.propertyType}
                    onValueChange={(value) => handleInputChange('propertyType', value)}
                    enabled={!isSubmitting}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select property type" value={undefined} />
                    {propertyTypes.map((type) => (
                      <Picker.Item key={type} label={type} value={type} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.row}>
                <MaterialTextField
                  label="Min Bedrooms"
                  value={formData.bedroomsMin}
                  onChangeText={(value) => handleInputChange('bedroomsMin', value)}
                  placeholder="2"
                  keyboardType="number-pad"
                  error={hasError(errors, 'bedroomsMin')}
                  errorText={getErrorMessage(errors, 'bedroomsMin')}
                  disabled={isSubmitting}
                  leftIcon="bed"
                  rightIcon={validationStatus.bedroomsMin === 'valid' ? 'check-circle' : undefined}
                  style={styles.halfWidth}
                />

                <MaterialTextField
                  label="Min Bathrooms"
                  value={formData.bathroomsMin}
                  onChangeText={(value) => handleInputChange('bathroomsMin', value)}
                  placeholder="2.5"
                  keyboardType="number-pad"
                  error={hasError(errors, 'bathroomsMin')}
                  errorText={getErrorMessage(errors, 'bathroomsMin')}
                  disabled={isSubmitting}
                  leftIcon="bathtub"
                  rightIcon={validationStatus.bathroomsMin === 'valid' ? 'check-circle' : undefined}
                  style={styles.halfWidth}
                />
              </View>
            </Animated.View>
          )}
        </View>

        {/* Additional Notes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ActionIcon name="notes" size={24} color={MaterialColors.primary[600]} />
            <Text style={styles.sectionTitle}>Additional Information</Text>
          </View>

          <MaterialTextField
            label="Notes"
            value={formData.notes}
            onChangeText={(value) => handleInputChange('notes', value)}
            placeholder="Any additional notes about this lead..."
            multiline
            numberOfLines={4}
            disabled={isSubmitting}
            leftIcon="description"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Creating Lead...' : 'Create Lead'}
          </Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MaterialColors.neutral[50],
  },
  scrollContainer: {
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.lg,
  },
  section: {
    backgroundColor: MaterialColors.surface,
    padding: MaterialSpacing.lg,
    borderRadius: MaterialShape.medium,
    marginBottom: MaterialSpacing.md,
    ...MaterialElevation.level2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: MaterialSpacing.md,
  },
  sectionTitle: {
    ...MaterialTypography.titleLarge,
    color: MaterialColors.neutral[900],
    marginLeft: MaterialSpacing.sm,
    flex: 1,
  },
  expandedSection: {
    marginTop: MaterialSpacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    flex: 0.48,
  },
  inputContainer: {
    marginBottom: MaterialSpacing.md,
  },
  label: {
    ...MaterialTypography.labelLarge,
    color: MaterialColors.neutral[700],
    marginBottom: MaterialSpacing.xs,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: MaterialColors.neutral[400],
    borderRadius: MaterialShape.small,
    backgroundColor: MaterialColors.surface,
    marginTop: MaterialSpacing.xs,
  },
  picker: {
    height: 56,
    ...MaterialTypography.bodyLarge,
  },
  submitButton: {
    backgroundColor: MaterialColors.primary[500],
    paddingVertical: MaterialSpacing.lg,
    borderRadius: MaterialShape.medium,
    alignItems: 'center',
    marginTop: MaterialSpacing.lg,
    ...MaterialElevation.level1,
  },
  buttonDisabled: {
    backgroundColor: MaterialColors.neutral[400],
    ...MaterialElevation.level0,
  },
  submitButtonText: {
    ...MaterialTypography.labelLarge,
    color: MaterialColors.onPrimary,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: MaterialSpacing.xxxl,
  },
});

export default AddLeadScreen;