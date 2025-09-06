import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { 
  MaterialColors, 
  MaterialSpacing, 
  MaterialTypography 
} from '../styles/MaterialDesign';

interface MaterialAppBarProps {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  actions?: React.ReactNode[];
  backgroundColor?: string;
  elevation?: number;
  onBack?: () => void;
  centerTitle?: boolean;
}

const MaterialAppBar: React.FC<MaterialAppBarProps> = ({
  title,
  subtitle,
  leading,
  actions = [],
  backgroundColor = MaterialColors.primary[500],
  elevation = 4,
  onBack,
  centerTitle = false,
}) => {
  const renderLeading = () => {
    if (leading) {
      return leading;
    }

    if (onBack) {
      return (
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={[styles.backIcon, { color: MaterialColors.onPrimary }]}>←</Text>
        </TouchableOpacity>
      );
    }

    return null;
  };

  const renderActions = () => {
    if (actions.length === 0) return null;

    return (
      <View style={styles.actionsContainer}>
        {actions.map((action, index) => (
          <View key={index} style={styles.actionItem}>
            {action}
          </View>
        ))}
      </View>
    );
  };

  const renderTitle = () => (
    <View style={[styles.titleContainer, centerTitle && styles.centeredTitle]}>
      <Text 
        style={[styles.title, { color: MaterialColors.onPrimary }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {title}
      </Text>
      {subtitle && (
        <Text 
          style={[styles.subtitle, { color: MaterialColors.onPrimary }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {subtitle}
        </Text>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor, elevation }]}>
      <StatusBar
        backgroundColor={backgroundColor}
        barStyle="light-content"
      />
      <View style={styles.content}>
        {renderLeading()}
        {renderTitle()}
        {renderActions()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0,
    minHeight: 56 + (Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: MaterialSpacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: MaterialSpacing.sm,
    borderRadius: 20,
  },
  backIcon: {
    fontSize: 24,
    fontWeight: '600',
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: MaterialSpacing.sm,
  },
  centeredTitle: {
    alignItems: 'center',
  },
  title: {
    ...MaterialTypography.titleLarge,
    fontWeight: '500',
  },
  subtitle: {
    ...MaterialTypography.bodySmall,
    opacity: 0.8,
    marginTop: 2,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: MaterialSpacing.sm,
  },
  actionItem: {
    marginLeft: MaterialSpacing.sm,
  },
});

export default MaterialAppBar;