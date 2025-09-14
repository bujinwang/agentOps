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
import { NavigationIcon } from './MaterialIcon';
import { useResponsive } from '../hooks/useResponsive';
import { useAccessibility } from '../hooks/useAccessibility';

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
  const {
    deviceType,
    getResponsiveFontSize,
    getResponsiveSpacing,
    getTouchTargetSize,
    isLandscape,
  } = useResponsive();

  const {
    screenReaderEnabled,
    generateAccessibilityLabel,
    generateAccessibilityHint,
    announceNavigation,
  } = useAccessibility();

  // Responsive dimensions
  const appBarHeight = deviceType === 'desktop' ? 64 : deviceType === 'tablet' ? 60 : 56;
  const contentHeight = deviceType === 'desktop' ? 56 : deviceType === 'tablet' ? 52 : 48;
  const touchTargetSize = getTouchTargetSize();
  const responsiveSpacing = getResponsiveSpacing(MaterialSpacing.md);
  const responsiveTitleSize = getResponsiveFontSize(22); // titleLarge base
  const responsiveSubtitleSize = getResponsiveFontSize(14); // bodySmall base

  // Adjust for landscape orientation
  const adjustedAppBarHeight = isLandscape && deviceType === 'mobile' ? appBarHeight - 8 : appBarHeight;
  const adjustedContentHeight = isLandscape && deviceType === 'mobile' ? contentHeight - 8 : contentHeight;
  const renderLeading = () => {
    if (leading) {
      return leading;
    }

    if (onBack) {
      const backLabel = generateAccessibilityLabel('Back', 'button');
      const backHint = generateAccessibilityHint('Go back', 'previous screen');

      return (
        <TouchableOpacity
          style={[styles.backButton, {
            width: touchTargetSize,
            height: touchTargetSize,
            borderRadius: touchTargetSize / 2,
          }]}
          onPress={() => {
            onBack();
            if (screenReaderEnabled) {
              announceNavigation('Going back');
            }
          }}
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          accessibilityHint={backHint}
          accessible={true}
        >
          <NavigationIcon
            name="arrow_back"
            size={deviceType === 'desktop' ? 28 : deviceType === 'tablet' ? 26 : 24}
            color={MaterialColors.onPrimary}
            state="active"
          />
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
        style={[styles.title, {
          color: MaterialColors.onPrimary,
          fontSize: responsiveTitleSize,
        }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {title}
      </Text>
      {subtitle && (
        <Text
          style={[styles.subtitle, {
            color: MaterialColors.onPrimary,
            fontSize: responsiveSubtitleSize,
          }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {subtitle}
        </Text>
      )}
    </View>
  );

  const appBarLabel = generateAccessibilityLabel(title, subtitle ? 'app bar' : undefined);
  const appBarHint = generateAccessibilityHint('Navigate', 'app functions');

  return (
    <View
      style={[styles.container, {
        backgroundColor,
        elevation,
        minHeight: adjustedAppBarHeight + (Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0),
      }]}
      accessibilityRole="toolbar"
      accessibilityLabel={appBarLabel}
      accessibilityHint={appBarHint}
      accessible={true}
    >
      <StatusBar
        backgroundColor={backgroundColor}
        barStyle="light-content"
      />
      <View style={[styles.content, {
        height: adjustedContentHeight,
        paddingHorizontal: responsiveSpacing,
      }]}>
        {renderLeading()}
        {renderTitle()}
        {renderActions()}
      </View>
    </View>
  );
};

// Note: Styles are now handled responsively in the component
// This maintains backward compatibility for any external usage
const styles = StyleSheet.create({
  container: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: MaterialSpacing.sm,
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