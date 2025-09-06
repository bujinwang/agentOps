import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  DatePickerIOS,
  DatePickerAndroid,
  TimePickerAndroid,
} from 'react-native';
import { 
  MaterialColors, 
  MaterialSpacing, 
  MaterialTypography,
  MaterialShape 
} from '../styles/MaterialDesign';

interface MaterialDatePickerProps {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  mode?: 'date' | 'time' | 'datetime';
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  format?: string;
}

const MaterialDatePicker: React.FC<MaterialDatePickerProps> = ({
  label,
  value,
  onChange,
  mode = 'date',
  minimumDate,
  maximumDate,
  disabled = false,
  error = false,
  helperText,
  format = 'MM/DD/YYYY',
}) => {
  const [showPicker, setShowPicker] = useState(false);

  const formatDate = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: mode === 'datetime' ? '2-digit' : undefined,
      minute: mode === 'datetime' ? '2-digit' : undefined,
      hour12: true,
    };

    if (mode === 'time') {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }

    return date.toLocaleDateString('en-US', options);
  };

  const handlePress = async () => {
    if (disabled) return;

    try {
      let newDate = value;

      if (Platform.OS === 'ios') {
        setShowPicker(true);
        return;
      }

      if (mode === 'date') {
        const { action, year, month, day } = await DatePickerAndroid.open({
          date: value,
          minDate: minimumDate,
          maxDate: maximumDate,
        });

        if (action !== DatePickerAndroid.dismissedAction) {
          newDate = new Date(year, month, day);
        }
      } else if (mode === 'time') {
        const { action, hour, minute } = await TimePickerAndroid.open({
          hour: value.getHours(),
          minute: value.getMinutes(),
          is24Hour: false,
        });

        if (action !== TimePickerAndroid.dismissedAction) {
          newDate = new Date(value);
          newDate.setHours(hour, minute);
        }
      } else if (mode === 'datetime') {
        // Handle datetime for Android
        const { action: dateAction, year, month, day } = await DatePickerAndroid.open({
          date: value,
          minDate: minimumDate,
          maxDate: maximumDate,
        });

        if (dateAction !== DatePickerAndroid.dismissedAction) {
          const { action: timeAction, hour, minute } = await TimePickerAndroid.open({
            hour: value.getHours(),
            minute: value.getMinutes(),
            is24Hour: false,
          });

          if (timeAction !== TimePickerAndroid.dismissedAction) {
            newDate = new Date(year, month, day, hour, minute);
          }
        }
      }

      if (newDate !== value) {
        onChange(newDate);
      }
    } catch (error) {
      console.error('Error opening date picker:', error);
    }
  };

  const handleIOSDateChange = (selectedDate: Date) => {
    setShowPicker(false);
    onChange(selectedDate);
  };

  const getBorderColor = () => {
    if (error) return MaterialColors.error[500];
    if (disabled) return MaterialColors.neutral[300];
    return MaterialColors.neutral[400];
  };

  const getLabelColor = () => {
    if (error) return MaterialColors.error[500];
    if (disabled) return MaterialColors.neutral[500];
    return MaterialColors.neutral[700];
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.inputContainer,
          { borderColor: getBorderColor() },
          disabled && styles.disabledContainer,
        ]}
        onPress={handlePress}
        disabled={disabled}
      >
        <View style={styles.labelContainer}>
          <Text style={[styles.label, { color: getLabelColor() }]}>
            {label}
          </Text>
          {error && (
            <Text style={[styles.errorIcon, { color: MaterialColors.error[500] }]}>
              ⚠️
            </Text>
          )}
        </View>

        <View style={styles.valueContainer}>
          <Text 
            style={[
              styles.value,
              { 
                color: disabled ? MaterialColors.neutral[500] : MaterialColors.neutral[900],
              }
            ]}
            numberOfLines={1}
          >
            {formatDate(value)}
          </Text>
          <Text style={[styles.dropdownIcon, { color: getLabelColor() }]}>
            {mode === 'time' ? '🕐' : '📅'}
          </Text>
        </View>
      </TouchableOpacity>

      {(helperText || (error && helperText)) && (
        <Text style={[
          styles.helperText,
          { color: error ? MaterialColors.error[500] : MaterialColors.neutral[600] }
        ]}>
          {error && helperText ? helperText : helperText}
        </Text>
      )}

      {showPicker && Platform.OS === 'ios' && (
        <View style={styles.pickerContainer}>
          {mode === 'date' && (
            <DatePickerIOS
              date={value}
              onDateChange={handleIOSDateChange}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              mode="date"
            />
          )}
          {mode === 'time' && (
            <DatePickerIOS
              date={value}
              onDateChange={handleIOSDateChange}
              mode="time"
            />
          )}
          {mode === 'datetime' && (
            <DatePickerIOS
              date={value}
              onDateChange={handleIOSDateChange}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              mode="datetime"
            />
          )}
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => setShowPicker(false)}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: MaterialSpacing.sm,
  },
  inputContainer: {
    flexDirection: 'column',
    backgroundColor: MaterialColors.surface,
    borderRadius: MaterialShape.small,
    borderWidth: 1,
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.sm,
    minHeight: 56,
    justifyContent: 'center',
  },
  disabledContainer: {
    backgroundColor: MaterialColors.neutral[100],
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: MaterialSpacing.xs,
  },
  label: {
    ...MaterialTypography.labelMedium,
    flex: 1,
  },
  errorIcon: {
    fontSize: 16,
    marginLeft: MaterialSpacing.xs,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: {
    ...MaterialTypography.bodyLarge,
    flex: 1,
  },
  dropdownIcon: {
    fontSize: 18,
    marginLeft: MaterialSpacing.sm,
  },
  helperText: {
    ...MaterialTypography.bodySmall,
    marginTop: MaterialSpacing.xs,
    marginLeft: MaterialSpacing.xs,
  },
  pickerContainer: {
    backgroundColor: MaterialColors.surface,
    borderRadius: MaterialShape.medium,
    marginTop: MaterialSpacing.xs,
    ...MaterialElevation.level2,
  },
  doneButton: {
    backgroundColor: MaterialColors.primary[500],
    paddingVertical: MaterialSpacing.md,
    alignItems: 'center',
  },
  doneButtonText: {
    ...MaterialTypography.labelLarge,
    color: MaterialColors.onPrimary,
    fontWeight: '600',
  },
});

export default MaterialDatePicker;