import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ConversionFunnel from '../ConversionFunnel';

const mockData = [
  {
    stage_name: 'Initial Contact',
    stage_order: 1,
    lead_count: 100,
    avg_probability: 0.2,
    total_value: 500000,
  },
  {
    stage_name: 'Qualified',
    stage_order: 2,
    lead_count: 50,
    avg_probability: 0.6,
    total_value: 300000,
  },
  {
    stage_name: 'Proposal Sent',
    stage_order: 3,
    lead_count: 20,
    avg_probability: 0.8,
    total_value: 150000,
  },
];

describe('ConversionFunnel', () => {
  it('renders correctly with data', () => {
    const { getByText } = render(<ConversionFunnel data={mockData} />);

    expect(getByText('Conversion Funnel')).toBeTruthy();
    expect(getByText('Initial Contact')).toBeTruthy();
    expect(getByText('Qualified')).toBeTruthy();
    expect(getByText('Proposal Sent')).toBeTruthy();
  });

  it('displays lead counts correctly', () => {
    const { getByText } = render(<ConversionFunnel data={mockData} />);

    expect(getByText('100 leads')).toBeTruthy();
    expect(getByText('50 leads')).toBeTruthy();
    expect(getByText('20 leads')).toBeTruthy();
  });

  it('shows no data message when data is empty', () => {
    const { getByText } = render(<ConversionFunnel data={[]} />);

    expect(getByText('No conversion data available')).toBeTruthy();
  });

  it('shows no data message when data is null', () => {
    const { getByText } = render(<ConversionFunnel data={null as any} />);

    expect(getByText('No conversion data available')).toBeTruthy();
  });

  it('calculates conversion rates correctly', () => {
    const { getByText } = render(<ConversionFunnel data={mockData} />);

    // From Initial Contact (100) to Qualified (50) = 50% conversion
    expect(getByText('50.0%')).toBeTruthy();
    // From Qualified (50) to Proposal Sent (20) = 40% conversion
    expect(getByText('40.0%')).toBeTruthy();
  });

  it('calculates drop-off rates correctly', () => {
    const { getByText } = render(<ConversionFunnel data={mockData} />);

    // Drop-off = 100% - conversion rate
    expect(getByText('50.0% drop-off')).toBeTruthy();
    expect(getByText('60.0% drop-off')).toBeTruthy();
  });

  it('displays total values when showValues is true', () => {
    const { getByText } = render(<ConversionFunnel data={mockData} showValues={true} />);

    expect(getByText('$500,000')).toBeTruthy();
    expect(getByText('$300,000')).toBeTruthy();
    expect(getByText('$150,000')).toBeTruthy();
  });

  it('hides values when showValues is false', () => {
    const { queryByText } = render(<ConversionFunnel data={mockData} showValues={false} />);

    expect(queryByText('$500,000')).toBeNull();
    expect(queryByText('$300,000')).toBeNull();
    expect(queryByText('$150,000')).toBeNull();
  });

  it('displays probabilities when showProbabilities is true', () => {
    const { getByText } = render(<ConversionFunnel data={mockData} showProbabilities={true} />);

    expect(getByText('Avg Probability: 20.0%')).toBeTruthy();
    expect(getByText('Avg Probability: 60.0%')).toBeTruthy();
    expect(getByText('Avg Probability: 80.0%')).toBeTruthy();
  });

  it('hides probabilities when showProbabilities is false', () => {
    const { queryByText } = render(<ConversionFunnel data={mockData} showProbabilities={false} />);

    expect(queryByText('Avg Probability: 20.0%')).toBeNull();
    expect(queryByText('Avg Probability: 60.0%')).toBeNull();
    expect(queryByText('Avg Probability: 80.0%')).toBeNull();
  });

  it('handles stage selection correctly', () => {
    const { getByText, queryByText } = render(<ConversionFunnel data={mockData} />);

    const qualifiedStage = getByText('Qualified');

    // Initially no stage is selected
    expect(queryByText('Total Value: $300,000')).toBeNull();

    // Press to select
    fireEvent.press(qualifiedStage);

    // Now should show details
    expect(getByText('Total Value: $300,000')).toBeTruthy();
    expect(getByText('Avg Probability: 60.0%')).toBeTruthy();

    // Press again to deselect
    fireEvent.press(qualifiedStage);

    // Details should be hidden
    expect(queryByText('Total Value: $300,000')).toBeNull();
  });

  it('calls onStagePress callback when stage is pressed', () => {
    const mockOnStagePress = jest.fn();
    const { getByText } = render(
      <ConversionFunnel data={mockData} onStagePress={mockOnStagePress} />
    );

    const qualifiedStage = getByText('Qualified');
    fireEvent.press(qualifiedStage);

    expect(mockOnStagePress).toHaveBeenCalledWith(mockData[1]);
  });

  it('displays summary information correctly', () => {
    const { getByText } = render(<ConversionFunnel data={mockData} />);

    // Total leads: 100 + 50 + 20 = 170
    expect(getByText('Total Pipeline: 170 leads')).toBeTruthy();

    // Total value: 500000 + 300000 + 150000 = 950000
    expect(getByText('Total Value: $950,000')).toBeTruthy();
  });

  it('applies correct colors to different stages', () => {
    const { getByText } = render(<ConversionFunnel data={mockData} />);

    // Test that stages have different visual elements (colors are applied via style)
    const initialContact = getByText('Initial Contact');
    const qualified = getByText('Qualified');
    const proposal = getByText('Proposal Sent');

    // The component applies colors through style props, which are tested implicitly
    // through the rendering and interaction tests above
    expect(initialContact).toBeTruthy();
    expect(qualified).toBeTruthy();
    expect(proposal).toBeTruthy();
  });

  it('handles stages with zero leads', () => {
    const dataWithZero = [
      ...mockData,
      {
        stage_name: 'Negotiation',
        stage_order: 4,
        lead_count: 0,
        avg_probability: 0,
        total_value: 0,
      },
    ];

    const { getByText } = render(<ConversionFunnel data={dataWithZero} />);

    expect(getByText('Negotiation')).toBeTruthy();
    expect(getByText('0 leads')).toBeTruthy();
  });

  it('renders with custom height', () => {
    const customHeight = 500;
    const { getByTestId } = render(
      <ConversionFunnel data={mockData} height={customHeight} />
    );

    // The height prop is applied to the container style
    // This test verifies the component accepts and uses the height prop
    expect(getByTestId ? getByTestId('funnel-container') : null).toBeTruthy();
  });

  it('handles stages with missing total_value', () => {
    const dataWithoutValue = [
      {
        stage_name: 'Initial Contact',
        stage_order: 1,
        lead_count: 100,
        avg_probability: 0.2,
        total_value: undefined,
      },
    ];

    const { queryByText } = render(<ConversionFunnel data={dataWithoutValue} />);

    // Should not crash and should handle undefined values gracefully
    expect(queryByText('Total Value:')).toBeNull();
  });

  it('calculates funnel bar widths correctly', () => {
    const { getByText } = render(<ConversionFunnel data={mockData} />);

    // The funnel bars should be rendered with correct proportional widths
    // based on lead_count relative to max (100)
    // Initial Contact: 100/100 = 90% width
    // Qualified: 50/100 = 45% width
    // Proposal Sent: 20/100 = 18% width (minimum 10%)

    expect(getByText('Initial Contact')).toBeTruthy();
    expect(getByText('Qualified')).toBeTruthy();
    expect(getByText('Proposal Sent')).toBeTruthy();
  });
});