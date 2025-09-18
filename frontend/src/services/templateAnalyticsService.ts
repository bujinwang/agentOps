import { CommunicationTemplate, TemplateAnalytics, TemplateRecommendation } from '../types/template';

export interface AnalyticsTimeframe {
  start: string;
  end: string;
  granularity: 'hour' | 'day' | 'week' | 'month';
}

export interface TemplatePerformanceMetrics {
  templateId: string;
  timeframe: AnalyticsTimeframe;
  metrics: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    responded: number;
    converted: number;
    bounced: number;
    unsubscribed: number;
  };
  rates: {
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    responseRate: number;
    conversionRate: number;
    bounceRate: number;
    unsubscribeRate: number;
  };
  trends: {
    direction: 'increasing' | 'decreasing' | 'stable';
    changePercent: number;
    confidence: number;
  };
  segments: Array<{
    segment: string;
    sent: number;
    performance: number;
    improvement: number;
  }>;
}

export interface ConversionAttribution {
  templateId: string;
  leadId: number;
  conversionEvent: {
    type: 'sale' | 'appointment' | 'inquiry' | 'engagement';
    value: number;
    timestamp: string;
    attribution: number; // 0-1, percentage of credit
  };
  touchpoints: Array<{
    templateId: string;
    timestamp: string;
    interaction: 'sent' | 'opened' | 'clicked' | 'responded';
    weight: number;
  }>;
  totalAttribution: number;
  roi: number;
}

export interface AnalyticsDashboard {
  overview: {
    totalTemplates: number;
    activeTemplates: number;
    totalSent: number;
    averageConversionRate: number;
    topPerformingTemplate: string;
    periodGrowth: number;
  };
  performance: {
    topTemplates: TemplatePerformanceMetrics[];
    underperformingTemplates: TemplatePerformanceMetrics[];
    trendingUp: TemplatePerformanceMetrics[];
    trendingDown: TemplatePerformanceMetrics[];
  };
  insights: {
    recommendations: TemplateRecommendation[];
    alerts: Array<{
      type: 'performance' | 'engagement' | 'technical';
      severity: 'low' | 'medium' | 'high';
      message: string;
      actionRequired: string;
    }>;
    opportunities: Array<{
      type: string;
      potential: number;
      description: string;
      implementation: string;
    }>;
  };
  attribution: {
    totalRevenue: number;
    attributedRevenue: number;
    topAttributionTemplates: Array<{
      templateId: string;
      attributedRevenue: number;
      attributionRate: number;
    }>;
    conversionFunnel: Array<{
      stage: string;
      count: number;
      rate: number;
    }>;
  };
}

class TemplateAnalyticsService {
  private static instance: TemplateAnalyticsService;
  private analyticsCache: Map<string, TemplatePerformanceMetrics> = new Map();
  private attributionCache: Map<string, ConversionAttribution[]> = new Map();

  private constructor() {}

  public static getInstance(): TemplateAnalyticsService {
    if (!TemplateAnalyticsService.instance) {
      TemplateAnalyticsService.instance = new TemplateAnalyticsService();
    }
    return TemplateAnalyticsService.instance;
  }

  /**
   * Generate comprehensive analytics for a template
   */
  public async generateTemplateAnalytics(
    templateId: string,
    timeframe: AnalyticsTimeframe
  ): Promise<TemplatePerformanceMetrics> {
    const cacheKey = `${templateId}_${timeframe.start}_${timeframe.end}`;

    // Check cache first
    const cached = this.analyticsCache.get(cacheKey);
    if (cached) return cached;

    // Fetch raw data (would integrate with actual data sources)
    const rawData = await this.fetchTemplateData(templateId, timeframe);

    // Calculate metrics
    const metrics = this.calculateMetrics(rawData);
    const rates = this.calculateRates(metrics);
    const trends = this.analyzeTrends(templateId, timeframe);
    const segments = this.analyzeSegments(templateId, timeframe);

    const analytics: TemplatePerformanceMetrics = {
      templateId,
      timeframe,
      metrics,
      rates,
      trends,
      segments,
    };

    // Cache results
    this.analyticsCache.set(cacheKey, analytics);

    return analytics;
  }

