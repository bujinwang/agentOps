import { useState, useCallback, useRef, useEffect } from 'react';

// Types for loading state management
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  progress?: number;
  message?: string;
}

export interface LoadingOptions {
  showProgress?: boolean;
  timeout?: number;
  retryCount?: number;
  onTimeout?: () => void;
  onRetry?: () => void;
}

// Hook for managing loading state
export const useLoadingState = (initialState: Partial<LoadingState> = {}) => {
  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    error: null,
    progress: undefined,
    message: undefined,
    ...initialState,
  });

  const timeoutRef = useRef<NodeJS.Timeout>();
  const retryCountRef = useRef(0);

  const startLoading = useCallback((message?: string, options: LoadingOptions = {}) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      message,
      progress: options.showProgress ? 0 : undefined,
    }));

    // Set timeout if specified
    if (options.timeout) {
      timeoutRef.current = setTimeout(() => {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Operation timed out',
        }));
        options.onTimeout?.();
      }, options.timeout);
    }
  }, []);

  const updateProgress = useCallback((progress: number, message?: string) => {
    setState(prev => ({
      ...prev,
      progress,
      message: message || prev.message,
    }));
  }, []);

  const stopLoading = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setState(prev => ({
      ...prev,
      isLoading: false,
      progress: undefined,
    }));

    retryCountRef.current = 0;
  }, []);

  const setError = useCallback((error: string, options: LoadingOptions = {}) => {
    setState(prev => ({
      ...prev,
      isLoading: false,
      error,
      progress: undefined,
    }));

    // Handle retry logic
    if (options.retryCount && retryCountRef.current < options.retryCount) {
      retryCountRef.current += 1;
      options.onRetry?.();
    }
  }, []);

  const retry = useCallback((message?: string) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      message,
    }));
  }, []);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setState({
      isLoading: false,
      error: null,
      progress: undefined,
      message: undefined,
    });

    retryCountRef.current = 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    startLoading,
    updateProgress,
    stopLoading,
    setError,
    retry,
    reset,
  };
};

// Hook for managing multiple loading states
export const useMultiLoadingState = () => {
  const [loadingStates, setLoadingStates] = useState<Record<string, LoadingState>>({});
  const timeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});
  const retryCountsRef = useRef<Record<string, number>>({});

  const clearTimeoutForKey = useCallback((key: string) => {
    const timeout = timeoutsRef.current[key];
    if (timeout) {
      clearTimeout(timeout);
      delete timeoutsRef.current[key];
    }
  }, []);

  const updateState = useCallback((
    key: string,
    updater: Partial<LoadingState> | ((current: LoadingState) => LoadingState)
  ) => {
    setLoadingStates(prev => {
      const current = prev[key] ?? { isLoading: false, error: null };
      const nextState = typeof updater === 'function'
        ? (updater as (current: LoadingState) => LoadingState)(current)
        : { ...current, ...updater };

      return {
        ...prev,
        [key]: nextState,
      };
    });
  }, []);

  const startLoading = useCallback((key: string, message?: string, options: LoadingOptions = {}) => {
    clearTimeoutForKey(key);
    retryCountsRef.current[key] = 0;

    updateState(key, {
      isLoading: true,
      error: null,
      message,
      progress: options.showProgress ? 0 : undefined,
    });

    if (options.timeout) {
      timeoutsRef.current[key] = setTimeout(() => {
        updateState(key, {
          isLoading: false,
          error: 'Operation timed out',
        });
        options.onTimeout?.();
      }, options.timeout);
    }
  }, [clearTimeoutForKey, updateState]);

  const updateProgress = useCallback((key: string, progress: number, message?: string) => {
    updateState(key, current => ({
      ...current,
      progress,
      message: message ?? current.message,
    }));
  }, [updateState]);

  const stopLoading = useCallback((key: string) => {
    clearTimeoutForKey(key);
    updateState(key, {
      isLoading: false,
      progress: undefined,
      message: undefined,
    });
  }, [clearTimeoutForKey, updateState]);

  const setError = useCallback((key: string, error: string, options: LoadingOptions = {}) => {
    clearTimeoutForKey(key);
    updateState(key, {
      isLoading: false,
      error,
      progress: undefined,
    });

    if (options.retryCount && retryCountsRef.current[key] < options.retryCount) {
      retryCountsRef.current[key] += 1;
      options.onRetry?.();
    }
  }, [clearTimeoutForKey, updateState]);

  const retry = useCallback((key: string, message?: string) => {
    updateState(key, {
      isLoading: true,
      error: null,
      message,
    });
  }, [updateState]);

  const reset = useCallback((key: string) => {
    clearTimeoutForKey(key);
    setLoadingStates(prev => {
      const { [key]: _removed, ...rest } = prev;
      return rest;
    });
    delete retryCountsRef.current[key];
  }, [clearTimeoutForKey]);

  const getLoadingState = useCallback((key: string): LoadingState => {
    return loadingStates[key] ?? { isLoading: false, error: null };
  }, [loadingStates]);

  const isAnyLoading = useCallback(() => {
    return Object.values(loadingStates).some(state => state.isLoading);
  }, [loadingStates]);

  const getAllErrors = useCallback(() => {
    return Object.entries(loadingStates)
      .filter(([, state]) => Boolean(state.error))
      .map(([key, state]) => ({ key, error: state.error! }));
  }, [loadingStates]);

  useEffect(() => {
    return () => {
      Object.values(timeoutsRef.current).forEach(timeout => clearTimeout(timeout));
      timeoutsRef.current = {};
      retryCountsRef.current = {};
    };
  }, []);

  return {
    loadingStates,
    startLoading,
    updateProgress,
    stopLoading,
    setError,
    retry,
    reset,
    getLoadingState,
    isAnyLoading,
    getAllErrors,
  };
};

