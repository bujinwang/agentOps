// Template Service Tests
// Tests for email and SMS template operations

const TemplateService = require('../TemplateService');
const { pool } = require('../../config/database');

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('TemplateService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTemplates', () => {
    it('should return all templates for a user', async () => {
      const mockTemplates = [
        { template_id: 1, name: 'Welcome Email', type: 'email' },
        { template_id: 2, name: 'Follow-up SMS', type: 'sms' }
      ];

      pool.query.mockResolvedValue({ rows: mockTemplates });

      const result = await TemplateService.getTemplates(1);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [1]
      );
      expect(result).toEqual(mockTemplates);
    });

    it('should filter templates by type', async () => {
      const mockTemplates = [{ template_id: 1, name: 'Welcome Email', type: 'email' }];
      pool.query.mockResolvedValue({ rows: mockTemplates });

      const result = await TemplateService.getTemplates(1, 'email');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND type = $2'),
        [1, 'email']
      );
      expect(result).toEqual(mockTemplates);
    });
  });

  describe('getTemplate', () => {
    it('should return a specific template', async () => {
      const mockTemplate = { template_id: 1, name: 'Welcome Email', type: 'email' };
      pool.query.mockResolvedValue({ rows: [mockTemplate] });

      const result = await TemplateService.getTemplate(1, 1);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE template_id = $1 AND user_id = $2'),
        [1, 1]
      );
      expect(result).toEqual(mockTemplate);
    });

    it('should return null if template not found', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result = await TemplateService.getTemplate(1, 1);

      expect(result).toBeUndefined();
    });
  });

  describe('createTemplate', () => {
    it('should create a new template', async () => {
      const templateData = {
        name: 'New Template',
        type: 'email',
        subject: 'Test Subject',
        content: 'Test content',
        variables: { name: 'Name' }
      };
      const mockCreatedTemplate = { template_id: 1, ...templateData };

      pool.query.mockResolvedValue({ rows: [mockCreatedTemplate] });

      const result = await TemplateService.createTemplate(1, templateData);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO workflow_templates'),
        [1, 'New Template', 'email', 'Test Subject', 'Test content', JSON.stringify({ name: 'Name' })]
      );
      expect(result).toEqual(mockCreatedTemplate);
    });
  });

  describe('updateTemplate', () => {
    it('should update an existing template', async () => {
      const templateData = {
        name: 'Updated Template',
        type: 'email',
        subject: 'Updated Subject',
        content: 'Updated content',
        variables: { name: 'Updated Name' }
      };
      const mockUpdatedTemplate = { template_id: 1, ...templateData };

      pool.query.mockResolvedValue({ rows: [mockUpdatedTemplate] });

      const result = await TemplateService.updateTemplate(1, 1, templateData);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE workflow_templates'),
        ['Updated Template', 'email', 'Updated Subject', 'Updated content', JSON.stringify({ name: 'Updated Name' }), 1, 1]
      );
      expect(result).toEqual(mockUpdatedTemplate);
    });
  });

  describe('deleteTemplate', () => {
    it('should delete a template', async () => {
      pool.query.mockResolvedValue({ rows: [{ template_id: 1 }] });

      const result = await TemplateService.deleteTemplate(1, 1);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM workflow_templates'),
        [1, 1]
      );
      expect(result).toBe(true);
    });

    it('should return false if template not found', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result = await TemplateService.deleteTemplate(1, 1);

      expect(result).toBe(false);
    });
  });

  describe('renderTemplate', () => {
    it('should render template with lead data', async () => {
      const mockTemplate = {
        template_id: 1,
        name: 'Welcome Email',
        type: 'email',
        subject: 'Welcome {{first_name}}!',
        content: 'Hello {{first_name}} {{last_name}}, welcome to our service!',
        variables: { first_name: 'First name', last_name: 'Last name' }
      };

      const leadData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com'
      };

      pool.query.mockResolvedValue({ rows: [mockTemplate] });

      const result = await TemplateService.renderTemplate(1, 1, leadData);

      expect(result).toEqual({
        type: 'email',
        subject: 'Welcome John!',
        content: 'Hello John Doe, welcome to our service!',
        template_name: 'Welcome Email'
      });
    });

    it('should handle missing lead data gracefully', async () => {
      const mockTemplate = {
        template_id: 1,
        name: 'Welcome Email',
        type: 'email',
        subject: 'Welcome {{first_name}}!',
        content: 'Hello {{first_name}}, welcome!',
        variables: { first_name: 'First name' }
      };

      const leadData = {}; // Empty lead data

      pool.query.mockResolvedValue({ rows: [mockTemplate] });

      const result = await TemplateService.renderTemplate(1, 1, leadData);

      expect(result.subject).toBe('Welcome !');
      expect(result.content).toBe('Hello , welcome!');
    });

    it('should throw error if template not found', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await expect(TemplateService.renderTemplate(1, 1, {})).rejects.toThrow('Template not found');
    });
  });

  describe('validateTemplate', () => {
    it('should return no errors for valid template', () => {
      const content = 'Hello {{name}}, welcome!';
      const variables = { name: 'Name' };

      const errors = TemplateService.validateTemplate(content, variables);

      expect(errors).toEqual([]);
    });

    it('should return errors for undefined variables', () => {
      const content = 'Hello {{name}} and {{age}}!';
      const variables = { name: 'Name' }; // Missing 'age'

      const errors = TemplateService.validateTemplate(content, variables);

      expect(errors).toEqual(['Undefined variable: age']);
    });

    it('should handle multiple undefined variables', () => {
      const content = 'Hello {{name}}, you are {{age}} and live in {{city}}!';
      const variables = { name: 'Name' }; // Missing 'age' and 'city'

      const errors = TemplateService.validateTemplate(content, variables);

      expect(errors).toContain('Undefined variable: age');
      expect(errors).toContain('Undefined variable: city');
      expect(errors).toHaveLength(2);
    });
  });

  describe('duplicateTemplate', () => {
    it('should duplicate a template with new name', async () => {
      const mockTemplate = {
        template_id: 1,
        name: 'Original Template',
        type: 'email',
        subject: 'Original Subject',
        content: 'Original content',
        variables: { name: 'Name' }
      };

      const mockDuplicatedTemplate = {
        template_id: 2,
        name: 'Duplicated Template',
        type: 'email',
        subject: 'Original Subject',
        content: 'Original content',
        variables: { name: 'Name' }
      };

      pool.query
        .mockResolvedValueOnce({ rows: [mockTemplate] }) // getTemplate
        .mockResolvedValueOnce({ rows: [mockDuplicatedTemplate] }); // createTemplate

      const result = await TemplateService.duplicateTemplate(1, 1, 'Duplicated Template');

      expect(result).toEqual(mockDuplicatedTemplate);
    });

    it('should throw error if original template not found', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await expect(TemplateService.duplicateTemplate(1, 1, 'New Name')).rejects.toThrow('Template not found');
    });
  });
});