  /**
   * Generate dashboard data
   */
  public async generateDashboard(
    timeframe: AnalyticsTimeframe,
    templateIds?: string[]
  ): Promise<AnalyticsDashboard> {
    // Get all templates or specified ones
    const templates = templateIds || await this.getAllActiveTemplateIds();

    // Generate analytics for all templates
    const templateAnalytics = await Promise.all(
      templates.map(id => this.generateTemplateAnalytics(id, timeframe))
    );

    // Calculate overview metrics
    const overview = this.calculateOverviewMetrics(templateAnalytics, timeframe);

    // Identify top and underperforming templates
    const performance = this.analyzeTemplatePerformance(templateAnalytics);

    // Generate insights and recommendations
    const insights = await this.generateInsights(templateAnalytics);

    // Calculate attribution data
    const attribution = await this.generateAttributionAnalytics(templateAnalytics, timeframe);

    return {
      overview,
      performance,
      insights,
      attribution,
    };
  }

  /**
   * Calculate conversion attribution
   */
  public async calculateConversionAttribution(
    leadId: number,
    conversionValue: number,
    conversionType: 'sale' | 'appointment' | 'inquiry' | 'engagement',
    touchpoints: Array<{
      templateId: string;
      timestamp: string;
      interaction: 'sent' | 'opened' | 'clicked' | 'responded';
    }>
  ): Promise<ConversionAttribution> {
    // Attribution model weights
    const attributionWeights = {
      sent: 0.1,
      opened: 0.3,
      clicked: 0.5,
      responded: 0.8,
    };

    // Calculate total weight
    const totalWeight = touchpoints.reduce((sum, tp) =>
      sum + attributionWeights[tp.interaction], 0
    );

    // Calculate attribution for each touchpoint
    const attributedTouchpoints = touchpoints.map(tp => ({
      templateId: tp.templateId,
      timestamp: tp.timestamp,
      interaction: tp.interaction,
      weight: attributionWeights[tp.interaction],
      attribution: totalWeight > 0 ? attributionWeights[tp.interaction] / totalWeight : 0,
    }));

    // Calculate ROI for each template
    const templateAttribution = new Map<string, number>();
    attributedTouchpoints.forEach(tp => {
      const current = templateAttribution.get(tp.templateId) || 0;
      templateAttribution.set(tp.templateId, current + tp.attribution);
    });

    // Calculate overall attribution and ROI
    const totalAttribution = Math.min(templateAttribution.size > 0 ?
      Array.from(templateAttribution.values()).reduce((sum, attr) => sum + attr, 0) : 0, 1);

    const roi = totalAttribution > 0 ? (conversionValue * totalAttribution) / conversionValue : 0;

    const attribution: ConversionAttribution = {
      templateId: attributedTouchpoints[0]?.templateId || '',
      leadId,
      conversionEvent: {
        type: conversionType,
        value: conversionValue,
        timestamp: new Date().toISOString(),
        attribution: totalAttribution,
      },
      touchpoints: attributedTouchpoints,
      totalAttribution,
      roi,
    };

    // Cache attribution data
    const cacheKey = `lead_${leadId}`;
    const existingAttributions = this.attributionCache.get(cacheKey) || [];
    existingAttributions.push(attribution);
    this.attributionCache.set(cacheKey, existingAttributions);

    return attribution;
  }

  /**
   * Generate automated report
   */
  public async generateReport(
    timeframe: AnalyticsTimeframe,
    reportType: 'daily' | 'weekly' | 'monthly' | 'custom',
    templateIds?: string[]
  ): Promise<{
    summary: string;
    keyMetrics: Record<string, any>;
    insights: string[];
    recommendations: string[];
    charts: Array<{
      type: 'line' | 'bar' | 'pie';
      title: string;
      data: any;
    }>;
  }> {
    const dashboard = await this.generateDashboard(timeframe, templateIds);

    const summary = this.generateReportSummary(dashboard, timeframe);
    const keyMetrics = this.extractKeyMetrics(dashboard);
    const insights = this.generateReportInsights(dashboard);
    const recommendations = this.generateReportRecommendations(dashboard);
    const charts = this.generateReportCharts(dashboard, timeframe);

    return {
      summary,
      keyMetrics,
      insights,
      recommendations,
      charts,
    };
  }

