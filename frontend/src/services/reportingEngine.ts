import { AnalyticsTimeframe, AnalyticsDashboard, TemplatePerformanceMetrics } from './templateAnalyticsService';

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'executive' | 'operational' | 'technical' | 'custom';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'ad_hoc';
  sections: ReportSection[];
  recipients: string[];
  format: 'html' | 'pdf' | 'csv' | 'json';
  schedule?: {
    timezone: string;
    time: string; // HH:MM format
    daysOfWeek?: number[]; // 0-6, Sunday = 0
    daysOfMonth?: number[]; // 1-31
  };
  filters?: {
    templateIds?: string[];
    categories?: string[];
    channels?: string[];
    minPerformance?: number;
  };
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'summary' | 'metrics' | 'charts' | 'insights' | 'recommendations' | 'alerts';
  dataSource: 'dashboard' | 'analytics' | 'attribution' | 'custom';
  config: {
    metrics?: string[];
    chartType?: 'line' | 'bar' | 'pie' | 'table';
    limit?: number;
    sortBy?: string;
    filters?: Record<string, any>;
  };
  layout: {
    width: number; // percentage
    height?: number;
    position: 'left' | 'right' | 'center' | 'full';
  };
}

export interface GeneratedReport {
  id: string;
  templateId: string;
  title: string;
  generatedAt: string;
  timeframe: AnalyticsTimeframe;
  content: {
    html?: string;
    pdf?: Buffer;
    csv?: string;
    json?: any;
  };
  metadata: {
    totalTemplates: number;
    totalSent: number;
    averageConversionRate: number;
    keyInsights: string[];
    alertsTriggered: number;
  };
  sections: ReportSectionData[];
}

export interface ReportSectionData {
  sectionId: string;
  title: string;
  type: string;
  data: any;
  html?: string;
  chartData?: any;
}

export interface ReportSchedule {
  id: string;
  templateId: string;
  nextRun: string;
  isActive: boolean;
  lastRun?: string;
  lastStatus?: 'success' | 'failed' | 'running';
  errorMessage?: string;
}

class ReportingEngine {
  private static instance: ReportingEngine;
  private reportTemplates: Map<string, ReportTemplate> = new Map();
  private schedules: Map<string, ReportSchedule> = new Map();
  private generatedReports: Map<string, GeneratedReport> = new Map();

  private constructor() {
    this.initializeDefaultTemplates();
    this.startScheduler();
  }

  public static getInstance(): ReportingEngine {
    if (!ReportingEngine.instance) {
      ReportingEngine.instance = new ReportingEngine();
    }
    return ReportingEngine.instance;
  }

