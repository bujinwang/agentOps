import { cmaApiService } from '../../services/cmaApiService';
import { propertyApiService } from '../../services/propertyApiService';

describe('API Workflow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Flow Integration', () => {
    it('should handle authentication consistently across services', async () => {
      // Mock localStorage with auth token
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn().mockReturnValue('mock-auth-token'),
          setItem: jest.fn(),
          removeItem: jest.fn(),
        },
        writable: true,
      });

      // Mock successful responses for both services
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            success: true,
            data: []
          }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            success: true,
            data: []
          }),
        } as any);

      // Test CMA service includes auth token
      await cmaApiService.getCMAAnalyses();

      // Test property service includes auth token
      await propertyApiService.getProperties();

      // Verify both calls included the auth token
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('cma/analyses'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-auth-token',
          }),
        })
      );

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('properties'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-auth-token',
          }),
        })
      );
    });

    it('should handle missing auth token gracefully', async () => {
      // Mock localStorage without token
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn().mockReturnValue(null),
          setItem: jest.fn(),
          removeItem: jest.fn(),
        },
        writable: true,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: []
        }),
      } as any);

      // Services should still work without auth token for read operations
      const cmaResult = await cmaApiService.getCMAAnalyses();
      const propertyResult = await propertyApiService.getProperties();

      expect(cmaResult.success).toBe(true);
      expect(propertyResult.success).toBe(true);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle network errors consistently', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network timeout'));

      const cmaResult = await cmaApiService.getCMAAnalysis('cma-123');

      expect(cmaResult.success).toBe(false);
      expect(cmaResult.error?.message).toBe('Network timeout');
    });

    it('should handle API server errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Database connection failed'
          }
        }),
      } as any);

      const result = await cmaApiService.getCMAAnalysis('cma-123');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('should handle malformed JSON responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as any);

      const result = await cmaApiService.getCMAAnalysis('cma-123');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PARSE_ERROR');
    });
  });

  describe('Request/Response Format Consistency', () => {
    it('should maintain consistent response structure across services', async () => {
      const mockCMAData = {
        id: 'cma-123',
        subject_property: { id: 'prop-1' },
        analysis_date: '2024-01-01',
        analysis_status: 'completed'
      };

      const mockPropertyData = {
        id: 'prop-1',
        address: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345'
        },
        propertyType: 'Single Family',
        listPrice: 500000
      };

      // Mock successful responses
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            success: true,
            data: mockCMAData
          }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            success: true,
            data: mockPropertyData
          }),
        } as any);

      const cmaResult = await cmaApiService.getCMAAnalysis('cma-123');
      const propertyResult = await propertyApiService.getProperty('prop-1');

      // Both should have consistent response structure
      expect(cmaResult).toHaveProperty('success');
      expect(cmaResult).toHaveProperty('data');
      expect(cmaResult.success).toBe(true);

      expect(propertyResult).toHaveProperty('success');
      expect(propertyResult).toHaveProperty('data');
      expect(propertyResult.success).toBe(true);
    });

    it('should handle error responses with consistent structure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Resource not found'
          }
        }),
      } as any);

      const cmaResult = await cmaApiService.getCMAAnalysis('nonexistent');
      const propertyResult = await propertyApiService.getProperty('nonexistent');

      // Both should have consistent error structure
      expect(cmaResult.success).toBe(false);
      expect(cmaResult.error?.code).toBe('NOT_FOUND');

      expect(propertyResult.success).toBe(false);
      expect(propertyResult.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple concurrent API calls', async () => {
      const mockCMAData = { id: 'cma-1', analysis_status: 'completed' };
      const mockPropertyData = { id: 'prop-1', listPrice: 500000 };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            success: true,
            data: mockCMAData
          }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            success: true,
            data: mockPropertyData
          }),
        } as any);

      // Make concurrent requests
      const [cmaResult, propertyResult] = await Promise.all([
        cmaApiService.getCMAAnalysis('cma-1'),
        propertyApiService.getProperty('prop-1')
      ]);

      expect(cmaResult.success).toBe(true);
      expect(propertyResult.success).toBe(true);
      expect(cmaResult.data?.id).toBe('cma-1');
      expect(propertyResult.data?.id).toBe('prop-1');
    });

    it('should handle mixed success/failure concurrent requests', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            success: true,
            data: { id: 'cma-1' }
          }),
        } as any)
        .mockResolvedValueOnce({
          ok: false,
          json: jest.fn().mockResolvedValue({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Property not found' }
          }),
        } as any);

      const [cmaResult, propertyResult] = await Promise.all([
        cmaApiService.getCMAAnalysis('cma-1'),
        propertyApiService.getProperty('nonexistent')
      ]);

      expect(cmaResult.success).toBe(true);
      expect(propertyResult.success).toBe(false);
      expect(propertyResult.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('Service Interoperability', () => {
    it('should allow CMA service to reference property service data', async () => {
      const propertyData = {
        id: 'prop-123',
        address: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345'
        },
        propertyType: 'Single Family',
        listPrice: 500000
      };

      const cmaData = {
        id: 'cma-456',
        subject_property: propertyData,
        analysis_date: '2024-01-01',
        analysis_status: 'completed',
        statistics: {
          comparables_count: 3,
          average_price: 495000
        }
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            success: true,
            data: propertyData
          }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            success: true,
            data: cmaData
          }),
        } as any);

      // Get property first
      const propertyResult = await propertyApiService.getProperty('prop-123');
      expect(propertyResult.success).toBe(true);

      // Then get CMA that references the same property
      const cmaResult = await cmaApiService.getCMAAnalysis('cma-456');
      expect(cmaResult.success).toBe(true);

      // Verify the CMA references the correct property
      expect(cmaResult.data?.subject_property.id).toBe(propertyResult.data?.id);
      expect(cmaResult.data?.subject_property.listPrice).toBe(propertyResult.data?.listPrice);
    });
  });

  describe('Rate Limiting and Throttling', () => {
    it('should handle rate limiting responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: jest.fn().mockResolvedValue({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
            retryAfter: 60
          }
        }),
      } as any);

      const result = await cmaApiService.getCMAAnalyses();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });
});