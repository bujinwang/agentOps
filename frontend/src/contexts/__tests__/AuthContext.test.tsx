/**
 * AuthContext Integration Tests
 * Tests authentication state persistence and integration
 */

import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '../AuthContext';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock API service
jest.mock('../../services/api', () => ({
  apiService: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
  },
}));

const { apiService } = require('../../services/api');

describe('AuthContext Integration', () => {
  const mockUser = {
    userId: 1,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
  };

  const mockToken = 'mock.jwt.token';

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock successful storage operations
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Initial Authentication State', () => {
    test('should load stored authentication on mount', async () => {
      // Mock stored auth data
      (AsyncStorage.getItem as jest.Mock)
        .mockImplementation((key: string) => {
          if (key === '@RealEstateCRM:token') return Promise.resolve(mockToken);
          if (key === '@RealEstateCRM:user') return Promise.resolve(JSON.stringify(mockUser));
          return Promise.resolve(null);
        });

      let authState: any = null;

      const TestComponent = () => {
        const auth = useAuth();
        authState = auth;
        return null;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for initialization
      await waitFor(() => {
        expect(authState).not.toBeNull();
      });

      // Verify auth state is loaded
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.user).toEqual(mockUser);
      expect(authState.token).toBe(mockToken);
      expect(authState.isLoading).toBe(false);
    });

    test('should handle corrupted stored data gracefully', async () => {
      // Mock corrupted stored data
      (AsyncStorage.getItem as jest.Mock)
        .mockImplementation((key: string) => {
          if (key === '@RealEstateCRM:token') return Promise.resolve(mockToken);
          if (key === '@RealEstateCRM:user') return Promise.resolve('invalid json');
          return Promise.resolve(null);
        });

      // Mock clearAuthData to succeed
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      let authState: any = null;

      const TestComponent = () => {
        const auth = useAuth();
        authState = auth;
        return null;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for initialization
      await waitFor(() => {
        expect(authState.isLoading).toBe(false);
      });

      // Verify auth state is cleared on corrupted data
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBeNull();
      expect(authState.token).toBeNull();

      // Verify corrupted data was cleared
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@RealEstateCRM:token');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@RealEstateCRM:user');
    });
  });

  describe('Login Flow', () => {
    test('should handle successful login', async () => {
      const loginResponse = {
        token: mockToken,
        userId: mockUser.userId,
        email: mockUser.email,
        firstName: mockUser.firstName,
      };

      apiService.login.mockResolvedValue(loginResponse);

      let authState: any = null;

      const TestComponent = () => {
        const auth = useAuth();
        authState = auth;

        React.useEffect(() => {
          if (!auth.isLoading) {
            auth.login({
              email: 'test@example.com',
              password: 'password123',
            }).catch(() => {}); // Ignore errors in test
          }
        }, [auth.isLoading]);

        return null;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for login to complete
      await waitFor(() => {
        expect(apiService.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      // Verify auth state is updated
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.user).toEqual(mockUser);
      expect(authState.token).toBe(mockToken);

      // Verify data was stored
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@RealEstateCRM:token',
        mockToken
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@RealEstateCRM:user',
        JSON.stringify(mockUser)
      );
    });

    test('should handle login failure', async () => {
      const loginError = new Error('Invalid credentials');
      apiService.login.mockRejectedValue(loginError);

      let authState: any = null;

      const TestComponent = () => {
        const auth = useAuth();
        authState = auth;

        React.useEffect(() => {
          if (!auth.isLoading) {
            auth.login({
              email: 'test@example.com',
              password: 'wrongpassword',
            }).catch(() => {}); // Ignore errors in test
          }
        }, [auth.isLoading]);

        return null;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for login attempt
      await waitFor(() => {
        expect(apiService.login).toHaveBeenCalled();
      });

      // Verify auth state remains unauthenticated
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBeNull();
      expect(authState.token).toBeNull();
    });

    test('should handle network errors with retry', async () => {
      const networkError = new Error('Network request failed');
      networkError.name = 'TypeError'; // Simulate fetch error

      apiService.login
        .mockRejectedValueOnce(networkError) // First call fails
        .mockResolvedValueOnce({ // Second call succeeds
          token: mockToken,
          userId: mockUser.userId,
          email: mockUser.email,
          firstName: mockUser.firstName,
        });

      let authState: any = null;

      const TestComponent = () => {
        const auth = useAuth();
        authState = auth;

        React.useEffect(() => {
          if (!auth.isLoading) {
            auth.login({
              email: 'test@example.com',
              password: 'password123',
            }).catch(() => {}); // Ignore errors in test
          }
        }, [auth.isLoading]);

        return null;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for login to complete with retry
      await waitFor(() => {
        expect(apiService.login).toHaveBeenCalledTimes(2); // Should retry once
      });

      // Verify auth state is updated after successful retry
      expect(authState.isAuthenticated).toBe(true);
    });
  });

  describe('Logout Flow', () => {
    test('should handle logout and clear auth state', async () => {
      // Setup initial auth state
      (AsyncStorage.getItem as jest.Mock)
        .mockImplementation((key: string) => {
          if (key === '@RealEstateCRM:token') return Promise.resolve(mockToken);
          if (key === '@RealEstateCRM:user') return Promise.resolve(JSON.stringify(mockUser));
          return Promise.resolve(null);
        });

      apiService.logout.mockResolvedValue(undefined);

      let authState: any = null;

      const TestComponent = () => {
        const auth = useAuth();
        authState = auth;

        React.useEffect(() => {
          if (auth.isAuthenticated && !auth.isLoading) {
            auth.logout().catch(() => {}); // Ignore errors in test
          }
        }, [auth.isAuthenticated, auth.isLoading]);

        return null;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for logout to complete
      await waitFor(() => {
        expect(apiService.logout).toHaveBeenCalled();
      });

      // Verify auth state is cleared
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBeNull();
      expect(authState.token).toBeNull();

      // Verify data was removed from storage
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@RealEstateCRM:token');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@RealEstateCRM:user');
    });

    test('should clear auth data even if logout API fails', async () => {
      // Setup initial auth state
      (AsyncStorage.getItem as jest.Mock)
        .mockImplementation((key: string) => {
          if (key === '@RealEstateCRM:token') return Promise.resolve(mockToken);
          if (key === '@RealEstateCRM:user') return Promise.resolve(JSON.stringify(mockUser));
          return Promise.resolve(null);
        });

      apiService.logout.mockRejectedValue(new Error('API Error'));

      let authState: any = null;

      const TestComponent = () => {
        const auth = useAuth();
        authState = auth;

        React.useEffect(() => {
          if (auth.isAuthenticated && !auth.isLoading) {
            auth.logout().catch(() => {}); // Ignore errors in test
          }
        }, [auth.isAuthenticated, auth.isLoading]);

        return null;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for logout attempt
      await waitFor(() => {
        expect(apiService.logout).toHaveBeenCalled();
      });

      // Verify auth state is cleared despite API failure
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBeNull();
      expect(authState.token).toBeNull();

      // Verify data was still removed from storage
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@RealEstateCRM:token');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@RealEstateCRM:user');
    });
  });

  describe('Authentication Persistence', () => {
    test('should persist authentication across component remounts', async () => {
      // Setup initial auth state
      (AsyncStorage.getItem as jest.Mock)
        .mockImplementation((key: string) => {
          if (key === '@RealEstateCRM:token') return Promise.resolve(mockToken);
          if (key === '@RealEstateCRM:user') return Promise.resolve(JSON.stringify(mockUser));
          return Promise.resolve(null);
        });

      let authState1: any = null;
      let authState2: any = null;

      const TestComponent = ({ onAuth }: { onAuth: (auth: any) => void }) => {
        const auth = useAuth();
        React.useEffect(() => {
          if (!auth.isLoading) {
            onAuth(auth);
          }
        }, [auth.isLoading, onAuth]);
        return null;
      };

      const { rerender } = render(
        <AuthProvider>
          <TestComponent onAuth={(auth) => { authState1 = auth; }} />
        </AuthProvider>
      );

      // Wait for first component to initialize
      await waitFor(() => {
        expect(authState1).not.toBeNull();
      });

      // Remount component
      rerender(
        <AuthProvider>
          <TestComponent onAuth={(auth) => { authState2 = auth; }} />
        </AuthProvider>
      );

      // Wait for second component to initialize
      await waitFor(() => {
        expect(authState2).not.toBeNull();
      });

      // Verify both instances have the same auth state
      expect(authState1.isAuthenticated).toBe(true);
      expect(authState2.isAuthenticated).toBe(true);
      expect(authState1.user).toEqual(authState2.user);
      expect(authState1.token).toEqual(authState2.token);
    });
  });
});