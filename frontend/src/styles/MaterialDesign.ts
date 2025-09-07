
import { StyleSheet, Dimensions, Platform } from 'react-native';

// Material Design Color System
export const MaterialColors = {
  // Primary Colors - Real Estate Blue
  primary: {
    50: '#E3F2FD',
    100: '#BBDEFB',
    200: '#90CAF9',
    300: '#64B5F6',
    400: '#42A5F5',
    500: '#2196F3', // Primary
    600: '#1E88E5',
    700: '#1976D2',
    800: '#1565C0',
    900: '#0D47A1',
  },
  
  // Secondary Colors - Success Green
  secondary: {
    50: '#E8F5E8',
    100: '#C8E6C9',
    200: '#A5D6A7',
    300: '#81C784',
    400: '#66BB6A',
    500: '#4CAF50', // Secondary
    600: '#43A047',
    700: '#388E3C',
    800: '#2E7D32',
    900: '#1B5E20',
  },
  
  // Error Colors
  error: {
    50: '#FFEBEE',
    100: '#FFCDD2',
    200: '#EF9A9A',
    300: '#E57373',
    400: '#EF5350',
    500: '#F44336', // Error
    600: '#E53935',
    700: '#D32F2F',
    800: '#C62828',
    900: '#B71C1C',
  },
  
  // Warning Colors
  warning: {
    50: '#FFF3E0',
    100: '#FFE0B2',
    200: '#FFCC02',
    300: '#FFB74D',
    400: '#FFA726',
    500: '#FF9800', // Warning
    600: '#FB8C00',
    700: '#F57C00',
    800: '#EF6C00',
    900: '#E65100',
  },
  
  // Neutral Colors
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
  
  // Background Colors
  background: '#FFFFFF',
  surface: '#FFFFFF',
  onSurface: '#000000',
  onPrimary: '#FFFFFF',
  onSecondary: '#FFFFFF',
  onError: '#FFFFFF',
};

// Material Design Spacing System
export const MaterialSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  // Component specific spacing
  component: {
    padding: 16,
    margin: 8,
    gap: 12,
  },
  // Layout spacing
  layout: {
    section: 24,
    container: 16,
    screen: 20,
  },
};

// Material Design Elevation System
export const MaterialElevation = {
  level0: {
    elevation: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  level1: {
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
  },
  level2: {
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
  },
  level3: {
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
  },
  level4: {
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  level5: {
    elevation: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.20,
    shadowRadius: 12,
  },
};

// Material Design Shape System
export const MaterialShape = {
  none: 0,
  extraSmall: 4,
  small: 8,
  medium: 12,
  large: 16,
  extraLarge: 28,
  full: 9999,
  // Component specific shapes
  button: 20,
  card: 12,
  fab: 16,
  bottomSheet: 28,
};

// Material Design Icon System
export const MaterialIcons = {
  // Navigation Icons
  navigation: {
    home: 'home',
    leads: 'people',
    tasks: 'assignment',
    profile: 'person',
    settings: 'settings',
    back: 'arrow-back',
    menu: 'menu',
    close: 'close',
    search: 'search',
  },
  
  // Action Icons
  actions: {
    add: 'add',
    edit: 'edit',
    delete: 'delete',
    save: 'save',
    cancel: 'cancel',
    done: 'done',
    favorite: 'favorite',
    share: 'share',
    call: 'call',
    email: 'email',
    message: 'message',
  },
  
  // Status Icons
  status: {
    success: 'check-circle',
    error: 'error',
    warning: 'warning',
    info: 'info',
    pending: 'schedule',
    active: 'radio-button-checked',
    inactive: 'radio-button-unchecked',
  },
  
  // Real Estate Specific Icons
  realEstate: {
    property: 'home',
    location: 'location-on',
    price: 'attach-money',
    area: 'square-foot',
    bedrooms: 'bed',
    bathrooms: 'bathtub',
    garage: 'garage',
    garden: 'grass',
    pool: 'pool',
    security: 'security',
  },
  
  // Business Icons
  business: {
    client: 'person',
    meeting: 'event',
    document: 'description',
    contract: 'assignment',
    calendar: 'calendar-today',
    notification: 'notifications',
    analytics: 'analytics',
    report: 'assessment',
  },
};

// Icon Sizes
export const MaterialIconSizes = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 40,
  xxl: 48,
  // Component specific sizes
  navigation: 24,
  fab: 24,
  button: 20,
  appBar: 24,
  list: 24,
};

// Material Design Typography - Using System Fonts
const systemFont = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  web: 'Arial, sans-serif',
});

