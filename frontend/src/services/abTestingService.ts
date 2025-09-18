import { CommunicationTemplate, ABTest, ABTestVariant, ABTestCriteria, ABTestResults } from '../types/template';

export interface ABTestGroup {
  testId: string;
  variantId: string;
  userId: string;
  assignedAt: Date;
  conversionEvents: ConversionEvent[];
}

export interface ConversionEvent {
  eventId: string;
  eventType: 'open' | 'click' | 'response' | 'conversion';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface StatisticalResult {
  variantId: string;
  sampleSize: number;
  conversionRate: number;
  confidenceInterval: [number, number];
  statisticalSignificance: number;
  relativeImprovement: number;
}

export interface ABTestAnalytics {
  testId: string;
  duration: number;
  totalParticipants: number;
  variants: StatisticalResult[];
  winner?: string;
  confidenceLevel: number;
  recommendation: 'continue' | 'conclude' | 'insufficient_data';
}

class ABTestingService {
  private static instance: ABTestingService;
  private testGroups: Map<string, ABTestGroup[]> = new Map();
  private conversionEvents: Map<string, ConversionEvent[]> = new Map();

  private constructor() {}

  public static getInstance(): ABTestingService {
    if (!ABTestingService.instance) {
      ABTestingService.instance = new ABTestingService();
    }
    return ABTestingService.instance;
  }