// Utility functions for async operations with loading
export const withLoading = async <T>(
  operation: () => Promise<T>,
  loadingState: ReturnType<typeof useLoadingState>,
  options: LoadingOptions & { successMessage?: string; errorMessage?: string } = {}
): Promise<T | null> => {
  try {
    loadingState.startLoading(options.successMessage || 'Loading...', options);

    const result = await operation();

    loadingState.stopLoading();

    if (options.successMessage) {
      // Could integrate with a toast/snackbar system here
      console.log('Success:', options.successMessage);
    }

    return result;
  } catch (error) {
    const errorMessage = options.errorMessage || (error as Error).message;
    loadingState.setError(errorMessage, options);
    return null;
  }
};

// Debounced loading state for search/filter operations
export const useDebouncedLoading = (delay: number = 300) => {
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const startLoading = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsLoading(true);
    }, delay);
  }, [delay]);

  const stopLoading = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { isLoading, startLoading, stopLoading };
};

// Loading state for sequential operations
export const useSequentialLoading = () => {
  const [currentStep, setCurrentStep] = useState<string>('');
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const startStep = useCallback((step: string) => {
    setCurrentStep(step);
  }, []);

  const completeStep = useCallback((step: string) => {
    setCompletedSteps(prev => new Set([...prev, step]));
    setCurrentStep('');
  }, []);

  const reset = useCallback(() => {
    setCurrentStep('');
    setCompletedSteps(new Set());
  }, []);

  const getProgress = useCallback((totalSteps: number) => {
    return (completedSteps.size / totalSteps) * 100;
  }, [completedSteps]);

  return {
    currentStep,
    completedSteps,
    startStep,
    completeStep,
    reset,
    getProgress,
    isComplete: (totalSteps: number) => completedSteps.size === totalSteps,
  };
};

// Loading presets for common scenarios
export const loadingPresets = {
  apiCall: {
    timeout: 30000, // 30 seconds
    retryCount: 2,
  },
  fileUpload: {
    showProgress: true,
    timeout: 120000, // 2 minutes
    retryCount: 1,
  },
  search: {
    timeout: 10000, // 10 seconds
    retryCount: 1,
  },
  navigation: {
    timeout: 5000, // 5 seconds
    retryCount: 0,
  },
} as const;
