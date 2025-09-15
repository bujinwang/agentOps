import { responseTrackingService, ResponseAnalytics, WorkflowAdjustment } from './responseTrackingService';
import { WorkflowExecutionService } from './workflowExecutionService';

export interface WorkflowAdjustmentRules {
  engagementThreshold: number; // Minimum engagement score to trigger adjustments
  lowEngagementThreshold: number; // Threshold for poor performance
  highEngagementThreshold: number; // Threshold for excellent performance
  maxDelayIncrease: number; // Maximum delay increase in minutes
  maxDelayDecrease: number; // Maximum delay decrease in minutes
  adjustmentCooldown: number; // Hours between adjustments
  channelSwitchThreshold: number; // Engagement drop to trigger channel switch
}

export interface AdjustmentRecommendation {
  workflowId: string;
  leadId: number;
  adjustmentType: WorkflowAdjustment['adjustmentType'];
  reason: string;
  confidence: number; // 0-100
  expectedImpact: 'high' | 'medium' | 'low';
  currentValue: any;
  recommendedValue: any;
  alternativeOptions?: Array<{
    type: WorkflowAdjustment['adjustmentType'];
    value: any;
    confidence: number;
  }>;
}

class WorkflowAdjustmentService {
  private static instance: WorkflowAdjustmentService;
  private adjustmentRules: WorkflowAdjustmentRules;
  private lastAdjustments: Map<string, Date> = new Map(); // workflowId -> last adjustment time

  private constructor() {
    this.adjustmentRules = {
      engagementThreshold: 60, // Minimum 60% engagement score
      lowEngagementThreshold: 40, // Below 40% is poor
      highEngagementThreshold: 80, // Above 80% is excellent
      maxDelayIncrease: 1440, // Max 24 hours increase
      maxDelayDecrease: 120, // Max 2 hours decrease
      adjustmentCooldown: 24, // 24 hours between adjustments
      channelSwitchThreshold: 20, // 20% engagement drop triggers channel switch
    };

    this.loadAdjustmentHistory();
  }

  public static getInstance(): WorkflowAdjustmentService {
    if (!WorkflowAdjustmentService.instance) {
      WorkflowAdjustmentService.instance = new WorkflowAdjustmentService();
    }
    return WorkflowAdjustmentService.instance;
  }

  private async loadAdjustmentHistory(): Promise<void> {
    try {
      // Load last adjustment times from storage
      const stored = await this.getStoredAdjustmentHistory();
      if (stored) {
        this.lastAdjustments = new Map(
          Object.entries(stored).map(([key, value]) => [key, new Date(value)])
        );
      }
    } catch (error) {
      console.error('Failed to load adjustment history:', error);
    }
  }

  private async getStoredAdjustmentHistory(): Promise<Record<string, string> | null> {
    // This would typically use AsyncStorage or similar
    // For now, return null (no persistence)
    return null;
  }

  private async saveAdjustmentHistory(): Promise<void> {
    try {
      const history = Object.fromEntries(this.lastAdjustments);
      // This would typically save to AsyncStorage
      console.log('Adjustment history saved:', history);
    } catch (error) {
      console.error('Failed to save adjustment history:', error);
    }
  }

  /**
   * Analyze workflow performance and generate adjustment recommendations
   */
  public async analyzeWorkflowPerformance(
    workflowId: string,
    leadId?: number
  ): Promise<AdjustmentRecommendation[]> {
    const recommendations: AdjustmentRecommendation[] = [];

    try {
      // Get analytics data
      const analytics = responseTrackingService.getResponseAnalytics(leadId, workflowId);
      if (!analytics) {
        console.log(`No analytics data available for workflow ${workflowId}`);
        return recommendations;
      }

      // Check if we're within cooldown period
      const lastAdjustment = this.lastAdjustments.get(workflowId);
      if (lastAdjustment) {
        const hoursSinceLastAdjustment = (Date.now() - lastAdjustment.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastAdjustment < this.adjustmentRules.adjustmentCooldown) {
          console.log(`Within cooldown period for workflow ${workflowId}`);
          return recommendations;
        }
      }

      // Analyze engagement patterns
      const engagementAnalysis = this.analyzeEngagementPatterns(analytics);
      const channelPerformance = this.analyzeChannelPerformance(analytics);
      const timingAnalysis = this.analyzeTimingPerformance(analytics);

      // Generate recommendations based on analysis
      recommendations.push(...engagementAnalysis);
      recommendations.push(...channelPerformance);
      recommendations.push(...timingAnalysis);

      // Sort by confidence and expected impact
      recommendations.sort((a, b) => {
        if (a.expectedImpact !== b.expectedImpact) {
          const impactOrder = { high: 3, medium: 2, low: 1 };
          return impactOrder[b.expectedImpact] - impactOrder[a.expectedImpact];
        }
        return b.confidence - a.confidence;
      });

      return recommendations.slice(0, 3); // Return top 3 recommendations

    } catch (error) {
      console.error('Error analyzing workflow performance:', error);
      return recommendations;
    }
  }

