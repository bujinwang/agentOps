// Property Status Management Types
// Comprehensive type definitions for property status tracking and management

import { PropertyStatus } from './property';

export type StatusChangeReason =
  | 'manual_update'
  | 'mls_sync'
  | 'contract_signed'
  | 'listing_expired'
  | 'price_change'
  | 'property_sold'
  | 'withdrawn_by_seller'
  | 'inspection_issues'
  | 'financing_fallen_through'
  | 'buyer_backed_out'
  | 'other';

export type StatusTransitionType =
  | 'user_initiated'
  | 'mls_automatic'
  | 'scheduled_update'
  | 'bulk_operation'
  | 'system_generated';

export type StatusValidationSeverity =
  | 'error'
  | 'warning'
  | 'info';

export type StatusAnalyticsPeriod =
  | 'day'
  | 'week'
  | 'month'
  | 'quarter'
  | 'year';

// Status Change Interface
export interface StatusChange {
  id: string;
  property_id: number;
  old_status: PropertyStatus;
  new_status: PropertyStatus;
  changed_by: number;
  changed_by_name?: string;
  change_reason: StatusChangeReason;
  custom_reason?: string;
  change_date: string;
  transition_type: StatusTransitionType;
  mls_update: boolean;
  mls_transaction_id?: string;
  automated: boolean;
  requires_approval: boolean;
  approved_by?: number;
  approved_at?: string;
  metadata?: Record<string, any>;
  notes?: string;
}

