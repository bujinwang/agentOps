import { templateService } from '../templateService';
import { CommunicationTemplate, TemplateRenderContext } from '../../types/communication';

describe('TemplateService', () => {
  describe('renderTemplate', () => {
    it('should render template with variable substitution', () => {
      const template: CommunicationTemplate = {
        id: 1,
        name: 'Test Template',
        category: 'test',
        contentTemplate: 'Hello {{leadName}}, welcome to {{companyName}}!',
        variables: {
          leadName: { name: 'leadName', type: 'string', description: 'Lead name', required: true },
          companyName: { name: 'companyName', type: 'string', description: 'Company name', required: true }
        },
        conditions: [],
        isActive: true,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      };

      const context: TemplateRenderContext = {
        leadData: { leadName: 'John Doe' },
        agentData: { companyName: 'Real Estate Co' },
        templateData: {}
      };

      const result = templateService.renderTemplate(template, context);

      expect(result.content).toBe('Hello John Doe, welcome to Real Estate Co!');
      expect(result.errors).toHaveLength(0);
    });

    it('should handle missing variables with defaults', () => {
      const template: CommunicationTemplate = {
        id: 1,
        name: 'Test Template',
        category: 'test',
        contentTemplate: 'Hello {{leadName}}, your score is {{leadScore}}.',
        variables: {
          leadName: { name: 'leadName', type: 'string', description: 'Lead name', required: true },
          leadScore: {
            name: 'leadScore',
            type: 'number',
            description: 'Lead score',
            required: false,
            defaultValue: 50
          }
        },
        conditions: [],
        isActive: true,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      };

      const context: TemplateRenderContext = {
        leadData: { leadName: 'John Doe' },
        agentData: {},
        templateData: {}
      };

      const result = templateService.renderTemplate(template, context);

      expect(result.content).toBe('Hello John Doe, your score is 50.');
    });

    it('should handle nested object properties', () => {
      const template: CommunicationTemplate = {
        id: 1,
        name: 'Test Template',
        category: 'test',
        contentTemplate: 'Contact {{contactInfo.email}} for {{property.address}}.',
        variables: {
          'contactInfo.email': { name: 'contactInfo.email', type: 'string', description: 'Email', required: true },
          'property.address': { name: 'property.address', type: 'string', description: 'Address', required: true }
        },
        conditions: [],
        isActive: true,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      };

      const context: TemplateRenderContext = {
        leadData: {
          contactInfo: { email: 'john@example.com' },
          property: { address: '123 Main St' }
        },
        agentData: {},
        templateData: {}
      };

      const result = templateService.renderTemplate(template, context);

      expect(result.content).toBe('Contact john@example.com for 123 Main St.');
    });
  });

  describe('validateConditions', () => {
    it('should validate greater_than condition', () => {
      const conditions = [
        { field: 'leadScore', operator: 'greater_than' as const, value: 70 }
      ];

      const leadData = { leadScore: 85 };
      const result = templateService.validateConditions(conditions, leadData);
      expect(result).toBe(true);

      const lowScoreData = { leadScore: 60 };
      const lowResult = templateService.validateConditions(conditions, lowScoreData);
      expect(lowResult).toBe(false);
    });

    it('should validate equals condition', () => {
      const conditions = [
        { field: 'leadSource', operator: 'equals' as const, value: 'website' }
      ];

      const matchingData = { leadSource: 'website' };
      const result = templateService.validateConditions(conditions, matchingData);
      expect(result).toBe(true);

      const nonMatchingData = { leadSource: 'referral' };
      const nonResult = templateService.validateConditions(conditions, nonMatchingData);
      expect(nonResult).toBe(false);
    });

    it('should validate contains condition', () => {
      const conditions = [
        { field: 'tags', operator: 'contains' as const, value: 'hot' }
      ];

      const matchingData = { tags: 'hot,urgent' };
      const result = templateService.validateConditions(conditions, matchingData);
      expect(result).toBe(true);

      const nonMatchingData = { tags: 'cold,qualified' };
      const nonResult = templateService.validateConditions(conditions, nonMatchingData);
      expect(nonResult).toBe(false);
    });

    it('should validate in_range condition', () => {
      const conditions = [
        { field: 'budget', operator: 'in_range' as const, value: [500000, 1000000] }
      ];

      const inRangeData = { budget: 750000 };
      const result = templateService.validateConditions(conditions, inRangeData);
      expect(result).toBe(true);

      const outOfRangeData = { budget: 200000 };
      const outResult = templateService.validateConditions(conditions, outOfRangeData);
      expect(outResult).toBe(false);
    });

    it('should handle AND logic with multiple conditions', () => {
      const conditions = [
        { field: 'leadScore', operator: 'greater_than' as const, value: 70, logicalOperator: 'AND' as const },
        { field: 'engagementLevel', operator: 'equals' as const, value: 'high' }
      ];

      const matchingData = { leadScore: 85, engagementLevel: 'high' };
      const result = templateService.validateConditions(conditions, matchingData);
      expect(result).toBe(true);

      const partialMatchData = { leadScore: 85, engagementLevel: 'low' };
      const partialResult = templateService.validateConditions(conditions, partialMatchData);
      expect(partialResult).toBe(false);
    });
  });

  describe('generatePreview', () => {
    it('should generate preview with sample data', () => {
      const template: CommunicationTemplate = {
        id: 1,
        name: 'Welcome Template',
        category: 'onboarding',
        subjectTemplate: 'Welcome {{leadName}}!',
        contentTemplate: 'Hello {{leadName}}, welcome to our service!',
        variables: {
          leadName: { name: 'leadName', type: 'string', description: 'Lead name', required: true }
        },
        conditions: [],
        isActive: true,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      };

      const preview = templateService.generatePreview(template);

      expect(preview.subject).toBe('Welcome John Smith!');
      expect(preview.content).toBe('Hello John Smith, welcome to our service!');
      expect(preview.variables.leadData.leadName).toBe('John Smith');
    });

    it('should handle custom sample data', () => {
      const template: CommunicationTemplate = {
        id: 1,
        name: 'Custom Template',
        category: 'test',
        contentTemplate: 'Hello {{leadName}} from {{companyName}}!',
        variables: {
          leadName: { name: 'leadName', type: 'string', description: 'Lead name', required: true },
          companyName: { name: 'companyName', type: 'string', description: 'Company name', required: true }
        },
        conditions: [],
        isActive: true,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      };

      const customData = {
        leadData: { leadName: 'Jane Doe' },
        agentData: { companyName: 'Custom Realty' },
        templateData: {}
      };

      const preview = templateService.generatePreview(template, customData);

      expect(preview.content).toBe('Hello Jane Doe from Custom Realty!');
    });
  });

  describe('validateTemplate', () => {
    it('should validate a correct template', () => {
      const template: CommunicationTemplate = {
        id: 1,
        name: 'Valid Template',
        category: 'test',
        contentTemplate: 'Hello {{leadName}}!',
        variables: {
          leadName: { name: 'leadName', type: 'string', description: 'Lead name', required: true }
        },
        conditions: [],
        isActive: true,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      };

      const result = templateService.validateTemplate(template);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing template name', () => {
      const template: CommunicationTemplate = {
        id: 1,
        name: '',
        category: 'test',
        contentTemplate: 'Hello World!',
        variables: {},
        conditions: [],
        isActive: true,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      };

      const result = templateService.validateTemplate(template);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Template name is required');
    });

    it('should detect missing content template', () => {
      const template: CommunicationTemplate = {
        id: 1,
        name: 'Test Template',
        category: 'test',
        contentTemplate: '',
        variables: {},
        conditions: [],
        isActive: true,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      };

      const result = templateService.validateTemplate(template);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Template content is required');
    });

    it('should detect undefined variables', () => {
      const template: CommunicationTemplate = {
        id: 1,
        name: 'Test Template',
        category: 'test',
        contentTemplate: 'Hello {{leadName}} and {{agentName}}!',
        variables: {
          leadName: { name: 'leadName', type: 'string', description: 'Lead name', required: true }
        },
        conditions: [],
        isActive: true,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      };

      const result = templateService.validateTemplate(template);

      expect(result.isValid).toBe(false);
      expect(result.missingVariables).toContain('agentName');
    });

    it('should detect unused variables', () => {
      const template: CommunicationTemplate = {
        id: 1,
        name: 'Test Template',
        category: 'test',
        contentTemplate: 'Hello {{leadName}}!',
        variables: {
          leadName: { name: 'leadName', type: 'string', description: 'Lead name', required: true },
          unusedVar: { name: 'unusedVar', type: 'string', description: 'Unused variable', required: false }
        },
        conditions: [],
        isActive: true,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      };

      const result = templateService.validateTemplate(template);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Variable \'unusedVar\' is defined but not used');
    });

    it('should validate variable types', () => {
      const template: CommunicationTemplate = {
        id: 1,
        name: 'Test Template',
        category: 'test',
        contentTemplate: 'Hello World!',
        variables: {
          invalidType: { name: 'invalidType', type: 'invalid' as any, description: 'Invalid type', required: true }
        },
        conditions: [],
        isActive: true,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      };

      const result = templateService.validateTemplate(template);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Variable \'invalidType\' has invalid type: invalid');
    });
  });

  describe('selectTemplateForLead', () => {
    const templates: CommunicationTemplate[] = [
      {
        id: 1,
        name: 'High Score Template',
        category: 'engagement',
        contentTemplate: 'Hello high scorer!',
        variables: {},
        conditions: [{ field: 'leadScore', operator: 'greater_than' as const, value: 80 }],
        isActive: true,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      },
      {
        id: 2,
        name: 'General Template',
        category: 'general',
        contentTemplate: 'Hello everyone!',
        variables: {},
        conditions: [],
        isActive: true,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      }
    ];

    it('should select template that matches conditions', () => {
      const leadData = { leadScore: 85 };
      const result = templateService.selectTemplateForLead(templates, leadData);

      expect(result?.id).toBe(1);
      expect(result?.name).toBe('High Score Template');
    });

    it('should fall back to first valid template when no conditions match', () => {
      const leadData = { leadScore: 60 };
      const result = templateService.selectTemplateForLead(templates, leadData);

      expect(result?.id).toBe(2);
      expect(result?.name).toBe('General Template');
    });

    it('should return null when no templates are valid', () => {
      const inactiveTemplates = templates.map(t => ({ ...t, isActive: false }));
      const leadData = { leadScore: 85 };
      const result = templateService.selectTemplateForLead(inactiveTemplates, leadData);

      expect(result).toBeNull();
    });
  });
});