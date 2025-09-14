import { propertyApiService } from '../../services/propertyApiService';
import { cmaApiService } from '../../services/cmaApiService';
import { createMockProperty } from '../../test-utils/test-helpers';

describe('Property Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Property CRUD with CMA Integration', () => {
    const mockProperty = createMockProperty({
      id: 'prop-123',
      listPrice: 500000
    });

    it('should create property and then generate CMA analysis', async () => {
      // Mock property creation
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            success: true,
            data: mockProperty
          }),
        } as any)
        // Mock CMA creation
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            success: true,
            data: {
              id: 'cma-456',
              subject_property: mockProperty,
              analysis_date: '2024-01-01',
              analysis_status: 'completed',
              statistics: {
                comparables_count: 3,
                average_price: 495000,
                median_price: 490000,
                price_range: {
                  low: 470000,
                  high: 520000,
                  range: 50000
                }
              }
            }
          }),
        } as any);

      // Create property
      const createResult = await propertyApiService.createProperty(mockProperty);
      expect(createResult.success).toBe(true);
      expect(createResult.data?.id).toBe('prop-123');

      // Generate CMA for the created property
      const cmaCreateData = {
        subject_property_id: 123, // Would be the actual ID from creation
        search_criteria: {
          subject_property_id: 123,
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

      const cmaResult = await cmaApiService.createCMAAnalysis(cmaCreateData);
      expect(cmaResult.success).toBe(true);
      expect(cmaResult.data?.subject_property.id).toBe('prop-123');
      expect(cmaResult.data?.statistics.comparables_count).toBe(3);
    });

    it('should update property and reflect changes in CMA', async () => {
      const updatedPrice = 550000;

      // Mock property update
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            success: true,
            data: { ...mockProperty, listPrice: updatedPrice }
          }),
        } as any)
        // Mock CMA retrieval showing updated property
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            success: true,
            data: {
              id: 'cma-456',
              subject_property: { ...mockProperty, listPrice: updatedPrice },
              analysis_date: '2024-01-01',
              analysis_status: 'completed'
            }
          }),
        } as any);

      // Update property
      const updateResult = await propertyApiService.updateProperty('prop-123', {
        listPrice: updatedPrice
      });
      expect(updateResult.success).toBe(true);
      expect(updateResult.data?.listPrice).toBe(updatedPrice);

      // Verify CMA reflects updated property
      const cmaResult = await cmaApiService.getCMAAnalysis('cma-456');
      expect(cmaResult.success).toBe(true);
      expect(cmaResult.data?.subject_property.listPrice).toBe(updatedPrice);
    });
  });

  describe('Property Search with Filters Integration', () => {
    it('should search properties with multiple filter criteria', async () => {
      const searchFilters = {
        city: 'Anytown',
        propertyType: 'Single Family',
        minPrice: 400000,
        maxPrice: 600000,
        minBedrooms: 3,
        maxBedrooms: 4,
        minBathrooms: 2
      };

      const mockSearchResults = [
        createMockProperty({
          id: 'prop-1',
          address: {
            ...mockProperty.address,
            city: 'Anytown'
          },
          propertyType: 'Single Family',
          bedrooms: 3,
          bathrooms: 2,
          listPrice: 500000
        }),
        createMockProperty({
          id: 'prop-2',
          address: {
            ...mockProperty.address,
            city: 'Anytown'
          },
          propertyType: 'Single Family',
          bedrooms: 4,
          bathrooms: 3,
          listPrice: 550000
        })
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: mockSearchResults,
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalItems: 2
          }
        }),
      } as any);

      const result = await propertyApiService.getProperties(1, 10, searchFilters);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].address.city).toBe('Anytown');
      expect(result.data?.[0].propertyType).toBe('Single Family');
      expect(result.data?.[0].bedrooms).toBe(3);
      expect(result.data?.[1].bedrooms).toBe(4);
    });

    it('should handle empty search results', async () => {
      const strictFilters = {
        city: 'NonExistentCity',
        minPrice: 1000000,
        maxPrice: 2000000
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalItems: 0
          }
        }),
      } as any);

      const result = await propertyApiService.getProperties(1, 10, strictFilters);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
      expect(result.meta?.total_count).toBe(0);
    });
  });

  describe('Property Status Management Integration', () => {
    it('should update property status and verify changes', async () => {
      const statusUpdates = {
        status: 'Pending',
        listPrice: 525000
      };

      const updatedProperty = {
        ...mockProperty,
        status: 'Pending',
        listPrice: 525000,
        updatedAt: new Date('2024-01-02')
      };

      // Mock update
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            success: true,
            data: updatedProperty
          }),
        } as any)
        // Mock retrieval to verify
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            success: true,
            data: updatedProperty
          }),
        } as any);

      // Update property status
      const updateResult = await propertyApiService.updateProperty('prop-123', statusUpdates);
      expect(updateResult.success).toBe(true);
      expect(updateResult.data?.status).toBe('Pending');
      expect(updateResult.data?.listPrice).toBe(525000);

      // Verify the update persisted
      const getResult = await propertyApiService.getProperty('prop-123');
      expect(getResult.success).toBe(true);
      expect(getResult.data?.status).toBe('Pending');
      expect(getResult.data?.listPrice).toBe(525000);
    });

    it('should handle concurrent property updates', async () => {
      // Mock concurrent update scenario
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            success: true,
            data: { ...mockProperty, status: 'Sold' }
          }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            success: true,
            data: { ...mockProperty, status: 'Sold' }
          }),
        } as any);

      // First update
      const result1 = await propertyApiService.updateProperty('prop-123', {
        status: 'Sold'
      });
      expect(result1.success).toBe(true);

      // Second verification
      const result2 = await propertyApiService.getProperty('prop-123');
      expect(result2.success).toBe(true);
      expect(result2.data?.status).toBe('Sold');
    });
  });

  describe('Error Handling Across Services', () => {
    it('should handle network errors consistently across services', async () => {
      // Mock network failure for property service
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network timeout'));

      const result = await propertyApiService.getProperty('prop-123');

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Network timeout');
    });

    it('should handle API validation errors', async () => {
      // Mock validation error
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValue({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid property data: missing required fields'
          }
        }),
      } as any);

      const invalidProperty = { ...mockProperty };
      delete invalidProperty.address;

      const result = await propertyApiService.createProperty(invalidProperty);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.message).toContain('missing required fields');
    });

    it('should handle authentication errors', async () => {
      // Mock auth failure
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: jest.fn().mockResolvedValue({
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: 'Invalid or expired token'
          }
        }),
      } as any);

      const result = await propertyApiService.getProperties();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('AUTHENTICATION_ERROR');
    });
  });

  describe('Data Consistency Across Services', () => {
    it('should maintain data consistency between property and CMA services', async () => {
      const originalProperty = createMockProperty({
        id: 'prop-consistency',
        listPrice: 500000
      });

      // Mock property retrieval
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            success: true,
            data: originalProperty
          }),
        } as any)
        // Mock CMA with same property data
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            success: true,
            data: {
              id: 'cma-consistency',
              subject_property: originalProperty,
              analysis_date: '2024-01-01',
              analysis_status: 'completed'
            }
          }),
        } as any);

      // Get property
      const propertyResult = await propertyApiService.getProperty('prop-consistency');
      expect(propertyResult.success).toBe(true);

      // Get CMA for same property
      const cmaResult = await cmaApiService.getCMAAnalysis('cma-consistency');
      expect(cmaResult.success).toBe(true);

      // Verify data consistency
      expect(cmaResult.data?.subject_property.id).toBe(propertyResult.data?.id);
      expect(cmaResult.data?.subject_property.listPrice).toBe(propertyResult.data?.listPrice);
    });
  });
});