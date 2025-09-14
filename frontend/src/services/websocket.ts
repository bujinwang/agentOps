import { apiService } from './api';

export interface WebSocketMessage {
  type: 'conversion_update' | 'lead_update' | 'kpi_update' | 'notification';
  data: any;
  timestamp: string;
}

export interface ConversionUpdateData {
  stage_id: number;
  stage_name: string;
  lead_count: number;
  conversion_rate: number;
  total_value: number;
  avg_probability?: number;
  change_type: 'new_lead' | 'stage_change' | 'value_update';
}

export interface LeadUpdateData {
  lead_id: number;
  previous_status: string;
  new_status: string;
  value_change?: number;
  probability_change?: number;
}

export interface KPIUpdateData {
  metric_name: string;
  previous_value: number;
  new_value: number;
  percentage_change: number;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000; // Start with 1 second
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  constructor() {
    this.listeners.set('conversion_update', new Set());
    this.listeners.set('lead_update', new Set());
    this.listeners.set('kpi_update', new Set());
    this.listeners.set('notification', new Set());
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      // Get WebSocket URL from API service or use default
      const wsUrl = this.getWebSocketUrl();

      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.stopHeartbeat();
          this.handleReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.stopHeartbeat();
  }

  private getWebSocketUrl(): string {
    // Get the API base URL and convert to WebSocket URL
    const apiUrl = __DEV__ ? 'http://localhost:3000' : 'https://your-production-api.com';
    const wsUrl = apiUrl.replace(/^http/, 'ws').replace(/^https/, 'wss');
    return `${wsUrl}/ws/analytics`;
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);

      setTimeout(() => {
        this.connect().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    const listeners = this.listeners.get(message.type);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(message.data);
        } catch (error) {
          console.error(`Error in ${message.type} listener:`, error);
        }
      });
    }
  }

  // Public methods for subscribing to events
  onConversionUpdate(callback: (data: ConversionUpdateData) => void): () => void {
    return this.addListener('conversion_update', callback);
  }

  onLeadUpdate(callback: (data: LeadUpdateData) => void): () => void {
    return this.addListener('lead_update', callback);
  }

  onKPIUpdate(callback: (data: KPIUpdateData) => void): () => void {
    return this.addListener('kpi_update', callback);
  }

  onNotification(callback: (data: any) => void): () => void {
    return this.addListener('notification', callback);
  }

  private addListener(eventType: string, callback: (data: any) => void): () => void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.add(callback);
    }

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(eventType);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  // Send messages to server (if needed)
  send(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message);
    }
  }

  // Get connection status
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Get connection state
  get connectionState(): string {
    if (!this.ws) return 'disconnected';

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'closing';
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'unknown';
    }
  }
}

// Create singleton instance
export const websocketService = new WebSocketService();

// Helper hook for React components
export const useWebSocket = () => {
  return websocketService;
};