import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Appearance, Animated } from 'react-native';
import {
  ThemeManager,
  ThemeState,
  ThemeMode,
  themeManager,
  themePerformanceMonitor,
  THEME_TRANSITIONS,
} from '../utils/themeUtils';
import MaterialBMADLightTheme from '../styles/MaterialLightTheme';
import MaterialBMADDarkTheme from '../styles/MaterialDarkTheme';

interface ThemeContextType {
  // Current theme state
  themeState: ThemeState;
  theme: typeof MaterialBMADLightTheme | typeof MaterialBMADDarkTheme;

  // Theme actions
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;

  // Animation support
  animatedValue: Animated.Value;
  isTransitioning: boolean;

  // Utility functions
  getThemeValue: <T>(lightValue: T, darkValue: T) => T;
  getAnimatedStyle: () => any;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeState, setThemeState] = useState<ThemeState>({
    mode: 'system',
    currentTheme: 'light',
    isSystemTheme: true,
  });

  const [animatedValue] = useState(new Animated.Value(0));
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Get current theme object
  const theme = themeState.currentTheme === 'dark' ? MaterialBMADDarkTheme : MaterialBMADLightTheme;

  // Initialize theme on mount
  useEffect(() => {
    const initializeTheme = async () => {
      try {
        const initialThemeState = await themeManager.initialize();
        setThemeState(initialThemeState);

        // Set initial animated value based on theme
        animatedValue.setValue(initialThemeState.currentTheme === 'dark' ? 1 : 0);
      } catch (error) {
        console.warn('Failed to initialize theme:', error);
      }
    };

    initializeTheme();

    // Listen for theme changes
    const unsubscribe = themeManager.addListener((newThemeState) => {
      setThemeState(newThemeState);
    });

    // Listen for system theme changes
    const systemThemeSubscription = Appearance.addChangeListener(({ colorScheme }) => {
      themeManager.handleSystemThemeChange(colorScheme);
    });

    return () => {
      unsubscribe();
      systemThemeSubscription?.remove();
    };
  }, [animatedValue]);

  // Set theme mode with animation
  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    try {
      setIsTransitioning(true);
      themePerformanceMonitor.startTransition();

      const newThemeState = await themeManager.setThemeMode(mode);

      // Animate theme transition
      const targetValue = newThemeState.currentTheme === 'dark' ? 1 : 0;
      Animated.timing(animatedValue, {
        toValue: targetValue,
        duration: THEME_TRANSITIONS.smooth,
        useNativeDriver: true,
      }).start(() => {
        setIsTransitioning(false);
        const duration = themePerformanceMonitor.endTransition();

        // Log performance warning if transition is slow
        if (duration >= 100) {
          console.warn(`Theme transition took ${duration}ms - consider optimizing`);
        }
      });

    } catch (error) {
      console.warn('Failed to set theme mode:', error);
      setIsTransitioning(false);
    }
  }, [animatedValue]);

  // Toggle between light and dark (manual mode)
  const toggleTheme = useCallback(async () => {
    const newMode: ThemeMode = themeState.currentTheme === 'light' ? 'dark' : 'light';
    await setThemeMode(newMode);
  }, [themeState.currentTheme, setThemeMode]);

  // Get theme-specific value
  const getThemeValue = useCallback(<T,>(lightValue: T, darkValue: T): T => {
    return themeState.currentTheme === 'dark' ? darkValue : lightValue;
  }, [themeState.currentTheme]);

  // Get animated style for smooth transitions
  const getAnimatedStyle = useCallback(() => {
    return {
      opacity: animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1], // Keep opacity at 1 for smooth transitions
      }),
      transform: [{
        scale: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1], // No scaling for performance
        }),
      }],
    };
  }, [animatedValue]);

  const contextValue: ThemeContextType = {
    themeState,
    theme,
    setThemeMode,
    toggleTheme,
    animatedValue,
    isTransitioning,
    getThemeValue,
    getAnimatedStyle,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook to use theme context
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Hook for theme-aware styling
export const useThemeStyle = (styleFactory: (theme: any) => any) => {
  const { theme } = useTheme();
  return styleFactory(theme);
};

// Hook for theme transitions
export const useThemeTransition = () => {
  const { animatedValue, isTransitioning, getAnimatedStyle } = useTheme();

  return {
    animatedValue,
    isTransitioning,
    animatedStyle: getAnimatedStyle(),
  };
};

// Hook for theme colors
export const useThemeColors = () => {
  const { theme, getThemeValue } = useTheme();

  return {
    colors: theme.colors,
    getThemeValue,
    // Convenience methods for common color access
    primary: theme.colors.primary[500],
    onPrimary: theme.colors.onPrimary,
    surface: theme.colors.surface,
    onSurface: theme.colors.onSurface,
    background: theme.colors.background,
    onBackground: theme.colors.onSurface,
  };
};

export default ThemeContext;