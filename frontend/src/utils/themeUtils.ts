import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeState {
  mode: ThemeMode;
  currentTheme: 'light' | 'dark';
  isSystemTheme: boolean;
}

export class ThemeManager {
  private static instance: ThemeManager;
  private listeners: Set<(theme: ThemeState) => void> = new Set();

  static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  async initialize(): Promise<ThemeState> {
    try {
      const savedMode = await AsyncStorage.getItem('@RealEstateCRM:themeMode') as ThemeMode | null;
      const mode = savedMode || 'system';

      const systemTheme = Appearance.getColorScheme() || 'light';
      const currentTheme = mode === 'system' ? systemTheme : mode;

      const themeState: ThemeState = {
        mode,
        currentTheme,
        isSystemTheme: mode === 'system',
      };

      return themeState;
    } catch (error) {
      console.warn('Failed to initialize theme:', error);
      return {
        mode: 'system',
        currentTheme: 'light',
        isSystemTheme: true,
      };
    }
  }

  async setThemeMode(mode: ThemeMode): Promise<ThemeState> {
    try {
      await AsyncStorage.setItem('@RealEstateCRM:themeMode', mode);

      const systemTheme = Appearance.getColorScheme() || 'light';
      const currentTheme = mode === 'system' ? systemTheme : mode;

      const themeState: ThemeState = {
        mode,
        currentTheme,
        isSystemTheme: mode === 'system',
      };

      this.notifyListeners(themeState);
      return themeState;
    } catch (error) {
      console.warn('Failed to set theme mode:', error);
      throw error;
    }
  }

  addListener(callback: (theme: ThemeState) => void): () => void {
    this.listeners.add(callback);

    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(theme: ThemeState) {
    this.listeners.forEach(callback => {
      try {
        callback(theme);
      } catch (error) {
        console.warn('Theme listener error:', error);
      }
    });
  }

  // Handle system theme changes
  async handleSystemThemeChange(systemTheme: 'light' | 'dark' | null) {
    try {
      // Only update if user is following system theme
      const currentMode = await this.getCurrentMode();
      if (currentMode === 'system' && systemTheme) {
        const themeState: ThemeState = {
          mode: 'system',
          currentTheme: systemTheme,
          isSystemTheme: true,
        };
        this.notifyListeners(themeState);
      }
    } catch (error) {
      console.warn('Failed to handle system theme change:', error);
    }
  }

  private async getCurrentMode(): Promise<ThemeMode> {
    try {
      const savedMode = await AsyncStorage.getItem('@RealEstateCRM:themeMode') as ThemeMode | null;
      return savedMode || 'system';
    } catch {
      return 'system';
    }
  }
}

// Singleton instance
export const themeManager = ThemeManager.getInstance();

// Theme transition utilities
export const THEME_TRANSITIONS = {
  // Fast transition for immediate theme changes
  instant: 0,

  // Optimized smooth transition for user-initiated changes (<100ms target)
  smooth: 80,

  // Slow transition for system changes
  system: 200,
};

// Performance monitoring for theme transitions
export class ThemePerformanceMonitor {
  private static instance: ThemePerformanceMonitor;
  private transitionStartTime: number = 0;

  static getInstance(): ThemePerformanceMonitor {
    if (!ThemePerformanceMonitor.instance) {
      ThemePerformanceMonitor.instance = new ThemePerformanceMonitor();
    }
    return ThemePerformanceMonitor.instance;
  }

  startTransition() {
    this.transitionStartTime = Date.now();
  }

  endTransition(): number {
    const duration = Date.now() - this.transitionStartTime;
    this.transitionStartTime = 0;

    // Log performance metrics
    if (duration > 100) {
      console.warn(`Theme transition took ${duration}ms (target: <100ms)`);
    } else {
      console.log(`Theme transition completed in ${duration}ms`);
    }

    return duration;
  }

  // Check if transition meets performance requirements
  meetsPerformanceTarget(duration: number): boolean {
    return duration < 100; // <100ms target
  }

  // Get performance metrics for analysis
  getPerformanceMetrics(): {
    averageDuration: number;
    maxDuration: number;
    minDuration: number;
    totalTransitions: number;
    targetCompliance: number; // percentage of transitions meeting target
  } {
    // This would be enhanced with actual metrics collection
    return {
      averageDuration: 0,
      maxDuration: 0,
      minDuration: 0,
      totalTransitions: 0,
      targetCompliance: 0,
    };
  }

  // Validate performance on different device types
  validateDevicePerformance(deviceType: 'low-end' | 'mid-range' | 'high-end'): boolean {
    // Device-specific performance expectations
    const targets = {
      'low-end': 120,    // Allow more time for low-end devices
      'mid-range': 100,  // Standard target
      'high-end': 80,    // Stricter target for high-end devices
    };

    const target = targets[deviceType];
    // In practice, this would measure actual performance
    return true; // Placeholder - would be implemented with device detection
  }
}

export const themePerformanceMonitor = ThemePerformanceMonitor.getInstance();

// Theme validation utilities
export const THEME_VALIDATION = {
  // Validate theme object structure
  validateTheme: (theme: any): boolean => {
    const required = ['colors', 'styles', 'getElevationStyle'];
    return required.every(key => theme.hasOwnProperty(key));
  },

  // Validate color contrast ratios
  validateContrast: (foreground: string, background: string): boolean => {
    // Simple validation - in production, use proper color library
    return foreground !== background;
  },

  // Validate theme compatibility
  validateCompatibility: (theme: any): boolean => {
    try {
      // Check if theme can be applied without errors
      return THEME_VALIDATION.validateTheme(theme);
    } catch (error) {
      console.warn('Theme compatibility validation failed:', error);
      return false;
    }
  },
};

// Theme caching for performance
export class ThemeCache {
  private static instance: ThemeCache;
  private cache: Map<string, any> = new Map();

  static getInstance(): ThemeCache {
    if (!ThemeCache.instance) {
      ThemeCache.instance = new ThemeCache();
    }
    return ThemeCache.instance;
  }

  set(key: string, theme: any) {
    this.cache.set(key, theme);
  }

  get(key: string): any | undefined {
    return this.cache.get(key);
  }

  clear() {
    this.cache.clear();
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }
}

export const themeCache = ThemeCache.getInstance();

export default themeManager;