  /**
   * Fetch template data (would integrate with actual data sources)
   */
  private async fetchTemplateData(
    templateId: string,
    timeframe: AnalyticsTimeframe
  ): Promise<any> {
    // This would integrate with actual data sources
    // For now, return mock data structure
    return {
      sent: Math.floor(Math.random() * 1000) + 500,
      delivered: 0, // Would be calculated
      opened: 0,
      clicked: 0,
      responded: 0,
      converted: 0,
      bounced: 0,
      unsubscribed: 0,
    };
  }

  /**
   * Calculate performance metrics
   */
  private calculateMetrics(rawData: any): TemplatePerformanceMetrics['metrics'] {
    // Calculate derived metrics
    const deliveryRate = 0.95; // Assume 95% delivery rate
    const delivered = Math.floor(rawData.sent * deliveryRate);
    const opened = Math.floor(delivered * (Math.random() * 0.3 + 0.2)); // 20-50% open rate
    const clicked = Math.floor(opened * (Math.random() * 0.2 + 0.05)); // 5-25% click rate
    const responded = Math.floor(clicked * (Math.random() * 0.3 + 0.1)); // 10-40% response rate
    const converted = Math.floor(responded * (Math.random() * 0.15 + 0.02)); // 2-17% conversion rate
    const bounced = Math.floor(rawData.sent * 0.03); // 3% bounce rate
    const unsubscribed = Math.floor(delivered * 0.01); // 1% unsubscribe rate

    return {
      sent: rawData.sent,
      delivered,
      opened,
      clicked,
      responded,
      converted,
      bounced,
      unsubscribed,
    };
  }

  /**
   * Calculate performance rates
   */
  private calculateRates(metrics: TemplatePerformanceMetrics['metrics']): TemplatePerformanceMetrics['rates'] {
    return {
      deliveryRate: metrics.sent > 0 ? metrics.delivered / metrics.sent : 0,
      openRate: metrics.delivered > 0 ? metrics.opened / metrics.delivered : 0,
      clickRate: metrics.opened > 0 ? metrics.clicked / metrics.opened : 0,
      responseRate: metrics.clicked > 0 ? metrics.responded / metrics.clicked : 0,
      conversionRate: metrics.sent > 0 ? metrics.converted / metrics.sent : 0,
      bounceRate: metrics.sent > 0 ? metrics.bounced / metrics.sent : 0,
      unsubscribeRate: metrics.delivered > 0 ? metrics.unsubscribed / metrics.delivered : 0,
    };
  }

  /**
   * Analyze performance trends
   */
  private analyzeTrends(
    templateId: string,
    timeframe: AnalyticsTimeframe
  ): TemplatePerformanceMetrics['trends'] {
    // Simplified trend analysis
    const changePercent = (Math.random() - 0.5) * 40; // -20% to +20%
    const direction = changePercent > 5 ? 'increasing' :
                     changePercent < -5 ? 'decreasing' : 'stable';
    const confidence = Math.random() * 0.3 + 0.7; // 70-100% confidence

    return {
      direction,
      changePercent,
      confidence,
    };
  }

  /**
   * Analyze performance by segments
   */
  private analyzeSegments(
    templateId: string,
    timeframe: AnalyticsTimeframe
  ): TemplatePerformanceMetrics['segments'] {
    const segments = ['New Leads', 'Existing Customers', 'High Value', 'Low Engagement'];

    return segments.map(segment => ({
      segment,
      sent: Math.floor(Math.random() * 200) + 50,
      performance: Math.random() * 0.2 + 0.1, // 10-30% performance
      improvement: (Math.random() - 0.5) * 20, // -10% to +10% improvement
    }));
  }

  /**
   * Get all active template IDs
   */
  private async getAllActiveTemplateIds(): Promise<string[]> {
    // This would fetch from actual data source
    return ['template_1', 'template_2', 'template_3', 'template_4', 'template_5'];
  }

