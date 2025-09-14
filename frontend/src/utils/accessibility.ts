import { AccessibilityInfo, Platform } from 'react-native';

// Accessibility utilities for WCAG 2.1 AA compliance
export class AccessibilityManager {
  private static instance: AccessibilityManager;
  private screenReaderEnabled = false;
  private listeners: Set<(enabled: boolean) => void> = new Set();

  static getInstance(): AccessibilityManager {
    if (!AccessibilityManager.instance) {
      AccessibilityManager.instance = new AccessibilityManager();
    }
    return AccessibilityManager.instance;
  }

  async initialize() {
    try {
      const enabled = await AccessibilityInfo.isScreenReaderEnabled();
      this.screenReaderEnabled = enabled;
      this.notifyListeners(enabled);
    } catch (error) {
      console.warn('Failed to initialize accessibility info:', error);
    }
  }

  isScreenReaderEnabled(): boolean {
    return this.screenReaderEnabled;
  }

  addListener(callback: (enabled: boolean) => void): () => void {
    this.listeners.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(enabled: boolean) {
    this.listeners.forEach(callback => {
      try {
        callback(enabled);
      } catch (error) {
        console.warn('Accessibility listener error:', error);
      }
    });
  }

  // Update screen reader status
  updateScreenReaderStatus(enabled: boolean) {
    if (this.screenReaderEnabled !== enabled) {
      this.screenReaderEnabled = enabled;
      this.notifyListeners(enabled);
    }
  }

  // Announce content to screen readers
  announceForAccessibility(message: string) {
    if (this.screenReaderEnabled) {
      AccessibilityInfo.announceForAccessibility(message);
    }
  }

  // Generate accessibility labels
  generateAccessibilityLabel(
    primaryText: string,
    secondaryText?: string,
    stateText?: string
  ): string {
    const parts = [primaryText];

    if (secondaryText) {
      parts.push(secondaryText);
    }

    if (stateText) {
      parts.push(stateText);
    }

    return parts.join(', ');
  }

  // Generate accessibility hints
  generateAccessibilityHint(action: string, context?: string): string {
    const parts = [action];

    if (context) {
      parts.push(`to ${context}`);
    }

    return parts.join(' ');
  }
}

// Singleton instance
export const accessibilityManager = AccessibilityManager.getInstance();

// Initialize accessibility on module load
accessibilityManager.initialize();

// WCAG 2.1 AA Contrast Ratios
export const WCAG_CONTRAST_RATIOS = {
  normal: 4.5, // Normal text
  large: 3.0,  // Large text (18pt+ or 14pt+ bold)
} as const;

// Contrast calculation utilities
export const calculateContrastRatio = (color1: string, color2: string): number => {
  // Simple contrast calculation - in production, use a proper color library
  // This is a placeholder implementation
  return 4.5; // Assume good contrast for now
};

export const meetsWCAGContrast = (
  foreground: string,
  background: string,
  isLargeText = false
): boolean => {
  const ratio = calculateContrastRatio(foreground, background);
  const required = isLargeText ? WCAG_CONTRAST_RATIOS.large : WCAG_CONTRAST_RATIOS.normal;
  return ratio >= required;
};

// Focus management utilities
export const FOCUS_MANAGEMENT = {
  // Standard focus order priorities
  priorities: {
    skipLinks: 1,
    navigation: 2,
    main: 3,
    complementary: 4,
    contentInfo: 5,
  },

  // Generate unique IDs for focus management
  generateId: (prefix: string): string => {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  // Check if element is focusable
  isFocusable: (element: any): boolean => {
    // This would need to be implemented based on React Native's focus system
    return true; // Placeholder
  },
};

// Keyboard navigation utilities
export const KEYBOARD_NAVIGATION = {
  // Standard keyboard shortcuts
  shortcuts: {
    tab: 'Tab',
    shiftTab: 'Shift+Tab',
    enter: 'Enter',
    space: 'Space',
    escape: 'Escape',
    arrowUp: 'ArrowUp',
    arrowDown: 'ArrowDown',
    arrowLeft: 'ArrowLeft',
    arrowRight: 'ArrowRight',
  },

  // Handle keyboard events
  handleKeyPress: (
    event: any,
    handlers: {
      onEnter?: () => void;
      onSpace?: () => void;
      onEscape?: () => void;
      onArrowUp?: () => void;
      onArrowDown?: () => void;
      onArrowLeft?: () => void;
      onArrowRight?: () => void;
    }
  ) => {
    const { key } = event;

    switch (key) {
      case 'Enter':
        handlers.onEnter?.();
        break;
      case ' ':
        handlers.onSpace?.();
        break;
      case 'Escape':
        handlers.onEscape?.();
        break;
      case 'ArrowUp':
        handlers.onArrowUp?.();
        break;
      case 'ArrowDown':
        handlers.onArrowDown?.();
        break;
      case 'ArrowLeft':
        handlers.onArrowLeft?.();
        break;
      case 'ArrowRight':
        handlers.onArrowRight?.();
        break;
    }
  },
};

// Touch target size validation (WCAG requirement: 44px minimum)
export const validateTouchTarget = (width: number, height: number): boolean => {
  const minSize = 44; // WCAG AA requirement
  return width >= minSize && height >= minSize;
};

// Screen reader announcements
export const ANNOUNCEMENTS = {
  // Standard announcement types
  types: {
    navigation: 'navigation',
    status: 'status',
    alert: 'alert',
    progress: 'progress',
  },

  // Announce navigation changes
  announceNavigation: (message: string) => {
    accessibilityManager.announceForAccessibility(`Navigated to ${message}`);
  },

  // Announce status changes
  announceStatus: (message: string) => {
    accessibilityManager.announceForAccessibility(message);
  },

  // Announce alerts
  announceAlert: (message: string) => {
    accessibilityManager.announceForAccessibility(`Alert: ${message}`);
  },

  // Announce progress
  announceProgress: (current: number, total: number, label: string) => {
    const percentage = Math.round((current / total) * 100);
    accessibilityManager.announceForAccessibility(`${label}: ${percentage}% complete`);
  },
};

// High contrast utilities
export const HIGH_CONTRAST = {
  // Validate high contrast colors
  validateColors: (foreground: string, background: string): boolean => {
    return meetsWCAGContrast(foreground, background, false);
  },

  // Get high contrast color variants
  getHighContrastColor: (color: string, isBackground: boolean): string => {
    // This would need a proper color manipulation library
    // For now, return the original color
    return color;
  },
};

export default accessibilityManager;