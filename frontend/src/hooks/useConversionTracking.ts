import { useState, useEffect, useCallback } from 'react';
import {
  ConversionEvent,
  ConversionTimeline,
  ConversionFunnelData,
  ConversionMetrics,
  ConversionEventTemplate,
  CONVERSION_EVENT_TEMPLATES
} from '../types/conversion';
import { conversionApiService, ConversionEventData, ConversionStatusUpdate } from '../services/conversionApiService';

interface UseConversionTrackingOptions {
  leadId?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface ConversionTrackingState {
  timeline: ConversionTimeline | null;
  funnelData: ConversionFunnelData | null;
  metrics: ConversionMetrics | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export const useConversionTracking = (options: UseConversionTrackingOptions = {}) => {
  const { leadId, autoRefresh = false, refreshInterval = 30000 } = options;

  const [state, setState] = useState<ConversionTrackingState>({
    timeline: null,
    funnelData: null,
    metrics: null,
    isLoading: false,
    error: null,
    lastUpdated: null
  });

  // Load conversion timeline for a specific lead
  const loadTimeline = useCallback(async (targetLeadId?: number) => {
    const id = targetLeadId || leadId;
    if (!id) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await conversionApiService.getConversionTimeline(id);
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          timeline: response.data!,
          isLoading: false,
          lastUpdated: new Date()
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: response.message,
          isLoading: false
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load timeline',
        isLoading: false
      }));
    }
  }, [leadId]);

  // Load conversion funnel analytics
  const loadFunnelData = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await conversionApiService.getConversionFunnel();
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          funnelData: response.data!,
          isLoading: false,
          lastUpdated: new Date()
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: response.message,
          isLoading: false
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load funnel data',
        isLoading: false
      }));
    }
  }, []);

  // Load conversion metrics
  const loadMetrics = useCallback(async (dateRange?: { start: string; end: string }) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await conversionApiService.getConversionMetrics(dateRange);
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          metrics: {
            ...response.data!,
            conversionTrends: (response.data! as any).conversionTrends || [],
            topConversionStages: (response.data!.topConversionStages || []).map((stage: any) => ({
              ...stage,
              percentage: stage.percentage || 0
            }))
          } as ConversionMetrics,
          isLoading: false,
          lastUpdated: new Date()
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: response.message,
          isLoading: false
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load metrics',
        isLoading: false
      }));
    }
  }, []);

  // Log a conversion event
  const logEvent = useCallback(async (
    eventData: ConversionEventData,
    targetLeadId?: number
  ) => {
    const id = targetLeadId || leadId;
    if (!id) {
      setState(prev => ({
        ...prev,
        error: 'No lead ID provided for event logging'
      }));
      return null;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await conversionApiService.logConversionEvent(id, eventData);
      if (response.success) {
        // Refresh timeline after logging event
        await loadTimeline(id);
        setState(prev => ({ ...prev, isLoading: false }));
        return response.data;
      } else {
        setState(prev => ({
          ...prev,
          error: response.message,
          isLoading: false
        }));
        return null;
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to log event',
        isLoading: false
      }));
      return null;
    }
  }, [leadId, loadTimeline]);

  // Update conversion status
  const updateStatus = useCallback(async (
    statusUpdate: ConversionStatusUpdate,
    targetLeadId?: number
  ) => {
    const id = targetLeadId || leadId;
    if (!id) {
      setState(prev => ({
        ...prev,
        error: 'No lead ID provided for status update'
      }));
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await conversionApiService.updateConversionStatus(id, statusUpdate);
      if (response.success) {
        // Refresh timeline after status update
        await loadTimeline(id);
        setState(prev => ({ ...prev, isLoading: false }));
        return true;
      } else {
        setState(prev => ({
          ...prev,
          error: response.message,
          isLoading: false
        }));
        return false;
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update status',
        isLoading: false
      }));
      return false;
    }
  }, [leadId, loadTimeline]);

  // Batch log multiple events
  const batchLogEvents = useCallback(async (
    events: Array<{ leadId: number; eventData: ConversionEventData }>
  ) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await conversionApiService.batchLogConversionEvents(events);
      if (response.success) {
        // Refresh data after batch logging
        if (leadId) await loadTimeline(leadId);
        setState(prev => ({ ...prev, isLoading: false }));
        return response.data;
      } else {
        setState(prev => ({
          ...prev,
          error: response.message,
          isLoading: false
        }));
        return null;
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to batch log events',
        isLoading: false
      }));
      return null;
    }
  }, [leadId, loadTimeline]);

  // Clear error state
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Refresh all data
  const refresh = useCallback(async () => {
    if (leadId) await loadTimeline(leadId);
    await loadFunnelData();
    await loadMetrics();
  }, [leadId, loadTimeline, loadFunnelData, loadMetrics]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refresh();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refresh]);

  // Initial load
  useEffect(() => {
    if (leadId) {
      loadTimeline(leadId);
    }
    loadFunnelData();
    loadMetrics();
  }, [leadId, loadTimeline, loadFunnelData, loadMetrics]);

  return {
    // State
    ...state,

    // Actions
    loadTimeline,
    loadFunnelData,
    loadMetrics,
    logEvent,
    updateStatus,
    batchLogEvents,
    clearError,
    refresh,

    // Utilities
    eventTemplates: CONVERSION_EVENT_TEMPLATES,
    getEventTemplate: (type: ConversionEvent['eventType']) =>
      CONVERSION_EVENT_TEMPLATES.find(template => template.type === type)
  };
};

export default useConversionTracking;