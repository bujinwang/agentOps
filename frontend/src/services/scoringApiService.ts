import { Injectable } from '../types/di';
import { LeadProfile, MLLeadScore, BatchScoringResult, ScoringStatistics } from '../types/ml';
import { RealTimeScoringService } from './realTimeScoringService';

@Injectable()
export class ScoringApiService {
  private static instance: ScoringApiService;
  private realTimeScoringService: RealTimeScoringService;

  private constructor() {
    this.realTimeScoringService = RealTimeScoringService.getInstance();
  }

  public static getInstance(): ScoringApiService {
    if (!ScoringApiService.instance) {
      ScoringApiService.instance = new ScoringApiService();
    }
    return ScoringApiService.instance;
  }

  /**
   * Score a single lead via API
   * POST /api/ml/scoring/lead/:leadId
   */
  public async scoreLead(
    leadId: number,
    options: {
      modelId?: string;
      useCache?: boolean;
      priority?: 'low' | 'medium' | 'high';
    } = {}
  ): Promise<ApiResponse<MLLeadScore>> {
    try {
      const { modelId, useCache = true } = options;

      const score = await this.realTimeScoringService.scoreLead(leadId, modelId, useCache);

      return {
        success: true,
        data: score,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SCORING_FAILED',
          message: error instanceof Error ? error.message : 'Scoring failed',
          details: error instanceof Error ? error.stack : undefined,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Score a lead with provided data via API
   * POST /api/ml/scoring/lead
   */
  public async scoreLeadWithData(
    leadData: LeadProfile,
    options: {
      modelId?: string;
      useCache?: boolean;
    } = {}
  ): Promise<ApiResponse<MLLeadScore>> {
    try {
      const { modelId, useCache = true } = options;

      const score = await this.realTimeScoringService.scoreLeadWithData(leadData, modelId, useCache);

      return {
        success: true,
        data: score,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SCORING_FAILED',
          message: error instanceof Error ? error.message : 'Scoring failed',
          details: error instanceof Error ? error.stack : undefined,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get lead insights via API
   * GET /api/ml/scoring/lead/:leadId/insights
   */
  public async getLeadInsights(
    leadId: number,
    options: {
      modelId?: string;
    } = {}
  ): Promise<ApiResponse<any>> {
    try {
      const { modelId } = options;

      const insights = await this.realTimeScoringService.getLeadInsights(leadId, modelId);

      return {
        success: true,
        data: insights,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INSIGHTS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get insights',
          details: error instanceof Error ? error.stack : undefined,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Score multiple leads in batch via API
   * POST /api/ml/scoring/batch
   */
  public async scoreLeadsBatch(
    leadIds: number[],
    options: {
      modelId?: string;
      priority?: 'low' | 'medium' | 'high';
    } = {}
  ): Promise<ApiResponse<BatchScoringResult>> {
    try {
      const { modelId, priority = 'medium' } = options;

      const result = await this.realTimeScoringService.scoreLeadsBatch(leadIds, modelId, priority);

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'BATCH_SCORING_FAILED',
          message: error instanceof Error ? error.message : 'Batch scoring failed',
          details: error instanceof Error ? error.stack : undefined,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get scoring statistics via API
   * GET /api/ml/scoring/stats
   */
  public async getScoringStatistics(): Promise<ApiResponse<ScoringStatistics>> {
    try {
      const statistics = this.realTimeScoringService.getScoringStatistics();

      return {
        success: true,
        data: statistics,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'STATS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get statistics',
          details: error instanceof Error ? error.stack : undefined,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get service health status via API
   * GET /api/ml/scoring/health
   */
  public async getHealthStatus(): Promise<ApiResponse<any>> {
    try {
      const health = this.realTimeScoringService.getHealthStatus();

      return {
        success: true,
        data: health,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: error instanceof Error ? error.message : 'Health check failed',
          details: error instanceof Error ? error.stack : undefined,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Clear cache for a specific lead via API
   * DELETE /api/ml/scoring/cache/lead/:leadId
   */
  public async clearLeadCache(leadId: number): Promise<ApiResponse<{ message: string }>> {
    try {
      this.realTimeScoringService.clearLeadCache(leadId);

      return {
        success: true,
        data: { message: `Cache cleared for lead ${leadId}` },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CACHE_CLEAR_FAILED',
          message: error instanceof Error ? error.message : 'Failed to clear cache',
          details: error instanceof Error ? error.stack : undefined,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Clear all caches via API
   * DELETE /api/ml/scoring/cache
   */
  public async clearAllCaches(): Promise<ApiResponse<{ message: string }>> {
    try {
      this.realTimeScoringService.clearAllCaches();

      return {
        success: true,
        data: { message: 'All caches cleared successfully' },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CACHE_CLEAR_FAILED',
          message: error instanceof Error ? error.message : 'Failed to clear caches',
          details: error instanceof Error ? error.stack : undefined,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Update cache settings via API
   * PUT /api/ml/scoring/cache/settings
   */
  public async updateCacheSettings(settings: { ttl: number }): Promise<ApiResponse<{ message: string }>> {
    try {
      this.realTimeScoringService.updateCacheSettings(settings.ttl);

      return {
        success: true,
        data: { message: `Cache TTL updated to ${settings.ttl}ms` },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SETTINGS_UPDATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update settings',
          details: error instanceof Error ? error.stack : undefined,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Handle API request with proper error handling and logging
   */
  public async handleApiRequest<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<ApiResponse<T>> {
    const startTime = Date.now();

    try {
      console.log(`[${new Date().toISOString()}] Starting ${operationName}`);

      const result = await operation();
      const responseTime = Date.now() - startTime;

      console.log(`[${new Date().toISOString()}] Completed ${operationName} in ${responseTime}ms`);

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
        metadata: {
          operation: operationName,
          responseTime,
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      console.error(`[${new Date().toISOString()}] Failed ${operationName} in ${responseTime}ms:`, error);

      return {
        success: false,
        error: {
          code: 'OPERATION_FAILED',
          message: error instanceof Error ? error.message : 'Operation failed',
          details: error instanceof Error ? error.stack : undefined,
        },
        timestamp: new Date().toISOString(),
        metadata: {
          operation: operationName,
          responseTime,
        },
      };
    }
  }

  /**
   * Validate API request parameters
   */
  public validateScoringRequest(params: any): ValidationResult {
    const errors: string[] = [];

    // Validate lead ID
    if (params.leadId !== undefined) {
      if (typeof params.leadId !== 'number' || params.leadId <= 0) {
        errors.push('leadId must be a positive number');
      }
    }

    // Validate lead data
    if (params.leadData) {
      if (!params.leadData.id || typeof params.leadData.id !== 'number') {
        errors.push('leadData must include a valid id');
      }
      if (!params.leadData.email || typeof params.leadData.email !== 'string') {
        errors.push('leadData must include a valid email');
      }
    }

    // Validate lead IDs array
    if (params.leadIds) {
      if (!Array.isArray(params.leadIds)) {
        errors.push('leadIds must be an array');
      } else if (params.leadIds.length === 0) {
        errors.push('leadIds array cannot be empty');
      } else if (params.leadIds.length > 1000) {
        errors.push('leadIds array cannot exceed 1000 items');
      } else {
        const invalidIds = params.leadIds.filter((id: any) =>
          typeof id !== 'number' || id <= 0
        );
        if (invalidIds.length > 0) {
          errors.push('All leadIds must be positive numbers');
        }
      }
    }

    // Validate model ID
    if (params.modelId !== undefined && typeof params.modelId !== 'string') {
      errors.push('modelId must be a string');
    }

    // Validate priority
    if (params.priority !== undefined) {
      const validPriorities = ['low', 'medium', 'high'];
      if (!validPriorities.includes(params.priority)) {
        errors.push('priority must be one of: low, medium, high');
      }
    }

    // Validate cache settings
    if (params.ttl !== undefined) {
      if (typeof params.ttl !== 'number' || params.ttl < 0) {
        errors.push('ttl must be a non-negative number');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get API documentation
   */
  public getApiDocumentation(): ApiDocumentation {
    return {
      version: '1.0.0',
      baseUrl: '/api/ml/scoring',
      endpoints: [
        {
          method: 'POST',
          path: '/lead/:leadId',
          description: 'Score a single lead by ID',
          parameters: [
            { name: 'leadId', type: 'number', required: true, description: 'Lead ID to score' },
            { name: 'modelId', type: 'string', required: false, description: 'Specific model to use' },
            { name: 'useCache', type: 'boolean', required: false, description: 'Whether to use cached results' },
          ],
          responses: {
            200: 'MLLeadScore object',
            400: 'Validation error',
            500: 'Scoring failed',
          },
        },
        {
          method: 'POST',
          path: '/lead',
          description: 'Score a lead with provided data',
          parameters: [
            { name: 'leadData', type: 'LeadProfile', required: true, description: 'Lead data object' },
            { name: 'modelId', type: 'string', required: false, description: 'Specific model to use' },
          ],
          responses: {
            200: 'MLLeadScore object',
            400: 'Validation error',
            500: 'Scoring failed',
          },
        },
        {
          method: 'GET',
          path: '/lead/:leadId/insights',
          description: 'Get detailed insights for a lead',
          parameters: [
            { name: 'leadId', type: 'number', required: true, description: 'Lead ID to analyze' },
            { name: 'modelId', type: 'string', required: false, description: 'Specific model to use' },
          ],
          responses: {
            200: 'Lead insights object',
            404: 'Lead not found',
            500: 'Insights generation failed',
          },
        },
        {
          method: 'POST',
          path: '/batch',
          description: 'Score multiple leads in batch',
          parameters: [
            { name: 'leadIds', type: 'number[]', required: true, description: 'Array of lead IDs to score' },
            { name: 'modelId', type: 'string', required: false, description: 'Specific model to use' },
            { name: 'priority', type: 'string', required: false, description: 'Processing priority (low/medium/high)' },
          ],
          responses: {
            200: 'BatchScoringResult object',
            400: 'Validation error',
            429: 'Too many requests',
          },
        },
        {
          method: 'GET',
          path: '/stats',
          description: 'Get scoring service statistics',
          responses: {
            200: 'ScoringStatistics object',
          },
        },
        {
          method: 'GET',
          path: '/health',
          description: 'Get service health status',
          responses: {
            200: 'Service health object',
          },
        },
        {
          method: 'DELETE',
          path: '/cache/lead/:leadId',
          description: 'Clear cache for a specific lead',
          parameters: [
            { name: 'leadId', type: 'number', required: true, description: 'Lead ID to clear cache for' },
          ],
          responses: {
            200: 'Cache cleared successfully',
            500: 'Cache clear failed',
          },
        },
        {
          method: 'DELETE',
          path: '/cache',
          description: 'Clear all scoring caches',
          responses: {
            200: 'All caches cleared successfully',
            500: 'Cache clear failed',
          },
        },
        {
          method: 'PUT',
          path: '/cache/settings',
          description: 'Update cache settings',
          parameters: [
            { name: 'ttl', type: 'number', required: true, description: 'Cache TTL in milliseconds' },
          ],
          responses: {
            200: 'Settings updated successfully',
            400: 'Invalid settings',
          },
        },
      ],
      rateLimits: {
        perMinute: 100,
        perHour: 1000,
        burstLimit: 20,
      },
      authentication: {
        type: 'Bearer Token',
        required: true,
      },
    };
  }
}

// Types and interfaces

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
  timestamp: string;
  metadata?: {
    operation: string;
    responseTime: number;
  };
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface ApiDocumentation {
  version: string;
  baseUrl: string;
  endpoints: Array<{
    method: string;
    path: string;
    description: string;
    parameters?: Array<{
      name: string;
      type: string;
      required: boolean;
      description: string;
    }>;
    responses: Record<number, string>;
  }>;
  rateLimits: {
    perMinute: number;
    perHour: number;
    burstLimit: number;
  };
  authentication: {
    type: string;
    required: boolean;
  };
}

export const scoringApiService = ScoringApiService.getInstance();