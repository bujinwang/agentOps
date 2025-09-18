import { Injectable } from '../types/di';
import { RetrainingSchedule, ABTest, ABTestResult, DriftAnalysis, DataQualityReport } from '../types/ml';
import { ModelRetrainingService } from './modelRetrainingService';

@Injectable()
export class RetrainingApiService {
  private static instance: RetrainingApiService;
  private modelRetrainingService: ModelRetrainingService;

  private constructor() {
    this.modelRetrainingService = ModelRetrainingService.getInstance();
  }

  public static getInstance(): RetrainingApiService {
    if (!RetrainingApiService.instance) {
      RetrainingApiService.instance = new RetrainingApiService();
    }
    return RetrainingApiService.instance;
  }

  /**
   * Trigger model retraining via API
   * POST /api/ml/retraining/trigger
   */
  public async triggerRetraining(options: {
    modelId?: string;
    dataWindow?: number;
    force?: boolean;
  } = {}): Promise<ApiResponse<any>> {
    try {
      const result = await this.modelRetrainingService.triggerRetraining(options);

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'RETRAINING_FAILED',
          message: error instanceof Error ? error.message : 'Retraining failed',
          details: error instanceof Error ? error.stack : undefined,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Start A/B test via API
   * POST /api/ml/retraining/ab-test
   */
  public async startABTest(options: {
    challengerModelId: string;
    championModelId?: string;
    testDuration?: number;
    trafficSplit?: number;
    confidenceThreshold?: number;
    minSampleSize?: number;
  }): Promise<ApiResponse<ABTest>> {
    try {
      const {
        challengerModelId,
        championModelId,
        testDuration,
        trafficSplit,
        confidenceThreshold,
        minSampleSize,
      } = options;

      // Update A/B test configuration if provided
      if (testDuration || trafficSplit || confidenceThreshold || minSampleSize) {
        const currentConfig = this.modelRetrainingService.getABTestConfig();
        const updatedConfig = {
          ...currentConfig,
          ...(testDuration !== undefined && { testDuration }),
          ...(trafficSplit !== undefined && { trafficSplit }),
          ...(confidenceThreshold !== undefined && { confidenceThreshold }),
          ...(minSampleSize !== undefined && { minSampleSize }),
        };
        this.modelRetrainingService.updateABTestConfig(updatedConfig);
      }

      const abTest = await this.modelRetrainingService.startABTest(
        challengerModelId,
        championModelId
      );

      return {
        success: true,
        data: abTest,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'AB_TEST_START_FAILED',
          message: error instanceof Error ? error.message : 'Failed to start A/B test',
          details: error instanceof Error ? error.stack : undefined,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get A/B test results via API
   * GET /api/ml/retraining/ab-test/:testId
   */
  public async getABTestResults(testId: string): Promise<ApiResponse<ABTestResult | null>> {
    try {
      const result = await this.modelRetrainingService.getABTestResults(testId);

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'AB_TEST_RESULTS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get A/B test results',
          details: error instanceof Error ? error.stack : undefined,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Deploy A/B test winner via API
   * POST /api/ml/retraining/ab-test/:testId/deploy
   */
  public async deployABTestWinner(testId: string): Promise<ApiResponse<{ deployed: boolean; message: string }>> {
    try {
      const deployed = await this.modelRetrainingService.deployABTestWinner(testId);

      return {
        success: true,
        data: {
          deployed,
          message: deployed
            ? 'A/B test winner deployed successfully'
            : 'No winner to deploy or deployment conditions not met',
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'AB_TEST_DEPLOY_FAILED',
          message: error instanceof Error ? error.message : 'Failed to deploy A/B test winner',
          details: error instanceof Error ? error.stack : undefined,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get active A/B tests via API
   * GET /api/ml/retraining/ab-tests
   */
  public async getActiveABTests(): Promise<ApiResponse<ABTest[]>> {
    try {
      const activeTests = this.modelRetrainingService.getActiveABTests();

      return {
        success: true,
        data: activeTests,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ACTIVE_AB_TESTS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get active A/B tests',
          details: error instanceof Error ? error.stack : undefined,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Detect model drift via API
   * GET /api/ml/retraining/drift/:modelId
   */
  public async detectModelDrift(modelId?: string): Promise<ApiResponse<DriftAnalysis>> {
    try {
      const driftAnalysis = await this.modelRetrainingService.detectModelDrift(modelId);

      return {
        success: true,
        data: driftAnalysis,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DRIFT_DETECTION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to detect model drift',
          details: error instanceof Error ? error.stack : undefined,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get retraining schedule via API
   * GET /api/ml/retraining/schedule
   */
  public async getRetrainingSchedule(): Promise<ApiResponse<RetrainingSchedule>> {
    try {
      const schedule = this.modelRetrainingService.getRetrainingSchedule();

      return {
        success: true,
        data: schedule,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SCHEDULE_GET_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get retraining schedule',
          details: error instanceof Error ? error.stack : undefined,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Update retraining schedule via API
   * PUT /api/ml/retraining/schedule
   */
  public async updateRetrainingSchedule(schedule: Partial<RetrainingSchedule>): Promise<ApiResponse<{ message: string }>> {
    try {
      this.modelRetrainingService.updateRetrainingSchedule(schedule);

      return {
        success: true,
        data: { message: 'Retraining schedule updated successfully' },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SCHEDULE_UPDATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update retraining schedule',
          details: error instanceof Error ? error.stack : undefined,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get retraining history via API
   * GET /api/ml/retraining/history
   */
  public async getRetrainingHistory(limit: number = 10): Promise<ApiResponse<any[]>> {
    try {
      const history = this.modelRetrainingService.getRetrainingHistory(limit);

      return {
        success: true,
        data: history,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'HISTORY_GET_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get retraining history',
          details: error instanceof Error ? error.stack : undefined,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Validate retraining request parameters
   */
  public validateRetrainingRequest(params: any): ValidationResult {
    const errors: string[] = [];

    // Validate model ID
    if (params.modelId !== undefined && typeof params.modelId !== 'string') {
      errors.push('modelId must be a string');
    }

    // Validate data window
    if (params.dataWindow !== undefined) {
      if (typeof params.dataWindow !== 'number' || params.dataWindow < 1 || params.dataWindow > 365) {
        errors.push('dataWindow must be a number between 1 and 365');
      }
    }

    // Validate force flag
    if (params.force !== undefined && typeof params.force !== 'boolean') {
      errors.push('force must be a boolean');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate A/B test request parameters
   */
  public validateABTestRequest(params: any): ValidationResult {
    const errors: string[] = [];

    // Validate challenger model ID
    if (!params.challengerModelId || typeof params.challengerModelId !== 'string') {
      errors.push('challengerModelId is required and must be a string');
    }

    // Validate champion model ID
    if (params.championModelId !== undefined && typeof params.championModelId !== 'string') {
      errors.push('championModelId must be a string');
    }

    // Validate test duration
    if (params.testDuration !== undefined) {
      if (typeof params.testDuration !== 'number' || params.testDuration < 1 || params.testDuration > 30) {
        errors.push('testDuration must be a number between 1 and 30 days');
      }
    }

    // Validate traffic split
    if (params.trafficSplit !== undefined) {
      if (typeof params.trafficSplit !== 'number' || params.trafficSplit < 0.01 || params.trafficSplit > 0.5) {
        errors.push('trafficSplit must be a number between 0.01 and 0.5');
      }
    }

    // Validate confidence threshold
    if (params.confidenceThreshold !== undefined) {
      if (typeof params.confidenceThreshold !== 'number' || params.confidenceThreshold < 0.8 || params.confidenceThreshold > 0.99) {
        errors.push('confidenceThreshold must be a number between 0.8 and 0.99');
      }
    }

    // Validate minimum sample size
    if (params.minSampleSize !== undefined) {
      if (typeof params.minSampleSize !== 'number' || params.minSampleSize < 100) {
        errors.push('minSampleSize must be a number greater than or equal to 100');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate schedule update parameters
   */
  public validateScheduleUpdate(params: any): ValidationResult {
    const errors: string[] = [];

    // Validate enabled flag
    if (params.enabled !== undefined && typeof params.enabled !== 'boolean') {
      errors.push('enabled must be a boolean');
    }

    // Validate frequency
    if (params.frequency !== undefined) {
      const validFrequencies = ['daily', 'weekly', 'monthly'];
      if (!validFrequencies.includes(params.frequency)) {
        errors.push('frequency must be one of: daily, weekly, monthly');
      }
    }

    // Validate time
    if (params.time !== undefined) {
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(params.time)) {
        errors.push('time must be in HH:MM format (24-hour)');
      }
    }

    // Validate data window
    if (params.dataWindow !== undefined) {
      if (typeof params.dataWindow !== 'number' || params.dataWindow < 1 || params.dataWindow > 365) {
        errors.push('dataWindow must be a number between 1 and 365');
      }
    }

    // Validate minimum data points
    if (params.minDataPoints !== undefined) {
      if (typeof params.minDataPoints !== 'number' || params.minDataPoints < 100) {
        errors.push('minDataPoints must be a number greater than or equal to 100');
      }
    }

    // Validate performance threshold
    if (params.performanceThreshold !== undefined) {
      if (typeof params.performanceThreshold !== 'number' || params.performanceThreshold < 0 || params.performanceThreshold > 1) {
        errors.push('performanceThreshold must be a number between 0 and 1');
      }
    }

    // Validate auto deploy flag
    if (params.autoDeploy !== undefined && typeof params.autoDeploy !== 'boolean') {
      errors.push('autoDeploy must be a boolean');
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
      baseUrl: '/api/ml/retraining',
      endpoints: [
        {
          method: 'POST',
          path: '/trigger',
          description: 'Trigger manual model retraining',
          parameters: [
            { name: 'modelId', type: 'string', required: false, description: 'Specific model to retrain' },
            { name: 'dataWindow', type: 'number', required: false, description: 'Days of historical data to use' },
            { name: 'force', type: 'boolean', required: false, description: 'Force retraining even if conditions not met' },
          ],
          responses: {
            200: 'RetrainingResult object',
            400: 'Validation error',
            500: 'Retraining failed',
          },
        },
        {
          method: 'POST',
          path: '/ab-test',
          description: 'Start A/B test between models',
          parameters: [
            { name: 'challengerModelId', type: 'string', required: true, description: 'New model to test' },
            { name: 'championModelId', type: 'string', required: false, description: 'Current champion model' },
            { name: 'testDuration', type: 'number', required: false, description: 'Test duration in days' },
            { name: 'trafficSplit', type: 'number', required: false, description: 'Traffic split for challenger' },
          ],
          responses: {
            200: 'ABTest object',
            400: 'Validation error',
            500: 'A/B test start failed',
          },
        },
        {
          method: 'GET',
          path: '/ab-test/:testId',
          description: 'Get A/B test results',
          parameters: [
            { name: 'testId', type: 'string', required: true, description: 'A/B test ID' },
          ],
          responses: {
            200: 'ABTestResult object',
            404: 'Test not found',
            500: 'Results retrieval failed',
          },
        },
        {
          method: 'POST',
          path: '/ab-test/:testId/deploy',
          description: 'Deploy A/B test winner',
          parameters: [
            { name: 'testId', type: 'string', required: true, description: 'A/B test ID' },
          ],
          responses: {
            200: 'Deployment result',
            400: 'Deployment conditions not met',
            500: 'Deployment failed',
          },
        },
        {
          method: 'GET',
          path: '/ab-tests',
          description: 'Get active A/B tests',
          responses: {
            200: 'Array of ABTest objects',
            500: 'Retrieval failed',
          },
        },
        {
          method: 'GET',
          path: '/drift/:modelId',
          description: 'Detect model drift',
          parameters: [
            { name: 'modelId', type: 'string', required: true, description: 'Model to check for drift' },
          ],
          responses: {
            200: 'DriftAnalysis object',
            500: 'Drift detection failed',
          },
        },
        {
          method: 'GET',
          path: '/schedule',
          description: 'Get retraining schedule',
          responses: {
            200: 'RetrainingSchedule object',
            500: 'Schedule retrieval failed',
          },
        },
        {
          method: 'PUT',
          path: '/schedule',
          description: 'Update retraining schedule',
          parameters: [
            { name: 'enabled', type: 'boolean', required: false, description: 'Enable/disable automated retraining' },
            { name: 'frequency', type: 'string', required: false, description: 'Retraining frequency' },
            { name: 'time', type: 'string', required: false, description: 'Daily retraining time' },
            { name: 'dataWindow', type: 'number', required: false, description: 'Historical data window in days' },
          ],
          responses: {
            200: 'Schedule updated successfully',
            400: 'Validation error',
            500: 'Schedule update failed',
          },
        },
        {
          method: 'GET',
          path: '/history',
          description: 'Get retraining history',
          parameters: [
            { name: 'limit', type: 'number', required: false, description: 'Maximum number of history items to return' },
          ],
          responses: {
            200: 'Array of retraining history items',
            500: 'History retrieval failed',
          },
        },
      ],
      rateLimits: {
        perMinute: 10,
        perHour: 50,
        burstLimit: 5,
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

export const retrainingApiService = RetrainingApiService.getInstance();