  /**
   * Calculate overview metrics
   */
  private calculateOverviewMetrics(
    templateAnalytics: TemplatePerformanceMetrics[],
    timeframe: AnalyticsTimeframe
  ): AnalyticsDashboard['overview'] {
    const totalTemplates = templateAnalytics.length;
    const activeTemplates = templateAnalytics.filter(t => t.metrics.sent > 0).length;
    const totalSent = templateAnalytics.reduce((sum, t) => sum + t.metrics.sent, 0);
    const totalConversions = templateAnalytics.reduce((sum, t) => sum + t.metrics.converted, 0);
    const averageConversionRate = totalSent > 0 ? totalConversions / totalSent : 0;

    const topPerformingTemplate = templateAnalytics.reduce((top, current) =>
      current.rates.conversionRate > top.rates.conversionRate ? current : top
    ).templateId;

    // Simplified period growth calculation
    const periodGrowth = (Math.random() - 0.5) * 30; // -15% to +15%

    return {
      totalTemplates,
      activeTemplates,
      totalSent,
      averageConversionRate,
      topPerformingTemplate,
      periodGrowth,
    };
  }

  /**
   * Analyze template performance
   */
  private analyzeTemplatePerformance(
    templateAnalytics: TemplatePerformanceMetrics[]
  ): AnalyticsDashboard['performance'] {
    const sortedByPerformance = [...templateAnalytics].sort(
      (a, b) => b.rates.conversionRate - a.rates.conversionRate
    );

    return {
      topTemplates: sortedByPerformance.slice(0, 5),
      underperformingTemplates: sortedByPerformance.slice(-3),
      trendingUp: templateAnalytics.filter(t => t.trends.direction === 'increasing'),
      trendingDown: templateAnalytics.filter(t => t.trends.direction === 'decreasing'),
    };
  }

  /**
   * Generate insights and recommendations
   */
  private async generateInsights(
    templateAnalytics: TemplatePerformanceMetrics[]
  ): Promise<AnalyticsDashboard['insights']> {
    const recommendations: TemplateRecommendation[] = [];
    const alerts: AnalyticsDashboard['insights']['alerts'] = [];
    const opportunities: AnalyticsDashboard['insights']['opportunities'] = [];

    // Generate recommendations
    templateAnalytics.forEach(analytics => {
      if (analytics.rates.conversionRate < 0.05) { // Below 5%
        recommendations.push({
          templateId: analytics.templateId,
          score: analytics.rates.conversionRate * 100,
          reasons: ['Low conversion rate detected', 'Consider A/B testing improvements'],
          confidence: 'high',
          expectedPerformance: {
            openRate: analytics.rates.openRate,
            responseRate: analytics.rates.responseRate,
            conversionRate: analytics.rates.conversionRate * 1.2, // Expected 20% improvement
          },
          similarTemplates: [], // Would be populated with similar high-performing templates
        });
      }
    });

    // Generate alerts
    const highBounceTemplates = templateAnalytics.filter(t => t.rates.bounceRate > 0.05);
    if (highBounceTemplates.length > 0) {
      alerts.push({
        type: 'technical',
        severity: 'high',
        message: `${highBounceTemplates.length} templates have high bounce rates`,
        actionRequired: 'Review email deliverability and sender reputation',
      });
    }

    // Generate opportunities
    const avgConversionRate = templateAnalytics.reduce(
      (sum, t) => sum + t.rates.conversionRate, 0
    ) / templateAnalytics.length;

    if (avgConversionRate < 0.1) {
      opportunities.push({
        type: 'optimization',
        potential: 0.15, // 15% improvement potential
        description: 'Overall conversion rates below industry average',
        implementation: 'Implement A/B testing program and personalization improvements',
      });
    }

    return {
      recommendations,
      alerts,
      opportunities,
    };
  }

