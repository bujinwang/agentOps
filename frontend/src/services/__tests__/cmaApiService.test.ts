import AsyncStorage from '@react-native-async-storage/async-storage';
import { cmaApiService } from '../cmaApiService';
import { CMAAPIResponse } from '../../types/cma';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
}));

describe('CMA API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ success: true }),
    } as any);

    // Reset AsyncStorage mocks
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);
  });

  describe('getCMAAnalyses', () => {
    it('should retrieve CMA analyses successfully', async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            id: 'cma-1',
            subject_property: { id: 'prop-1' },
            analysis_date: '2024-01-01',
            analysis_status: 'completed'
          }
        ]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      } as any);

      const result = await cmaApiService.getCMAAnalyses();

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5678/webhook/api/cma/analyses?page=1&page_size=20',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse.data);
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValue({
          success: false,
          error: {
            code: 'CMA_LIST_FAILED',
            message: 'Failed to fetch CMA analyses'
          }
        }),
      } as any);

      const result = await cmaApiService.getCMAAnalyses();

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Failed to fetch CMA analyses');
    });
  });

  describe('getCMAAnalysis', () => {
    it('should retrieve single CMA analysis by ID', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'cma-123',
          subject_property: { id: 'prop-1' },
          analysis_date: '2024-01-01',
          analysis_status: 'completed'
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      } as any);

      const result = await cmaApiService.getCMAAnalysis('cma-123');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5678/webhook/api/cma/analyses/cma-123',
        expect.objectContaining({
          method: 'GET',
        })
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse.data);
    });
  });

  describe('createCMAAnalysis', () => {
    it('should create new CMA analysis successfully', async () => {
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

      const mockResponse = {
        success: true,
        data: {
          id: 'cma-new',
          subject_property: { id: 'prop-1' },
          analysis_date: '2024-01-01',
          analysis_status: 'draft'
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      } as any);

      const result = await cmaApiService.createCMAAnalysis(createData);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5678/webhook/api/cma/analyses',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(createData),
        })
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse.data);
    });
  });

  describe('deleteCMAAnalysis', () => {
    it('should delete CMA analysis successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true
        }),
      } as any);

      const result = await cmaApiService.deleteCMAAnalysis('cma-123');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5678/webhook/api/cma/analyses/cma-123',
        expect.objectContaining({
          method: 'DELETE',
        })
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Authentication', () => {
    it('should include auth token in requests when available', async () => {
      // Mock AsyncStorage to return stored token
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('mock-auth-token');

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
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

    it('should handle missing auth token gracefully', async () => {
      // Mock AsyncStorage to return null (no token)
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      } as any);

      await cmaApiService.getCMAAnalyses();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );

      // Should not include Authorization header when no token
      const callArgs = (global.fetch as jest.Mock).mock.calls[0][1];
      expect(callArgs.headers.Authorization).toBeUndefined();
    });
  });

  describe('Token Management', () => {
    it('should securely store auth token', async () => {
      const testToken = 'test-secure-token';

      await cmaApiService.setAuthToken(testToken);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@cma_auth_token', testToken);
    });

    it('should clear auth token securely', async () => {
      await cmaApiService.clearAuthToken();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@cma_auth_token');
    });

    it('should handle token storage errors gracefully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Storage failed'));

      await expect(cmaApiService.setAuthToken('test-token')).rejects.toThrow('Failed to securely store authentication token');
    });
  });

  describe('Configuration Management', () => {
    it('should set custom base URL', async () => {
      const customUrl = 'https://api.production.com/webhook';

      await cmaApiService.setBaseUrl(customUrl);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@cma_base_url', customUrl);
      expect(cmaApiService.getBaseUrl()).toBe(customUrl);
    });

    it('should validate URL format', async () => {
      const invalidUrl = 'not-a-valid-url';

      await expect(cmaApiService.setBaseUrl(invalidUrl)).rejects.toThrow('Invalid API URL format');
    });

    it('should reset to defaults', async () => {
      await cmaApiService.resetToDefaults();

      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(['@cma_base_url', '@cma_auth_token']);
    });
  });
});