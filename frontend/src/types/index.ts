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
  Profile: undefined;
};

export type LeadsStackParamList = {
  LeadsList: undefined;
  LeadDetail: { leadId: number };
  AddLead: undefined;
  EditLead: { leadId: number };
};

// Filter and Sort Types
export interface LeadFilters {
  status?: LeadStatus;
  priority?: LeadPriority;
  searchTerm?: string;
  propertyType?: PropertyType;
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