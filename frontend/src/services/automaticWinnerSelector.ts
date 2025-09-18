import { ABTest, ABTestVariant, ABTestResults } from '../types/template';
import { StatisticalTestResult, ABTestStatisticalAnalysis, statisticalSignificanceCalculator } from './statisticalSignificanceCalculator';

export interface WinnerSelectionCriteria {
  minimumConfidence: number; // 0.95 for 95% confidence
  minimumSampleSize: number; // Minimum total sample size
  minimumEffectSize: number; // Minimum relative improvement
  maximumTestDuration: number; // Maximum test duration in days
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
}

export interface WinnerRecommendation {
  testId: string;
  winner: {
    variantId: string;
    variant: ABTestVariant;
    confidence: number;
    relativeImprovement: number;
    absoluteImprovement: number;
  };
  runnerUp?: {
    variantId: string;
    variant: ABTestVariant;
    confidence: number;
    relativeImprovement: number;
  };
  decision: 'implement_winner' | 'continue_testing' | 'no_clear_winner' | 'stop_test';
  reasoning: string[];
  riskAssessment: {
    falsePositiveRisk: number;
    falseNegativeRisk: number;
    opportunityCost: number;
    implementationRisk: string;
  };
  nextSteps: string[];
  confidence: number;
  timestamp: string;
}

export interface WinnerSelectionResult {
  recommendation: WinnerRecommendation;
  analysis: ABTestStatisticalAnalysis;
  criteria: WinnerSelectionCriteria;
  metadata: {
    testDuration: number;
    totalSampleSize: number;
    variantsAnalyzed: number;
    statisticalTestsPerformed: number;
  };
}

export interface SequentialTestingResult {
  canStop: boolean;
  winner?: string;
  confidence: number;
  remainingTests: number;
  estimatedCompletionTime: string;
  reasoning: string[];
}

class AutomaticWinnerSelector {
  private static instance: AutomaticWinnerSelector;

  // Default criteria for different risk tolerances
  private readonly DEFAULT_CRITERIA = {
    conservative: {
      minimumConfidence: 0.99,
      minimumSampleSize: 10000,
      minimumEffectSize: 0.10, // 10% improvement
      maximumTestDuration: 30,
      riskTolerance: 'conservative' as const,
    },
    moderate: {
      minimumConfidence: 0.95,
      minimumSampleSize: 5000,
      minimumEffectSize: 0.05, // 5% improvement
      maximumTestDuration: 14,
      riskTolerance: 'moderate' as const,
    },
    aggressive: {
      minimumConfidence: 0.90,
      minimumSampleSize: 2000,
      minimumEffectSize: 0.02, // 2% improvement
      maximumTestDuration: 7,
      riskTolerance: 'aggressive' as const,
    },
  };

  private constructor() {}

  public static getInstance(): AutomaticWinnerSelector {
    if (!AutomaticWinnerSelector.instance) {
      AutomaticWinnerSelector.instance = new AutomaticWinnerSelector();
    }
    return AutomaticWinnerSelector.instance;
  }

  /**
   * Analyze A/B test and recommend winner
   */
  public analyzeAndRecommendWinner(
    test: ABTest,
    customCriteria?: Partial<WinnerSelectionCriteria>
  ): WinnerSelectionResult {
    const criteria = this.buildCriteria(test.criteria, customCriteria);
    const analysis = this.performStatisticalAnalysis(test);

    const recommendation = this.generateRecommendation(test, analysis, criteria);
    const metadata = this.generateMetadata(test, analysis);

    return {
      recommendation,
      analysis,
      criteria,
      metadata,
    };
  }

