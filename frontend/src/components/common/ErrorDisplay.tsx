// Reusable Error Display Component
// Provides consistent error presentation across the Real Estate CRM app

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { ErrorTemplate, getErrorSeverityColor, getErrorSeverityIcon } from '../../utils/errorMessages';

export interface ErrorDisplayProps {
  error: ErrorTemplate | string;
  onRetry?: () => void;
  onDismiss?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  showIcon?: boolean;
  showHelpText?: boolean;
  showActionButton?: boolean;
  compact?: boolean;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  style,
  textStyle,
  showIcon = true,
  showHelpText = true,
  showActionButton = true,
  compact = false,
}) => {
  // Handle both ErrorTemplate objects and plain strings
  const errorTemplate: ErrorTemplate = typeof error === 'string'
    ? {
        title: 'Error',
        message: error,
        severity: 'medium',
      }
    : error;

  const severityColor = getErrorSeverityColor(errorTemplate.severity);
  const severityIcon = getErrorSeverityIcon(errorTemplate.severity);

  const handleAction = () => {
    if (onRetry && errorTemplate.actionText?.toLowerCase().includes('retry')) {
      onRetry();
    } else if (onDismiss) {
      onDismiss();
    }
  };

  if (compact) {
    return (
      <View style={[styles.compactContainer, { borderLeftColor: severityColor }, style]}>
        <View style={styles.compactContent}>
          {showIcon && (
            <Text style={[styles.compactIcon, { color: severityColor }]}>
              {severityIcon}
            </Text>
          )}
          <Text style={[styles.compactMessage, textStyle]}>
            {errorTemplate.message}
          </Text>
          {showActionButton && (onRetry || onDismiss) && (
            <TouchableOpacity
              style={[styles.compactAction, { borderColor: severityColor }]}
              onPress={handleAction}
            >
              <Text style={[styles.compactActionText, { color: severityColor }]}>
                {errorTemplate.actionText || 'Dismiss'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { borderLeftColor: severityColor }, style]}>
      <View style={styles.header}>
        {showIcon && (
          <Text style={[styles.icon, { color: severityColor }]}>
            {severityIcon}
          </Text>
        )}
        <Text style={[styles.title, textStyle]}>
          {errorTemplate.title}
        </Text>
      </View>

      <Text style={[styles.message, textStyle]}>
        {errorTemplate.message}
      </Text>

      {showHelpText && errorTemplate.helpText && (
        <Text style={[styles.helpText, textStyle]}>
          {errorTemplate.helpText}
        </Text>
      )}

      {showActionButton && (onRetry || onDismiss) && (
        <View style={styles.actions}>
          {onRetry && errorTemplate.actionText && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: severityColor }]}
              onPress={onRetry}
            >
              <Text style={styles.actionButtonText}>
                {errorTemplate.actionText}
              </Text>
            </TouchableOpacity>
          )}
          {onDismiss && (
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={onDismiss}
            >
              <Text style={styles.dismissButtonText}>Dismiss</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  icon: {
    fontSize: 20,
    marginRight: 8,
  },

  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },

  message: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 8,
  },

  helpText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    fontStyle: 'italic',
    marginBottom: 12,
  },

  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },

  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },

  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  dismissButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 80,
    alignItems: 'center',
  },

  dismissButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },

  // Compact styles for inline usage
  compactContainer: {
    backgroundColor: '#fff',
    borderLeftWidth: 3,
    borderRadius: 6,
    padding: 12,
    marginVertical: 4,
  },

  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  compactIcon: {
    fontSize: 16,
    marginRight: 8,
  },

  compactMessage: {
    fontSize: 14,
    color: '#555',
    flex: 1,
    lineHeight: 18,
  },

  compactAction: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    marginLeft: 8,
  },

  compactActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default ErrorDisplay;