// Dashboard Types and Interfaces for Predictive Lead Insights

export interface DashboardConfig {
  id: string;
  userId: number;
  name: string;
  layout: DashboardLayout;
  filters: DashboardFilters;
  preferences: DashboardPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardLayout {
  id: string;
  components: DashboardComponent[];
  grid: {
    columns: number;
    rows: number;
    gap: number;
  };
  responsive: {
    breakpoints: Record<string, number>;
    layouts: Record<string, DashboardComponent[]>;
  };
}

export interface DashboardComponent {
  id: string;
  type: DashboardComponentType;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  config: ComponentConfig;
  data: ComponentData;
  refresh: {
    interval: number; // seconds
    enabled: boolean;
  };
}

export type DashboardComponentType =
  | 'lead-insights'
  | 'conversion-probability'
  | 'predictive-timeline'
  | 'behavioral-analysis'
  | 'recommendation-engine'
  | 'model-performance'
  | 'lead-comparison'
  | 'trend-analysis'
  | 'alert-center'
  | 'export-panel';

export interface ComponentConfig {
  title: string;
  description?: string;
  visible: boolean;
  collapsible: boolean;
  draggable: boolean;
  resizable: boolean;
  settings: Record<string, any>;
}

export interface ComponentData {
  loading: boolean;
  error?: string;
  lastUpdated: string;
  data: any;
  metadata: {
    totalRecords?: number;
    filteredRecords?: number;
    dataRange?: {
      start: string;
      end: string;
    };
  };
}

export interface DashboardFilters {
  dateRange: {
    start: string;
    end: string;
    preset?: 'today' | 'yesterday' | 'last7days' | 'last30days' | 'last90days' | 'custom';
  };
  leadStatus: LeadStatus[];
  leadSource: string[];
  scoreRange: {
    min: number;
    max: number;
  };
  engagementLevel: EngagementLevel[];
  propertyType?: string[];
  location?: string[];
  agent?: number[];
  tags?: string[];
}

export interface DashboardPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  currency: string;
  dateFormat: string;
  numberFormat: string;
  notifications: {
    enabled: boolean;
    types: NotificationType[];
    frequency: 'immediate' | 'hourly' | 'daily';
  };
  autoRefresh: {
    enabled: boolean;
    interval: number; // seconds
  };
  export: {
    defaultFormat: 'pdf' | 'csv' | 'excel';
    includeCharts: boolean;
    includeRawData: boolean;
  };
}

export interface LeadInsights {
  leadId: number;
  name: string;
  email: string;
  phone?: string;
  currentScore: number;
  scoreHistory: ScoreHistoryPoint[];
  conversionProbability: number;
  predictedConversionDate?: string;
  predictedDealValue?: number;
  engagementLevel: EngagementLevel;
  lastActivity: string;
  nextBestAction: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  insights: LeadInsight[];
  recommendations: Recommendation[];
}

export interface ScoreHistoryPoint {
  timestamp: string;
  score: number;
  confidence: number;
  factors: Record<string, number>;
}

export interface LeadInsight {
  type: 'positive' | 'negative' | 'neutral';
  category: 'behavioral' | 'demographic' | 'temporal' | 'interaction';
  title: string;
  description: string;
  impact: number; // -1 to 1
  confidence: number;
  data: any;
}

export interface Recommendation {
  id: string;
  type: 'follow_up' | 'communication' | 'prioritization' | 'escalation';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  suggestedAction: string;
  expectedImpact: number;
  deadline?: string;
  channels: CommunicationChannel[];
  status: 'pending' | 'implemented' | 'dismissed';
}

export interface CommunicationChannel {
  type: 'email' | 'sms' | 'call' | 'in_app' | 'social';
  priority: number;
  effectiveness: number;
  lastUsed?: string;
  recommendedTiming?: string;
}

export interface PredictiveAnalytics {
  leadId: number;
  conversionForecast?: ConversionForecast;
  dealValuePrediction?: DealValuePrediction;
  behavioralPatterns: BehavioralPatterns;
  riskAssessment?: RiskAssessment;
  opportunityScore: number;
  scenarios?: ScenarioAnalysis[];
}

export interface ConversionForecast {
  probability: number;
  confidence: number;
  estimatedTimeline: {
    optimistic: string;
    realistic: string;
    pessimistic: string;
  };
  factors: ForecastFactor[];
  scenarios: ConversionScenario[];
}

export interface ForecastFactor {
  name: string;
  impact: number;
  trend: 'improving' | 'stable' | 'declining';
  data: any;
}

export interface ConversionScenario {
  name: string;
  probability: number;
  description: string;
  actions: string[];
  expectedOutcome: string;
}

export interface DealValuePrediction {
  estimatedValue: number;
  confidence: number;
  range: {
    min: number;
    max: number;
  };
  factors: ValueFactor[];
  comparables: ComparableDeal[];
}

export interface ValueFactor {
  name: string;
  impact: number;
  contribution: number;
}

export interface ComparableDeal {
  id: string;
  value: number;
  similarity: number;
  factors: Record<string, any>;
}

export interface BehavioralPattern {
  type: string;
  frequency: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  significance: number;
  description: string;
  data: any;
}

export interface BehavioralPatterns {
  engagementPatterns: BehavioralPattern[];
  trends: BehavioralTrend[];
  significance: number;
  insights: BehavioralInsight[];
  lastAnalyzed: string;
}

export interface BehavioralTrend {
  type: string;
  direction: 'increasing' | 'stable' | 'decreasing';
  magnitude: number;
  significance: number;
  description: string;
}

export interface BehavioralInsight {
  type: 'positive' | 'negative' | 'neutral';
  category: string;
  title: string;
  description: string;
  impact: number;
  confidence: number;
}

