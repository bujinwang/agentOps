import { ABTest, ABTestVariant, ABTestResults } from '../types/template';

export interface PerformanceMetric {
  testId: string;
  variantId: string;
  metric: 'impressions' | 'opens' | 'clicks' | 'responses' | 'conversions';
  count: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface TestPerformanceSnapshot {
  testId: string;
  timestamp: string;
  variants: {
    variantId: string;
    impressions: number;
    opens: number;
    clicks: number;
    responses: number;
    conversions: number;
    openRate: number;
    clickRate: number;
    responseRate: number;
    conversionRate: number;
  }[];
  overall: {
    totalImpressions: number;
    totalOpens: number;
    totalClicks: number;
    totalResponses: number;
    totalConversions: number;
    averageOpenRate: number;
    averageClickRate: number;
    averageResponseRate: number;
    averageConversionRate: number;
  };
}

export interface PerformanceAlert {
  id: string;
  testId: string;
  type: 'early_winner' | 'no_difference' | 'high_variance' | 'low_conversion' | 'sample_size';
  severity: 'low' | 'medium' | 'high';
  message: string;
  recommendation: string;
  triggeredAt: string;
  resolvedAt?: string;
}

export interface StatisticalAnalysis {
  testId: string;
  variantId: string;
  sampleSize: number;
  conversionRate: number;
  standardError: number;
  confidenceInterval: [number, number];
  statisticalSignificance: number;
  relativeImprovement: number;
  requiredSampleSize: number;
  power: number;
}

class ABTestPerformanceTracker {
  private static instance: ABTestPerformanceTracker;
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private snapshots: Map<string, TestPerformanceSnapshot[]> = new Map();
  private alerts: Map<string, PerformanceAlert[]> = new Map();
  private readonly SNAPSHOT_INTERVAL = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    // Start periodic snapshot generation
    this.startSnapshotScheduler();
  }

  public static getInstance(): ABTestPerformanceTracker {
    if (!ABTestPerformanceTracker.instance) {
      ABTestPerformanceTracker.instance = new ABTestPerformanceTracker();
    }
    return ABTestPerformanceTracker.instance;
  }

  /**
   * Track a performance metric
   */
  public trackMetric(
    testId: string,
    variantId: string,
    metric: PerformanceMetric['metric'],
    metadata?: Record<string, any>
  ): void {
    const performanceMetric: PerformanceMetric = {
      testId,
      variantId,
      metric,
      count: 1,
      timestamp: new Date().toISOString(),
      metadata,
    };

    const testMetrics = this.metrics.get(testId) || [];
    testMetrics.push(performanceMetric);
    this.metrics.set(testId, testMetrics);

    // Check for alerts
    this.checkForAlerts(testId);
  }

  /**
   * Track multiple metrics at once
   */
  public trackMetrics(
    testId: string,
    variantId: string,
    metrics: Partial<Record<PerformanceMetric['metric'], number>>,
    metadata?: Record<string, any>
  ): void {
    Object.entries(metrics).forEach(([metric, count]) => {
      for (let i = 0; i < count; i++) {
        this.trackMetric(testId, variantId, metric as PerformanceMetric['metric'], metadata);
      }
    });
  }

  /**
   * Get current performance for a test
   */
  public getCurrentPerformance(testId: string): TestPerformanceSnapshot | null {
    const testMetrics = this.metrics.get(testId);
    if (!testMetrics) return null;

    return this.calculatePerformanceSnapshot(testId, testMetrics);
  }

  /**
   * Get performance history for a test
   */
  public getPerformanceHistory(testId: string, hours: number = 24): TestPerformanceSnapshot[] {
    const snapshots = this.snapshots.get(testId) || [];
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);

