export interface StatisticalTestResult {
  testType: 'proportions' | 'means' | 'chi_square';
  statistic: number;
  pValue: number;
  confidenceLevel: number;
  effectSize: number;
  power: number;
  requiredSampleSize: number;
  interpretation: 'significant' | 'not_significant' | 'insufficient_power';
  confidenceInterval: [number, number];
}

export interface ABTestStatisticalAnalysis {
  controlVariant: {
    id: string;
    sampleSize: number;
    conversionRate: number;
    conversions: number;
  };
  testVariant: {
    id: string;
    sampleSize: number;
    conversionRate: number;
    conversions: number;
  };
  testResult: StatisticalTestResult;
  relativeImprovement: number;
  absoluteImprovement: number;
  riskAnalysis: {
    riskOfFalsePositive: number;
    riskOfFalseNegative: number;
    minimumDetectableEffect: number;
  };
  recommendations: string[];
}

export interface MultiVariantAnalysis {
  variants: Array<{
    id: string;
    sampleSize: number;
    conversionRate: number;
    conversions: number;
  }>;
  bestPerformer: string;
  statisticalResults: Array<{
    variantA: string;
    variantB: string;
    result: StatisticalTestResult;
  }>;
  overallSignificance: boolean;
  confidenceRanking: Array<{
    variantId: string;
    confidence: number;
    rank: number;
  }>;
}

export interface TrendAnalysis {
  timePoints: string[];
  controlRates: number[];
  variantRates: number[];
  statisticalTests: StatisticalTestResult[];
  trendDirection: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  confidence: number;
  crossoverPoints: string[];
}

class StatisticalSignificanceCalculator {
  private static instance: StatisticalSignificanceCalculator;

  // Statistical constants
  private readonly Z_SCORES = {
    0.80: 1.282, // 80% confidence
    0.85: 1.440, // 85% confidence
    0.90: 1.645, // 90% confidence
    0.95: 1.960, // 95% confidence
    0.99: 2.576, // 99% confidence
  };

  private constructor() {}

  public static getInstance(): StatisticalSignificanceCalculator {
    if (!StatisticalSignificanceCalculator.instance) {
      StatisticalSignificanceCalculator.instance = new StatisticalSignificanceCalculator();
    }
    return StatisticalSignificanceCalculator.instance;
  }

  /**
   * Calculate statistical significance for A/B test
   */
  public calculateABTestSignificance(
    controlConversions: number,
    controlSampleSize: number,
    variantConversions: number,
    variantSampleSize: number,
    confidenceLevel: number = 0.95
  ): StatisticalTestResult {
    const controlRate = controlConversions / controlSampleSize;
    const variantRate = variantConversions / variantSampleSize;

    // Use two-proportion z-test
    const pooledProportion = (controlConversions + variantConversions) / (controlSampleSize + variantSampleSize);
    const standardError = Math.sqrt(
      pooledProportion * (1 - pooledProportion) * (1 / controlSampleSize + 1 / variantSampleSize)
    );

    const zStatistic = Math.abs(variantRate - controlRate) / standardError;
    const pValue = this.calculatePValue(zStatistic);

    // Calculate confidence interval for difference
    const difference = variantRate - controlRate;
    const marginOfError = this.Z_SCORES[confidenceLevel as keyof typeof this.Z_SCORES] * standardError;
    const confidenceInterval: [number, number] = [
      difference - marginOfError,
      difference + marginOfError,
    ];

    // Calculate effect size (Cohen's h for proportions)
    const effectSize = this.calculateCohensH(controlRate, variantRate);

    // Calculate statistical power
    const power = this.calculatePower(controlRate, variantRate, controlSampleSize, variantSampleSize, confidenceLevel);

    // Calculate required sample size
    const requiredSampleSize = this.calculateRequiredSampleSize(controlRate, variantRate, confidenceLevel, 0.80);

    // Determine interpretation
    let interpretation: 'significant' | 'not_significant' | 'insufficient_power';
    if (pValue < (1 - confidenceLevel)) {
      interpretation = 'significant';
    } else if (power < 0.80) {
      interpretation = 'insufficient_power';
    } else {
      interpretation = 'not_significant';
    }

    return {
      testType: 'proportions',
      statistic: zStatistic,
      pValue,
      confidenceLevel,
      effectSize,
      power,
      requiredSampleSize,
      interpretation,
      confidenceInterval,
    };
  }

