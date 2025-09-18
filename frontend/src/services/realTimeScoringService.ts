import { Injectable } from '../types/di';
import { LeadProfile, MLLeadScore, ScoringStatistics, BatchScoringRequest, BatchScoringResult } from '../types/ml';
import { MLScoringService } from './mlScoringService';
import { FeatureEngineeringService } from './featureEngineeringService';

@Injectable()
export class RealTimeScoringService {
  private static instance: RealTimeScoringService;
  private mlScoringService: MLScoringService;
  private featureEngineeringService: FeatureEngineeringService;

  // Caching
  private scoreCache = new Map<string, CachedScore>();
  private modelCache = new Map<string, CachedModel>();

  // Request queuing
  private requestQueue: ScoringRequest[] = [];
  private isProcessing = false;
  private maxConcurrentRequests = 10;
  private activeRequests = 0;

  // Rate limiting
  private requestCounts = new Map<string, RequestCount>();
  private rateLimitWindow = 60000; // 1 minute
  private rateLimitMax = 100; // requests per minute per client

  // Statistics
  private statistics: ScoringStatistics = {
    totalRequests: 0,
    averageResponseTime: 0,
    successRate: 1.0,
    errorRate: 0.0,
    cacheHitRate: 0.0,
    modelUsage: {},
    timeRange: {
      start: new Date().toISOString(),
      end: new Date().toISOString(),
    },
    peakUsage: {
      timestamp: new Date().toISOString(),
      requestsPerMinute: 0,
    },
  };

  private constructor() {
    this.mlScoringService = MLScoringService.getInstance();
    this.featureEngineeringService = FeatureEngineeringService.getInstance();

    // Start background processing
    this.startBackgroundProcessing();

    // Start cleanup intervals
    this.startCleanupIntervals();
  }

  public static getInstance(): RealTimeScoringService {
    if (!RealTimeScoringService.instance) {
      RealTimeScoringService.instance = new RealTimeScoringService();
    }
    return RealTimeScoringService.instance;
  }

  /**
   * Score a single lead in real-time
   */
  public async scoreLead(
    leadId: number,
    modelId?: string,
    useCache: boolean = true
  ): Promise<MLLeadScore> {
    const startTime = Date.now();
    this.statistics.totalRequests++;

    try {
      // Check rate limiting
      if (!this.checkRateLimit('default')) {
        throw new Error('Rate limit exceeded');
      }

      // Check cache first
      if (useCache) {
        const cachedScore = this.getCachedScore(leadId, modelId);
        if (cachedScore) {
          this.updateStatistics(startTime, true, true);
          return cachedScore;
        }
      }

      // Get lead data (in real implementation, this would come from database)
      const leadData = await this.getLeadData(leadId);
      if (!leadData) {
        throw new Error(`Lead ${leadId} not found`);
      }

      // Score the lead
      const score = await this.mlScoringService.scoreLead(leadData, modelId);

      // Cache the result
      if (useCache) {
        this.cacheScore(leadId, score, modelId);
      }

      // Update statistics
      this.updateStatistics(startTime, true, false);

      return score;

    } catch (error) {
      console.error(`Scoring failed for lead ${leadId}:`, error);
      this.updateStatistics(startTime, false, false);
      throw error;
    }
  }

  /**
   * Score a lead with provided data
   */
  public async scoreLeadWithData(
    leadData: LeadProfile,
    modelId?: string,
    useCache: boolean = true
  ): Promise<MLLeadScore> {
    const startTime = Date.now();
    this.statistics.totalRequests++;

    try {
      // Check rate limiting
      if (!this.checkRateLimit('default')) {
        throw new Error('Rate limit exceeded');
      }

      // Check cache first
      if (useCache) {
        const cachedScore = this.getCachedScore(leadData.id, modelId);
        if (cachedScore) {
          this.updateStatistics(startTime, true, true);
          return cachedScore;
        }
      }

      // Score the lead
      const score = await this.mlScoringService.scoreLead(leadData, modelId);

      // Cache the result
      if (useCache) {
        this.cacheScore(leadData.id, score, modelId);
      }

      // Update statistics
      this.updateStatistics(startTime, true, false);

      return score;

    } catch (error) {
      console.error(`Scoring failed for lead ${leadData.id}:`, error);
      this.updateStatistics(startTime, false, false);
      throw error;
    }
  }

