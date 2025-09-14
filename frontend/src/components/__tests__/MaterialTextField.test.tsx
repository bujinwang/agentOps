import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MaterialTextField } from '../MaterialTextField';

describe('MaterialTextField', () => {
  const mockOnChangeText = jest.fn();
  const mockOnBlur = jest.fn();
  const mockOnFocus = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with basic props', () => {
    const { getByTestId } = render(
      <MaterialTextField
        label="Email"
        value=""
        onChangeText={mockOnChangeText}
        testID="email-input"
      />
    );

    const textField = getByTestId('email-input');
    expect(textField).toBeTruthy();
  });

  it('should display label correctly', () => {
    const { getByText } = render(
      <MaterialTextField
        label="First Name"
        value=""
        onChangeText={mockOnChangeText}
      />
    );

    expect(getByText('First Name')).toBeTruthy();
  });

  it('should handle text input changes', () => {
    const { getByTestId } = render(
      <MaterialTextField
        label="Name"
        value=""
        onChangeText={mockOnChangeText}
        testID="name-input"
      />
    );

    const textInput = getByTestId('name-input');
    fireEvent.changeText(textInput, 'John Doe');

    expect(mockOnChangeText).toHaveBeenCalledWith('John Doe');
  });

  it('should display placeholder text', () => {
    const { getByPlaceholderText } = render(
      <MaterialTextField
        label="Search"
        value=""
        onChangeText={mockOnChangeText}
        placeholder="Enter search term"
      />
    );

    expect(getByPlaceholderText('Enter search term')).toBeTruthy();
  });

  it('should handle focus and blur events', () => {
    const { getByTestId } = render(
      <MaterialTextField
        label="Password"
        value=""
        onChangeText={mockOnChangeText}
        onFocus={mockOnFocus}
        onBlur={mockOnBlur}
        testID="password-input"
      />
    );

    const textInput = getByTestId('password-input');

    fireEvent(textInput, 'focus');
    expect(mockOnFocus).toHaveBeenCalled();

    fireEvent(textInput, 'blur');
    expect(mockOnBlur).toHaveBeenCalled();
  });

  it('should display error message when provided', () => {
    const { getByText } = render(
      <MaterialTextField
        label="Email"
        value="invalid-email"
        onChangeText={mockOnChangeText}
        error="Please enter a valid email address"
      />
    );

    expect(getByText('Please enter a valid email address')).toBeTruthy();
  });

  it('should display helper text when provided', () => {
    const { getByText } = render(
      <MaterialTextField
        label="Phone"
        value=""
        onChangeText={mockOnChangeText}
        helperText="Enter your phone number with area code"
      />
    );

    expect(getByText('Enter your phone number with area code')).toBeTruthy();
  });

  it('should handle disabled state', () => {
    const { getByTestId } = render(
      <MaterialTextField
        label="Disabled Field"
        value="disabled value"
        onChangeText={mockOnChangeText}
        disabled={true}
        testID="disabled-input"
      />
    );

    const textInput = getByTestId('disabled-input');
    expect(textInput.props.editable).toBe(false);
  });

  it('should handle secure text entry for passwords', () => {
    const { getByTestId } = render(
      <MaterialTextField
        label="Password"
        value=""
        onChangeText={mockOnChangeText}
        secureTextEntry={true}
        testID="password-input"
      />
    );

    const textInput = getByTestId('password-input');
    expect(textInput.props.secureTextEntry).toBe(true);
  });

  it('should handle different keyboard types', () => {
    const { getByTestId } = render(
      <MaterialTextField
        label="Phone Number"
        value=""
        onChangeText={mockOnChangeText}
        keyboardType="phone-pad"
        testID="phone-input"
      />
    );

    const textInput = getByTestId('phone-input');
    expect(textInput.props.keyboardType).toBe('phone-pad');
  });

  it('should handle multiline text input', () => {
    const { getByTestId } = render(
      <MaterialTextField
        label="Description"
        value=""
        onChangeText={mockOnChangeText}
        multiline={true}
        numberOfLines={4}
        testID="description-input"
      />
    );

    const textInput = getByTestId('description-input');
    expect(textInput.props.multiline).toBe(true);
    expect(textInput.props.numberOfLines).toBe(4);
  });

  it('should handle max length constraint', () => {
    const { getByTestId } = render(
      <MaterialTextField
        label="Short Description"
        value=""
        onChangeText={mockOnChangeText}
        maxLength={100}
        testID="short-input"
      />
    );

    const textInput = getByTestId('short-input');
    expect(textInput.props.maxLength).toBe(100);
  });
});