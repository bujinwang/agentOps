import { StyleSheet } from 'react-native';
import { MaterialColors, MaterialElevation, MaterialSpacing, MaterialTypography, MaterialShape } from './MaterialDesign';

// Material Design Dark Theme - Professional BMAD Styling
export const MaterialDarkColors = {
  // Primary Colors - Adjusted for Dark Theme
  primary: {
    50: '#1E3A5F',
    100: '#2C5282',
    200: '#3A6BA5',
    300: '#4884C8',
    400: '#569DEB',
    500: '#64B5F6', // Primary - Lighter for dark theme
    600: '#7BC4F8',
    700: '#92D3FA',
    800: '#A9E2FC',
    900: '#C0F1FE',
  },
  
  // Secondary Colors - Adjusted for Dark Theme
  secondary: {
    50: '#1F3A24',
    100: '#2D4F2E',
    200: '#3B6438',
    300: '#4A7942',
    400: '#588E4C',
    500: '#66BB6A', // Secondary - Lighter for dark theme
    600: '#7CC880',
    700: '#92D596',
    800: '#A8E2AC',
    900: '#BEE9C2',
  },
  
  // Error Colors - Adjusted for Dark Theme
  error: {
    50: '#5D1A1A',
    100: '#7F2C2C',
    200: '#A13E3E',
    300: '#C35050',
    400: '#E56262',
    500: '#EF5350', // Error - Lighter for dark theme
    600: '#F16966',
    700: '#F37F7C',
    800: '#F59592',
    900: '#F7ABA8',
  },
  
  // Warning Colors - Adjusted for Dark Theme
  warning: {
    50: '#5D3A00',
    100: '#7F5000',
    200: '#A16600',
    300: '#C37C00',
    400: '#E59200',
    500: '#FFA726', // Warning - Lighter for dark theme
    600: '#FFB740',
    700: '#FFC766',
    800: '#FFD78C',
    900: '#FFE7B2',
  },
  
  // Neutral Colors - Dark Theme Palette
  neutral: {
    50: '#121212',  // Darkest
    100: '#1E1E1E',
    200: '#2C2C2C',
    300: '#3A3A3A',
    400: '#484848',
    500: '#565656',  // Mid-range
    600: '#646464',
    700: '#727272',
    800: '#808080',
    900: '#8E8E8E',  // Lightest
  },
  
  // Background Colors - Dark Theme
  background: '#121212',
  surface: '#1E1E1E',
  surfaceVariant: '#2C2C2C',
  onSurface: '#FFFFFF',
  onSurfaceVariant: '#E0E0E0',
  onPrimary: '#000000',
  onSecondary: '#000000',
  onError: '#000000',
  outline: '#484848',
  outlineVariant: '#3A3A3A',
};

// Material Design Dark Theme Component Styles
export const MaterialDarkStyles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
    backgroundColor: MaterialDarkColors.background,
  },
  
  // Cards - Dark Theme
  card: {
    backgroundColor: MaterialDarkColors.surface,
    borderRadius: MaterialShape.medium,
    borderWidth: 1,
    borderColor: MaterialDarkColors.outline,
    marginHorizontal: MaterialSpacing.sm,
    marginVertical: MaterialSpacing.xs,
    padding: MaterialSpacing.md,
    elevation: 1,
  },
  
  // Text Styles - Dark Theme
  textPrimary: {
    ...MaterialTypography.bodyLarge,
    color: MaterialDarkColors.onSurface,
  },
  textSecondary: {
    ...MaterialTypography.bodyMedium,
    color: MaterialDarkColors.onSurfaceVariant,
  },
  textDisabled: {
    ...MaterialTypography.bodyMedium,
    color: MaterialDarkColors.neutral[600],
  },
  
  // App Bar - Dark Theme
  appBar: {
    backgroundColor: MaterialDarkColors.surface,
    elevation: 4,
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: MaterialSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: MaterialDarkColors.outline,
  },
  
  // FAB - Dark Theme
  fab: {
    position: 'absolute',
    right: MaterialSpacing.md,
    bottom: MaterialSpacing.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: MaterialDarkColors.secondary[500],
    elevation: 6,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  
  // Text Field - Dark Theme
  textField: {
    backgroundColor: MaterialDarkColors.surface,
    borderRadius: MaterialShape.small,
    borderWidth: 1,
    borderColor: MaterialDarkColors.outline,
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.sm,
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    color: MaterialDarkColors.onSurface,
  },
  
  // Chips - Dark Theme
  chip: {
    backgroundColor: MaterialDarkColors.surfaceVariant,
    borderRadius: MaterialShape.full,
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.xs,
    marginRight: MaterialSpacing.sm,
    marginBottom: MaterialSpacing.sm,
    borderWidth: 1,
    borderColor: MaterialDarkColors.outline,
  },
  chipActive: {
    backgroundColor: MaterialDarkColors.primary[500],
    borderColor: MaterialDarkColors.primary[500],
  },
  chipText: {
    ...MaterialTypography.labelMedium,
    color: MaterialDarkColors.onSurfaceVariant,
  },
  chipTextActive: {
    color: MaterialDarkColors.onPrimary,
  },
  
  // Elevation Adjustments for Dark Theme
  elevation1: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 1,
  },
  elevation2: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },
  elevation3: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 3,
  },
});

// Dark Theme Helper Functions
export const getDarkThemeColors = () => MaterialDarkColors;

export const getDarkElevationStyle = (level: number) => {
  const elevations = {
    0: MaterialElevation.level0,
    1: MaterialDarkStyles.elevation1,
    2: MaterialDarkStyles.elevation2,
    3: MaterialDarkStyles.elevation3,
  };
  return elevations[level as keyof typeof elevations] || MaterialDarkStyles.elevation1;
};

// Dark Theme Color Functions
export const getDarkSurfaceColor = (elevation: number) => {
  // Material Design 3 surface elevation colors for dark theme
  const surfaceColors = {
    0: MaterialDarkColors.background,
    1: '#1E1E1E',
    2: '#222222',
    3: '#262626',
    4: '#2A2A2A',
    5: '#2E2E2E',
  };
  return surfaceColors[elevation] || MaterialDarkColors.surface;
};

// Professional BMAD Dark Theme
export const MaterialBMADDarkTheme = {
  colors: MaterialDarkColors,
  styles: MaterialDarkStyles,
  getDarkElevationStyle,
  getDarkSurfaceColor,
  
  // Business-specific dark theme colors
  business: {
    primary: MaterialDarkColors.primary[500],
    secondary: MaterialDarkColors.secondary[500],
    success: MaterialDarkColors.secondary[600],
    warning: MaterialDarkColors.warning[500],
    error: MaterialDarkColors.error[500],
    info: MaterialDarkColors.primary[400],
  },
  
  // Data visualization colors for dark theme
  dataVisualization: {
    primary: MaterialDarkColors.primary[400],
    secondary: MaterialDarkColors.secondary[400],
    tertiary: MaterialDarkColors.warning[400],
    quaternary: MaterialDarkColors.neutral[600],
    success: MaterialDarkColors.secondary[500],
    error: MaterialDarkColors.error[500],
    warning: MaterialDarkColors.warning[500],
    info: MaterialDarkColors.primary[300],
  },
};

export default MaterialBMADDarkTheme;