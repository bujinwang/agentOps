// Analytics Types for Revenue Analytics Dashboard

export interface RevenueSummary {
  totalTransactions: number;
  totalRevenue: number;
  totalExpenses: number;
  totalCommissions: number;
  netIncome: number;
  avgTransactionValue: number;
  activeAgents: number;
  activeDays: number;
}

export interface CommissionAnalytics {
  totalCommissions: number;
  totalCommissionAmount: number;
  paidCommissions: number;
  pendingCommissions: number;
  avgCommissionRate: number;
  totalTaxes: number;
  totalAdjustments: number;
  totalBonuses: number;
  totalPenalties: number;
}

export interface RevenueTrend {
  period: string;
  transactionCount: number;
  revenue: number;
  expenses: number;
  commissions: number;
  netIncome: number;
}

export interface CommissionRecord {
  id: string;
  transactionId: string;
  agentId: string;
  agentName: string;
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  adjustments: number;
  bonuses: number;
  penalties: number;
  taxes: number;
  netAmount: number;
  paymentStatus: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paymentDate?: string;
  transactionDate: string;
  categoryName: string;
}

export interface AgentPerformance {
  agentId: string;
  agentName: string;
  totalRevenue: number;
  totalCommissions: number;
  transactionCount: number;
  avgCommissionRate: number;
  performanceRank: number;
  trendDirection: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

export interface RevenueBreakdown {
  category: string;
  amount: number;
  percentage: number;
  transactionCount: number;
  color: string;
}

export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  agentId?: string;
  categoryId?: string;
  timeRange?: '7d' | '30d' | '90d' | '1y';
  period?: 'daily' | 'weekly' | 'monthly';
  page?: number;
  limit?: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  secondaryValue?: number;
}

export interface DashboardWidget {
  id: string;
  title: string;
  type: 'kpi' | 'chart' | 'table' | 'metric';
  data: any;
  config?: {
    refreshInterval?: number;
    size?: 'small' | 'medium' | 'large';
    position?: { x: number; y: number };
  };
}

export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  dateRange: {
    start: string;
    end: string;
  };
  includeCharts: boolean;
  includeRawData: boolean;
  recipientEmails?: string[];
}

export interface RealTimeUpdate {
  type: 'revenue' | 'commission' | 'agent_performance';
  data: any;
  timestamp: string;
  source: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface RevenueApiResponse extends ApiResponse<RevenueSummary> {}
export interface CommissionApiResponse extends ApiResponse<CommissionAnalytics> {}
export interface TrendsApiResponse extends ApiResponse<RevenueTrend[]> {}
export interface AgentsApiResponse extends ApiResponse<AgentPerformance[]> {}

// Error Types
export interface AnalyticsError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

// Configuration Types
export interface AnalyticsConfig {
  refreshInterval: number;
  defaultTimeRange: '7d' | '30d' | '90d' | '1y';
  defaultPeriod: 'daily' | 'weekly' | 'monthly';
  enableRealTimeUpdates: boolean;
  maxDataPoints: number;
  cacheTimeout: number;
}

export interface WidgetConfig {
  enabledWidgets: string[];
  widgetLayout: 'grid' | 'masonry' | 'list';
  defaultSize: 'small' | 'medium' | 'large';
  allowCustomization: boolean;
}

// Utility Types
export type TimeRange = '7d' | '30d' | '90d' | '1y';
export type Period = 'daily' | 'weekly' | 'monthly';
export type TrendDirection = 'up' | 'down' | 'stable';
export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';
export type ExportFormat = 'pdf' | 'excel' | 'csv';

// Hook Types
export interface UseAnalyticsReturn {
  data: any;
  loading: boolean;
  error: AnalyticsError | null;
  refetch: () => Promise<void>;
  lastUpdated: string | null;
}

export interface UseRealTimeAnalyticsReturn extends UseAnalyticsReturn {
  isConnected: boolean;
  reconnect: () => void;
  disconnect: () => void;
}