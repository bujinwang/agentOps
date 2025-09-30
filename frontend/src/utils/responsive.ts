import { Dimensions, Platform } from 'react-native';

// Breakpoints following Material Design 3 guidelines
export const Breakpoints = {
  mobile: 320,
  tablet: 768,
  desktop: 1024,
  // Additional breakpoints for fine-grained control
  xs: 0,
  sm: 600,
  md: 960,
  lg: 1280,
  xl: 1920,
} as const;

export type Breakpoint = keyof typeof Breakpoints;

// Device type detection
export const getDeviceType = (width: number): 'mobile' | 'tablet' | 'desktop' => {
  if (width < Breakpoints.tablet) return 'mobile';
  if (width < Breakpoints.desktop) return 'tablet';
  return 'desktop';
};

// Orientation detection
export const getOrientation = (width: number, height: number): 'portrait' | 'landscape' => {
  return width > height ? 'landscape' : 'portrait';
};

// Responsive dimension utilities
export class ResponsiveDimensions {
  private static instance: ResponsiveDimensions;
  private dimensions = Dimensions.get('window');

  private readonly defaultGridConfig = {
    mobile: 1,
    tablet: 2,
    desktop: 3,
  } as const;

  private readonly defaultContentWidths = {
    mobile: 480,
    tablet: 720,
    desktop: 1120,
  } as const;

  static getInstance(): ResponsiveDimensions {
    if (!ResponsiveDimensions.instance) {
      ResponsiveDimensions.instance = new ResponsiveDimensions();
    }
    return ResponsiveDimensions.instance;
  }

  getDimensions() {
    return {
      width: this.dimensions.width,
      height: this.dimensions.height,
    };
  }

  updateDimensions(dimensions: { width: number; height: number }) {
    this.dimensions = {
      ...this.dimensions,
      width: dimensions.width,
      height: dimensions.height,
    };
  }

  // Get current device type
  getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    return getDeviceType(this.dimensions.width);
  }

  // Get current orientation
  getOrientation(): 'portrait' | 'landscape' {
    return getOrientation(this.dimensions.width, this.dimensions.height);
  }

  // Check if current screen matches breakpoint
  isBreakpoint(breakpoint: Breakpoint): boolean {
    const currentWidth = this.dimensions.width;
    const breakpointWidth = Breakpoints[breakpoint];

    switch (breakpoint) {
      case 'xs':
        return currentWidth >= 0;
      case 'sm':
        return currentWidth >= Breakpoints.sm;
      case 'md':
        return currentWidth >= Breakpoints.md;
      case 'lg':
        return currentWidth >= Breakpoints.lg;
      case 'xl':
        return currentWidth >= Breakpoints.xl;
      case 'mobile':
        return currentWidth >= Breakpoints.mobile && currentWidth < Breakpoints.tablet;
      case 'tablet':
        return currentWidth >= Breakpoints.tablet && currentWidth < Breakpoints.desktop;
      case 'desktop':
        return currentWidth >= Breakpoints.desktop;
      default:
        return false;
    }
  }

  // Get responsive value based on current breakpoint
  getResponsiveValue<T>(values: Partial<Record<Breakpoint, T>>): T | undefined {
    const deviceType = this.getDeviceType();
    const orientation = this.getOrientation();

    // Priority: specific device type > orientation > general breakpoint
    if (values[deviceType]) return values[deviceType];
    if (values[orientation as Breakpoint]) return values[orientation as Breakpoint];

    // Fallback to breakpoint hierarchy
    const breakpoints: Breakpoint[] = ['xl', 'lg', 'md', 'sm', 'xs'];
    for (const bp of breakpoints) {
      if (this.isBreakpoint(bp) && values[bp]) {
        return values[bp];
      }
    }

    return undefined;
  }

  // Scale value based on screen size (relative to mobile baseline)
  scaleValue(value: number, baseWidth: number = Breakpoints.mobile): number {
    const scale = this.dimensions.width / baseWidth;
    return Math.round(value * Math.min(scale, 2)); // Cap at 2x to prevent excessive scaling
  }

  // Get touch target size that meets accessibility requirements
  getTouchTargetSize(minSize: number = 44): number {
    const deviceType = this.getDeviceType();
    // Slightly larger touch targets for mobile devices
    const multiplier = deviceType === 'mobile' ? 1.2 : 1;
    return Math.max(minSize, this.scaleValue(minSize) * multiplier);
  }

  // Get responsive font size
  getResponsiveFontSize(baseSize: number): number {
    const deviceType = this.getDeviceType();
    const scale = deviceType === 'desktop' ? 1.1 : deviceType === 'tablet' ? 1.05 : 1;
    return Math.round(baseSize * scale);
  }

  // Get responsive spacing
  getResponsiveSpacing(baseSpacing: number): number {
    return this.scaleValue(baseSpacing);
  }

  // Determine grid column count based on device type and overrides
  getGridColumns(config: Partial<Record<'mobile' | 'tablet' | 'desktop', number>> & { default?: number } = {}): number {
    const deviceType = this.getDeviceType();
    const fallback = config.default ?? this.defaultGridConfig[deviceType];
    return config[deviceType] ?? fallback ?? 1;
  }

  // Determine max content width for constrained layouts
  getMaxContentWidth(overrides: Partial<Record<'mobile' | 'tablet' | 'desktop', number>> = {}): number {
    const deviceType = this.getDeviceType();
    const baseWidth = this.defaultContentWidths[deviceType];
    return overrides[deviceType] ?? baseWidth;
  }

  // Convenience to derive responsive padding with optional overrides
  getResponsivePadding(basePadding: number, overrides: Partial<Record<'mobile' | 'tablet' | 'desktop', number>> = {}): number {
    const deviceType = this.getDeviceType();
    const target = overrides[deviceType] ?? basePadding;
    return this.scaleValue(target);
  }
}

// Singleton instance
export const responsiveDimensions = ResponsiveDimensions.getInstance();

// Utility functions for common responsive operations
export const isMobile = (): boolean => responsiveDimensions.getDeviceType() === 'mobile';
export const isTablet = (): boolean => responsiveDimensions.getDeviceType() === 'tablet';
export const isDesktop = (): boolean => responsiveDimensions.getDeviceType() === 'desktop';

export const isPortrait = (): boolean => responsiveDimensions.getOrientation() === 'portrait';
export const isLandscape = (): boolean => responsiveDimensions.getOrientation() === 'landscape';

// Dimension listener for real-time updates
export const addDimensionListener = (callback: (dimensions: { width: number; height: number }) => void) => {
  const subscription = Dimensions.addEventListener('change', ({ window }) => {
    responsiveDimensions.updateDimensions(window);
    callback(window);
  });

  return subscription.remove;
};

// Performance-optimized dimension updates
let dimensionUpdateTimeout: NodeJS.Timeout;
export const updateDimensionsThrottled = (dimensions: { width: number; height: number }, delay: number = 16) => {
  if (dimensionUpdateTimeout) {
    clearTimeout(dimensionUpdateTimeout);
  }

  dimensionUpdateTimeout = setTimeout(() => {
    responsiveDimensions.updateDimensions(dimensions);
  }, delay);
};

export default responsiveDimensions;
