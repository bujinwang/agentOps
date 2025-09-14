import { useState, useEffect, useCallback } from 'react';
import { AccessibilityInfo } from 'react-native';
import {
  accessibilityManager,
  validateTouchTarget,
  FOCUS_MANAGEMENT,
  KEYBOARD_NAVIGATION,
  ANNOUNCEMENTS,
  HIGH_CONTRAST,
} from '../utils/accessibility';

export interface AccessibilityState {
  screenReaderEnabled: boolean;
  highContrastEnabled: boolean;
  reduceMotionEnabled: boolean;
  fontScale: number;
}

export interface AccessibilityActions {
  announceForAccessibility: (message: string) => void;
  generateAccessibilityLabel: (primaryText: string, secondaryText?: string, stateText?: string) => string;
  generateAccessibilityHint: (action: string, context?: string) => string;
  validateTouchTarget: (width: number, height: number) => boolean;
  generateId: (prefix: string) => string;
  handleKeyPress: (event: any, handlers: any) => void;
  announceNavigation: (message: string) => void;
  announceStatus: (message: string) => void;
  announceAlert: (message: string) => void;
  announceProgress: (current: number, total: number, label: string) => void;
}

// Hook for accessibility features
export const useAccessibility = (): AccessibilityState & AccessibilityActions => {
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  const [highContrastEnabled, setHighContrastEnabled] = useState(false);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  const [fontScale, setFontScale] = useState(1);

  // Initialize accessibility features
  useEffect(() => {
    const initializeAccessibility = async () => {
      try {
        // Screen reader status
        const screenReader = await AccessibilityInfo.isScreenReaderEnabled();
        setScreenReaderEnabled(screenReader);

        // For now, set other features to false as they're not available in React Native
        // These would need to be implemented differently or through custom native modules
        setHighContrastEnabled(false);
        setReduceMotionEnabled(false);
        setFontScale(1);
      } catch (error) {
        console.warn('Failed to initialize accessibility features:', error);
      }
    };

    initializeAccessibility();

    // Set up listeners for dynamic changes
    const screenReaderSubscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setScreenReaderEnabled
    );

    return () => {
      screenReaderSubscription?.remove();
    };
  }, []);

  // Memoized accessibility actions
  const accessibilityActions: AccessibilityActions = {
    announceForAccessibility: useCallback((message: string) => {
      accessibilityManager.announceForAccessibility(message);
    }, []),

    generateAccessibilityLabel: useCallback((
      primaryText: string,
      secondaryText?: string,
      stateText?: string
    ) => {
      return accessibilityManager.generateAccessibilityLabel(primaryText, secondaryText, stateText);
    }, []),

    generateAccessibilityHint: useCallback((action: string, context?: string) => {
      return accessibilityManager.generateAccessibilityHint(action, context);
    }, []),

    validateTouchTarget: useCallback(validateTouchTarget, []),

    generateId: useCallback(FOCUS_MANAGEMENT.generateId, []),

    handleKeyPress: useCallback(KEYBOARD_NAVIGATION.handleKeyPress, []),

    announceNavigation: useCallback(ANNOUNCEMENTS.announceNavigation, []),

    announceStatus: useCallback(ANNOUNCEMENTS.announceStatus, []),

    announceAlert: useCallback(ANNOUNCEMENTS.announceAlert, []),

    announceProgress: useCallback(ANNOUNCEMENTS.announceProgress, []),
  };

  return {
    screenReaderEnabled,
    highContrastEnabled,
    reduceMotionEnabled,
    fontScale,
    ...accessibilityActions,
  };
};

// Hook for focus management
export const useFocusManagement = () => {
  const [focusedElement, setFocusedElement] = useState<string | null>(null);

  const setFocus = useCallback((elementId: string) => {
    setFocusedElement(elementId);
    // In React Native, you would use refs to manage focus
  }, []);

  const moveFocus = useCallback((direction: 'next' | 'previous' | 'first' | 'last') => {
    // Implement focus movement logic based on direction
    console.log(`Moving focus ${direction}`);
  }, []);

  return {
    focusedElement,
    setFocus,
    moveFocus,
  };
};

// Hook for keyboard navigation
export const useKeyboardNavigation = (handlers: {
  onEnter?: () => void;
  onSpace?: () => void;
  onEscape?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
}) => {
  const handleKeyPress = useCallback((event: any) => {
    KEYBOARD_NAVIGATION.handleKeyPress(event, handlers);
  }, [handlers]);

  return {
    handleKeyPress,
  };
};

// Hook for screen reader announcements
export const useScreenReader = () => {
  const { screenReaderEnabled, announceForAccessibility } = useAccessibility();

  const announce = useCallback((message: string) => {
    if (screenReaderEnabled) {
      announceForAccessibility(message);
    }
  }, [screenReaderEnabled, announceForAccessibility]);

  const announceNavigation = useCallback((message: string) => {
    ANNOUNCEMENTS.announceNavigation(message);
  }, []);

  const announceStatus = useCallback((message: string) => {
    ANNOUNCEMENTS.announceStatus(message);
  }, []);

  const announceAlert = useCallback((message: string) => {
    ANNOUNCEMENTS.announceAlert(message);
  }, []);

  return {
    screenReaderEnabled,
    announce,
    announceNavigation,
    announceStatus,
    announceAlert,
  };
};

// Hook for high contrast support
export const useHighContrast = () => {
  const { highContrastEnabled } = useAccessibility();

  const validateContrast = useCallback((foreground: string, background: string) => {
    return HIGH_CONTRAST.validateColors(foreground, background);
  }, []);

  const getHighContrastColor = useCallback((color: string, isBackground: boolean) => {
    return HIGH_CONTRAST.getHighContrastColor(color, isBackground);
  }, []);

  return {
    highContrastEnabled,
    validateContrast,
    getHighContrastColor,
  };
};

// Hook for touch target validation
export const useTouchTargetValidation = () => {
  const validateTarget = useCallback((width: number, height: number) => {
    return validateTouchTarget(width, height);
  }, []);

  const getMinimumTouchTarget = useCallback(() => {
    return { width: 44, height: 44 }; // WCAG AA minimum
  }, []);

  return {
    validateTarget,
    getMinimumTouchTarget,
  };
};

// Hook for accessibility preferences
export const useAccessibilityPreferences = () => {
  const {
    screenReaderEnabled,
    highContrastEnabled,
    reduceMotionEnabled,
    fontScale,
  } = useAccessibility();

  return {
    preferences: {
      screenReaderEnabled,
      highContrastEnabled,
      reduceMotionEnabled,
      fontScale,
    },
    // Helper functions for conditional rendering
    shouldReduceMotion: reduceMotionEnabled,
    shouldUseHighContrast: highContrastEnabled,
    getScaledFontSize: (baseSize: number) => baseSize * fontScale,
  };
};

export default useAccessibility;