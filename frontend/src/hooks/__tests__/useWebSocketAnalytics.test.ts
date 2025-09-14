import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useWebSocketAnalytics } from '../useWebSocketAnalytics';

// Mock the websocket service
jest.mock('../../services/websocket', () => ({
  websocketService: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    isConnected: false,
    onConversionUpdate: jest.fn(),
    onLeadUpdate: jest.fn(),
    onKPIUpdate: jest.fn(),
    onNotification: jest.fn(),
  },
}));

const { websocketService } = require('../../services/websocket');

describe('useWebSocketAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    websocketService.isConnected = false;
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useWebSocketAnalytics());

    expect(result.current.analyticsData).toEqual({
      dashboardStats: null,
      leadStats: null,
      conversionFunnel: [],
      conversionMetrics: null,
      isConnected: false,
      lastUpdate: null,
    });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should connect to WebSocket on mount', async () => {
    websocketService.connect.mockResolvedValue(undefined);
    websocketService.onConversionUpdate.mockReturnValue(jest.fn());
    websocketService.onLeadUpdate.mockReturnValue(jest.fn());
    websocketService.onKPIUpdate.mockReturnValue(jest.fn());
    websocketService.onNotification.mockReturnValue(jest.fn());

    const { result } = renderHook(() => useWebSocketAnalytics());

    await waitFor(() => {
      expect(websocketService.connect).toHaveBeenCalled();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.analyticsData.isConnected).toBe(true);
  });

  it('should handle connection errors', async () => {
    const connectionError = new Error('Connection failed');
    websocketService.connect.mockRejectedValue(connectionError);

    const { result } = renderHook(() => useWebSocketAnalytics());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Connection failed');
    expect(result.current.analyticsData.isConnected).toBe(false);
  });

  it('should handle conversion updates', async () => {
    websocketService.connect.mockResolvedValue(undefined);
    websocketService.onConversionUpdate.mockReturnValue(jest.fn());
    websocketService.onLeadUpdate.mockReturnValue(jest.fn());
    websocketService.onKPIUpdate.mockReturnValue(jest.fn());
    websocketService.onNotification.mockReturnValue(jest.fn());

    const { result } = renderHook(() => useWebSocketAnalytics());

    await waitFor(() => {
      expect(websocketService.connect).toHaveBeenCalled();
    });

    // Simulate conversion update
    const mockConversionData = {
      stage_name: 'Qualified',
      change_type: 'new_lead',
      total_value: 50000,
      avg_probability: 0.8,
    };

    // Get the callback that was registered
    const conversionCallback = websocketService.onConversionUpdate.mock.calls[0][0];

    act(() => {
      conversionCallback(mockConversionData);
    });

    expect(result.current.analyticsData.lastUpdate).toBeInstanceOf(Date);
  });

  it('should handle lead updates', async () => {
    websocketService.connect.mockResolvedValue(undefined);
    websocketService.onConversionUpdate.mockReturnValue(jest.fn());
    websocketService.onLeadUpdate.mockReturnValue(jest.fn());
    websocketService.onKPIUpdate.mockReturnValue(jest.fn());
    websocketService.onNotification.mockReturnValue(jest.fn());

    const { result } = renderHook(() => useWebSocketAnalytics());

    await waitFor(() => {
      expect(websocketService.connect).toHaveBeenCalled();
    });

    // Simulate lead update
    const mockLeadData = {
      previous_status: 'New',
      new_status: 'Contacted',
    };

    // Get the callback that was registered
    const leadCallback = websocketService.onLeadUpdate.mock.calls[0][0];

    act(() => {
      leadCallback(mockLeadData);
    });

    expect(result.current.analyticsData.lastUpdate).toBeInstanceOf(Date);
  });

  it('should handle KPI updates', async () => {
    websocketService.connect.mockResolvedValue(undefined);
    websocketService.onConversionUpdate.mockReturnValue(jest.fn());
    websocketService.onLeadUpdate.mockReturnValue(jest.fn());
    websocketService.onKPIUpdate.mockReturnValue(jest.fn());
    websocketService.onNotification.mockReturnValue(jest.fn());

    const { result } = renderHook(() => useWebSocketAnalytics());

    await waitFor(() => {
      expect(websocketService.connect).toHaveBeenCalled();
    });

    // Simulate KPI update
    const mockKPIData = {
      metric_name: 'total_leads',
      new_value: 150,
    };

    // Get the callback that was registered
    const kpiCallback = websocketService.onKPIUpdate.mock.calls[0][0];

    act(() => {
      kpiCallback(mockKPIData);
    });

    expect(result.current.analyticsData.lastUpdate).toBeInstanceOf(Date);
  });

  it('should provide reconnect functionality', async () => {
    websocketService.connect.mockResolvedValue(undefined);
    websocketService.disconnect.mockReturnValue(undefined);

    const { result } = renderHook(() => useWebSocketAnalytics());

    await waitFor(() => {
      expect(websocketService.connect).toHaveBeenCalled();
    });

    // Test reconnect
    await act(async () => {
      await result.current.reconnect();
    });

    expect(websocketService.disconnect).toHaveBeenCalled();
    expect(websocketService.connect).toHaveBeenCalledTimes(2);
  });

  it('should provide disconnect functionality', () => {
    const { result } = renderHook(() => useWebSocketAnalytics());

    act(() => {
      result.current.disconnect();
    });

    expect(websocketService.disconnect).toHaveBeenCalled();
    expect(result.current.analyticsData.isConnected).toBe(false);
  });

  it('should monitor connection status', async () => {
    websocketService.connect.mockResolvedValue(undefined);
    websocketService.isConnected = true;

    const { result } = renderHook(() => useWebSocketAnalytics());

    await waitFor(() => {
      expect(websocketService.connect).toHaveBeenCalled();
    });

    // Simulate connection status change
    websocketService.isConnected = false;

    // Wait for the monitoring interval to check status
    await waitFor(() => {
      expect(result.current.analyticsData.isConnected).toBe(false);
    }, { timeout: 6000 });
  });

  it('should cleanup on unmount', () => {
    const mockUnsubscribe = jest.fn();
    websocketService.onConversionUpdate.mockReturnValue(mockUnsubscribe);
    websocketService.onLeadUpdate.mockReturnValue(mockUnsubscribe);
    websocketService.onKPIUpdate.mockReturnValue(mockUnsubscribe);
    websocketService.onNotification.mockReturnValue(mockUnsubscribe);

    const { unmount } = renderHook(() => useWebSocketAnalytics());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(4); // All event listeners
    expect(websocketService.disconnect).toHaveBeenCalled();
  });
});