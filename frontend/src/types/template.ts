export type TemplateCategory =
  | 'initial_contact'
  | 'follow_up'
  | 'property_showing'
  | 'proposal'
  | 'negotiation'
  | 'closing'
  | 'thank_you'
  | 'nurturing'
  | 're_engagement';

export type CommunicationChannel = 'email' | 'sms' | 'in_app' | 'push';

export type TemplateStatus = 'draft' | 'active' | 'archived' | 'testing';

export type VariableType = 'string' | 'number' | 'date' | 'currency' | 'boolean' | 'array';

export type VariableSource = 'lead' | 'property' | 'agent' | 'system' | 'custom';

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'between'
  | 'in'
  | 'not_in'
  | 'exists'
  | 'not_exists';

export interface TemplateVariable {
  id: string;
  name: string; // e.g., 'leadName', 'propertyType'
  displayName: string; // e.g., 'Lead Name', 'Property Type'
  type: VariableType;
  source: VariableSource;
  description: string;
  required: boolean;
  fallback: string;
  validation?: VariableValidation;
  examples: string[];
  category?: string; // grouping for UI
}

export interface VariableValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
  allowedValues?: string[];
  format?: 'email' | 'phone' | 'currency' | 'date';
}

export interface TemplateCondition {
  id: string;
  variable: string; // variable name to check
  operator: ConditionOperator;
  value: any;
  weight: number; // 0-100, higher = more important for matching
  description?: string;
}

export interface TemplatePerformance {
  templateId: string;
  usageCount: number;
  sentCount: number;
  openRate: number;
  clickRate: number;
  responseRate: number;
  conversionRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  averageResponseTime: number; // in hours
  lastUsed: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateVersion {
  id: string;
  version: number;
  templateId: string;
  content: string;
  subject?: string;
  variables: TemplateVariable[];
  conditions: TemplateCondition[];
  createdBy: number;
  createdAt: string;
  changeLog?: string;
  isActive: boolean;
}

export interface CommunicationTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  channel: CommunicationChannel;
  status: TemplateStatus;
  subject?: string; // for email templates
  content: string; // HTML for email, text for SMS
  variables: TemplateVariable[];
  conditions: TemplateCondition[];
  tags: string[];
  priority: number; // 1-10, higher = preferred for matching
  isDefault: boolean; // fallback template for category
  createdBy: number;
  updatedBy: number;
  createdAt: string;
  updatedAt: string;
  performance?: TemplatePerformance;
  currentVersion: TemplateVersion;
  versions: TemplateVersion[];
}

export interface TemplateMatch {
  template: CommunicationTemplate;
  score: number; // 0-100, how well it matches
  matchedConditions: string[]; // which conditions were met
  missingConditions: string[]; // which conditions weren't met
  variableCoverage: number; // percentage of variables that can be populated
  confidence: 'high' | 'medium' | 'low';
}

export interface TemplateSelectionCriteria {
  leadId?: number;
  leadData?: Record<string, any>;
  category?: TemplateCategory;
  channel?: CommunicationChannel;
  context?: Record<string, any>; // additional context like workflow step, urgency, etc.
  excludeTemplates?: string[]; // template IDs to exclude
  minScore?: number; // minimum match score required
  maxResults?: number; // maximum number of matches to return
}

export interface TemplateRenderingContext {
  lead: Record<string, any>;
  property?: Record<string, any>;
  agent: Record<string, any>;
  system: Record<string, any>;
  custom?: Record<string, any>;
}

export interface RenderedTemplate {
  templateId: string;
  channel: CommunicationChannel;
  subject?: string;
  content: string;
  variablesUsed: Record<string, any>;
  renderedAt: string;
  renderingTime: number; // in milliseconds
}

// A/B Testing Interfaces
export interface ABTestVariant {
  id: string;
  name: string;
  templateId: string;
  subject?: string;
  content: string;
  variables: TemplateVariable[];
  weight: number; // percentage of traffic (0-100)
  isControl: boolean; // true for control variant
}

export interface ABTestCriteria {
  targetMetric: 'open_rate' | 'click_rate' | 'response_rate' | 'conversion_rate';
  minimumSampleSize: number;
  confidenceLevel: number; // 0.80, 0.90, 0.95, etc.
  testDuration: number; // in days
  winnerThreshold: number; // minimum improvement percentage
}

export interface ABTestResults {
  testId: string;
  totalSent: number;
  variants: Array<{
    variantId: string;
    sent: number;
    opens: number;
    clicks: number;
    responses: number;
    conversions: number;
    openRate: number;
    clickRate: number;
    responseRate: number;
    conversionRate: number;
  }>;
  winner?: string; // variant ID of the winner
  confidence: number; // statistical confidence in results
  improvement: number; // percentage improvement over control
  completedAt?: string;
  isSignificant: boolean;
}

export interface ABTest {
  id: string;
  name: string;
  description: string;
  templateId: string; // base template being tested
  category: TemplateCategory;
  channel: CommunicationChannel;
  status: 'draft' | 'active' | 'completed' | 'paused' | 'cancelled';
  variants: ABTestVariant[];
  criteria: ABTestCriteria;
  results?: ABTestResults;
  createdBy: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  updatedAt: string;
}

