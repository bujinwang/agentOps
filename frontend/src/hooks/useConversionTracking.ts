import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ConversionEvent,
  ConversionTimeline,
  ConversionFunnelData,
  ConversionMetrics,
  ConversionEventTemplate,
  CONVERSION_EVENT_TEMPLATES
} from '../types/conversion';
import { conversionTrackingService } from '../services/conversionTrackingService';
import { conversionMetricsService, FunnelAnalytics } from '../services/conversionMetricsService';

export interface UseConversionTrackingOptions {
  enableRealTimeUpdates?: boolean;
  autoRefreshInterval?: number; // in milliseconds
  cacheResults?: boolean;
}

export interface ConversionTrackingState {
  // Core data
  funnelData: ConversionFunnelData | null;
  metrics: ConversionMetrics | null;
  analytics: FunnelAnalytics | null;

  // Loading states
  isLoadingFunnel: boolean;
  isLoadingMetrics: boolean;
  isLoadingAnalytics: boolean;

  // Error states
  funnelError: string | null;
  metricsError: string | null;
  analyticsError: string | null;

  // Real-time updates
  lastUpdated: Date | null;
  isRealTimeEnabled: boolean;
}

export interface ConversionTrackingActions {
  // Event logging
  logConversionEvent: (
    leadId: number,
    eventType: ConversionEvent['eventType'],
    eventDescription: string,
    eventData?: Record<string, any>,
    userId?: number
  ) => Promise<{ success: boolean; eventId?: number; newStage?: string; error?: string }>;

  // Data fetching
  refreshFunnelData: () => Promise<void>;
  refreshMetrics: (dateRange?: { start: string; end: string }) => Promise<void>;
  refreshAnalytics: () => Promise<void>;
  refreshAll: () => Promise<void>;

  // Configuration
  updateRealTimeEnabled: (enabled: boolean) => void;
  updateRefreshInterval: (interval: number) => void;

  // Utility
  getEventTemplate: (eventType: string) => ConversionEventTemplate | undefined;
  getAvailableEventTypes: () => ConversionEventTemplate[];
}

