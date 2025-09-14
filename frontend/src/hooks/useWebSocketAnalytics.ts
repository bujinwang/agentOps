import { useEffect, useState, useCallback } from 'react';
import { websocketService, ConversionUpdateData, LeadUpdateData, KPIUpdateData } from '../services/websocket';

interface AnalyticsState {
  dashboardStats: any;
  leadStats: any;
  conversionFunnel: any[];
  conversionMetrics: any;
  isConnected: boolean;
  lastUpdate: Date | null;
}

interface UseWebSocketAnalyticsReturn {
  analyticsData: AnalyticsState;
  isLoading: boolean;
  error: string | null;
  reconnect: () => Promise<void>;
  disconnect: () => void;
}

export const useWebSocketAnalytics = (): UseWebSocketAnalyticsReturn => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsState>({
    dashboardStats: null,
    leadStats: null,
    conversionFunnel: [],
    conversionMetrics: null,
    isConnected: false,
    lastUpdate: null,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Handle conversion updates
  const handleConversionUpdate = useCallback((data: ConversionUpdateData) => {
    console.log('Conversion update received:', data);

    setAnalyticsData(prev => ({
      ...prev,
      conversionFunnel: prev.conversionFunnel.map(stage =>
        stage.stage_name === data.stage_name
          ? {
              ...stage,
              lead_count: data.change_type === 'new_lead'
                ? stage.lead_count + 1
                : stage.lead_count,
              total_value: data.change_type === 'value_update'
                ? stage.total_value + (data.total_value || 0)
                : stage.total_value,
              avg_probability: data.change_type === 'stage_change'
                ? data.avg_probability
                : stage.avg_probability,
            }
          : stage
      ),
      lastUpdate: new Date(),
    }));
  }, []);

  // Handle lead updates
  const handleLeadUpdate = useCallback((data: LeadUpdateData) => {
    console.log('Lead update received:', data);

    setAnalyticsData(prev => ({
      ...prev,
      leadStats: prev.leadStats ? {
        ...prev.leadStats,
        leadsByStatus: prev.leadStats.leadsByStatus.map((status: any) =>
          status.status === data.previous_status
            ? { ...status, count: Math.max(0, status.count - 1) }
            : status.status === data.new_status
            ? { ...status, count: status.count + 1 }
            : status
        ),
      } : prev.leadStats,
      lastUpdate: new Date(),
    }));
  }, []);

  // Handle KPI updates
  const handleKPIUpdate = useCallback((data: KPIUpdateData) => {
    console.log('KPI update received:', data);

    setAnalyticsData(prev => ({
      ...prev,
      dashboardStats: prev.dashboardStats ? {
        ...prev.dashboardStats,
        [data.metric_name]: data.new_value,
      } : prev.dashboardStats,
      lastUpdate: new Date(),
    }));
  }, []);

  // Handle notifications
  const handleNotification = useCallback((data: any) => {
    console.log('Notification received:', data);
    // Handle notifications (e.g., show toast, update UI)
  }, []);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      await websocketService.connect();

      setAnalyticsData(prev => ({
        ...prev,
        isConnected: true,
      }));

      console.log('WebSocket connected for analytics');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to real-time updates';
      setError(errorMessage);
      console.error('WebSocket connection failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    websocketService.disconnect();
    setAnalyticsData(prev => ({
      ...prev,
      isConnected: false,
    }));
  }, []);

  // Reconnect to WebSocket
  const reconnect = useCallback(async () => {
    disconnect();
    await connect();
  }, [connect, disconnect]);

  // Set up WebSocket event listeners
  useEffect(() => {
    const unsubscribeConversion = websocketService.onConversionUpdate(handleConversionUpdate);
    const unsubscribeLead = websocketService.onLeadUpdate(handleLeadUpdate);
    const unsubscribeKPI = websocketService.onKPIUpdate(handleKPIUpdate);
    const unsubscribeNotification = websocketService.onNotification(handleNotification);

    // Connect on mount
    connect();

    // Cleanup on unmount
    return () => {
      unsubscribeConversion();
      unsubscribeLead();
      unsubscribeKPI();
      unsubscribeNotification();
      disconnect();
    };
  }, [connect, disconnect, handleConversionUpdate, handleLeadUpdate, handleKPIUpdate, handleNotification]);

  // Monitor connection status
  useEffect(() => {
    const checkConnection = () => {
      const isConnected = websocketService.isConnected;
      setAnalyticsData(prev => ({
        ...prev,
        isConnected,
      }));
    };

    const interval = setInterval(checkConnection, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);

  return {
    analyticsData,
    isLoading,
    error,
    reconnect,
    disconnect,
  };
};