  /**
   * Create a new A/B test
   */
  public createTest(
    templateId: string,
    variants: Omit<ABTestVariant, 'id' | 'createdAt'>[],
    criteria: ABTestCriteria,
    name?: string,
    description?: string
  ): ABTest {
    const testId = `ab_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const testVariants: ABTestVariant[] = variants.map((variant, index) => ({
      id: `${testId}_variant_${index}`,
      ...variant,
      createdAt: new Date(),
    }));

    const abTest: ABTest = {
      id: testId,
      name: name || `A/B Test for ${templateId}`,
      description: description || 'Automated A/B test for template optimization',
      templateId,
      category: 'follow_up', // Default category, should be determined from template
      channel: 'email', // Default channel, should be determined from template
      status: 'active',
      variants: testVariants,
      criteria,
      createdBy: 1, // Default user, should be passed in
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      results: {
        testId: testId,
        totalSent: 0,
        variants: testVariants.map(variant => ({
          variantId: variant.id,
          sent: 0,
          opens: 0,
          clicks: 0,
          responses: 0,
          conversions: 0,
          openRate: 0,
          clickRate: 0,
          responseRate: 0,
          conversionRate: 0,
        })),
        winner: undefined,
        confidence: 0,
        improvement: 0,
        isSignificant: false,
      },
    };

    // Initialize test groups storage
    this.testGroups.set(testId, []);
    this.conversionEvents.set(testId, []);

    return abTest;
  }

  /**
   * Assign user to test variant
   */
  public assignUserToVariant(testId: string, userId: string, variants: ABTestVariant[]): string {
    // Check if user is already assigned
    const existingGroups = this.testGroups.get(testId) || [];
    const existingAssignment = existingGroups.find(group => group.userId === userId);

    if (existingAssignment) {
      return existingAssignment.variantId;
    }

    // Use weighted random selection for variant assignment
    const totalWeight = variants.reduce((sum, variant) => sum + (variant.weight || 1), 0);
    let random = Math.random() * totalWeight;

    for (const variant of variants) {
      random -= variant.weight || 1;
      if (random <= 0) {
        const assignment: ABTestGroup = {
          testId,
          variantId: variant.id,
          userId,
          assignedAt: new Date(),
          conversionEvents: [],
        };

        existingGroups.push(assignment);
        this.testGroups.set(testId, existingGroups);

        return variant.id;
      }
    }

    // Fallback to first variant
    const fallbackVariant = variants[0];
    const assignment: ABTestGroup = {
      testId,
      variantId: fallbackVariant.id,
      userId,
      assignedAt: new Date(),
      conversionEvents: [],
    };

    existingGroups.push(assignment);
    this.testGroups.set(testId, existingGroups);

    return fallbackVariant.id;
  }

  /**
   * Track conversion event
   */
  public trackConversion(
    testId: string,
    userId: string,
    eventType: ConversionEvent['eventType'],
    metadata?: Record<string, any>
  ): boolean {
    const groups = this.testGroups.get(testId);
    if (!groups) return false;

    const userGroup = groups.find(group => group.userId === userId);
    if (!userGroup) return false;

    const event: ConversionEvent = {
      eventId: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventType,
      timestamp: new Date(),
      metadata,
    };

    userGroup.conversionEvents.push(event);

    // Update conversion events storage
    const events = this.conversionEvents.get(testId) || [];
    events.push(event);
    this.conversionEvents.set(testId, events);

    return true;
  }

  /**
   * Get test results and analytics
   */
  public getTestAnalytics(testId: string, variants: ABTestVariant[]): ABTestAnalytics | null {
    const groups = this.testGroups.get(testId);
    const events = this.conversionEvents.get(testId);

    if (!groups || !events) return null;

    const testStart = groups.length > 0 ? groups[0].assignedAt : new Date();
    const duration = Date.now() - testStart.getTime();

    const variantResults: StatisticalResult[] = variants.map(variant => {
      const variantGroups = groups.filter(group => group.variantId === variant.id);
      const variantEvents = events.filter(event => {
        const userGroup = variantGroups.find(group => group.userId === event.eventId.split('_')[2]); // Extract userId from eventId
        return userGroup !== undefined;
      });

      const conversions = variantEvents.filter(event => event.eventType === 'conversion').length;
      const sampleSize = variantGroups.length;
      const conversionRate = sampleSize > 0 ? conversions / sampleSize : 0;

      // Calculate confidence interval (simplified)
      const confidenceInterval: [number, number] = this.calculateConfidenceInterval(conversionRate, sampleSize);

      // Calculate statistical significance (simplified)
      const statisticalSignificance = this.calculateStatisticalSignificance(variantResults, conversionRate, sampleSize);

      return {
        variantId: variant.id,
        sampleSize,
        conversionRate,
        confidenceInterval,
        statisticalSignificance,
        relativeImprovement: 0, // Will be calculated relative to control
      };
    });

    // Calculate relative improvement
    if (variantResults.length > 1) {
      const controlResult = variantResults[0]; // Assume first variant is control
      variantResults.forEach(result => {
        if (result.variantId !== controlResult.variantId) {
          result.relativeImprovement = controlResult.conversionRate > 0
            ? ((result.conversionRate - controlResult.conversionRate) / controlResult.conversionRate) * 100
            : 0;
        }
      });
    }

    // Determine winner and recommendation
    const winner = this.determineWinner(variantResults);
    const confidenceLevel = Math.max(...variantResults.map(r => r.statisticalSignificance));
    const recommendation = this.getRecommendation(variantResults, duration);

    return {
      testId,
      duration,
      totalParticipants: groups.length,
      variants: variantResults,
      winner,
      confidenceLevel,
      recommendation,
    };
  }

  /**
   * Calculate confidence interval for conversion rate
   */
  private calculateConfidenceInterval(conversionRate: number, sampleSize: number): [number, number] {
    if (sampleSize === 0) return [0, 0];

    // Simplified confidence interval calculation (95% confidence)
    const standardError = Math.sqrt((conversionRate * (1 - conversionRate)) / sampleSize);
    const marginOfError = 1.96 * standardError; // 95% confidence

    return [
      Math.max(0, conversionRate - marginOfError),
      Math.min(1, conversionRate + marginOfError),
    ];
  }

  /**
   * Calculate statistical significance (simplified)
   */
  private calculateStatisticalSignificance(
    allResults: StatisticalResult[],
    conversionRate: number,
    sampleSize: number
  ): number {
    if (allResults.length < 2 || sampleSize < 30) return 0;

    // Simplified significance calculation
    // In a real implementation, you'd use proper statistical tests
    const controlRate = allResults[0].conversionRate;
    const difference = Math.abs(conversionRate - controlRate);

    if (difference === 0) return 0;

    // Simplified p-value approximation
    const pooledSE = Math.sqrt(
      (controlRate * (1 - controlRate) / allResults[0].sampleSize) +
      (conversionRate * (1 - conversionRate) / sampleSize)
    );

    const zScore = difference / pooledSE;
    const significance = Math.min(99.9, (1 - Math.exp(-zScore * zScore / 2)) * 100);

    return significance;
  }

  /**
   * Determine test winner
   */
  private determineWinner(results: StatisticalResult[]): string | undefined {
    if (results.length < 2) return undefined;

    // Find variant with highest conversion rate and sufficient statistical significance
    const significantResults = results.filter(r => r.statisticalSignificance >= 95);

    if (significantResults.length === 0) return undefined;

    const winner = significantResults.reduce((best, current) =>
      current.conversionRate > best.conversionRate ? current : best
    );

    return winner.variantId;
  }

  /**
   * Get test recommendation
   */
  private getRecommendation(
    results: StatisticalResult[],
    duration: number
  ): 'continue' | 'conclude' | 'insufficient_data' {
    const totalParticipants = results.reduce((sum, result) => sum + result.sampleSize, 0);
    const maxSignificance = Math.max(...results.map(r => r.statisticalSignificance));

    // Insufficient data
    if (totalParticipants < 100) return 'insufficient_data';

    // High confidence - can conclude
    if (maxSignificance >= 95 && totalParticipants >= 1000) return 'conclude';

    // Continue testing
    return 'continue';
  }

  /**
   * Conclude test and get final results
   */
  public concludeTest(testId: string, variants: ABTestVariant[]): ABTestResults | null {
    const analytics = this.getTestAnalytics(testId, variants);
    if (!analytics) return null;

    const variantResults = analytics.variants.map(result => ({
      variantId: result.variantId,
      participants: result.sampleSize,
      conversions: Math.round(result.sampleSize * result.conversionRate),
      conversionRate: result.conversionRate,
      confidence: result.statisticalSignificance,
    }));

    return {
      testId,
      totalSent: analytics.totalParticipants,
      variants: variantResults.map(result => ({
        variantId: result.variantId,
        sent: result.participants,
        opens: 0, // Would be calculated from events
        clicks: 0, // Would be calculated from events
        responses: result.conversions, // Simplified mapping
        conversions: result.conversions,
        openRate: 0, // Would be calculated from events
        clickRate: 0, // Would be calculated from events
        responseRate: result.conversionRate,
        conversionRate: result.conversionRate,
      })),
      winner: analytics.winner,
      confidence: analytics.confidenceLevel,
      improvement: analytics.variants.find(v => v.variantId === analytics.winner)?.relativeImprovement || 0,
      completedAt: new Date().toISOString(),
      isSignificant: analytics.confidenceLevel >= 95,
    };
  }

  /**
   * Get test performance metrics
   */
  public getTestPerformance(testId: string): {
    participantGrowth: number[];
    conversionTrends: Record<string, number[]>;
    statisticalPower: number;
  } | null {
    const groups = this.testGroups.get(testId);
    const events = this.conversionEvents.get(testId);

    if (!groups || !events) return null;

    // Calculate participant growth over time
    const participantGrowth = this.calculateParticipantGrowth(groups);

    // Calculate conversion trends by variant
    const conversionTrends = this.calculateConversionTrends(groups, events);

    // Calculate statistical power
    const statisticalPower = this.calculateStatisticalPower(groups);

    return {
      participantGrowth,
      conversionTrends,
      statisticalPower,
    };
  }

  /**
   * Calculate participant growth over time
   */
  private calculateParticipantGrowth(groups: ABTestGroup[]): number[] {
    const growth: number[] = [];
    const sortedGroups = groups.sort((a, b) => a.assignedAt.getTime() - b.assignedAt.getTime());

    let cumulative = 0;
    const startTime = sortedGroups[0]?.assignedAt.getTime() || Date.now();

    // Group by hour
    const hourlyGroups: Record<number, number> = {};

    sortedGroups.forEach(group => {
      const hour = Math.floor((group.assignedAt.getTime() - startTime) / (1000 * 60 * 60));
      hourlyGroups[hour] = (hourlyGroups[hour] || 0) + 1;
    });

    const maxHour = Math.max(...Object.keys(hourlyGroups).map(Number));

    for (let hour = 0; hour <= maxHour; hour++) {
      cumulative += hourlyGroups[hour] || 0;
      growth.push(cumulative);
    }

    return growth;
  }

  /**
   * Calculate conversion trends by variant
   */
  private calculateConversionTrends(
    groups: ABTestGroup[],
    events: ConversionEvent[]
  ): Record<string, number[]> {
    const trends: Record<string, number[]> = {};
    const variantIds = [...new Set(groups.map(g => g.variantId))];

    variantIds.forEach(variantId => {
      trends[variantId] = [];
    });

    const sortedEvents = events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const startTime = groups[0]?.assignedAt.getTime() || Date.now();

    // Group conversions by hour for each variant
    const hourlyConversions: Record<string, Record<number, number>> = {};

    variantIds.forEach(variantId => {
      hourlyConversions[variantId] = {};
    });

    sortedEvents.forEach(event => {
      if (event.eventType === 'conversion') {
        const userGroup = groups.find(g => g.userId === event.eventId.split('_')[2]);
        if (userGroup) {
          const hour = Math.floor((event.timestamp.getTime() - startTime) / (1000 * 60 * 60));
          hourlyConversions[userGroup.variantId][hour] = (hourlyConversions[userGroup.variantId][hour] || 0) + 1;
        }
      }
    });

    const maxHour = Math.max(...Object.values(hourlyConversions).flatMap(obj => Object.keys(obj).map(Number)));

    for (let hour = 0; hour <= maxHour; hour++) {
      variantIds.forEach(variantId => {
        const cumulative = Object.entries(hourlyConversions[variantId])
          .filter(([h]) => Number(h) <= hour)
          .reduce((sum, [, count]) => sum + count, 0);
        trends[variantId].push(cumulative);
      });
    }

    return trends;
  }

  /**
   * Calculate statistical power
   */
  private calculateStatisticalPower(groups: ABTestGroup[]): number {
    const totalParticipants = groups.length;
    const variants = [...new Set(groups.map(g => g.variantId))];

    if (variants.length < 2 || totalParticipants < 100) return 0;

    // Simplified statistical power calculation
    // In practice, this would use more sophisticated statistical methods
    const participantsPerVariant = totalParticipants / variants.length;
    const basePower = Math.min(80, (participantsPerVariant / 100) * 80); // Max 80% power

    return Math.round(basePower);
  }

  /**
   * Clean up old test data
   */
  public cleanupOldTests(maxAgeDays: number = 90): void {
    const cutoffTime = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);

    // Clean up test groups
    for (const [testId, groups] of this.testGroups) {
      const recentGroups = groups.filter(group => group.assignedAt.getTime() > cutoffTime);
      if (recentGroups.length === 0) {
        this.testGroups.delete(testId);
        this.conversionEvents.delete(testId);
      } else {
        this.testGroups.set(testId, recentGroups);
      }
    }

    // Clean up conversion events
    for (const [testId, events] of this.conversionEvents) {
      const recentEvents = events.filter(event => event.timestamp.getTime() > cutoffTime);
      if (recentEvents.length > 0) {
        this.conversionEvents.set(testId, recentEvents);
      }
    }
  }

  /**
   * Get test statistics
   */
  public getTestStatistics(): {
    activeTests: number;
    totalParticipants: number;
    totalConversions: number;
    averageConversionRate: number;
  } {
    let activeTests = 0;
    let totalParticipants = 0;
    let totalConversions = 0;

    for (const groups of this.testGroups.values()) {
      if (groups.length > 0) {
        activeTests++;
        totalParticipants += groups.length;

        for (const group of groups) {
          const conversions = group.conversionEvents.filter(e => e.eventType === 'conversion').length;
          totalConversions += conversions;
        }
      }
    }

    const averageConversionRate = totalParticipants > 0 ? totalConversions / totalParticipants : 0;

    return {
      activeTests,
      totalParticipants,
      totalConversions,
      averageConversionRate,
    };
  }
}

export const abTestingService = ABTestingService.getInstance();