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
      setIsLoading(true);
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      // Clear potentially corrupted data
      await clearAuthData();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginForm): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await apiService.login(credentials);

      const userData: User = {
        userId: response.userId,
        email: response.email,
        firstName: response.firstName,
        lastName: '', // API response might not include lastName in login
        createdAt: '', // Not provided in login response
        updatedAt: '', // Not provided in login response
      };

      // Store auth data
      await Promise.all([
        AsyncStorage.setItem(TOKEN_KEY, response.token),
        AsyncStorage.setItem(USER_KEY, JSON.stringify(userData)),
      ]);

      setToken(response.token);
      setUser(userData);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterForm): Promise<void> => {
    try {
      setIsLoading(true);
      await apiService.register(userData);

      // After successful registration, automatically log in
      await login({
        email: userData.email,
        password: userData.password,
      });
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
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