// Status Transition Rule
export interface StatusTransitionRule {
  id: string;
  from_status: PropertyStatus;
  to_status: PropertyStatus;
  requires_reason: boolean;
  requires_approval: boolean;
  allowed_roles: string[];
  validation_rules: StatusValidationRule[];
  automatic_transitions: StatusAutomaticTransition[];
  notifications: StatusNotificationRule[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Status Validation Rule
export interface StatusValidationRule {
  id: string;
  rule_type: 'required_field' | 'date_validation' | 'business_rule' | 'custom_validation';
  field_name?: string;
  validation_function: string; // Function name or code
  error_message: string;
  severity: StatusValidationSeverity;
  active: boolean;
}

// Status Automatic Transition
export interface StatusAutomaticTransition {
  id: string;
  trigger_condition: string; // SQL condition or function name
  delay_days?: number;
  notification_days_before?: number;
  active: boolean;
}

// Status Notification Rule
export interface StatusNotificationRule {
  id: string;
  notification_type: 'email' | 'push' | 'sms' | 'in_app';
  recipient_roles: string[];
  recipient_users?: number[];
  template_id?: string;
  subject_template?: string;
  message_template: string;
  active: boolean;
}

// Status History Interface
export interface StatusHistory {
  property_id: number;
  current_status: PropertyStatus;
  total_changes: number;
  first_status: PropertyStatus;
  first_status_date: string;
  last_changed: string;
  last_changed_by: number;
  last_changed_by_name?: string;
  change_frequency: number; // changes per month
  status_duration_days: number; // days in current status
  changes: StatusChange[];
  status_timeline: StatusTimelineEntry[];
}

// Status Timeline Entry
export interface StatusTimelineEntry {
  status: PropertyStatus;
  start_date: string;
  end_date?: string;
  duration_days: number;
  changed_by: number;
  changed_by_name?: string;
  reason: StatusChangeReason;
  custom_reason?: string;
}

// Status Validation Result
export interface StatusValidationResult {
  isValid: boolean;
  errors: StatusValidationError[];
  warnings: StatusValidationError[];
  infos: StatusValidationError[];
  suggested_actions?: string[];
}

export interface StatusValidationError {
  field?: string;
  rule_id?: string;
  message: string;
  severity: StatusValidationSeverity;
  suggested_fix?: string;
}

// Status Change Request
export interface StatusChangeRequest {
  property_id: number;
  new_status: PropertyStatus;
  change_reason: StatusChangeReason;
  custom_reason?: string;
  notes?: string;
  requires_approval: boolean;
  scheduled_date?: string;
  metadata?: Record<string, any>;
}

// Status Bulk Operation
export interface StatusBulkOperation {
  operation_id: string;
  property_ids: number[];
  new_status: PropertyStatus;
  change_reason: StatusChangeReason;
  custom_reason?: string;
  notes?: string;
  created_by: number;
  created_at: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results?: StatusBulkOperationResult[];
}

export interface StatusBulkOperationResult {
  property_id: number;
  success: boolean;
  error_message?: string;
  old_status?: PropertyStatus;
  new_status?: PropertyStatus;
}

// Status Analytics
export interface StatusAnalytics {
  property_id?: number; // If null, represents global analytics
  period: StatusAnalyticsPeriod;
  start_date: string;
  end_date: string;

  // Status distribution
  status_distribution: Record<PropertyStatus, number>;
  status_percentages: Record<PropertyStatus, number>;

  // Transition metrics
  total_transitions: number;
  transitions_by_type: Record<StatusTransitionType, number>;
  top_transition_paths: StatusTransitionPath[];

  // Time-based metrics
  average_status_duration: Record<PropertyStatus, number>;
  status_change_frequency: number;

  // Performance metrics
  mls_sync_success_rate: number;
  automated_transition_success_rate: number;
  manual_transition_avg_time: number;

  // Trend data
  status_trends: StatusTrendData[];
  transition_trends: StatusTransitionTrend[];
}

export interface StatusTransitionPath {
  from_status: PropertyStatus;
  to_status: PropertyStatus;
  count: number;
  percentage: number;
  avg_duration_days: number;
}

export interface StatusTrendData {
  date: string;
  status_counts: Record<PropertyStatus, number>;
  total_properties: number;
  new_transitions: number;
}

export interface StatusTransitionTrend {
  date: string;
  transition_count: number;
  top_transitions: StatusTransitionPath[];
}

// Status Dashboard Data
export interface StatusDashboardData {
  overview: {
    total_properties: number;
    active_listings: number;
    recent_changes: number;
    pending_approvals: number;
  };

  status_breakdown: Array<{
    status: PropertyStatus;
    count: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
    avg_duration_days: number;
  }>;

  recent_activity: StatusChange[];
  upcoming_transitions: Array<{
    property_id: number;
    property_title: string;
    current_status: PropertyStatus;
    new_status: PropertyStatus;
    scheduled_date: string;
    days_until: number;
  }>;

  alerts: StatusAlert[];
}

export interface StatusAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  property_id?: number;
  action_required: boolean;
  action_url?: string;
  created_at: string;
  acknowledged: boolean;
}

// Status Report
export interface StatusReport {
  id: string;
  title: string;
  description?: string;
  report_type: 'property_status' | 'transition_analysis' | 'performance_metrics' | 'custom';
  date_range: {
    start: string;
    end: string;
  };
  filters: {
    property_ids?: number[];
    statuses?: PropertyStatus[];
    transition_types?: StatusTransitionType[];
    changed_by?: number[];
  };
  generated_at: string;
  generated_by: number;
  data: StatusAnalytics;
  format: 'json' | 'csv' | 'pdf';
}

// Status Configuration
export interface StatusConfiguration {
  transition_rules: StatusTransitionRule[];
  validation_rules: StatusValidationRule[];
  notification_rules: StatusNotificationRule[];
  automatic_transitions: StatusAutomaticTransition[];
  approval_workflows: StatusApprovalWorkflow[];
  custom_reasons: StatusCustomReason[];
  system_settings: StatusSystemSettings;
}

export interface StatusApprovalWorkflow {
  id: string;
  name: string;
  description?: string;
  trigger_transitions: Array<{
    from_status: PropertyStatus;
    to_status: PropertyStatus;
  }>;
  approvers: Array<{
    role: string;
    user_id?: number;
    required: boolean;
  }>;
  approval_criteria: string;
  auto_approve_after_days?: number;
  active: boolean;
}

export interface StatusCustomReason {
  id: string;
  reason: StatusChangeReason;
  label: string;
  description?: string;
  requires_additional_info: boolean;
  active: boolean;
}

export interface StatusSystemSettings {
  enable_audit_logging: boolean;
  enable_automatic_transitions: boolean;
  enable_notifications: boolean;
  enable_analytics: boolean;
  max_history_retention_days: number;
  bulk_operation_batch_size: number;
  approval_timeout_days: number;
  mls_sync_interval_minutes: number;
}

// API Response Types
export interface StatusAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    execution_time: number;
    total_count?: number;
    page?: number;
    page_size?: number;
  };
}

