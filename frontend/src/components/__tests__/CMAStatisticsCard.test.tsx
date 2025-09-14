import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CMAStatisticsCard } from '../CMAStatisticsCard';
import { CMAStatistics, PriceRange } from '../../types/cma';

describe('CMAStatisticsCard', () => {
  const mockStatistics: CMAStatistics = {
    comparables_count: 6,
    average_price: 485000,
    median_price: 480000,
    price_range: {
      low: 460000,
      high: 510000,
      range: 50000
    },
    average_price_per_sqft: 242.50,
    median_price_per_sqft: 240.00,
    price_per_sqft_range: {
      low: 230.00,
      high: 255.00,
      average: 242.50
    },
    average_days_on_market: 28,
    median_days_on_market: 25,
    average_sale_to_list_ratio: 0.985,
    standard_deviation: 15000,
    coefficient_of_variation: 0.031,
    confidence_interval_95: {
      low: 470000,
      high: 500000
    },
    market_absorption_rate: 2.1,
    inventory_levels: 3.2,
    market_trend: 'stable',
    market_strength: 'balanced'
  };

  const mockPriceRange: PriceRange = {
    subject_property_value: 500000,
    estimated_value_range: {
      low: 475000,
      high: 525000,
      confidence_level: 'high'
    },
    price_per_sqft_range: {
      low: 237.50,
      high: 262.50,
      average: 250.00
    },
    total_adjustments: 5000,
    adjustment_breakdown: {
      positive: 2000,
      negative: 3000,
      net_adjustment: -1000
    },
    confidence_score: 85,
    confidence_factors: {
      comparable_quality: 80,
      market_data_freshness: 90,
      adjustment_accuracy: 85,
      market_conditions: 80
    }
  };

  const mockOnRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render statistics correctly', () => {
    const { getByText } = render(
      <CMAStatisticsCard
        statistics={mockStatistics}
        priceRange={mockPriceRange}
        onRefresh={mockOnRefresh}
      />
    );

    // Check key statistics are displayed
    expect(getByText('6')).toBeTruthy(); // comparables_count
    expect(getByText('$485,000')).toBeTruthy(); // average_price
    expect(getByText('$480,000')).toBeTruthy(); // median_price
    expect(getByText('$242.50')).toBeTruthy(); // average_price_per_sqft
  });

  it('should display price range information', () => {
    const { getByText } = render(
      <CMAStatisticsCard
        statistics={mockStatistics}
        priceRange={mockPriceRange}
        onRefresh={mockOnRefresh}
      />
    );

    expect(getByText('$475,000 - $525,000')).toBeTruthy(); // estimated_value_range
    expect(getByText('High')).toBeTruthy(); // confidence_level
  });

  it('should show market indicators', () => {
    const { getByText } = render(
      <CMAStatisticsCard
        statistics={mockStatistics}
        priceRange={mockPriceRange}
        onRefresh={mockOnRefresh}
      />
    );

    expect(getByText('Stable')).toBeTruthy(); // market_trend
    expect(getByText('Balanced')).toBeTruthy(); // market_strength
    expect(getByText('2.1')).toBeTruthy(); // market_absorption_rate
  });

  it('should display confidence information', () => {
    const { getByText } = render(
      <CMAStatisticsCard
        statistics={mockStatistics}
        priceRange={mockPriceRange}
        onRefresh={mockOnRefresh}
      />
    );

    expect(getByText('85%')).toBeTruthy(); // confidence_score
    expect(getByText('$470,000 - $500,000')).toBeTruthy(); // confidence_interval_95
  });

  it('should call onRefresh when refresh button is pressed', () => {
    const { getByTestId } = render(
      <CMAStatisticsCard
        statistics={mockStatistics}
        priceRange={mockPriceRange}
        onRefresh={mockOnRefresh}
      />
    );

    const refreshButton = getByTestId('refresh-button');
    fireEvent.press(refreshButton);

    expect(mockOnRefresh).toHaveBeenCalled();
  });

  it('should handle missing statistics gracefully', () => {
    const incompleteStatistics = {
      ...mockStatistics,
      average_price_per_sqft: undefined,
      median_days_on_market: undefined
    };

    const { getByText } = render(
      <CMAStatisticsCard
        statistics={incompleteStatistics}
        priceRange={mockPriceRange}
        onRefresh={mockOnRefresh}
      />
    );

    // Should still render available data
    expect(getByText('$485,000')).toBeTruthy();
    expect(getByText('6')).toBeTruthy();
  });

  it('should display adjustment breakdown when available', () => {
    const { getByText } = render(
      <CMAStatisticsCard
        statistics={mockStatistics}
        priceRange={mockPriceRange}
        onRefresh={mockOnRefresh}
      />
    );

    expect(getByText('-$1,000')).toBeTruthy(); // net_adjustment
    expect(getByText('$2,000')).toBeTruthy(); // positive adjustments
    expect(getByText('-$3,000')).toBeTruthy(); // negative adjustments
  });

  it('should show market absorption rate correctly', () => {
    const { getByText } = render(
      <CMAStatisticsCard
        statistics={mockStatistics}
        priceRange={mockPriceRange}
        onRefresh={mockOnRefresh}
      />
    );

    expect(getByText('2.1 per month')).toBeTruthy();
  });

  it('should display inventory levels', () => {
    const { getByText } = render(
      <CMAStatisticsCard
        statistics={mockStatistics}
        priceRange={mockPriceRange}
        onRefresh={mockOnRefresh}
      />
    );

    expect(getByText('3.2 months')).toBeTruthy();
  });

  it('should handle zero confidence score', () => {
    const zeroConfidenceRange = {
      ...mockPriceRange,
      confidence_score: 0
    };

    const { getByText } = render(
      <CMAStatisticsCard
        statistics={mockStatistics}
        priceRange={zeroConfidenceRange}
        onRefresh={mockOnRefresh}
      />
    );

    expect(getByText('0%')).toBeTruthy();
  });

  it('should display sale-to-list ratio correctly', () => {
    const { getByText } = render(
      <CMAStatisticsCard
        statistics={mockStatistics}
        priceRange={mockPriceRange}
        onRefresh={mockOnRefresh}
      />
    );

    expect(getByText('98.5%')).toBeTruthy(); // average_sale_to_list_ratio * 100
  });
});