  private analyzeEngagementPatterns(analytics: ResponseAnalytics): AdjustmentRecommendation[] {
    const recommendations: AdjustmentRecommendation[] = [];

    // Low engagement analysis
    if (analytics.engagementScore < this.adjustmentRules.lowEngagementThreshold) {
      recommendations.push({
        workflowId: analytics.workflowId,
        leadId: analytics.leadId,
        adjustmentType: 'delay_increase',
        reason: `Engagement score (${analytics.engagementScore.toFixed(1)}) is below threshold (${this.adjustmentRules.lowEngagementThreshold}). Consider increasing delays to reduce frequency.`,
        confidence: Math.min(90, 50 + (this.adjustmentRules.lowEngagementThreshold - analytics.engagementScore)),
        expectedImpact: 'high',
        currentValue: 'current delay',
        recommendedValue: Math.min(this.adjustmentRules.maxDelayIncrease, 120), // 2 hours
        alternativeOptions: [
          {
            type: 'channel_switch',
            value: 'email_to_sms',
            confidence: 70,
          },
          {
            type: 'content_adjustment',
            value: 'simplify_content',
            confidence: 60,
          },
        ],
      });
    }

    // High engagement analysis
    else if (analytics.engagementScore > this.adjustmentRules.highEngagementThreshold) {
      recommendations.push({
        workflowId: analytics.workflowId,
        leadId: analytics.leadId,
        adjustmentType: 'delay_decrease',
        reason: `Excellent engagement score (${analytics.engagementScore.toFixed(1)}). Consider reducing delays to maintain momentum.`,
        confidence: Math.min(85, analytics.engagementScore - this.adjustmentRules.highEngagementThreshold + 50),
        expectedImpact: 'medium',
        currentValue: 'current delay',
        recommendedValue: Math.max(-this.adjustmentRules.maxDelayDecrease, -60), // Reduce by 1 hour
      });
    }

    return recommendations;
  }

  private analyzeChannelPerformance(analytics: ResponseAnalytics): AdjustmentRecommendation[] {
    const recommendations: AdjustmentRecommendation[] = [];

    // Calculate channel effectiveness
    const emailEffectiveness = analytics.totalEmails > 0 ? analytics.openRate : 0;
    const smsEffectiveness = analytics.totalSMS > 0 ? analytics.deliveryRate : 0;
    const inAppEffectiveness = analytics.totalInApp > 0 ?
      (analytics.interactedInApp / analytics.totalInApp) * 100 : 0;

    // Find best and worst performing channels
    const channels = [
      { name: 'email', effectiveness: emailEffectiveness, total: analytics.totalEmails },
      { name: 'sms', effectiveness: smsEffectiveness, total: analytics.totalSMS },
      { name: 'in_app', effectiveness: inAppEffectiveness, total: analytics.totalInApp },
    ].filter(channel => channel.total > 0);

    if (channels.length < 2) return recommendations;

    const bestChannel = channels.reduce((best, current) =>
      current.effectiveness > best.effectiveness ? current : best
    );

    const worstChannel = channels.reduce((worst, current) =>
      current.effectiveness < worst.effectiveness ? current : worst
    );

    // Channel switch recommendation
    const effectivenessGap = bestChannel.effectiveness - worstChannel.effectiveness;
    if (effectivenessGap > this.adjustmentRules.channelSwitchThreshold) {
      recommendations.push({
        workflowId: analytics.workflowId,
        leadId: analytics.leadId,
        adjustmentType: 'channel_switch',
        reason: `${bestChannel.name} (${bestChannel.effectiveness.toFixed(1)}%) performs ${effectivenessGap.toFixed(1)}% better than ${worstChannel.name} (${worstChannel.effectiveness.toFixed(1)}%). Consider switching to more effective channel.`,
        confidence: Math.min(80, effectivenessGap),
        expectedImpact: 'high',
        currentValue: worstChannel.name,
        recommendedValue: bestChannel.name,
      });
    }

    return recommendations;
  }