  /**
   * Perform comprehensive A/B test analysis
   */
  public analyzeABTest(
    controlId: string,
    controlConversions: number,
    controlSampleSize: number,
    variantId: string,
    variantConversions: number,
    variantSampleSize: number,
    confidenceLevel: number = 0.95
  ): ABTestStatisticalAnalysis {
    const testResult = this.calculateABTestSignificance(
      controlConversions,
      controlSampleSize,
      variantConversions,
      variantSampleSize,
      confidenceLevel
    );

    const controlRate = controlConversions / controlSampleSize;
    const variantRate = variantConversions / variantSampleSize;

    const relativeImprovement = controlRate > 0 ? ((variantRate - controlRate) / controlRate) * 100 : 0;
    const absoluteImprovement = variantRate - controlRate;

    // Risk analysis
    const riskAnalysis = {
      riskOfFalsePositive: testResult.pValue,
      riskOfFalseNegative: 1 - testResult.power,
      minimumDetectableEffect: this.calculateMinimumDetectableEffect(
        controlSampleSize,
        variantSampleSize,
        confidenceLevel,
        0.80
      ),
    };

    // Generate recommendations
    const recommendations = this.generateRecommendations(testResult, relativeImprovement, controlSampleSize + variantSampleSize);

    return {
      controlVariant: {
        id: controlId,
        sampleSize: controlSampleSize,
        conversionRate: controlRate,
        conversions: controlConversions,
      },
      testVariant: {
        id: variantId,
        sampleSize: variantSampleSize,
        conversionRate: variantRate,
        conversions: variantConversions,
      },
      testResult,
      relativeImprovement,
      absoluteImprovement,
      riskAnalysis,
      recommendations,
    };
  }

  /**
   * Analyze multiple variants simultaneously
   */
  public analyzeMultipleVariants(
    variants: Array<{
      id: string;
      conversions: number;
      sampleSize: number;
    }>,
    confidenceLevel: number = 0.95
  ): MultiVariantAnalysis {
    if (variants.length < 2) {
      throw new Error('At least 2 variants required for analysis');
    }

    // Assume first variant is control
    const control = variants[0];
    const testVariants = variants.slice(1);

    // Calculate pairwise statistical tests
    const statisticalResults = testVariants.map(variant => ({
      variantA: control.id,
      variantB: variant.id,
      result: this.calculateABTestSignificance(
        control.conversions,
        control.sampleSize,
        variant.conversions,
        variant.sampleSize,
        confidenceLevel
      ),
    }));

    // Find best performer
    const bestPerformer = variants.reduce((best, current) => {
      const currentRate = current.conversions / current.sampleSize;
      const bestRate = best.conversions / best.sampleSize;
      return currentRate > bestRate ? current : best;
    }).id;

    // Calculate confidence ranking
    const confidenceRanking = variants
      .map(variant => {
        const variantRate = variant.conversions / variant.sampleSize;
        const controlRate = control.conversions / control.sampleSize;
        const improvement = controlRate > 0 ? ((variantRate - controlRate) / controlRate) * 100 : 0;

        // Simplified confidence calculation
        const significance = statisticalResults.find(r =>
          r.variantA === control.id && r.variantB === variant.id
        )?.result.pValue || 1;

        return {
          variantId: variant.id,
          confidence: Math.max(0, Math.min(100, (1 - significance) * 100)),
          rank: 0, // Will be set below
        };
      })
      .sort((a, b) => b.confidence - a.confidence)
      .map((item, index) => ({ ...item, rank: index + 1 }));

    // Determine overall significance
    const significantResults = statisticalResults.filter(r => r.result.interpretation === 'significant');
    const overallSignificance = significantResults.length > 0;

    return {
      variants: variants.map(v => ({
        id: v.id,
        sampleSize: v.sampleSize,
        conversionRate: v.conversions / v.sampleSize,
        conversions: v.conversions,
      })),
      bestPerformer,
      statisticalResults,
      overallSignificance,
      confidenceRanking,
    };
  }

