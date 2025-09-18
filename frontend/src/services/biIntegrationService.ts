export interface BIDashboard {
  id: string;
  name: string;
  description: string;
  type: 'power_bi' | 'tableau' | 'looker' | 'google_data_studio' | 'custom';
  config: {
    endpoint: string;
    apiKey?: string;
    username?: string;
    password?: string;
    database?: string;
    refreshInterval: number; // minutes
  };
  mappings: {
    templateMetrics: Record<string, string>; // template field -> BI field mapping
    conversionMetrics: Record<string, string>;
    attributionMetrics: Record<string, string>;
  };
  isActive: boolean;
  lastSync?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BISyncResult {
  dashboardId: string;
  syncId: string;
  status: 'success' | 'partial' | 'failed';
  recordsProcessed: number;
  errors: string[];
  duration: number;
  syncedAt: string;
}

export interface BIMetricExport {
  timeframe: {
    start: string;
    end: string;
  };
  metrics: {
    templates: Array<{
      templateId: string;
      name: string;
      category: string;
      channel: string;
      sent: number;
      delivered: number;
      opened: number;
      clicked: number;
      responded: number;
      converted: number;
      openRate: number;
      clickRate: number;
      responseRate: number;
      conversionRate: number;
      bounceRate: number;
      unsubscribeRate: number;
    }>;
    conversions: Array<{
      id: string;
      leadId: number;
      type: 'sale' | 'appointment' | 'inquiry' | 'engagement';
      value: number;
      timestamp: string;
      attributedValue: number;
      attributionRate: number;
    }>;
    attribution: Array<{
      templateId: string;
      totalAttributedValue: number;
      conversionCount: number;
      attributionRate: number;
      channel: string;
    }>;
    abTests: Array<{
      testId: string;
      name: string;
      status: string;
      variants: Array<{
        variantId: string;
        name: string;
        sent: number;
        conversions: number;
        conversionRate: number;
        winner: boolean;
      }>;
      winner?: string;
      improvement: number;
      confidence: number;
    }>;
  };
  metadata: {
    exportedAt: string;
    version: string;
    totalRecords: number;
    dataQuality: {
      completeness: number;
      accuracy: number;
      timeliness: number;
    };
  };
}

export interface BIQuery {
  id: string;
  name: string;
  description: string;
  type: 'metric' | 'trend' | 'comparison' | 'segmentation' | 'prediction';
  parameters: Record<string, any>;
  sql?: string; // For SQL-based BI tools
  filters: {
    dateRange?: { start: string; end: string };
    templates?: string[];
    channels?: string[];
    categories?: string[];
    minPerformance?: number;
  };
  resultFormat: 'table' | 'chart' | 'json' | 'csv';
}

class BIIntegrationService {
  private static instance: BIIntegrationService;
  private dashboards: Map<string, BIDashboard> = new Map();
  private syncHistory: Map<string, BISyncResult[]> = new Map();

  private constructor() {}

  public static getInstance(): BIIntegrationService {
    if (!BIIntegrationService.instance) {
      BIIntegrationService.instance = new BIIntegrationService();
    }
    return BIIntegrationService.instance;
  }

  /**
   * Register a new BI dashboard
   */
  public registerDashboard(dashboard: Omit<BIDashboard, 'id' | 'createdAt' | 'updatedAt'>): BIDashboard {
    const id = `bi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newDashboard: BIDashboard = {
      ...dashboard,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.dashboards.set(id, newDashboard);
    return newDashboard;
  }

  /**
   * Update BI dashboard configuration
   */
  public updateDashboard(id: string, updates: Partial<BIDashboard>): boolean {
    const dashboard = this.dashboards.get(id);
    if (!dashboard) return false;

    this.dashboards.set(id, {
      ...dashboard,
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    return true;
  }

  /**
   * Remove BI dashboard
   */
  public removeDashboard(id: string): boolean {
    return this.dashboards.delete(id);
  }

  /**
   * Get all registered dashboards
   */
  public getDashboards(): BIDashboard[] {
    return Array.from(this.dashboards.values());
  }

  /**
   * Get dashboard by ID
   */
  public getDashboard(id: string): BIDashboard | undefined {
    return this.dashboards.get(id);
  }

  /**
   * Export metrics for BI consumption
   */
  public async exportMetricsForBI(
    dashboardId: string,
    timeframe: { start: string; end: string }
  ): Promise<BIMetricExport> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`BI dashboard ${dashboardId} not found`);
    }

    // This would integrate with actual data sources
    // For now, return mock data structure
    const metrics: BIMetricExport['metrics'] = {
      templates: [
        {
          templateId: 'welcome_email',
          name: 'Welcome Email',
          category: 'initial_contact',
          channel: 'email',
          sent: 5000,
          delivered: 4750,
          opened: 1900,
          clicked: 380,
          responded: 133,
          converted: 40,
          openRate: 0.38,
          clickRate: 0.08,
          responseRate: 0.03,
          conversionRate: 0.008,
          bounceRate: 0.05,
          unsubscribeRate: 0.002,
        },
        // Add more template metrics...
      ],
      conversions: [
        {
          id: 'conv_001',
          leadId: 12345,
          type: 'sale',
          value: 250000,
          timestamp: '2025-01-15T10:30:00Z',
          attributedValue: 75000,
          attributionRate: 0.3,
        },
        // Add more conversion metrics...
      ],
      attribution: [
        {
          templateId: 'welcome_email',
          totalAttributedValue: 150000,
          conversionCount: 45,
          attributionRate: 0.25,
          channel: 'email',
        },
        // Add more attribution metrics...
      ],
      abTests: [
        {
          testId: 'ab_test_001',
          name: 'Subject Line Test',
          status: 'completed',
          variants: [
            {
              variantId: 'control',
              name: 'Original Subject',
              sent: 2500,
              conversions: 18,
              conversionRate: 0.0072,
              winner: false,
            },
            {
              variantId: 'variant_a',
              name: 'New Subject',
              sent: 2500,
              conversions: 25,
              conversionRate: 0.01,
              winner: true,
            },
          ],
          winner: 'variant_a',
          improvement: 39,
          confidence: 0.95,
        },
        // Add more A/B test metrics...
      ],
    };

    const metadata: BIMetricExport['metadata'] = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      totalRecords: this.calculateTotalRecords(metrics),
      dataQuality: {
        completeness: 0.95,
        accuracy: 0.98,
        timeliness: 0.92,
      },
    };

    return {
      timeframe,
      metrics,
      metadata,
    };
  }

  /**
   * Sync data to BI dashboard
   */
  public async syncToDashboard(
    dashboardId: string,
    data: BIMetricExport
  ): Promise<BISyncResult> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`BI dashboard ${dashboardId} not found`);
    }

    const syncId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      // This would implement actual BI tool integration
      const result = await this.performSync(dashboard, data);

      const syncResult: BISyncResult = {
        dashboardId,
        syncId,
        status: result.success ? 'success' : 'partial',
        recordsProcessed: result.recordsProcessed,
        errors: result.errors,
        duration: Date.now() - startTime,
        syncedAt: new Date().toISOString(),
      };

      // Update dashboard last sync
      dashboard.lastSync = syncResult.syncedAt;
      this.dashboards.set(dashboardId, dashboard);

      // Store sync history
      const history = this.syncHistory.get(dashboardId) || [];
      history.push(syncResult);
      this.syncHistory.set(dashboardId, history);

      return syncResult;

    } catch (error) {
      const syncResult: BISyncResult = {
        dashboardId,
        syncId,
        status: 'failed',
        recordsProcessed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown sync error'],
        duration: Date.now() - startTime,
        syncedAt: new Date().toISOString(),
      };

      // Store failed sync
      const history = this.syncHistory.get(dashboardId) || [];
      history.push(syncResult);
      this.syncHistory.set(dashboardId, history);

      return syncResult;
    }
  }

  /**
   * Execute BI query
   */
  public async executeQuery(
    dashboardId: string,
    query: BIQuery
  ): Promise<any> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`BI dashboard ${dashboardId} not found`);
    }

    // This would execute actual BI queries
    // For now, return mock results based on query type
    switch (query.type) {
      case 'metric':
        return this.executeMetricQuery(query);
      case 'trend':
        return this.executeTrendQuery(query);
      case 'comparison':
        return this.executeComparisonQuery(query);
      case 'segmentation':
        return this.executeSegmentationQuery(query);
      case 'prediction':
        return this.executePredictionQuery(query);
      default:
        throw new Error(`Unsupported query type: ${query.type}`);
    }
  }

  /**
   * Create custom BI query
   */
  public createQuery(
    dashboardId: string,
    query: Omit<BIQuery, 'id'>
  ): BIQuery {
    const id = `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      ...query,
      id,
    };
  }

  /**
   * Get sync history for dashboard
   */
  public getSyncHistory(dashboardId: string, limit: number = 10): BISyncResult[] {
    const history = this.syncHistory.get(dashboardId) || [];
    return history
      .sort((a, b) => new Date(b.syncedAt).getTime() - new Date(a.syncedAt).getTime())
      .slice(0, limit);
  }

  /**
   * Validate BI dashboard configuration
   */
  public async validateDashboard(dashboardId: string): Promise<{
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      return {
        isValid: false,
        issues: ['Dashboard not found'],
        recommendations: [],
      };
    }

    const issues: string[] = [];
    const recommendations: string[] = [];

    // Validate configuration
    if (!dashboard.config.endpoint) {
      issues.push('Dashboard endpoint is not configured');
    }

    if (dashboard.type === 'power_bi' && !dashboard.config.apiKey) {
      issues.push('Power BI requires API key configuration');
    }

    if (dashboard.config.refreshInterval < 15) {
      issues.push('Refresh interval is too frequent (< 15 minutes)');
      recommendations.push('Consider increasing refresh interval to reduce API load');
    }

    // Validate mappings
    if (!dashboard.mappings.templateMetrics || Object.keys(dashboard.mappings.templateMetrics).length === 0) {
      issues.push('Template metrics mapping is not configured');
      recommendations.push('Configure template metrics mapping for proper data sync');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * Get BI integration statistics
   */
  public getStatistics(): {
    totalDashboards: number;
    activeDashboards: number;
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    averageSyncDuration: number;
  } {
    const totalDashboards = this.dashboards.size;
    const activeDashboards = Array.from(this.dashboards.values()).filter(d => d.isActive).length;

    let totalSyncs = 0;
    let successfulSyncs = 0;
    let failedSyncs = 0;
    let totalDuration = 0;

    for (const history of this.syncHistory.values()) {
      for (const sync of history) {
        totalSyncs++;
        if (sync.status === 'success') successfulSyncs++;
        if (sync.status === 'failed') failedSyncs++;
        totalDuration += sync.duration;
      }
    }

    return {
      totalDashboards,
      activeDashboards,
      totalSyncs,
      successfulSyncs,
      failedSyncs,
      averageSyncDuration: totalSyncs > 0 ? totalDuration / totalSyncs : 0,
    };
  }

  /**
   * Private helper methods
   */
  private calculateTotalRecords(metrics: BIMetricExport['metrics']): number {
    return (
      metrics.templates.length +
      metrics.conversions.length +
      metrics.attribution.length +
      metrics.abTests.reduce((sum, test) => sum + test.variants.length, 0)
    );
  }

  private async performSync(
    dashboard: BIDashboard,
    data: BIMetricExport
  ): Promise<{ success: boolean; recordsProcessed: number; errors: string[] }> {
    // This would implement actual BI tool API calls
    // For now, simulate sync process
    const errors: string[] = [];

    // Simulate some potential errors
    if (Math.random() < 0.1) {
      errors.push('API rate limit exceeded');
    }

    if (Math.random() < 0.05) {
      errors.push('Authentication token expired');
    }

    return {
      success: errors.length === 0,
      recordsProcessed: data.metadata.totalRecords,
      errors,
    };
  }

  private executeMetricQuery(query: BIQuery): any {
    // Mock metric query result
    return {
      queryId: query.id,
      type: 'metric',
      data: {
        totalSent: 50000,
        totalConversions: 400,
        averageConversionRate: 0.008,
        topTemplate: 'welcome_email',
      },
      executedAt: new Date().toISOString(),
    };
  }

  private executeTrendQuery(query: BIQuery): any {
    // Mock trend query result
    return {
      queryId: query.id,
      type: 'trend',
      data: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [
          {
            label: 'Conversion Rate',
            data: [0.005, 0.007, 0.008, 0.009],
          },
          {
            label: 'Open Rate',
            data: [0.25, 0.28, 0.30, 0.32],
          },
        ],
      },
      executedAt: new Date().toISOString(),
    };
  }

  private executeComparisonQuery(query: BIQuery): any {
    // Mock comparison query result
    return {
      queryId: query.id,
      type: 'comparison',
      data: {
        templates: [
          { name: 'Welcome Email', conversionRate: 0.008, sent: 10000 },
          { name: 'Follow-up', conversionRate: 0.012, sent: 8000 },
          { name: 'Proposal', conversionRate: 0.015, sent: 5000 },
        ],
      },
      executedAt: new Date().toISOString(),
    };
  }

  private executeSegmentationQuery(query: BIQuery): any {
    // Mock segmentation query result
    return {
      queryId: query.id,
      type: 'segmentation',
      data: {
        segments: [
          { name: 'New Leads', conversionRate: 0.005, count: 15000 },
          { name: 'Existing Customers', conversionRate: 0.012, count: 12000 },
          { name: 'High Value', conversionRate: 0.018, count: 8000 },
        ],
      },
      executedAt: new Date().toISOString(),
    };
  }

  private executePredictionQuery(query: BIQuery): any {
    // Mock prediction query result
    return {
      queryId: query.id,
      type: 'prediction',
      data: {
        predictions: [
          {
            metric: 'conversionRate',
            currentValue: 0.008,
            predictedValue: 0.010,
            confidence: 0.75,
            timeframe: '30 days',
          },
        ],
      },
      executedAt: new Date().toISOString(),
    };
  }
}

export const biIntegrationService = BIIntegrationService.getInstance();