  private analyzeTimingPerformance(analytics: ResponseAnalytics): AdjustmentRecommendation[] {
    const recommendations: AdjustmentRecommendation[] = [];

    // Analyze response time patterns
    if (analytics.averageResponseTime > 0) {
      const optimalResponseTime = 300; // 5 minutes ideal
      const currentResponseTime = analytics.averageResponseTime;

      if (currentResponseTime > optimalResponseTime * 2) {
        // Response time is too slow
        recommendations.push({
          workflowId: analytics.workflowId,
          leadId: analytics.leadId,
          adjustmentType: 'delay_decrease',
          reason: `Average response time (${(currentResponseTime / 60).toFixed(1)}min) is slow. Consider more frequent check-ins.`,
          confidence: Math.min(75, (currentResponseTime - optimalResponseTime) / optimalResponseTime * 50),
          expectedImpact: 'medium',
          currentValue: 'current timing',
          recommendedValue: Math.max(-this.adjustmentRules.maxDelayDecrease, -30), // Reduce by 30 min
        });
      } else if (currentResponseTime < optimalResponseTime * 0.5) {
        // Response time is very fast - might be too aggressive
        recommendations.push({
          workflowId: analytics.workflowId,
          leadId: analytics.leadId,
          adjustmentType: 'delay_increase',
          reason: `Very fast response time (${(currentResponseTime / 60).toFixed(1)}min) might be overwhelming. Consider spacing out communications.`,
          confidence: 60,
          expectedImpact: 'low',
          currentValue: 'current timing',
          recommendedValue: Math.min(this.adjustmentRules.maxDelayIncrease, 60), // Increase by 1 hour
        });
      }
    }

    return recommendations;
  }

  /**
   * Apply a workflow adjustment
   */
  public async applyWorkflowAdjustment(
    recommendation: AdjustmentRecommendation,
    approvedBy?: string
  ): Promise<boolean> {
    try {
      // Record the adjustment
      await responseTrackingService.recordWorkflowAdjustment(
        recommendation.workflowId,
        recommendation.leadId,
        recommendation.adjustmentType,
        recommendation.reason,
        recommendation.currentValue,
        recommendation.recommendedValue
      );

      // Update last adjustment time
      this.lastAdjustments.set(recommendation.workflowId, new Date());
      await this.saveAdjustmentHistory();

      // Apply the actual adjustment (this would integrate with workflow execution service)
      const success = await this.executeAdjustment(recommendation);

      console.log(`Applied workflow adjustment: ${recommendation.adjustmentType} for workflow ${recommendation.workflowId}`);
      return success;

    } catch (error) {
      console.error('Failed to apply workflow adjustment:', error);
      return false;
    }
  }

  private async executeAdjustment(recommendation: AdjustmentRecommendation): Promise<boolean> {
    try {
      // This would integrate with the actual workflow execution service
      // For now, we'll simulate the adjustment
      switch (recommendation.adjustmentType) {
        case 'delay_increase':
        case 'delay_decrease':
          // Adjust workflow timing
          console.log(`Adjusting workflow delay by ${recommendation.recommendedValue} minutes`);
          break;

        case 'channel_switch':
          // Switch communication channel
          console.log(`Switching from ${recommendation.currentValue} to ${recommendation.recommendedValue}`);
          break;

        case 'content_adjustment':
          // Modify content strategy
          console.log(`Adjusting content: ${recommendation.recommendedValue}`);
          break;

        case 'frequency_change':
          // Change communication frequency
          console.log(`Changing frequency: ${recommendation.recommendedValue}`);
          break;

        default:
          console.warn(`Unknown adjustment type: ${recommendation.adjustmentType}`);
          return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to execute adjustment:', error);
      return false;
    }
  }

  /**
   * Get adjustment history for a workflow
   */
  public getAdjustmentHistory(workflowId: string): WorkflowAdjustment[] {
    return responseTrackingService.getWorkflowAdjustments(workflowId);
  }

  /**
   * Update adjustment rules
   */
  public updateAdjustmentRules(newRules: Partial<WorkflowAdjustmentRules>): void {
    this.adjustmentRules = { ...this.adjustmentRules, ...newRules };
    console.log('Adjustment rules updated:', this.adjustmentRules);
  }

  /**
   * Get current adjustment rules
   */
  public getAdjustmentRules(): WorkflowAdjustmentRules {
    return { ...this.adjustmentRules };
  }

  /**
   * Reset adjustment cooldown for testing
   */
  public resetCooldown(workflowId: string): void {
    this.lastAdjustments.delete(workflowId);
  }
}

// Export singleton instance
const workflowAdjustmentService = WorkflowAdjustmentService.getInstance();
export default workflowAdjustmentService;