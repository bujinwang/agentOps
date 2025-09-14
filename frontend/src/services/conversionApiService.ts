import { ConversionEvent, ConversionTimeline, ConversionFunnelData } from '../types/conversion';

export interface ConversionEventData {
  eventType: 'contact_made' | 'qualified' | 'showing_scheduled' | 'showing_completed' | 'offer_submitted' | 'offer_accepted' | 'sale_closed';
  eventDescription: string;
  eventData?: Record<string, any>;
  userId?: number;
}

export interface ConversionStatusUpdate {
  newStatus: string;
  newStage: number;
  notes?: string;
}

export interface ConversionApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

class ConversionApiService {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl: string = 'http://localhost:5678/webhook') {
    this.baseUrl = baseUrl;
    this.authToken = this.getStoredAuthToken();
  }

  private getStoredAuthToken(): string | null {
    // Get token from secure storage or state management
    return localStorage.getItem('authToken');
  }

  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' = 'GET',
    data?: any
  ): Promise<ConversionApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (this.authToken) {
        headers.Authorization = `Bearer ${this.authToken}`;
      }

      const config: RequestInit = {
        method,
        headers,
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        config.body = JSON.stringify(data);
      }

      const response = await fetch(url, config);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error('Conversion API request failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Log a conversion event for a lead
   */
  async logConversionEvent(
    leadId: number,
    eventData: ConversionEventData
  ): Promise<ConversionApiResponse<{ eventId: number }>> {
    return this.makeRequest<{ eventId: number }>(
      `/leads/${leadId}/conversion-events`,
      'POST',
      eventData
    );
  }

  /**
   * Get conversion timeline for a lead
   */
  async getConversionTimeline(
    leadId: number
  ): Promise<ConversionApiResponse<ConversionTimeline>> {
    const response = await this.makeRequest<ConversionEvent[]>(
      `/leads/${leadId}/conversion-timeline`,
      'GET'
    );

    if (response.success && response.data) {
      return {
        success: true,
        message: 'Conversion timeline retrieved successfully',
        data: {
          leadId,
          events: response.data,
          totalEvents: response.data.length,
          lastEvent: response.data[0] || null
        }
      };
    }

    return response as unknown as ConversionApiResponse<ConversionTimeline>;
  }

  /**
   * Update conversion status for a lead
   */
  async updateConversionStatus(
    leadId: number,
    statusUpdate: ConversionStatusUpdate
  ): Promise<ConversionApiResponse<{ newStatus: string; newStage: number }>> {
    return this.makeRequest<{ newStatus: string; newStage: number }>(
      `/leads/${leadId}/conversion-status`,
      'PUT',
      statusUpdate
    );
  }

  /**
   * Get conversion funnel analytics
   */
  async getConversionFunnel(): Promise<ConversionApiResponse<ConversionFunnelData>> {
    const response = await this.makeRequest<any>(
      '/analytics/conversions/funnel',
      'GET'
    );

    if (response.success && response.data) {
      return {
        success: true,
        message: 'Conversion funnel data retrieved successfully',
        data: response.data
      };
    }

    return response as ConversionApiResponse<ConversionFunnelData>;
  }

  /**
   * Batch log multiple conversion events
   */
  async batchLogConversionEvents(
    events: Array<{ leadId: number; eventData: ConversionEventData }>
  ): Promise<ConversionApiResponse<{ loggedEvents: number; failedEvents: number }>> {
    const results = await Promise.allSettled(
      events.map(event =>
        this.logConversionEvent(event.leadId, event.eventData)
      )
    );

    const loggedEvents = results.filter(result =>
      result.status === 'fulfilled' && result.value.success
    ).length;

    const failedEvents = results.length - loggedEvents;

    return {
      success: failedEvents === 0,
      message: `Batch logging completed: ${loggedEvents} successful, ${failedEvents} failed`,
      data: { loggedEvents, failedEvents }
    };
  }

  /**
   * Get conversion metrics for dashboard
   */
  async getConversionMetrics(
    dateRange?: { start: string; end: string }
  ): Promise<ConversionApiResponse<{
    totalConversions: number;
    conversionRate: number;
    averageTimeToConvert: number;
    topConversionStages: Array<{ stage: string; count: number }>;
  }>> {
    const queryParams = dateRange
      ? `?start=${dateRange.start}&end=${dateRange.end}`
      : '';

    return this.makeRequest(
      `/analytics/conversions/metrics${queryParams}`,
      'GET'
    );
  }

  /**
   * Retry failed conversion event
   */
  async retryConversionEvent(
    leadId: number,
    eventData: ConversionEventData,
    maxRetries: number = 3
  ): Promise<ConversionApiResponse<{ eventId: number }>> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await this.logConversionEvent(leadId, eventData);
      if (result.success) {
        return result;
      }

      if (attempt < maxRetries) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    return {
      success: false,
      message: `Failed to log conversion event after ${maxRetries} attempts`,
      error: 'Max retries exceeded'
    };
  }

  /**
   * Update authentication token
   */
  updateAuthToken(token: string | null): void {
    this.authToken = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }
}

// Export singleton instance
export const conversionApiService = new ConversionApiService();
export default conversionApiService;