import { useState, useEffect, useCallback, useRef } from 'react';
import websocketService, { ConversionNotification } from '../services/websocketService';
import notificationService from '../services/notificationService';
import { useConversionTracking } from './useConversionTracking';
import { ConversionEvent, ConversionTimeline } from '../types/conversion';

interface UseRealTimeConversionTrackingOptions {
  leadId?: number;
  enableNotifications?: boolean;
  enableWebSocket?: boolean;
}

interface RealTimeConversionState {
  isConnected: boolean;
  lastUpdate: Date | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  notifications: ConversionNotification[];
  unreadCount: number;
}

export const useRealTimeConversionTracking = (options: UseRealTimeConversionTrackingOptions = {}) => {
  const {
    leadId,
    enableNotifications = true,
    enableWebSocket = true
  } = options;

  const [state, setState] = useState<RealTimeConversionState>({
    isConnected: false,
    lastUpdate: null,
    connectionStatus: 'connecting',
    notifications: [],
    unreadCount: 0
  });

  const conversionTracking = useConversionTracking({
    leadId,
    autoRefresh: false // We'll handle refresh manually for real-time updates
  });

  const lastEventRef = useRef<ConversionEvent | null>(null);
  const lastProbabilityRef = useRef<number | null>(null);

  // Handle WebSocket connection status
  useEffect(() => {
    if (!enableWebSocket) return;

    const handleConnected = () => {
      setState(prev => ({
        ...prev,
        isConnected: true,
        connectionStatus: 'connected'
      }));

      // Subscribe to lead-specific updates if leadId is provided
      if (leadId) {
        websocketService.subscribeToLead(leadId);
      }

      // Subscribe to funnel updates
      websocketService.subscribeToFunnelUpdates();
    };

    const handleDisconnected = () => {
      setState(prev => ({
        ...prev,
        isConnected: false,
        connectionStatus: 'disconnected'
      }));
    };

    const handleError = () => {
      setState(prev => ({
        ...prev,
        connectionStatus: 'error'
      }));
    };

    // Set up WebSocket event listeners
    websocketService.on('connected', handleConnected);
    websocketService.on('disconnected', handleDisconnected);
    websocketService.on('error', handleError);

    // Check initial connection status
    if (websocketService.isWebSocketConnected()) {
      handleConnected();
    }

    // Cleanup
    return () => {
      websocketService.off('connected', handleConnected);
      websocketService.off('disconnected', handleDisconnected);
      websocketService.off('error', handleError);
    };
  }, [enableWebSocket, leadId]);

  // Handle real-time conversion events
  useEffect(() => {
    if (!enableWebSocket) return;

    const handleConversionEvent = (eventData: any) => {
      console.log('Real-time conversion event received:', eventData);

      // Update local state
      setState(prev => ({
        ...prev,
        lastUpdate: new Date()
      }));

      // Refresh conversion data
      if (leadId) {
        conversionTracking.loadTimeline(leadId);
      }
      conversionTracking.loadFunnelData();
      conversionTracking.loadMetrics();

      // Create notification for the event
      if (enableNotifications && eventData.leadName) {
        notificationService.addMilestoneNotification(
          eventData.leadId || leadId!,
          eventData.leadName,
          eventData.eventType?.replace(/_/g, ' ') || 'Conversion Event',
          `New conversion event: ${eventData.eventDescription || 'Event logged'}`
        );
      }

      // Store last event for comparison
      if (eventData.id) {
        lastEventRef.current = eventData;
      }
    };

    const handleStatusUpdate = (updateData: any) => {
      console.log('Real-time status update received:', updateData);

      setState(prev => ({
        ...prev,
        lastUpdate: new Date()
      }));

      // Refresh data
      if (leadId) {
        conversionTracking.loadTimeline(leadId);
      }

      // Notify about status change
      if (enableNotifications && updateData.leadName && updateData.newStatus) {
        notificationService.addMilestoneNotification(
          updateData.leadId || leadId!,
          updateData.leadName,
          'Status Update',
          `Lead status changed to: ${updateData.newStatus.replace(/_/g, ' ')}`
        );
      }
    };

    const handleFunnelUpdate = (funnelData: any) => {
      console.log('Real-time funnel update received:', funnelData);

      setState(prev => ({
        ...prev,
        lastUpdate: new Date()
      }));

      // Refresh funnel data
      conversionTracking.loadFunnelData();
      conversionTracking.loadMetrics();
    };

    // Set up WebSocket message listeners
    websocketService.on('conversion_event', handleConversionEvent);
    websocketService.on('status_update', handleStatusUpdate);
    websocketService.on('funnel_update', handleFunnelUpdate);

    // Cleanup
    return () => {
      websocketService.off('conversion_event', handleConversionEvent);
      websocketService.off('status_update', handleStatusUpdate);
      websocketService.off('funnel_update', handleFunnelUpdate);
    };
  }, [enableWebSocket, enableNotifications, leadId, conversionTracking]);

  // Handle notifications
  useEffect(() => {
    if (!enableNotifications) return;

    const handleNotificationsChange = (notifications: ConversionNotification[]) => {
      setState(prev => ({
        ...prev,
        notifications,
        unreadCount: notifications.filter(n => !n.isRead).length
      }));
    };

    // Subscribe to notification changes
    const unsubscribe = notificationService.onNotificationsChange(handleNotificationsChange);

    // Load initial notifications
    handleNotificationsChange(notificationService.getNotifications());

    return unsubscribe;
  }, [enableNotifications]);

  // Monitor for conversion probability changes and time-based alerts
  useEffect(() => {
    if (!enableNotifications || !leadId) return;

    const checkForAlerts = () => {
      const timeline = conversionTracking.timeline;

      if (!timeline || !timeline.events.length) return;

      const lastEvent = timeline.events[0]; // Most recent event
      const daysInFunnel = Math.floor(
        (Date.now() - new Date(lastEvent.eventTimestamp).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Time-based warnings
      if (daysInFunnel > 14 && lastEvent.eventType === 'contact_made') {
        notificationService.addTimeWarningNotification(
          leadId,
          'Lead', // We don't have the name here, but could be enhanced
          daysInFunnel,
          'Contact Made'
        );
      }

      if (daysInFunnel > 30 && ['qualified', 'showing_scheduled'].includes(lastEvent.eventType)) {
        notificationService.addStagnationAlertNotification(
          leadId,
          'Lead',
          lastEvent.eventType.replace(/_/g, ' '),
          daysInFunnel
        );
      }

      // Store last event for comparison
      if (lastEvent.id !== lastEventRef.current?.id) {
        lastEventRef.current = lastEvent;
      }
    };

    // Check for alerts periodically
    const alertInterval = setInterval(checkForAlerts, 60000); // Check every minute

    // Initial check
    checkForAlerts();

    return () => clearInterval(alertInterval);
  }, [enableNotifications, leadId, conversionTracking.timeline]);

  // Public API methods

  const markNotificationAsRead = useCallback((notificationId: string) => {
    notificationService.markAsRead(notificationId);
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    notificationService.markAllAsRead();
  }, []);

  const deleteNotification = useCallback((notificationId: string) => {
    notificationService.deleteNotification(notificationId);
  }, []);

  const clearAllNotifications = useCallback(() => {
    notificationService.clearAllNotifications();
  }, []);

  const updateNotificationPreferences = useCallback((preferences: any) => {
    notificationService.updatePreferences(preferences);
  }, []);

  const reconnectWebSocket = useCallback(() => {
    if (enableWebSocket) {
      websocketService.disconnect();
      // WebSocket service will automatically reconnect
      setState(prev => ({
        ...prev,
        connectionStatus: 'connecting'
      }));
    }
  }, [enableWebSocket]);

  const disconnectWebSocket = useCallback(() => {
    if (enableWebSocket) {
      websocketService.disconnect();
      setState(prev => ({
        ...prev,
        isConnected: false,
        connectionStatus: 'disconnected'
      }));
    }
  }, [enableWebSocket]);

  return {
    // Connection state
    ...state,

    // Conversion tracking data (inherited from useConversionTracking)
    ...conversionTracking,

    // Notification methods
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearAllNotifications,
    updateNotificationPreferences,

    // WebSocket methods
    reconnectWebSocket,
    disconnectWebSocket,

    // Notification preferences
    notificationPreferences: notificationService.getPreferences(),

    // Utility methods
    isRealTimeEnabled: enableWebSocket && enableNotifications,
    hasActiveConnection: state.isConnected && state.connectionStatus === 'connected'
  };
};

export default useRealTimeConversionTracking;