  /**
   * Generate attribution analytics
   */
  private async generateAttributionAnalytics(
    templateAnalytics: TemplatePerformanceMetrics[],
    timeframe: AnalyticsTimeframe
  ): Promise<AnalyticsDashboard['attribution']> {
    // Mock attribution data - would integrate with actual conversion tracking
    const totalRevenue = 50000; // Mock total revenue
    const attributedRevenue = totalRevenue * 0.7; // 70% attributed

    const topAttributionTemplates = templateAnalytics
      .sort((a, b) => b.metrics.converted - a.metrics.converted)
      .slice(0, 5)
      .map(t => ({
        templateId: t.templateId,
        attributedRevenue: t.metrics.converted * 100, // Mock revenue per conversion
        attributionRate: t.rates.conversionRate,
      }));

    const conversionFunnel = [
      { stage: 'Sent', count: templateAnalytics.reduce((sum, t) => sum + t.metrics.sent, 0), rate: 1.0 },
      { stage: 'Delivered', count: templateAnalytics.reduce((sum, t) => sum + t.metrics.delivered, 0), rate: 0.95 },
      { stage: 'Opened', count: templateAnalytics.reduce((sum, t) => sum + t.metrics.opened, 0), rate: 0.25 },
      { stage: 'Clicked', count: templateAnalytics.reduce((sum, t) => sum + t.metrics.clicked, 0), rate: 0.08 },
      { stage: 'Responded', count: templateAnalytics.reduce((sum, t) => sum + t.metrics.responded, 0), rate: 0.03 },
      { stage: 'Converted', count: templateAnalytics.reduce((sum, t) => sum + t.metrics.converted, 0), rate: 0.008 },
    ];

    return {
      totalRevenue,
      attributedRevenue,
      topAttributionTemplates,
      conversionFunnel,
    };
  }

  /**
   * Generate report summary
   */
  private generateReportSummary(
    dashboard: AnalyticsDashboard,
    timeframe: AnalyticsTimeframe
  ): string {
    const period = timeframe.granularity === 'day' ? 'daily' :
                   timeframe.granularity === 'week' ? 'weekly' : 'monthly';

    return `${period.charAt(0).toUpperCase() + period.slice(1)} Template Performance Report

Overview:
• ${dashboard.overview.totalTemplates} total templates analyzed
• ${dashboard.overview.activeTemplates} actively used templates
• ${dashboard.overview.totalSent.toLocaleString()} total communications sent
• ${(dashboard.overview.averageConversionRate * 100).toFixed(2)}% average conversion rate
• ${dashboard.overview.periodGrowth > 0 ? '+' : ''}${dashboard.overview.periodGrowth.toFixed(1)}% period-over-period growth

Key Highlights:
• Top performing template: ${dashboard.overview.topPerformingTemplate}
• ${dashboard.performance.topTemplates.length} high-performing templates identified
• ${dashboard.insights.recommendations.length} optimization recommendations
• ${dashboard.insights.alerts.length} alerts requiring attention
• $${dashboard.attribution.attributedRevenue.toLocaleString()} revenue attributed to templates`;
  }

  /**
   * Extract key metrics for report
   */
  private extractKeyMetrics(dashboard: AnalyticsDashboard): Record<string, any> {
    return {
      totalTemplates: dashboard.overview.totalTemplates,
      activeTemplates: dashboard.overview.activeTemplates,
      totalSent: dashboard.overview.totalSent,
      averageConversionRate: dashboard.overview.averageConversionRate,
      topPerformingTemplate: dashboard.overview.topPerformingTemplate,
      periodGrowth: dashboard.overview.periodGrowth,
      totalRevenue: dashboard.attribution.totalRevenue,
      attributedRevenue: dashboard.attribution.attributedRevenue,
      attributionRate: dashboard.attribution.attributedRevenue / dashboard.attribution.totalRevenue,
    };
  }

