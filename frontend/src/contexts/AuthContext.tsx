// Authentication Context for managing user state

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AuthContextType,
  User,
  LoginForm,
  RegisterForm,
} from '../types';
import { apiService } from '../services/api';
import { getAuthError, getNetworkError, ErrorTemplate } from '../utils/errorMessages';

const TOKEN_KEY = '@RealEstateCRM:token';
const USER_KEY = '@RealEstateCRM:user';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is authenticated
  const isAuthenticated = !!(user && token);

  // Initialize auth state from storage
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      console.log('AuthContext: Initializing authentication...');
      setIsLoading(true);
      
      console.log('AuthContext: About to check AsyncStorage');
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);

      console.log('AuthContext: Storage check complete', {
        hasToken: !!storedToken,
        hasUser: !!storedUser,
        tokenLength: storedToken?.length,
        userData: storedUser
      });

      if (storedToken && storedUser) {
        console.log('AuthContext: Found stored auth data, parsing user...');
        const parsedUser = JSON.parse(storedUser);
        console.log('AuthContext: Parsed user data', {
          userId: parsedUser.userId,
          email: parsedUser.email,
          firstName: parsedUser.firstName
        });
        setToken(storedToken);
        setUser(parsedUser);
        console.log('AuthContext: User restored from storage');
      } else {
        console.log('AuthContext: No stored authentication found');
      }
    } catch (error) {
      console.error('AuthContext: Error initializing auth:', error);
      // Clear potentially corrupted data
      await clearAuthData();
    } finally {
      console.log('AuthContext: Authentication initialization complete, setting isLoading to false');
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginForm, retryCount = 0): Promise<void> => {
    const MAX_RETRIES = 2;

    try {
      setIsLoading(true);
      console.log('AuthContext: Starting login process');
      const response = await apiService.login(credentials);

      console.log('AuthContext: Login response received', {
        hasToken: !!response.token,
        hasUserId: !!response.userId,
        hasEmail: !!response.email,
        hasFirstName: !!response.firstName
      });

      const userData: User = {
        userId: response.userId,
        email: response.email,
        firstName: response.firstName,
        lastName: '', // API response might not include lastName in login
        createdAt: '', // Not provided in login response
        updatedAt: '', // Not provided in login response
      };

      // Store auth data
      if (response.token) {
        console.log('AuthContext: Token found, storing auth data');
        await Promise.all([
          AsyncStorage.setItem(TOKEN_KEY, response.token),
          AsyncStorage.setItem(USER_KEY, JSON.stringify(userData)),
        ]);
      } else {
        console.error('AuthContext: Login response missing token:', response);
        throw new Error('Login failed - no token received');
      }

      setToken(response.token);
      setUser(userData);
      console.log('AuthContext: Login process completed successfully');
    } catch (error) {
      console.error('Login error in AuthContext:', error);

      // Retry logic for network errors
      if (retryCount < MAX_RETRIES && error instanceof Error) {
        if (error.message.includes('timeout') ||
            error.message.includes('AbortError') ||
            error.message.includes('Network request failed') ||
            error.message.includes('fetch')) {

          console.log(`Login retry attempt ${retryCount + 1}/${MAX_RETRIES}`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
          return login(credentials, retryCount + 1);
        }
      }

      // Enhanced error handling after retries exhausted
      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('AbortError')) {
          const networkError = getNetworkError('timeout');
          throw new Error(networkError.message);
        } else if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
          const networkError = getNetworkError('serverError');
          throw new Error(networkError.message);
        } else if (error.message.includes('Invalid credentials') || error.message.includes('401')) {
          const authError = getAuthError('invalidCredentials');
          throw new Error(authError.message);
        } else if (error.message.includes('429') || error.message.includes('Too many')) {
          const authError = getAuthError('accountLocked');
          throw new Error(authError.message);
        }
        throw error;
      }

      const authError = getAuthError('invalidCredentials');
      throw new Error(authError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterForm): Promise<void> => {
    try {
      setIsLoading(true);
      console.log('Starting registration process for:', userData.email);
      
      await apiService.register(userData);
      console.log('Registration successful, attempting auto-login');

      // After successful registration, automatically log in
      await login({
        email: userData.email,
        password: userData.password,
      });
      
      console.log('Auto-login after registration successful');
    } catch (error) {
      console.error('Registration error in AuthContext:', error);
      
      // Provide more detailed error information
      let errorMessage = 'Registration failed. Please try again.';
      let validationErrors = null;
      
      if (error instanceof Error) {
        // Check if this is a validation error with details
        const enhancedError = error as any;
        if (enhancedError.details && Array.isArray(enhancedError.details)) {
          // This is a validation error with detailed field errors
          validationErrors = enhancedError.details;
          errorMessage = 'Please check your input and try again.';
        } else if (error.message.includes('Network error')) {
          errorMessage = 'Network connection failed. Please check your internet connection and ensure the server is running.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timeout. The server may be unreachable.';
        } else if (error.message.includes('Email already exists')) {
          const authError = getAuthError('emailExists');
          errorMessage = authError.message;
        } else if (error.message.includes('HTTP 4')) {
          const authError = getAuthError('weakPassword');
          errorMessage = authError.message;
        } else if (error.message.includes('HTTP 5')) {
          const networkError = getNetworkError('serverError');
          errorMessage = networkError.message;
        } else {
          errorMessage = error.message;
        }
      }
      
      // Create a new error with the enhanced message and validation details
      const enhancedError = new Error(errorMessage) as any;
      enhancedError.validationErrors = validationErrors;
      console.error('Enhanced registration error:', enhancedError.message);
      if (validationErrors) {
        console.error('Validation errors:', validationErrors);
      }
      throw enhancedError;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Call API logout
      await apiService.logout();
      
      // Clear local storage
      await clearAuthData();
      
      // Reset state
      setUser(null);
      setToken(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local data even if API call fails
      await clearAuthData();
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const clearAuthData = async (): Promise<void> => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(TOKEN_KEY),
        AsyncStorage.removeItem(USER_KEY),
      ]);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  };

  const contextValue: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    isLoading,
    isAuthenticated,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;