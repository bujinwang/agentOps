import { Lead } from '../types/dashboard';
import { ModelPerformance } from '../types/dashboard';

export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  includeCharts: boolean;
  dateRange: {
    start: Date;
    end: Date;
  };
  filters: {
    leadScoreMin?: number;
    leadScoreMax?: number;
    conversionProbabilityMin?: number;
    dealValueMin?: number;
    tags?: string[];
  };
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  sections: ReportSection[];
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string; // HH:MM format
    recipients: string[];
  };
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'summary' | 'leads' | 'performance' | 'alerts' | 'trends' | 'custom';
  dataSource: 'leads' | 'performance' | 'alerts' | 'combined';
  filters?: any;
  chartType?: 'line' | 'bar' | 'pie' | 'table';
  columns?: string[];
}

class ExportService {
  private static instance: ExportService;

  static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }
    return ExportService.instance;
  }

  // CSV Export
  async exportToCSV(data: any[], filename: string, columns?: string[]): Promise<void> {
    try {
      const csvContent = this.convertToCSV(data, columns);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      this.downloadBlob(blob, `${filename}.csv`);
    } catch (error) {
      console.error('CSV export failed:', error);
      throw new Error('Failed to export CSV file');
    }
  }

  // Excel Export (simplified - would use a library like xlsx in production)
  async exportToExcel(data: any[], filename: string): Promise<void> {
    try {
      // In a real implementation, you'd use a library like xlsx or exceljs
      // For now, we'll export as CSV with Excel-compatible formatting
      const csvContent = this.convertToCSV(data);
      const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel' });
      this.downloadBlob(blob, `${filename}.xlsx`);
    } catch (error) {
      console.error('Excel export failed:', error);
      throw new Error('Failed to export Excel file');
    }
  }

  // PDF Export (simplified - would use a library like jsPDF in production)
  async exportToPDF(
    data: any,
    template: ReportTemplate,
    filename: string,
    options: ExportOptions
  ): Promise<void> {
    try {
      // In a real implementation, you'd use jsPDF or similar
      // For now, we'll create a simple text-based PDF representation
      const pdfContent = this.generatePDFContent(data, template, options);
      const blob = new Blob([pdfContent], { type: 'application/pdf' });
      this.downloadBlob(blob, `${filename}.pdf`);
    } catch (error) {
      console.error('PDF export failed:', error);
      throw new Error('Failed to export PDF file');
    }
  }

  // Lead Data Export
  async exportLeads(leads: Lead[], options: ExportOptions): Promise<void> {
    const filteredLeads = this.filterLeads(leads, options.filters);

    const exportData = filteredLeads.map(lead => ({
      'Lead ID': lead.id,
      'Name': lead.name,
      'Email': lead.email,
      'Phone': lead.phone || '',
      'Lead Score': lead.score,
      'Conversion Probability': `${(lead.conversionProbability * 100).toFixed(1)}%`,
      'Estimated Value': `$${lead.estimatedValue.toLocaleString()}`,
      'Last Contact': lead.lastContact,
      'Status': lead.status,
      'Engagement Level': lead.engagementLevel,
    }));

    switch (options.format) {
      case 'csv':
        await this.exportToCSV(exportData, `leads-export-${Date.now()}`);
        break;
      case 'excel':
        await this.exportToExcel(exportData, `leads-export-${Date.now()}`);
        break;
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }
  }

  // Performance Data Export
  async exportPerformance(performance: ModelPerformance[], options: ExportOptions): Promise<void> {
    const exportData = performance.map(model => ({
      'Model ID': model.modelId,
      'Accuracy': model.accuracy.toFixed(4),
      'Precision': model.precision.toFixed(4),
      'Recall': model.recall.toFixed(4),
      'F1 Score': model.f1Score.toFixed(4),
      'AUC': model.auc?.toFixed(4) || 'N/A',
      'Drift Detected': model.driftDetected ? 'Yes' : 'No',
      'Drift Severity': model.driftSeverity,
      'Last Retrained': model.lastRetrained,
      'Next Retraining': model.nextRetraining,
      'A/B Tests Count': model.abTests.length,
    }));

    switch (options.format) {
      case 'csv':
        await this.exportToCSV(exportData, `performance-export-${Date.now()}`);
        break;
      case 'excel':
        await this.exportToExcel(exportData, `performance-export-${Date.now()}`);
        break;
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }
  }

  // Generate Report from Template
  async generateReport(
    template: ReportTemplate,
    leads: Lead[],
    performance: ModelPerformance[],
    options: ExportOptions
  ): Promise<void> {
    const reportData = {
      leads: this.filterLeads(leads, options.filters),
      performance,
      generatedAt: new Date().toISOString(),
      dateRange: options.dateRange,
    };

    switch (options.format) {
      case 'pdf':
        await this.exportToPDF(reportData, template, `report-${template.id}-${Date.now()}`, options);
        break;
      case 'csv':
        // For CSV reports, combine all sections into a single export
        const combinedData = this.combineReportData(template, reportData);
        await this.exportToCSV(combinedData, `report-${template.id}-${Date.now()}`);
        break;
      case 'excel':
        const combinedExcelData = this.combineReportData(template, reportData);
        await this.exportToExcel(combinedExcelData, `report-${template.id}-${Date.now()}`);
        break;
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }
  }

  // Scheduled Reports
  async scheduleReport(template: ReportTemplate, scheduleOptions: any): Promise<string> {
    // In a real implementation, this would integrate with a job scheduler
    const scheduleId = `schedule-${Date.now()}`;

    // Store schedule configuration (would typically go to a database)
    const schedule = {
      id: scheduleId,
      templateId: template.id,
      ...scheduleOptions,
      createdAt: new Date(),
      status: 'active',
    };

    console.log('Scheduled report:', schedule);
    return scheduleId;
  }

  // Private helper methods
  private convertToCSV(data: any[], columns?: string[]): string {
    if (data.length === 0) return '';

    const headers = columns || Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        }).join(',')
      )
    ];

    return csvRows.join('\n');
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private filterLeads(leads: Lead[], filters: ExportOptions['filters']): Lead[] {
    return leads.filter(lead => {
      if (filters.leadScoreMin && lead.score < filters.leadScoreMin) return false;
      if (filters.leadScoreMax && lead.score > filters.leadScoreMax) return false;
      if (filters.conversionProbabilityMin && lead.conversionProbability < filters.conversionProbabilityMin) return false;
      if (filters.dealValueMin && lead.estimatedValue < filters.dealValueMin) return false;
      // Note: tags filter removed as tags property doesn't exist on Lead interface
      return true;
    });
  }

  private generatePDFContent(data: any, template: ReportTemplate, options: ExportOptions): string {
    // Simplified PDF content generation
    let content = `Report: ${template.name}\n`;
    content += `Generated: ${new Date().toLocaleString()}\n\n`;

    template.sections.forEach(section => {
      content += `${section.title}\n`;
      content += '='.repeat(section.title.length) + '\n\n';

      switch (section.dataSource) {
        case 'leads':
          if (data.leads) {
            content += `Total Leads: ${data.leads.length}\n`;
            content += `Average Score: ${data.leads.reduce((sum: number, lead: Lead) => sum + lead.score, 0) / data.leads.length}\n\n`;
          }
          break;
        case 'performance':
          if (data.performance) {
            content += `Models Monitored: ${data.performance.length}\n`;
            const avgAccuracy = data.performance.reduce((sum: number, model: ModelPerformance) => sum + model.accuracy, 0) / data.performance.length;
            content += `Average Accuracy: ${(avgAccuracy * 100).toFixed(1)}%\n\n`;
          }
          break;
        default:
          content += 'Section data not available\n\n';
      }
    });

    return content;
  }

  private combineReportData(template: ReportTemplate, data: any): any[] {
    const combinedData: any[] = [];

    template.sections.forEach(section => {
      switch (section.dataSource) {
        case 'leads':
          if (data.leads) {
            combinedData.push(...data.leads.map((lead: Lead) => ({
              Section: section.title,
              Type: 'Lead',
              ...lead,
            })));
          }
          break;
        case 'performance':
          if (data.performance) {
            combinedData.push(...data.performance.map((model: ModelPerformance) => ({
              Section: section.title,
              Type: 'Performance',
              ...model,
            })));
          }
          break;
      }
    });

    return combinedData;
  }
}

export const exportService = ExportService.getInstance();
export default exportService;