export interface StatusHistoryResponse extends StatusAPIResponse<StatusHistory> {}
export interface StatusChangeResponse extends StatusAPIResponse<StatusChange> {}
export interface StatusAnalyticsResponse extends StatusAPIResponse<StatusAnalytics> {}
export interface StatusDashboardResponse extends StatusAPIResponse<StatusDashboardData> {}

// Form Types
export interface StatusChangeFormData {
  property_id: number;
  new_status: PropertyStatus;
  change_reason: StatusChangeReason;
  custom_reason?: string;
  notes?: string;
  scheduled_date?: string;
  requires_approval: boolean;
  attachments?: string[]; // File URLs
}

export interface StatusBulkFormData {
  property_ids: number[];
  new_status: PropertyStatus;
  change_reason: StatusChangeReason;
  custom_reason?: string;
  notes?: string;
  confirm_bulk_operation: boolean;
}

// Utility Types
export type StatusChangeAction = 'approve' | 'reject' | 'cancel' | 'modify';
export type StatusReportFormat = 'json' | 'csv' | 'pdf' | 'excel';

// Constants
export const STATUS_CHANGE_REASONS: Record<StatusChangeReason, string> = {
  manual_update: 'Manual Update',
  mls_sync: 'MLS Synchronization',
  contract_signed: 'Contract Signed',
  listing_expired: 'Listing Expired',
  price_change: 'Price Change',
  property_sold: 'Property Sold',
  withdrawn_by_seller: 'Withdrawn by Seller',
  inspection_issues: 'Inspection Issues',
  financing_fallen_through: 'Financing Fallen Through',
  buyer_backed_out: 'Buyer Backed Out',
  other: 'Other'
};

export const STATUS_TRANSITION_TYPES: Record<StatusTransitionType, string> = {
  user_initiated: 'User Initiated',
  mls_automatic: 'MLS Automatic',
  scheduled_update: 'Scheduled Update',
  bulk_operation: 'Bulk Operation',
  system_generated: 'System Generated'
};

export const STATUS_VALIDATION_SEVERITIES: Record<StatusValidationSeverity, string> = {
  error: 'Error',
  warning: 'Warning',
  info: 'Info'
};

// Helper Functions
export function getStatusChangeReasonLabel(reason: StatusChangeReason): string {
  return STATUS_CHANGE_REASONS[reason] || reason;
}

export function getStatusTransitionTypeLabel(type: StatusTransitionType): string {
  return STATUS_TRANSITION_TYPES[type] || type;
}

export function getStatusValidationSeverityLabel(severity: StatusValidationSeverity): string {
  return STATUS_VALIDATION_SEVERITIES[severity] || severity;
}

export function isValidStatusTransition(
  fromStatus: PropertyStatus,
  toStatus: PropertyStatus,
  rules: StatusTransitionRule[]
): boolean {
  return rules.some(rule =>
    rule.from_status === fromStatus &&
    rule.to_status === toStatus &&
    rule.active
  );
}

export function getRequiredApprovers(
  fromStatus: PropertyStatus,
  toStatus: PropertyStatus,
  workflows: StatusApprovalWorkflow[]
): Array<{ role: string; user_id?: number; required: boolean }> {
  const workflow = workflows.find(w =>
    w.active && w.trigger_transitions.some(t =>
      t.from_status === fromStatus && t.to_status === toStatus
    )
  );

  return workflow?.approvers || [];
}