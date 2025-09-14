import {
  CommunicationTemplate,
  TemplateVariant,
  TemplateUsage,
  TemplateAnalytics,
  ABTestResult,
  TemplateLibrary,
  TemplateSearchFilters,
  CommunicationWorkflow,
  WorkflowExecution
} from '../types/communication';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TemplateCreateRequest {
  name: string;
  category: string;
  subjectTemplate?: string;
  contentTemplate: string;
  variables: Record<string, any>;
  conditions: any[];
  isActive?: boolean;
}

export interface TemplateUpdateRequest extends Partial<TemplateCreateRequest> {
  id: number;
}

export interface TemplateUsageRequest {
  templateId: number;
  variantId?: number;
  leadId: number;
  communicationType: 'email' | 'sms' | 'push';
  responseData?: Record<string, any>;
}

export interface ABTestCreateRequest {
  templateId: number;
  variants: Array<{
    variantName: string;
    subjectTemplate?: string;
    contentTemplate: string;
    weight: number;
  }>;
  testDuration: number;
  sampleSize: number;
  targetMetric: 'open_rate' | 'click_rate' | 'response_rate' | 'conversion_rate';
  confidenceLevel: number;
}

class CommunicationApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'http://localhost:5678/webhook'; // n8n webhook base URL
  }

  // Template CRUD Operations

  async getTemplates(filters?: TemplateSearchFilters): Promise<ApiResponse<PaginatedResponse<CommunicationTemplate>>> {
    try {
      const queryParams = new URLSearchParams();

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, String(value));
          }
        });
      }

      const response = await fetch(`${this.baseUrl}/communication/templates?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch templates'
      };
    }
  }

  async getTemplate(id: number): Promise<ApiResponse<CommunicationTemplate>> {
    try {
      const response = await fetch(`${this.baseUrl}/communication/templates/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch template'
      };
    }
  }

  async createTemplate(template: TemplateCreateRequest): Promise<ApiResponse<CommunicationTemplate>> {
    try {
      const response = await fetch(`${this.baseUrl}/communication/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(template),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create template'
      };
    }
  }

  async updateTemplate(template: TemplateUpdateRequest): Promise<ApiResponse<CommunicationTemplate>> {
    try {
      const { id, ...updateData } = template;
      const response = await fetch(`${this.baseUrl}/communication/templates/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update template'
      };
    }
  }

  async deleteTemplate(id: number): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(`${this.baseUrl}/communication/templates/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete template'
      };
    }
  }

  // Template Variants

  async getTemplateVariants(templateId: number): Promise<ApiResponse<TemplateVariant[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/communication/templates/${templateId}/variants`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch template variants'
      };
    }
  }

  async createTemplateVariant(
    templateId: number,
    variant: {
      variantName: string;
      subjectTemplate?: string;
      contentTemplate: string;
      weight: number;
    }
  ): Promise<ApiResponse<TemplateVariant>> {
    try {
      const response = await fetch(`${this.baseUrl}/communication/templates/${templateId}/variants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(variant),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create template variant'
      };
    }
  }

  // Template Usage Tracking

  async trackTemplateUsage(usage: TemplateUsageRequest): Promise<ApiResponse<TemplateUsage>> {
    try {
      const response = await fetch(`${this.baseUrl}/communication/templates/usage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(usage),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to track template usage'
      };
    }
  }

  async updateTemplateUsage(
    usageId: number,
    updates: Partial<Pick<TemplateUsage, 'openedAt' | 'clickedAt' | 'respondedAt' | 'responseData' | 'deliveryStatus'>>
  ): Promise<ApiResponse<TemplateUsage>> {
    try {
      const response = await fetch(`${this.baseUrl}/communication/templates/usage/${usageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update template usage'
      };
    }
  }

  // Template Analytics

  async getTemplateAnalytics(templateId: number): Promise<ApiResponse<TemplateAnalytics>> {
    try {
      const response = await fetch(`${this.baseUrl}/communication/templates/${templateId}/analytics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch template analytics'
      };
    }
  }

  async getABTestResults(templateId: number): Promise<ApiResponse<ABTestResult[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/communication/templates/${templateId}/ab-test-results`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch A/B test results'
      };
    }
  }

  // Template Library

  async getTemplateLibrary(filters?: TemplateSearchFilters): Promise<ApiResponse<TemplateLibrary>> {
    try {
      const queryParams = new URLSearchParams();

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, String(value));
          }
        });
      }

      const response = await fetch(`${this.baseUrl}/communication/templates/library?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch template library'
      };
    }
  }

  // Template Rendering

  async renderTemplate(
    templateId: number,
    context: {
      leadId: number;
      customVariables?: Record<string, any>;
    }
  ): Promise<ApiResponse<{ subject?: string; content: string; templateId: number; variantId?: number }>> {
    try {
      const response = await fetch(`${this.baseUrl}/communication/templates/${templateId}/render`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(context),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to render template'
      };
    }
  }

  // Template Suggestions

  async getTemplateSuggestions(leadId: number): Promise<ApiResponse<CommunicationTemplate[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/communication/templates/suggestions/${leadId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get template suggestions'
      };
    }
  }

  // A/B Testing

  async createABTest(testConfig: ABTestCreateRequest): Promise<ApiResponse<{ testId: number; status: string }>> {
    try {
      const response = await fetch(`${this.baseUrl}/communication/templates/ab-tests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testConfig),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create A/B test'
      };
    }
  }

  async getABTestStatus(testId: number): Promise<ApiResponse<{ status: string; results?: ABTestResult[] }>> {
    try {
      const response = await fetch(`${this.baseUrl}/communication/templates/ab-tests/${testId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get A/B test status'
      };
    }
  }

  // Workflow Integration

  async getWorkflows(): Promise<ApiResponse<CommunicationWorkflow[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/communication/workflows`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch workflows'
      };
    }
  }

  async triggerWorkflow(
    workflowId: number,
    leadId: number,
    context?: Record<string, any>
  ): Promise<ApiResponse<WorkflowExecution>> {
    try {
      const response = await fetch(`${this.baseUrl}/communication/workflows/${workflowId}/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leadId, context }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to trigger workflow'
      };
    }
  }
}

// Export singleton instance
export const communicationApiService = new CommunicationApiService();