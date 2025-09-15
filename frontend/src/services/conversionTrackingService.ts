import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ConversionEvent,
  ConversionFunnelStage,
  ConversionFunnelData,
  ConversionMetrics,
  ConversionEventTemplate,
  CONVERSION_EVENT_TEMPLATES
} from '../types/conversion';
import { conversionApiService } from './conversionApiService';

export interface ConversionStageTransition {
  fromStage: string;
  toStage: string;
  leadId: number;
  triggerType: 'automatic' | 'manual';
  triggerReason: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface ConversionTrackingConfig {
  enableRealTimeUpdates: boolean;
  autoStageProgression: boolean;
  cacheExpiryMinutes: number;
  maxRetries: number;
}

class ConversionTrackingService {
  private static instance: ConversionTrackingService;
  private config: ConversionTrackingConfig;
  private cache: Map<string, any> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();

  private constructor() {
    this.config = {
      enableRealTimeUpdates: true,
      autoStageProgression: true,
      cacheExpiryMinutes: 30,
      maxRetries: 3
    };
    this.initializeService();
  }

  static getInstance(): ConversionTrackingService {
    if (!ConversionTrackingService.instance) {
      ConversionTrackingService.instance = new ConversionTrackingService();
    }
    return ConversionTrackingService.instance;
  }

  private async initializeService(): Promise<void> {
    try {
      // Load cached configuration
      const cachedConfig = await AsyncStorage.getItem('conversionTrackingConfig');
      if (cachedConfig) {
        this.config = { ...this.config, ...JSON.parse(cachedConfig) };
      }

      // Initialize event listeners
      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to initialize conversion tracking service:', error);
    }
  }

  private setupEventListeners(): void {
    // Listen for lead score changes that might trigger stage progression
    this.addEventListener('leadScoreChanged', this.handleLeadScoreChange.bind(this));

    // Listen for new activities that might indicate stage progression
    this.addEventListener('leadActivityAdded', this.handleLeadActivityAdded.bind(this));

    // Listen for conversion events
    this.addEventListener('conversionEventLogged', this.handleConversionEventLogged.bind(this));
  }

