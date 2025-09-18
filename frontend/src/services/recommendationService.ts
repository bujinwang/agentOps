import { Injectable } from '../types/di';
import { LeadInsights, PredictiveAnalytics } from '../types/dashboard';
import { MLScoringService } from './mlScoringService';

// Define missing types
export interface LeadScore {
  score: number;
  confidence: number;
  factors: Record<string, number>;
  lastUpdated: string;
}

export interface Lead {
  id: number;
  name: string;
  email: string;
  phone?: string;
  status: string;
  preferredContact?: 'email' | 'sms' | 'call' | 'inapp';
  createdAt: string;
  updatedAt: string;
}

// Simplified LeadActivityService for now
class LeadActivityService {
  async getLeadActivity(leadId: number): Promise<any[]> {
    // Mock implementation - would integrate with actual activity service
    return [];
  }
}

export interface RecommendationContext {
  leadId: number;
  leadData: Lead;
  leadScore: LeadScore;
  predictiveAnalytics: PredictiveAnalytics;
  historicalActivity: any[];
  currentTime: Date;
  userPreferences?: any;
}

export interface Recommendation {
  id: string;
  type: 'followup' | 'communication' | 'prioritization' | 'workflow';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  rationale: string;
  actions: RecommendationAction[];
  expectedImpact: {
    conversionIncrease: number;
    timeToConversion: number;
    confidence: number;
  };
  validityPeriod: {
    start: Date;
    end: Date;
  };
  metadata: {
    generatedAt: Date;
    modelVersion: string;
    dataQuality: number;
  };
}

export interface RecommendationAction {
  id: string;
  type: 'email' | 'sms' | 'call' | 'inapp' | 'task' | 'meeting';
  title: string;
  description: string;
  timing: {
    suggestedTime: Date;
    urgency: 'immediate' | 'today' | 'this_week' | 'this_month';
    optimalWindow: {
      start: Date;
      end: Date;
    };
  };
  channel: {
    primary: 'email' | 'sms' | 'call' | 'inapp';
    alternatives: string[];
    reasoning: string;
  };
  template?: {
    id: string;
    name: string;
    personalization: any;
  };
  expectedResponse: {
    type: 'engagement' | 'conversion' | 'information';
    probability: number;
    timeFrame: string;
  };
}

export interface LeadPrioritization {
  leadId: number;
  priorityScore: number;
  priorityLevel: 'critical' | 'high' | 'medium' | 'low';
  factors: {
    score: number;
    weight: number;
    reason: string;
  }[];
  recommendedAction: string;
  timeSensitivity: number;
  competitionRisk: number;
}

export interface CommunicationTiming {
  leadId: number;
  optimalTimes: {
    time: Date;
    score: number;
    reasoning: string;
  }[];
  channelPreferences: {
    email: number;
    sms: number;
    call: number;
    inapp: number;
  };
  frequency: {
    optimal: number;
    maximum: number;
    reasoning: string;
  };
  avoidancePeriods: {
    start: Date;
    end: Date;
    reason: string;
  }[];
}

export interface WorkflowSuggestion {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  estimatedDuration: number;
  successProbability: number;
  resourceRequirements: string[];
  prerequisites: string[];
}

export interface WorkflowStep {
  id: string;
  order: number;
  title: string;
  description: string;
  type: 'communication' | 'task' | 'meeting' | 'review';
  duration: number;
  dependencies: string[];
  automationLevel: 'manual' | 'semi_automated' | 'automated';
}

@Injectable()
export class RecommendationService {
  private mlScoringService: MLScoringService;
  private leadActivityService: LeadActivityService;
  private recommendationCache: Map<string, Recommendation[]> = new Map();
  private effectivenessTracker: Map<string, any> = new Map();

  constructor() {
    this.mlScoringService = MLScoringService.getInstance();
    this.leadActivityService = new LeadActivityService();
  }

