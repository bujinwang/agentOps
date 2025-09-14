import { ConversionEvent } from '../types/conversion';

export interface WebSocketMessage {
  type: 'conversion_event' | 'status_update' | 'notification' | 'funnel_update' | 'ping' | 'pong' | 'subscribe' | 'unsubscribe';
  payload: any;
  timestamp: string;
}

export interface ConversionNotification {
  id: string;
  leadId: number;
  leadName: string;
  type: 'milestone' | 'alert' | 'warning';
  title: string;
  message: string;
  actionRequired?: boolean;
  actionUrl?: string;
  timestamp: string;
  isRead: boolean;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000; // 3 seconds
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private isConnected = false;
  private url: string;

  constructor(url: string = 'ws://localhost:8080/ws') {
    this.url = url;
    this.connect();
  }

  private connect(): void {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.emit('connected', {});
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
        this.isConnected = false;
        this.stopHeartbeat();
        this.emit('disconnected', { code: event.code, reason: event.reason });

        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectInterval * Math.pow(2, this.reconnectAttempts), 30000);

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping', payload: {}, timestamp: new Date().toISOString() });
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    console.log('Received WebSocket message:', message.type, message.payload);

    switch (message.type) {
      case 'conversion_event':
        this.emit('conversion_event', message.payload);
        break;
      case 'status_update':
        this.emit('status_update', message.payload);
        break;
      case 'notification':
        this.emit('notification', message.payload);
        break;
      case 'funnel_update':
        this.emit('funnel_update', message.payload);
        break;
      case 'pong':
        // Heartbeat response - do nothing
        break;
      case 'ping':
        // Respond to heartbeat
        this.send({ type: 'pong', payload: {}, timestamp: new Date().toISOString() });
        break;
      case 'subscribe':
      case 'unsubscribe':
        // Subscription management - handled by server
        console.log(`${message.type} acknowledged:`, message.payload);
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  private emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error('Error in WebSocket event listener:', error);
        }
      });
    }
  }

  // Public API

  public send(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message);
    }
  }

  public on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  public off(event: string, listener?: Function): void {
    if (!listener) {
      this.listeners.delete(event);
      return;
    }

    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  public isWebSocketConnected(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  public disconnect(): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
    this.isConnected = false;
  }

  // Specific methods for conversion tracking

  public subscribeToLead(leadId: number): void {
    this.send({
      type: 'subscribe',
      payload: { leadId, channel: 'conversion_tracking' },
      timestamp: new Date().toISOString()
    });
  }

  public unsubscribeFromLead(leadId: number): void {
    this.send({
      type: 'unsubscribe',
      payload: { leadId, channel: 'conversion_tracking' },
      timestamp: new Date().toISOString()
    });
  }

  public subscribeToFunnelUpdates(): void {
    this.send({
      type: 'subscribe',
      payload: { channel: 'funnel_updates' },
      timestamp: new Date().toISOString()
    });
  }

  public unsubscribeFromFunnelUpdates(): void {
    this.send({
      type: 'unsubscribe',
      payload: { channel: 'funnel_updates' },
      timestamp: new Date().toISOString()
    });
  }
}

// Export singleton instance
const websocketService = new WebSocketService();
export default websocketService;
export { WebSocketService };