  /**
   * Perform sequential testing analysis
   */
  public performSequentialTesting(
    test: ABTest,
    currentResults: ABTestResults,
    checkInterval: number = 100 // Check every 100 new visitors
  ): SequentialTestingResult {
    const totalSample = currentResults.totalSent;
    const variants = currentResults.variants;

    if (variants.length < 2) {
      return {
        canStop: false,
        confidence: 0,
        remainingTests: 0,
        estimatedCompletionTime: '',
        reasoning: ['Insufficient variants for sequential testing'],
      };
    }

    // Find the best performing variant
    const bestVariant = variants.reduce((best, current) =>
      current.conversionRate > best.conversionRate ? current : best
    );

    // Perform statistical test against control
    const controlVariant = variants.find(v => v.variantId.includes('control')) || variants[0];
    const analysis = statisticalSignificanceCalculator.analyzeABTest(
      controlVariant.variantId,
      controlVariant.conversions,
      controlVariant.sent,
      bestVariant.variantId,
      bestVariant.conversions,
      bestVariant.sent
    );

    const confidence = analysis.testResult.confidenceLevel;
    const minimumSampleSize = this.calculateRequiredSampleSize(analysis);

    // Determine if we can stop
    const canStop = this.evaluateStoppingRules(
      analysis,
      totalSample,
      minimumSampleSize,
      test.criteria.testDuration
    );

    const remainingTests = canStop ? 0 : Math.ceil((minimumSampleSize - totalSample) / checkInterval);

    return {
      canStop,
      winner: canStop ? bestVariant.variantId : undefined,
      confidence,
      remainingTests,
      estimatedCompletionTime: canStop ? new Date().toISOString() :
        new Date(Date.now() + (remainingTests * checkInterval * 1000)).toISOString(),
      reasoning: this.generateSequentialReasoning(analysis, canStop, remainingTests),
    };
  }

  /**
   * Build selection criteria
   */
  private buildCriteria(
    testCriteria: any,
    customCriteria?: Partial<WinnerSelectionCriteria>
  ): WinnerSelectionCriteria {
    const riskTolerance = customCriteria?.riskTolerance ||
      this.determineRiskTolerance(testCriteria.targetMetric);

    const baseCriteria = this.DEFAULT_CRITERIA[riskTolerance];

    return {
      ...baseCriteria,
      ...customCriteria,
    };
  }

  /**
   * Determine risk tolerance based on target metric
   */
  private determineRiskTolerance(targetMetric: string): 'conservative' | 'moderate' | 'aggressive' {
    switch (targetMetric) {
      case 'conversion_rate':
        return 'conservative'; // High business impact
      case 'response_rate':
        return 'moderate'; // Medium business impact
      case 'click_rate':
      case 'open_rate':
        return 'aggressive'; // Lower business impact
      default:
        return 'moderate';
    }
  }

  /**
   * Perform comprehensive statistical analysis
   */
  private performStatisticalAnalysis(test: ABTest): ABTestStatisticalAnalysis {
    const variants = test.variants;
    const results = test.results;

    if (!results || variants.length < 2) {
      throw new Error('Insufficient test data for analysis');
    }

    // Find control variant
    const controlVariant = variants.find(v => v.isControl) || variants[0];
    const controlResult = results.variants.find(v => v.variantId === controlVariant.id);

    // Find best performing variant
    const bestResult = results.variants.reduce((best, current) =>
      current.conversionRate > best.conversionRate ? current : best
    );

    if (!controlResult) {
      throw new Error('Control variant results not found');
    }

    return statisticalSignificanceCalculator.analyzeABTest(
      controlResult.variantId,
      controlResult.conversions,
      controlResult.sent,
      bestResult.variantId,
      bestResult.conversions,
      bestResult.sent
    );
  }

