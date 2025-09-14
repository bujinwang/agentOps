# Loading State Management System

## Overview

The Loading State Management System provides a comprehensive, reusable solution for handling loading states, progress tracking, and error management across the Real Estate CRM application. This system enhances user experience by providing consistent, informative feedback during async operations.

## Architecture

### Core Components

#### 1. `useLoadingState` Hook
The primary hook for managing loading states in React components.

```typescript
const loadingState = useLoadingState();
```

#### 2. Loading State Object
Each loading state instance provides the following interface:

```typescript
interface LoadingState {
  isLoading: boolean;
  error: string | null;
  progress: number;
  message: string;
  startLoading: (message?: string, options?: LoadingOptions) => void;
  updateProgress: (progress: number, message?: string) => void;
  stopLoading: () => void;
  setError: (error: string, options?: LoadingOptions) => void;
  reset: () => void;
  retry: (retryFunction: () => Promise<any>) => Promise<any>;
}
```

#### 3. Loading Callbacks
Standardized callback interface for async operations:

```typescript
interface LoadingCallbacks {
  onStart?: (message?: string) => void;
  onProgress?: (progress: number, message?: string) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
}
```

## Usage Patterns

### Basic Loading State

```typescript
import { useLoadingState } from '../utils/loadingState';

const MyComponent = () => {
  const loadingState = useLoadingState();

  const handleAsyncOperation = async () => {
    loadingState.startLoading('Loading data...');

    try {
      const result = await apiService.getData();
      loadingState.stopLoading();
      // Handle success
    } catch (error) {
      loadingState.setError('Failed to load data');
    }
  };

  return (
    <View>
      {loadingState.isLoading && <ActivityIndicator />}
      {loadingState.error && <Text>{loadingState.error}</Text>}
      <Button
        title="Load Data"
        onPress={handleAsyncOperation}
        disabled={loadingState.isLoading}
      />
    </View>
  );
};
```

### Progress Tracking

```typescript
const handleFileUpload = async (file: File) => {
  loadingState.startLoading('Uploading file...');

  try {
    await apiService.uploadFile(file, {
      onProgress: (progress) => {
        loadingState.updateProgress(progress, `Uploading... ${progress}%`);
      }
    });
    loadingState.stopLoading();
  } catch (error) {
    loadingState.setError('Upload failed');
  }
};
```

### Multiple Loading States

```typescript
const MyComponent = () => {
  const initialLoading = useLoadingState();
  const refreshLoading = useLoadingState();
  const submitLoading = useLoadingState();

  // Use different loading states for different operations
};
```

### Service Integration

Services can be enhanced with loading-enabled methods:

```typescript
// In apiService.ts
async getLeadsWithLoading(
  params?: LeadListParams,
  callbacks?: LoadingCallbacks
): Promise<LeadResponse | null> {
  try {
    callbacks?.onStart?.('Loading leads...');

    const response = await this.getLeads(params);

    callbacks?.onComplete?.();
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load leads';
    callbacks?.onError?.(message);
    return null;
  }
}
```

## Component Integration

### Skeleton Loading

Use skeleton components for better perceived performance:

```typescript
import { LeadListSkeleton } from '../components/common/SkeletonList';

const LeadsListScreen = () => {
  const loadingState = useLoadingState();

  if (loadingState.isLoading && !leads.length) {
    return <LeadListSkeleton count={5} animated={true} />;
  }

  return (
    <FlatList
      data={leads}
      renderItem={renderLeadItem}
      refreshControl={
        <RefreshControl
          refreshing={refreshLoading.isLoading}
          onRefresh={handleRefresh}
        />
      }
    />
  );
};
```

### Error Boundaries

```typescript
const ErrorFallback = ({ error, retry }) => (
  <View>
    <Text>Something went wrong: {error.message}</Text>
    <Button title="Retry" onPress={retry} />
  </View>
);

const MyComponent = () => {
  const loadingState = useLoadingState();

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error) => loadingState.setError(error.message)}
    >
      {/* Component content */}
    </ErrorBoundary>
  );
};
```

## Advanced Features

### Retry Logic

```typescript
const handleRetry = async () => {
  await loadingState.retry(async () => {
    return await apiService.getData();
  });
};
```

### Loading State Persistence

```typescript
// Persist loading state across component re-mounts
const persistentLoading = useLoadingState({
  persistKey: 'my-operation',
  persistDuration: 30000 // 30 seconds
});
```

### Conditional Loading

```typescript
const conditionalLoading = useLoadingState({
  condition: () => isOnline, // Only show loading if online
  fallbackMessage: 'Offline - operation will sync when connected'
});
```

## Best Practices

### 1. Consistent Messaging

