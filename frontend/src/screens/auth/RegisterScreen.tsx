import { StackScreenProps } from '@react-navigation/stack';
import { AuthStackParamList } from '../../types';

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';

import { useAuth } from '../../contexts/AuthContext';
import { RegisterForm } from '../../types';
import { validateRegisterForm, getErrorMessage, hasError } from '../../utils/validation';
import { useScreenLayout } from '../../hooks/useScreenLayout';

type RegisterScreenProps = StackScreenProps<AuthStackParamList, 'Register'>;

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const { register, isLoading } = useAuth();
  const { containerStyle, contentStyle, responsive, theme } = useScreenLayout({
    maxWidth: { tablet: 560, desktop: 640 },
  });
  
  const [formData, setFormData] = useState<RegisterForm>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: keyof RegisterForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleRegister = async () => {
    if (isSubmitting || isLoading) return;

    const validation = validateRegisterForm(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrors({});
      await register(formData);
      // Navigation will be handled by AuthContext after successful registration
    } catch (error) {
      console.error('Registration error in RegisterScreen:', error);
      
      let message = 'Registration failed. Please try again.';
      let serverValidationErrors: Record<string, string> = {};
      
      if (error instanceof Error) {
        message = error.message;
        
        // Check if this error has validation details from the server
        const enhancedError = error as any;
        if (enhancedError.validationErrors && Array.isArray(enhancedError.validationErrors)) {
          // Convert server validation errors to the format expected by the form
          enhancedError.validationErrors.forEach((detail: any) => {
            if (detail.path) {
              // Map server field names to form field names
              const fieldName = detail.path === 'firstName' ? 'firstName' :
                              detail.path === 'lastName' ? 'lastName' :
                              detail.path === 'email' ? 'email' :
                              detail.path === 'password' ? 'password' : detail.path;
              serverValidationErrors[fieldName] = detail.msg;
            }
          });
          
          // Set the server validation errors to display them in the form
          setErrors(serverValidationErrors);
          return; // Don't show alert since we're showing field errors
        }
      }
      
      // Show generic error alert for non-validation errors
      Alert.alert('Registration Error', message, [
        { text: 'OK', style: 'default' }
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login');
  };

  const dynamicStyles = useMemo(() => ({
    title: {
      fontSize: responsive.getResponsiveFontSize(28),
      color: theme.colors.primary,
    },
    subtitle: {
      fontSize: responsive.getResponsiveFontSize(16),
      color: theme.colors.onSurfaceVariant,
    },
    input: {
      minHeight: responsive.getTouchTargetSize(48),
      fontSize: responsive.getResponsiveFontSize(16),
    },
    button: {
      minHeight: responsive.getTouchTargetSize(48),
    },
  }), [responsive, theme]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, containerStyle]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={[styles.content, contentStyle]}>
          <Text style={[styles.title, dynamicStyles.title]}>Create Account</Text>
          <Text style={[styles.subtitle, dynamicStyles.subtitle]}>Join Real Estate CRM</Text>

          <View style={styles.form}>
            <View style={styles.row}>
              <View style={[styles.inputContainer, styles.halfWidth]}>
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  style={[
                    styles.input,
                    dynamicStyles.input,
                    hasError(errors, 'firstName') && styles.inputError,
                  ]}
                  value={formData.firstName}
                  onChangeText={(value) => handleInputChange('firstName', value)}
                  placeholder="First name"
                  autoCapitalize="words"
                  editable={!isSubmitting && !isLoading}
                />
                {hasError(errors, 'firstName') && (
                  <Text style={styles.errorText}>
                    {getErrorMessage(errors, 'firstName')}
                  </Text>
                )}
              </View>

              <View style={[styles.inputContainer, styles.halfWidth]}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  style={[
                    styles.input,
                    dynamicStyles.input,
                    hasError(errors, 'lastName') && styles.inputError,
                  ]}
                  value={formData.lastName}
                  onChangeText={(value) => handleInputChange('lastName', value)}
                  placeholder="Last name"
                  autoCapitalize="words"
                  editable={!isSubmitting && !isLoading}
                />
                {hasError(errors, 'lastName') && (
                  <Text style={styles.errorText}>
                    {getErrorMessage(errors, 'lastName')}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[
                  styles.input,
                  dynamicStyles.input,
                  hasError(errors, 'email') && styles.inputError,
                ]}
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting && !isLoading}
              />
              {hasError(errors, 'email') && (
                <Text style={styles.errorText}>
                  {getErrorMessage(errors, 'email')}
                </Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={[
                  styles.input,
                  dynamicStyles.input,
                  hasError(errors, 'password') && styles.inputError,
                ]}
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                placeholder="Create a password (min 8 characters)"
                secureTextEntry
                autoCapitalize="none"
                editable={!isSubmitting && !isLoading}
              />
              {hasError(errors, 'password') && (
                <Text style={styles.errorText}>
                  {getErrorMessage(errors, 'password')}
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.registerButton,
                dynamicStyles.button,
                (isSubmitting || isLoading) && styles.buttonDisabled,
              ]}
              onPress={handleRegister}
              disabled={isSubmitting || isLoading}
            >
              <Text style={styles.registerButtonText}>
                {isSubmitting || isLoading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginLink}
              onPress={navigateToLogin}
              disabled={isSubmitting || isLoading}
            >
              <Text style={styles.loginLinkText}>
                Already have an account? Sign in
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#2196F3',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
  },
  form: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
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
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 4,
  },
  registerButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  loginLinkText: {
    color: '#2196F3',
    fontSize: 14,
  },
});

export default RegisterScreen;