  /**
   * Initialize default report templates
   */
  private initializeDefaultTemplates(): void {
    const templates: ReportTemplate[] = [
      {
        id: 'executive_summary',
        name: 'Executive Summary',
        description: 'High-level overview of template performance for executives',
        type: 'executive',
        frequency: 'weekly',
        format: 'html',
        recipients: [],
        sections: [
          {
            id: 'overview',
            title: 'Performance Overview',
            type: 'summary',
            dataSource: 'dashboard',
            config: {
              metrics: ['totalSent', 'averageConversionRate', 'periodGrowth', 'topPerformingTemplate'],
            },
            layout: { width: 100, position: 'full' },
          },
          {
            id: 'key_metrics',
            title: 'Key Metrics',
            type: 'metrics',
            dataSource: 'dashboard',
            config: {
              metrics: ['totalTemplates', 'activeTemplates', 'totalSent', 'averageConversionRate'],
            },
            layout: { width: 50, position: 'left' },
          },
          {
            id: 'revenue_attribution',
            title: 'Revenue Attribution',
            type: 'metrics',
            dataSource: 'attribution',
            config: {
              metrics: ['totalRevenue', 'attributedRevenue', 'attributionRate'],
            },
            layout: { width: 50, position: 'right' },
          },
          {
            id: 'insights',
            title: 'Key Insights',
            type: 'insights',
            dataSource: 'dashboard',
            config: { limit: 5 },
            layout: { width: 100, position: 'full' },
          },
        ],
        schedule: {
          timezone: 'America/New_York',
          time: '09:00',
          daysOfWeek: [1], // Monday
        },
      },
      {
        id: 'operational_report',
        name: 'Operational Report',
        description: 'Detailed operational metrics for marketing teams',
        type: 'operational',
        frequency: 'daily',
        format: 'html',
        recipients: [],
        sections: [
          {
            id: 'performance_chart',
            title: 'Performance Trends',
            type: 'charts',
            dataSource: 'analytics',
            config: {
              chartType: 'line',
              metrics: ['conversionRate', 'openRate', 'clickRate'],
            },
            layout: { width: 100, position: 'full' },
          },
          {
            id: 'template_performance',
            title: 'Template Performance',
            type: 'metrics',
            dataSource: 'analytics',
            config: {
              sortBy: 'conversionRate',
              limit: 10,
            },
            layout: { width: 50, position: 'left' },
          },
          {
            id: 'alerts',
            title: 'Active Alerts',
            type: 'alerts',
            dataSource: 'dashboard',
            config: {},
            layout: { width: 50, position: 'right' },
          },
        ],
        schedule: {
          timezone: 'America/New_York',
          time: '08:00',
          daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
        },
      },
      {
        id: 'technical_report',
        name: 'Technical Performance Report',
        description: 'Technical metrics and system performance',
        type: 'technical',
        frequency: 'weekly',
        format: 'json',
        recipients: [],
        sections: [
          {
            id: 'system_metrics',
            title: 'System Performance',
            type: 'metrics',
            dataSource: 'custom',
            config: {
              metrics: ['responseTime', 'errorRate', 'throughput'],
            },
            layout: { width: 100, position: 'full' },
          },
          {
            id: 'template_analytics',
            title: 'Template Analytics',
            type: 'metrics',
            dataSource: 'analytics',
            config: {
              metrics: ['bounceRate', 'unsubscribeRate', 'deliveryRate'],
            },
            layout: { width: 100, position: 'full' },
          },
        ],
        schedule: {
          timezone: 'UTC',
          time: '02:00',
          daysOfWeek: [1], // Monday
        },
      },
    ];

    templates.forEach(template => {
      this.reportTemplates.set(template.id, template);
    });
  }

  /**
   * Create a new report template
   */
  public createTemplate(template: Omit<ReportTemplate, 'id'>): ReportTemplate {
    const id = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newTemplate: ReportTemplate = { ...template, id };

    this.reportTemplates.set(id, newTemplate);
    return newTemplate;
  }

  /**
   * Generate a report from template
   */
  public async generateReport(
    templateId: string,
    timeframe: AnalyticsTimeframe,
    dashboard: AnalyticsDashboard
  ): Promise<GeneratedReport> {
    const template = this.reportTemplates.get(templateId);
    if (!template) {
      throw new Error(`Report template ${templateId} not found`);
    }

    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sections: ReportSectionData[] = [];

    // Generate each section
    for (const section of template.sections) {
      const sectionData = await this.generateSectionData(section, dashboard, timeframe);
      sections.push(sectionData);
    }

    // Generate content based on format
    const content = await this.generateReportContent(template, sections, dashboard, timeframe);

    // Calculate metadata
    const metadata = this.calculateReportMetadata(dashboard, sections);

    const report: GeneratedReport = {
      id: reportId,
      templateId,
      title: `${template.name} - ${this.formatTimeframe(timeframe)}`,
      generatedAt: new Date().toISOString(),
      timeframe,
      content,
      metadata,
      sections,
    };

    // Store generated report
    this.generatedReports.set(reportId, report);

    return report;
  }

