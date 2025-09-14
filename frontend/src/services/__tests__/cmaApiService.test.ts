import { cmaApiService } from '../cmaApiService';
import { CMAAPIResponse } from '../../types/cma';

describe('CMA API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ success: true }),
    } as any);
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
      // Mock localStorage
      const localStorageMock = {
        getItem: jest.fn().mockReturnValue('mock-auth-token'),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      };
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        writable: true,
      });

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
  });
});