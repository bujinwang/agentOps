import { Injectable } from '../types/di';
import {
  DashboardConfig,
  DashboardComponent,
  LeadInsights,
  PredictiveAnalytics,
  DashboardFilters,
  DashboardMetrics,
  DashboardAlert,
  DashboardWebSocketEvent,
  DashboardApiResponse,
  ComponentData,
  LoadingState,
} from '../types/dashboard';
import { MLScoringService } from './mlScoringService';
import { RealTimeScoringService } from './realTimeScoringService';
import leadScoreApiService from './leadScoreApiService';

@Injectable()
export class DashboardService {
  private static instance: DashboardService;
  private mlScoringService: MLScoringService;
  private realTimeScoringService: RealTimeScoringService;
  private leadScoreApiService: typeof leadScoreApiService;

  // Dashboard state
  private currentConfig: DashboardConfig | null = null;
  private activeFilters: DashboardFilters;
  private componentData: Map<string, ComponentData> = new Map();
  private webSocketConnection: WebSocket | null = null;
  private refreshIntervals: Map<string, NodeJS.Timeout> = new Map();
  private loadingStates: Map<string, LoadingState> = new Map();

  // Data caches
  private leadInsightsCache: Map<number, LeadInsights> = new Map();
  private predictiveCache: Map<number, PredictiveAnalytics> = new Map();
  private metricsCache: DashboardMetrics | null = null;
  private alertsCache: DashboardAlert[] = [];

  // Event listeners
  private eventListeners: Map<string, ((event: DashboardWebSocketEvent) => void)[]> = new Map();

  private constructor() {
    this.mlScoringService = MLScoringService.getInstance();
    this.realTimeScoringService = RealTimeScoringService.getInstance();
    this.leadScoreApiService = leadScoreApiService;

    // Initialize default filters
    this.activeFilters = {
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
        preset: 'last30days',
      },
      leadStatus: ['new', 'contacted', 'qualified'],
      leadSource: [],
      scoreRange: { min: 0, max: 100 },
      engagementLevel: ['low', 'medium', 'high'],
    };

