import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  TemplateVariable,
  VariableType,
  VariableSource,
  VariableValidation,
  TemplateRenderingContext
} from '../types/template';

export interface VariableDefinition {
  name: string;
  type: VariableType;
  source: VariableSource;
  description: string;
  required: boolean;
  fallback: string;
  validation?: VariableValidation;
  examples: string[];
  category?: string;
}

export interface VariableValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedValue?: any;
}

class TemplateVariableService {
  private static instance: TemplateVariableService;
  private variableDefinitions: Map<string, VariableDefinition> = new Map();
  private customVariables: Map<string, TemplateVariable> = new Map();

  private constructor() {
    this.initializeStandardVariables();
    this.loadCustomVariables();
  }

  public static getInstance(): TemplateVariableService {
    if (!TemplateVariableService.instance) {
      TemplateVariableService.instance = new TemplateVariableService();
    }
    return TemplateVariableService.instance;
  }

  private initializeStandardVariables(): void {
    const standardVariables: VariableDefinition[] = [
      // Lead Variables
      {
        name: 'leadName',
        type: 'string',
        source: 'lead',
        description: 'Full name of the lead',
        required: true,
        fallback: 'Valued Customer',
        validation: {
          minLength: 1,
          maxLength: 100,
          pattern: '^[a-zA-Z\\s\\-\']+$'
        },
        examples: ['John Smith', 'Sarah Johnson'],
        category: 'Lead Information'
      },
      {
        name: 'leadFirstName',
        type: 'string',
        source: 'lead',
        description: 'First name of the lead',
        required: false,
        fallback: 'Valued Customer',
        validation: {
          minLength: 1,
          maxLength: 50,
          pattern: '^[a-zA-Z\\-\']+$'
        },
        examples: ['John', 'Sarah'],
        category: 'Lead Information'
      },
      {
        name: 'leadLastName',
        type: 'string',
        source: 'lead',
        description: 'Last name of the lead',
        required: false,
        fallback: '',
        validation: {
          minLength: 1,
          maxLength: 50,
          pattern: '^[a-zA-Z\\-\']+$'
        },
        examples: ['Smith', 'Johnson'],
        category: 'Lead Information'
      },
      {
        name: 'leadEmail',
        type: 'string',
        source: 'lead',
        description: 'Email address of the lead',
        required: true,
        fallback: '',
        validation: {
          format: 'email',
          maxLength: 255
        },
        examples: ['john.smith@email.com', 'sarah.j@example.com'],
        category: 'Lead Contact'
      },
      {
        name: 'leadPhone',
        type: 'string',
        source: 'lead',
        description: 'Phone number of the lead',
        required: false,
        fallback: '',
        validation: {
          format: 'phone',
          minLength: 10,
          maxLength: 15
        },
        examples: ['+1-555-0123', '(555) 123-4567'],
        category: 'Lead Contact'
      },
      {
        name: 'leadScore',
        type: 'number',
        source: 'lead',
        description: 'Current lead score (0-100)',
        required: false,
        fallback: '0',
        validation: {
          min: 0,
          max: 100
        },
        examples: ['85', '72'],
        category: 'Lead Scoring'
      },
      {
        name: 'leadStage',
        type: 'string',
        source: 'lead',
        description: 'Current stage in sales funnel',
        required: false,
        fallback: 'New Lead',
        validation: {
          allowedValues: ['new', 'contacted', 'qualified', 'showing', 'proposal', 'negotiation', 'closed']
        },
        examples: ['qualified', 'showing'],
        category: 'Lead Status'
      },
      {
        name: 'leadBudget',
        type: 'currency',
        source: 'lead',
        description: 'Lead\'s budget for property purchase',
        required: false,
        fallback: 'TBD',
        validation: {
          min: 50000,
          max: 10000000
        },
        examples: ['$350,000', '$500,000 - $750,000'],
        category: 'Lead Preferences'
      },
      {
        name: 'leadPropertyType',
        type: 'string',
        source: 'lead',
        description: 'Preferred property type',
        required: false,
        fallback: 'property',
        validation: {
          allowedValues: ['house', 'condo', 'townhouse', 'apartment', 'land', 'commercial']
        },
        examples: ['house', 'condo'],
        category: 'Lead Preferences'
      },
      {
        name: 'leadBedrooms',
        type: 'number',
        source: 'lead',
        description: 'Preferred number of bedrooms',
        required: false,
        fallback: 'TBD',
        validation: {
          min: 1,
          max: 10
        },
        examples: ['3', '4+'],
        category: 'Lead Preferences'
      },
      {
        name: 'leadBathrooms',
        type: 'number',
        source: 'lead',
        description: 'Preferred number of bathrooms',
        required: false,
        fallback: 'TBD',
        validation: {
          min: 1,
          max: 10
        },
        examples: ['2', '3+'],
        category: 'Lead Preferences'
      },
      {
        name: 'leadLocation',
        type: 'string',
        source: 'lead',
        description: 'Preferred location/neighborhood',
        required: false,
        fallback: 'your area',
        validation: {
          maxLength: 100
        },
        examples: ['Downtown', 'Suburb area'],
        category: 'Lead Preferences'
      },
      {
        name: 'leadTimeline',
        type: 'string',
        source: 'lead',
        description: 'Purchase timeline',
        required: false,
        fallback: 'soon',
        validation: {
          allowedValues: ['immediately', '1-3 months', '3-6 months', '6-12 months', '1+ years', 'just browsing']
        },
        examples: ['3-6 months', 'immediately'],
        category: 'Lead Preferences'
      },

      // Property Variables
      {
        name: 'propertyAddress',
        type: 'string',
        source: 'property',
        description: 'Full property address',
        required: false,
        fallback: 'the property',
        validation: {
          maxLength: 200
        },
        examples: ['123 Main St, Anytown, ST 12345'],
        category: 'Property Details'
      },
      {
        name: 'propertyPrice',
        type: 'currency',
        source: 'property',
        description: 'Property listing price',
        required: false,
        fallback: 'market value',
        validation: {
          min: 10000,
          max: 10000000
        },
        examples: ['$450,000', '$675,000'],
        category: 'Property Details'
      },
      {
        name: 'propertyType',
        type: 'string',
        source: 'property',
        description: 'Type of property',
        required: false,
        fallback: 'property',
        validation: {
          allowedValues: ['house', 'condo', 'townhouse', 'apartment', 'land', 'commercial']
        },
        examples: ['single-family home', 'luxury condo'],
        category: 'Property Details'
      },
      {
        name: 'propertyBedrooms',
        type: 'number',
        source: 'property',
        description: 'Number of bedrooms',
        required: false,
        fallback: 'TBD',
        validation: {
          min: 0,
          max: 20
        },
        examples: ['3', '4'],
        category: 'Property Details'
      },
      {
        name: 'propertyBathrooms',
        type: 'number',
        source: 'property',
        description: 'Number of bathrooms',
        required: false,
        fallback: 'TBD',
        validation: {
          min: 0,
          max: 20
        },
        examples: ['2.5', '3'],
        category: 'Property Details'
      },
      {
        name: 'propertySqft',
        type: 'number',
        source: 'property',
        description: 'Property square footage',
        required: false,
        fallback: 'TBD',
        validation: {
          min: 100,
          max: 50000
        },
        examples: ['2,500', '3,200'],
        category: 'Property Details'
      },

      // Agent Variables
      {
        name: 'agentName',
        type: 'string',
        source: 'agent',
        description: 'Full name of the agent',
        required: true,
        fallback: 'Your Real Estate Agent',
        validation: {
          minLength: 1,
          maxLength: 100
        },
        examples: ['Michael Johnson', 'Emily Davis'],
        category: 'Agent Information'
      },
      {
        name: 'agentFirstName',
        type: 'string',
        source: 'agent',
        description: 'First name of the agent',
        required: false,
        fallback: 'Your Agent',
        validation: {
          minLength: 1,
          maxLength: 50
        },
        examples: ['Michael', 'Emily'],
        category: 'Agent Information'
      },
      {
        name: 'agentPhone',
        type: 'string',
        source: 'agent',
        description: 'Agent\'s phone number',
        required: false,
        fallback: '',
        validation: {
          format: 'phone'
        },
        examples: ['+1-555-0199', '(555) 123-4567'],
        category: 'Agent Contact'
      },
      {
        name: 'agentEmail',
        type: 'string',
        source: 'agent',
        description: 'Agent\'s email address',
        required: false,
        fallback: '',
        validation: {
          format: 'email'
        },
        examples: ['michael@realestate.com', 'emily.davis@agency.com'],
        category: 'Agent Contact'
      },
      {
        name: 'agencyName',
        type: 'string',
        source: 'agent',
        description: 'Real estate agency name',
        required: false,
        fallback: 'Our Agency',
        validation: {
          maxLength: 100
        },
        examples: ['Premier Realty', 'Downtown Properties'],
        category: 'Agency Information'
      },

      // System Variables
      {
        name: 'currentDate',
        type: 'date',
        source: 'system',
        description: 'Current date',
        required: false,
        fallback: new Date().toLocaleDateString(),
        examples: ['January 15, 2025'],
        category: 'System Information'
      },
      {
        name: 'currentTime',
        type: 'string',
        source: 'system',
        description: 'Current time',
        required: false,
        fallback: new Date().toLocaleTimeString(),
        examples: ['2:30 PM', '14:30'],
        category: 'System Information'
      },
      {
        name: 'daysSinceLastContact',
        type: 'number',
        source: 'system',
        description: 'Days since last contact with lead',
        required: false,
        fallback: '0',
        validation: {
          min: 0
        },
        examples: ['3', '7'],
        category: 'Lead Activity'
      },
      {
        name: 'nextFollowUpDate',
        type: 'date',
        source: 'system',
        description: 'Suggested next follow-up date',
        required: false,
        fallback: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        examples: ['January 22, 2025'],
        category: 'Scheduling'
      }
    ];

    standardVariables.forEach(variable => {
      this.variableDefinitions.set(variable.name, variable);
    });
  }