  /**
   * Log a conversion event with automatic stage progression
   */
  async logConversionEvent(
    leadId: number,
    eventType: ConversionEvent['eventType'],
    eventDescription: string,
    eventData?: Record<string, any>,
    userId?: number
  ): Promise<{ success: boolean; eventId?: number; newStage?: string; error?: string }> {
    try {
      // Validate event type
      const eventTemplate = CONVERSION_EVENT_TEMPLATES.find(t => t.type === eventType);
      if (!eventTemplate) {
        return { success: false, error: `Invalid event type: ${eventType}` };
      }

      // Log the event via API
      const result = await conversionApiService.logConversionEvent(leadId, {
        eventType,
        eventDescription,
        eventData,
        userId
      });

      if (!result.success) {
        return { success: false, error: result.message };
      }

      const eventId = result.data?.eventId;
      if (!eventId) {
        return { success: false, error: 'No event ID returned from API' };
      }

      // Check for automatic stage progression
      if (this.config.autoStageProgression) {
        const stageResult = await this.evaluateStageProgression(leadId, eventType, eventData);
        if (stageResult.newStage) {
          // Update lead's conversion stage
          await this.updateLeadConversionStage(leadId, stageResult.newStage, `Automatic progression due to ${eventType}`);

          // Emit stage change event
          this.emitEvent('stageChanged', {
            leadId,
            fromStage: stageResult.fromStage,
            toStage: stageResult.newStage,
            triggerType: 'automatic',
            triggerReason: eventType
          });

          return {
            success: true,
            eventId,
            newStage: stageResult.newStage
          };
        }
      }

      // Emit event logged event
      this.emitEvent('conversionEventLogged', {
        leadId,
        eventId,
        eventType,
        eventDescription
      });

      return { success: true, eventId };

    } catch (error) {
      console.error('Failed to log conversion event:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Evaluate if a lead should progress to the next stage based on event
   */
  private async evaluateStageProgression(
    leadId: number,
    eventType: string,
    eventData?: Record<string, any>
  ): Promise<{ fromStage?: string; newStage?: string; shouldProgress: boolean }> {
    try {
      // Get current lead conversion status
      const leadStatus = await this.getLeadConversionStatus(leadId);
      if (!leadStatus) {
        return { shouldProgress: false };
      }

      const currentStage = leadStatus.conversion_status;
      const currentStageOrder = leadStatus.current_funnel_stage || 1;

      // Define stage progression rules based on events
      const progressionRules: Record<string, { nextStage: string; order: number; conditions?: (data?: any) => boolean }> = {
        'contact_made': { nextStage: 'contact_made', order: 2 },
        'qualified': { nextStage: 'qualified', order: 3 },
        'showing_scheduled': { nextStage: 'showing_scheduled', order: 4 },
        'showing_completed': { nextStage: 'showing_completed', order: 5 },
        'offer_submitted': { nextStage: 'offer_submitted', order: 6 },
        'offer_accepted': { nextStage: 'offer_accepted', order: 7 },
        'sale_closed': { nextStage: 'sale_closed', order: 8 }
      };

      const rule = progressionRules[eventType];
      if (!rule) {
        return { shouldProgress: false };
      }

      // Check if this represents progression
      if (rule.order > currentStageOrder) {
        // Check any additional conditions
        if (rule.conditions && !rule.conditions(eventData)) {
          return { shouldProgress: false };
        }

        return {
          fromStage: currentStage,
          newStage: rule.nextStage,
          shouldProgress: true
        };
      }

      return { shouldProgress: false };

    } catch (error) {
      console.error('Failed to evaluate stage progression:', error);
      return { shouldProgress: false };
    }
  }

  /**
   * Update lead's conversion stage
   */
  private async updateLeadConversionStage(
    leadId: number,
    newStage: string,
    notes?: string
  ): Promise<boolean> {
    try {
      // Get stage order from funnel definition
      const stageOrder = await this.getStageOrder(newStage);

      const result = await conversionApiService.updateConversionStatus(leadId, {
        newStatus: newStage,
        newStage: stageOrder,
        notes
      });

      return result.success;
    } catch (error) {
      console.error('Failed to update lead conversion stage:', error);
      return false;
    }
  }

  /**
   * Get stage order from funnel definition
   */
  private async getStageOrder(stageName: string): Promise<number> {
    try {
      // This would typically come from the funnel configuration
      // For now, use a simple mapping
      const stageOrderMap: Record<string, number> = {
        'lead_created': 1,
        'contact_made': 2,
        'qualified': 3,
        'showing_scheduled': 4,
        'showing_completed': 5,
        'offer_submitted': 6,
        'offer_accepted': 7,
        'sale_closed': 8
      };

      return stageOrderMap[stageName] || 1;
    } catch (error) {
      console.error('Failed to get stage order:', error);
      return 1;
    }
  }

  /**
   * Get lead conversion status
   */
  private async getLeadConversionStatus(leadId: number): Promise<any> {
    try {
      // This would typically come from a dedicated API endpoint
      // For now, return mock data structure
      return {
        conversion_status: 'lead_created',
        current_funnel_stage: 1,
        conversion_probability: 0.1
      };
    } catch (error) {
      console.error('Failed to get lead conversion status:', error);
      return null;
    }
  }

  /**
   * Calculate conversion funnel metrics
   */
  async calculateConversionFunnel(): Promise<ConversionFunnelData | null> {
    try {
      const cacheKey = 'conversionFunnel';
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        return cached;
      }

      const result = await conversionApiService.getConversionFunnel();
      if (!result.success || !result.data) {
        return null;
      }

      // Cache the result
      this.setCachedData(cacheKey, result.data);

      return result.data;
    } catch (error) {
      console.error('Failed to calculate conversion funnel:', error);
      return null;
    }
  }

  /**
   * Get conversion metrics for dashboard
   */
  async getConversionMetrics(
    dateRange?: { start: string; end: string }
  ): Promise<ConversionMetrics | null> {
    try {
      const cacheKey = `conversionMetrics_${dateRange?.start || 'all'}_${dateRange?.end || 'all'}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        return cached;
      }

      const result = await conversionApiService.getConversionMetrics(dateRange);
      if (!result.success || !result.data) {
        return null;
      }

      // Transform API response to our interface
      const metrics: ConversionMetrics = {
        totalConversions: result.data.totalConversions || 0,
        conversionRate: result.data.conversionRate || 0,
        averageTimeToConvert: result.data.averageTimeToConvert || 0,
        topConversionStages: (result.data.topConversionStages || []).map(stage => ({
          ...stage,
          percentage: 0 // Calculate percentage if needed, or set to 0 for now
        })),
        conversionTrends: [] // Initialize as empty array since API doesn't provide this yet
      };

      // Cache the result
      this.setCachedData(cacheKey, metrics);

      return metrics;
    } catch (error) {
      console.error('Failed to get conversion metrics:', error);
      return null;
    }
  }

  /**
   * Handle lead score changes for potential stage progression
   */
  private async handleLeadScoreChange(data: { leadId: number; newScore: number; oldScore: number }): Promise<void> {
    if (data.newScore >= 80 && data.oldScore < 80) {
      // High score might trigger qualification
      await this.logConversionEvent(
        data.leadId,
        'qualified',
        'Lead qualified based on high score',
        { score: data.newScore, previousScore: data.oldScore }
      );
    }
  }

  /**
   * Handle new lead activities for potential stage progression
   */
  private async handleLeadActivityAdded(data: { leadId: number; activityType: string; activityData?: any }): Promise<void> {
    // Map activity types to conversion events
    const activityToEventMap: Record<string, ConversionEvent['eventType']> = {
      'phone_call': 'contact_made',
      'email_sent': 'contact_made',
      'meeting_scheduled': 'showing_scheduled',
      'property_shown': 'showing_completed',
      'offer_made': 'offer_submitted'
    };

    const eventType = activityToEventMap[data.activityType];
    if (eventType) {
      await this.logConversionEvent(
        data.leadId,
        eventType,
        `Activity: ${data.activityType}`,
        data.activityData
      );
    }
  }

  /**
   * Handle conversion events for real-time updates
   */
  private async handleConversionEventLogged(data: { leadId: number; eventId: number; eventType: string }): Promise<void> {
    // Clear relevant caches
    this.clearCacheByPattern('conversionFunnel');
    this.clearCacheByPattern('conversionMetrics');

    // Emit real-time update event
    if (this.config.enableRealTimeUpdates) {
      this.emitEvent('realTimeUpdate', {
        type: 'conversionEvent',
        leadId: data.leadId,
        eventType: data.eventType
      });
    }
  }

  /**
   * Event system for real-time updates
   */
  private addEventListener(eventType: string, listener: Function): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  private emitEvent(eventType: string, data: any): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Caching system for performance
   */
  private getCachedData(key: string): any {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCachedData(key: string, data: any): void {
    const expiry = Date.now() + (this.config.cacheExpiryMinutes * 60 * 1000);
    this.cache.set(key, { data, expiry });
  }

  private clearCacheByPattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Configuration management
   */
  async updateConfig(newConfig: Partial<ConversionTrackingConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    await AsyncStorage.setItem('conversionTrackingConfig', JSON.stringify(this.config));
  }

  getConfig(): ConversionTrackingConfig {
    return { ...this.config };
  }

  /**
   * Cleanup method
   */
  async cleanup(): Promise<void> {
    this.cache.clear();
    this.eventListeners.clear();
  }
}

// Export singleton instance
export const conversionTrackingService = ConversionTrackingService.getInstance();
export default conversionTrackingService;