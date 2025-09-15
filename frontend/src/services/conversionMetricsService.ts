import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ConversionFunnelData,
  ConversionFunnelStage,
  ConversionMetrics,
  ConversionEvent
} from '../types/conversion';
import { conversionApiService } from './conversionApiService';

export interface ConversionMetricsConfig {
  enableRealTimeUpdates: boolean;
  cacheExpiryMinutes: number;
  metricsCalculationInterval: number; // in minutes
  bottleneckThreshold: number; // percentage drop considered bottleneck
}

export interface StageMetrics {
  stageId: string;
  stageName: string;
  leadsEntered: number;
  leadsExited: number;
  conversionRate: number;
  averageTimeInStage: number; // in days
  bottleneckScore: number; // 0-100, higher = more bottleneck
  trend: 'improving' | 'declining' | 'stable';
}

export interface FunnelAnalytics {
  funnelId: number;
  funnelName: string;
  totalLeads: number;
  overallConversionRate: number;
  averageTimeToConvert: number;
  stageMetrics: StageMetrics[];
  bottlenecks: string[];
  recommendations: string[];
  lastUpdated: string;
}

class ConversionMetricsService {
  private static instance: ConversionMetricsService;
  private config: ConversionMetricsConfig;
  private metricsCache: Map<string, { data: any; timestamp: number }> = new Map();
  private calculationTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.config = {
      enableRealTimeUpdates: true,
      cacheExpiryMinutes: 15,
      metricsCalculationInterval: 5,
      bottleneckThreshold: 20 // 20% drop is considered bottleneck
    };
    this.initializeService();
  }

  static getInstance(): ConversionMetricsService {
    if (!ConversionMetricsService.instance) {
      ConversionMetricsService.instance = new ConversionMetricsService();
    }
    return ConversionMetricsService.instance;
  }

  private async initializeService(): Promise<void> {
    try {
      // Load cached configuration
      const cachedConfig = await AsyncStorage.getItem('conversionMetricsConfig');
      if (cachedConfig) {
        this.config = { ...this.config, ...JSON.parse(cachedConfig) };
      }

      // Start metrics calculation timer
      this.startMetricsCalculationTimer();
    } catch (error) {
      console.error('Failed to initialize conversion metrics service:', error);
    }
  }

  /**
   * Calculate comprehensive funnel analytics
   */
  async calculateFunnelAnalytics(funnelId?: number): Promise<FunnelAnalytics | null> {
    try {
      const cacheKey = `funnelAnalytics_${funnelId || 'default'}`;
      const cached = this.getCachedMetrics(cacheKey);
      if (cached) {
        return cached;
      }

      // Get funnel data from API
      const funnelResult = await conversionApiService.getConversionFunnel();
      if (!funnelResult.success || !funnelResult.data) {
        return null;
      }

      const funnelData = funnelResult.data;

      // Calculate stage metrics
      const stageMetrics = await this.calculateStageMetrics(funnelData.stages);

      // Identify bottlenecks
      const bottlenecks = this.identifyBottlenecks(stageMetrics);

      // Generate recommendations
      const recommendations = this.generateRecommendations(stageMetrics, bottlenecks);

      // Calculate overall metrics
      const overallConversionRate = funnelData.overallConversionRate;
      const averageTimeToConvert = funnelData.averageTimeToConvert;

      const analytics: FunnelAnalytics = {
        funnelId: funnelId || 1,
        funnelName: funnelData.funnelName,
        totalLeads: funnelData.totalLeads,
        overallConversionRate,
        averageTimeToConvert,
        stageMetrics,
        bottlenecks,
        recommendations,
        lastUpdated: new Date().toISOString()
      };

      // Cache the results
      this.setCachedMetrics(cacheKey, analytics);

      return analytics;

    } catch (error) {
      console.error('Failed to calculate funnel analytics:', error);
      return null;
    }
  }

  /**
   * Calculate detailed metrics for each stage
   */
  private async calculateStageMetrics(stages: ConversionFunnelStage[]): Promise<StageMetrics[]> {
    const stageMetrics: StageMetrics[] = [];

    for (let i = 0; i < stages.length; i++) {
      const currentStage = stages[i];
      const nextStage = stages[i + 1];

      // Calculate conversion rate to next stage
      let conversionRate = 0;
      if (nextStage) {
        conversionRate = nextStage.leadsInStage > 0
          ? (nextStage.leadsInStage / currentStage.leadsInStage) * 100
          : 0;
      } else {
        // Last stage conversion rate is based on completion
        conversionRate = currentStage.conversionRate * 100;
      }

      // Calculate bottleneck score (higher = more problematic)
      const bottleneckScore = this.calculateBottleneckScore(currentStage, nextStage, conversionRate);

      // Determine trend (would need historical data for real implementation)
      const trend = this.determineStageTrend(currentStage, conversionRate);

      const metrics: StageMetrics = {
        stageId: currentStage.stage,
        stageName: currentStage.name,
        leadsEntered: currentStage.leadsInStage,
        leadsExited: nextStage ? nextStage.leadsInStage : Math.floor(currentStage.leadsInStage * currentStage.conversionRate),
        conversionRate,
        averageTimeInStage: currentStage.averageDaysInStage,
        bottleneckScore,
        trend
      };

      stageMetrics.push(metrics);
    }

    return stageMetrics;
  }

  /**
   * Calculate bottleneck score for a stage
   */
  private calculateBottleneckScore(
    currentStage: ConversionFunnelStage,
    nextStage: ConversionFunnelStage | undefined,
    conversionRate: number
  ): number {
    let score = 0;

    // Low conversion rate
    if (conversionRate < 50) {
      score += (50 - conversionRate) * 2;
    }

    // Long time in stage
    if (currentStage.averageDaysInStage > 30) {
      score += Math.min((currentStage.averageDaysInStage - 30) * 0.5, 30);
    }

    // High lead count with low conversion
    if (currentStage.leadsInStage > 100 && conversionRate < 30) {
      score += 20;
    }

    // Sudden drop from previous stage
    if (nextStage && currentStage.leadsInStage > nextStage.leadsInStage) {
      const dropPercentage = ((currentStage.leadsInStage - nextStage.leadsInStage) / currentStage.leadsInStage) * 100;
      if (dropPercentage > this.config.bottleneckThreshold) {
        score += dropPercentage - this.config.bottleneckThreshold;
      }
    }

    return Math.min(Math.max(score, 0), 100);
  }

  /**
   * Determine trend for a stage (simplified - would use historical data)
   */
  private determineStageTrend(stage: ConversionFunnelStage, conversionRate: number): 'improving' | 'declining' | 'stable' {
    // This is a simplified implementation
    // In a real system, this would compare with historical data
    if (conversionRate > 70) {
      return 'improving';
    } else if (conversionRate < 30) {
      return 'declining';
    }
    return 'stable';
  }

  /**
   * Identify bottleneck stages
   */
  private identifyBottlenecks(stageMetrics: StageMetrics[]): string[] {
    return stageMetrics
      .filter(metrics => metrics.bottleneckScore > 50)
      .sort((a, b) => b.bottleneckScore - a.bottleneckScore)
      .map(metrics => metrics.stageName);
  }

  /**
   * Generate recommendations based on metrics
   */
  private generateRecommendations(stageMetrics: StageMetrics[], bottlenecks: string[]): string[] {
    const recommendations: string[] = [];

    // General recommendations
    if (stageMetrics.some(m => m.conversionRate < 50)) {
      recommendations.push('Focus on improving conversion rates in early stages through better lead qualification');
    }

    if (stageMetrics.some(m => m.averageTimeInStage > 14)) {
      recommendations.push('Reduce time spent in stages by streamlining processes and improving follow-up');
    }

    // Specific bottleneck recommendations
    bottlenecks.forEach(bottleneck => {
      const stage = stageMetrics.find(m => m.stageName === bottleneck);
      if (stage) {
        if (stage.conversionRate < 30) {
          recommendations.push(`Address low conversion in ${bottleneck} - consider revising qualification criteria or process`);
        }
        if (stage.averageTimeInStage > 21) {
          recommendations.push(`Reduce dwell time in ${bottleneck} - implement automated reminders and follow-ups`);
        }
      }
    });

    // Success recommendations
    if (stageMetrics.every(m => m.conversionRate > 60)) {
      recommendations.push('Excellent conversion performance - focus on scaling successful processes');
    }

    return recommendations;
  }

  /**
   * Get real-time conversion metrics
   */
  async getRealTimeMetrics(dateRange?: { start: string; end: string }): Promise<ConversionMetrics | null> {
    try {
      const cacheKey = `realTimeMetrics_${dateRange?.start || 'all'}_${dateRange?.end || 'all'}`;
      const cached = this.getCachedMetrics(cacheKey);
      if (cached) {
        return cached;
      }

      const result = await conversionApiService.getConversionMetrics(dateRange);
      if (!result.success || !result.data) {
        return null;
      }

      // Transform and enhance the metrics
      const metrics: ConversionMetrics = {
        totalConversions: result.data.totalConversions || 0,
        conversionRate: result.data.conversionRate || 0,
        averageTimeToConvert: result.data.averageTimeToConvert || 0,
        topConversionStages: (result.data.topConversionStages || []).map(stage => ({
          ...stage,
          percentage: 0 // Would calculate based on total conversions
        })),
        conversionTrends: this.generateConversionTrends(result.data)
      };

      // Cache the results
      this.setCachedMetrics(cacheKey, metrics);

      return metrics;

    } catch (error) {
      console.error('Failed to get real-time metrics:', error);
      return null;
    }
  }

  /**
   * Generate conversion trends (simplified implementation)
   */
  private generateConversionTrends(data: any): Array<{ date: string; conversions: number; rate: number }> {
    // This would typically use historical data
    // For now, return current data as a single point
    return [{
      date: new Date().toISOString().split('T')[0],
      conversions: data.totalConversions || 0,
      rate: data.conversionRate || 0
    }];
  }

  /**
   * Calculate conversion velocity (leads per day)
   */
  async calculateConversionVelocity(days: number = 30): Promise<number> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      const metrics = await this.getRealTimeMetrics({
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      });

      if (!metrics) return 0;

      return metrics.totalConversions / days;
    } catch (error) {
      console.error('Failed to calculate conversion velocity:', error);
      return 0;
    }
  }

  /**
   * Get stage performance comparison
   */
  async getStagePerformanceComparison(): Promise<Array<{
    stage: string;
    currentPerformance: number;
    targetPerformance: number;
    gap: number;
  }>> {
    try {
      const analytics = await this.calculateFunnelAnalytics();
      if (!analytics) return [];

      return analytics.stageMetrics.map(metrics => ({
        stage: metrics.stageName,
        currentPerformance: metrics.conversionRate,
        targetPerformance: 70, // Could be configurable
        gap: Math.max(0, 70 - metrics.conversionRate)
      }));
    } catch (error) {
      console.error('Failed to get stage performance comparison:', error);
      return [];
    }
  }

  /**
   * Caching methods
   */
  private getCachedMetrics(key: string): any {
    const cached = this.metricsCache.get(key);
    if (cached) {
      const age = Date.now() - cached.timestamp;
      const maxAge = this.config.cacheExpiryMinutes * 60 * 1000;
      if (age < maxAge) {
        return cached.data;
      }
      this.metricsCache.delete(key);
    }
    return null;
  }

  private setCachedMetrics(key: string, data: any): void {
    this.metricsCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Timer for periodic metrics calculation
   */
  private startMetricsCalculationTimer(): void {
    if (this.calculationTimer) {
      clearInterval(this.calculationTimer);
    }

    this.calculationTimer = setInterval(async () => {
      if (this.config.enableRealTimeUpdates) {
        try {
          // Clear expired cache entries
          this.clearExpiredCache();

          // Pre-calculate commonly used metrics
          await this.calculateFunnelAnalytics();
          await this.getRealTimeMetrics();

        } catch (error) {
          console.error('Error in metrics calculation timer:', error);
        }
      }
    }, this.config.metricsCalculationInterval * 60 * 1000);
  }

  private clearExpiredCache(): void {
    const maxAge = this.config.cacheExpiryMinutes * 60 * 1000;
    const now = Date.now();

    for (const [key, cached] of this.metricsCache.entries()) {
      if (now - cached.timestamp > maxAge) {
        this.metricsCache.delete(key);
      }
    }
  }

  /**
   * Configuration management
   */
  async updateConfig(newConfig: Partial<ConversionMetricsConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    await AsyncStorage.setItem('conversionMetricsConfig', JSON.stringify(this.config));

    // Restart timer with new interval
    this.startMetricsCalculationTimer();
  }

  getConfig(): ConversionMetricsConfig {
    return { ...this.config };
  }

  /**
   * Cleanup method
   */
  async cleanup(): Promise<void> {
    if (this.calculationTimer) {
      clearInterval(this.calculationTimer);
      this.calculationTimer = null;
    }
    this.metricsCache.clear();
  }
}

// Export singleton instance
export const conversionMetricsService = ConversionMetricsService.getInstance();
export default conversionMetricsService;