  /**
   * Generate winner recommendation
   */
  private generateRecommendation(
    test: ABTest,
    analysis: ABTestStatisticalAnalysis,
    criteria: WinnerSelectionCriteria
  ): WinnerRecommendation {
    const testDuration = this.calculateTestDuration(test);
    const totalSampleSize = analysis.controlVariant.sampleSize + analysis.testVariant.sampleSize;

    // Evaluate stopping conditions
    const shouldImplement = this.evaluateImplementationCriteria(
      analysis,
      criteria,
      testDuration,
      totalSampleSize
    );

    const shouldContinue = this.evaluateContinuationCriteria(
      analysis,
      criteria,
      totalSampleSize
    );

    const shouldStop = this.evaluateStopCriteria(
      analysis,
      criteria,
      testDuration
    );

    // Determine decision
    let decision: WinnerRecommendation['decision'];
    let winner: WinnerRecommendation['winner'] | undefined;
    let reasoning: string[] = [];

    if (shouldImplement) {
      decision = 'implement_winner';
      winner = {
        variantId: analysis.testVariant.id,
        variant: test.variants.find(v => v.id === analysis.testVariant.id)!,
        confidence: analysis.testResult.confidenceLevel,
        relativeImprovement: analysis.relativeImprovement,
        absoluteImprovement: analysis.absoluteImprovement,
      };
      reasoning = this.generateImplementationReasoning(analysis, criteria);
    } else if (shouldContinue) {
      decision = 'continue_testing';
      reasoning = this.generateContinuationReasoning(analysis, criteria, totalSampleSize);
    } else if (shouldStop) {
      decision = 'stop_test';
      reasoning = this.generateStopReasoning(analysis, criteria);
    } else {
      decision = 'no_clear_winner';
      reasoning = this.generateNoWinnerReasoning(analysis, criteria);
    }

    // Generate risk assessment
    const riskAssessment = this.assessRisks(analysis, decision);

    // Generate next steps
    const nextSteps = this.generateNextSteps(decision, test, winner);

    return {
      testId: test.id,
      winner,
      decision,
      reasoning,
      riskAssessment,
      nextSteps,
      confidence: analysis.testResult.confidenceLevel,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Evaluate if winner should be implemented
   */
  private evaluateImplementationCriteria(
    analysis: ABTestStatisticalAnalysis,
    criteria: WinnerSelectionCriteria,
    testDuration: number,
    totalSampleSize: number
  ): boolean {
    return (
      analysis.testResult.interpretation === 'significant' &&
      analysis.testResult.confidenceLevel >= criteria.minimumConfidence &&
      totalSampleSize >= criteria.minimumSampleSize &&
      Math.abs(analysis.relativeImprovement) >= criteria.minimumEffectSize &&
      testDuration <= criteria.maximumTestDuration
    );
  }

  /**
   * Evaluate if testing should continue
   */
  private evaluateContinuationCriteria(
    analysis: ABTestStatisticalAnalysis,
    criteria: WinnerSelectionCriteria,
    totalSampleSize: number
  ): boolean {
    return (
      totalSampleSize < criteria.minimumSampleSize ||
      analysis.testResult.power < 0.80 ||
      analysis.testResult.interpretation === 'insufficient_power'
    );
  }

  /**
   * Evaluate if test should be stopped
   */
  private evaluateStopCriteria(
    analysis: ABTestStatisticalAnalysis,
    criteria: WinnerSelectionCriteria,
    testDuration: number
  ): boolean {
    return (
      testDuration >= criteria.maximumTestDuration ||
      (analysis.testResult.interpretation === 'not_significant' &&
       analysis.testResult.power >= 0.80 &&
       analysis.testResult.sampleSize >= criteria.minimumSampleSize)
    );
  }

  /**
   * Generate reasoning for implementation decision
   */
  private generateImplementationReasoning(
    analysis: ABTestStatisticalAnalysis,
    criteria: WinnerSelectionCriteria
  ): string[] {
    const reasoning: string[] = [];

    reasoning.push(`🎯 Statistical significance achieved with ${(analysis.testResult.confidenceLevel * 100).toFixed(1)}% confidence`);
    reasoning.push(`📈 Relative improvement: ${analysis.relativeImprovement.toFixed(1)}% (${analysis.absoluteImprovement.toFixed(3)} absolute)`);
    reasoning.push(`📊 Sample size: ${analysis.controlVariant.sampleSize + analysis.testVariant.sampleSize} visitors`);
    reasoning.push(`⚡ Effect size meets minimum threshold of ${(criteria.minimumEffectSize * 100).toFixed(1)}%`);

    if (analysis.relativeImprovement > 0) {
      reasoning.push(`💰 Expected business impact: Positive conversion rate improvement`);
    } else {
      reasoning.push(`⚠️ Winner performs worse than control - consider implementation risks`);
    }

    return reasoning;
  }

  /**
   * Generate reasoning for continuation decision
   */
  private generateContinuationReasoning(
    analysis: ABTestStatisticalAnalysis,
    criteria: WinnerSelectionCriteria,
    totalSampleSize: number
  ): string[] {
    const reasoning: string[] = [];

    if (totalSampleSize < criteria.minimumSampleSize) {
      reasoning.push(`📊 Insufficient sample size: ${totalSampleSize} < ${criteria.minimumSampleSize} required`);
    }

    if (analysis.testResult.power < 0.80) {
      reasoning.push(`⚡ Low statistical power: ${(analysis.testResult.power * 100).toFixed(1)}% < 80% required`);
    }

    if (analysis.testResult.interpretation === 'insufficient_power') {
      reasoning.push(`🔄 Test needs more data to reach statistical significance`);
    }

    reasoning.push(`⏳ Continue testing to gather more conclusive results`);

    return reasoning;
  }

  /**
   * Generate reasoning for stop decision
   */
  private generateStopReasoning(
    analysis: ABTestStatisticalAnalysis,
    criteria: WinnerSelectionCriteria
  ): string[] {
    const reasoning: string[] = [];

    reasoning.push(`⏰ Maximum test duration reached`);
    reasoning.push(`🤔 No statistically significant difference detected`);
    reasoning.push(`💡 Consider testing different variations or implementing simpler solution`);

    return reasoning;
  }

  /**
   * Generate reasoning for no clear winner
   */
  private generateNoWinnerReasoning(
    analysis: ABTestStatisticalAnalysis,
    criteria: WinnerSelectionCriteria
  ): string[] {
    const reasoning: string[] = [];

    reasoning.push(`⚖️ Results are inconclusive`);
    reasoning.push(`📊 Statistical significance: ${analysis.testResult.interpretation}`);
    reasoning.push(`🎯 Effect size: ${analysis.relativeImprovement.toFixed(1)}% (threshold: ${(criteria.minimumEffectSize * 100).toFixed(1)}%)`);

    return reasoning;
  }

  /**
   * Assess risks for the decision
   */
  private assessRisks(
    analysis: ABTestStatisticalAnalysis,
    decision: WinnerRecommendation['decision']
  ): WinnerRecommendation['riskAssessment'] {
    const falsePositiveRisk = analysis.riskAnalysis.riskOfFalsePositive;
    const falseNegativeRisk = analysis.riskAnalysis.riskOfFalseNegative;

    let opportunityCost = 0;
    let implementationRisk = '';

    switch (decision) {
      case 'implement_winner':
        opportunityCost = analysis.relativeImprovement > 0 ? 0 : Math.abs(analysis.relativeImprovement);
        implementationRisk = analysis.relativeImprovement < 0 ?
          'Implementing worse-performing variant may decrease conversions' :
          'Low risk - winner shows positive improvement';
        break;
      case 'continue_testing':
        opportunityCost = Math.max(0, analysis.relativeImprovement * 0.1); // 10% of potential benefit
        implementationRisk = 'Delaying decision may miss optimization opportunities';
        break;
      case 'stop_test':
        opportunityCost = Math.max(0, analysis.relativeImprovement);
        implementationRisk = 'Stopping test may miss potential improvements';
        break;
      case 'no_clear_winner':
        opportunityCost = Math.max(0, analysis.relativeImprovement * 0.5);
        implementationRisk = 'Inconclusive results increase decision uncertainty';
        break;
    }

    return {
      falsePositiveRisk,
      falseNegativeRisk,
      opportunityCost,
      implementationRisk,
    };
  }

  /**
   * Generate next steps based on decision
   */
  private generateNextSteps(
    decision: WinnerRecommendation['decision'],
    test: ABTest,
    winner?: WinnerRecommendation['winner']
  ): string[] {
    const nextSteps: string[] = [];

    switch (decision) {
      case 'implement_winner':
        nextSteps.push(`🚀 Implement winning variant: ${winner?.variant.name}`);
        nextSteps.push(`📊 Set up monitoring for conversion rate changes`);
        nextSteps.push(`🔄 Plan next A/B test for further optimization`);
        nextSteps.push(`📈 Update performance baselines`);
        break;

      case 'continue_testing':
        nextSteps.push(`⏳ Continue running the A/B test`);
        nextSteps.push(`📊 Monitor performance trends`);
        nextSteps.push(`🎯 Check again after reaching minimum sample size`);
        break;

      case 'stop_test':
        nextSteps.push(`🛑 Stop the A/B test`);
        nextSteps.push(`📊 Document test results and learnings`);
        nextSteps.push(`🎯 Design new test with different variations`);
        break;

      case 'no_clear_winner':
        nextSteps.push(`🤔 Review test design and variations`);
        nextSteps.push(`📊 Analyze why results were inconclusive`);
        nextSteps.push(`🎯 Consider testing more distinct variations`);
        break;
    }

    return nextSteps;
  }

  /**
   * Calculate test duration
   */
  private calculateTestDuration(test: ABTest): number {
    const startTime = test.startedAt ? new Date(test.startedAt).getTime() : Date.now();
    const endTime = test.completedAt ? new Date(test.completedAt).getTime() : Date.now();

    return Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24)); // days
  }