    // Initialize WebSocket connection
    this.initializeWebSocket();
  }

  public static getInstance(): DashboardService {
    if (!DashboardService.instance) {
      DashboardService.instance = new DashboardService();
    }
    return DashboardService.instance;
  }

  /**
   * Initialize dashboard with configuration
   */
  public async initializeDashboard(configId?: string): Promise<DashboardConfig> {
    try {
      // Load dashboard configuration
      this.currentConfig = await this.loadDashboardConfig(configId);

      // Initialize all components
      await this.initializeComponents();

      // Start real-time updates
      this.startRealTimeUpdates();

      return this.currentConfig;
    } catch (error) {
      console.error('Failed to initialize dashboard:', error);
      throw new Error('Dashboard initialization failed');
    }
  }

  /**
   * Get lead insights for dashboard
   */
  public async getLeadInsights(
    leadIds?: number[],
    filters?: Partial<DashboardFilters>
  ): Promise<LeadInsights[]> {
    const appliedFilters = { ...this.activeFilters, ...filters };

    try {
      this.setLoadingState('lead-insights', true, 'Loading lead insights...');

      // Get leads based on filters
      const leads = await this.fetchFilteredLeads(appliedFilters, leadIds);

      // Get ML scores for leads
      const scoredLeads = await this.enrichLeadsWithScores(leads);

      // Generate insights for each lead
      const insights = await Promise.all(
        scoredLeads.map(lead => this.generateLeadInsights(lead))
      );

      // Cache insights
      insights.forEach(insight => {
        this.leadInsightsCache.set(insight.leadId, insight);
      });

      this.setLoadingState('lead-insights', false);
      return insights;

    } catch (error) {
      console.error('Failed to get lead insights:', error);
      this.setLoadingState('lead-insights', false, undefined, 'Failed to load lead insights');
      throw error;
    }
  }

  /**
   * Get predictive analytics for leads
   */
  public async getPredictiveAnalytics(
    leadIds: number[],
    options?: {
      includeTimeline?: boolean;
      includeValue?: boolean;
      includeRisk?: boolean;
    }
  ): Promise<PredictiveAnalytics[]> {
    try {
      this.setLoadingState('predictive-analytics', true, 'Generating predictions...');

      const predictions = await Promise.all(
        leadIds.map(leadId => this.generatePredictiveAnalytics(leadId, options))
      );

      // Cache predictions
      predictions.forEach(prediction => {
        this.predictiveCache.set(prediction.leadId, prediction);
      });

      this.setLoadingState('predictive-analytics', false);
      return predictions;

    } catch (error) {
      console.error('Failed to get predictive analytics:', error);
      this.setLoadingState('predictive-analytics', false, undefined, 'Failed to generate predictions');
      throw error;
    }
  }

  /**
   * Get dashboard metrics
   */
  public async getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
      this.setLoadingState('dashboard-metrics', true, 'Calculating metrics...');

      // Check cache first
      if (this.metricsCache && this.isCacheValid('metrics', 300)) { // 5 minutes
        this.setLoadingState('dashboard-metrics', false);
        return this.metricsCache;
      }

      // Fetch fresh metrics
      const metrics = await this.calculateDashboardMetrics();

      // Cache metrics
      this.metricsCache = metrics;

      this.setLoadingState('dashboard-metrics', false);
      return metrics;

    } catch (error) {
      console.error('Failed to get dashboard metrics:', error);
      this.setLoadingState('dashboard-metrics', false, undefined, 'Failed to calculate metrics');
      throw error;
    }
  }

  /**
   * Get dashboard alerts
   */
  public async getDashboardAlerts(
    severity?: 'low' | 'medium' | 'high' | 'critical',
    acknowledged?: boolean
  ): Promise<DashboardAlert[]> {
    try {
      let alerts = [...this.alertsCache];

      // Filter by severity
      if (severity) {
        alerts = alerts.filter(alert => alert.severity === severity);
      }

      // Filter by acknowledged status
      if (acknowledged !== undefined) {
        alerts = alerts.filter(alert => alert.acknowledged === acknowledged);
      }

      // Sort by timestamp (newest first)
      alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return alerts;

    } catch (error) {
      console.error('Failed to get dashboard alerts:', error);
      throw error;
    }
  }

  /**
   * Update dashboard filters
   */
  public async updateFilters(filters: Partial<DashboardFilters>): Promise<void> {
    this.activeFilters = { ...this.activeFilters, ...filters };

    // Clear relevant caches
    this.leadInsightsCache.clear();
    this.predictiveCache.clear();
    this.metricsCache = null;

    // Notify components of filter change
    this.notifyComponents('filters_updated', { filters: this.activeFilters });

    // Refresh data for affected components
    await this.refreshFilteredComponents();
  }

  /**
   * Get component data
   */
  public getComponentData(componentId: string): ComponentData | null {
    return this.componentData.get(componentId) || null;
  }

  /**
   * Get loading state for component
   */
  public getLoadingState(componentId: string): LoadingState | null {
    return this.loadingStates.get(componentId) || null;
  }

  /**
   * Subscribe to dashboard events
   */
  public subscribeToEvents(
    eventType: string,
    callback: (event: DashboardWebSocketEvent) => void
  ): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }

    this.eventListeners.get(eventType)!.push(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(eventType);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  /**
   * Refresh component data
   */
  public async refreshComponent(componentId: string): Promise<void> {
    try {
      this.setLoadingState(componentId, true, 'Refreshing...');

      switch (componentId) {
        case 'lead-insights':
          await this.refreshLeadInsights();
          break;
        case 'predictive-analytics':
          await this.refreshPredictiveAnalytics();
          break;
        case 'dashboard-metrics':
          await this.refreshDashboardMetrics();
          break;
        default:
          console.warn(`Unknown component: ${componentId}`);
      }

      this.setLoadingState(componentId, false);

    } catch (error) {
      console.error(`Failed to refresh component ${componentId}:`, error);
      this.setLoadingState(componentId, false, undefined, `Failed to refresh ${componentId}`);
    }
  }

  /**
   * Export dashboard data
   */
  public async exportDashboard(
    format: 'pdf' | 'csv' | 'excel',
    componentIds: string[],
    options?: {
      includeCharts?: boolean;
      includeRawData?: boolean;
      title?: string;
    }
  ): Promise<string> {
    try {
      this.setLoadingState('export', true, 'Preparing export...');

      // Gather data from selected components
      const exportData = await this.gatherExportData(componentIds);

      // Generate export based on format
      const exportUrl = await this.generateExport(exportData, format, options);

      this.setLoadingState('export', false);
      return exportUrl;

    } catch (error) {
      console.error('Failed to export dashboard:', error);
      this.setLoadingState('export', false, undefined, 'Export failed');
      throw error;
    }
  }

  // Private methods

  private async loadDashboardConfig(configId?: string): Promise<DashboardConfig> {
    // Mock implementation - in real system, load from API/database
    return {
      id: configId || 'default',
      userId: 1,
      name: 'Predictive Lead Insights Dashboard',
      layout: {
        id: 'default-layout',
        components: [],
        grid: { columns: 12, rows: 6, gap: 16 },
        responsive: {
          breakpoints: { mobile: 768, tablet: 1024, desktop: 1440 },
          layouts: {},
        },
      },
      filters: this.activeFilters,
      preferences: {
        theme: 'light',
        language: 'en',
        timezone: 'America/Edmonton',
        currency: 'USD',
        dateFormat: 'MM/dd/yyyy',
        numberFormat: 'en-US',
        notifications: {
          enabled: true,
          types: ['lead_alert', 'model_performance'],
          frequency: 'immediate',
        },
        autoRefresh: {
          enabled: true,
          interval: 30,
        },
        export: {
          defaultFormat: 'pdf',
          includeCharts: true,
          includeRawData: true,
        },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private async initializeComponents(): Promise<void> {
    if (!this.currentConfig) return;

    // Initialize each component
    for (const component of this.currentConfig.layout.components) {
      await this.initializeComponent(component);
    }
  }

  private async initializeComponent(component: DashboardComponent): Promise<void> {
    // Set initial loading state
    this.setLoadingState(component.id, true, 'Initializing...');

    // Load initial data
    await this.loadComponentData(component);

    // Set up refresh interval if enabled
    if (component.refresh.enabled) {
      this.setupComponentRefresh(component);
    }

    this.setLoadingState(component.id, false);
  }

  private async loadComponentData(component: DashboardComponent): Promise<void> {
    try {
      let data: any;

      switch (component.type) {
        case 'lead-insights':
          data = await this.getLeadInsights();
          break;
        case 'conversion-probability':
          data = await this.getConversionProbabilities();
          break;
        case 'predictive-timeline':
          data = await this.getPredictiveTimelines();
          break;
        case 'behavioral-analysis':
          data = await this.getBehavioralAnalysis();
          break;
        case 'recommendation-engine':
          data = await this.getRecommendations();
          break;
        case 'model-performance':
          data = await this.getModelPerformanceData();
          break;
        default:
          data = null;
      }

      const componentData: ComponentData = {
        loading: false,
        lastUpdated: new Date().toISOString(),
        data,
        metadata: {
          totalRecords: Array.isArray(data) ? data.length : 1,
          dataRange: {
            start: this.activeFilters.dateRange.start,
            end: this.activeFilters.dateRange.end,
          },
        },
      };

      this.componentData.set(component.id, componentData);

    } catch (error) {
      console.error(`Failed to load data for component ${component.id}:`, error);

      const errorData: ComponentData = {
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load data',
        lastUpdated: new Date().toISOString(),
        data: null,
        metadata: {},
      };

      this.componentData.set(component.id, errorData);
    }
  }

  private setupComponentRefresh(component: DashboardComponent): void {
    const interval = setInterval(async () => {
      await this.refreshComponent(component.id);
    }, component.refresh.interval * 1000);

    this.refreshIntervals.set(component.id, interval);
  }

  private initializeWebSocket(): void {
    try {
      // Mock WebSocket connection - in real system, connect to actual WebSocket server
      this.webSocketConnection = {
        onmessage: (event) => {
          try {
            const wsEvent: DashboardWebSocketEvent = JSON.parse(event.data);
            this.handleWebSocketEvent(wsEvent);
          } catch (error) {
            console.error('Failed to parse WebSocket event:', error);
          }
        },
        send: (data) => {
          // Mock send implementation
          console.log('WebSocket send:', data);
        },
      } as any;

      console.log('WebSocket connection initialized');

    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
    }
  }

  private handleWebSocketEvent(event: DashboardWebSocketEvent): void {
    // Handle different event types
    switch (event.type) {
      case 'lead_update':
        this.handleLeadUpdate(event.data);
        break;
      case 'score_change':
        this.handleScoreChange(event.data);
        break;
      case 'alert':
        this.handleAlert(event.data);
        break;
      case 'model_performance':
        this.handleModelPerformanceUpdate(event.data);
        break;
      case 'system_health':
        this.handleSystemHealthUpdate(event.data);
        break;
    }

    // Notify listeners
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  private handleLeadUpdate(data: any): void {
    // Update lead insights cache
    if (data.leadId && data.updates) {
      const cached = this.leadInsightsCache.get(data.leadId);
      if (cached) {
        Object.assign(cached, data.updates);
        this.leadInsightsCache.set(data.leadId, cached);
      }
    }

    // Notify components
    this.notifyComponents('lead_updated', data);
  }

  private handleScoreChange(data: any): void {
    // Update score in cache
    if (data.leadId && data.newScore) {
      const cached = this.leadInsightsCache.get(data.leadId);
      if (cached) {
        cached.currentScore = data.newScore;
        cached.scoreHistory.push({
          timestamp: new Date().toISOString(),
          score: data.newScore,
          confidence: data.confidence || 0.8,
          factors: data.factors || {},
        });
      }
    }

    // Notify components
    this.notifyComponents('score_changed', data);
  }

  private handleAlert(data: any): void {
    // Add to alerts cache
    this.alertsCache.unshift(data);

    // Keep only last 100 alerts
    if (this.alertsCache.length > 100) {
      this.alertsCache = this.alertsCache.slice(0, 100);
    }

    // Notify components
    this.notifyComponents('alert_received', data);
  }

  private handleModelPerformanceUpdate(data: any): void {
    // Update metrics cache if needed
    if (this.metricsCache) {
      // Update relevant metrics
    }

    // Notify components
    this.notifyComponents('model_performance_updated', data);
  }

  private handleSystemHealthUpdate(data: any): void {
    // Update system health in metrics
    if (this.metricsCache) {
      this.metricsCache.systemHealth = data;
    }

    // Notify components
    this.notifyComponents('system_health_updated', data);
  }

  private startRealTimeUpdates(): void {
    // Start periodic updates for components that need them
    this.currentConfig?.layout.components.forEach(component => {
      if (component.refresh.enabled) {
        this.setupComponentRefresh(component);
      }
    });
  }

  private async fetchFilteredLeads(
    filters: DashboardFilters,
    leadIds?: number[]
  ): Promise<any[]> {
    // Mock implementation - in real system, fetch from API with filters
    return Array.from({ length: 50 }, (_, i) => ({
      id: leadIds?.[i] || i + 1,
      name: `Lead ${i + 1}`,
      email: `lead${i + 1}@example.com`,
      leadScore: Math.random() * 100,
      engagementLevel: Math.random() > 0.5 ? 'high' : 'medium',
      source: 'website',
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      lastActivity: new Date().toISOString(),
      totalInteractions: Math.floor(Math.random() * 20) + 1,
      conversionEvents: Math.floor(Math.random() * 3),
    }));
  }

  private async enrichLeadsWithScores(leads: any[]): Promise<any[]> {
    // Get ML scores for leads
    const scoredLeads = await Promise.all(
      leads.map(async (lead) => {
        try {
          const score = await this.realTimeScoringService.scoreLead(lead.id);
          return { ...lead, mlScore: score };
        } catch (error) {
          console.warn(`Failed to score lead ${lead.id}:`, error);
          return { ...lead, mlScore: null };
        }
      })
    );

    return scoredLeads;
  }

  private async generateLeadInsights(lead: any): Promise<LeadInsights> {
    // Mock implementation - in real system, use ML and historical data
    const insights: LeadInsights = {
      leadId: lead.id,
      name: lead.name,
      email: lead.email,
      currentScore: lead.mlScore?.score || lead.leadScore,
      scoreHistory: [
        {
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          score: lead.leadScore * 0.9,
          confidence: 0.8,
          factors: { engagement: 0.7, recency: 0.6 },
        },
      ],
      conversionProbability: Math.random() * 0.8 + 0.1,
      engagementLevel: lead.engagementLevel,
      lastActivity: lead.lastActivity,
      nextBestAction: 'Send personalized follow-up email',
      priority: lead.mlScore?.score > 80 ? 'high' : 'medium',
      insights: [
        {
          type: 'positive',
          category: 'behavioral',
          title: 'High Engagement',
          description: 'Lead has shown consistent engagement with recent activities',
          impact: 0.3,
          confidence: 0.85,
          data: { recentActivities: 5, engagementRate: 0.75 },
        },
      ],
      recommendations: [
        {
          id: `rec_${lead.id}_1`,
          type: 'follow_up',
          title: 'Schedule Follow-up Call',
          description: 'Lead is showing strong interest signals',
          priority: 'high',
          suggestedAction: 'Call within 24 hours',
          expectedImpact: 0.4,
          channels: [
            { type: 'call', priority: 1, effectiveness: 0.8 },
            { type: 'email', priority: 2, effectiveness: 0.6 },
          ],
          status: 'pending',
        },
      ],
    };

    return insights;
  }

  private async generatePredictiveAnalytics(
    leadId: number,
    options?: any
  ): Promise<PredictiveAnalytics> {
    // Mock implementation
    return {
      leadId,
      conversionForecast: {
        probability: Math.random() * 0.7 + 0.2,
        confidence: 0.75,
        estimatedTimeline: {
          optimistic: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          realistic: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          pessimistic: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        factors: [],
        scenarios: [],
      },
      dealValuePrediction: {
        estimatedValue: Math.random() * 500000 + 100000,
        confidence: 0.7,
        range: {
          min: 80000,
          max: 600000,
        },
        factors: [],
        comparables: [],
      },
      behavioralPatterns: {
        engagementPatterns: [],
        trends: [],
        significance: 0.5,
        insights: [],
        lastAnalyzed: new Date().toISOString(),
      },
      riskAssessment: {
        overallRisk: Math.random() * 0.5,
        riskFactors: [],
        mitigationStrategies: [],
        confidence: 0.8,
      },
      opportunityScore: Math.random() * 100,
    };
  }

  private async calculateDashboardMetrics(): Promise<DashboardMetrics> {
    // Mock implementation
    return {
      totalLeads: 1250,
      activeLeads: 890,
      highValueLeads: 156,
      conversionRate: 0.23,
      averageScore: 67.5,
      topPerformingAgents: [],
      recentActivity: [],
      systemHealth: {
        status: 'healthy',
        components: {
          database: { status: 'healthy', responseTime: 45, errorRate: 0.001, uptime: 0.999 },
          api: { status: 'healthy', responseTime: 120, errorRate: 0.005, uptime: 0.995 },
          ml: { status: 'healthy', responseTime: 850, errorRate: 0.002, uptime: 0.998 },
          cache: { status: 'healthy', responseTime: 5, errorRate: 0.0001, uptime: 0.9999 },
        },
        lastChecked: new Date().toISOString(),
      },
    };
  }

  private async getConversionProbabilities(): Promise<any> {
    // Mock implementation
    return {
      distribution: Array.from({ length: 10 }, (_, i) => ({
        range: `${i * 10}-${(i + 1) * 10}`,
        count: Math.floor(Math.random() * 100) + 10,
        percentage: Math.random() * 20,
      })),
    };
  }

  private async getPredictiveTimelines(): Promise<any> {
    // Mock implementation
    return {
      timelines: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        predictedConversions: Math.floor(Math.random() * 20) + 5,
        confidence: Math.random() * 0.3 + 0.7,
      })),
    };
  }

  private async getBehavioralAnalysis(): Promise<any> {
    // Mock implementation
    return {
      patterns: [
        { type: 'high_engagement', frequency: 0.25, trend: 'increasing', significance: 0.8 },
        { type: 'quick_response', frequency: 0.15, trend: 'stable', significance: 0.6 },
        { type: 'property_research', frequency: 0.35, trend: 'increasing', significance: 0.9 },
      ],
    };
  }

  private async getRecommendations(): Promise<any> {
    // Mock implementation
    return {
      recommendations: Array.from({ length: 10 }, (_, i) => ({
        id: `rec_${i}`,
        type: 'follow_up',
        title: `Recommendation ${i + 1}`,
        priority: Math.random() > 0.7 ? 'high' : 'medium',
        expectedImpact: Math.random() * 0.5 + 0.1,
      })),
    };
  }

  private async getModelPerformanceData(): Promise<any> {
    // Mock implementation
    return {
      accuracy: 0.82,
      precision: 0.78,
      recall: 0.85,
      f1Score: 0.81,
      driftDetected: false,
      lastRetrained: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      nextRetraining: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  private setLoadingState(
    componentId: string,
    loading: boolean,
    message?: string,
    error?: string,
    progress?: number
  ): void {
    const loadingState: LoadingState = {
      loading,
      message,
      progress,
    };

    if (error) {
      // Handle error state
      console.error(`Component ${componentId} error:`, error);
    }

    this.loadingStates.set(componentId, loadingState);

    // Notify listeners
    this.notifyComponents('loading_state_changed', {
      componentId,
      loadingState,
    });
  }

  private notifyComponents(eventType: string, data: any): void {
    const event: DashboardWebSocketEvent = {
      type: eventType as any,
      data,
      timestamp: new Date().toISOString(),
    };

    this.handleWebSocketEvent(event);
  }

  private async refreshFilteredComponents(): Promise<void> {
    // Refresh components that are affected by filter changes
    const componentsToRefresh = ['lead-insights', 'predictive-analytics', 'dashboard-metrics'];

    await Promise.all(
      componentsToRefresh.map(componentId => this.refreshComponent(componentId))
    );
  }

  private async refreshLeadInsights(): Promise<void> {
    const insights = await this.getLeadInsights();
    this.updateComponentData('lead-insights', insights);
  }

  private async refreshPredictiveAnalytics(): Promise<void> {
    const leadIds = Array.from(this.leadInsightsCache.keys());
    if (leadIds.length > 0) {
      const predictions = await this.getPredictiveAnalytics(leadIds);
      this.updateComponentData('predictive-analytics', predictions);
    }
  }

  private async refreshDashboardMetrics(): Promise<void> {
    const metrics = await this.getDashboardMetrics();
    this.updateComponentData('dashboard-metrics', metrics);
  }

  private updateComponentData(componentId: string, data: any): void {
    const componentData: ComponentData = {
      loading: false,
      lastUpdated: new Date().toISOString(),
      data,
      metadata: {
        totalRecords: Array.isArray(data) ? data.length : 1,
        dataRange: {
          start: this.activeFilters.dateRange.start,
          end: this.activeFilters.dateRange.end,
        },
      },
    };

    this.componentData.set(componentId, componentData);
  }

  private isCacheValid(cacheKey: string, maxAgeSeconds: number): boolean {
    // Simple cache validation - in real system, use timestamps
    return Math.random() > 0.3; // 70% cache hit rate for demo
  }

  private async gatherExportData(componentIds: string[]): Promise<any> {
    const exportData: any = {};

    for (const componentId of componentIds) {
      const componentData = this.componentData.get(componentId);
      if (componentData) {
        exportData[componentId] = componentData.data;
      }
    }

    return exportData;
  }

  private async generateExport(
    data: any,
    format: 'pdf' | 'csv' | 'excel',
    options?: any
  ): Promise<string> {
    // Mock implementation - in real system, generate actual export
    console.log(`Generating ${format} export with data:`, data);
    return `https://example.com/exports/dashboard_${Date.now()}.${format}`;
  }

  // Cleanup method
  public destroy(): void {
    // Clear all intervals
    this.refreshIntervals.forEach(interval => clearInterval(interval));
    this.refreshIntervals.clear();

    // Close WebSocket connection
    if (this.webSocketConnection) {
      this.webSocketConnection.close();
      this.webSocketConnection = null;
    }

    // Clear caches
    this.leadInsightsCache.clear();
    this.predictiveCache.clear();
    this.componentData.clear();
    this.loadingStates.clear();
    this.alertsCache = [];

    // Clear event listeners
    this.eventListeners.clear();
  }
}

export const dashboardService = DashboardService.getInstance();