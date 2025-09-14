// MLS Integration Types and Interfaces

export type MLSProvider = 'rets' | 'reso' | 'custom';

export interface MLSConfig {
  provider: MLSProvider;
  endpoint: string;
  credentials: {
    username: string;
    password: string;
    clientId?: string;
    clientSecret?: string;
  };
  rateLimit: number; // requests per minute
  syncInterval: number; // minutes between syncs
  enabled: boolean;
  lastSync?: Date;
}

export interface MLSFieldMapping {
  mlsField: string;
  internalField: string;
  transform?: (value: any) => any;
  required: boolean;
  validation?: (value: any) => boolean;
  defaultValue?: any;
}

export interface MLSSyncStatus {
  id: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'paused';
  startTime?: Date;
  endTime?: Date;
  recordsProcessed: number;
  recordsUpdated: number;
  recordsCreated: number;
  recordsFailed: number;
  errors: MLSError[];
  nextSync?: Date;
  progress: number; // 0-100
}

export interface MLSError {
  id: string;
  timestamp: Date;
  type: 'api' | 'data' | 'validation' | 'network' | 'auth';
  message: string;
  details?: any;
  mlsRecordId?: string;
  retryable: boolean;
  resolved: boolean;
}

export interface MLSPropertyData {
  mlsId: string;
  listingId: string;
  propertyType: string;
  status: 'active' | 'pending' | 'sold' | 'expired' | 'cancelled';
  price: number;
  address: MLSAddress;
  details: MLSPropertyDetails;
  media: MLSMedia[];
  agent: MLSListingAgent;
  office: MLSOffice;
  dates: MLSDates;
  rawData?: any; // Original MLS data for debugging
}

export interface MLSAddress {
  streetNumber: string;
  streetName: string;
  unitNumber?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
  county?: string;
  neighborhood?: string;
}

export interface MLSPropertyDetails {
  bedrooms: number;
  bathrooms: number;
  halfBathrooms?: number;
  squareFeet: number;
  lotSize?: number;
  yearBuilt?: number;
  propertySubType?: string;
  style?: string;
  stories?: number;
  garageSpaces?: number;
  parkingSpaces?: number;
  heating?: string;
  cooling?: string;
  fireplace?: boolean;
  basement?: string;
  roof?: string;
  exterior?: string;
  interiorFeatures?: string[];
  appliances?: string[];
  description?: string;
  remarks?: string;
}

export interface MLSMedia {
  id: string;
  type: 'photo' | 'video' | 'virtual_tour' | 'floor_plan';
  url: string;
  caption?: string;
  isPrimary: boolean;
  sortOrder: number;
  width?: number;
  height?: number;
}

export interface MLSListingAgent {
  id: string;
  name: string;
  email: string;
  phone?: string;
  licenseNumber?: string;
  photoUrl?: string;
}

export interface MLSOffice {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: MLSAddress;
  logoUrl?: string;
}

export interface MLSDates {
  listed: Date;
  updated: Date;
  offMarket?: Date;
  contract?: Date;
  closed?: Date;
  expiration?: Date;
}

export interface MLSDuplicateCandidate {
  id: string;
  confidence: number; // 0-1
  sourceRecord: MLSPropertyData;
  targetRecord: MLSPropertyData;
  matchReasons: string[];
  suggestedAction: 'merge' | 'keep_both' | 'skip';
  mergeData?: Partial<MLSPropertyData>;
}

export interface MLSDataQualityScore {
  overall: number; // 0-100
  completeness: number; // percentage of required fields
  accuracy: number; // data validation score
  consistency: number; // internal consistency score
  issues: string[];
  recommendations: string[];
}

export interface MLSSyncOptions {
  fullSync: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  propertyTypes?: string[];
  statusFilter?: string[];
  maxRecords?: number;
  skipDuplicates: boolean;
  validateData: boolean;
}

export interface MLSWebhookEvent {
  id: string;
  eventType: 'property_created' | 'property_updated' | 'property_deleted' | 'status_changed';
  mlsId: string;
  listingId: string;
  timestamp: Date;
  data: Partial<MLSPropertyData>;
  processed: boolean;
  processedAt?: Date;
}

// API Response Types
export interface MLSAPIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    page: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
  };
  rateLimit?: {
    remaining: number;
    resetTime: Date;
  };
}

// Service Types
export interface IMLSService {
  authenticate(): Promise<boolean>;
  getProperties(options?: MLSSyncOptions): Promise<MLSPropertyData[]>;
  getPropertyById(mlsId: string): Promise<MLSPropertyData | null>;
  validateConnection(): Promise<boolean>;
  getRateLimitStatus(): Promise<{ remaining: number; resetTime: Date }>;
}

export interface IMLSSyncManager {
  startSync(options?: MLSSyncOptions): Promise<string>; // returns syncId
  stopSync(syncId: string): Promise<void>;
  getSyncStatus(syncId: string): Promise<MLSSyncStatus>;
  getActiveSyncs(): Promise<MLSSyncStatus[]>;
  scheduleSync(cronExpression: string, options?: MLSSyncOptions): Promise<string>;
}

export interface IMLSDuplicateDetector {
  findDuplicates(records: MLSPropertyData[]): Promise<MLSDuplicateCandidate[]>;
  resolveDuplicate(candidate: MLSDuplicateCandidate): Promise<void>;
  getPendingDuplicates(): Promise<MLSDuplicateCandidate[]>;
}

export interface IMLSDataValidator {
  validateRecord(record: MLSPropertyData): Promise<MLSDataQualityScore>;
  validateBatch(records: MLSPropertyData[]): Promise<MLSDataQualityScore[]>;
  getValidationRules(): MLSFieldMapping[];
  updateValidationRules(rules: MLSFieldMapping[]): Promise<void>;
}

// Hook Types
export interface UseMLSSyncReturn {
  syncStatus: MLSSyncStatus | null;
  isLoading: boolean;
  error: string | null;
  startSync: (options?: MLSSyncOptions) => Promise<void>;
  stopSync: () => Promise<void>;
  getSyncHistory: () => Promise<MLSSyncStatus[]>;
}

export interface UseMLSErrorsReturn {
  errors: MLSError[];
  unresolvedCount: number;
  resolveError: (errorId: string) => Promise<void>;
  retryError: (errorId: string) => Promise<void>;
  getErrorSummary: () => { [key: string]: number };
}

// Component Props Types
export interface MLSSyncStatusProps {
  syncId?: string;
  showHistory?: boolean;
  onSyncStart?: (options: MLSSyncOptions) => void;
  onSyncStop?: () => void;
}

export interface MLSErrorHandlerProps {
  errors: MLSError[];
  onResolve?: (errorId: string) => void;
  onRetry?: (errorId: string) => void;
  maxDisplay?: number;
}

export interface MLSDuplicateResolverProps {
  duplicates: MLSDuplicateCandidate[];
  onResolve?: (candidateId: string, action: 'merge' | 'keep_both' | 'skip') => void;
  onPreview?: (candidate: MLSDuplicateCandidate) => void;
}