```typescript
// Good: Specific, actionable messages
loadingState.startLoading('Loading your leads...');
loadingState.updateProgress(50, 'Processing lead data...');

// Bad: Generic messages
loadingState.startLoading('Loading...');
```

### 2. Error Handling

```typescript
// Good: User-friendly error messages
loadingState.setError('Unable to connect to server. Please check your internet connection.');

// Bad: Technical error messages
loadingState.setError('NetworkError: Failed to fetch');
```

### 3. Loading State Scope

```typescript
// Good: Separate loading states for different operations
const searchLoading = useLoadingState();
const submitLoading = useLoadingState();

// Bad: Single loading state for multiple operations
const loading = useLoadingState(); // Confusing which operation is loading
```

### 4. Accessibility

```typescript
// Include accessibility labels for loading states
<ActivityIndicator
  accessibilityLabel="Loading leads"
  accessibilityHint="Please wait while we load your leads"
/>
```

### 5. Performance

```typescript
// Debounce rapid loading state changes
const debouncedLoading = useMemo(() => {
  return debounce(loadingState.startLoading, 300);
}, [loadingState]);
```

## Integration Examples

### Analytics Dashboard

```typescript
const AnalyticsScreen = () => {
  const initialLoading = useLoadingState();
  const refreshLoading = useLoadingState();

  const loadData = async () => {
    initialLoading.startLoading('Loading analytics...');

    try {
      const [kpis, analytics] = await Promise.all([
        analyticsService.getDashboardKPIsWithLoading({}, {
          onStart: initialLoading.startLoading,
          onProgress: initialLoading.updateProgress,
          onComplete: initialLoading.stopLoading,
          onError: initialLoading.setError,
        }),
        analyticsService.getLeadAnalyticsWithLoading('month', {}, {
          onStart: initialLoading.startLoading,
          onProgress: initialLoading.updateProgress,
          onComplete: initialLoading.stopLoading,
          onError: initialLoading.setError,
        })
      ]);

      setDashboardKPIs(kpis);
      setLeadAnalytics(analytics);
    } catch (error) {
      initialLoading.setError('Failed to load analytics');
    }
  };
};
```

### Form Submissions

```typescript
const LoginScreen = () => {
  const loginLoading = useLoadingState();

  const handleLogin = async () => {
    loginLoading.startLoading('Signing in...');

    try {
      const result = await apiService.loginWithLoading(credentials, {
        onStart: loginLoading.startLoading,
        onProgress: loginLoading.updateProgress,
        onComplete: loginLoading.stopLoading,
        onError: loginLoading.setError,
      });

      if (result) {
        navigation.navigate('Home');
      }
    } catch (error) {
      // Error already handled by callbacks
    }
  };
};
```

## Testing

### Unit Testing

```typescript
describe('useLoadingState', () => {
  it('should start loading with message', () => {
    const { result } = renderHook(() => useLoadingState());

    act(() => {
      result.current.startLoading('Test message');
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.message).toBe('Test message');
  });

  it('should handle errors', () => {
    const { result } = renderHook(() => useLoadingState());

    act(() => {
      result.current.setError('Test error');
    });

    expect(result.current.error).toBe('Test error');
    expect(result.current.isLoading).toBe(false);
  });
});
```

### Integration Testing

```typescript
describe('API Service with Loading', () => {
  it('should call loading callbacks', async () => {
    const onStart = jest.fn();
    const onComplete = jest.fn();

    const result = await apiService.getLeadsWithLoading({}, {
      onStart,
      onComplete,
    });

    expect(onStart).toHaveBeenCalledWith('Loading leads...');
    expect(onComplete).toHaveBeenCalled();
  });
});
```

## Migration Guide

### From Basic Loading States

```typescript
// Before
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState(null);

// After
const loadingState = useLoadingState();
```

### From Custom Loading Hooks

```typescript
// Before
const useCustomLoading = () => {
  const [loading, setLoading] = useState(false);
  // Custom logic...
};

// After
const loadingState = useLoadingState();
// Use built-in features or extend as needed
```

## Troubleshooting

### Common Issues

1. **Loading state not updating**: Ensure you're using the loading state methods correctly
2. **Memory leaks**: Clean up subscriptions in useEffect return functions
3. **Race conditions**: Use the latest loading state values in async operations
4. **Performance issues**: Debounce rapid loading state changes

### Debug Tips

```typescript
// Add debug logging
useEffect(() => {
  console.log('Loading state changed:', loadingState);
}, [loadingState]);

// Use React DevTools to inspect loading state
```

## Future Enhancements

- Loading state persistence across app restarts
- Global loading state management
- Loading state analytics and metrics
- Advanced retry strategies with exponential backoff
- Loading state theming and customization
- Integration with React Query/SWR for caching

---

This loading state management system provides a robust, scalable solution for handling async operations throughout the Real Estate CRM application, ensuring consistent user experience and maintainable code.