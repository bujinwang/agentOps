// API service layer for communicating with n8n backend

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
} from '../types';

// Configuration
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:5678' 
  : 'https://your-n8n-instance.com';

const API_TIMEOUT = 10000;
const TOKEN_KEY = '@RealEstateCRM:token';

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
  public async setToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
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

  // Generic HTTP request method
  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If response isn't JSON, use default error message
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }
      throw new Error('Network error');
    }
  }

  // Authentication endpoints
  async login(credentials: LoginForm): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/webhook/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    // Store token for future requests
    if (response.token) {
      await this.setToken(response.token);
    }

    return response;
  }

  async register(userData: RegisterForm): Promise<ApiResponse> {
    return this.request<ApiResponse>('/webhook/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async logout(): Promise<void> {
    await this.removeToken();
    // Optional: Call logout endpoint if you have one
    // await this.request('/webhook/auth/logout', { method: 'POST' });
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
    const endpoint = `/webhook/leads${queryString ? `?${queryString}` : ''}`;

    return this.request<LeadsListResponse>(endpoint, {
      method: 'GET',
    });
  }

  async getLead(leadId: number): Promise<LeadDetailResponse> {
    return this.request<LeadDetailResponse>(`/webhook/leads/${leadId}`, {
      method: 'GET',
    });
  }

  async createLead(leadData: LeadForm): Promise<ApiResponse<Lead>> {
    return this.request<ApiResponse<Lead>>('/webhook/leads', {
      method: 'POST',
      body: JSON.stringify(leadData),
    });
  }

  async updateLeadStatus(
    leadId: number, 
    status: string
  ): Promise<ApiResponse<Lead>> {
    return this.request<ApiResponse<Lead>>(`/webhook/leads/${leadId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async updateLead(
    leadId: number, 
    leadData: Partial<LeadForm>
  ): Promise<ApiResponse<Lead>> {
    return this.request<ApiResponse<Lead>>(`/webhook/leads/${leadId}`, {
      method: 'PUT',
      body: JSON.stringify(leadData),
    });
  }

  async deleteLead(leadId: number): Promise<ApiResponse> {
    return this.request<ApiResponse>(`/webhook/leads/${leadId}`, {
      method: 'DELETE',
    });
  }

  // Tasks endpoints (for future implementation)
  async getTasks(params?: any): Promise<any> {
    const searchParams = new URLSearchParams(params);
    const queryString = searchParams.toString();
    const endpoint = `/webhook/tasks${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint, {
      method: 'GET',
    });
  }

  async createTask(taskData: any): Promise<any> {
    return this.request('/webhook/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  }

  async updateTask(taskId: number, taskData: any): Promise<any> {
    return this.request(`/webhook/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    });
  }

  // Interactions endpoints (for future implementation)
  async getLeadInteractions(leadId: number): Promise<any> {
    return this.request(`/webhook/leads/${leadId}/interactions`, {
      method: 'GET',
    });
  }

  async addInteraction(interactionData: any): Promise<any> {
    return this.request('/webhook/interactions', {
      method: 'POST',
      body: JSON.stringify(interactionData),
    });
  }

  // Health check endpoint
  async healthCheck(): Promise<{ status: string }> {
    return this.request('/webhook/health', {
      method: 'GET',
    });
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;