// Template Library and Organization
export interface TemplateFolder {
  id: string;
  name: string;
  description?: string;
  parentId?: string; // for nested folders
  color?: string;
  icon?: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateTag {
  id: string;
  name: string;
  color: string;
  description?: string;
  usageCount: number;
  createdBy: number;
  createdAt: string;
}

export interface TemplateSearchFilters {
  category?: TemplateCategory[];
  channel?: CommunicationChannel[];
  status?: TemplateStatus[];
  tags?: string[];
  createdBy?: number[];
  dateRange?: {
    start: string;
    end: string;
  };
  performance?: {
    minUsage?: number;
    minOpenRate?: number;
    minResponseRate?: number;
  };
  text?: string; // search in name, description, content
}

// Template Analytics and Insights
export interface TemplateAnalytics {
  templateId: string;
  period: {
    start: string;
    end: string;
  };
  metrics: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    responded: number;
    converted: number;
    bounced: number;
    unsubscribed: number;
  };
  rates: {
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    responseRate: number;
    conversionRate: number;
    bounceRate: number;
    unsubscribeRate: number;
  };
  timing: {
    averageResponseTime: number;
    peakUsageHours: number[];
    bestPerformingDays: string[];
  };
  segments: Array<{
    segment: string;
    sent: number;
    performance: number;
  }>;
  trends: Array<{
    date: string;
    sent: number;
    openRate: number;
    responseRate: number;
  }>;
}

// Template Recommendation Engine
export interface TemplateRecommendation {
  templateId: string;
  score: number; // 0-100
  reasons: string[]; // why this template is recommended
  confidence: 'high' | 'medium' | 'low';
  expectedPerformance: {
    openRate: number;
    responseRate: number;
    conversionRate: number;
  };
  similarTemplates: string[]; // IDs of similar templates
}

export interface RecommendationContext {
  leadId?: number;
  leadData?: Record<string, any>;
  category: TemplateCategory;
  channel: CommunicationChannel;
  previousTemplates?: string[]; // recently used template IDs
  goal?: 'engagement' | 'conversion' | 'nurturing' | 'closing';
  urgency?: 'low' | 'medium' | 'high';
  context?: Record<string, any>;
}

// Template Approval Workflow
export interface TemplateApproval {
  id: string;
  templateId: string;
  versionId: string;
  requestedBy: number;
  approvedBy?: number;
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  reviewComments?: string;
  changesRequested?: string;
  requestedAt: string;
  reviewedAt?: string;
  approvalDeadline?: string;
}

export interface ApprovalWorkflow {
  id: string;
  name: string;
  description: string;
  approvers: number[]; // user IDs who can approve
  autoApproveThreshold?: number; // usage count threshold for auto-approval
  requireReviewFor: TemplateCategory[];
  notifyOnApproval: boolean;
  createdBy: number;
  createdAt: string;
  isActive: boolean;
}

// Template Import/Export
export interface TemplateExport {
  version: string;
  exportedAt: string;
  exportedBy: number;
  templates: CommunicationTemplate[];
  folders?: TemplateFolder[];
  tags?: TemplateTag[];
  metadata: {
    totalTemplates: number;
    categories: Record<TemplateCategory, number>;
    channels: Record<CommunicationChannel, number>;
  };
}

export interface TemplateImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: Array<{
    template: string;
    error: string;
  }>;
  warnings: Array<{
    template: string;
    warning: string;
  }>;
}

// Template Personalization Rules
export interface PersonalizationRule {
  id: string;
  name: string;
  description: string;
  conditions: TemplateCondition[];
  actions: PersonalizationAction[];
  priority: number;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface PersonalizationAction {
  type: 'set_variable' | 'modify_content' | 'change_template' | 'add_attachment';
  target: string; // variable name, content section, template ID
  value: any;
  condition?: TemplateCondition; // additional condition for this action
}

// Template Preview and Testing
export interface TemplatePreview {
  templateId: string;
  variables: Record<string, any>;
  channel: CommunicationChannel;
  renderedContent: string;
  renderedSubject?: string;
  validationErrors: string[];
  warnings: string[];
  previewId: string;
  generatedAt: string;
}

export interface TemplateTest {
  id: string;
  templateId: string;
  testType: 'rendering' | 'validation' | 'performance' | 'compatibility';
  testData: Record<string, any>;
  results: {
    success: boolean;
    duration: number;
    errors: string[];
    warnings: string[];
    metrics?: Record<string, any>;
  };
  executedAt: string;
  executedBy: number;
}

// Constants and Enums
export const TEMPLATE_CATEGORIES: Record<TemplateCategory, { name: string; description: string; icon: string }> = {
  initial_contact: {
    name: 'Initial Contact',
    description: 'First communication with a new lead',
    icon: 'handshake'
  },
  follow_up: {
    name: 'Follow-up',
    description: 'Regular check-ins and updates',
    icon: 'clock'
  },
  property_showing: {
    name: 'Property Showing',
    description: 'Communications around property viewings',
    icon: 'home'
  },
  proposal: {
    name: 'Proposal',
    description: 'Presenting offers and proposals',
    icon: 'file-text'
  },
  negotiation: {
    name: 'Negotiation',
    description: 'Price and terms negotiation',
    icon: 'scale'
  },
  closing: {
    name: 'Closing',
    description: 'Final steps to close the deal',
    icon: 'trophy'
  },
  thank_you: {
    name: 'Thank You',
    description: 'Post-interaction appreciation',
    icon: 'heart'
  },
  nurturing: {
    name: 'Nurturing',
    description: 'Long-term relationship building',
    icon: 'seedling'
  },
  re_engagement: {
    name: 'Re-engagement',
    description: 'Reconnecting with inactive leads',
    icon: 'refresh'
  }
};

export const COMMUNICATION_CHANNELS: Record<CommunicationChannel, { name: string; description: string; icon: string }> = {
  email: {
    name: 'Email',
    description: 'HTML and text email messages',
    icon: 'mail'
  },
  sms: {
    name: 'SMS',
    description: 'Text messages and notifications',
    icon: 'message-square'
  },
  in_app: {
    name: 'In-App',
    description: 'In-application notifications',
    icon: 'smartphone'
  },
  push: {
    name: 'Push Notification',
    description: 'Mobile push notifications',
    icon: 'bell'
  }
};