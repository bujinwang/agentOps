import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import {
  MaterialColors,
  MaterialSpacing,
  MaterialTypography,
  MaterialShape
} from '../styles/MaterialDesign';
import { ActionIcon } from './MaterialIcon';
import { useResponsive } from '../hooks/useResponsive';

interface MaterialTextFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  helperText?: string;
  error?: boolean;
  errorText?: string;
  disabled?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  required?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  style?: any;
}

const MaterialTextField: React.FC<MaterialTextFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  helperText,
  error = false,
  errorText,
  disabled = false,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoCorrect = false,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  required = false,
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const labelAnimation = useRef(new Animated.Value(value ? 1 : 0)).current;
  const borderAnimation = useRef(new Animated.Value(error ? 1 : 0)).current;

  // Responsive utilities
  const {
    deviceType,
    getResponsiveSpacing,
    getTouchTargetSize,
    getResponsiveFontSize,
  } = useResponsive();

  // Responsive dimensions
  const responsiveSpacing = getResponsiveSpacing(MaterialSpacing.sm);
  const responsiveLabelSize = getResponsiveFontSize(14); // labelMedium base
  const responsiveBodySize = getResponsiveFontSize(16); // bodyLarge base
  const responsiveHelperSize = getResponsiveFontSize(12); // bodySmall base
  const touchTargetSize = getTouchTargetSize(44); // Minimum touch target
  const iconSize = deviceType === 'desktop' ? 24 : deviceType === 'tablet' ? 22 : 20;

  React.useEffect(() => {
    Animated.timing(labelAnimation, {
      toValue: isFocused || value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value]);

  React.useEffect(() => {
    Animated.timing(borderAnimation, {
      toValue: error ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [error]);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const getBorderColor = () => {
    if (error) return MaterialColors.error[500];
    if (isFocused) return MaterialColors.primary[500];
    if (disabled) return MaterialColors.neutral[300];
    return MaterialColors.neutral[400];
  };

  const getLabelColor = () => {
    if (error) return MaterialColors.error[500];
    if (isFocused) return MaterialColors.primary[500];
    if (disabled) return MaterialColors.neutral[500];
    return MaterialColors.neutral[700];
  };

  const getBackgroundColor = () => {
    if (disabled) return MaterialColors.neutral[100];
    return MaterialColors.surface;
  };

  const labelStyle = {
    transform: [
      {
        translateY: labelAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [16, 0],
        }),
      },
      {
        scale: labelAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.85],
        }),
      },
    ] as any,
  };

  const borderStyle = {
    borderColor: borderAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [getBorderColor(), MaterialColors.error[500]],
    }),
  };

  return (
    <View style={[styles.container, { marginVertical: responsiveSpacing }, style]}>
      <View style={[
        styles.inputContainer,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          minHeight: touchTargetSize,
          paddingHorizontal: responsiveSpacing,
        },
        multiline && styles.multilineContainer,
      ]}>
        {/* Left Icon */}
        {leftIcon && (
          <View style={[styles.leftIconContainer, { top: responsiveSpacing }]}>
            <ActionIcon
              name={leftIcon}
              size={iconSize}
              color={getLabelColor()}
              state={error ? 'error' : disabled ? 'disabled' : 'default'}
            />
          </View>
        )}

        {/* Label */}
        <Animated.Text
          style={[
            styles.label,
            {
              color: getLabelColor(),
              fontSize: responsiveLabelSize,
            },
            labelStyle,
          ]}
        >
          {label}{required && ' *'}
        </Animated.Text>

        {/* Text Input */}
        <TextInput
          style={[
            styles.input,
            {
              color: disabled ? MaterialColors.neutral[500] : MaterialColors.neutral[900],
              fontSize: responsiveBodySize,
              paddingLeft: leftIcon ? responsiveSpacing * 2.5 : responsiveSpacing,
              paddingRight: rightIcon ? responsiveSpacing * 2.5 : responsiveSpacing,
              paddingVertical: responsiveSpacing,
              minHeight: touchTargetSize,
            },
            multiline && styles.multilineInput,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={isFocused ? placeholder : ''}
          placeholderTextColor={MaterialColors.neutral[500]}
          onFocus={handleFocus}
          onBlur={handleBlur}
          editable={!disabled}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
        />

        {/* Right Icon */}
        {rightIcon && (
          <TouchableOpacity
            style={[styles.rightIconContainer, {
              top: responsiveSpacing,
              minWidth: touchTargetSize,
              minHeight: touchTargetSize,
            }]}
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
          >
            <ActionIcon
              name={rightIcon}
              size={iconSize}
              color={getLabelColor()}
              state={error ? 'error' : disabled ? 'disabled' : onRightIconPress ? 'active' : 'default'}
              onPress={onRightIconPress}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Helper Text or Error Text */}
      {(helperText || (error && errorText)) && (
        <Text style={[
          styles.helperText,
          {
            color: error ? MaterialColors.error[500] : MaterialColors.neutral[600],
            fontSize: responsiveHelperSize,
            marginTop: responsiveSpacing * 0.5,
            marginLeft: responsiveSpacing * 0.5,
          }
        ]}>
          {error && errorText ? errorText : helperText}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // marginVertical is now applied responsively in the component
  },
  inputContainer: {
    position: 'relative',
    borderRadius: MaterialShape.small,
    borderWidth: 1,
    justifyContent: 'center',
    // minHeight, paddingHorizontal are now applied responsively
  },
  multilineContainer: {
    // minHeight, paddingTop are now applied responsively
  },
  label: {
    position: 'absolute',
    left: 0, // Will be overridden by responsive padding
    ...MaterialTypography.labelMedium,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  input: {
    ...MaterialTypography.bodyLarge,
    // All padding and sizing is now applied responsively
  },
  multilineInput: {
    textAlignVertical: 'top',
    // paddingTop, paddingBottom are now applied responsively
  },
  leftIconContainer: {
    position: 'absolute',
    left: 0, // Will be overridden by responsive positioning
    zIndex: 1,
  },
  rightIconContainer: {
    position: 'absolute',
    right: 0, // Will be overridden by responsive positioning
    zIndex: 1,
  },
  helperText: {
    ...MaterialTypography.bodySmall,
    // All margins and fontSize are now applied responsively
  },
});

export default MaterialTextField;