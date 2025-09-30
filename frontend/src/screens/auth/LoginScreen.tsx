import { StackScreenProps } from '@react-navigation/stack';
import { AuthStackParamList, LoginForm } from '../../types';
import React, { useMemo, useState } from 'react';
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
import { validateLoginForm, getErrorMessage, hasError } from '../../utils/validation';
import { useLoadingState } from '../../utils/loadingState';
import { apiService } from '../../services/api';
import { getAuthError, getNetworkError, formatErrorForDisplay } from '../../utils/errorMessages';
import { MaterialSpacing, MaterialTypography, MaterialShape } from '../../styles/MaterialDesign';
import { useScreenLayout } from '../../hooks/useScreenLayout';

type LoginScreenProps = StackScreenProps<AuthStackParamList, 'Login'>;

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { login, isLoading: authLoading } = useAuth();
  const loginLoadingState = useLoadingState();
  const { containerStyle, contentStyle, responsive, theme } = useScreenLayout({
    maxWidth: { tablet: 560, desktop: 640 },
  });

  const [formData, setFormData] = useState<LoginForm>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rememberMe, setRememberMe] = useState(false);

  const dynamicStyles = useMemo(() => ({
    title: {
      color: theme.colors.onBackground,
      fontSize: responsive.getResponsiveFontSize(28),
    },
    subtitle: {
      color: theme.colors.onSurfaceVariant,
      fontSize: responsive.getResponsiveFontSize(16),
    },
    input: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.outlineVariant,
      color: theme.colors.onSurface,
      minHeight: responsive.getTouchTargetSize(48),
      paddingHorizontal: responsive.getResponsivePadding(MaterialSpacing.md, {
        desktop: MaterialSpacing.lg,
      }),
      paddingVertical: responsive.getResponsivePadding(MaterialSpacing.sm, {
        desktop: MaterialSpacing.md,
      }),
    },
    helperText: {
      color: theme.colors.onSurfaceVariant,
      fontSize: responsive.getResponsiveFontSize(12),
    },
    button: {
      minHeight: responsive.getTouchTargetSize(52),
      borderRadius: MaterialShape.medium,
      backgroundColor: theme.colors.primary[500],
    },
    buttonText: {
      fontSize: responsive.getResponsiveFontSize(16),
    },
  }), [responsive, theme]);

  const handleInputChange = (field: keyof LoginForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleLogin = async () => {
    const validationResult = validateLoginForm(formData);
    if (!validationResult.isValid) {
      setErrors(validationResult.errors);
      return;
    }

    try {
      setErrors({});
      loginLoadingState.startLoading('Signing in...');

      const result = await apiService.loginWithLoading(formData, {
        onStart: loginLoadingState.startLoading,
        onProgress: loginLoadingState.updateProgress,
        onComplete: loginLoadingState.stopLoading,
        onError: loginLoadingState.setError,
      });

      if (result) {
        await login(formData);
        loginLoadingState.stopLoading();
      }
    } catch (error) {
      let errorTemplate;

      if (error instanceof Error) {
        if (error.message.includes('Invalid credentials') || error.message.includes('401')) {
          errorTemplate = getAuthError('invalidCredentials');
        } else if (error.message.includes('Network error') || error.message.includes('timeout') || error.message.includes('AbortError')) {
          errorTemplate = getNetworkError('timeout');
        } else if (error.message.includes('Rate limit') || error.message.includes('Too many') || (error as any).status === 429) {
          errorTemplate = getAuthError('accountLocked');
        } else if ((error as any).status >= 500) {
          errorTemplate = getNetworkError('serverError');
        } else {
          errorTemplate = getAuthError('invalidCredentials');
        }
      } else {
        errorTemplate = getAuthError('invalidCredentials');
      }

      const formattedError = formatErrorForDisplay(errorTemplate, 'alert');

      loginLoadingState.setError(formattedError.message);
      Alert.alert(
        formattedError.title,
        `${formattedError.message}\n\n${formattedError.details || ''}`,
        [
          {
            text: formattedError.action || 'Try Again',
            style: 'default',
          },
        ]
      );
    }
  };

  const navigateToRegister = () => {
    navigation.navigate('Register');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, containerStyle]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContainer, contentStyle]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.title, dynamicStyles.title]}>Real Estate CRM</Text>
            <Text style={[styles.subtitle, dynamicStyles.subtitle]}>Sign in to your account</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
                Email
              </Text>
              <TextInput
                style={[
                  styles.input,
                  dynamicStyles.input,
                  hasError(errors, 'email') && { borderColor: theme.colors.error[500] },
                ]}
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                placeholder="Enter your email"
                placeholderTextColor={theme.colors.onSurfaceVariant}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loginLoadingState.isLoading && !authLoading}
              />
              {hasError(errors, 'email') && (
                <Text style={[styles.errorText, { color: theme.colors.error[500] }]}>
                  {getErrorMessage(errors, 'email')}
                </Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
                Password
              </Text>
              <TextInput
                style={[
                  styles.input,
                  dynamicStyles.input,
                  hasError(errors, 'password') && { borderColor: theme.colors.error[500] },
                ]}
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                placeholder="Enter your password"
                placeholderTextColor={theme.colors.onSurfaceVariant}
                secureTextEntry
                autoCapitalize="none"
                editable={!loginLoadingState.isLoading && !authLoading}
              />
              {hasError(errors, 'password') && (
                <Text style={[styles.errorText, { color: theme.colors.error[500] }]}>
                  {getErrorMessage(errors, 'password')}
                </Text>
              )}
            </View>

            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setRememberMe(!rememberMe)}
                disabled={loginLoadingState.isLoading || authLoading}
              >
                <View
                  style={[
                    styles.checkboxBox,
                    { borderColor: theme.colors.outlineVariant },
                    rememberMe && { backgroundColor: theme.colors.primary[500], borderColor: theme.colors.primary[500] },
                  ]}
                >
                  {rememberMe && <Text style={styles.checkboxMark}>✓</Text>}
                </View>
                <Text style={[styles.checkboxLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Remember me
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, dynamicStyles.button, (loginLoadingState.isLoading || authLoading) && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loginLoadingState.isLoading || authLoading}
            >
              {(loginLoadingState.isLoading || authLoading) ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator color={theme.colors.onPrimary} />
                  <Text style={[styles.loginButtonText, dynamicStyles.buttonText, { color: theme.colors.onPrimary }]}>Signing in...</Text>
                </View>
              ) : (
                <Text style={[styles.loginButtonText, dynamicStyles.buttonText, { color: theme.colors.onPrimary }]}>Sign In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={navigateToRegister}
            >
              <Text style={[styles.secondaryText, { color: theme.colors.primary[500], fontSize: responsive.getResponsiveFontSize(15) }]}>
                Don't have an account? Register
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
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    gap: MaterialSpacing.xl,
  },
  header: {
    gap: MaterialSpacing.sm,
    alignItems: 'center',
  },
  title: {
    ...MaterialTypography.headlineSmall,
    fontWeight: '700',
  },
  subtitle: {
    ...MaterialTypography.bodyLarge,
    textAlign: 'center',
  },
  form: {
    gap: MaterialSpacing.lg,
  },
  inputContainer: {
    gap: MaterialSpacing.xs,
  },
  label: {
    ...MaterialTypography.labelMedium,
  },
  input: {
    borderWidth: 1,
    borderRadius: MaterialShape.medium,
  },
  errorText: {
    ...MaterialTypography.bodySmall,
  },
  checkboxContainer: {
    alignItems: 'flex-start',
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MaterialSpacing.sm,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxMark: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  checkboxLabel: {
    ...MaterialTypography.bodyMedium,
  },
  loginButton: {
    borderRadius: MaterialShape.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    ...MaterialTypography.labelLarge,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MaterialSpacing.sm,
  },
  secondaryButton: {
    alignItems: 'center',
  },
  secondaryText: {
    ...MaterialTypography.bodyMedium,
    fontWeight: '600',
  },
});

export default LoginScreen;
