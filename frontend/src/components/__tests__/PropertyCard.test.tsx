import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PropertyCard } from '../PropertyCard';
import { createMockProperty } from '../../test-utils/test-helpers';

describe('PropertyCard', () => {
  const mockProperty = createMockProperty();
  const mockOnPress = jest.fn();
  const mockOnFavorite = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render property information correctly', () => {
    const { getByText, getByTestId } = render(
      <PropertyCard
        property={mockProperty}
        onPress={mockOnPress}
        onFavorite={mockOnFavorite}
      />
    );

    // Check if key property information is displayed
    expect(getByText('$500,000')).toBeTruthy();
    expect(getByText('123 Main St')).toBeTruthy();
    expect(getByText('Anytown, CA 12345')).toBeTruthy();
    expect(getByText('3 bed • 2 bath • 2,000 sqft')).toBeTruthy();
  });

  it('should call onPress when card is pressed', () => {
    const { getByTestId } = render(
      <PropertyCard
        property={mockProperty}
        onPress={mockOnPress}
        onFavorite={mockOnFavorite}
      />
    );

    const card = getByTestId('property-card');
    fireEvent.press(card);

    expect(mockOnPress).toHaveBeenCalledWith(mockProperty);
  });

  it('should call onFavorite when favorite button is pressed', () => {
    const { getByTestId } = render(
      <PropertyCard
        property={mockProperty}
        onPress={mockOnPress}
        onFavorite={mockOnFavorite}
      />
    );

    const favoriteButton = getByTestId('favorite-button');
    fireEvent.press(favoriteButton);

    expect(mockOnFavorite).toHaveBeenCalledWith(mockProperty);
  });

  it('should display property status badge', () => {
    const { getByText } = render(
      <PropertyCard
        property={mockProperty}
        onPress={mockOnPress}
        onFavorite={mockOnFavorite}
      />
    );

    expect(getByText('Active')).toBeTruthy();
  });

  it('should handle property with missing details gracefully', () => {
    const propertyWithoutDetails = {
      ...mockProperty,
      details: undefined
    };

    const { getByText } = render(
      <PropertyCard
        property={propertyWithoutDetails}
        onPress={mockOnPress}
        onFavorite={mockOnFavorite}
      />
    );

    // Should still render basic information
    expect(getByText('$500,000')).toBeTruthy();
    expect(getByText('123 Main St')).toBeTruthy();
  });

  it('should display property type when available', () => {
    const { getByText } = render(
      <PropertyCard
        property={mockProperty}
        onPress={mockOnPress}
        onFavorite={mockOnFavorite}
      />
    );

    expect(getByText('Single Family')).toBeTruthy();
  });

  it('should handle long addresses gracefully', () => {
    const propertyWithLongAddress = {
      ...mockProperty,
      address: {
        ...mockProperty.address,
        street: '123 Very Long Street Name That Might Wrap Or Get Truncated'
      }
    };

    const { getByText } = render(
      <PropertyCard
        property={propertyWithLongAddress}
        onPress={mockOnPress}
        onFavorite={mockOnFavorite}
      />
    );

    expect(getByText('123 Very Long Street Name That Might Wrap Or Get Truncated')).toBeTruthy();
  });
});