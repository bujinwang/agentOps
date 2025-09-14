import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock Appearance
jest.mock('react-native/Libraries/Utilities/Appearance', () => ({
  getColorScheme: jest.fn(),
  addChangeListener: jest.fn(() => ({ remove: jest.fn() })),
}));

import { ThemeProvider, useTheme, useThemeStyle, useThemeTransition, useThemeColors } from '../ThemeContext';
import MaterialBMADLightTheme from '../../styles/MaterialLightTheme';
import MaterialBMADDarkTheme from '../../styles/MaterialDarkTheme';

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockAppearance = Appearance as jest.Mocked<typeof Appearance>;

describe('ThemeContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to default mocks
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
    mockAppearance.getColorScheme.mockReturnValue('light');
  });

  describe('ThemeProvider', () => {
    it('should initialize with system theme by default', async () => {
      mockAppearance.getColorScheme.mockReturnValue('dark');

      const TestComponent = () => {
        const { themeState } = useTheme();
        return null;
      };

      await act(async () => {
        render(
          <ThemeProvider>
            <TestComponent />
          </ThemeProvider>
        );
      });

      await waitFor(() => {
        expect(mockAppearance.getColorScheme).toHaveBeenCalled();
      });
    });

    it('should initialize with saved theme preference', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('dark');

      const TestComponent = () => {
        const { themeState } = useTheme();
        return null;
      };

      await act(async () => {
        render(
          <ThemeProvider>
            <TestComponent />
          </ThemeProvider>
        );
      });

      await waitFor(() => {
        expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('@RealEstateCRM:themeMode');
      });
    });

    it('should handle theme mode changes', async () => {
      const TestComponent = () => {
        const { themeState, setThemeMode } = useTheme();

        React.useEffect(() => {
          if (themeState.currentTheme) {
            setThemeMode('dark');
          }
        }, [themeState.currentTheme, setThemeMode]);

        return null;
      };

      await act(async () => {
        render(
          <ThemeProvider>
            <TestComponent />
          </ThemeProvider>
        );
      });

      await waitFor(() => {
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('@RealEstateCRM:themeMode', 'dark');
      });
    });

    it('should toggle between light and dark themes', async () => {
      const TestComponent = () => {
        const { themeState, toggleTheme } = useTheme();

        React.useEffect(() => {
          if (themeState.currentTheme === 'light') {
            toggleTheme();
          }
        }, [themeState.currentTheme, toggleTheme]);

        return null;
      };

      await act(async () => {
        render(
          <ThemeProvider>
            <TestComponent />
          </ThemeProvider>
        );
      });

      await waitFor(() => {
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('@RealEstateCRM:themeMode', 'dark');
      });
    });
  });

  describe('useTheme hook', () => {
    it('should throw error when used outside provider', () => {
      const TestComponent = () => {
        useTheme();
        return null;
      };

      expect(() => render(<TestComponent />)).toThrow(
        'useTheme must be used within a ThemeProvider'
      );
    });

    it('should provide theme context when used within provider', async () => {
      const TestComponent = () => {
        const { theme, themeState } = useTheme();
        expect(theme).toBeDefined();
        expect(themeState).toBeDefined();
        return null;
      };

      await act(async () => {
        expect(() => render(
          <ThemeProvider>
            <TestComponent />
          </ThemeProvider>
        )).not.toThrow();
      });
    });
  });

  describe('useThemeStyle hook', () => {
    it('should apply theme-aware styles', async () => {
      const TestComponent = () => {
        const themedStyle = useThemeStyle((theme) => ({
          backgroundColor: theme.colors.background,
        }));
        expect(themedStyle).toBeDefined();
        return null;
      };

      await act(async () => {
        render(
          <ThemeProvider>
            <TestComponent />
          </ThemeProvider>
        );
      });
    });
  });

  describe('useThemeTransition hook', () => {
    it('should provide transition utilities', async () => {
      const TestComponent = () => {
        const { animatedValue, isTransitioning, animatedStyle } = useThemeTransition();
        expect(animatedValue).toBeDefined();
        expect(typeof isTransitioning).toBe('boolean');
        expect(animatedStyle).toBeDefined();
        return null;
      };

      await act(async () => {
        render(
          <ThemeProvider>
            <TestComponent />
          </ThemeProvider>
        );
      });
    });
  });

  describe('useThemeColors hook', () => {
    it('should provide theme color utilities', async () => {
      const TestComponent = () => {
        const { colors, getThemeValue, primary, onPrimary } = useThemeColors();
        expect(colors).toBeDefined();
        expect(getThemeValue).toBeDefined();
        expect(primary).toBeDefined();
        expect(onPrimary).toBeDefined();
        return null;
      };

      await act(async () => {
        render(
          <ThemeProvider>
            <TestComponent />
          </ThemeProvider>
        );
      });
    });

    it('should return correct theme values', async () => {
      const TestComponent = () => {
        const { getThemeValue } = useThemeColors();
        const value = getThemeValue('lightValue', 'darkValue');
        expect(value).toBe('lightValue'); // Should be light by default
        return null;
      };

      await act(async () => {
        render(
          <ThemeProvider>
            <TestComponent />
          </ThemeProvider>
        );
      });
    });
  });

  describe('Theme integration', () => {
    it('should use correct theme object based on state', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('dark');

      const TestComponent = () => {
        const { theme } = useTheme();
        expect(theme).toBe(MaterialBMADDarkTheme);
        return null;
      };

      await act(async () => {
        render(
          <ThemeProvider>
            <TestComponent />
          </ThemeProvider>
        );
      });
    });

    it('should handle system theme changes', async () => {
      const mockListener = jest.fn();
      mockAppearance.addChangeListener.mockReturnValue({ remove: jest.fn() });

      await act(async () => {
        render(
          <ThemeProvider>
            <div />
          </ThemeProvider>
        );
      });

      expect(mockAppearance.addChangeListener).toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const TestComponent = () => {
        const { themeState } = useTheme();
        expect(themeState.mode).toBe('system'); // Should fallback to system
        return null;
      };

      await act(async () => {
        render(
          <ThemeProvider>
            <TestComponent />
          </ThemeProvider>
        );
      });
    });
  });
});