// Enhanced API service layer with comprehensive endpoints

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ApiResponse,
  LoginForm,
  RegisterForm,
  LoginResponse,
  LeadsListResponse,
  LeadDetailResponse,
  LeadForm,
  Lead,
  LeadListParams,
  Task,
  TaskForm,
  Interaction,
} from '../types';
import { LoadingOptions } from '../utils/loadingState';

// Configuration
const API_BASE_URL = __DEV__
  ? 'http://localhost:3000'
  : 'https://your-production-api.com';

console.log('API Service Configuration:', {
  isDev: __DEV__,
  baseURL: API_BASE_URL,
  platform: Platform.OS
});

const API_TIMEOUT = 10000;
const TOKEN_KEY = '@RealEstateCRM:token';

// Loading callback interface
interface LoadingCallbacks {
  onStart?: (message?: string) => void;
  onProgress?: (progress: number, message?: string) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

class ApiService {
  private baseURL: string;
  private timeout: number;

  constructor() {
    this.baseURL = API_BASE_URL;
    this.timeout = API_TIMEOUT;
  }

  // Helper method to get stored token
  private async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  // Helper method to store token
  public async setToken(token: string | null): Promise<void> {
    try {
      if (token === null || token === undefined) {
        console.warn('Attempting to store null/undefined token, removing instead');
        await AsyncStorage.removeItem(TOKEN_KEY);
      } else {
        await AsyncStorage.setItem(TOKEN_KEY, token);
      }
    } catch (error) {
      console.error('Error storing token:', error);
      throw error;
    }
  }