  /**
   * Schedule a report
   */
  public scheduleReport(templateId: string): ReportSchedule {
    const template = this.reportTemplates.get(templateId);
    if (!template || !template.schedule) {
      throw new Error(`Template ${templateId} does not have scheduling configured`);
    }

    const scheduleId = `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const nextRun = this.calculateNextRun(template.schedule);

    const schedule: ReportSchedule = {
      id: scheduleId,
      templateId,
      nextRun,
      isActive: true,
    };

    this.schedules.set(scheduleId, schedule);
    return schedule;
  }

  /**
   * Get all report templates
   */
  public getTemplates(type?: ReportTemplate['type']): ReportTemplate[] {
    const templates = Array.from(this.reportTemplates.values());
    return type ? templates.filter(t => t.type === type) : templates;
  }

  /**
   * Get report template by ID
   */
  public getTemplate(id: string): ReportTemplate | undefined {
    return this.reportTemplates.get(id);
  }

  /**
   * Update report template
   */
  public updateTemplate(id: string, updates: Partial<ReportTemplate>): boolean {
    const template = this.reportTemplates.get(id);
    if (!template) return false;

    this.reportTemplates.set(id, { ...template, ...updates });
    return true;
  }

  /**
   * Delete report template
   */
  public deleteTemplate(id: string): boolean {
    return this.reportTemplates.delete(id);
  }

  /**
   * Get generated reports
   */
  public getReports(limit: number = 50): GeneratedReport[] {
    return Array.from(this.generatedReports.values())
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
      .slice(0, limit);
  }

  /**
   * Get report by ID
   */
  public getReport(id: string): GeneratedReport | undefined {
    return this.generatedReports.get(id);
  }

  /**
   * Generate section data
   */
  private async generateSectionData(
    section: ReportSection,
    dashboard: AnalyticsDashboard,
    timeframe: AnalyticsTimeframe
  ): Promise<ReportSectionData> {
    let data: any = {};

    switch (section.dataSource) {
      case 'dashboard':
        data = this.extractDashboardData(section, dashboard);
        break;
      case 'analytics':
        data = await this.extractAnalyticsData(section, dashboard);
        break;
      case 'attribution':
        data = this.extractAttributionData(section, dashboard);
        break;
      case 'custom':
        data = await this.extractCustomData(section);
        break;
    }

    const sectionData: ReportSectionData = {
      sectionId: section.id,
      title: section.title,
      type: section.type,
      data,
    };

    // Generate HTML for the section if needed
    if (section.type === 'charts') {
      sectionData.chartData = this.generateChartData(section, data);
    }

    sectionData.html = this.generateSectionHtml(section, data);

    return sectionData;
  }

  /**
   * Extract data from dashboard
   */
  private extractDashboardData(section: ReportSection, dashboard: AnalyticsDashboard): any {
    const { metrics } = section.config;

    if (!metrics) return dashboard.overview;

    const data: any = {};
    metrics.forEach(metric => {
      if (metric in dashboard.overview) {
        data[metric] = (dashboard.overview as any)[metric];
      }
    });

    return data;
  }

  /**
   * Extract analytics data
   */
  private async extractAnalyticsData(section: ReportSection, dashboard: AnalyticsDashboard): Promise<any> {
    const { sortBy, limit = 10 } = section.config;

    let data = dashboard.performance.topTemplates;

    if (sortBy) {
      data = [...data].sort((a, b) => {
        const aVal = this.getNestedValue(a, sortBy);
        const bVal = this.getNestedValue(b, sortBy);
        return bVal - aVal; // Descending
      });
    }

    return data.slice(0, limit);
  }

  /**
   * Extract attribution data
   */
  private extractAttributionData(section: ReportSection, dashboard: AnalyticsDashboard): any {
    return dashboard.attribution;
  }

  /**
   * Extract custom data
   */
  private async extractCustomData(section: ReportSection): Promise<any> {
    // This would integrate with custom data sources
    const { metrics } = section.config;

    const data: any = {};
    if (metrics) {
      metrics.forEach(metric => {
        // Mock data - would be replaced with actual data fetching
        data[metric] = Math.random() * 100;
      });
    }

    return data;
  }

  /**
   * Generate chart data
   */
  private generateChartData(section: ReportSection, data: any): any {
    const { chartType } = section.config;

    switch (chartType) {
      case 'line':
        return this.generateLineChartData(data);
      case 'bar':
        return this.generateBarChartData(data);
      case 'pie':
        return this.generatePieChartData(data);
      case 'table':
        return this.generateTableData(data);
      default:
        return data;
    }
  }

  /**
   * Generate line chart data
   */
  private generateLineChartData(data: any): any {
    // Mock trend data
    const labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    const datasets = [
      {
        label: 'Conversion Rate',
        data: labels.map(() => Math.random() * 10 + 5),
        borderColor: '#007bff',
        backgroundColor: 'rgba(0, 123, 255, 0.1)',
      },
      {
        label: 'Open Rate',
        data: labels.map(() => Math.random() * 30 + 20),
        borderColor: '#28a745',
        backgroundColor: 'rgba(40, 167, 69, 0.1)',
      },
    ];

    return { labels, datasets };
  }

  /**
   * Generate bar chart data
   */
  private generateBarChartData(data: any): any {
    const labels = data.map((item: any) => item.templateId || item.segment || item.stage);
    const values = data.map((item: any) => item.conversionRate || item.performance || item.count);

    return {
      labels,
      datasets: [{
        label: 'Value',
        data: values,
        backgroundColor: '#007bff',
      }],
    };
  }

  /**
   * Generate pie chart data
   */
  private generatePieChartData(data: any): any {
    const labels = data.map((item: any) => item.segment || item.category);
    const values = data.map((item: any) => item.performance || item.value);

    return {
      labels,
      datasets: [{
        data: values,
        backgroundColor: [
          '#007bff', '#28a745', '#ffc107', '#dc3545', '#6c757d',
          '#17a2b8', '#e83e8c', '#fd7e14', '#20c997', '#6f42c1'
        ],
      }],
    };
  }

  /**
   * Generate table data
   */
  private generateTableData(data: any): any {
    return {
      headers: Object.keys(data[0] || {}),
      rows: data.map((item: any) => Object.values(item)),
    };
  }

  /**
   * Generate section HTML
   */
  private generateSectionHtml(section: ReportSection, data: any): string {
    let html = `<div class="report-section">
      <h3>${section.title}</h3>`;

    switch (section.type) {
      case 'summary':
        html += this.generateSummaryHtml(data);
        break;
      case 'metrics':
        html += this.generateMetricsHtml(data);
        break;
      case 'charts':
        html += '<div class="chart-placeholder">Chart would be rendered here</div>';
        break;
      case 'insights':
        html += this.generateInsightsHtml(data);
        break;
      case 'recommendations':
        html += this.generateRecommendationsHtml(data);
        break;
      case 'alerts':
        html += this.generateAlertsHtml(data);
        break;
    }

    html += '</div>';
    return html;
  }

  /**
   * Generate summary HTML
   */
  private generateSummaryHtml(data: any): string {
    let html = '<div class="summary-content">';

    Object.entries(data).forEach(([key, value]) => {
      const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      const formattedValue = typeof value === 'number' && value < 1 ?
        `${(value * 100).toFixed(2)}%` : value;

      html += `<div class="summary-item">
        <span class="label">${formattedKey}:</span>
        <span class="value">${formattedValue}</span>
      </div>`;
    });

    html += '</div>';
    return html;
  }

  /**
   * Generate metrics HTML
   */
  private generateMetricsHtml(data: any): string {
    let html = '<table class="metrics-table"><thead><tr>';

    if (Array.isArray(data) && data.length > 0) {
      // Table format for array data
      const headers = Object.keys(data[0]);
      headers.forEach(header => {
        html += `<th>${header}</th>`;
      });
      html += '</tr></thead><tbody>';

      data.forEach((row: any) => {
        html += '<tr>';
        headers.forEach(header => {
          html += `<td>${row[header]}</td>`;
        });
        html += '</tr>';
      });
    } else {
      // Key-value format for object data
      html = '<div class="metrics-content">';
      Object.entries(data).forEach(([key, value]) => {
        const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        html += `<div class="metric-item">
          <span class="metric-label">${formattedKey}</span>
          <span class="metric-value">${value}</span>
        </div>`;
      });
      html += '</div>';
      return html;
    }

    html += '</tbody></table>';
    return html;
  }

  /**
   * Generate insights HTML
   */
  private generateInsightsHtml(data: any): string {
    if (!Array.isArray(data)) return '<p>No insights available</p>';

    let html = '<ul class="insights-list">';
    data.forEach((insight: string) => {
      html += `<li>${insight}</li>`;
    });
    html += '</ul>';

    return html;
  }

  /**
   * Generate recommendations HTML
   */
  private generateRecommendationsHtml(data: any): string {
    if (!Array.isArray(data)) return '<p>No recommendations available</p>';

    let html = '<ul class="recommendations-list">';
    data.forEach((recommendation: string) => {
      html += `<li>${recommendation}</li>`;
    });
    html += '</ul>';

    return html;
  }

  /**
   * Generate alerts HTML
   */
  private generateAlertsHtml(data: any): string {
    if (!Array.isArray(data)) return '<p>No alerts</p>';

    let html = '<div class="alerts-container">';
    data.forEach((alert: any) => {
      const severityClass = alert.severity || 'medium';
      html += `<div class="alert alert-${severityClass}">
        <strong>${alert.type.toUpperCase()}:</strong> ${alert.message}
        <br><small>Action Required: ${alert.actionRequired}</small>
      </div>`;
    });
    html += '</div>';

    return html;
  }

  /**
   * Generate report content
   */
  private async generateReportContent(
    template: ReportTemplate,
    sections: ReportSectionData[],
    dashboard: AnalyticsDashboard,
    timeframe: AnalyticsTimeframe
  ): Promise<GeneratedReport['content']> {
    const content: GeneratedReport['content'] = {};

    switch (template.format) {
      case 'html':
        content.html = this.generateHtmlReport(template, sections, dashboard, timeframe);
        break;
      case 'json':
        content.json = {
          template: template.name,
          generatedAt: new Date().toISOString(),
          timeframe,
          dashboard,
          sections: sections.map(s => ({ [s.sectionId]: s.data })),
        };
        break;
      case 'csv':
        content.csv = this.generateCsvReport(sections);
        break;
      // PDF generation would require additional library
    }

    return content;
  }

  /**
   * Generate HTML report
   */
  private generateHtmlReport(
    template: ReportTemplate,
    sections: ReportSectionData[],
    dashboard: AnalyticsDashboard,
    timeframe: AnalyticsTimeframe
  ): string {
    const title = `${template.name} - ${this.formatTimeframe(timeframe)}`;

    let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        ${this.getReportStyles()}
    </style>
</head>
<body>
    <div class="report-container">
        <header class="report-header">
            <h1>${title}</h1>
            <div class="report-meta">
                <span>Generated: ${new Date().toLocaleString()}</span>
                <span>Period: ${this.formatTimeframe(timeframe)}</span>
            </div>
        </header>

        <div class="report-content">
`;

    sections.forEach(section => {
      html += section.html;
    });

    html += `
        </div>

        <footer class="report-footer">
            <p>Report generated by Template Analytics System</p>
        </footer>
    </div>
</body>
</html>`;

    return html;
  }

