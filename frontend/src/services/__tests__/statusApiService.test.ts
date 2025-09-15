import { statusApiService } from '../statusApiService';
import { StatusChangeRequest } from '../../types/status';
import { PropertyStatus } from '../../types/property';

// Mock fetch globally
global.fetch = jest.fn();

describe('StatusApiService', () => {
  beforeEach(() => {
    // Clear sessionStorage
    sessionStorage.clear();
    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('changePropertyStatus', () => {
    const mockRequest: StatusChangeRequest = {
      property_id: 123,
      new_status: 'sold' as PropertyStatus,
      change_reason: 'property_sold',
      notes: 'Property sold',
      requires_approval: false
    };

    it('should successfully change property status', async () => {
      const mockResponse = {
        success: true,
        data: { id: 1, property_id: 123, new_status: 'sold' }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await statusApiService.changePropertyStatus(123, mockRequest);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse.data);
    });

    it('should handle API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad Request')
      });

      const result = await statusApiService.changePropertyStatus(123, mockRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('HTTP_ERROR');
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await statusApiService.changePropertyStatus(123, mockRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('STATUS_CHANGE_FAILED');
    });
  });

  describe('validateStatusTransition', () => {
    it('should validate status transition successfully', async () => {
      const mockResponse = {
        isValid: true,
        errors: [],
        warnings: [],
        infos: []
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await statusApiService.validateStatusTransition(123, 'available', 'pending', 'agent');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle invalid transitions', async () => {
      const mockResponse = {
        isValid: false,
        errors: [{ message: 'Invalid transition', severity: 'error' }],
        warnings: [],
        infos: []
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await statusApiService.validateStatusTransition(123, 'available', 'invalid', 'agent');

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('getPropertyStatusHistory', () => {
    it('should retrieve status history with options', async () => {
      const mockResponse = {
        success: true,
        data: {
          propertyId: 123,
          history: [],
          totalCount: 0
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await statusApiService.getPropertyStatusHistory(123, {
        limit: 10,
        startDate: '2024-01-01'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('bulkChangeStatus', () => {
    it('should perform bulk status change', async () => {
      const mockOperation = {
        operation_id: 'bulk-123',
        property_ids: [1, 2, 3],
        new_status: 'sold' as PropertyStatus,
        change_reason: 'manual_update' as const,
        notes: 'Bulk update',
        created_by: 1
      };

      const mockResponse = {
        success: true,
        data: { operation_id: 'bulk-123', status: 'completed' }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await statusApiService.bulkChangeStatus(mockOperation);

      expect(result.success).toBe(true);
      expect(result.data?.operation_id).toBe('bulk-123');
    });
  });

  describe('getStatusAnalytics', () => {
    it('should retrieve status analytics', async () => {
      const mockResponse = {
        success: true,
        data: {
          totalChanges: 150,
          averageTimeInStatus: 30,
          statusDistribution: {}
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await statusApiService.getStatusAnalytics(123, {
        period: 'month',
        startDate: '2024-01-01'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('export operations', () => {
    it('should export status history', async () => {
      const mockBlob = new Blob(['test,csv,data'], { type: 'text/csv' });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob)
      });

      const result = await statusApiService.exportStatusHistory(123, 'csv', {
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      });

      expect(result).toBeInstanceOf(Blob);
    });

    it('should export status analytics', async () => {
      const mockBlob = new Blob(['analytics,pdf,data'], { type: 'application/pdf' });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob)
      });

      const result = await statusApiService.exportStatusAnalytics('pdf', {
        period: 'quarter'
      });

      expect(result).toBeInstanceOf(Blob);
    });
  });
});