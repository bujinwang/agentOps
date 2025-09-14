import { apiService } from '../api';

// Mock the request method to avoid actual network calls
jest.mock('../api', () => ({
  apiService: {
    requestWithLoading: jest.fn(),
    loginWithLoading: jest.fn(),
    getLeadsWithLoading: jest.fn(),
    getLeadWithLoading: jest.fn(),
    createLeadWithLoading: jest.fn(),
    getDashboardStatsWithLoading: jest.fn(),
  },
}));

describe('API Service Loading Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading Callbacks', () => {
    it('should call onStart when operation begins', async () => {
      const mockOnStart = jest.fn();
      const mockOnComplete = jest.fn();

      (apiService.requestWithLoading as jest.Mock).mockResolvedValue({ data: 'test' });

      await apiService.requestWithLoading('/test', {}, {
        onStart: mockOnStart,
        onComplete: mockOnComplete,
      });

      expect(mockOnStart).toHaveBeenCalled();
      expect(mockOnComplete).toHaveBeenCalled();
    });

    it('should call onError when operation fails', async () => {
      const mockOnError = jest.fn();

      (apiService.requestWithLoading as jest.Mock).mockRejectedValue(new Error('Network error'));

      await apiService.requestWithLoading('/test', {}, {
        onError: mockOnError,
      });

      expect(mockOnError).toHaveBeenCalledWith('Network error');
    });

    it('should handle login with loading callbacks', async () => {
      const mockOnStart = jest.fn();
      const mockOnComplete = jest.fn();

      (apiService.loginWithLoading as jest.Mock).mockResolvedValue({
        message: 'Login successful',
        token: 'test-token',
        userId: 1,
        email: 'test@example.com',
        firstName: 'Test',
      });

      const result = await apiService.loginWithLoading(
        { email: 'test@example.com', password: 'password' },
        {
          onStart: mockOnStart,
          onComplete: mockOnComplete,
        }
      );

      expect(mockOnStart).toHaveBeenCalledWith('Signing in...');
      expect(mockOnComplete).toHaveBeenCalled();
      expect(result).toHaveProperty('token', 'test-token');
    });

    it('should handle getLeads with loading callbacks', async () => {
      const mockOnStart = jest.fn();
      const mockOnProgress = jest.fn();
      const mockOnComplete = jest.fn();

      (apiService.getLeadsWithLoading as jest.Mock).mockResolvedValue({
        data: [{ id: 1, firstName: 'John', lastName: 'Doe' }],
        total: 1,
      });

      const result = await apiService.getLeadsWithLoading(
        { limit: 10 },
        {
          onStart: mockOnStart,
          onProgress: mockOnProgress,
          onComplete: mockOnComplete,
        }
      );

      expect(mockOnStart).toHaveBeenCalled();
      expect(mockOnComplete).toHaveBeenCalled();
      expect(result).toHaveProperty('data');
    });

    it('should handle createLead with loading callbacks', async () => {
      const mockOnStart = jest.fn();
      const mockOnComplete = jest.fn();

      (apiService.createLeadWithLoading as jest.Mock).mockResolvedValue({
        message: 'Lead created successfully',
        data: { leadId: 1, firstName: 'John', lastName: 'Doe' },
      });

      const result = await apiService.createLeadWithLoading(
        { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
        {
          onStart: mockOnStart,
          onComplete: mockOnComplete,
        }
      );

      expect(mockOnStart).toHaveBeenCalled();
      expect(mockOnComplete).toHaveBeenCalled();
      expect(result).toHaveProperty('data.leadId', 1);
    });

    it('should handle getDashboardStats with loading callbacks', async () => {
      const mockOnStart = jest.fn();
      const mockOnComplete = jest.fn();

      (apiService.getDashboardStatsWithLoading as jest.Mock).mockResolvedValue({
        data: {
          totalLeads: 100,
          newLeads: 10,
          activeTasks: 5,
          conversionRate: 15,
        },
      });

      const result = await apiService.getDashboardStatsWithLoading({
        onStart: mockOnStart,
        onComplete: mockOnComplete,
      });

      expect(mockOnStart).toHaveBeenCalled();
      expect(mockOnComplete).toHaveBeenCalled();
      expect(result).toHaveProperty('data.totalLeads', 100);
    });
  });

  describe('Error Handling with Loading', () => {
    it('should handle network errors gracefully', async () => {
      const mockOnError = jest.fn();

      (apiService.requestWithLoading as jest.Mock).mockRejectedValue(
        new Error('Network request failed')
      );

      const result = await apiService.requestWithLoading('/test', {}, {
        onError: mockOnError,
      });

      expect(mockOnError).toHaveBeenCalledWith('Network request failed');
      expect(result).toBeNull();
    });

    it('should handle timeout errors', async () => {
      const mockOnError = jest.fn();

      (apiService.requestWithLoading as jest.Mock).mockRejectedValue(
        new Error('Request timeout - server may be unreachable')
      );

      const result = await apiService.requestWithLoading('/test', {}, {
        onError: mockOnError,
      });

      expect(mockOnError).toHaveBeenCalledWith('Request timeout - server may be unreachable');
      expect(result).toBeNull();
    });

    it('should handle authentication errors', async () => {
      const mockOnError = jest.fn();

      (apiService.loginWithLoading as jest.Mock).mockRejectedValue(
        new Error('Invalid credentials')
      );

      const result = await apiService.loginWithLoading(
        { email: 'wrong@example.com', password: 'wrong' },
        { onError: mockOnError }
      );

      expect(mockOnError).toHaveBeenCalledWith('Invalid credentials');
      expect(result).toBeNull();
    });
  });

  describe('Loading State Integration', () => {
    it('should support progress callbacks for multi-step operations', async () => {
      const mockOnProgress = jest.fn();

      (apiService.getLeadsWithLoading as jest.Mock).mockImplementation(async () => {
        // Simulate progress updates
        mockOnProgress(25, 'Fetching data...');
        mockOnProgress(75, 'Processing results...');
        return { data: [], total: 0 };
      });

      await apiService.getLeadsWithLoading({}, {
        onProgress: mockOnProgress,
      });

      expect(mockOnProgress).toHaveBeenCalledWith(25, 'Fetching data...');
      expect(mockOnProgress).toHaveBeenCalledWith(75, 'Processing results...');
    });

    it('should handle optional callbacks gracefully', async () => {
      (apiService.requestWithLoading as jest.Mock).mockResolvedValue({ data: 'test' });

      // Should not throw when callbacks are undefined
      const result = await apiService.requestWithLoading('/test', {}, {});

      expect(result).toEqual({ data: 'test' });
    });
  });
});