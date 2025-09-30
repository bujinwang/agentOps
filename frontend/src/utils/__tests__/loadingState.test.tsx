import React from 'react';
import { Text } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { useLoadingState } from '../loadingState';

type LoadingHook = ReturnType<typeof useLoadingState>;

const LoadingHarness = React.forwardRef<LoadingHook>((_, ref) => {
  const loading = useLoadingState();

  React.useImperativeHandle(ref, () => loading, [loading]);

  return (
    <>
      <Text testID="status">{loading.isLoading ? 'loading' : 'idle'}</Text>
      {loading.error && <Text testID="error">{loading.error}</Text>}
      {typeof loading.progress === 'number' && (
        <Text testID="progress">{loading.progress}</Text>
      )}
    </>
  );
});

LoadingHarness.displayName = 'LoadingHarness';

describe('useLoadingState hook', () => {
  it('handles start and stop transitions', () => {
    const ref = React.createRef<LoadingHook>();
    const { getByTestId } = render(<LoadingHarness ref={ref} />);

    act(() => {
      ref.current?.startLoading('Loading data…');
    });
    expect(getByTestId('status').props.children).toBe('loading');

    act(() => {
      ref.current?.stopLoading();
    });
    expect(getByTestId('status').props.children).toBe('idle');
  });

  it('records errors and supports reset', () => {
    const ref = React.createRef<LoadingHook>();
    const { getByTestId, queryByTestId } = render(<LoadingHarness ref={ref} />);

    act(() => {
      ref.current?.setError('Something went wrong');
    });
    expect(getByTestId('error').props.children).toBe('Something went wrong');

    act(() => {
      ref.current?.reset();
    });
    expect(queryByTestId('error')).toBeNull();
    expect(getByTestId('status').props.children).toBe('idle');
  });

  it('updates progress when provided', () => {
    const ref = React.createRef<LoadingHook>();
    const { getByTestId } = render(<LoadingHarness ref={ref} />);

    act(() => {
      ref.current?.startLoading('With progress', { showProgress: true });
    });

    act(() => {
      ref.current?.updateProgress(50, 'Halfway there');
    });

    expect(getByTestId('progress').props.children).toBe(50);

    act(() => {
      ref.current?.stopLoading();
    });
  });
});
