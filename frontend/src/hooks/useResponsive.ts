import { useState, useEffect, useCallback } from 'react';
import { Dimensions } from 'react-native';
import { responsiveDimensions, Breakpoint, addDimensionListener } from '../utils/responsive';

export interface ResponsiveState {
  width: number;
  height: number;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  orientation: 'portrait' | 'landscape';
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
}

export interface ResponsiveActions {
  isBreakpoint: (breakpoint: Breakpoint) => boolean;
  getResponsiveValue: <T>(values: Partial<Record<Breakpoint, T>>) => T | undefined;
  scaleValue: (value: number, baseWidth?: number) => number;
  getTouchTargetSize: (minSize?: number) => number;
  getResponsiveFontSize: (baseSize: number) => number;
  getResponsiveSpacing: (baseSpacing: number) => number;
}

// Hook for responsive design
export const useResponsive = (): ResponsiveState & ResponsiveActions => {
  const [dimensions, setDimensions] = useState(responsiveDimensions.getDimensions());

  // Update dimensions when screen changes
  useEffect(() => {
    const subscription = addDimensionListener((newDimensions) => {
      setDimensions(newDimensions);
    });

    return () => subscription();
  }, []);

  // Memoized responsive state
  const responsiveState: ResponsiveState = {
    width: dimensions.width,
    height: dimensions.height,
    deviceType: responsiveDimensions.getDeviceType(),
    orientation: responsiveDimensions.getOrientation(),
    isMobile: responsiveDimensions.getDeviceType() === 'mobile',
    isTablet: responsiveDimensions.getDeviceType() === 'tablet',
    isDesktop: responsiveDimensions.getDeviceType() === 'desktop',
    isPortrait: responsiveDimensions.getOrientation() === 'portrait',
    isLandscape: responsiveDimensions.getOrientation() === 'landscape',
  };

  // Memoized responsive actions
  const responsiveActions: ResponsiveActions = {
    isBreakpoint: useCallback((breakpoint: Breakpoint) => responsiveDimensions.isBreakpoint(breakpoint), []),
    getResponsiveValue: useCallback(<T,>(values: Partial<Record<Breakpoint, T>>) =>
      responsiveDimensions.getResponsiveValue(values), []),
    scaleValue: useCallback((value: number, baseWidth?: number) =>
      responsiveDimensions.scaleValue(value, baseWidth), []),
    getTouchTargetSize: useCallback((minSize?: number) =>
      responsiveDimensions.getTouchTargetSize(minSize), []),
    getResponsiveFontSize: useCallback((baseSize: number) =>
      responsiveDimensions.getResponsiveFontSize(baseSize), []),
    getResponsiveSpacing: useCallback((baseSpacing: number) =>
      responsiveDimensions.getResponsiveSpacing(baseSpacing), []),
  };

  return {
    ...responsiveState,
    ...responsiveActions,
  };
};

// Hook for breakpoint-specific logic
export const useBreakpoint = (breakpoint: Breakpoint): boolean => {
  const [matches, setMatches] = useState(responsiveDimensions.isBreakpoint(breakpoint));

  useEffect(() => {
    const subscription = addDimensionListener(() => {
      setMatches(responsiveDimensions.isBreakpoint(breakpoint));
    });

    return () => subscription();
  }, [breakpoint]);

  return matches;
};

// Hook for device type detection
export const useDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  const [deviceType, setDeviceType] = useState(responsiveDimensions.getDeviceType());

  useEffect(() => {
    const subscription = addDimensionListener(() => {
      setDeviceType(responsiveDimensions.getDeviceType());
    });

    return () => subscription();
  }, []);

  return deviceType;
};

// Hook for orientation detection
export const useOrientation = (): 'portrait' | 'landscape' => {
  const [orientation, setOrientation] = useState(responsiveDimensions.getOrientation());

  useEffect(() => {
    const subscription = addDimensionListener(() => {
      setOrientation(responsiveDimensions.getOrientation());
    });

    return () => subscription();
  }, []);

  return orientation;
};

// Hook for responsive values with automatic updates
export const useResponsiveValue = <T>(values: Partial<Record<Breakpoint, T>>): T | undefined => {
  const [responsiveValue, setResponsiveValue] = useState<T | undefined>(
    responsiveDimensions.getResponsiveValue(values)
  );

  useEffect(() => {
    const subscription = addDimensionListener(() => {
      setResponsiveValue(responsiveDimensions.getResponsiveValue(values));
    });

    return () => subscription();
  }, [values]);

  return responsiveValue;
};

// Hook for responsive scaling
export const useResponsiveScale = (baseValue: number, baseWidth?: number): number => {
  const [scaledValue, setScaledValue] = useState(
    responsiveDimensions.scaleValue(baseValue, baseWidth)
  );

  useEffect(() => {
    const subscription = addDimensionListener(() => {
      setScaledValue(responsiveDimensions.scaleValue(baseValue, baseWidth));
    });

    return () => subscription();
  }, [baseValue, baseWidth]);

  return scaledValue;
};

// Hook for touch target sizing
export const useTouchTargetSize = (minSize: number = 44): number => {
  const [touchTargetSize, setTouchTargetSize] = useState(
    responsiveDimensions.getTouchTargetSize(minSize)
  );

  useEffect(() => {
    const subscription = addDimensionListener(() => {
      setTouchTargetSize(responsiveDimensions.getTouchTargetSize(minSize));
    });

    return () => subscription();
  }, [minSize]);

  return touchTargetSize;
};

// Performance-optimized hook that only updates when breakpoint changes
export const useBreakpointValue = <T>(
  breakpoint: Breakpoint,
  trueValue: T,
  falseValue: T
): T => {
  const [value, setValue] = useState<T>(
    responsiveDimensions.isBreakpoint(breakpoint) ? trueValue : falseValue
  );

  useEffect(() => {
    const subscription = addDimensionListener(() => {
      const matches = responsiveDimensions.isBreakpoint(breakpoint);
      setValue(matches ? trueValue : falseValue);
    });

    return () => subscription();
  }, [breakpoint, trueValue, falseValue]);

  return value;
};

export default useResponsive;