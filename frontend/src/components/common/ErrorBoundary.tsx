import React, { Component, ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>Something went wrong</Text>
              <Text style={styles.errorMessage}>
                {this.state.error?.message || 'An unexpected error occurred'}
              </Text>

              {__DEV__ && this.state.error && (
                <View style={styles.errorDetails}>
                  <Text style={styles.errorDetailsTitle}>Error Details:</Text>
                  <Text style={styles.errorStack}>
                    {this.state.error.stack}
                  </Text>
                </View>
              )}

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.retryButton]}
                  onPress={this.handleRetry}
                >
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.reportButton]}
                  onPress={() => {
                    // In a real app, this would send error report
                    console.log('Error report:', {
                      error: this.state.error,
                      errorInfo: this.state.errorInfo,
                      timestamp: new Date().toISOString(),
                    });
                  }}
                >
                  <Text style={styles.reportButtonText}>Report Issue</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  errorContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorDetails: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  errorDetailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  errorStack: {
    fontSize: 12,
    color: '#666666',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  reportButton: {
    backgroundColor: '#6c757d',
    borderWidth: 1,
    borderColor: '#6c757d',
  },
  reportButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

// Functional component wrapper for easier usage
interface ErrorBoundaryWrapperProps {
  error: Error;
  onRetry?: () => void;
  showDetails?: boolean;
}

export const ErrorBoundaryWrapper: React.FC<ErrorBoundaryWrapperProps> = ({
  error,
  onRetry,
  showDetails = __DEV__,
}) => {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>
        {error.message || 'An unexpected error occurred'}
      </Text>

      {showDetails && (
        <View style={styles.errorDetails}>
          <Text style={styles.errorDetailsTitle}>Error Details:</Text>
          <Text style={styles.errorStack}>
            {error.stack}
          </Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        {onRetry && (
          <TouchableOpacity
            style={[styles.button, styles.retryButton]}
            onPress={onRetry}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, styles.reportButton]}
          onPress={() => {
            console.log('Error report:', {
              error,
              timestamp: new Date().toISOString(),
            });
          }}
        >
          <Text style={styles.reportButtonText}>Report Issue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ErrorBoundary;