  /**
   * Calculate required sample size
   */
  private calculateRequiredSampleSize(analysis: ABTestStatisticalAnalysis): number {
    return analysis.testResult.requiredSampleSize;
  }

  /**
   * Generate metadata
   */
  private generateMetadata(
    test: ABTest,
    analysis: ABTestStatisticalAnalysis
  ): WinnerSelectionResult['metadata'] {
    return {
      testDuration: this.calculateTestDuration(test),
      totalSampleSize: analysis.controlVariant.sampleSize + analysis.testVariant.sampleSize,
      variantsAnalyzed: test.variants.length,
      statisticalTestsPerformed: 1, // Simplified
    };
  }

  /**
   * Evaluate stopping rules for sequential testing
   */
  private evaluateStoppingRules(
    analysis: ABTestStatisticalAnalysis,
    totalSample: number,
    minimumSampleSize: number,
    maxDuration: number
  ): boolean {
    const testDuration = 0; // Would need to be passed in

    // Stop if we have statistical significance and adequate sample
    if (analysis.testResult.interpretation === 'significant' &&
        totalSample >= minimumSampleSize) {
      return true;
    }

    // Stop if maximum duration reached
    if (testDuration >= maxDuration) {
      return true;
    }

    // Stop if effect is clearly negative and significant
    if (analysis.testResult.interpretation === 'significant' &&
        analysis.relativeImprovement < -0.05 && // -5% or worse
        totalSample >= minimumSampleSize) {
      return true;
    }

    return false;
  }

