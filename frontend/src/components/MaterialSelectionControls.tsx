import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Switch,
} from 'react-native';
import { 
  MaterialColors, 
  MaterialSpacing, 
  MaterialTypography,
  MaterialShape 
} from '../styles/MaterialDesign';

interface MaterialCheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  error?: boolean;
}

interface MaterialRadioButtonProps {
  label: string;
  selected: boolean;
  onChange: () => void;
  disabled?: boolean;
}

interface MaterialSwitchProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

// Material Design Checkbox
const MaterialCheckbox: React.FC<MaterialCheckboxProps> = ({
  label,
  checked,
  onChange,
  disabled = false,
  error = false,
}) => {
  const scaleValue = new Animated.Value(checked ? 1 : 0);

  React.useEffect(() => {
    Animated.spring(scaleValue, {
      toValue: checked ? 1 : 0,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [checked]);

  const handlePress = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const getBorderColor = () => {
    if (error) return MaterialColors.error[500];
    if (checked) return MaterialColors.primary[500];
    if (disabled) return MaterialColors.neutral[400];
    return MaterialColors.neutral[600];
  };

  const getBackgroundColor = () => {
    if (checked) return MaterialColors.primary[500];
    return 'transparent';
  };

  return (
    <TouchableOpacity
      style={styles.checkboxContainer}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[
          styles.checkbox,
          {
            borderColor: getBorderColor(),
            backgroundColor: getBackgroundColor(),
          },
          disabled && styles.disabledCheckbox,
        ]}
      >
        <Animated.Text
          style={[
            styles.checkmark,
            {
              transform: [{ scale: scaleValue }],
              color: MaterialColors.onPrimary,
            },
          ]}
        >
          ✓
        </Animated.Text>
      </Animated.View>

      <Text style={[
        styles.checkboxLabel,
        { color: disabled ? MaterialColors.neutral[500] : MaterialColors.neutral[900] }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

// Material Design Radio Button
const MaterialRadioButton: React.FC<MaterialRadioButtonProps> = ({
  label,
  selected,
  onChange,
  disabled = false,
}) => {
  const scaleValue = new Animated.Value(selected ? 1 : 0);

  React.useEffect(() => {
    Animated.spring(scaleValue, {
      toValue: selected ? 1 : 0,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [selected]);

  const handlePress = () => {
    if (!disabled) {
      onChange();
    }
  };

  return (
    <TouchableOpacity
      style={styles.radioContainer}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <View style={[
        styles.radioOuter,
        { borderColor: selected ? MaterialColors.primary[500] : MaterialColors.neutral[600] },
        disabled && styles.disabledRadio,
      ]}>
        <Animated.View
          style={[
            styles.radioInner,
            {
              transform: [{ scale: scaleValue }],
              backgroundColor: MaterialColors.primary[500],
            },
          ]}
        />
      </View>

      <Text style={[
        styles.radioLabel,
        { color: disabled ? MaterialColors.neutral[500] : MaterialColors.neutral[900] }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

// Material Design Switch
const MaterialSwitch: React.FC<MaterialSwitchProps> = ({
  label,
  value,
  onChange,
  disabled = false,
}) => {
  const translateX = new Animated.Value(value ? 20 : 0);
  const backgroundColor = new Animated.Value(value ? 1 : 0);

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: value ? 20 : 0,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(backgroundColor, {
        toValue: value ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [value]);

  const handlePress = () => {
    if (!disabled) {
      onChange(!value);
    }
  };

  const backgroundColorInterpolate = backgroundColor.interpolate({
    inputRange: [0, 1],
    outputRange: [MaterialColors.neutral[400], MaterialColors.primary[500]],
  });

  return (
    <TouchableOpacity
      style={styles.switchContainer}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={[
        styles.switchLabel,
        { color: disabled ? MaterialColors.neutral[500] : MaterialColors.neutral[900] }
      ]}>
        {label}
      </Text>

      <View style={[
        styles.switchTrack,
        { backgroundColor: backgroundColorInterpolate },
        disabled && styles.disabledSwitchTrack,
      ]}>
        <Animated.View
          style={[
            styles.switchThumb,
            {
              transform: [{ translateX }],
              backgroundColor: MaterialColors.surface,
            },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Checkbox Styles
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: MaterialSpacing.xs,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: MaterialSpacing.sm,
  },
  disabledCheckbox: {
    opacity: 0.6,
  },
  checkmark: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    ...MaterialTypography.bodyMedium,
    flex: 1,
  },

  // Radio Button Styles
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: MaterialSpacing.xs,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: MaterialSpacing.sm,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  disabledRadio: {
    opacity: 0.6,
  },
  radioLabel: {
    ...MaterialTypography.bodyMedium,
    flex: 1,
  },

  // Switch Styles
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: MaterialSpacing.xs,
    paddingVertical: MaterialSpacing.sm,
  },
  switchLabel: {
    ...MaterialTypography.bodyLarge,
    flex: 1,
    marginRight: MaterialSpacing.md,
  },
  switchTrack: {
    width: 50,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  disabledSwitchTrack: {
    opacity: 0.6,
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    ...MaterialElevation.level2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});

// Export individual components and a combined selection controls component
const MaterialSelectionControls = {
  Checkbox: MaterialCheckbox,
  RadioButton: MaterialRadioButton,
  Switch: MaterialSwitch,
};

export { MaterialCheckbox, MaterialRadioButton, MaterialSwitch };
export default MaterialSelectionControls;