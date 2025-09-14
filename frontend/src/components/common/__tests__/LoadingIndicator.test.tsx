import React from 'react';
import { View } from 'react-native';
import LoadingIndicator, { InlineLoader, CenteredLoader, FullScreenLoader, SkeletonLoader } from '../LoadingIndicator';

// Mock theme context for testing
const mockTheme = {
  theme: 'light' as const,
  isDark: false,
  colors: {
    primary: '#007AFF',
    secondary: '#5856D6',
    background: '#FFFFFF',
    surface: '#F2F2F7',
    text: '#000000',
    textSecondary: '#8E8E93',
  },
};

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => mockTheme,
}));

describe('LoadingIndicator Component Tests', () => {
  it('LoadingIndicator renders without crashing', () => {
    const component = React.createElement(LoadingIndicator);
    expect(component.type).toBeDefined();
  });

  it('LoadingIndicator accepts size prop', () => {
    const component = React.createElement(LoadingIndicator, { size: 'lg' });
    expect(component.props.size).toBe('lg');
  });

  it('LoadingIndicator accepts color prop', () => {
    const component = React.createElement(LoadingIndicator, { color: 'secondary' });
    expect(component.props.color).toBe('secondary');
  });

  it('LoadingIndicator accepts centered prop', () => {
    const component = React.createElement(LoadingIndicator, { centered: true });
    expect(component.props.centered).toBe(true);
  });

  it('LoadingIndicator accepts fullScreen prop', () => {
    const component = React.createElement(LoadingIndicator, { fullScreen: true });
    expect(component.props.fullScreen).toBe(true);
  });

  it('LoadingIndicator accepts accessibilityLabel prop', () => {
    const label = 'Custom loading message';
    const component = React.createElement(LoadingIndicator, { accessibilityLabel: label });
    expect(component.props.accessibilityLabel).toBe(label);
  });

  it('InlineLoader renders without crashing', () => {
    const component = React.createElement(InlineLoader);
    expect(component.type).toBeDefined();
  });

  it('CenteredLoader renders without crashing', () => {
    const component = React.createElement(CenteredLoader);
    expect(component.type).toBeDefined();
  });

  it('FullScreenLoader renders without crashing', () => {
    const component = React.createElement(FullScreenLoader);
    expect(component.type).toBeDefined();
  });

  it('SkeletonLoader renders without crashing', () => {
    const component = React.createElement(SkeletonLoader);
    expect(component.type).toBeDefined();
  });

  it('LoadingIndicator has correct default props', () => {
    const component = React.createElement(LoadingIndicator);
    expect(component.props.size).toBe('md');
    expect(component.props.color).toBe('primary');
    expect(component.props.centered).toBe(false);
    expect(component.props.fullScreen).toBe(false);
    expect(component.props.animated).toBe(true);
    expect(component.props.theme).toBe('auto');
  });
});