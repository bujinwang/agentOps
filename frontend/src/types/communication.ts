export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  description: string;
  required: boolean;
  defaultValue?: any;
}

export interface TemplateCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in_range';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface CommunicationTemplate {
  id: number;
  name: string;
  category: string;
  subjectTemplate?: string;
  contentTemplate: string;
  variables: Record<string, TemplateVariable>;
  conditions: TemplateCondition[];
  isActive: boolean;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateVariant {
  id: number;
  templateId: number;
  variantName: string;
  subjectTemplate?: string;
  contentTemplate: string;
  isControl: boolean;
  weight: number;
  createdAt: string;
}

export interface TemplateUsage {
  id: number;
  templateId: number;
  variantId?: number;
  leadId: number;
  communicationType: 'email' | 'sms' | 'push';
  sentAt: string;
  openedAt?: string;
  clickedAt?: string;
  respondedAt?: string;
  responseData?: Record<string, any>;
  deliveryStatus: 'sent' | 'delivered' | 'failed' | 'bounced';
}

export interface TemplatePreview {
  subject?: string;
  content: string;
  variables: Record<string, any>;
  validationErrors: string[];
}

export interface ABTestResult {
  templateId: number;
  variantId: number;
  variantName: string;
  sentCount: number;
  openRate: number;
  clickRate: number;
  responseRate: number;
  conversionRate: number;
  confidence: number;
  isWinner: boolean;
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon?: string;
  templatesCount: number;
}

export interface TemplateSearchFilters {
  category?: string;
  searchTerm?: string;
  isActive?: boolean;
  createdBy?: number;
}

export interface TemplateRenderContext {
  leadData: Record<string, any>;
  agentData: Record<string, any>;
  templateData: Record<string, any>;
  customVariables?: Record<string, any>;
}

export interface TemplateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingVariables: string[];
  unusedVariables: string[];
}

export interface CommunicationTemplateForm {
  name: string;
  category: string;
  subjectTemplate?: string;
  contentTemplate: string;
  variables: Record<string, TemplateVariable>;
  conditions: TemplateCondition[];
  isActive: boolean;
}

export interface TemplateVariantForm {
  variantName: string;
  subjectTemplate?: string;
  contentTemplate: string;
  weight: number;
}

export interface ABTestConfiguration {
  templateId: number;
  variants: TemplateVariantForm[];
  testDuration: number; // days
  sampleSize: number;
  targetMetric: 'open_rate' | 'click_rate' | 'response_rate' | 'conversion_rate';
  confidenceLevel: number;
}

export interface TemplateAnalytics {
  templateId: number;
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalResponded: number;
  openRate: number;
  clickRate: number;
  responseRate: number;
  averageResponseTime: number; // hours
  bestPerformingVariant?: number;
  abTestResults?: ABTestResult[];
}

export interface TemplateLibrary {
  categories: TemplateCategory[];
  templates: CommunicationTemplate[];
  totalCount: number;
  filters: TemplateSearchFilters;
}

export interface TemplateEditorState {
  template: CommunicationTemplateForm;
  preview: TemplatePreview;
  validation: TemplateValidationResult;
  isDirty: boolean;
  lastSaved?: string;
}

export interface CommunicationWorkflow {
  id: number;
  name: string;
  description: string;
  triggerConditions: TemplateCondition[];
  templateSequence: {
    templateId: number;
    delayHours: number;
    conditions?: TemplateCondition[];
  }[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowExecution {
  id: number;
  workflowId: number;
  leadId: number;
  currentStep: number;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  nextExecutionAt?: string;
  executionHistory: {
    step: number;
    templateId: number;
    sentAt: string;
    status: 'sent' | 'failed' | 'skipped';
    errorMessage?: string;
  }[];
}