  /**
   * Analyze performance trends over time
   */
  public analyzeTrends(
    timePoints: string[],
    controlRates: number[],
    variantRates: number[],
    confidenceLevel: number = 0.95
  ): TrendAnalysis {
    if (timePoints.length !== controlRates.length || timePoints.length !== variantRates.length) {
      throw new Error('Time points and rates arrays must have the same length');
    }

    // Calculate statistical tests for each time point
    const statisticalTests = timePoints.map((timePoint, index) => {
      // Simplified: assume equal sample sizes for trend analysis
      const sampleSize = 1000; // This should be passed in real implementation
      const controlConversions = Math.round(controlRates[index] * sampleSize);
      const variantConversions = Math.round(variantRates[index] * sampleSize);

      return this.calculateABTestSignificance(
        controlConversions,
        sampleSize,
        variantConversions,
        sampleSize,
        confidenceLevel
      );
    });

    // Analyze trend direction
    const trendDirection = this.analyzeTrendDirection(variantRates);

    // Calculate overall confidence
    const significantTests = statisticalTests.filter(test => test.interpretation === 'significant');
    const confidence = (significantTests.length / statisticalTests.length) * 100;

    // Find crossover points (where variant surpasses control)
    const crossoverPoints: string[] = [];
    for (let i = 1; i < variantRates.length; i++) {
      if ((variantRates[i] > controlRates[i]) !== (variantRates[i - 1] > controlRates[i - 1])) {
        crossoverPoints.push(timePoints[i]);
      }
    }

    return {
      timePoints,
      controlRates,
      variantRates,
      statisticalTests,
      trendDirection,
      confidence,
      crossoverPoints,
    };
  }

  /**
   * Calculate p-value from z-statistic
   */
  private calculatePValue(zStatistic: number): number {
    // Approximation of two-tailed p-value for normal distribution
    const t = 1 / (1 + 0.2316419 * Math.abs(zStatistic));
    const d = 0.3989423 * Math.exp(-zStatistic * zStatistic / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

    return zStatistic > 0 ? 2 * (1 - p) : 2 * p;
  }

  /**
   * Calculate Cohen's h effect size for proportions
   */
  private calculateCohensH(p1: number, p2: number): number {
    const phi = Math.abs(p1 - p2) / Math.sqrt((p1 * (1 - p1) + p2 * (1 - p2)) / 2);
    return phi;
  }

  /**
   * Calculate statistical power
   */
  private calculatePower(
    p1: number,
    p2: number,
    n1: number,
    n2: number,
    alpha: number = 0.05
  ): number {
    const delta = Math.abs(p2 - p1);
    const sigma = Math.sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2);
    const zAlpha = this.Z_SCORES[alpha as keyof typeof this.Z_SCORES] || 1.96;
    const zBeta = (delta / sigma) - zAlpha;

    // Approximation of power using normal CDF
    const t = 1 / (1 + 0.2316419 * Math.abs(zBeta));
    const d = 0.3989423 * Math.exp(-zBeta * zBeta / 2);
    const power = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

    return zBeta > 0 ? power : 1 - power;
  }

  /**
   * Calculate required sample size for desired power
   */
  private calculateRequiredSampleSize(
    p1: number,
    p2: number,
    alpha: number = 0.05,
    power: number = 0.80
  ): number {
    const delta = Math.abs(p2 - p1);
    const zAlpha = this.Z_SCORES[alpha as keyof typeof this.Z_SCORES] || 1.96;
    const zBeta = this.Z_SCORES[power as keyof typeof this.Z_SCORES] || 0.84;

    const p = (p1 + p2) / 2;
    const numerator = Math.pow(zAlpha * Math.sqrt(2 * p * (1 - p)) + zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2);
    const denominator = Math.pow(delta, 2);

    return Math.ceil(numerator / denominator);
  }

