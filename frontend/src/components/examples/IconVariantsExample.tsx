import React, { useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import {
  MaterialIcon,
  NavigationIcon,
  ActionIcon,
  StatusIcon,
  IconButton,
  createThemedIconSet,
} from '../MaterialIcon';
import { MaterialColors, MaterialSpacing } from '../../styles/MaterialDesign';

const IconVariantsExample: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isLoading, setIsLoading] = useState(false);
  
  const ThemedIcons = createThemedIconSet(theme);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Icon State Variants</Text>
      
      {/* State Examples */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>States</Text>
        <View style={styles.iconRow}>
          <ActionIcon name="favorite" state="default" />
          <ActionIcon name="favorite" state="active" />
          <ActionIcon name="favorite" state="inactive" />
          <ActionIcon name="favorite" state="disabled" />
        </View>
      </View>

      {/* Animated Examples */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Animated States</Text>
        <View style={styles.iconRow}>
          <StatusIcon 
            name="sync" 
            state={isLoading ? 'loading' : 'default'} 
            animated 
          />
          <ActionIcon 
            name="favorite" 
            state="active" 
            animated 
            animationPreset="bounce" 
          />
          <NavigationIcon 
            name="home" 
            state="active" 
            animated 
            animationPreset="emphasized" 
          />
        </View>
      </View>

      {/* Context-Aware Examples */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Context-Aware</Text>
        <View style={styles.iconRow}>
          <NavigationIcon name="home" state="active" />
          <ActionIcon name="add" state="default" />
          <StatusIcon name="check" />
          <StatusIcon name="error" />
        </View>
      </View>

      {/* Theme Examples */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Themed Icons</Text>
        <View style={styles.iconRow}>
          <ThemedIcons.NavigationIcon name="home" state="active" />
          <ThemedIcons.ActionIcon name="settings" state="default" />
          <ThemedIcons.StatusIcon name="info" />
        </View>
      </View>

      {/* Interactive Examples */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Interactive</Text>
        <View style={styles.iconRow}>
          <IconButton 
            name="play_arrow" 
            onPress={() => setIsLoading(!isLoading)}
            animated
          />
          <IconButton 
            name="pause" 
            onPress={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            animated
          />
          <IconButton 
            name="stop" 
            onPress={() => {}}
            disabled
            animated
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: MaterialSpacing.md,
    backgroundColor: MaterialColors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: MaterialSpacing.lg,
    color: MaterialColors.neutral[900],
  },
  section: {
    marginBottom: MaterialSpacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: MaterialSpacing.sm,
    color: MaterialColors.neutral[700],
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MaterialSpacing.md,
  },
});

export default IconVariantsExample;