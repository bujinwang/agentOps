import { StyleSheet } from 'react-native';
import { MaterialColors, MaterialElevation, MaterialSpacing, MaterialTypography, MaterialShape } from './MaterialDesign';

// Material Design Light Theme - Professional BMAD Styling
export const MaterialLightColors = {
  // Primary Colors - Standard for Light Theme
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

  // Secondary Colors - Standard for Light Theme
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

  // Error Colors - Standard for Light Theme
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

  // Warning Colors - Standard for Light Theme
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

  // Neutral Colors - Light Theme Palette
  neutral: {
    50: '#FAFAFA',  // Lightest
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',  // Mid-range
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',  // Darkest
  },

  // Background Colors - Light Theme
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceVariant: '#F5F5F5',
  onSurface: '#000000',
  onSurfaceVariant: '#424242',
  onPrimary: '#FFFFFF',
  onSecondary: '#FFFFFF',
  onError: '#FFFFFF',
  outline: '#BDBDBD',
  outlineVariant: '#E0E0E0',
};

// Material Design Light Theme Component Styles
export const MaterialLightStyles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
    backgroundColor: MaterialLightColors.background,
  },

  // Cards - Light Theme
  card: {
    backgroundColor: MaterialLightColors.surface,
    borderRadius: MaterialShape.medium,
    borderWidth: 1,
    borderColor: MaterialLightColors.outline,
    marginHorizontal: MaterialSpacing.sm,
    marginVertical: MaterialSpacing.xs,
    padding: MaterialSpacing.md,
    elevation: 1,
  },

  // Text Styles - Light Theme
  textPrimary: {
    ...MaterialTypography.bodyLarge,
    color: MaterialLightColors.onSurface,
  },
  textSecondary: {
    ...MaterialTypography.bodyMedium,
    color: MaterialLightColors.onSurfaceVariant,
  },
  textDisabled: {
    ...MaterialTypography.bodyMedium,
    color: MaterialLightColors.neutral[400],
  },

  // App Bar - Light Theme
  appBar: {
    backgroundColor: MaterialLightColors.surface,
    elevation: 4,
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: MaterialSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: MaterialLightColors.outline,
  },

  // FAB - Light Theme
  fab: {
    position: 'absolute',
    right: MaterialSpacing.md,
    bottom: MaterialSpacing.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: MaterialLightColors.secondary[500],
    elevation: 6,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },

  // Text Field - Light Theme
  textField: {
    backgroundColor: MaterialLightColors.surface,
    borderRadius: MaterialShape.small,
    borderWidth: 1,
    borderColor: MaterialLightColors.outline,
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.sm,
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    color: MaterialLightColors.onSurface,
  },

  // Chips - Light Theme
  chip: {
    backgroundColor: MaterialLightColors.surfaceVariant,
    borderRadius: MaterialShape.full,
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.xs,
    marginRight: MaterialSpacing.sm,
    marginBottom: MaterialSpacing.sm,
    borderWidth: 1,
    borderColor: MaterialLightColors.outline,
  },
  chipActive: {
    backgroundColor: MaterialLightColors.primary[500],
    borderColor: MaterialLightColors.primary[500],
  },
  chipText: {
    ...MaterialTypography.labelMedium,
    color: MaterialLightColors.onSurfaceVariant,
  },
  chipTextActive: {
    color: MaterialLightColors.onPrimary,
  },

  // Elevation Adjustments for Light Theme
  elevation1: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 1,
  },
  elevation2: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  elevation3: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
});

// Light Theme Helper Functions
export const getLightThemeColors = () => MaterialLightColors;

export const getLightElevationStyle = (level: number) => {
  const elevations = {
    0: MaterialElevation.level0,
    1: MaterialLightStyles.elevation1,
    2: MaterialLightStyles.elevation2,
    3: MaterialLightStyles.elevation3,
  };
  return elevations[level as keyof typeof elevations] || MaterialLightStyles.elevation1;
};

// Light Theme Color Functions
export const getLightSurfaceColor = (elevation: number) => {
  // Material Design 3 surface elevation colors for light theme
  const surfaceColors = {
    0: MaterialLightColors.background,
    1: '#FFFFFF',
    2: '#FAFAFA',
    3: '#F5F5F5',
    4: '#F0F0F0',
    5: '#EBEBEB',
  };
  return surfaceColors[elevation] || MaterialLightColors.surface;
};

// Professional BMAD Light Theme
export const MaterialBMADLightTheme = {
  colors: MaterialLightColors,
  styles: MaterialLightStyles,
  getElevationStyle: getLightElevationStyle,
  getSurfaceColor: getLightSurfaceColor,

  // Business-specific light theme colors
  business: {
    primary: MaterialLightColors.primary[500],
    secondary: MaterialLightColors.secondary[500],
    success: MaterialLightColors.secondary[600],
    warning: MaterialLightColors.warning[500],
    error: MaterialLightColors.error[500],
    info: MaterialLightColors.primary[400],
  },

  // Data visualization colors for light theme
  dataVisualization: {
    primary: MaterialLightColors.primary[400],
    secondary: MaterialLightColors.secondary[400],
    tertiary: MaterialLightColors.warning[400],
    quaternary: MaterialLightColors.neutral[400],
    success: MaterialLightColors.secondary[500],
    error: MaterialLightColors.error[500],
    warning: MaterialLightColors.warning[500],
    info: MaterialLightColors.primary[300],
  },
};

export default MaterialBMADLightTheme;