export interface ScenarioAnalysis {
  name: string;
  probability: number;
  timeline: string;
  value: number;
  factors: string[];
  likelihood: number;
  description?: string;
}

export interface PredictiveTimelineData {
  leadId: number;
  timeline: TimelinePoint[];
  confidence: number;
}

export interface TimelinePoint {
  date: string;
  probability: number;
  confidence: number;
  value?: number;
}

export type OpportunityScore = number;

export interface RiskAssessment {
  overallRisk: number;
  riskFactors: RiskFactor[];
  mitigationStrategies: string[];
  confidence: number;
}

export interface RiskFactor {
  name: string;
  level: 'low' | 'medium' | 'high';
  impact: number;
  probability: number;
  description: string;
}

export interface ModelPerformance {
  modelId: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc?: number;
  driftDetected: boolean;
  driftSeverity: 'low' | 'medium' | 'high';
  lastRetrained: string;
  nextRetraining: string;
  performanceHistory: PerformanceHistoryPoint[];
  abTests: ABTestSummary[];
}

export interface PerformanceHistoryPoint {
  timestamp: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  sampleSize: number;
}

export interface ABTestSummary {
  id: string;
  status: 'running' | 'completed';
  championModel: string;
  challengerModel: string;
  winner?: string;
  improvement: number;
  confidence: number;
  startDate: string;
  endDate?: string;
}

export interface DashboardAlert {
  id: string;
  type: 'lead' | 'model' | 'system' | 'opportunity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  data: any;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: number;
  acknowledgedAt?: string;
  actions: AlertAction[];
}

export interface AlertAction {
  id: string;
  label: string;
  type: 'view' | 'dismiss' | 'action';
  data: any;
}

export interface DashboardMetrics {
  totalLeads: number;
  activeLeads: number;
  highValueLeads: number;
  conversionRate: number;
  averageScore: number;
  topPerformingAgents: AgentPerformance[];
  recentActivity: ActivitySummary[];
  systemHealth: SystemHealth;
}

export interface AgentPerformance {
  agentId: number;
  name: string;
  leadsManaged: number;
  conversionRate: number;
  averageDealValue: number;
  score: number;
}

export interface ActivitySummary {
  type: 'lead_created' | 'lead_updated' | 'communication' | 'conversion';
  count: number;
  trend: 'up' | 'down' | 'stable';
  period: string;
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  components: {
    database: ComponentHealth;
    api: ComponentHealth;
    ml: ComponentHealth;
    cache: ComponentHealth;
  };
  lastChecked: string;
}

export interface ComponentHealth {
  status: 'healthy' | 'warning' | 'critical';
  responseTime: number;
  errorRate: number;
  uptime: number;
}

export interface DashboardExport {
  id: string;
  type: 'pdf' | 'csv' | 'excel';
  title: string;
  description?: string;
  filters: DashboardFilters;
  components: string[]; // component IDs to include
  includeCharts: boolean;
  includeRawData: boolean;
  createdBy: number;
  createdAt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt?: string;
}

export interface DashboardReport {
  id: string;
  name: string;
  description?: string;
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    recipients: string[];
  };
  config: DashboardExport;
  lastGenerated?: string;
  nextGeneration: string;
  status: 'active' | 'paused' | 'disabled';
}

// Enums and Types
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'closed' | 'lost';
export type EngagementLevel = 'low' | 'medium' | 'high';
export type NotificationType = 'lead_alert' | 'model_performance' | 'system_health' | 'recommendation';

// Alert System Types
export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  score: number;
  conversionProbability: number;
  estimatedValue: number;
  lastContact: string;
  status: LeadStatus;
  engagementLevel: EngagementLevel;
}

export interface AlertThreshold {
  highValueScore: number;
  urgentFollowUp: number; // days
  conversionProbability: number;
  dealValue: number;
}

export type AlertType = 'high_value' | 'urgent_followup' | 'conversion_opportunity' | 'high_value_deal' | 'model_performance' | 'system_health';

// WebSocket Events
export interface DashboardWebSocketEvent {
  type: 'lead_update' | 'score_change' | 'alert' | 'model_performance' | 'system_health';
  data: any;
  timestamp: string;
}

// API Response Types
export interface DashboardApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    totalRecords?: number;
    page?: number;
    pageSize?: number;
    hasMore?: boolean;
  };
}

// Cache Types
export interface DashboardCache {
  key: string;
  data: any;
  timestamp: string;
  ttl: number; // seconds
  tags: string[];
}

// Offline Support
export interface OfflineData {
  leads: LeadInsights[];
  predictions: PredictiveAnalytics[];
  recommendations: Recommendation[];
  lastSync: string;
  pendingActions: PendingAction[];
}

export interface PendingAction {
  id: string;
  type: 'update' | 'create' | 'delete';
  data: any;
  timestamp: string;
  retryCount: number;
}

// Error Types
export interface DashboardError {
  code: string;
  message: string;
  component?: string;
  data?: any;
  timestamp: string;
  userFriendlyMessage: string;
  suggestedActions?: string[];
}

// Loading States
export interface LoadingState {
  loading: boolean;
  progress?: number;
  message?: string;
  cancellable?: boolean;
}

// Search and Filter Types
export interface LeadSearchQuery {
  query: string;
  fields: ('name' | 'email' | 'phone' | 'company')[];
  fuzzy: boolean;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface AdvancedFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'starts_with' | 'ends_with';
  value: any;
  caseSensitive?: boolean;
}

// Theme and Styling
export interface DashboardTheme {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
    background: string;
    surface: string;
    text: {
      primary: string;
      secondary: string;
      disabled: string;
    };
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
    };
    fontWeight: {
      light: number;
      regular: number;
      medium: number;
      bold: number;
    };
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
  };
  shadows: string[];
}