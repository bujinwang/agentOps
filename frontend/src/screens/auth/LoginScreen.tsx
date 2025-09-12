import { StackScreenProps } from '@react-navigation/stack';
import { AuthStackParamList } from '../../types';

import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
} from 'react-native';

import { useAuth } from '../../contexts/AuthContext';
import { LoginForm } from '../../types';
import { validateLoginForm, getErrorMessage, hasError } from '../../utils/validation';

type LoginScreenProps = StackScreenProps<AuthStackParamList, 'Login'>;

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  console.log('LoginScreen: Component mounting/rendering');
  
  const { login, isLoading } = useAuth();
  const [formData, setFormData] = useState<LoginForm>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleInputChange = (field: keyof LoginForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleLogin = async () => {
    console.log('LoginScreen: Login button pressed');
    const validationResult = validateLoginForm(formData);
    if (!validationResult.isValid) {
      setErrors(validationResult.errors);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrors({});
      await login(formData);
    } catch (error) {
      let errorMessage = 'Login failed. Please try again.';
      let errorTitle = 'Login Error';

      if (error instanceof Error) {
        // Handle specific error types
        if (error.message.includes('Invalid credentials')) {
          errorMessage = 'The email or password you entered is incorrect. Please check your credentials and try again.';
          errorTitle = 'Invalid Credentials';
        } else if (error.message.includes('Network error') || error.message.includes('timeout') || error.message.includes('AbortError')) {
          errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
          errorTitle = 'Connection Error';
        } else if (error.message.includes('Rate limit') || error.message.includes('Too many')) {
          errorMessage = 'Too many login attempts detected. Please wait a few minutes before trying again to protect your account security.';
          errorTitle = 'Rate Limited';
        } else if ((error as any).status === 429) {
          errorMessage = 'Too many login attempts. Your account is temporarily locked for security. Please wait 15 minutes before trying again.';
          errorTitle = 'Account Temporarily Locked';
        } else if ((error as any).status >= 500) {
          errorMessage = 'Server error occurred. Our team has been notified. Please try again later.';
          errorTitle = 'Server Error';
        } else {
          errorMessage = error.message;
        }
      }

      Alert.alert(errorTitle, errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const navigateToRegister = () => {
    console.log('LoginScreen: Navigate to register pressed');
    navigation.navigate('Register');
  };

  console.log('LoginScreen: About to render JSX');
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.title}>Real Estate CRM</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[
                  styles.input,
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
                  hasError(errors, 'password') && styles.inputError,
                ]}
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                placeholder="Enter your password"
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

            {/* Remember Me Checkbox */}
            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setRememberMe(!rememberMe)}
                disabled={isSubmitting || isLoading}
              >
                <View style={[styles.checkboxBox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Text style={styles.checkboxMark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Remember me</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.loginButton,
                (isSubmitting || isLoading) && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isSubmitting || isLoading}
            >
              {(isSubmitting || isLoading) ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={[styles.loginButtonText, styles.buttonTextWithSpinner]}>
                    Signing In...
                  </Text>
                </View>
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.registerLink}
              onPress={navigateToRegister}
              disabled={isSubmitting || isLoading}
            >
              <Text style={styles.registerLinkText}>
                Don't have an account? Sign up
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
    backgroundColor: '#f5f5f5', // Restored original background color
  },
  scrollContainer: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
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
  loginButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  registerLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  registerLinkText: {
    color: '#2196F3',
    fontSize: 14,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  checkboxMark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonTextWithSpinner: {
    marginLeft: 8,
  },
});

export default LoginScreen;