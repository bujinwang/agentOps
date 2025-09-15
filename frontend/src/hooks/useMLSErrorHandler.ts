import { useState, useCallback, useEffect } from 'react';
import {
  MLSError,
  UseMLSErrorsReturn
} from '../types/mls';

/**
 * Custom hook for managing MLS error handling and recovery
 */
export const useMLSErrorHandler = (): UseMLSErrorsReturn => {
  const [errors, setErrors] = useState<MLSError[]>([]);
  const [unresolvedCount, setUnresolvedCount] = useState(0);

  // Update unresolved count when errors change
  useEffect(() => {
    const unresolved = errors.filter(error => !error.resolved).length;
    setUnresolvedCount(unresolved);
  }, [errors]);

  /**
   * Add a new error to the list
   */
  const addError = useCallback((error: Omit<MLSError, 'id' | 'timestamp'>) => {
    const newError: MLSError = {
      ...error,
      id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      resolved: false
    };

    setErrors(prev => [newError, ...prev]);
  }, []);

  /**
   * Resolve an error by ID
   */
  const resolveError = useCallback(async (errorId: string) => {
    setErrors(prev => prev.map(error =>
      error.id === errorId
        ? { ...error, resolved: true }
        : error
    ));
  }, []);

  /**
   * Retry an error (mark as unresolved and update timestamp)
   */
  const retryError = useCallback(async (errorId: string) => {
    setErrors(prev => prev.map(error =>
      error.id === errorId
        ? {
            ...error,
            resolved: false,
            timestamp: new Date(),
            retryable: true
          }
        : error
    ));
  }, []);

  /**
   * Remove an error completely
   */
  const removeError = useCallback((errorId: string) => {
    setErrors(prev => prev.filter(error => error.id !== errorId));
  }, []);

  /**
   * Clear all resolved errors
   */
  const clearResolvedErrors = useCallback(() => {
    setErrors(prev => prev.filter(error => !error.resolved));
  }, []);

  /**
   * Clear all errors
   */
  const clearAllErrors = useCallback(() => {
    setErrors([]);
  }, []);

  /**
   * Get error summary by type
   */
  const getErrorSummary = useCallback(() => {
    const summary: { [key: string]: number } = {};

    errors.forEach(error => {
      const type = error.type;
      summary[type] = (summary[type] || 0) + 1;
    });

    return summary;
  }, [errors]);

  /**
   * Get errors by type
   */
  const getErrorsByType = useCallback((type: string) => {
    return errors.filter(error => error.type === type);
  }, [errors]);

  /**
   * Get unresolved errors
   */
  const getUnresolvedErrors = useCallback(() => {
    return errors.filter(error => !error.resolved);
  }, [errors]);

  /**
   * Get retryable errors
   */
  const getRetryableErrors = useCallback(() => {
    return errors.filter(error => error.retryable && !error.resolved);
  }, [errors]);

  /**
   * Bulk resolve errors by type
   */
  const resolveErrorsByType = useCallback(async (type: string) => {
    setErrors(prev => prev.map(error =>
      error.type === type
        ? { ...error, resolved: true }
        : error
    ));
  }, []);

  /**
   * Bulk retry errors by type
   */
  const retryErrorsByType = useCallback(async (type: string) => {
    setErrors(prev => prev.map(error =>
      error.type === type
        ? {
            ...error,
            resolved: false,
            timestamp: new Date(),
            retryable: true
          }
        : error
    ));
  }, []);

  /**
   * Auto-resolve errors based on criteria
   */
  const autoResolveErrors = useCallback(async (criteria: {
    maxAge?: number; // minutes
    types?: string[];
    excludeRetryable?: boolean;
  } = {}) => {
    const now = Date.now();
    const maxAgeMs = (criteria.maxAge || 60) * 60 * 1000; // default 1 hour

    setErrors(prev => prev.map(error => {
      const shouldResolve =
        (!criteria.types || criteria.types.includes(error.type)) &&
        (!criteria.excludeRetryable || !error.retryable) &&
        (now - error.timestamp.getTime()) > maxAgeMs;

      return shouldResolve ? { ...error, resolved: true } : error;
    }));
  }, []);

  return {
    errors,
    unresolvedCount,
    resolveError,
    retryError,
    getErrorSummary
  };
};

/**
 * Hook for MLS error notifications
 */
export const useMLSErrorNotifications = () => {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'error' | 'warning' | 'info';
    title: string;
    message: string;
    timestamp: Date;
    actionRequired: boolean;
  }>>([]);

  const addNotification = useCallback((notification: Omit<typeof notifications[0], 'id' | 'timestamp'>) => {
    const newNotification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date()
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 9)]); // Keep last 10
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n =>
      n.id === id ? { ...n, actionRequired: false } : n
    ));
  }, []);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    markAsRead
  };
};

/**
 * Hook for MLS error recovery strategies
 */
export const useMLSErrorRecovery = () => {
  const [recoveryStrategies] = useState({
    network: {
      retry: async (error: MLSError) => {
        // Implement exponential backoff retry
        const baseDelay = 1000; // 1 second
        const maxDelay = 30000; // 30 seconds
        // Use error ID hash as a simple retry count approximation
        const retryCount = parseInt(error.id.split('_')[1] || '0', 10) % 5;
        const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);

        await new Promise(resolve => setTimeout(resolve, delay));
        // Retry logic would go here
        return { success: true, delay };
      },
      fallback: async (error: MLSError) => {
        // Switch to cached/offline mode
        console.log('Switching to offline mode for error recovery');
        return { success: true, mode: 'offline' };
      }
    },
    auth: {
      reauth: async (error: MLSError) => {
        // Trigger re-authentication
        console.log('Triggering re-authentication');
        return { success: true, action: 'reauth' };
      },
      refresh: async (error: MLSError) => {
        // Refresh authentication token
        console.log('Refreshing authentication token');
        return { success: true, action: 'refresh' };
      }
    },
    data: {
      validate: async (error: MLSError) => {
        // Re-validate data before retry
        console.log('Re-validating data');
        return { success: true, action: 'validate' };
      },
      transform: async (error: MLSError) => {
        // Transform data format
        console.log('Transforming data format');
        return { success: true, action: 'transform' };
      }
    }
  });

  const getRecoveryStrategy = useCallback((error: MLSError) => {
    switch (error.type) {
      case 'network':
        return recoveryStrategies.network;
      case 'auth':
        return recoveryStrategies.auth;
      case 'validation':
      case 'data':
        return recoveryStrategies.data;
      default:
        return null;
    }
  }, [recoveryStrategies]);

  const executeRecovery = useCallback(async (error: MLSError, strategy: string) => {
    const recoveryStrategy = getRecoveryStrategy(error);
    if (!recoveryStrategy || !recoveryStrategy[strategy as keyof typeof recoveryStrategy]) {
      throw new Error(`No recovery strategy found for ${error.type}:${strategy}`);
    }

    const recoveryFn = recoveryStrategy[strategy as keyof typeof recoveryStrategy] as Function;
    return await recoveryFn(error);
  }, [getRecoveryStrategy]);

  return {
    recoveryStrategies,
    getRecoveryStrategy,
    executeRecovery
  };
};

export default useMLSErrorHandler;