  private async loadCustomVariables(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('custom-template-variables');
      if (stored) {
        const customVars = JSON.parse(stored);
        Object.entries(customVars).forEach(([id, variable]: [string, any]) => {
          this.customVariables.set(id, variable);
        });
      }
    } catch (error) {
      console.error('Failed to load custom variables:', error);
    }
  }

  private async saveCustomVariables(): Promise<void> {
    try {
      const customVars = Object.fromEntries(this.customVariables);
      await AsyncStorage.setItem('custom-template-variables', JSON.stringify(customVars));
    } catch (error) {
      console.error('Failed to save custom variables:', error);
    }
  }

  public getVariableDefinition(name: string): VariableDefinition | undefined {
    return this.variableDefinitions.get(name);
  }

  public getAllVariableDefinitions(): VariableDefinition[] {
    return Array.from(this.variableDefinitions.values());
  }

  public getVariablesBySource(source: VariableSource): VariableDefinition[] {
    return this.getAllVariableDefinitions().filter(v => v.source === source);
  }

  public getVariablesByCategory(category: string): VariableDefinition[] {
    return this.getAllVariableDefinitions().filter(v => v.category === category);
  }

  public getVariableCategories(): string[] {
    const categories = new Set<string>();
    this.getAllVariableDefinitions().forEach(v => {
      if (v.category) {
        categories.add(v.category);
      }
    });
    return Array.from(categories).sort();
  }

  public validateVariableValue(
    variableName: string,
    value: any
  ): VariableValidationResult {
    const definition = this.getVariableDefinition(variableName);
    if (!definition) {
      return {
        isValid: false,
        errors: [`Unknown variable: ${variableName}`],
        warnings: []
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    let sanitizedValue = value;

    // Type validation
    if (!this.validateType(value, definition.type)) {
      errors.push(`Invalid type for ${variableName}. Expected ${definition.type}, got ${typeof value}`);
    }

    // Validation rules
    if (definition.validation) {
      const validationResult = this.validateRules(value, definition.validation);
      errors.push(...validationResult.errors);
      warnings.push(...validationResult.warnings);
      if (validationResult.sanitizedValue !== undefined) {
        sanitizedValue = validationResult.sanitizedValue;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedValue
    };
  }

  private validateType(value: any, expectedType: VariableType): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'date':
        return value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)));
      case 'currency':
        return typeof value === 'number' || (typeof value === 'string' && /^\$?[\d,]+(\.\d{2})?$/.test(value));
      case 'array':
        return Array.isArray(value);
      default:
        return false;
    }
  }

  private validateRules(value: any, validation: VariableValidation): VariableValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let sanitizedValue = value;

    // Length validation for strings
    if (typeof value === 'string') {
      if (validation.minLength && value.length < validation.minLength) {
        errors.push(`Minimum length is ${validation.minLength} characters`);
      }
      if (validation.maxLength && value.length > validation.maxLength) {
        errors.push(`Maximum length is ${validation.maxLength} characters`);
      }
    }

    // Numeric validation
    if (typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)))) {
      const numValue = typeof value === 'number' ? value : Number(value);

      if (validation.min !== undefined && numValue < validation.min) {
        errors.push(`Minimum value is ${validation.min}`);
      }
      if (validation.max !== undefined && numValue > validation.max) {
        errors.push(`Maximum value is ${validation.max}`);
      }
    }

    // Pattern validation
    if (validation.pattern && typeof value === 'string') {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        errors.push('Value does not match required pattern');
      }
    }

    // Allowed values validation
    if (validation.allowedValues && validation.allowedValues.length > 0) {
      if (!validation.allowedValues.includes(value)) {
        errors.push(`Value must be one of: ${validation.allowedValues.join(', ')}`);
      }
    }

    // Format validation
    if (validation.format) {
      switch (validation.format) {
        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            errors.push('Invalid email format');
          }
          break;
        case 'phone':
          const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
          const cleanPhone = value.replace(/[\s\-\(\)\.]/g, '');
          if (!phoneRegex.test(cleanPhone)) {
            errors.push('Invalid phone number format');
          } else {
            sanitizedValue = cleanPhone;
          }
          break;
        case 'currency':
          if (typeof value === 'string') {
            const currencyRegex = /^\$?[\d,]+(\.\d{2})?$/;
            if (!currencyRegex.test(value)) {
              errors.push('Invalid currency format');
            } else {
              // Convert to number if possible
              const numericValue = Number(value.replace(/[$,]/g, ''));
              if (!isNaN(numericValue)) {
                sanitizedValue = numericValue;
              }
            }
          }
          break;
        case 'date':
          if (typeof value === 'string') {
            const date = new Date(value);
            if (isNaN(date.getTime())) {
              errors.push('Invalid date format');
            } else {
              sanitizedValue = date.toISOString().split('T')[0];
            }
          }
          break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedValue
    };
  }

  public populateVariables(
    templateContent: string,
    context: TemplateRenderingContext
  ): { content: string; usedVariables: Record<string, any>; missingVariables: string[] } {
    let content = templateContent;
    const usedVariables: Record<string, any> = {};
    const missingVariables: string[] = [];

    // Find all variable placeholders in the template
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const matches = templateContent.match(variableRegex) || [];

    matches.forEach((match: string) => {
      const variableName = match.slice(2, -2).trim(); // Remove {{ and }}
      const value = this.getVariableValue(variableName, context);

      if (value !== undefined) {
        content = content.replace(new RegExp(match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value));
        usedVariables[variableName] = value;
      } else {
        missingVariables.push(variableName);
        // Replace with fallback or leave placeholder
        const definition = this.getVariableDefinition(variableName);
        const fallback = definition?.fallback || `[${variableName}]`;
        content = content.replace(new RegExp(match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), fallback);
      }
    });

    return {
      content,
      usedVariables,
      missingVariables
    };
  }

  private getVariableValue(variableName: string, context: TemplateRenderingContext): any {
    const definition = this.getVariableDefinition(variableName);
    if (!definition) {
      return undefined;
    }

    // Get value based on source
    let value: any;

    switch (definition.source) {
      case 'lead':
        value = context.lead?.[variableName] || context.lead?.[this.mapVariableToField(variableName)];
        break;
      case 'property':
        value = context.property?.[variableName] || context.property?.[this.mapVariableToField(variableName)];
        break;
      case 'agent':
        value = context.agent?.[variableName] || context.agent?.[this.mapVariableToField(variableName)];
        break;
      case 'system':
        value = this.getSystemVariableValue(variableName, context);
        break;
      case 'custom':
        value = context.custom?.[variableName];
        break;
    }

    // Apply formatting if needed
    if (value !== undefined) {
      return this.formatVariableValue(value, definition.type);
    }

    return undefined;
  }

  private mapVariableToField(variableName: string): string {
    // Map template variables to actual data field names
    const fieldMappings: Record<string, string> = {
      'leadName': 'full_name',
      'leadFirstName': 'first_name',
      'leadLastName': 'last_name',
      'leadEmail': 'email',
      'leadPhone': 'phone',
      'leadScore': 'score',
      'leadStage': 'stage',
      'leadBudget': 'budget',
      'leadPropertyType': 'property_type',
      'leadBedrooms': 'bedrooms',
      'leadBathrooms': 'bathrooms',
      'leadLocation': 'location',
      'leadTimeline': 'timeline',
      'propertyAddress': 'address',
      'propertyPrice': 'price',
      'propertyType': 'type',
      'propertyBedrooms': 'bedrooms',
      'propertyBathrooms': 'bathrooms',
      'propertySqft': 'square_feet',
      'agentName': 'full_name',
      'agentFirstName': 'first_name',
      'agentPhone': 'phone',
      'agentEmail': 'email',
      'agencyName': 'agency_name'
    };

    return fieldMappings[variableName] || variableName;
  }

  private getSystemVariableValue(variableName: string, context: TemplateRenderingContext): any {
    switch (variableName) {
      case 'currentDate':
        return new Date().toLocaleDateString();
      case 'currentTime':
        return new Date().toLocaleTimeString();
      case 'daysSinceLastContact':
        // This would need to be calculated based on lead's last contact
        return context.lead?.days_since_last_contact || 0;
      case 'nextFollowUpDate':
        // Calculate next follow-up date (7 days from now by default)
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + 7);
        return nextDate.toLocaleDateString();
      default:
        return undefined;
    }
  }

  private formatVariableValue(value: any, type: VariableType): any {
    switch (type) {
      case 'currency':
        if (typeof value === 'number') {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
          }).format(value);
        }
        return value;
      case 'date':
        if (value instanceof Date) {
          return value.toLocaleDateString();
        }
        if (typeof value === 'string') {
          return new Date(value).toLocaleDateString();
        }
        return value;
      case 'number':
        if (typeof value === 'number') {
          return value.toLocaleString();
        }
        return value;
      default:
        return value;
    }
  }

  public async addCustomVariable(variable: Omit<TemplateVariable, 'id'>): Promise<string> {
    const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const customVariable: TemplateVariable = {
      id,
      ...variable
    };

    this.customVariables.set(id, customVariable);
    await this.saveCustomVariables();

    return id;
  }

  public async updateCustomVariable(id: string, updates: Partial<TemplateVariable>): Promise<void> {
    const existing = this.customVariables.get(id);
    if (!existing) {
      throw new Error(`Custom variable ${id} not found`);
    }

    const updated = { ...existing, ...updates };
    this.customVariables.set(id, updated);
    await this.saveCustomVariables();
  }

  public async deleteCustomVariable(id: string): Promise<void> {
    this.customVariables.delete(id);
    await this.saveCustomVariables();
  }

  public getCustomVariables(): TemplateVariable[] {
    return Array.from(this.customVariables.values());
  }

  public searchVariables(query: string): VariableDefinition[] {
    const lowercaseQuery = query.toLowerCase();
    return this.getAllVariableDefinitions().filter(variable =>
      variable.name.toLowerCase().includes(lowercaseQuery) ||
      variable.description.toLowerCase().includes(lowercaseQuery) ||
      variable.category?.toLowerCase().includes(lowercaseQuery)
    );
  }

  public getVariableUsageExamples(variableName: string): string[] {
    const definition = this.getVariableDefinition(variableName);
    return definition?.examples || [];
  }

  public validateTemplateVariables(
    templateContent: string
  ): { validVariables: string[]; invalidVariables: string[]; suggestions: Record<string, string[]> } {
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const matches = templateContent.match(variableRegex) || [];
    const variables = matches.map(match => match.slice(2, -2).trim());

    const validVariables: string[] = [];
    const invalidVariables: string[] = [];
    const suggestions: Record<string, string[]> = {};

    variables.forEach(variable => {
      if (this.getVariableDefinition(variable)) {
        validVariables.push(variable);
      } else {
        invalidVariables.push(variable);
        // Find similar variables for suggestions
        const similar = this.searchVariables(variable).slice(0, 3).map(v => v.name);
        if (similar.length > 0) {
          suggestions[variable] = similar;
        }
      }
    });

    return {
      validVariables: [...new Set(validVariables)],
      invalidVariables: [...new Set(invalidVariables)],
      suggestions
    };
  }
}

export const templateVariableService = TemplateVariableService.getInstance();
export default templateVariableService;