  /**
   * Generate report insights
   */
  private generateReportInsights(dashboard: AnalyticsDashboard): string[] {
    const insights: string[] = [];

    if (dashboard.overview.periodGrowth > 10) {
      insights.push(`📈 Strong growth of ${dashboard.overview.periodGrowth.toFixed(1)}% indicates effective template strategy`);
    } else if (dashboard.overview.periodGrowth < -5) {
      insights.push(`📉 Performance decline of ${Math.abs(dashboard.overview.periodGrowth).toFixed(1)}% requires immediate attention`);
    }

    if (dashboard.insights.recommendations.length > 0) {
      insights.push(`🎯 ${dashboard.insights.recommendations.length} templates identified for optimization`);
    }

    if (dashboard.performance.trendingUp.length > dashboard.performance.trendingDown.length) {
      insights.push(`📊 More templates trending upward than downward - positive momentum`);
    }

    const topSegment = dashboard.performance.topTemplates[0]?.segments.reduce((top, current) =>
      current.performance > top.performance ? current : top
    );

    if (topSegment) {
      insights.push(`👥 ${topSegment.segment} segment shows highest engagement at ${(topSegment.performance * 100).toFixed(1)}%`);
    }

    return insights;
  }

  /**
   * Generate report recommendations
   */
  private generateReportRecommendations(dashboard: AnalyticsDashboard): string[] {
    const recommendations: string[] = [];

    if (dashboard.insights.alerts.some(a => a.severity === 'high')) {
      recommendations.push('🚨 Address high-severity alerts immediately to prevent performance degradation');
    }

    if (dashboard.performance.underperformingTemplates.length > 0) {
      recommendations.push(`📉 Review ${dashboard.performance.underperformingTemplates.length} underperforming templates for optimization`);
    }

    if (dashboard.insights.opportunities.length > 0) {
      recommendations.push(`💡 Implement identified opportunities for ${Math.round(dashboard.insights.opportunities[0].potential * 100)}% potential improvement`);
    }

    if (dashboard.overview.averageConversionRate < 0.05) {
      recommendations.push('🎯 Industry average conversion rate is 5-8% - consider comprehensive optimization program');
    }

    recommendations.push('📊 Schedule regular A/B testing for top-performing templates to maintain optimization momentum');

    return recommendations;
  }

  /**
   * Generate report charts
   */
  private generateReportCharts(
    dashboard: AnalyticsDashboard,
    timeframe: AnalyticsTimeframe
  ): Array<{ type: 'line' | 'bar' | 'pie'; title: string; data: any }> {
    const charts: Array<{ type: 'line' | 'bar' | 'pie'; title: string; data: any }> = [];

    // Conversion funnel chart
    charts.push({
      type: 'bar',
      title: 'Conversion Funnel',
      data: {
        labels: dashboard.attribution.conversionFunnel.map(s => s.stage),
        datasets: [{
          label: 'Count',
          data: dashboard.attribution.conversionFunnel.map(s => s.count),
        }],
      },
    });

    // Template performance comparison
    charts.push({
      type: 'bar',
      title: 'Top Template Performance',
      data: {
        labels: dashboard.performance.topTemplates.slice(0, 5).map(t => t.templateId),
        datasets: [{
          label: 'Conversion Rate (%)',
          data: dashboard.performance.topTemplates.slice(0, 5).map(t => t.rates.conversionRate * 100),
        }],
      },
    });

    // Performance trends
    const trendLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    charts.push({
      type: 'line',
      title: 'Performance Trends',
      data: {
        labels: trendLabels,
        datasets: [
          {
            label: 'Conversion Rate',
            data: trendLabels.map(() => dashboard.overview.averageConversionRate * 100 + (Math.random() - 0.5) * 20),
          },
          {
            label: 'Open Rate',
            data: trendLabels.map(() => 25 + (Math.random() - 0.5) * 10),
          },
        ],
      },
    });

    return charts;
  }

  /**
   * Clear analytics cache
   */
  public clearCache(): void {
    this.analyticsCache.clear();
    this.attributionCache.clear();
  }

  /**
   * Get service statistics
   */
  public getStatistics(): {
    cachedAnalytics: number;
    cachedAttributions: number;
    cacheHitRate: number;
  } {
    return {
      cachedAnalytics: this.analyticsCache.size,
      cachedAttributions: this.attributionCache.size,
      cacheHitRate: 0.85, // Would be calculated from actual cache hits
    };
  }
}

export const templateAnalyticsService = TemplateAnalyticsService.getInstance();