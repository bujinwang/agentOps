import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useResponsive } from '../hooks/useResponsive';
import { useTheme } from '../contexts/ThemeContext';
import { MaterialSpacing, MaterialTypography } from '../styles/MaterialDesign';

const LoadingScreen: React.FC = () => {
  const responsive = useResponsive();
  const { theme } = useTheme();

  const containerPadding = responsive.getResponsivePadding(MaterialSpacing.xl, {
    mobile: MaterialSpacing.lg,
  });

  return (
    <View
      style={[styles.container, {
        paddingHorizontal: containerPadding,
        backgroundColor: theme.colors.background,
      }]}
    >
      <ActivityIndicator size="large" color={theme.colors.primary[500]} />
      <Text
        style={[styles.text, {
          color: theme.colors.onBackground,
          fontSize: responsive.getResponsiveFontSize(16),
          marginTop: responsive.getResponsiveSpacing(MaterialSpacing.lg),
        }]}
      >
        Loading...
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    ...MaterialTypography.bodyLarge,
  },
});

export default LoadingScreen;
