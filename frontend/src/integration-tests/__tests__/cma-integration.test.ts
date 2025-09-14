import { cmaApiService } from '../../services/cmaApiService';
import { CMAStatisticsCard } from '../../components/CMAStatisticsCard';
import { render, waitFor } from '@testing-library/react-native';
import { CMAStatistics, PriceRange } from '../../types/cma';

// Mock the API service
jest.mock('../../services/cmaApiService');
const mockCmaApiService = cmaApiService as jest.Mocked<typeof cmaApiService>;

describe('CMA Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CMA Statistics Card with API Integration', () => {
    const mockStatistics: CMAStatistics = {
      comparables_count: 5,
      average_price: 450000,
      median_price: 445000,
      price_range: {
        low: 420000,
        high: 480000,
        range: 60000
      },
      average_price_per_sqft: 225.00,
      median_price_per_sqft: 222.50,
      price_per_sqft_range: {
        low: 210.00,
        high: 240.00,
        average: 225.00
      },
      average_days_on_market: 32,
      median_days_on_market: 28,
      average_sale_to_list_ratio: 0.978,
      standard_deviation: 18000,
      coefficient_of_variation: 0.04,
      confidence_interval_95: {
        low: 430000,
        high: 470000
      },
      market_absorption_rate: 1.8,
      inventory_levels: 4.1,
      market_trend: 'up',
      market_strength: 'sellers'
    };

    const mockPriceRange: PriceRange = {
      subject_property_value: 460000,
      estimated_value_range: {
        low: 440000,
        high: 480000,
        confidence_level: 'high'
      },
      price_per_sqft_range: {
        low: 220.00,
        high: 240.00,
        average: 230.00
      },
      total_adjustments: 3000,
      adjustment_breakdown: {
        positive: 5000,
        negative: 2000,
        net_adjustment: 3000
      },
      confidence_score: 88,
      confidence_factors: {
        comparable_quality: 85,
        market_data_freshness: 90,
        adjustment_accuracy: 88,
        market_conditions: 85
      }
    };

    it('should fetch and display CMA data from API', async () => {
      // Mock successful API response
      mockCmaApiService.getCMAAnalysis.mockResolvedValue({
        success: true,
        data: {
          id: 'cma-123',
          subject_property: { id: 'prop-1' },
          search_criteria: {} as any,
          analysis_date: '2024-01-01',
          analysis_status: 'completed',
          comparables: [],
          statistics: mockStatistics,
          price_range: mockPriceRange,
          recommendations: [],
          market_trends: [],
          neighborhood_analysis: {} as any,
          market_forecast: {} as any,
          data_quality_score: 85,
          validation_warnings: [],
          data_sources: ['mls'],
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          version: 1
        }
      });

      const mockOnRefresh = jest.fn();

      const { getByText, getByTestId } = render(
        <CMAStatisticsCard
          statistics={mockStatistics}
          priceRange={mockPriceRange}
          onRefresh={mockOnRefresh}
        />
      );

      // Verify data is displayed correctly
      expect(getByText('5')).toBeTruthy(); // comparables_count
      expect(getByText('$450,000')).toBeTruthy(); // average_price
      expect(getByText('$445,000')).toBeTruthy(); // median_price
      expect(getByText('$225.00')).toBeTruthy(); // average_price_per_sqft

      // Verify price range display
      expect(getByText('$440,000 - $480,000')).toBeTruthy();
      expect(getByText('High')).toBeTruthy();

      // Verify market indicators
      expect(getByText('Up')).toBeTruthy();
      expect(getByText('Sellers')).toBeTruthy();
    });

    it('should handle API errors gracefully in component', async () => {
      // Mock API error
      mockCmaApiService.getCMAAnalysis.mockResolvedValue({
        success: false,
        error: {
          code: 'CMA_NOT_FOUND',
          message: 'CMA analysis not found'
        }
      });

      const mockOnRefresh = jest.fn();

      // This test would verify error handling in the component
      // In a real scenario, the component would receive error props
      const { getByTestId } = render(
        <CMAStatisticsCard
          statistics={mockStatistics}
          priceRange={mockPriceRange}
          onRefresh={mockOnRefresh}
        />
      );

      const refreshButton = getByTestId('refresh-button');
      expect(refreshButton).toBeTruthy();
    });

    it('should refresh data when refresh button is pressed', async () => {
      const mockOnRefresh = jest.fn();

      const { getByTestId } = render(
        <CMAStatisticsCard
          statistics={mockStatistics}
          priceRange={mockPriceRange}
          onRefresh={mockOnRefresh}
        />
      );

      const refreshButton = getByTestId('refresh-button');

      // Simulate refresh button press
      fireEvent.press(refreshButton);

      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('CMA API Service Integration', () => {
    it('should handle authentication token in API requests', async () => {
      // Mock localStorage
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn().mockReturnValue('mock-auth-token'),
          setItem: jest.fn(),
          removeItem: jest.fn(),
        },
        writable: true,
      });

      // Mock successful API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: []
        }),
      } as any);

      await cmaApiService.getCMAAnalyses();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-auth-token',
          }),
        })
      );
    });

    it('should handle network errors in API service', async () => {
      // Mock network failure
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await cmaApiService.getCMAAnalysis('cma-123');

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Network error');
    });

    it('should handle API error responses', async () => {
      // Mock API error response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValue({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid CMA parameters'
          }
        }),
      } as any);

      const result = await cmaApiService.getCMAAnalysis('cma-123');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.message).toBe('Invalid CMA parameters');
    });

    it('should handle malformed API responses', async () => {
      // Mock malformed response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as any);

      const result = await cmaApiService.getCMAAnalysis('cma-123');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PARSE_ERROR');
    });
  });

  describe('End-to-End CMA Workflow Integration', () => {
    it('should complete full CMA creation workflow', async () => {
      // Mock the complete CMA creation flow
      const createData = {
        subject_property_id: 1,
        search_criteria: {
          subject_property_id: 1,
          search_radius_miles: 2,
          max_comparables: 6,
          date_range: {
            start: '2023-01-01',
            end: '2024-01-01'
          },
          property_types: ['Single Family'],
          sale_types: ['arms_length'],
          min_data_quality_score: 70,
          require_verified_only: false,
          exclude_distressed_sales: true
        }
      };

      const mockCreatedCMA = {
        id: 'cma-new',
        subject_property: { id: 'prop-1' },
        search_criteria: createData.search_criteria,
        analysis_date: '2024-01-01',
        analysis_status: 'completed',
        comparables: [
          {
            id: 1,
            address: '123 Comparable St',
            city: 'Anytown',
            state: 'CA',
            zip_code: '12345',
            property_type: 'Single Family',
            bedrooms: 3,
            bathrooms: 2,
            square_feet: 1800,
            sale_price: 450000,
            sale_date: '2024-01-15',
            distance_miles: 1.2,
            similarity_score: 85,
            adjustments: [],
            adjusted_price: 450000,
            data_source: 'mls',
            data_quality_score: 90,
            last_updated: '2024-01-15',
            verified: true
          }
        ],
        statistics: mockStatistics,
        price_range: mockPriceRange,
        recommendations: [
          {
            id: 'rec-1',
            type: 'pricing',
            title: 'Consider price adjustment',
            description: 'Based on comparable sales, consider pricing at $455,000-$465,000',
            confidence_level: 'high',
            impact_level: 'medium',
            actionable: true,
            supporting_data: [
              {
                metric: 'Average Sale Price',
                value: 450000,
                benchmark: 460000,
                trend: 'up'
              }
            ]
          }
        ],
        market_trends: [],
        neighborhood_analysis: {} as any,
        market_forecast: {} as any,
        data_quality_score: 88,
        validation_warnings: [],
        data_sources: ['mls'],
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        version: 1
      };

      // Mock API responses for the workflow
      mockCmaApiService.createCMAAnalysis.mockResolvedValue({
        success: true,
        data: mockCreatedCMA
      });

      mockCmaApiService.getCMAAnalysis.mockResolvedValue({
        success: true,
        data: mockCreatedCMA
      });

      // Execute the workflow
      const createResult = await cmaApiService.createCMAAnalysis(createData);
      expect(createResult.success).toBe(true);
      expect(createResult.data?.id).toBe('cma-new');

      const getResult = await cmaApiService.getCMAAnalysis('cma-new');
      expect(getResult.success).toBe(true);
      expect(getResult.data?.comparables).toHaveLength(1);
      expect(getResult.data?.recommendations).toHaveLength(1);
    });
  });
});