import {
  LeadScore,
  LeadData,
  ScoringResult,
  ScoreBreakdown,
  LeadGrade
} from '../types/leadScoring';

export interface LeadScoreApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface LeadScoreData {
  lead_id: number;
  score: number | null;
  score_category: string | null;
  score_breakdown: any;
  score_last_calculated: string | null;
  score_history: any[];
  manual_score_override: number | null;
  manual_score_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScoreHistoryEntry {
  timestamp: string;
  score?: number;
  category?: string;
  breakdown?: ScoreBreakdown;
  manual_override?: number;
  reason?: string;
  user_id?: number;
  qualification_score?: number;
  qualification_status?: string;
  conversion_probability?: number;
  insights?: string[];
  confidence?: number;
  calculation_type?: string;
}

class LeadScoreApiService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:5678') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get lead score data from backend
   */
  async getLeadScore(leadId: number): Promise<LeadScoreData | null> {
    try {
      const response = await fetch(`${this.baseUrl}/webhook/leads/${leadId}/score`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`, // Add auth token if available
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: LeadScoreApiResponse = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        return result.data[0] as LeadScoreData;
      }

      return null;
    } catch (error) {
      console.error('Error fetching lead score:', error);
      throw error;
    }
  }

  /**
   * Update lead score with manual override
   */
  async updateLeadScore(
    leadId: number,
    score: number,
    reason: string,
    userId?: number
  ): Promise<LeadScoreData | null> {
    try {
      const response = await fetch(`${this.baseUrl}/webhook/leads/${leadId}/score`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify({
          score,
          reason,
          userId: userId || 1, // Default to system user if not provided
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: LeadScoreApiResponse = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        return result.data[0] as LeadScoreData;
      }

      return null;
    } catch (error) {
      console.error('Error updating lead score:', error);
      throw error;
    }
  }

  /**
   * Calculate and save lead score using backend algorithm
   */
  async calculateLeadScore(leadData: LeadData): Promise<ScoringResult> {
    try {
      const response = await fetch(`${this.baseUrl}/webhook/leads/${leadData.id}/calculate-score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify(leadData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: LeadScoreApiResponse = await response.json();

      if (result.success && result.data) {
        const apiData = result.data;

        // Convert API response to ScoringResult format
        const score: LeadScore = {
          id: `api_score_${leadData.id}_${Date.now()}`,
          leadId: leadData.id,
          totalScore: apiData.totalScore,
          scoreBreakdown: apiData.breakdown,
          grade: this.mapCategoryToGrade(apiData.category),
          confidence: apiData.confidence || 80,
          factors: [], // API doesn't provide detailed factors
          recommendations: [], // API doesn't provide recommendations
          calculatedAt: apiData.calculatedAt,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        };

        return {
          score,
          insights: apiData.insights || [],
          actions: [], // API doesn't provide actions
          riskFactors: [], // API doesn't provide risk factors
        };
      }

      throw new Error('Failed to calculate score');
    } catch (error) {
      console.error('Error calculating lead score:', error);
      throw error;
    }
  }

  /**
   * Get lead score history
   */
  async getLeadScoreHistory(leadId: number): Promise<{
    history: ScoreHistoryEntry[];
    lastCalculated: string | null;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/webhook/leads/${leadId}/score/history`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: LeadScoreApiResponse = await response.json();

      if (result.success && result.data) {
        return {
          history: result.data.history || [],
          lastCalculated: result.data.lastCalculated,
        };
      }

      return { history: [], lastCalculated: null };
    } catch (error) {
      console.error('Error fetching score history:', error);
      throw error;
    }
  }

  /**
   * Sync local score with backend
   */
  async syncLeadScore(leadId: number, localScore: LeadScore): Promise<LeadScoreData | null> {
    try {
      // First, try to get existing backend score
      const existingScore = await this.getLeadScore(leadId);

      if (!existingScore || !existingScore.score) {
        // No backend score exists, calculate and save one
        const leadData = this.convertScoreToLeadData(localScore);
        await this.calculateLeadScore(leadData);
        return await this.getLeadScore(leadId);
      }

      // Backend score exists, compare with local
      const backendScore = existingScore.score;
      const localScoreValue = localScore.totalScore;

      // If scores differ significantly, update backend with local score
      if (Math.abs(backendScore - localScoreValue) > 5) {
        return await this.updateLeadScore(
          leadId,
          localScoreValue,
          'Synced from frontend calculation',
          1 // System user
        );
      }

      return existingScore;
    } catch (error) {
      console.error('Error syncing lead score:', error);
      return null;
    }
  }

  /**
   * Convert LeadScore to LeadData for API calls
   */
  private convertScoreToLeadData(score: LeadScore): LeadData {
    // This is a simplified conversion - in practice, you'd need the full lead data
    return {
      id: score.leadId,
      // Add other required LeadData fields as needed
    } as LeadData;
  }

  /**
   * Map API category to LeadGrade
   */
  private mapCategoryToGrade(category: string): LeadGrade {
    switch (category?.toLowerCase()) {
      case 'high':
        return 'A';
      case 'medium':
        return 'B';
      case 'low':
        return 'C';
      default:
        return 'F';
    }
  }

  /**
   * Get authentication token (placeholder - implement based on your auth system)
   */
  private getAuthToken(): string {
    // Implement based on your authentication system
    // For now, return empty string or a default token
    return '';
  }

  /**
   * Update base URL for different environments
   */
  updateBaseUrl(newUrl: string): void {
    this.baseUrl = newUrl;
  }
}

// Export singleton instance
const leadScoreApiService = new LeadScoreApiService();
export default leadScoreApiService;