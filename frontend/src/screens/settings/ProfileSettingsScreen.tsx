import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useSettings } from '../../contexts/SettingsContext';
import { validateEmail, formatPhoneNumber } from '../../utils/validation';
import { apiService } from '../../services/api';
import { useScreenLayout } from '../../hooks/useScreenLayout';

interface ProfileSettingsScreenProps {
  navigation: any;
}

interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  timezone: string;
  language: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const ProfileSettingsScreen: React.FC<ProfileSettingsScreenProps> = ({ navigation }) => {
  const { containerStyle, contentStyle, responsive, theme } = useScreenLayout();
  const { profile, updateProfile } = useSettings();

  const dynamicStyles = useMemo(() => ({
    input: { minHeight: responsive.getTouchTargetSize(48) },
    button: { minHeight: responsive.getTouchTargetSize(44) },
  }), [responsive]);
  
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    timezone: 'America/Toronto',
    language: 'en',
  });

  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        email: profile.email || '',
        phone: profile.phone || '',
        timezone: profile.timezone || 'America/Toronto',
        language: profile.language || 'en',
      });
    }
  }, [profile]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.phone && formData.phone.length < 10) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePasswordForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters long';
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) return;

    try {
      setIsSaving(true);
      setErrors({});

      await updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined,
        timezone: formData.timezone,
        language: formData.language,
      });

      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      Alert.alert('Error', message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!validatePasswordForm()) return;

    try {
      setIsChangingPassword(true);
      setErrors({});

      await apiService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      
      setShowPasswordSection(false);
      Alert.alert('Success', 'Password changed successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to change password';
      Alert.alert('Error', message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePasswordInputChange = (field: keyof PasswordFormData, value: string) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const renderInput = (
    label: string,
    field: keyof ProfileFormData,
    placeholder?: string,
    keyboardType: any = 'default',
    multiline = false
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, errors[field] && styles.inputError, multiline && styles.multilineInput]}
        value={formData[field]}
        onChangeText={(value) => handleInputChange(field, value)}
        placeholder={placeholder}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        editable={!isSaving}
      />
      {errors[field] && (
        <Text style={styles.errorText}>{errors[field]}</Text>
      )}
    </View>
  );

  const renderPasswordInput = (
    label: string,
    field: keyof PasswordFormData,
    placeholder?: string
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, errors[field] && styles.inputError]}
        value={passwordData[field]}
        onChangeText={(value) => handlePasswordInputChange(field, value)}
        placeholder={placeholder}
        secureTextEntry
        editable={!isChangingPassword}
      />
      {errors[field] && (
        <Text style={styles.errorText}>{errors[field]}</Text>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {formData.firstName?.[0]?.toUpperCase() || '?'}
              </Text>
            </View>
            <TouchableOpacity style={styles.changeAvatarButton}>
              <Text style={styles.changeAvatarText}>Change Photo</Text>
            </TouchableOpacity>
          </View>

          {renderInput('First Name *', 'firstName', 'Enter your first name')}
          {renderInput('Last Name *', 'lastName', 'Enter your last name')}
          {renderInput('Email *', 'email', 'Enter your email address', 'email-address')}
          {renderInput('Phone', 'phone', 'Enter your phone number', 'phone-pad')}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Timezone</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.timezone}
                onValueChange={(value) => handleInputChange('timezone', value)}
                style={styles.picker}
                enabled={!isSaving}
              >
                <Picker.Item label="Eastern Time (Toronto)" value="America/Toronto" />
                <Picker.Item label="Central Time (Chicago)" value="America/Chicago" />
                <Picker.Item label="Mountain Time (Denver)" value="America/Denver" />
                <Picker.Item label="Pacific Time (Los Angeles)" value="America/Los_Angeles" />
                <Picker.Item label="UTC" value="UTC" />
              </Picker>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Language</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.language}
                onValueChange={(value) => handleInputChange('language', value)}
                style={styles.picker}
                enabled={!isSaving}
              >
                <Picker.Item label="English" value="en" />
                <Picker.Item label="Français" value="fr" />
                <Picker.Item label="Español" value="es" />
              </Picker>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.buttonDisabled]}
            onPress={handleSaveProfile}
            disabled={isSaving}
          >
            {isSaving ? (
              <View style={styles.savingContainer}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.saveButtonText}>Saving...</Text>
              </View>
            ) : (
              <Text style={styles.saveButtonText}>Save Profile</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Password Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setShowPasswordSection(!showPasswordSection)}
          >
            <Text style={styles.sectionTitle}>Change Password</Text>
            <Text style={styles.chevron}>{showPasswordSection ? '▼' : '▶'}</Text>
          </TouchableOpacity>

          {showPasswordSection && (
            <>
              {renderPasswordInput('Current Password', 'currentPassword', 'Enter current password')}
              {renderPasswordInput('New Password', 'newPassword', 'Enter new password')}
              {renderPasswordInput('Confirm Password', 'confirmPassword', 'Confirm new password')}

              <View style={styles.passwordRequirements}>
                <Text style={styles.passwordRequirementsTitle}>Password Requirements:</Text>
                <Text style={styles.passwordRequirement}>• At least 8 characters long</Text>
                <Text style={styles.passwordRequirement}>• Mix of letters and numbers recommended</Text>
                <Text style={styles.passwordRequirement}>• Should be unique and secure</Text>
              </View>

              <TouchableOpacity
                style={[styles.changePasswordButton, isChangingPassword && styles.buttonDisabled]}
                onPress={handleChangePassword}
                disabled={isChangingPassword}
              >
                {isChangingPassword ? (
                  <View style={styles.savingContainer}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.changePasswordButtonText}>Changing...</Text>
                  </View>
                ) : (
                  <Text style={styles.changePasswordButtonText}>Change Password</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

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
  scrollContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  chevron: {
    fontSize: 16,
    color: '#666',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  changeAvatarButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  changeAvatarText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
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
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 4,
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
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  savingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  passwordRequirements: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  passwordRequirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  passwordRequirement: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  changePasswordButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  changePasswordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  bottomSpacer: {
    height: 32,
  },
});

export default ProfileSettingsScreen;