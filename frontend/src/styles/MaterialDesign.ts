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

// Material Design Typography
export const MaterialTypography = {
  // Display
  displayLarge: {
    fontSize: 57,
    lineHeight: 64,
    letterSpacing: -0.25,
    fontFamily: 'Roboto-Regular',
  },
  displayMedium: {
    fontSize: 45,
    lineHeight: 52,
    letterSpacing: 0,
    fontFamily: 'Roboto-Regular',
  },
  displaySmall: {
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: 0,
    fontFamily: 'Roboto-Regular',
  },
  
  // Headline
  headlineLarge: {
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: 0,
    fontFamily: 'Roboto-Regular',
  },
  headlineMedium: {
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: 0,
    fontFamily: 'Roboto-Regular',
  },
  headlineSmall: {
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: 0,
    fontFamily: 'Roboto-Regular',
  },
  
  // Title
  titleLarge: {
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 0,
    fontFamily: 'Roboto-Regular',
  },
  titleMedium: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.15,
    fontFamily: 'Roboto-Medium',
  },
  titleSmall: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
    fontFamily: 'Roboto-Medium',
  },
  
  // Body
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.5,
    fontFamily: 'Roboto-Regular',
  },
  bodyMedium: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.25,
    fontFamily: 'Roboto-Regular',
  },
  bodySmall: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
    fontFamily: 'Roboto-Regular',
  },
  
  // Label
  labelLarge: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
    fontFamily: 'Roboto-Medium',
  },
  labelMedium: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
    fontFamily: 'Roboto-Medium',
  },
  labelSmall: {
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.5,
    fontFamily: 'Roboto-Medium',
  },
};

// Material Design Elevation (Shadows)
export const MaterialElevation = {
  level0: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  level1: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 1,
  },
  level2: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  level3: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  level4: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  level5: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
};

// Material Design Spacing (8dp grid system)
export const MaterialSpacing = {
  none: 0,
  xs: 4,    // 0.5 * 8
  sm: 8,    // 1 * 8
  md: 16,   // 2 * 8
  lg: 24,   // 3 * 8
  xl: 32,   // 4 * 8
  xxl: 48,  // 6 * 8
  xxxl: 64, // 8 * 8
};

// Material Design Shape (Border Radius)
export const MaterialShape = {
  none: 0,
  extraSmall: 4,
  small: 8,
  medium: 12,
  large: 16,
  extraLarge: 28,
  full: 9999,
};

// Material Design Breakpoints
export const MaterialBreakpoints = {
  mobile: 320,
  tablet: 768,
  desktop: 1024,
  largeDesktop: 1440,
};

// Material Design Motion
export const MaterialMotion = {
  duration: {
    short1: 50,
    short2: 100,
    short3: 150,
    short4: 200,
    medium1: 250,
    medium2: 300,
    medium3: 350,
    medium4: 400,
    long1: 450,
    long2: 500,
    long3: 550,
    long4: 600,
  },
  easing: {
    standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',
    linear: 'linear',
  },
};

// Material Design Component Styles
export const MaterialStyles = StyleSheet.create({
  // App Bar
  appBar: {
    backgroundColor: MaterialColors.primary[500],
    elevation: 4,
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: MaterialSpacing.md,
  },
  
  // Cards
  card: {
    backgroundColor: MaterialColors.surface,
    borderRadius: MaterialShape.medium,
    elevation: 1,
    marginHorizontal: MaterialSpacing.sm,
    marginVertical: MaterialSpacing.xs,
    padding: MaterialSpacing.md,
  },
  
  // FAB (Floating Action Button)
  fab: {
    position: 'absolute',
    right: MaterialSpacing.md,
    bottom: MaterialSpacing.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: MaterialColors.secondary[500],
    elevation: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Chips
  chip: {
    backgroundColor: MaterialColors.neutral[100],
    borderRadius: MaterialShape.full,
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.xs,
    marginRight: MaterialSpacing.sm,
    marginBottom: MaterialSpacing.sm,
  },
  
  // Text Fields
  textField: {
    backgroundColor: MaterialColors.surface,
    borderRadius: MaterialShape.small,
    borderWidth: 1,
    borderColor: MaterialColors.neutral[300],
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.sm,
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
  },
  
  // Buttons
  button: {
    borderRadius: MaterialShape.full,
    paddingHorizontal: MaterialSpacing.lg,
    paddingVertical: MaterialSpacing.sm,
    elevation: 2,
  },
  buttonText: {
    ...MaterialTypography.labelLarge,
    textTransform: 'uppercase',
  },
  
  // Progress Indicators
  progressBar: {
    height: 4,
    backgroundColor: MaterialColors.primary[100],
    borderRadius: MaterialShape.full,
  },
  progressIndicator: {
    height: '100%',
    backgroundColor: MaterialColors.primary[500],
    borderRadius: MaterialShape.full,
  },
});

// Material Design Dark Theme
export const MaterialDarkTheme = {
  colors: {
    primary: MaterialColors.primary[200],
    secondary: MaterialColors.secondary[200],
    background: '#121212',
    surface: '#1E1E1E',
    onSurface: '#FFFFFF',
    onPrimary: '#000000',
    onSecondary: '#000000',
    onError: '#000000',
    neutral: {
      50: '#1E1E1E',
      100: '#2C2C2C',
      200: '#3A3A3A',
      300: '#484848',
      400: '#565656',
      500: '#646464',
      600: '#727272',
      700: '#808080',
      800: '#8E8E8E',
      900: '#9C9C9C',
    },
  },
  elevation: MaterialElevation,
  typography: MaterialTypography,
  spacing: MaterialSpacing,
  shape: MaterialShape,
};

// Helper functions
export const getElevationStyle = (level: number) => {
  return MaterialElevation[`level${level}` as keyof typeof MaterialElevation] || MaterialElevation.level1;
};

export const getSpacing = (size: keyof typeof MaterialSpacing) => {
  return MaterialSpacing[size];
};

export const getTypography = (variant: keyof typeof MaterialTypography) => {
  return MaterialTypography[variant];
};

export default {
  colors: MaterialColors,
  typography: MaterialTypography,
  elevation: MaterialElevation,
  spacing: MaterialSpacing,
  shape: MaterialShape,
  breakpoints: MaterialBreakpoints,
  motion: MaterialMotion,
  styles: MaterialStyles,
  darkTheme: MaterialDarkTheme,
  getElevationStyle,
  getSpacing,
  getTypography,
};