  // Helper method to remove token
  public async removeToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error removing token:', error);
    }
  }

  // Public method with loading support
  public async requestWithLoading<T = any>(
    endpoint: string,
    options: RequestInit = {},
    loadingCallbacks?: LoadingCallbacks
  ): Promise<T> {
    return this.request<T>(endpoint, options, loadingCallbacks);
  }

  // Generic HTTP request method with loading support
  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {},
    loadingCallbacks?: LoadingCallbacks
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = await this.getToken();

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    try {
      console.log('Making API request:', { url, method: config.method || 'GET', headers: config.headers });

      // Start loading callback
      loadingCallbacks?.onStart?.('Loading...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        loadingCallbacks?.onError?.('Request timeout');
      }, this.timeout);

      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Update progress if response is received
      loadingCallbacks?.onProgress?.(50, 'Processing response...');

      console.log('API response received:', {
        url,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let errorDetails = null;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
          errorDetails = errorData.details || null;
          console.error('API error response:', { url, status: response.status, errorData });
        } catch (e) {
          console.error('API error (non-JSON):', { url, status: response.status, errorMessage });
        }
        
        // Create a custom error object that includes validation details
        const enhancedError = new Error(errorMessage) as any;
        enhancedError.status = response.status;
        enhancedError.details = errorDetails;
        enhancedError.url = url;
        
        throw enhancedError;
      }

      const data = await response.json();
      console.log('API request successful:', { url, data: typeof data === 'object' ? { ...data, token: data.token ? '[REDACTED]' : undefined } : data });

      // Complete loading callback
      loadingCallbacks?.onProgress?.(100, 'Complete');
      loadingCallbacks?.onComplete?.();

      return data as T;
    } catch (error) {
      console.error('API request failed:', {
        url,
        error: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : 'Unknown'
      });

      // Error loading callback
      const errorMessage = error instanceof Error ? error.message : 'Network error - please check your connection and server status';
      loadingCallbacks?.onError?.(errorMessage);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - server may be unreachable');
        }
        throw error;
      }
      throw new Error('Network error - please check your connection and server status');
    }
  }

  // Authentication endpoints
  async login(credentials: LoginForm): Promise<LoginResponse> {
    console.log('Login request:', { endpoint: '/api/auth/login', credentials: { ...credentials, password: '[REDACTED]' } });
    const response = await this.request<any>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    console.log('Login response structure:', {
      hasMessage: !!response.message,
      hasData: !!response.data,
      hasTokens: !!response.data?.tokens,
      hasAccessToken: !!response.data?.tokens?.accessToken,
      hasRefreshToken: !!response.data?.tokens?.refreshToken,
      responseKeys: Object.keys(response),
      dataKeys: response.data ? Object.keys(response.data) : [],
      tokensKeys: response.data?.tokens ? Object.keys(response.data.tokens) : []
    });

    // Extract token from the nested structure
    const accessToken = response.data?.tokens?.accessToken;

    // Store token for future requests
    if (accessToken) {
      console.log('Token found in response, storing for future requests');
      await this.setToken(accessToken);
    } else {
      console.warn('Login response does not contain access token:', response);
      // Remove any existing token if login fails or doesn't return token
      await this.removeToken();
    }

    // Transform the response to match the expected LoginResponse format
    const transformedResponse: LoginResponse = {
      message: response.message,
      token: accessToken || '', // Provide the access token as the flat token field
      userId: response.data?.user?.userId || response.userId,
      email: response.data?.user?.email || response.email,
      firstName: response.data?.user?.firstName || response.firstName
    };

    return transformedResponse;
  }

  // Authentication endpoints with loading support
  async loginWithLoading(
    credentials: LoginForm,
    loadingCallbacks?: LoadingCallbacks
  ): Promise<LoginResponse | null> {
    try {
      loadingCallbacks?.onStart?.('Signing in...');

      const result = await this.login(credentials);

      loadingCallbacks?.onComplete?.();
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      loadingCallbacks?.onError?.(errorMessage);
      return null;
    }
  }

  async register(userData: RegisterForm): Promise<ApiResponse> {
    console.log('Registration request:', {
      endpoint: '/api/auth/register',
      userData: { ...userData, password: '[REDACTED]' },
      baseURL: this.baseURL
    });
    
    try {
      const response = await this.request<ApiResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
      
      console.log('Registration successful:', response);
      return response;
    } catch (error) {
      console.error('Registration failed:', {
        endpoint: '/api/auth/register',
        baseURL: this.baseURL,
        error: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : 'Unknown'
      });
      throw error;
    }
  }

  async logout(): Promise<void> {
    await this.removeToken();
    // Optional: Call logout endpoint if you have one
    // await this.request('/api/auth/logout', { method: 'POST' });
  }

  // Leads endpoints
  async getLeads(params?: Partial<LeadListParams>): Promise<LeadsListResponse> {
    const searchParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value.toString());
        }
      });
    }

    const queryString = searchParams.toString();
    const endpoint = `/api/leads${queryString ? `?${queryString}` : ''}`;

    return this.request<LeadsListResponse>(endpoint, {
      method: 'GET',
    });
  }

  // Leads endpoints with loading support
  async getLeadsWithLoading(
    params?: Partial<LeadListParams>,
    loadingCallbacks?: LoadingCallbacks
  ): Promise<LeadsListResponse> {
    const searchParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value.toString());
        }
      });
    }

    const queryString = searchParams.toString();
    const endpoint = `/api/leads${queryString ? `?${queryString}` : ''}`;

    return this.request<LeadsListResponse>(endpoint, {
      method: 'GET',
    }, loadingCallbacks);
  }

  async getLead(leadId: number): Promise<LeadDetailResponse> {
    return this.request<LeadDetailResponse>(`/api/leads/${leadId}`, {
      method: 'GET',
    });
  }

  async getLeadWithLoading(
    leadId: number,
    loadingCallbacks?: LoadingCallbacks
  ): Promise<LeadDetailResponse> {
    return this.request<LeadDetailResponse>(`/api/leads/${leadId}`, {
      method: 'GET',
    }, loadingCallbacks);
  }

  async createLead(leadData: LeadForm): Promise<ApiResponse<Lead>> {
    return this.request<ApiResponse<Lead>>('/api/leads', {
      method: 'POST',
      body: JSON.stringify(leadData),
    });
  }

  async createLeadWithLoading(
    leadData: LeadForm,
    loadingCallbacks?: LoadingCallbacks
  ): Promise<ApiResponse<Lead>> {
    return this.request<ApiResponse<Lead>>('/api/leads', {
      method: 'POST',
      body: JSON.stringify(leadData),
    }, loadingCallbacks);
  }

  async updateLeadStatus(
    leadId: number, 
    status: string
  ): Promise<ApiResponse<Lead>> {
    return this.request<ApiResponse<Lead>>(`/api/leads/${leadId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async updateLead(
    leadId: number, 
    leadData: Partial<LeadForm>
  ): Promise<ApiResponse<Lead>> {
    return this.request<ApiResponse<Lead>>(`/api/leads/${leadId}`, {
      method: 'PUT',
      body: JSON.stringify(leadData),
    });
  }

  async deleteLead(leadId: number): Promise<ApiResponse> {
    return this.request<ApiResponse>(`/api/leads/${leadId}`, {
      method: 'DELETE',
    });
  }

  // Tasks endpoints
  async getTasks(params?: any): Promise<{ data: Task[] }> {
    const searchParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value.toString());
        }
      });
    }

    const queryString = searchParams.toString();
    const endpoint = `/api/tasks${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint, {
      method: 'GET',
    });
  }

  async getTask(taskId: number): Promise<{ data: Task }> {
    return this.request(`/api/tasks/${taskId}`, {
      method: 'GET',
    });
  }

  async createTask(taskData: TaskForm): Promise<ApiResponse<Task>> {
    return this.request('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  }

  async updateTask(taskId: number, taskData: Partial<Task>): Promise<ApiResponse<Task>> {
    return this.request(`/api/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    });
  }

  async deleteTask(taskId: number): Promise<ApiResponse> {
    return this.request(`/api/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }

  // Interactions endpoints
  async getLeadInteractions(leadId: number): Promise<{ data: Interaction[] }> {
    return this.request(`/api/leads/${leadId}/interactions`, {
      method: 'GET',
    });
  }

  async addInteraction(interactionData: {
    leadId: number;
    type: string;
    content?: string;
  }): Promise<ApiResponse<Interaction>> {
    return this.request('/api/interactions', {
      method: 'POST',
      body: JSON.stringify(interactionData),
    });
  }

  async getInteractions(params?: {
    leadId?: number;
    type?: string;
    limit?: number;
    page?: number;
  }): Promise<{ data: Interaction[] }> {
    const searchParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value.toString());
        }
      });
    }

    const queryString = searchParams.toString();
    const endpoint = `/api/interactions${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint, {
      method: 'GET',
    });
  }

  // Analytics endpoints
  async getDashboardStats(): Promise<{
    data: {
      totalLeads: number;
      newLeads: number;
      activeTasks: number;
      completedTasks: number;
      leadsThisMonth: number;
      conversionRate: number;
      recentActivity: Interaction[];
    };
  }> {
    return this.request('/webhook/analytics/dashboard', {
      method: 'GET',
    });
  }

  async getDashboardStatsWithLoading(loadingCallbacks?: LoadingCallbacks): Promise<{
    data: {
      totalLeads: number;
      newLeads: number;
      activeTasks: number;
      completedTasks: number;
      leadsThisMonth: number;
      conversionRate: number;
      recentActivity: Interaction[];
    };
  }> {
    return this.request('/webhook/analytics/dashboard', {
      method: 'GET',
    }, loadingCallbacks);
  }

  async getLeadStats(timeframe: 'week' | 'month' | 'quarter' = 'month'): Promise<{
    data: {
      leadsByStatus: Array<{ status: string; count: number }>;
      leadsBySource: Array<{ source: string; count: number }>;
      leadsByPriority: Array<{ priority: string; count: number }>;
      leadsOverTime: Array<{ date: string; count: number }>;
    };
  }> {
    return this.request(`/webhook/analytics/leads?timeframe=${timeframe}`, {
      method: 'GET',
    });
  }

  // Search endpoints
  async searchLeads(query: string, filters?: {
    status?: string;
    priority?: string;
    source?: string;
  }): Promise<{ data: Lead[] }> {
    const searchParams = new URLSearchParams({ q: query });
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          searchParams.append(key, value);
        }
      });
    }

    return this.request(`/webhook/search/leads?${searchParams.toString()}`, {
      method: 'GET',
    });
  }

  async searchTasks(query: string, filters?: {
    completed?: boolean;
    priority?: string;
    leadId?: number;
  }): Promise<{ data: Task[] }> {
    const searchParams = new URLSearchParams({ q: query });
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    return this.request(`/webhook/search/tasks?${searchParams.toString()}`, {
      method: 'GET',
    });
  }

  // Export/Import endpoints
  async exportLeads(format: 'csv' | 'excel' = 'csv', filters?: any): Promise<Blob> {
    const searchParams = new URLSearchParams({ format });
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value.toString());
        }
      });
    }

    const response = await fetch(`${this.baseURL}/webhook/leads/export?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${await this.getToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  }

  async importLeads(file: File | FormData): Promise<ApiResponse<{
    imported: number;
    failed: number;
    errors: string[];
  }>> {
    const formData = file instanceof FormData ? file : new FormData();
    if (!(file instanceof FormData)) {
      formData.append('file', file);
    }

    return this.request('/webhook/leads/import', {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type for FormData - let the browser set it
        Authorization: `Bearer ${await this.getToken()}`,
      },
    });
  }

  // Notification endpoints
  async getNotifications(params?: {
    read?: boolean;
    type?: string;
    limit?: number;
  }): Promise<{ data: any[] }> {
    const searchParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const queryString = searchParams.toString();
    const endpoint = `/webhook/notifications${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint, {
      method: 'GET',
    });
  }

  async markNotificationRead(notificationId: number): Promise<ApiResponse> {
    return this.request(`/webhook/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  }

  async markAllNotificationsRead(): Promise<ApiResponse> {
    return this.request('/webhook/notifications/mark-all-read', {
      method: 'PUT',
    });
  }

  // User profile endpoints
  async updateProfile(profileData: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    preferences?: any;
  }): Promise<ApiResponse> {
    return this.request('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async changePassword(passwordData: {
    currentPassword: string;
    newPassword: string;
  }): Promise<ApiResponse> {
    return this.request('/api/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    });
  }

  // Health check endpoint
  async healthCheck(): Promise<{ status: string }> {
    return this.request('/api/health', {
      method: 'GET',
    });
  }

  // File upload endpoint
  async uploadFile(file: File, type: 'avatar' | 'document' = 'document'): Promise<{
    data: { url: string; filename: string; size: number };
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    return this.request('/api/files/upload', {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${await this.getToken()}`,
      },
    });
  }

  // Scoring endpoints
  async getScoringCriteria(): Promise<{ data: any }> {
    return this.request('/api/scoring/criteria', {
      method: 'GET',
    });
  }

  async updateScoringCriteria(criteria: any): Promise<ApiResponse> {
    return this.request('/api/scoring/criteria', {
      method: 'PUT',
      body: JSON.stringify(criteria),
    });
  }

  async calculateLeadScore(leadId: number): Promise<{ data: { score: number; category: string; breakdown: any } }> {
    return this.request(`/api/scoring/leads/${leadId}/calculate`, {
      method: 'POST',
    });
  }

  async updateLeadScore(leadId: number, scoreData: {
    score: number;
    category: string;
    breakdown: any;
    manualOverride?: boolean;
    reason?: string;
  }): Promise<ApiResponse> {
    return this.request(`/api/scoring/leads/${leadId}`, {
      method: 'PUT',
      body: JSON.stringify(scoreData),
    });
  }

  async getLeadScoreHistory(leadId: number): Promise<{ data: any[] }> {
    return this.request(`/api/scoring/leads/${leadId}/history`, {
      method: 'GET',
    });
  }

  async bulkCalculateScores(leadIds: number[]): Promise<{ data: any[] }> {
    return this.request('/api/scoring/leads/bulk-calculate', {
      method: 'POST',
      body: JSON.stringify({ leadIds }),
    });
  }

  // Personalized Template endpoints
  async getPersonalizedTemplates(params?: { channel?: 'email' | 'sms'; category?: string; search?: string }): Promise<{ templates: any[]; categories: string[]; count: number }> {
    const searchParams = new URLSearchParams();

    if (params?.channel) {
      searchParams.append('channel', params.channel);
    }
    if (params?.category) {
      searchParams.append('category', params.category);
    }
    if (params?.search) {
      searchParams.append('search', params.search);
    }

    const queryString = searchParams.toString();
    const endpoint = `/api/templates${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint, {
      method: 'GET',
    });
  }

  async createPersonalizedTemplate(templateData: any): Promise<{ template: any }> {
    return this.request('/api/templates', {
      method: 'POST',
      body: JSON.stringify(templateData),
    });
  }

  // Legacy template endpoints (keeping for backward compatibility)
  async getTemplates(params?: { type?: 'email' | 'sms' }): Promise<{ data: any[]; total: number }> {
    const searchParams = new URLSearchParams();

    if (params?.type) {
      searchParams.append('type', params.type);
    }

    const queryString = searchParams.toString();
    const endpoint = `/api/templates${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint, {
      method: 'GET',
    });
  }

  async getTemplate(templateId: number): Promise<{ data: any }> {
    return this.request(`/api/templates/${templateId}`, {
      method: 'GET',
    });
  }

  async createTemplate(templateData: any): Promise<{ data: any }> {
    return this.request('/api/templates', {
      method: 'POST',
      body: JSON.stringify(templateData),
    });
  }

  async updateTemplate(templateId: number, templateData: any): Promise<{ data: any }> {
    return this.request(`/api/templates/${templateId}`, {
      method: 'PUT',
      body: JSON.stringify(templateData),
    });
  }

  async deletePersonalizedTemplate(templateId: number): Promise<{ message: string }> {
    return this.request(`/api/templates/${templateId}`, {
      method: 'DELETE',
    });
  }

  async deleteTemplate(templateId: number): Promise<{ message: string }> {
    return this.request(`/api/templates/${templateId}`, {
      method: 'DELETE',
    });
  }

  async duplicateTemplate(templateId: number, newName: string): Promise<{ data: any }> {
    return this.request(`/api/templates/${templateId}/duplicate`, {
      method: 'POST',
      body: JSON.stringify({ name: newName }),
    });
  }

  async previewTemplate(templateId: number, leadData: any): Promise<{ data: any }> {
    return this.request(`/api/templates/${templateId}/preview`, {
      method: 'POST',
      body: JSON.stringify({ leadData }),
    });
  }

  // Conversion tracking endpoints
  async getConversionStages(): Promise<{ data: any[] }> {
    return this.request('/api/conversion/stages', {
      method: 'GET',
    });
  }

  async updateLeadStage(leadId: number, stageId: number, notes?: string): Promise<{ data: any }> {
    return this.request(`/api/conversion/leads/${leadId}/stage`, {
      method: 'PUT',
      body: JSON.stringify({ stageId, notes }),
    });
  }

  async updateLeadProbability(leadId: number, probability: number, notes?: string): Promise<{ data: any }> {
    return this.request(`/api/conversion/leads/${leadId}/probability`, {
      method: 'PUT',
      body: JSON.stringify({ probability, notes }),
    });
  }

  async getConversionFunnel(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<{ data: any[] }> {
    const searchParams = new URLSearchParams();

    if (params?.startDate) {
      searchParams.append('startDate', params.startDate);
    }
    if (params?.endDate) {
      searchParams.append('endDate', params.endDate);
    }

    const queryString = searchParams.toString();
    const endpoint = `/api/conversion/funnel${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint, {
      method: 'GET',
    });
  }

  async getLeadConversionHistory(leadId: number): Promise<{ data: any[] }> {
    return this.request(`/api/conversion/leads/${leadId}/history`, {
      method: 'GET',
    });
  }

  async getConversionMetrics(params: {
    startDate: string;
    endDate: string;
  }): Promise<{ data: any[] }> {
    const searchParams = new URLSearchParams({
      startDate: params.startDate,
      endDate: params.endDate,
    });

    return this.request(`/api/conversion/metrics?${searchParams.toString()}`, {
      method: 'GET',
    });
  }

  async updateConversionMetrics(date?: string): Promise<{ data: any }> {
    return this.request('/api/conversion/metrics/update', {
      method: 'POST',
      body: JSON.stringify({ date }),
    });
  }

  async getLeadsByStage(stageId?: number): Promise<{ data: any[] }> {
    const searchParams = new URLSearchParams();
    if (stageId) {
      searchParams.append('stageId', stageId.toString());
    }

    const queryString = searchParams.toString();
    const endpoint = `/api/conversion/leads${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint, {
      method: 'GET',
    });
  }

  // Workflow Analytics endpoints
  async getWorkflowAnalyticsOverview(): Promise<{ data: any }> {
    return this.request('/api/workflow-analytics/overview', {
      method: 'GET',
    });
  }

  async getWorkflowPerformanceTimeline(days?: number): Promise<{ data: any[] }> {
    const searchParams = new URLSearchParams();
    if (days) {
      searchParams.append('days', days.toString());
    }

    const queryString = searchParams.toString();
    const endpoint = `/api/workflow-analytics/performance-timeline${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint, {
      method: 'GET',
    });
  }

  async getWorkflowAnalytics(workflowId: number): Promise<{ data: any }> {
    return this.request(`/api/workflow-analytics/workflow/${workflowId}`, {
      method: 'GET',
    });
  }

  async trackWorkflowResponse(executionId: number, responseType: string, responseValue?: string): Promise<{ data: any }> {
    return this.request('/api/workflow-analytics/response', {
      method: 'POST',
      body: JSON.stringify({
        executionId,
        responseType,
        responseValue,
      }),
    });
  }

  async trackWorkflowConversion(executionId: number, conversionValue: number, conversionType: string): Promise<{ data: any }> {
    return this.request('/api/workflow-analytics/conversion', {
      method: 'POST',
      body: JSON.stringify({
        executionId,
        conversionValue,
        conversionType,
      }),
    });
  }

  // Workflow endpoints
  async getWorkflows(params?: { is_active?: boolean }): Promise<{ data: any[]; total: number }> {
    const searchParams = new URLSearchParams();

    if (params?.is_active !== undefined) {
      searchParams.append('is_active', params.is_active.toString());
    }

    const queryString = searchParams.toString();
    const endpoint = `/api/workflows${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint, {
      method: 'GET',
    });
  }

  async getWorkflow(workflowId: number): Promise<{ data: any }> {
    return this.request(`/api/workflows/${workflowId}`, {
      method: 'GET',
    });
  }

  async createWorkflow(workflowData: any): Promise<{ data: any }> {
    return this.request('/api/workflows', {
      method: 'POST',
      body: JSON.stringify(workflowData),
    });
  }

  async updateWorkflow(workflowId: number, workflowData: any): Promise<{ data: any }> {
    return this.request(`/api/workflows/${workflowId}`, {
      method: 'PUT',
      body: JSON.stringify(workflowData),
    });
  }

  async deleteWorkflow(workflowId: number): Promise<{ message: string }> {
    return this.request(`/api/workflows/${workflowId}`, {
      method: 'DELETE',
    });
  }

  async testWorkflow(workflowId: number, testData: any): Promise<{ data: any }> {
    return this.request(`/api/workflows/${workflowId}/test`, {
      method: 'POST',
      body: JSON.stringify(testData),
    });
  }

  // A/B Testing endpoints
  async getExperiments(params?: { status?: string; templateId?: number }): Promise<{ experiments: any[]; count: number }> {
    const searchParams = new URLSearchParams();

    if (params?.status) {
      searchParams.append('status', params.status);
    }
    if (params?.templateId) {
      searchParams.append('templateId', params.templateId.toString());
    }

    const queryString = searchParams.toString();
    const endpoint = `/api/experiments${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint, {
      method: 'GET',
    });
  }

  async createExperiment(experimentData: any): Promise<{ experiment: any }> {
    return this.request('/api/experiments', {
      method: 'POST',
      body: JSON.stringify(experimentData),
    });
  }

  async getExperiment(experimentId: number): Promise<{ experiment: any }> {
    return this.request(`/api/experiments/${experimentId}`, {
      method: 'GET',
    });
  }

  async startExperiment(experimentId: number): Promise<{ experiment: any }> {
    return this.request(`/api/experiments/${experimentId}/start`, {
      method: 'PUT',
    });
  }

  async stopExperiment(experimentId: number): Promise<{ experiment: any }> {
    return this.request(`/api/experiments/${experimentId}/stop`, {
      method: 'PUT',
    });
  }

  async getExperimentResults(experimentId: number): Promise<{ results: any }> {
    return this.request(`/api/experiments/${experimentId}/results`, {
      method: 'GET',
    });
  }

  async selectVariantForLead(experimentId: number, leadId: number): Promise<{ variant: any }> {
    return this.request(`/api/experiments/${experimentId}/select-variant`, {
      method: 'POST',
      body: JSON.stringify({ leadId }),
    });
  }

  async recordExperimentResult(experimentId: number, leadId: number, metricValue: number, conversionOccurred?: boolean): Promise<{ message: string }> {
    return this.request(`/api/experiments/${experimentId}/record-result`, {
      method: 'POST',
      body: JSON.stringify({ leadId, metricValue, conversionOccurred }),
    });
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;