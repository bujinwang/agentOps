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
    ],
  };

  const borderStyle = {
    borderColor: borderAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [getBorderColor(), MaterialColors.error[500]],
    }),
  };

  return (
    <View style={[styles.container, style]}>
      <View style={[
        styles.inputContainer,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
        },
        multiline && styles.multilineContainer,
      ]}>
        {/* Left Icon */}
        {leftIcon && (
          <View style={styles.leftIconContainer}>
            <Text style={[styles.leftIcon, { color: getLabelColor() }]}>{leftIcon}</Text>
          </View>
        )}

        {/* Label */}
        <Animated.Text
          style={[
            styles.label,
            {
              color: getLabelColor(),
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
              paddingLeft: leftIcon ? 40 : 16,
              paddingRight: rightIcon ? 40 : 16,
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
            style={styles.rightIconContainer}
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
          >
            <Text style={[styles.rightIcon, { color: getLabelColor() }]}>{rightIcon}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Helper Text or Error Text */}
      {(helperText || (error && errorText)) && (
        <Text style={[
          styles.helperText,
          { color: error ? MaterialColors.error[500] : MaterialColors.neutral[600] }
        ]}>
          {error && errorText ? errorText : helperText}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: MaterialSpacing.sm,
  },
  inputContainer: {
    position: 'relative',
    borderRadius: MaterialShape.small,
    borderWidth: 1,
    minHeight: 56,
    justifyContent: 'center',
  },
  multilineContainer: {
    minHeight: 80,
    paddingTop: 12,
  },
  label: {
    position: 'absolute',
    left: 16,
    ...MaterialTypography.labelMedium,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  input: {
    ...MaterialTypography.bodyLarge,
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 56,
  },
  multilineInput: {
    paddingTop: 20,
    paddingBottom: 16,
    textAlignVertical: 'top',
  },
  leftIconContainer: {
    position: 'absolute',
    left: 12,
    top: 16,
    zIndex: 1,
  },
  leftIcon: {
    fontSize: 20,
  },
  rightIconContainer: {
    position: 'absolute',
    right: 12,
    top: 16,
    zIndex: 1,
  },
  rightIcon: {
    fontSize: 20,
  },
  helperText: {
    ...MaterialTypography.bodySmall,
    marginTop: MaterialSpacing.xs,
    marginLeft: MaterialSpacing.xs,
  },
});

export default MaterialTextField;