  /**
   * Calculate minimum detectable effect
   */
  private calculateMinimumDetectableEffect(
    n1: number,
    n2: number,
    alpha: number = 0.05,
    power: number = 0.80
  ): number {
    const zAlpha = this.Z_SCORES[alpha as keyof typeof this.Z_SCORES] || 1.96;
    const zBeta = this.Z_SCORES[power as keyof typeof this.Z_SCORES] || 0.84;

    const p = 0.1; // Assume 10% baseline conversion rate
    const sigma = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));

    return (zAlpha + zBeta) * sigma;
  }

  /**
   * Analyze trend direction
   */
  private analyzeTrendDirection(rates: number[]): 'increasing' | 'decreasing' | 'stable' | 'volatile' {
    if (rates.length < 3) return 'stable';

    const firstHalf = rates.slice(0, Math.floor(rates.length / 2));
    const secondHalf = rates.slice(Math.floor(rates.length / 2));

    const firstAvg = firstHalf.reduce((sum, rate) => sum + rate, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, rate) => sum + rate, 0) / secondHalf.length;

    const difference = secondAvg - firstAvg;
    const threshold = Math.abs(firstAvg) * 0.05; // 5% change threshold

    if (Math.abs(difference) < threshold) return 'stable';
    if (difference > threshold) return 'increasing';
    if (difference < -threshold) return 'decreasing';

    // Check for volatility
    const variance = rates.reduce((sum, rate) => sum + Math.pow(rate - (rates.reduce((a, b) => a + b) / rates.length), 2), 0) / rates.length;
    const volatilityThreshold = Math.pow(Math.abs(firstAvg) * 0.1, 2);

    return variance > volatilityThreshold ? 'volatile' : 'stable';
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    testResult: StatisticalTestResult,
    relativeImprovement: number,
    totalSampleSize: number
  ): string[] {
    const recommendations: string[] = [];

    if (testResult.interpretation === 'significant') {
      if (relativeImprovement > 0) {
        recommendations.push(`🎉 Significant improvement detected! Implement the winning variant immediately.`);
        recommendations.push(`Expected improvement: ${relativeImprovement.toFixed(1)}% increase in conversion rate.`);
      } else {
        recommendations.push(`⚠️ Significant decrease detected. Consider reverting to control variant.`);
        recommendations.push(`Performance drop: ${Math.abs(relativeImprovement).toFixed(1)}% decrease in conversion rate.`);
      }
    } else if (testResult.interpretation === 'insufficient_power') {
      recommendations.push(`📊 Test needs more data. Continue running to reach statistical significance.`);
      recommendations.push(`Required sample size: ${testResult.requiredSampleSize.toLocaleString()} total visitors.`);
      recommendations.push(`Current sample: ${totalSampleSize.toLocaleString()} visitors.`);
    } else {
      recommendations.push(`🤔 No significant difference detected between variants.`);
      recommendations.push(`Consider testing different variations or implementing the simpler option.`);
    }

    if (testResult.power < 0.80) {
      recommendations.push(`💪 Statistical power is low (${(testResult.power * 100).toFixed(1)}%). Results may not be reliable.`);
    }

    if (Math.abs(relativeImprovement) > 50) {
      recommendations.push(`🚨 Large effect size detected. Verify test implementation and data quality.`);
    }

    return recommendations;
  }

  /**
   * Calculate confidence interval for proportion
   */
  public calculateConfidenceInterval(
    conversions: number,
    sampleSize: number,
    confidenceLevel: number = 0.95
  ): [number, number] {
    const proportion = conversions / sampleSize;
    const zScore = this.Z_SCORES[confidenceLevel as keyof typeof this.Z_SCORES] || 1.96;
    const standardError = Math.sqrt((proportion * (1 - proportion)) / sampleSize);

    const marginOfError = zScore * standardError;

    return [
      Math.max(0, proportion - marginOfError),
      Math.min(1, proportion + marginOfError),
    ];
  }

  /**
   * Perform chi-square test for independence
   */
  public performChiSquareTest(
    observed: number[][],
    confidenceLevel: number = 0.95
  ): StatisticalTestResult {
    if (observed.length !== 2 || observed[0].length !== 2) {
      throw new Error('Chi-square test requires 2x2 contingency table');
    }

    const [controlSuccess, controlFailure] = observed[0];
    const [variantSuccess, variantFailure] = observed[1];

    const total = controlSuccess + controlFailure + variantSuccess + variantFailure;
    const expected = [
      [(controlSuccess + variantSuccess) * (controlSuccess + controlFailure) / total,
       (controlSuccess + variantSuccess) * (variantSuccess + variantFailure) / total],
      [(controlFailure + variantFailure) * (controlSuccess + controlFailure) / total,
       (controlFailure + variantFailure) * (variantSuccess + variantFailure) / total],
    ];

    let chiSquare = 0;
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        chiSquare += Math.pow(observed[i][j] - expected[i][j], 2) / expected[i][j];
      }
    }

    // Chi-square critical value for df=1, alpha=0.05 is approximately 3.841
    const criticalValue = 3.841;
    const pValue = 1 - this.chiSquareCDF(chiSquare, 1);

    const effectSize = this.calculateCramersV(observed);

    return {
      testType: 'chi_square',
      statistic: chiSquare,
      pValue,
      confidenceLevel,
      effectSize,
      power: chiSquare > criticalValue ? 0.95 : 0.50, // Simplified
      requiredSampleSize: total,
      interpretation: chiSquare > criticalValue ? 'significant' : 'not_significant',
      confidenceInterval: [0, 0], // Not applicable for chi-square
    };
  }

  /**
   * Chi-square cumulative distribution function (approximation)
   */
  private chiSquareCDF(chiSquare: number, degreesOfFreedom: number): number {
    // Simplified approximation
    const x = Math.sqrt(chiSquare);
    const t = 1 / (1 + 0.2316419 * x);
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

    return x > 0 ? p : 1 - p;
  }

  /**
   * Calculate Cramer's V effect size for chi-square
   */
  private calculateCramersV(observed: number[][]): number {
    const total = observed.flat().reduce((sum, val) => sum + val, 0);
    const chiSquare = this.performChiSquareTest(observed).statistic;

    return Math.sqrt(chiSquare / (total * Math.min(observed.length - 1, observed[0].length - 1)));
  }

  /**
   * Validate statistical assumptions
   */
  public validateAssumptions(
    controlSampleSize: number,
    variantSampleSize: number,
    controlConversions: number,
    variantConversions: number
  ): {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check minimum sample sizes
    if (controlSampleSize < 100) {
      issues.push('Control group sample size is too small (< 100)');
      recommendations.push('Continue testing to reach minimum sample size of 100 per group');
    }

    if (variantSampleSize < 100) {
      issues.push('Variant group sample size is too small (< 100)');
      recommendations.push('Continue testing to reach minimum sample size of 100 per group');
    }

    // Check for extreme proportions
    const controlRate = controlConversions / controlSampleSize;
    const variantRate = variantConversions / variantSampleSize;

    if (controlRate === 0 || controlRate === 1) {
      issues.push('Control conversion rate is extreme (0% or 100%)');
      recommendations.push('Consider using continuity correction or different statistical test');
    }

    if (variantRate === 0 || variantRate === 1) {
      issues.push('Variant conversion rate is extreme (0% or 100%)');
      recommendations.push('Consider using continuity correction or different statistical test');
    }

    // Check sample size balance
    const ratio = Math.min(controlSampleSize, variantSampleSize) / Math.max(controlSampleSize, variantSampleSize);
    if (ratio < 0.5) {
      issues.push('Sample sizes are severely unbalanced');
      recommendations.push('Aim for more balanced sample sizes between groups');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations,
    };
  }
}

export const statisticalSignificanceCalculator = StatisticalSignificanceCalculator.getInstance();