    return snapshots.filter(snapshot =>
      new Date(snapshot.timestamp).getTime() > cutoffTime
    );
  }

  /**
   * Get statistical analysis for a test
   */
  public getStatisticalAnalysis(testId: string, variants: ABTestVariant[]): StatisticalAnalysis[] {
    const testMetrics = this.metrics.get(testId);
    if (!testMetrics) return [];

    return variants.map(variant => {
      const variantMetrics = testMetrics.filter(m => m.variantId === variant.id);
      const conversions = variantMetrics.filter(m => m.metric === 'conversions').length;
      const impressions = variantMetrics.filter(m => m.metric === 'impressions').length;

      if (impressions === 0) {
        return {
          testId,
          variantId: variant.id,
          sampleSize: 0,
          conversionRate: 0,
          standardError: 0,
          confidenceInterval: [0, 0],
          statisticalSignificance: 0,
          relativeImprovement: 0,
          requiredSampleSize: 1000,
          power: 0,
        };
      }

      const conversionRate = conversions / impressions;
      const standardError = Math.sqrt((conversionRate * (1 - conversionRate)) / impressions);
      const confidenceInterval: [number, number] = [
        Math.max(0, conversionRate - 1.96 * standardError),
        Math.min(1, conversionRate + 1.96 * standardError),
      ];

      // Calculate required sample size for 80% power and 5% significance
      const requiredSampleSize = this.calculateRequiredSampleSize(conversionRate, 0.05, 0.80);

      // Calculate statistical power
      const power = this.calculateStatisticalPower(impressions, conversionRate, 0.05);

      // Calculate relative improvement (compared to control if exists)
      const controlVariant = variants.find(v => v.isControl);
      let relativeImprovement = 0;

      if (controlVariant && controlVariant.id !== variant.id) {
        const controlMetrics = testMetrics.filter(m => m.variantId === controlVariant.id);
        const controlConversions = controlMetrics.filter(m => m.metric === 'conversions').length;
        const controlImpressions = controlMetrics.filter(m => m.metric === 'impressions').length;

        if (controlImpressions > 0) {
          const controlRate = controlConversions / controlImpressions;
          if (controlRate > 0) {
            relativeImprovement = ((conversionRate - controlRate) / controlRate) * 100;
          }
        }
      }

      return {
        testId,
        variantId: variant.id,
        sampleSize: impressions,
        conversionRate,
        standardError,
        confidenceInterval,
        statisticalSignificance: power * 100, // Simplified
        relativeImprovement,
        requiredSampleSize,
        power,
      };
    });
  }

  /**
   * Calculate required sample size for statistical significance
   */
  private calculateRequiredSampleSize(
    baselineRate: number,
    significanceLevel: number = 0.05,
    power: number = 0.80
  ): number {
    // Simplified calculation using normal approximation
    const zAlpha = 1.96; // 95% confidence
    const zBeta = 0.84; // 80% power

    const effectSize = 0.1; // Assume 10% minimum detectable effect
    const p = (baselineRate + (baselineRate + effectSize)) / 2;
    const numerator = Math.pow(zAlpha * Math.sqrt(2 * p * (1 - p)) + zBeta * Math.sqrt(baselineRate * (1 - baselineRate) + (baselineRate + effectSize) * (1 - baselineRate - effectSize)), 2);
    const denominator = Math.pow(effectSize, 2);

    return Math.ceil(numerator / denominator);
  }

  /**
   * Calculate statistical power
   */
  private calculateStatisticalPower(
    sampleSize: number,
    conversionRate: number,
    significanceLevel: number = 0.05
  ): number {
    if (sampleSize < 100) return 0;

    // Simplified power calculation
    const standardError = Math.sqrt((conversionRate * (1 - conversionRate)) / sampleSize);
    const zScore = 1.96; // 95% confidence
    const effectSize = 0.1; // Assume 10% effect

    const nonCentrality = effectSize / standardError;
    const power = 1 - this.normalCDF(zScore - nonCentrality);

    return Math.min(1, Math.max(0, power));
  }

  /**
   * Normal cumulative distribution function (approximation)
   */
  private normalCDF(x: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const probability = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

    return x > 0 ? 1 - probability : probability;
  }

  /**
   * Check for performance alerts
   */
  private checkForAlerts(testId: string): void {
    const performance = this.getCurrentPerformance(testId);
    if (!performance) return;

    const existingAlerts = this.alerts.get(testId) || [];
    const newAlerts: PerformanceAlert[] = [];

    // Check for early winner
    const significantVariants = performance.variants.filter(v =>
      v.conversionRate > performance.overall.averageConversionRate * 1.2 &&
      v.impressions >= 1000
    );

    if (significantVariants.length > 0) {
      newAlerts.push({
        id: `alert_${Date.now()}_early_winner`,
        testId,
        type: 'early_winner',
        severity: 'medium',
        message: `Early winner detected: ${significantVariants[0].variantId} shows ${Math.round(significantVariants[0].conversionRate * 100)}% conversion rate`,
        recommendation: 'Consider concluding test early if trend continues',
        triggeredAt: new Date().toISOString(),
      });
    }

    // Check for low conversion rates
    if (performance.overall.averageConversionRate < 0.01 && performance.overall.totalImpressions >= 5000) {
      newAlerts.push({
        id: `alert_${Date.now()}_low_conversion`,
        testId,
        type: 'low_conversion',
        severity: 'high',
        message: 'Overall conversion rate is below 1% with significant sample size',
        recommendation: 'Review test variants and consider major changes to improve engagement',
        triggeredAt: new Date().toISOString(),
      });
    }

    // Check for no significant difference
    const highVarianceVariants = performance.variants.filter(v =>
      Math.abs(v.conversionRate - performance.overall.averageConversionRate) < 0.005 &&
      v.impressions >= 2000
    );

    if (highVarianceVariants.length === performance.variants.length) {
      newAlerts.push({
        id: `alert_${Date.now()}_no_difference`,
        testId,
        type: 'no_difference',
        severity: 'medium',
        message: 'All variants show similar performance with adequate sample size',
        recommendation: 'Consider testing different variations or concluding test',
        triggeredAt: new Date().toISOString(),
      });
    }

    // Check sample size requirements
    const underSampledVariants = performance.variants.filter(v => v.impressions < 1000);
    if (underSampledVariants.length > 0) {
      newAlerts.push({
        id: `alert_${Date.now()}_sample_size`,
        testId,
        type: 'sample_size',
        severity: 'low',
        message: `${underSampledVariants.length} variants have insufficient sample size for reliable results`,
        recommendation: 'Continue running test to reach minimum sample size',
        triggeredAt: new Date().toISOString(),
      });
    }

    // Add new alerts
    this.alerts.set(testId, [...existingAlerts, ...newAlerts]);
  }

  /**
   * Get active alerts for a test
   */
  public getActiveAlerts(testId: string): PerformanceAlert[] {
    const allAlerts = this.alerts.get(testId) || [];
    return allAlerts.filter(alert => !alert.resolvedAt);
  }

  /**
   * Resolve an alert
   */
  public resolveAlert(testId: string, alertId: string): boolean {
    const alerts = this.alerts.get(testId);
    if (!alerts) return false;

    const alert = alerts.find(a => a.id === alertId);
    if (!alert) return false;

    alert.resolvedAt = new Date().toISOString();
    return true;
  }

  /**
   * Calculate performance snapshot
   */
  private calculatePerformanceSnapshot(
    testId: string,
    metrics: PerformanceMetric[]
  ): TestPerformanceSnapshot {
    const variantStats: Record<string, any> = {};

    // Group metrics by variant
    metrics.forEach(metric => {
      if (!variantStats[metric.variantId]) {
        variantStats[metric.variantId] = {
          impressions: 0,
          opens: 0,
          clicks: 0,
          responses: 0,
          conversions: 0,
        };
      }

      variantStats[metric.variantId][metric.metric] += metric.count;
    });

    // Calculate rates and build variants array
    const variants = Object.entries(variantStats).map(([variantId, stats]: [string, any]) => ({
      variantId,
      impressions: stats.impressions,
      opens: stats.opens,
      clicks: stats.clicks,
      responses: stats.responses,
      conversions: stats.conversions,
      openRate: stats.impressions > 0 ? stats.opens / stats.impressions : 0,
      clickRate: stats.impressions > 0 ? stats.clicks / stats.impressions : 0,
      responseRate: stats.impressions > 0 ? stats.responses / stats.impressions : 0,
      conversionRate: stats.impressions > 0 ? stats.conversions / stats.impressions : 0,
    }));

    // Calculate overall statistics
    const overall = variants.reduce(
      (acc, variant) => ({
        totalImpressions: acc.totalImpressions + variant.impressions,
        totalOpens: acc.totalOpens + variant.opens,
        totalClicks: acc.totalClicks + variant.clicks,
        totalResponses: acc.totalResponses + variant.responses,
        totalConversions: acc.totalConversions + variant.conversions,
        averageOpenRate: 0, // Will be calculated after
        averageClickRate: 0,
        averageResponseRate: 0,
        averageConversionRate: 0,
      }),
      {
        totalImpressions: 0,
        totalOpens: 0,
        totalClicks: 0,
        totalResponses: 0,
        totalConversions: 0,
        averageOpenRate: 0,
        averageClickRate: 0,
        averageResponseRate: 0,
        averageConversionRate: 0,
      }
    );

    // Calculate averages
    const variantCount = variants.length;
    if (variantCount > 0) {
      overall.averageOpenRate = variants.reduce((sum, v) => sum + v.openRate, 0) / variantCount;
      overall.averageClickRate = variants.reduce((sum, v) => sum + v.clickRate, 0) / variantCount;
      overall.averageResponseRate = variants.reduce((sum, v) => sum + v.responseRate, 0) / variantCount;
      overall.averageConversionRate = variants.reduce((sum, v) => sum + v.conversionRate, 0) / variantCount;
    }

    return {
      testId,
      timestamp: new Date().toISOString(),
      variants,
      overall,
    };
  }

  /**
   * Start periodic snapshot generation
   */
  private startSnapshotScheduler(): void {
    setInterval(() => {
      this.generateSnapshots();
    }, this.SNAPSHOT_INTERVAL);
  }

  /**
   * Generate snapshots for all active tests
   */
  private generateSnapshots(): void {
    for (const testId of this.metrics.keys()) {
      const performance = this.getCurrentPerformance(testId);
      if (performance) {
        const snapshots = this.snapshots.get(testId) || [];
        snapshots.push(performance);

        // Keep only last 24 hours of snapshots (288 snapshots at 5-minute intervals)
        if (snapshots.length > 288) {
          snapshots.splice(0, snapshots.length - 288);
        }

        this.snapshots.set(testId, snapshots);
      }
    }
  }

  /**
   * Get performance trends
   */
  public getPerformanceTrends(testId: string, hours: number = 24): {
    timestamp: string;
    overallConversionRate: number;
    variantRates: Record<string, number>;
  }[] {
    const snapshots = this.getPerformanceHistory(testId, hours);

    return snapshots.map(snapshot => ({
      timestamp: snapshot.timestamp,
      overallConversionRate: snapshot.overall.averageConversionRate,
      variantRates: snapshot.variants.reduce((acc, variant) => {
        acc[variant.variantId] = variant.conversionRate;
        return acc;
      }, {} as Record<string, number>),
    }));
  }

  /**
   * Clean up old data
   */
  public cleanup(maxAgeDays: number = 30): void {
    const cutoffTime = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);

    // Clean up metrics
    for (const [testId, testMetrics] of this.metrics) {
      const recentMetrics = testMetrics.filter(metric =>
        new Date(metric.timestamp).getTime() > cutoffTime
      );

      if (recentMetrics.length > 0) {
        this.metrics.set(testId, recentMetrics);
      } else {
        this.metrics.delete(testId);
      }
    }

    // Clean up snapshots
    for (const [testId, testSnapshots] of this.snapshots) {
      const recentSnapshots = testSnapshots.filter(snapshot =>
        new Date(snapshot.timestamp).getTime() > cutoffTime
      );

      if (recentSnapshots.length > 0) {
        this.snapshots.set(testId, recentSnapshots);
      } else {
        this.snapshots.delete(testId);
      }
    }

    // Clean up alerts
    for (const [testId, testAlerts] of this.alerts) {
      const recentAlerts = testAlerts.filter(alert =>
        new Date(alert.triggeredAt).getTime() > cutoffTime
      );

      if (recentAlerts.length > 0) {
        this.alerts.set(testId, recentAlerts);
      } else {
        this.alerts.delete(testId);
      }
    }
  }

  /**
   * Get tracker statistics
   */
  public getStatistics(): {
    activeTests: number;
    totalMetrics: number;
    totalSnapshots: number;
    totalAlerts: number;
    averageMetricsPerTest: number;
  } {
    const activeTests = this.metrics.size;
    const totalMetrics = Array.from(this.metrics.values()).reduce((sum, metrics) => sum + metrics.length, 0);
    const totalSnapshots = Array.from(this.snapshots.values()).reduce((sum, snapshots) => sum + snapshots.length, 0);
    const totalAlerts = Array.from(this.alerts.values()).reduce((sum, alerts) => sum + alerts.length, 0);

    return {
      activeTests,
      totalMetrics,
      totalSnapshots,
      totalAlerts,
      averageMetricsPerTest: activeTests > 0 ? totalMetrics / activeTests : 0,
    };
  }
}

export const abTestPerformanceTracker = ABTestPerformanceTracker.getInstance();