export interface LeadScore {
  id: string;
  leadId: number;
  totalScore: number;
  scoreBreakdown: ScoreBreakdown;
  grade: LeadGrade;
  confidence: number;
  factors: ScoringFactor[];
  recommendations: string[];
  calculatedAt: string;
  expiresAt?: string;
}

export interface ScoreBreakdown {
  budget: number;
  timeline: number;
  propertyType: number;
  location: number;
  engagement: number;
  qualification: number;
  marketFit: number;
}

export type LeadGrade = 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';

export interface ScoringFactor {
  name: string;
  value: number;
  weight: number;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

export interface ScoringWeights {
  budget: number;
  timeline: number;
  propertyType: number;
  location: number;
  engagement: number;
  qualification: number;
  marketFit: number;
}

export interface LeadScoringConfig {
  weights: ScoringWeights;
  thresholds: {
    A: number;
    B: number;
    C: number;
    D: number;
  };
  factors: {
    budget: {
      high: number;
      medium: number;
      low: number;
    };
    timeline: {
      urgent: number;
      soon: number;
      flexible: number;
    };
    propertyType: {
      [key: string]: number;
    };
    location: {
      preferred: number;
      acceptable: number;
      challenging: number;
    };
    engagement: {
      high: number;
      medium: number;
      low: number;
    };
    qualification: {
      preQualified: number;
      qualified: number;
      needsQualification: number;
    };
  };
}

export interface LeadData {
  id: number;
  budget?: number;
  timeline?: string;
  propertyType?: string;
  location?: string;
  engagementScore?: number;
  qualificationStatus?: 'preQualified' | 'qualified' | 'needsQualification';
  lastActivity?: string;
  inquiryCount?: number;
  responseTime?: number;
  source?: string;
  marketData?: {
    averagePrice?: number;
    marketTrend?: 'hot' | 'warm' | 'cool';
    competition?: number;
  };
}

export interface ScoringResult {
  score: LeadScore;
  insights: string[];
  actions: string[];
  riskFactors: string[];
}