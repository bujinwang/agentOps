// Shared types for the Real Estate CRM app

export interface User {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  leadId: number;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  source: string;
  status: LeadStatus;
  priority: LeadPriority;
  budgetMin?: number;
  budgetMax?: number;
  desiredLocation?: string;
  propertyType?: PropertyType;
  bedroomsMin?: number;
  bathroomsMin?: number;
  notes?: string;
  aiSummary?: string;
  lastContactedAt?: string;
  followUpDate?: string;
  // Scoring fields
  score?: number; // Calculated score (0-100)
  scoreCategory?: LeadScoreCategory; // High/Medium/Low
  scoreBreakdown?: LeadScoreBreakdown; // Detailed scoring components
  scoreLastCalculated?: string; // When score was last calculated
  scoreHistory?: LeadScoreHistory[]; // Historical scores for trend analysis
  manualScoreOverride?: number; // Manual override by agent
  manualScoreReason?: string; // Reason for manual override
  createdAt: string;
  updatedAt: string;
}

export interface Interaction {
  interactionId: number;
  leadId: number;
  userId: number;
  type: InteractionType;
  content?: string;
  interactionDate: string;
  createdAt: string;
}

export interface Task {
  taskId: number;
  leadId?: number;
  userId: number;
  title: string;
  description?: string;
  dueDate?: string;
  priority: TaskPriority;
  isCompleted: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Enums and Union Types
export type LeadStatus = 
  | 'New' 
  | 'Contacted' 
  | 'Qualified' 
  | 'Showing Scheduled' 
  | 'Offer Made' 
  | 'Closed Won' 
  | 'Closed Lost' 
  | 'Archived';

export type LeadPriority = 'High' | 'Medium' | 'Low';

// Scoring Types
export type LeadScoreCategory = 'High' | 'Medium' | 'Low';

export interface LeadScoreBreakdown {
  budget: number; // 0-30 points
  timeline: number; // 0-25 points
  propertyType: number; // 0-20 points
  location: number; // 0-15 points
  engagement: number; // 0-10 points
}

export interface LeadScoreHistory {
  score: number;
  category: LeadScoreCategory;
  calculatedAt: string;
  breakdown: LeadScoreBreakdown;
  trigger: 'auto' | 'manual' | 'update';
}

export interface ScoringCriteria {
  budget: {
    high: { min: number; max: number; score: number };
    medium: { min: number; max: number; score: number };
    low: { min: number; max: number; score: number };
  };
  timeline: {
    urgent: { days: number; score: number };
    soon: { days: number; score: number };
    flexible: { days: number; score: number };
  };
  propertyType: {
    [key: string]: number; // Property type to score mapping
  };
  location: {
    premium: string[]; // Premium locations
    standard: string[]; // Standard locations
    score: { premium: number; standard: number; other: number };
  };
  engagement: {
    high: { interactions: number; score: number };
    medium: { interactions: number; score: number };
    low: { interactions: number; score: number };
  };
}

export type PropertyType = 
  | 'Condo' 
  | 'House' 
  | 'Townhouse' 
  | 'Land' 
  | 'Other';

export type InteractionType = 
  | 'Email Sent' 
  | 'Call Logged' 
  | 'SMS Sent' 
  | 'Note Added' 
  | 'Status Change' 
  | 'Meeting Scheduled'
  | 'Lead Created';

export type TaskPriority = 'High' | 'Medium' | 'Low';

// API Response Types
export interface ApiResponse<T = any> {
  message: string;
  data?: T;
  error?: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  userId: number;
  email: string;
  firstName: string;
}

export interface LeadsListResponse {
  message: string;
  data: Lead[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
}

export interface LeadDetailResponse {
  message: string;
  data: Lead;
}

// Form Types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LeadForm {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  source: string;
  budgetMin?: string;
  budgetMax?: string;
  desiredLocation?: string;
  propertyType?: PropertyType;
  bedroomsMin?: string;
  bathroomsMin?: string;
  notes?: string;
}

export interface TaskForm {
  title: string;
  description?: string;
  dueDate?: string;
  priority: TaskPriority;
  leadId?: number;
}

// Navigation Types
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Leads: undefined;
  Tasks: undefined;
  Analytics: undefined;
  Profile: undefined;
};

export type LeadsStackParamList = {
  LeadsList: undefined;
  LeadDetail: { leadId: number };
  AddLead: undefined;
  EditLead: { leadId: number };
  ImportLeads: undefined;
  ExportLeads: undefined;
};

export type TasksStackParamList = {
  TasksList: undefined;
  TaskDetail: { taskId: number };
  AddTask: undefined;
  EditTask: { taskId: number };
};

export type ProfileStackParamList = {
  Profile: undefined;
  Settings: undefined;
  ProfileSettings: undefined;
  OfflineSettings: undefined;
};

export type CalendarStackParamList = {
  Calendar: undefined;
};

export type SearchStackParamList = {
  Search: undefined;
};

export type NotificationsStackParamList = {
  Notifications: undefined;
};

export type AnalyticsStackParamList = {
  Analytics: undefined;
};

export type InteractionsStackParamList = {
  Interactions: undefined;
};

// Filter and Sort Types
export interface LeadFilters {
  status?: LeadStatus;
  priority?: LeadPriority;
  searchTerm?: string;
  propertyType?: PropertyType;
  scoreCategory?: 'High' | 'Medium' | 'Low';
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface LeadListParams extends LeadFilters, PaginationParams {}

// Auth Context Types
export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (credentials: LoginForm) => Promise<void>;
  register: (userData: RegisterForm) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Notification types
export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'reminder';
  read: boolean;
  createdAt: string;
  updatedAt: string;
  relatedId?: number;
  relatedType?: 'lead' | 'task' | 'interaction';
  actionUrl?: string;
}

export interface NotificationsResponse {
  data: Notification[];
  total: number;
  unread: number;
}

// Analytics Types
export interface DashboardKPIs {
  totalLeads: number;
  newLeads: number;
  activeTasks: number;
  completedTasks: number;
  leadsThisMonth: number;
  conversionRate: number;
  averageDealSize: number;
  responseTimeHours: number;
  highScoreLeads: number;
  mediumScoreLeads: number;
  lowScoreLeads: number;
}

export interface LeadAnalytics {
  leadsByStatus: Array<{ status: string; count: number; percentage: number }>;
  leadsBySource: Array<{ source: string; count: number; percentage: number }>;
  leadsByPriority: Array<{ priority: string; count: number; percentage: number }>;
  leadsByScoreCategory: Array<{ category: string; count: number; percentage: number }>;
  leadsOverTime: Array<{ date: string; count: number; new: number; converted: number }>;
  conversionFunnel: Array<{ stage: string; count: number; percentage: number }>;
}

export interface PerformanceMetrics {
  agentPerformance: Array<{
    agentId: number;
    agentName: string;
    leadsManaged: number;
    conversionRate: number;
    averageResponseTime: number;
    totalRevenue: number;
  }>;
  teamBenchmarks: {
    averageConversionRate: number;
    averageResponseTime: number;
    topPerformerRate: number;
  };
  marketComparison: {
    localAverageRate: number;
    industryAverageRate: number;
  };
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface AnalyticsFilters {
  dateRange?: DateRange;
  agentId?: number;
  leadSource?: string;
  propertyType?: PropertyType;
  scoreCategory?: 'High' | 'Medium' | 'Low';
}