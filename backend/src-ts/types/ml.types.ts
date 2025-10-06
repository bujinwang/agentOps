/**
 * ML Lead Scoring Types
 * 
 * Defines types for ML-powered lead scoring system
 */

export interface LeadData {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  budget?: number;
  propertyType?: string;
  location?: string;
  timeline?: string;
  source?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadScore {
  leadId: number;
  score: number; // 0-100
  confidence: number; // 0-1
  factors: ScoringFactor[];
  explanation: string;
  modelVersion: string;
  scoredAt: Date;
}

export interface ScoringFactor {
  name: string;
  value: any;
  weight: number; // 0-1
  impact: number; // -100 to +100
  explanation: string;
}

export interface MLModel {
  id: number;
  name: string;
  version: string;
  type: 'openai' | 'custom' | 'hybrid';
  status: 'active' | 'training' | 'inactive' | 'deprecated';
  accuracy?: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface ScoringRequest {
  leadId: number;
  useCache?: boolean;
  modelVersion?: string;
}

export interface BatchScoringRequest {
  leadIds: number[];
  useCache?: boolean;
  modelVersion?: string;
}

export interface ScoringResponse {
  success: boolean;
  data: LeadScore;
  cached?: boolean;
  processingTime: number; // milliseconds
}

export interface BatchScoringResponse {
  success: boolean;
  data: LeadScore[];
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  processingTime: number;
}

export interface TrainingJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number; // 0-100
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  metrics?: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
}

export interface ScoringConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
  retryAttempts: number;
  cacheTTL: number;
}

export interface ScoreHistory {
  leadId: number;
  scores: LeadScore[];
  totalScores: number;
  averageScore: number;
  latestScore: LeadScore;
  trend: 'improving' | 'declining' | 'stable';
}

export interface ScoringFeedback {
  scoreId: number;
  leadId: number;
  feedback: 'helpful' | 'not_helpful' | 'inaccurate';
  comment?: string;
  userId: number;
  createdAt: Date;
}