  /**
   * Generate CSV report
   */
  private generateCsvReport(sections: ReportSectionData[]): string {
    let csv = 'Section,Type,Data\n';

    sections.forEach(section => {
      csv += `"${section.title}","${section.type}","${JSON.stringify(section.data).replace(/"/g, '""')}"\n`;
    });

    return csv;
  }

  /**
   * Get report styles
   */
  private getReportStyles(): string {
    return `
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .report-container { max-width: 1200px; margin: 0 auto; background: white; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        .report-header { background: #007bff; color: white; padding: 20px; text-align: center; }
        .report-meta { margin-top: 10px; font-size: 14px; }
        .report-content { padding: 20px; }
        .report-section { margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 20px; }
        .report-section h3 { color: #333; margin-bottom: 15px; }
        .summary-content { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .summary-item { background: #f8f9fa; padding: 10px; border-radius: 5px; }
        .label { font-weight: bold; color: #666; }
        .value { font-size: 18px; color: #007bff; }
        .metrics-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .metrics-table th, .metrics-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .metrics-table th { background-color: #f2f2f2; }
        .insights-list, .recommendations-list { padding-left: 20px; }
        .insights-list li, .recommendations-list li { margin-bottom: 8px; }
        .alert { padding: 10px; margin-bottom: 10px; border-radius: 5px; }
        .alert-high { background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
        .alert-medium { background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; }
        .alert-low { background-color: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; }
        .report-footer { background: #f8f9fa; padding: 15px; text-align: center; color: #666; font-size: 14px; }
        .chart-placeholder { background: #f8f9fa; border: 2px dashed #dee2e6; padding: 40px; text-align: center; color: #6c757d; }
    `;
  }

