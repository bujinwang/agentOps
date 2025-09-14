export interface ConversionEvent {
  id: number;
  leadId: number;
  eventType: 'contact_made' | 'qualified' | 'showing_scheduled' | 'showing_completed' | 'offer_submitted' | 'offer_accepted' | 'sale_closed';
  eventDescription: string;
  eventData?: Record<string, any>;
  eventTimestamp: string;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConversionTimeline {
  leadId: number;
  events: ConversionEvent[];
  totalEvents: number;
  lastEvent: ConversionEvent | null;
}

export interface ConversionFunnelStage {
  stage: string;
  name: string;
  order: number;
  leadsInStage: number;
  leadsAtStage: number;
  conversionRate: number;
  averageDaysInStage: number;
  totalValue: number;
}

export interface ConversionFunnelData {
  funnelName: string;
  stages: ConversionFunnelStage[];
  totalLeads: number;
  overallConversionRate: number;
  averageTimeToConvert: number;
}

export interface ConversionMetrics {
  totalConversions: number;
  conversionRate: number;
  averageTimeToConvert: number;
  topConversionStages: Array<{
    stage: string;
    count: number;
    percentage: number;
  }>;
  conversionTrends: Array<{
    date: string;
    conversions: number;
    rate: number;
  }>;
}

export interface ConversionStatusUpdate {
  newStatus: string;
  newStage: number;
  notes?: string;
  updatedBy?: number;
}

export interface ConversionEventTemplate {
  type: ConversionEvent['eventType'];
  name: string;
  description: string;
  requiredFields?: string[];
  icon?: string;
  color?: string;
}

export const CONVERSION_EVENT_TEMPLATES: ConversionEventTemplate[] = [
  {
    type: 'contact_made',
    name: 'Contact Made',
    description: 'Initial contact established with the lead',
    requiredFields: ['contactMethod', 'contactPerson'],
    icon: 'phone',
    color: '#4CAF50'
  },
  {
    type: 'qualified',
    name: 'Qualified',
    description: 'Lead meets basic qualification criteria',
    requiredFields: ['qualificationCriteria', 'qualifiedBy'],
    icon: 'check-circle',
    color: '#2196F3'
  },
  {
    type: 'showing_scheduled',
    name: 'Showing Scheduled',
    description: 'Property showing appointment arranged',
    requiredFields: ['propertyId', 'showingDate', 'showingTime'],
    icon: 'calendar',
    color: '#FF9800'
  },
  {
    type: 'showing_completed',
    name: 'Showing Completed',
    description: 'Property showing has been conducted',
    requiredFields: ['propertyId', 'showingDate', 'leadFeedback'],
    icon: 'home',
    color: '#9C27B0'
  },
  {
    type: 'offer_submitted',
    name: 'Offer Submitted',
    description: 'Purchase offer has been submitted',
    requiredFields: ['offerAmount', 'offerDate', 'propertyId'],
    icon: 'dollar-sign',
    color: '#FF5722'
  },
  {
    type: 'offer_accepted',
    name: 'Offer Accepted',
    description: 'Purchase offer has been accepted',
    requiredFields: ['offerAmount', 'acceptanceDate', 'closingDate'],
    icon: 'check',
    color: '#4CAF50'
  },
  {
    type: 'sale_closed',
    name: 'Sale Closed',
    description: 'Transaction has been completed',
    requiredFields: ['closingDate', 'finalPrice', 'commission'],
    icon: 'trophy',
    color: '#FFD700'
  }
];

export interface ConversionFunnelConfig {
  id: number;
  name: string;
  description: string;
  stages: Array<{
    stage: string;
    name: string;
    order: number;
    description: string;
  }>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConversionPrediction {
  leadId: number;
  predictedConversionProbability: number;
  predictedTimeToConvert: number; // in days
  confidence: number;
  factors: Array<{
    factor: string;
    impact: number;
    weight: number;
  }>;
  lastUpdated: string;
}

export interface ConversionAlert {
  id: number;
  leadId: number;
  alertType: 'stage_milestone' | 'time_threshold' | 'probability_change' | 'bottleneck_warning';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  isRead: boolean;
  createdAt: string;
  actionRequired?: string;
  actionUrl?: string;
}