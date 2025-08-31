// Edit lead screen - similar to AddLeadScreen but pre-populated

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

import { LeadForm, PropertyType, Lead } from '../../types';
import { apiService } from '../../services/api';
import { validateLeadForm, getErrorMessage, hasError, parseCurrency } from '../../utils/validation';

interface EditLeadScreenProps {
  route: {
    params: {
      leadId: number;
    };
  };
  navigation: any;
}

const EditLeadScreen: React.FC<EditLeadScreenProps> = ({ route, navigation }) => {
  const { leadId } = route.params;
  const [lead, setLead] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
    loadLeadData();
  }, [leadId]);

  const loadLeadData = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getLead(leadId);
      const leadData = response.data;
      setLead(leadData);

      // Populate form with existing data
      setFormData({
        firstName: leadData.firstName || '',
        lastName: leadData.lastName || '',
        email: leadData.email || '',
        phoneNumber: leadData.phoneNumber || '',
        source: leadData.source || 'Manual Entry',
        budgetMin: leadData.budgetMin?.toString() || '',
        budgetMax: leadData.budgetMax?.toString() || '',
        desiredLocation: leadData.desiredLocation || '',
        propertyType: leadData.propertyType,
        bedroomsMin: leadData.bedroomsMin?.toString() || '',
        bathroomsMin: leadData.bathroomsMin?.toString() || '',
        notes: leadData.notes || '',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load lead data';
      Alert.alert('Error', message, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof LeadForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleCurrencyChange = (field: 'budgetMin' | 'budgetMax', value: string) => {
    const cleanValue = parseCurrency(value);
    handleInputChange(field, cleanValue);
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

      await apiService.updateLead(leadId, formData);

      Alert.alert(
        'Success',
        'Lead updated successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update lead';
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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size=\"large\" color=\"#2196F3\" />
        <Text style={styles.loadingText}>Loading lead data...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={[styles.input, hasError(errors, 'firstName') && styles.inputError]}
                value={formData.firstName}
                onChangeText={(value) => handleInputChange('firstName', value)}
                placeholder=\"First name\"
                autoCapitalize=\"words\"
                editable={!isSubmitting}
              />
              {hasError(errors, 'firstName') && (
                <Text style={styles.errorText}>
                  {getErrorMessage(errors, 'firstName')}
                </Text>
              )}
            </View>

            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={[styles.input, hasError(errors, 'lastName') && styles.inputError]}
                value={formData.lastName}
                onChangeText={(value) => handleInputChange('lastName', value)}
                placeholder=\"Last name\"
                autoCapitalize=\"words\"
                editable={!isSubmitting}
              />
              {hasError(errors, 'lastName') && (
                <Text style={styles.errorText}>
                  {getErrorMessage(errors, 'lastName')}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={[styles.input, hasError(errors, 'email') && styles.inputError]}
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              placeholder=\"email@example.com\"
              keyboardType=\"email-address\"
              autoCapitalize=\"none\"
              autoCorrect={false}
              editable={!isSubmitting}
            />
            {hasError(errors, 'email') && (
              <Text style={styles.errorText}>
                {getErrorMessage(errors, 'email')}
              </Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={[styles.input, hasError(errors, 'phoneNumber') && styles.inputError]}
              value={formData.phoneNumber}
              onChangeText={(value) => handleInputChange('phoneNumber', value)}
              placeholder=\"(555) 123-4567\"
              keyboardType=\"phone-pad\"
              editable={!isSubmitting}
            />
            {hasError(errors, 'phoneNumber') && (
              <Text style={styles.errorText}>
                {getErrorMessage(errors, 'phoneNumber')}
              </Text>
            )}
          </View>

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
          <Text style={styles.sectionTitle}>Property Requirements</Text>

          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>Min Budget ($)</Text>
              <TextInput
                style={[styles.input, hasError(errors, 'budgetMin') && styles.inputError]}
                value={formatCurrencyDisplay(formData.budgetMin || '')}
                onChangeText={(value) => handleCurrencyChange('budgetMin', value)}
                placeholder=\"500,000\"
                keyboardType=\"numeric\"
                editable={!isSubmitting}
              />
              {hasError(errors, 'budgetMin') && (
                <Text style={styles.errorText}>
                  {getErrorMessage(errors, 'budgetMin')}
                </Text>
              )}
            </View>

            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>Max Budget ($)</Text>
              <TextInput
                style={[styles.input, hasError(errors, 'budgetMax') && styles.inputError]}
                value={formatCurrencyDisplay(formData.budgetMax || '')}
                onChangeText={(value) => handleCurrencyChange('budgetMax', value)}
                placeholder=\"750,000\"
                keyboardType=\"numeric\"
                editable={!isSubmitting}
              />
              {hasError(errors, 'budgetMax') && (
                <Text style={styles.errorText}>
                  {getErrorMessage(errors, 'budgetMax')}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Desired Location</Text>
            <TextInput
              style={styles.input}
              value={formData.desiredLocation}
              onChangeText={(value) => handleInputChange('desiredLocation', value)}
              placeholder=\"Downtown Toronto, Mississauga, etc.\"
              autoCapitalize=\"words\"
              editable={!isSubmitting}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Property Type</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.propertyType}
                onValueChange={(value) => handleInputChange('propertyType', value)}
                enabled={!isSubmitting}
                style={styles.picker}
              >
                <Picker.Item label=\"Select property type\" value={undefined} />
                {propertyTypes.map((type) => (
                  <Picker.Item key={type} label={type} value={type} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>Min Bedrooms</Text>
              <TextInput
                style={[styles.input, hasError(errors, 'bedroomsMin') && styles.inputError]}
                value={formData.bedroomsMin}
                onChangeText={(value) => handleInputChange('bedroomsMin', value)}
                placeholder=\"2\"
                keyboardType=\"numeric\"
                editable={!isSubmitting}
              />
              {hasError(errors, 'bedroomsMin') && (
                <Text style={styles.errorText}>
                  {getErrorMessage(errors, 'bedroomsMin')}
                </Text>
              )}
            </View>

            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>Min Bathrooms</Text>
              <TextInput
                style={[styles.input, hasError(errors, 'bathroomsMin') && styles.inputError]}
                value={formData.bathroomsMin}
                onChangeText={(value) => handleInputChange('bathroomsMin', value)}
                placeholder=\"2.5\"
                keyboardType=\"numeric\"
                editable={!isSubmitting}
              />
              {hasError(errors, 'bathroomsMin') && (
                <Text style={styles.errorText}>
                  {getErrorMessage(errors, 'bathroomsMin')}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Additional Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Information</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.notes}
              onChangeText={(value) => handleInputChange('notes', value)}
              placeholder=\"Any additional notes about this lead...\"
              multiline
              numberOfLines={4}
              textAlignVertical=\"top\"
              editable={!isSubmitting}
            />
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Updating Lead...' : 'Update Lead'}
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
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    flex: 0.48,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#f44336',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
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
    color: '#f44336',
    fontSize: 12,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 32,
  },
});

export default EditLeadScreen;