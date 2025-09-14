import {
  ABTestResult,
  ABTestConfiguration,
  TemplateVariant
} from '../types/communication';

export interface ABTest {
  id: number;
  templateId: number;
  name: string;
  status: 'draft' | 'running' | 'completed' | 'stopped';
  configuration: ABTestConfiguration;
  startDate?: string;
  endDate?: string;
  results?: ABTestResult[];
  createdAt: string;
  updatedAt: string;
}

export interface ABTestSummary {
  testId: number;
  templateId: number;
  name: string;
  status: string;
  duration: number; // days
  totalParticipants: number;
  winner?: string;
  confidence: number;
  improvement: number; // percentage
}

export interface ABTestParticipant {
  id: number;
  testId: number;
  leadId: number;
  variantId: number;
  assignedAt: string;
  converted: boolean;
  conversionValue?: number;
  events: Array<{
    eventType: string;
    timestamp: string;
    data?: Record<string, any>;
  }>;
}

class ABTestService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'http://localhost:5678/webhook';
  }

  /**
   * Create a new A/B test
   */
  async createTest(testConfig: ABTestConfiguration): Promise<{ success: boolean; data?: ABTest; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/communication/ab-tests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testConfig),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create A/B test'
      };
    }
  }

  /**
   * Get A/B test by ID
   */
  async getTest(testId: number): Promise<{ success: boolean; data?: ABTest; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/communication/ab-tests/${testId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch A/B test'
      };
    }
  }

  /**
   * Get all A/B tests for a template
   */
  async getTestsForTemplate(templateId: number): Promise<{ success: boolean; data?: ABTest[]; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/communication/templates/${templateId}/ab-tests`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch A/B tests'
      };
    }
  }

  /**
   * Start an A/B test
   */
  async startTest(testId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/communication/ab-tests/${testId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start A/B test'
      };
    }
  }

  /**
   * Stop an A/B test
   */
  async stopTest(testId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/communication/ab-tests/${testId}/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stop A/B test'
      };
    }
  }

  /**
   * Get A/B test results
   */
  async getTestResults(testId: number): Promise<{ success: boolean; data?: ABTestResult[]; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/communication/ab-tests/${testId}/results`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch A/B test results'
      };
    }
  }

  /**
   * Assign a lead to a test variant
   */
  async assignLeadToTest(testId: number, leadId: number): Promise<{ success: boolean; data?: { variantId: number; variantName: string }; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/communication/ab-tests/${testId}/assign/${leadId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to assign lead to test'
      };
    }
  }

  /**
   * Record a conversion event for A/B testing
   */
  async recordConversion(testId: number, leadId: number, conversionData: {
    eventType: string;
    value?: number;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/communication/ab-tests/${testId}/conversion/${leadId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(conversionData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to record conversion'
      };
    }
  }

  /**
   * Calculate statistical significance
   */
  calculateStatisticalSignificance(
    variantA: { conversions: number; total: number },
    variantB: { conversions: number; total: number }
  ): {
    significance: number;
    confidence: 'low' | 'medium' | 'high';
    winner?: 'A' | 'B' | 'tie';
  } {
    // Simplified statistical significance calculation
    // In a real implementation, you'd use proper statistical tests

    const rateA = variantA.conversions / variantA.total;
    const rateB = variantB.conversions / variantB.total;

    // Calculate z-score approximation
    const pooledRate = (variantA.conversions + variantB.conversions) / (variantA.total + variantB.total);
    const se = Math.sqrt(pooledRate * (1 - pooledRate) * (1/variantA.total + 1/variantB.total));
    const zScore = Math.abs(rateA - rateB) / se;

    // Convert z-score to confidence level
    let significance: number;
    let confidence: 'low' | 'medium' | 'high';

    if (zScore >= 2.58) {
      significance = 99;
      confidence = 'high';
    } else if (zScore >= 1.96) {
      significance = 95;
      confidence = 'medium';
    } else if (zScore >= 1.65) {
      significance = 90;
      confidence = 'low';
    } else {
      significance = Math.max(0, 50 + zScore * 10);
      confidence = 'low';
    }

    let winner: 'A' | 'B' | 'tie' | undefined;
    if (significance >= 95) {
      if (rateA > rateB) winner = 'A';
      else if (rateB > rateA) winner = 'B';
      else winner = 'tie';
    }

    return { significance, confidence, winner };
  }

  /**
   * Generate A/B test recommendations
   */
  generateRecommendations(results: ABTestResult[]): string[] {
    const recommendations: string[] = [];

    // Find the winner
    const winner = results.find(r => r.isWinner);
    if (winner) {
      recommendations.push(`Use "${winner.variantName}" as the winning variant (${winner.confidence}% confidence)`);
    }

    // Check for significant improvements
    const significantResults = results.filter(r => r.confidence >= 95);
    if (significantResults.length > 0) {
      const bestResult = significantResults.reduce((best, current) =>
        current.conversionRate > best.conversionRate ? current : best
      );
      recommendations.push(`Best performing variant: "${bestResult.variantName}" with ${bestResult.conversionRate}% conversion rate`);
    }

    // Check for underperforming variants
    const underperformers = results.filter(r => r.conversionRate < 1); // Less than 1%
    if (underperformers.length > 0) {
      recommendations.push(`Consider removing or revising underperforming variants: ${underperformers.map(r => r.variantName).join(', ')}`);
    }

    // Sample size recommendations
    const lowSampleResults = results.filter(r => r.sentCount < 100);
    if (lowSampleResults.length > 0) {
      recommendations.push('Consider running tests longer to achieve statistical significance with larger sample sizes');
    }

    return recommendations;
  }

  /**
   * Validate A/B test configuration
   */
  validateTestConfiguration(config: ABTestConfiguration): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.templateId) {
      errors.push('Template ID is required');
    }

    if (!config.variants || config.variants.length < 2) {
      errors.push('At least 2 variants are required for A/B testing');
    }

    if (config.variants) {
      // Check variant weights
      const totalWeight = config.variants.reduce((sum, variant) => sum + (variant.weight || 1), 0);
      if (Math.abs(totalWeight - config.variants.length) > 0.01) {
        errors.push('Variant weights should sum to the number of variants');
      }

      // Check for duplicate variant names
      const names = config.variants.map(v => v.variantName);
      const uniqueNames = new Set(names);
      if (uniqueNames.size !== names.length) {
        errors.push('Variant names must be unique');
      }

      // Check content
      config.variants.forEach((variant, index) => {
        if (!variant.variantName?.trim()) {
          errors.push(`Variant ${index + 1} name is required`);
        }
        if (!variant.contentTemplate?.trim()) {
          errors.push(`Variant ${index + 1} content template is required`);
        }
      });
    }

    if (!config.targetMetric) {
      errors.push('Target metric is required');
    }

    if (config.sampleSize && config.sampleSize < 100) {
      errors.push('Sample size should be at least 100 for statistical significance');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get A/B test summary for dashboard
   */
  async getTestSummaries(templateId?: number): Promise<{ success: boolean; data?: ABTestSummary[]; error?: string }> {
    try {
      const url = templateId
        ? `${this.baseUrl}/communication/ab-tests/summaries?templateId=${templateId}`
        : `${this.baseUrl}/communication/ab-tests/summaries`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch A/B test summaries'
      };
    }
  }
}

// Export singleton instance
export const abTestService = new ABTestService();