  /**
   * Generate comprehensive recommendations for a lead
   */
  async generateRecommendations(
    context: RecommendationContext
  ): Promise<Recommendation[]> {
    const cacheKey = `rec_${context.leadId}_${context.currentTime.getTime()}`;

    // Check cache first (valid for 1 hour)
    if (this.recommendationCache.has(cacheKey)) {
      const cached = this.recommendationCache.get(cacheKey)!;
      if (this.isCacheValid(cached)) {
        return cached;
      }
    }

    const recommendations: Recommendation[] = [];

    // Generate different types of recommendations
    const followupRecs = await this.generateFollowupRecommendations(context);
    const communicationRecs = await this.generateCommunicationRecommendations(context);
    const prioritizationRecs = await this.generatePrioritizationRecommendations(context);
    const workflowRecs = await this.generateWorkflowRecommendations(context);

    recommendations.push(...followupRecs, ...communicationRecs, ...prioritizationRecs, ...workflowRecs);

    // Sort by priority and expected impact
    recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];

      if (aPriority !== bPriority) return bPriority - aPriority;

      return b.expectedImpact.conversionIncrease - a.expectedImpact.conversionIncrease;
    });

    // Cache results
    this.recommendationCache.set(cacheKey, recommendations);

    return recommendations;
  }

  /**
   * Generate follow-up strategy recommendations
   */
  private async generateFollowupRecommendations(
    context: RecommendationContext
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    const leadScore = context.leadScore.score;
    const conversionProb = context.predictiveAnalytics.conversionForecast?.probability || 0.5;
    const lastActivity = this.getLastActivityDate(context.historicalActivity);

    // High-value lead follow-up
    if (leadScore > 80 && conversionProb > 0.7) {
      recommendations.push({
        id: `followup_${context.leadId}_high_value`,
        type: 'followup',
        priority: 'high',
        title: 'Immediate High-Value Lead Engagement',
        description: 'This lead shows strong conversion potential and requires immediate attention',
        rationale: `Lead score ${leadScore} with ${Math.round(conversionProb * 100)}% conversion probability indicates high-value opportunity`,
        actions: await this.generateHighValueActions(context),
        expectedImpact: {
          conversionIncrease: 0.25,
          timeToConversion: -3, // days faster
          confidence: 0.85
        },
        validityPeriod: {
          start: new Date(),
          end: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        },
        metadata: {
          generatedAt: new Date(),
          modelVersion: '1.0',
          dataQuality: 0.92
        }
      });
    }

    // Stale lead re-engagement
    if (this.isLeadStale(lastActivity)) {
      recommendations.push({
        id: `followup_${context.leadId}_reengagement`,
        type: 'followup',
        priority: 'medium',
        title: 'Lead Re-engagement Campaign',
        description: 'Lead has been inactive and needs re-engagement',
        rationale: `Last activity ${Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))} days ago suggests need for re-engagement`,
        actions: await this.generateReengagementActions(context),
        expectedImpact: {
          conversionIncrease: 0.15,
          timeToConversion: 7,
          confidence: 0.75
        },
        validityPeriod: {
          start: new Date(),
          end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        },
        metadata: {
          generatedAt: new Date(),
          modelVersion: '1.0',
          dataQuality: 0.88
        }
      });
    }

    return recommendations;
  }

  /**
   * Generate communication recommendations
   */
  private async generateCommunicationRecommendations(
    context: RecommendationContext
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    const timing = await this.optimizeCommunicationTiming(context);
    const channel = await this.recommendCommunicationChannel(context);

    recommendations.push({
      id: `comm_${context.leadId}_optimized`,
      type: 'communication',
      priority: 'medium',
      title: 'Optimized Communication Strategy',
      description: 'Personalized communication timing and channel recommendations',
      rationale: 'Data-driven communication optimization based on lead behavior and preferences',
      actions: [{
        id: `comm_action_${context.leadId}`,
        type: channel.primary,
        title: `Send ${channel.primary.toUpperCase()} communication`,
        description: `Send personalized ${channel.primary} at optimal time`,
        timing: {
          suggestedTime: timing.optimalTimes[0].time,
          urgency: 'today',
          optimalWindow: {
            start: timing.optimalTimes[0].time,
            end: new Date(timing.optimalTimes[0].time.getTime() + 2 * 60 * 60 * 1000) // 2 hours
          }
        },
        channel: {
          primary: channel.primary,
          alternatives: channel.alternatives,
          reasoning: channel.reasoning
        },
        expectedResponse: {
          type: 'engagement',
          probability: 0.65,
          timeFrame: '24 hours'
        }
      }],
      expectedImpact: {
        conversionIncrease: 0.12,
        timeToConversion: -1,
        confidence: 0.78
      },
      validityPeriod: {
        start: new Date(),
        end: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      },
      metadata: {
        generatedAt: new Date(),
        modelVersion: '1.0',
        dataQuality: 0.85
      }
    });

    return recommendations;
  }

  /**
   * Generate lead prioritization recommendations
   */
  private async generatePrioritizationRecommendations(
    context: RecommendationContext
  ): Promise<Recommendation[]> {
    const prioritization = await this.calculateLeadPrioritization(context);

    return [{
      id: `priority_${context.leadId}_ranking`,
      type: 'prioritization',
      priority: prioritization.priorityLevel === 'critical' ? 'high' : 'medium',
      title: `Lead Prioritization: ${prioritization.priorityLevel.toUpperCase()}`,
      description: `Lead priority score: ${prioritization.priorityScore.toFixed(1)}`,
      rationale: `Priority calculation based on score, conversion probability, and time sensitivity`,
      actions: [{
        id: `priority_action_${context.leadId}`,
        type: 'task',
        title: `Prioritize lead ${context.leadData.name}`,
        description: `Focus immediate attention on this ${prioritization.priorityLevel} priority lead`,
        timing: {
          suggestedTime: new Date(),
          urgency: prioritization.priorityLevel === 'critical' ? 'immediate' : 'today',
          optimalWindow: {
            start: new Date(),
            end: new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours
          }
        },
        channel: {
          primary: 'inapp',
          alternatives: ['email'],
          reasoning: 'Internal prioritization task'
        },
        expectedResponse: {
          type: 'engagement',
          probability: 0.9,
          timeFrame: 'immediate'
        }
      }],
      expectedImpact: {
        conversionIncrease: prioritization.priorityLevel === 'critical' ? 0.3 : 0.15,
        timeToConversion: prioritization.priorityLevel === 'critical' ? -5 : -2,
        confidence: 0.82
      },
      validityPeriod: {
        start: new Date(),
        end: new Date(Date.now() + 12 * 60 * 60 * 1000) // 12 hours
      },
      metadata: {
        generatedAt: new Date(),
        modelVersion: '1.0',
        dataQuality: 0.90
      }
    }];
  }

  /**
   * Generate workflow recommendations
   */
  private async generateWorkflowRecommendations(
    context: RecommendationContext
  ): Promise<Recommendation[]> {
    const workflows = await this.suggestWorkflows(context);

    return workflows.map(workflow => ({
      id: `workflow_${context.leadId}_${workflow.id}`,
      type: 'workflow',
      priority: workflow.successProbability > 0.8 ? 'high' : 'medium',
      title: workflow.name,
      description: workflow.description,
      rationale: `Workflow recommended based on lead characteristics and historical success rates`,
      actions: workflow.steps.map(step => ({
        id: `workflow_step_${step.id}`,
        type: step.type as any,
        title: step.title,
        description: step.description,
        timing: {
          suggestedTime: new Date(Date.now() + step.order * 24 * 60 * 60 * 1000),
          urgency: step.order === 1 ? 'immediate' : 'this_week',
          optimalWindow: {
            start: new Date(Date.now() + step.order * 24 * 60 * 60 * 1000),
            end: new Date(Date.now() + (step.order + 1) * 24 * 60 * 60 * 1000)
          }
        },
        channel: {
          primary: 'inapp',
          alternatives: ['meeting', 'email'],
          reasoning: 'Workflow execution step'
        },
        expectedResponse: {
          type: 'engagement',
          probability: 0.7,
          timeFrame: `${step.duration} days`
        }
      })),
      expectedImpact: {
        conversionIncrease: workflow.successProbability * 0.2,
        timeToConversion: -workflow.estimatedDuration,
        confidence: workflow.successProbability
      },
      validityPeriod: {
        start: new Date(),
        end: new Date(Date.now() + workflow.estimatedDuration * 24 * 60 * 60 * 1000)
      },
      metadata: {
        generatedAt: new Date(),
        modelVersion: '1.0',
        dataQuality: 0.87
      }
    }));
  }

  /**
   * Calculate lead prioritization
   */
  private async calculateLeadPrioritization(
    context: RecommendationContext
  ): Promise<LeadPrioritization> {
    const score = context.leadScore.score;
    const conversionProb = context.predictiveAnalytics.conversionForecast?.probability || 0.5;
    const dealValue = context.predictiveAnalytics.dealValuePrediction?.estimatedValue || 0;
    const lastActivity = this.getLastActivityDate(context.historicalActivity);
    const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);

    // Calculate priority factors
    const factors = [
      {
        score: score / 100,
        weight: 0.3,
        reason: `Lead score: ${score}`
      },
      {
        score: conversionProb,
        weight: 0.25,
        reason: `Conversion probability: ${(conversionProb * 100).toFixed(1)}%`
      },
      {
        score: Math.min(dealValue / 1000000, 1), // Normalize to $1M
        weight: 0.2,
        reason: `Deal value: $${dealValue.toLocaleString()}`
      },
      {
        score: Math.max(0, 1 - daysSinceActivity / 30), // Decay over 30 days
        weight: 0.15,
        reason: `Activity recency: ${daysSinceActivity.toFixed(1)} days ago`
      },
      {
        score: context.predictiveAnalytics.riskAssessment?.overallRisk ? (1 - context.predictiveAnalytics.riskAssessment.overallRisk) : 0.5,
        weight: 0.1,
        reason: `Risk level: ${context.predictiveAnalytics.riskAssessment?.overallRisk || 0.5}`
      }
    ];

    const priorityScore = factors.reduce((sum, factor) => sum + factor.score * factor.weight, 0);

    let priorityLevel: 'critical' | 'high' | 'medium' | 'low';
    if (priorityScore > 0.8) priorityLevel = 'critical';
    else if (priorityScore > 0.6) priorityLevel = 'high';
    else if (priorityScore > 0.4) priorityLevel = 'medium';
    else priorityLevel = 'low';

    return {
      leadId: context.leadId,
      priorityScore: priorityScore * 100,
      priorityLevel,
      factors,
      recommendedAction: this.getRecommendedAction(priorityLevel, context),
      timeSensitivity: this.calculateTimeSensitivity(priorityLevel, daysSinceActivity),
      competitionRisk: this.calculateCompetitionRisk(context)
    };
  }

  /**
   * Optimize communication timing
   */
  private async optimizeCommunicationTiming(
    context: RecommendationContext
  ): Promise<CommunicationTiming> {
    const leadId = context.leadId;
    const currentTime = context.currentTime;

    // Analyze historical activity patterns
    const activityPatterns = this.analyzeActivityPatterns(context.historicalActivity);

    // Calculate optimal times based on patterns
    const optimalTimes = this.calculateOptimalTimes(activityPatterns, currentTime);

    // Determine channel preferences
    const channelPreferences = this.calculateChannelPreferences(context);

    // Calculate optimal frequency
    const frequency = this.calculateOptimalFrequency(context);

    // Identify avoidance periods
    const avoidancePeriods = this.identifyAvoidancePeriods(context);

    return {
      leadId,
      optimalTimes,
      channelPreferences,
      frequency,
      avoidancePeriods
    };
  }

  /**
   * Recommend communication channel
   */
  private async recommendCommunicationChannel(context: RecommendationContext): Promise<{
    primary: 'email' | 'sms' | 'call' | 'inapp';
    alternatives: string[];
    reasoning: string;
  }> {
    const leadData = context.leadData;
    const leadScore = context.leadScore.score;
    const historicalActivity = context.historicalActivity;

    // Analyze response patterns by channel
    const channelResponseRates = this.analyzeChannelResponseRates(historicalActivity);

    // Consider lead characteristics
    const urgency = leadScore > 80 ? 'high' : leadScore > 60 ? 'medium' : 'low';
    const preferredChannel = leadData.preferredContact || 'email';

    let primary: 'email' | 'sms' | 'call' | 'inapp';
    let reasoning: string;

    if (urgency === 'high' && channelResponseRates.call > 0.7) {
      primary = 'call';
      reasoning = 'High-urgency lead with strong call response history';
    } else if (urgency === 'high' && channelResponseRates.sms > 0.8) {
      primary = 'sms';
      reasoning = 'High-urgency lead with excellent SMS response rate';
    } else if (preferredChannel === 'email' && channelResponseRates.email > 0.6) {
      primary = 'email';
      reasoning = 'Lead prefers email with good response history';
    } else if (channelResponseRates.inapp > 0.7) {
      primary = 'inapp';
      reasoning = 'Strong in-app engagement history';
    } else {
      primary = 'email';
      reasoning = 'Default to email for reliable communication';
    }

    const alternatives = ['email', 'sms', 'call', 'inapp'].filter(c => c !== primary);

    return {
      primary,
      alternatives,
      reasoning
    };
  }

  /**
   * Suggest automated workflows
   */
  private async suggestWorkflows(context: RecommendationContext): Promise<WorkflowSuggestion[]> {
    const suggestions: WorkflowSuggestion[] = [];

    const leadScore = context.leadScore.score;
    const conversionProb = context.predictiveAnalytics.conversionForecast?.probability || 0.5;
    const lastActivity = this.getLastActivityDate(context.historicalActivity);
    const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);

    // High-value lead nurturing workflow
    if (leadScore > 80 && conversionProb > 0.7) {
      suggestions.push({
        id: 'high_value_nurture',
        name: 'High-Value Lead Nurturing',
        description: 'Comprehensive nurturing workflow for high-potential leads',
        steps: [
          {
            id: 'initial_assessment',
            order: 1,
            title: 'Initial Lead Assessment',
            description: 'Review lead profile and requirements',
            type: 'task',
            duration: 1,
            dependencies: [],
            automationLevel: 'manual'
          },
          {
            id: 'personalized_communication',
            order: 2,
            title: 'Send Personalized Communication',
            description: 'Send tailored property recommendations',
            type: 'communication',
            duration: 1,
            dependencies: ['initial_assessment'],
            automationLevel: 'semi_automated'
          },
          {
            id: 'followup_call',
            order: 3,
            title: 'Schedule Follow-up Call',
            description: 'Arrange personalized consultation',
            type: 'meeting',
            duration: 2,
            dependencies: ['personalized_communication'],
            automationLevel: 'manual'
          },
          {
            id: 'property_tour',
            order: 4,
            title: 'Property Tour Coordination',
            description: 'Organize property viewing',
            type: 'task',
            duration: 3,
            dependencies: ['followup_call'],
            automationLevel: 'semi_automated'
          }
        ],
        estimatedDuration: 7,
        successProbability: 0.85,
        resourceRequirements: ['Real estate agent', 'Property listings', 'CRM access'],
        prerequisites: ['Lead qualification complete', 'Property inventory available']
      });
    }

    // Re-engagement workflow for stale leads
    if (daysSinceActivity > 14) {
      suggestions.push({
        id: 'reengagement_campaign',
        name: 'Lead Re-engagement Campaign',
        description: 'Multi-touch re-engagement workflow for inactive leads',
        steps: [
          {
            id: 'market_update_email',
            order: 1,
            title: 'Market Update Email',
            description: 'Send personalized market insights',
            type: 'communication',
            duration: 1,
            dependencies: [],
            automationLevel: 'automated'
          },
          {
            id: 'sms_followup',
            order: 2,
            title: 'SMS Follow-up',
            description: 'Send brief SMS reminder',
            type: 'communication',
            duration: 1,
            dependencies: ['market_update_email'],
            automationLevel: 'automated'
          },
          {
            id: 'phone_outreach',
            order: 3,
            title: 'Phone Outreach',
            description: 'Attempt phone contact',
            type: 'communication',
            duration: 1,
            dependencies: ['sms_followup'],
            automationLevel: 'manual'
          }
        ],
        estimatedDuration: 3,
        successProbability: 0.65,
        resourceRequirements: ['Email templates', 'SMS service', 'Phone system'],
        prerequisites: ['Lead contact information current']
      });
    }

    return suggestions;
  }

  /**
   * Track recommendation effectiveness
   */
  async trackRecommendationEffectiveness(
    recommendationId: string,
    leadId: number,
    action: string,
    outcome: 'success' | 'partial' | 'failure',
    metrics: any
  ): Promise<void> {
    const trackingData = {
      recommendationId,
      leadId,
      action,
      outcome,
      metrics,
      timestamp: new Date(),
      modelVersion: '1.0'
    };

    this.effectivenessTracker.set(recommendationId, trackingData);

    // Update ML model with feedback
    await this.updateRecommendationModel(trackingData);
  }

  /**
   * Helper methods
   */
  private async generateHighValueActions(context: RecommendationContext): Promise<RecommendationAction[]> {
    const timing = await this.optimizeCommunicationTiming(context);
    const channel = await this.recommendCommunicationChannel(context);

    return [{
      id: `high_value_action_${context.leadId}`,
      type: 'call',
      title: 'Immediate Phone Consultation',
      description: 'Schedule urgent consultation call with lead',
      timing: {
        suggestedTime: new Date(),
        urgency: 'immediate',
        optimalWindow: {
          start: new Date(),
          end: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours
        }
      },
      channel: {
        primary: 'call',
        alternatives: ['inapp', 'email'],
        reasoning: 'High-value lead requires immediate personal attention'
      },
      expectedResponse: {
        type: 'conversion',
        probability: 0.75,
        timeFrame: '48 hours'
      }
    }];
  }

  private async generateReengagementActions(context: RecommendationContext): Promise<RecommendationAction[]> {
    return [{
      id: `reengage_action_${context.leadId}`,
      type: 'email',
      title: 'Market Update Email Campaign',
      description: 'Send personalized market insights to re-engage lead',
      timing: {
        suggestedTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        urgency: 'this_week',
        optimalWindow: {
          start: new Date(Date.now() + 24 * 60 * 60 * 1000),
          end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
        }
      },
      channel: {
        primary: 'email',
        alternatives: ['sms', 'inapp'],
        reasoning: 'Email provides detailed market information for re-engagement'
      },
      expectedResponse: {
        type: 'engagement',
        probability: 0.45,
        timeFrame: '7 days'
      }
    }];
  }

  private getLastActivityDate(historicalActivity: any[]): Date {
    if (!historicalActivity || historicalActivity.length === 0) {
      return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    }

    const sorted = historicalActivity.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return new Date(sorted[0].timestamp);
  }

  private isLeadStale(lastActivity: Date): boolean {
    const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceActivity > 14; // 2 weeks
  }

  private isCacheValid(recommendations: Recommendation[]): boolean {
    if (recommendations.length === 0) return false;

    const oldestRecommendation = recommendations.reduce((oldest, rec) =>
      rec.metadata.generatedAt < oldest.metadata.generatedAt ? rec : oldest
    );

    const cacheAge = Date.now() - oldestRecommendation.metadata.generatedAt.getTime();
    return cacheAge < 60 * 60 * 1000; // 1 hour
  }

  private getRecommendedAction(priorityLevel: string, context: RecommendationContext): string {
    switch (priorityLevel) {
      case 'critical':
        return 'Immediate phone call and personalized consultation';
      case 'high':
        return 'Schedule follow-up call within 24 hours';
      case 'medium':
        return 'Send personalized email within 48 hours';
      case 'low':
        return 'Add to nurture campaign';
      default:
        return 'Monitor and follow standard process';
    }
  }

  private calculateTimeSensitivity(priorityLevel: string, daysSinceActivity: number): number {
    const baseSensitivity = { critical: 1.0, high: 0.8, medium: 0.5, low: 0.2 };
    const recencyFactor = Math.max(0, 1 - daysSinceActivity / 30); // Decay over 30 days

    return baseSensitivity[priorityLevel as keyof typeof baseSensitivity] * recencyFactor;
  }

  private calculateCompetitionRisk(context: RecommendationContext): number {
    // Simplified competition risk calculation
    const marketCompetition = 0.6; // Assume moderate competition
    const leadScore = context.leadScore.score / 100;
    const timeSinceActivity = (Date.now() - this.getLastActivityDate(context.historicalActivity).getTime()) / (1000 * 60 * 60 * 24);

    return marketCompetition * (1 - leadScore) * Math.min(timeSinceActivity / 30, 1);
  }

  private analyzeActivityPatterns(historicalActivity: any[]): any {
    // Simplified pattern analysis
    return {
      peakHours: [9, 14, 19], // Assume business hours
      preferredDays: [1, 2, 3, 4, 5], // Weekdays
      responsePatterns: {
        email: 0.7,
        sms: 0.8,
        call: 0.6
      }
    };
  }

  private calculateOptimalTimes(activityPatterns: any, currentTime: Date): any[] {
    const optimalTimes = [];

    // Generate optimal times based on patterns
    activityPatterns.peakHours.forEach((hour: number) => {
      const optimalTime = new Date(currentTime);
      optimalTime.setHours(hour, 0, 0, 0);

      if (optimalTime > currentTime) {
        optimalTimes.push({
          time: optimalTime,
          score: 0.85,
          reasoning: `Peak activity hour: ${hour}:00`
        });
      }
    });

    return optimalTimes.slice(0, 3); // Top 3 optimal times
  }

  private calculateChannelPreferences(context: RecommendationContext): any {
    // Simplified channel preference calculation
    return {
      email: 0.7,
      sms: 0.6,
      call: 0.5,
      inapp: 0.8
    };
  }

  private calculateOptimalFrequency(context: RecommendationContext): any {
    const leadScore = context.leadScore.score;

    if (leadScore > 80) {
      return {
        optimal: 3, // per week
        maximum: 5,
        reasoning: 'High-value lead requires frequent engagement'
      };
    } else if (leadScore > 60) {
      return {
        optimal: 2,
        maximum: 3,
        reasoning: 'Medium-value lead needs regular follow-up'
      };
    } else {
      return {
        optimal: 1,
        maximum: 2,
        reasoning: 'Low-value lead should not be overwhelmed'
      };
    }
  }

  private identifyAvoidancePeriods(context: RecommendationContext): any[] {
    // Simplified avoidance periods (e.g., evenings, weekends)
    return [
      {
        start: new Date(new Date().setHours(18, 0, 0, 0)),
        end: new Date(new Date().setHours(8, 0, 0, 0)),
        reason: 'Evening hours - respect personal time'
      },
      {
        start: new Date(new Date().setDate(new Date().getDate() - new Date().getDay() + 6)), // Saturday
        end: new Date(new Date().setDate(new Date().getDate() - new Date().getDay() + 7)), // Sunday
        reason: 'Weekend - avoid disturbing personal time'
      }
    ];
  }

  private analyzeChannelResponseRates(historicalActivity: any[]): any {
    // Simplified response rate analysis
    return {
      email: 0.65,
      sms: 0.75,
      call: 0.55,
      inapp: 0.8
    };
  }

  private async updateRecommendationModel(trackingData: any): Promise<void> {
    // Update ML model with effectiveness feedback
    // This would integrate with the ML service to improve future recommendations
    console.log('Updating recommendation model with feedback:', trackingData);
  }
}