  /**
   * Calculate report metadata
   */
  private calculateReportMetadata(
    dashboard: AnalyticsDashboard,
    sections: ReportSectionData[]
  ): GeneratedReport['metadata'] {
    const alertsTriggered = sections
      .filter(s => s.type === 'alerts')
      .reduce((sum, s) => sum + (Array.isArray(s.data) ? s.data.length : 0), 0);

    return {
      totalTemplates: dashboard.overview.totalTemplates,
      totalSent: dashboard.overview.totalSent,
      averageConversionRate: dashboard.overview.averageConversionRate,
      keyInsights: sections
        .filter(s => s.type === 'insights')
        .flatMap(s => Array.isArray(s.data) ? s.data : [])
        .slice(0, 5),
      alertsTriggered,
    };
  }

  /**
   * Calculate next run time
   */
  private calculateNextRun(schedule: NonNullable<ReportTemplate['schedule']>): string {
    const now = new Date();
    const [hours, minutes] = schedule.time.split(':').map(Number);

    // For simplicity, calculate next occurrence
    // In production, this would use a proper cron library
    const nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);

    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    return nextRun.toISOString();
  }

  /**
   * Start scheduler
   */
  private startScheduler(): void {
    // Check for scheduled reports every minute
    setInterval(() => {
      this.processScheduledReports();
    }, 60 * 1000);
  }

  /**
   * Process scheduled reports
   */
  private async processScheduledReports(): Promise<void> {
    const now = new Date().toISOString();

    for (const schedule of this.schedules.values()) {
      if (!schedule.isActive) continue;
      if (schedule.nextRun > now) continue;

      try {
        // Generate report (would need dashboard data)
        console.log(`Generating scheduled report for template ${schedule.templateId}`);

        // Update schedule
        const template = this.reportTemplates.get(schedule.templateId);
        if (template?.schedule) {
          schedule.lastRun = now;
          schedule.lastStatus = 'success';
          schedule.nextRun = this.calculateNextRun(template.schedule);
        }
      } catch (error) {
        schedule.lastStatus = 'failed';
        schedule.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      }
    }
  }

  /**
   * Format timeframe for display
   */
  private formatTimeframe(timeframe: AnalyticsTimeframe): string {
    const start = new Date(timeframe.start).toLocaleDateString();
    const end = new Date(timeframe.end).toLocaleDateString();

    return `${start} - ${end}`;
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Get service statistics
   */
  public getStatistics(): {
    totalTemplates: number;
    totalSchedules: number;
    totalGeneratedReports: number;
    activeSchedules: number;
  } {
    return {
      totalTemplates: this.reportTemplates.size,
      totalSchedules: this.schedules.size,
      totalGeneratedReports: this.generatedReports.size,
      activeSchedules: Array.from(this.schedules.values()).filter(s => s.isActive).length,
    };
  }
}

export const reportingEngine = ReportingEngine.getInstance();