export const useConversionTracking = (options: UseConversionTrackingOptions = {}) => {
  const {
    enableRealTimeUpdates = true,
    autoRefreshInterval = 30000, // 30 seconds
    cacheResults = true
  } = options;

  // State management
  const [state, setState] = useState<ConversionTrackingState>({
    funnelData: null,
    metrics: null,
    analytics: null,
    isLoadingFunnel: false,
    isLoadingMetrics: false,
    isLoadingAnalytics: false,
    funnelError: null,
    metricsError: null,
    analyticsError: null,
    lastUpdated: null,
    isRealTimeEnabled: enableRealTimeUpdates
  });

  // Refs for cleanup and timers
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Update state helper
  const updateState = useCallback((updates: Partial<ConversionTrackingState>) => {
    if (isMountedRef.current) {
      setState(prev => ({ ...prev, ...updates }));
    }
  }, []);

  // Load funnel data
  const loadFunnelData = useCallback(async () => {
    updateState({ isLoadingFunnel: true, funnelError: null });

    try {
      const funnelData = await conversionTrackingService.calculateConversionFunnel();

      if (isMountedRef.current) {
        updateState({
          funnelData,
          isLoadingFunnel: false,
          lastUpdated: new Date()
        });
      }
    } catch (error) {
      console.error('Failed to load funnel data:', error);
      updateState({
        funnelError: error instanceof Error ? error.message : 'Failed to load funnel data',
        isLoadingFunnel: false
      });
    }
  }, [updateState]);

  // Load metrics data
  const loadMetricsData = useCallback(async (dateRange?: { start: string; end: string }) => {
    updateState({ isLoadingMetrics: true, metricsError: null });

    try {
      const metrics = await conversionTrackingService.getConversionMetrics(dateRange);

      if (isMountedRef.current) {
        updateState({
          metrics,
          isLoadingMetrics: false,
          lastUpdated: new Date()
        });
      }
    } catch (error) {
      console.error('Failed to load metrics data:', error);
      updateState({
        metricsError: error instanceof Error ? error.message : 'Failed to load metrics data',
        isLoadingMetrics: false
      });
    }
  }, [updateState]);

  // Load analytics data
  const loadAnalyticsData = useCallback(async () => {
    updateState({ isLoadingAnalytics: true, analyticsError: null });

    try {
      const analytics = await conversionMetricsService.calculateFunnelAnalytics();

      if (isMountedRef.current) {
        updateState({
          analytics,
          isLoadingAnalytics: false,
          lastUpdated: new Date()
        });
      }
    } catch (error) {
      console.error('Failed to load analytics data:', error);
      updateState({
        analyticsError: error instanceof Error ? error.message : 'Failed to load analytics data',
        isLoadingAnalytics: false
      });
    }
  }, [updateState]);

  // Log conversion event
  const logConversionEvent = useCallback(async (
    leadId: number,
    eventType: ConversionEvent['eventType'],
    eventDescription: string,
    eventData?: Record<string, any>,
    userId?: number
  ) => {
    try {
      const result = await conversionTrackingService.logConversionEvent(
        leadId,
        eventType,
        eventDescription,
        eventData,
        userId
      );

      // Refresh data after successful event logging
      if (result.success) {
        await Promise.all([
          loadFunnelData(),
          loadMetricsData(),
          loadAnalyticsData()
        ]);
      }

      return result;
    } catch (error) {
      console.error('Failed to log conversion event:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to log conversion event'
      };
    }
  }, [loadFunnelData, loadMetricsData, loadAnalyticsData]);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    await Promise.all([
      loadFunnelData(),
      loadMetricsData(),
      loadAnalyticsData()
    ]);
  }, [loadFunnelData, loadMetricsData, loadAnalyticsData]);

  // Setup auto-refresh timer
  const setupAutoRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }

    if (state.isRealTimeEnabled && autoRefreshInterval > 0) {
      refreshTimerRef.current = setInterval(() => {
        refreshAll();
      }, autoRefreshInterval);
    }
  }, [state.isRealTimeEnabled, autoRefreshInterval, refreshAll]);

  // Update real-time enabled state
  const updateRealTimeEnabled = useCallback((enabled: boolean) => {
    updateState({ isRealTimeEnabled: enabled });
  }, [updateState]);

  // Update refresh interval
  const updateRefreshInterval = useCallback((interval: number) => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }

    if (state.isRealTimeEnabled && interval > 0) {
      refreshTimerRef.current = setInterval(() => {
        refreshAll();
      }, interval);
    }
  }, [state.isRealTimeEnabled, refreshAll]);

  // Get event template by type
  const getEventTemplate = useCallback((eventType: string): ConversionEventTemplate | undefined => {
    return CONVERSION_EVENT_TEMPLATES.find(template => template.type === eventType);
  }, []);

  // Get all available event types
  const getAvailableEventTypes = useCallback((): ConversionEventTemplate[] => {
    return CONVERSION_EVENT_TEMPLATES;
  }, []);

  // Initial data load
  useEffect(() => {
    refreshAll();
  }, []); // Only run once on mount

  // Setup auto-refresh when real-time settings change
  useEffect(() => {
    setupAutoRefresh();

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [setupAutoRefresh]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, []);

  // Actions object
  const actions: ConversionTrackingActions = {
    logConversionEvent,
    refreshFunnelData: loadFunnelData,
    refreshMetrics: loadMetricsData,
    refreshAnalytics: loadAnalyticsData,
    refreshAll,
    updateRealTimeEnabled,
    updateRefreshInterval,
    getEventTemplate,
    getAvailableEventTypes
  };

  return {
    ...state,
    ...actions
  };
};

export default useConversionTracking;