  /**
   * Score multiple leads in batch
   */
  public async scoreLeadsBatch(
    leadIds: number[],
    modelId?: string,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<BatchScoringResult> {
    const requestId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = new Date().toISOString();

    const request: BatchScoringRequest = {
      leads: [], // Will be populated
      modelId,
      priority,
    };

    // Get lead data for all IDs
    const leadPromises = leadIds.map(id => this.getLeadData(id));
    const leads = await Promise.all(leadPromises);
    const validLeads = leads.filter(lead => lead !== null) as LeadProfile[];

    request.leads = validLeads;

    // Add to processing queue
    const queueItem: ScoringRequest = {
      id: requestId,
      type: 'batch',
      request,
      startTime,
      status: 'queued',
    };

    this.requestQueue.push(queueItem);

    // Process immediately if high priority or queue is short
    if (priority === 'high' || this.requestQueue.length === 1) {
      return await this.processBatchRequest(requestId);
    }

    // Return queued status
    return {
      requestId,
      status: 'processing',
      totalLeads: validLeads.length,
      processedLeads: 0,
      results: [],
      errors: leadIds.length > validLeads.length ? [{
        leadId: -1,
        error: `${leadIds.length - validLeads.length} leads not found`,
      }] : [],
      processingTime: 0,
    };
  }

  /**
   * Get lead insights with detailed analysis
   */
  public async getLeadInsights(leadId: number, modelId?: string): Promise<any> {
    const score = await this.scoreLead(leadId, modelId);

    // Get feature importance and explanations
    const insights = {
      leadId,
      overallScore: score.score,
      confidence: score.confidence,
      riskLevel: this.calculateRiskLevel(score.score),
      conversionProbability: score.score,
      recommendedActions: this.generateRecommendedActions(score),
      keyFactors: await this.getKeyFactors(leadId),
      similarProfiles: await this.getSimilarProfiles(leadId),
      timeToAction: {
        urgent: score.score > 0.8,
        recommended: this.getRecommendedTimeframe(score.score),
        deadline: this.calculateDeadline(score.score),
      },
      engagement: await this.getEngagementAnalysis(leadId),
    };

    return insights;
  }

  /**
   * Get scoring statistics
   */
  public getScoringStatistics(): ScoringStatistics {
    return { ...this.statistics };
  }

  /**
   * Clear cache for a specific lead
   */
  public clearLeadCache(leadId: number): void {
    // Remove all cached scores for this lead
    for (const [key, cached] of this.scoreCache.entries()) {
      if (cached.leadId === leadId) {
        this.scoreCache.delete(key);
      }
    }
  }

  /**
   * Clear all caches
   */
  public clearAllCaches(): void {
    this.scoreCache.clear();
    this.modelCache.clear();
  }

  /**
   * Update cache TTL settings
   */
  public updateCacheSettings(ttl: number): void {
    this.defaultCacheTTL = ttl;
  }

  /**
   * Get service health status
   */
  public getHealthStatus(): ServiceHealth {
    const now = new Date();
    const timeSinceStart = now.getTime() - new Date(this.statistics.timeRange.start).getTime();
    const uptimeHours = timeSinceStart / (1000 * 60 * 60);

    return {
      status: 'healthy',
      uptime: uptimeHours,
      totalRequests: this.statistics.totalRequests,
      averageResponseTime: this.statistics.averageResponseTime,
      cacheSize: this.scoreCache.size,
      queueLength: this.requestQueue.length,
      activeRequests: this.activeRequests,
      lastUpdated: now.toISOString(),
    };
  }

  // Private methods

  private async getLeadData(leadId: number): Promise<LeadProfile | null> {
    // In a real implementation, this would fetch from database
    // For now, return mock data
    return {
      id: leadId,
      name: `Lead ${leadId}`,
      email: `lead${leadId}@example.com`,
      leadScore: Math.random() * 100,
      engagementLevel: 'medium',
      source: 'website',
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      lastActivity: new Date().toISOString(),
      totalInteractions: Math.floor(Math.random() * 20) + 1,
      conversionEvents: Math.floor(Math.random() * 3),
    };
  }

  private getCachedScore(leadId: number, modelId?: string): MLLeadScore | null {
    const cacheKey = `${leadId}_${modelId || 'default'}`;
    const cached = this.scoreCache.get(cacheKey);

    if (cached && !this.isExpired(cached.timestamp, cached.ttl)) {
      return cached.score;
    }

    // Remove expired cache entry
    if (cached) {
      this.scoreCache.delete(cacheKey);
    }

    return null;
  }

  private cacheScore(leadId: number, score: MLLeadScore, modelId?: string, ttl: number = 300000): void {
    const cacheKey = `${leadId}_${modelId || 'default'}`;
    this.scoreCache.set(cacheKey, {
      leadId,
      score,
      modelId,
      timestamp: Date.now(),
      ttl,
    });
  }

  private isExpired(timestamp: number, ttl: number): boolean {
    return Date.now() - timestamp > ttl;
  }

  private checkRateLimit(clientId: string): boolean {
    const now = Date.now();
    const windowStart = now - this.rateLimitWindow;

    // Clean old entries
    for (const [key, count] of this.requestCounts.entries()) {
      if (count.resetTime < windowStart) {
        this.requestCounts.delete(key);
      }
    }

    const clientCount = this.requestCounts.get(clientId);
    if (!clientCount) {
      this.requestCounts.set(clientId, {
        count: 1,
        resetTime: now + this.rateLimitWindow,
      });
      return true;
    }

    if (clientCount.count >= this.rateLimitMax) {
      return false;
    }

    clientCount.count++;
    return true;
  }

  private updateStatistics(startTime: number, success: boolean, cacheHit: boolean): void {
    const responseTime = Date.now() - startTime;
    const totalRequests = this.statistics.totalRequests;

    // Update response time (rolling average)
    this.statistics.averageResponseTime =
      (this.statistics.averageResponseTime * (totalRequests - 1) + responseTime) / totalRequests;

    // Update success/error rates
    if (success) {
      this.statistics.successRate = (this.statistics.successRate * (totalRequests - 1) + 1) / totalRequests;
      this.statistics.errorRate = (this.statistics.errorRate * (totalRequests - 1)) / totalRequests;
    } else {
      this.statistics.successRate = (this.statistics.successRate * (totalRequests - 1)) / totalRequests;
      this.statistics.errorRate = (this.statistics.errorRate * (totalRequests - 1) + 1) / totalRequests;
    }

    // Update cache hit rate
    if (cacheHit) {
      this.statistics.cacheHitRate = (this.statistics.cacheHitRate * (totalRequests - 1) + 1) / totalRequests;
    } else {
      this.statistics.cacheHitRate = (this.statistics.cacheHitRate * (totalRequests - 1)) / totalRequests;
    }

    // Update time range
    this.statistics.timeRange.end = new Date().toISOString();
  }

  private async startBackgroundProcessing(): Promise<void> {
    setInterval(async () => {
      if (!this.isProcessing && this.requestQueue.length > 0 && this.activeRequests < this.maxConcurrentRequests) {
        const request = this.requestQueue.shift();
        if (request) {
          this.isProcessing = true;
          this.activeRequests++;

          try {
            if (request.type === 'batch') {
              await this.processBatchRequest(request.id);
            }
          } catch (error) {
            console.error(`Background processing failed for request ${request.id}:`, error);
          } finally {
            this.isProcessing = false;
            this.activeRequests--;
          }
        }
      }
    }, 100); // Check every 100ms
  }

  private async processBatchRequest(requestId: string): Promise<BatchScoringResult> {
    const queueItem = this.requestQueue.find(item => item.id === requestId);
    if (!queueItem || queueItem.type !== 'batch') {
      throw new Error(`Batch request ${requestId} not found`);
    }

    const startTime = Date.now();
    const results: MLLeadScore[] = [];
    const errors: Array<{ leadId: number; error: string }> = [];

    // Process leads in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < queueItem.request.leads.length; i += batchSize) {
      const batch = queueItem.request.leads.slice(i, i + batchSize);

      for (const lead of batch) {
        try {
          const score = await this.scoreLeadWithData(lead, queueItem.request.modelId, false);
          results.push(score);
        } catch (error) {
          errors.push({
            leadId: lead.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Small delay between batches to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    const processingTime = Date.now() - startTime;

    return {
      requestId,
      status: 'completed',
      totalLeads: queueItem.request.leads.length,
      processedLeads: results.length,
      results,
      errors,
      processingTime,
      completedAt: new Date().toISOString(),
    };
  }

  private startCleanupIntervals(): void {
    // Clean expired cache entries every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, cached] of this.scoreCache.entries()) {
        if (this.isExpired(cached.timestamp, cached.ttl)) {
          this.scoreCache.delete(key);
        }
      }
    }, 5 * 60 * 1000);

    // Clean expired rate limit entries every minute
    setInterval(() => {
      const now = Date.now();
      for (const [key, count] of this.requestCounts.entries()) {
        if (count.resetTime < now) {
          this.requestCounts.delete(key);
        }
      }
    }, 60 * 1000);
  }

  private calculateRiskLevel(score: number): 'low' | 'medium' | 'high' {
    if (score > 0.8) return 'low';
    if (score > 0.6) return 'medium';
    return 'high';
  }

  private generateRecommendedActions(score: MLLeadScore): string[] {
    const actions: string[] = [];

    if (score.score > 0.8) {
      actions.push('Prioritize for immediate follow-up');
      actions.push('Schedule property showing within 24 hours');
      actions.push('Prepare personalized offer package');
    } else if (score.score > 0.6) {
      actions.push('Engage within 48 hours');
      actions.push('Send property recommendations');
      actions.push('Schedule discovery call');
    } else {
      actions.push('Add to nurture campaign');
      actions.push('Send educational content');
      actions.push('Monitor for engagement signals');
    }

    return actions;
  }

  private async getKeyFactors(leadId: number): Promise<any[]> {
    // Mock key factors - in real implementation, this would analyze feature importance
    return [
      {
        feature: 'lead_score',
        importance: 0.35,
        value: 85,
        contribution: 'positive',
        description: 'High lead score indicates strong initial interest',
      },
      {
        feature: 'engagement_velocity',
        importance: 0.28,
        value: 0.8,
        contribution: 'positive',
        description: 'Recent activity shows active engagement',
      },
      {
        feature: 'property_match',
        importance: 0.22,
        value: 0.9,
        contribution: 'positive',
        description: 'Strong match with available properties',
      },
    ];
  }

  private async getSimilarProfiles(leadId: number): Promise<any[]> {
    // Mock similar profiles
    return [
      {
        leadId: 123,
        similarity: 0.85,
        outcome: 'converted',
        commonFactors: ['high_engagement', 'property_match', 'timeline_fit'],
      },
      {
        leadId: 456,
        similarity: 0.78,
        outcome: 'converted',
        commonFactors: ['lead_score', 'response_rate'],
      },
    ];
  }

  private getRecommendedTimeframe(score: number): string {
    if (score > 0.8) return 'within 24 hours';
    if (score > 0.6) return 'within 48 hours';
    return 'within 1 week';
  }

  private calculateDeadline(score: number): string {
    const days = score > 0.8 ? 1 : score > 0.6 ? 2 : 7;
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + days);
    return deadline.toISOString();
  }

  private async getEngagementAnalysis(leadId: number): Promise<any> {
    // Mock engagement analysis
    return {
      level: 'high',
      trend: 'increasing',
      lastActivity: new Date().toISOString(),
      nextBestAction: 'schedule_property_tour',
    };
  }

  // Default cache TTL (5 minutes)
  private defaultCacheTTL = 300000;
}

// Types and interfaces

interface CachedScore {
  leadId: number;
  score: MLLeadScore;
  modelId?: string;
  timestamp: number;
  ttl: number;
}

interface CachedModel {
  modelId: string;
  model: any;
  timestamp: number;
  ttl: number;
}

interface ScoringRequest {
  id: string;
  type: 'single' | 'batch';
  request: BatchScoringRequest;
  startTime: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
}

interface RequestCount {
  count: number;
  resetTime: number;
}

interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  totalRequests: number;
  averageResponseTime: number;
  cacheSize: number;
  queueLength: number;
  activeRequests: number;
  lastUpdated: string;
}

export const realTimeScoringService = RealTimeScoringService.getInstance();