  /**
   * Generate sequential testing reasoning
   */
  private generateSequentialReasoning(
    analysis: ABTestStatisticalAnalysis,
    canStop: boolean,
    remainingTests: number
  ): string[] {
    const reasoning: string[] = [];

    if (canStop) {
      reasoning.push(`✅ Stopping criteria met`);
      reasoning.push(`📊 Statistical significance: ${analysis.testResult.interpretation}`);
      reasoning.push(`🎯 Confidence level: ${(analysis.testResult.confidenceLevel * 100).toFixed(1)}%`);
    } else {
      reasoning.push(`⏳ Continue testing`);
      reasoning.push(`📊 Current confidence: ${(analysis.testResult.confidenceLevel * 100).toFixed(1)}%`);
      reasoning.push(`🎯 Remaining checks needed: ${remainingTests}`);
    }

    return reasoning;
  }

  /**
   * Get winner selection statistics
   */
  public getSelectionStatistics(): {
    totalAnalyses: number;
    winnersSelected: number;
    testsContinued: number;
    testsStopped: number;
    averageConfidence: number;
    averageImprovement: number;
  } {
    // This would track actual usage in a real implementation
    return {
      totalAnalyses: 0,
      winnersSelected: 0,
      testsContinued: 0,
      testsStopped: 0,
      averageConfidence: 0,
      averageImprovement: 0,
    };
  }

  /**
   * Validate winner selection criteria
   */
  public validateCriteria(criteria: WinnerSelectionCriteria): {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    if (criteria.minimumConfidence < 0.8) {
      issues.push('Minimum confidence too low - increases false positive risk');
      suggestions.push('Consider minimum confidence of 80% or higher');
    }

    if (criteria.minimumSampleSize < 1000) {
      issues.push('Minimum sample size too small for reliable results');
      suggestions.push('Consider minimum sample size of 1000+ per variant');
    }

    if (criteria.minimumEffectSize < 0.01) {
      issues.push('Minimum effect size too small to be practically significant');
      suggestions.push('Consider minimum effect size of 1% or higher');
    }

    if (criteria.maximumTestDuration > 60) {
      issues.push('Maximum test duration too long - may delay optimization');
      suggestions.push('Consider maximum duration of 30-60 days');
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions,
    };
  }
}

export const automaticWinnerSelector = AutomaticWinnerSelector.getInstance();