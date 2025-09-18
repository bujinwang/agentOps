import { LeadProfile, LeadFeatures, MLLeadScore } from '../types/ml';

export interface FeatureImportance {
  feature: string;
  importance: number;
  category: 'demographic' | 'behavioral' | 'temporal' | 'property';
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface ScoreExplanation {
  leadId: number;
  score: number;
  confidence: number;
  topFeatures: FeatureImportance[];
  predictionBreakdown: {
    baseScore: number;
    featureContributions: Array<{
      feature: string;
      contribution: number;
      weight: number;
    }>;
    finalScore: number;
  };
  similarLeads: Array<{
    leadId: number;
    similarity: number;
    outcome: 'converted' | 'lost' | 'active';
  }>;
  recommendations: string[];
}

export interface PredictionConfidence {
  score: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  confidenceScore: number; // 0-1
  uncertaintyFactors: string[];
  dataCompleteness: number; // 0-1
  featureCoverage: number; // 0-1
  confidenceIntervals: {
    lower: number;
    upper: number;
    margin: number;
  };
}

export interface ModelInsights {
  overallAccuracy: number;
  featureImportance: FeatureImportance[];
  modelPerformance: {
    precision: number;
    recall: number;
    f1Score: number;
    auc: number;
  };
  predictionDistribution: {
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
  };
  topPredictiveFeatures: string[];
  modelLimitations: string[];
  improvementSuggestions: string[];
}

export class ModelExplainabilityService {
  private baseUrl = '/api/ml/explainability';

  /**
   * Get feature importance analysis for the current model
   */
  async getFeatureImportance(): Promise<FeatureImportance[]> {
    try {
      const response = await fetch(`${this.baseUrl}/feature-importance`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ApiResponse<FeatureImportance[]> = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to get feature importance');
      }

      return data.data!;
    } catch (error) {
      console.error('Failed to get feature importance:', error);
      throw error;
    }
  }

  /**
   * Get detailed explanation for a lead's score
   */
  async getScoreExplanation(leadId: number): Promise<ScoreExplanation> {
    try {
      const response = await fetch(`${this.baseUrl}/score-explanation/${leadId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ApiResponse<ScoreExplanation> = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to get score explanation');
      }

      return data.data!;
    } catch (error) {
      console.error('Failed to get score explanation:', error);
      throw error;
    }
  }

  /**
   * Get prediction confidence for a lead
   */
  async getPredictionConfidence(leadId: number): Promise<PredictionConfidence> {
    try {
      const response = await fetch(`${this.baseUrl}/prediction-confidence/${leadId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ApiResponse<PredictionConfidence> = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to get prediction confidence');
      }

      return data.data!;
    } catch (error) {
      console.error('Failed to get prediction confidence:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive model insights
   */
  async getModelInsights(): Promise<ModelInsights> {
    try {
      const response = await fetch(`${this.baseUrl}/model-insights`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ApiResponse<ModelInsights> = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to get model insights');
      }

      return data.data!;
    } catch (error) {
      console.error('Failed to get model insights:', error);
      throw error;
    }
  }

  /**
   * Submit user feedback for model improvement
   */
  async submitUserFeedback(
    leadId: number,
    feedback: {
      scoreAccuracy: 'accurate' | 'overestimated' | 'underestimated';
      confidenceLevel: 'appropriate' | 'too_high' | 'too_low';
      usefulFeatures: string[];
      missingFactors: string[];
      comments?: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/user-feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          leadId,
          ...feedback,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ApiResponse<{ success: boolean; message: string }> = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to submit feedback');
      }

      return data.data!;
    } catch (error) {
      console.error('Failed to submit user feedback:', error);
      throw error;
    }
  }

  /**
   * Get feature contribution for a specific prediction
   */
  async getFeatureContributions(leadId: number): Promise<Array<{
    feature: string;
    contribution: number;
    weight: number;
    category: string;
  }>> {
    try {
      const response = await fetch(`${this.baseUrl}/feature-contributions/${leadId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ApiResponse<Array<{
        feature: string;
        contribution: number;
        weight: number;
        category: string;
      }>> = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get feature contributions');
      }

      return data.data!;
    } catch (error) {
      console.error('Failed to get feature contributions:', error);
      throw error;
    }
  }

  /**
   * Get similar leads for comparison
   */
  async getSimilarLeads(leadId: number, limit: number = 5): Promise<Array<{
    leadId: number;
    similarity: number;
    score: number;
    outcome?: 'converted' | 'lost' | 'active';
  }>> {
    try {
      const response = await fetch(`${this.baseUrl}/similar-leads/${leadId}?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ApiResponse<Array<{
        leadId: number;
        similarity: number;
        score: number;
        outcome?: 'converted' | 'lost' | 'active';
      }>> = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get similar leads');
      }

      return data.data!;
    } catch (error) {
      console.error('Failed to get similar leads:', error);
      throw error;
    }
  }

  private getAuthToken(): string {
    // This should be replaced with actual token retrieval logic
    return 'your-auth-token-here';
  }
}

// Type definitions for API responses
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}