export const MaterialTypography = {
  // Display
  displayLarge: {
    fontSize: 57,
    lineHeight: 64,
    letterSpacing: -0.25,
    fontFamily: systemFont,
    fontWeight: '400' as any,
  },
  displayMedium: {
    fontSize: 45,
    lineHeight: 52,
    letterSpacing: 0,
    fontFamily: systemFont,
    fontWeight: '400' as any,
  },
  displaySmall: {
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: 0,
    fontFamily: systemFont,
    fontWeight: '400' as any,
  },
  
  // Headline
  headlineLarge: {
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: 0,
    fontFamily: systemFont,
    fontWeight: '400' as any,
  },
  headlineMedium: {
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: 0,
    fontFamily: systemFont,
    fontWeight: '400' as any,
  },
  headlineSmall: {
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: 0,
    fontFamily: systemFont,
    fontWeight: '400' as any,
  },
  
  // Title
  titleLarge: {
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 0,
    fontFamily: systemFont,
    fontWeight: '500' as any,
  },
  titleMedium: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.15,
    fontFamily: systemFont,
    fontWeight: '500' as any,
  },
  titleSmall: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
    fontFamily: systemFont,
    fontWeight: '500' as any,
  },
  
  // Label
  labelLarge: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
    fontFamily: systemFont,
    fontWeight: '500' as any,
  },
  labelMedium: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
    fontFamily: systemFont,
    fontWeight: '500' as any,
  },
  labelSmall: {
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.5,
    fontFamily: systemFont,
    fontWeight: '500' as any,
  },
  
  // Body
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.15,
    fontFamily: systemFont,
    fontWeight: '400' as any,
  },
  bodyMedium: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.25,
    fontFamily: systemFont,
    fontWeight: '400' as any,
  },
  bodySmall: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
    fontFamily: systemFont,
    fontWeight: '400' as any,
  },
};

// Material Design Breakpoints
export const MaterialBreakpoints = {
  xs: 0,
  sm: 600,
  md: 960,
  lg: 1280,
  xl: 1920,
  mobile: 320,
  tablet: 768,
  desktop: 1024,
};

// Material Design Motion
export const MaterialMotion = {
  duration: {
    short1: 75,
    short2: 150,
    short3: 200,
    short4: 250,
    medium1: 300,
    medium2: 350,
    medium3: 400,
    medium4: 450,
    long1: 500,
    long2: 550,
    long3: 600,
    long4: 650,
  },
  easing: {
    linear: 'linear',
    standard: 'cubic-bezier(0.2, 0.0, 0, 1.0)',
    decelerated: 'cubic-bezier(0.0, 0.0, 0.2, 1.0)',
    accelerated: 'cubic-bezier(0.4, 0.0, 1, 1.0)',
  },
};

// Screen Dimensions
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const MaterialScreen = {
  width: screenWidth,
  height: screenHeight,
  isMobile: screenWidth < MaterialBreakpoints.tablet,
  isTablet: screenWidth >= MaterialBreakpoints.tablet && screenWidth < MaterialBreakpoints.desktop,
  isDesktop: screenWidth >= MaterialBreakpoints.desktop,
};

// Enhanced Icon Theme System
export const MaterialIconThemes = {
  light: {
    default: MaterialColors.neutral[800],
    active: MaterialColors.primary[600],
    inactive: MaterialColors.neutral[400],
    disabled: MaterialColors.neutral[300],
    success: MaterialColors.secondary[600],
    error: MaterialColors.error[500],
    warning: MaterialColors.warning[600],
    info: MaterialColors.primary[500],
    surface: MaterialColors.neutral[600],
    onSurface: MaterialColors.neutral[800],
  },
  dark: {
    default: MaterialColors.neutral[100],
    active: MaterialColors.primary[300],
    inactive: MaterialColors.neutral[600],
    disabled: MaterialColors.neutral[700],
    success: MaterialColors.secondary[400],
    error: MaterialColors.error[300],
    warning: MaterialColors.warning[400],
    info: MaterialColors.primary[300],
    surface: MaterialColors.neutral[400],
    onSurface: MaterialColors.neutral[100],
  },
};

// Icon State Variants
export const MaterialIconStates = {
  default: {
    opacity: 1,
    scale: 1,
    rotation: 0,
  },
  active: {
    opacity: 1,
    scale: 1.1,
    rotation: 0,
  },
  inactive: {
    opacity: 0.6,
    scale: 0.9,
    rotation: 0,
  },
  disabled: {
    opacity: 0.38,
    scale: 1,
    rotation: 0,
  },
  hover: {
    opacity: 0.8,
    scale: 1.05,
    rotation: 0,
  },
  pressed: {
    opacity: 0.7,
    scale: 0.95,
    rotation: 0,
  },
  loading: {
    opacity: 0.6,
    scale: 1,
    rotation: 360,
  },
};

// Icon Animation Presets
export const MaterialIconAnimations = {
  none: {
    duration: 0,
    easing: 'linear',
  },
  subtle: {
    duration: MaterialMotion.duration.short2,
    easing: MaterialMotion.easing.standard,
  },
  standard: {
    duration: MaterialMotion.duration.short3,
    easing: MaterialMotion.easing.standard,
  },
  emphasized: {
    duration: MaterialMotion.duration.medium1,
    easing: MaterialMotion.easing.decelerated,
  },
  bounce: {
    duration: MaterialMotion.duration.medium2,
    easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
};

// Context-Aware Icon Variants
export const MaterialIconContexts = {
  navigation: {
    defaultSize: MaterialIconSizes.navigation,
    activeColor: MaterialColors.primary[600],
    inactiveColor: MaterialColors.neutral[500],
    states: ['default', 'active', 'inactive'],
  },
  action: {
    defaultSize: MaterialIconSizes.button,
    primaryColor: MaterialColors.primary[600],
    secondaryColor: MaterialColors.neutral[600],
    states: ['default', 'active', 'disabled', 'hover', 'pressed'],
  },
  status: {
    defaultSize: MaterialIconSizes.sm,
    successColor: MaterialColors.secondary[600],
    errorColor: MaterialColors.error[500],
    warningColor: MaterialColors.warning[600],
    states: ['success', 'error', 'warning', 'info'],
  },
  decorative: {
    defaultSize: MaterialIconSizes.md,
    defaultColor: MaterialColors.neutral[400],
    states: ['default', 'subtle'],
  },
};
