// Template Service - Handles email and SMS template operations
// Part of Story 4.1: Implement Automated Follow-up Workflows

const { pool } = require('../config/database');

class TemplateService {
  constructor() {
    this.pool = pool;
  }

  // Get all templates for a user
  async getTemplates(userId, type = null) {
    try {
      let query = `
        SELECT template_id, name, type, subject, content, variables, is_default, created_at, updated_at
        FROM workflow_templates
        WHERE user_id = $1
      `;
      const params = [userId];

      if (type) {
        query += ' AND type = $2';
        params.push(type);
      }

      query += ' ORDER BY is_default DESC, created_at DESC';

      const result = await this.pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error getting templates:', error);
      throw error;
    }
  }

  // Get a specific template by ID
  async getTemplate(templateId, userId) {
    try {
      const query = `
        SELECT template_id, name, type, subject, content, variables, is_default, created_at, updated_at
        FROM workflow_templates
        WHERE template_id = $1 AND user_id = $2
      `;

      const result = await this.pool.query(query, [templateId, userId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error getting template:', error);
      throw error;
    }
  }

  // Create a new template
  async createTemplate(userId, templateData) {
    try {
      const { name, type, subject, content, variables = {} } = templateData;

      const query = `
        INSERT INTO workflow_templates
        (user_id, name, type, subject, content, variables)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        userId, name, type, subject, content, JSON.stringify(variables)
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  }

  // Update an existing template
  async updateTemplate(templateId, userId, templateData) {
    try {
      const { name, type, subject, content, variables } = templateData;

      const query = `
        UPDATE workflow_templates
        SET name = $1, type = $2, subject = $3, content = $4, variables = $5, updated_at = CURRENT_TIMESTAMP
        WHERE template_id = $6 AND user_id = $7
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        name, type, subject, content, JSON.stringify(variables), templateId, userId
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  }

  // Delete a template
  async deleteTemplate(templateId, userId) {
    try {
      const query = `
        DELETE FROM workflow_templates
        WHERE template_id = $1 AND user_id = $2 AND is_default = false
        RETURNING template_id
      `;

      const result = await this.pool.query(query, [templateId, userId]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }

  // Sanitize input data to prevent XSS and injection attacks
  sanitizeInput(input) {
    if (typeof input !== 'string') {
      return input;
    }

    // Remove potentially dangerous characters and escape HTML entities
    return input
      .replace(/[<>'"&]/g, (match) => {
        const entityMap = {
          '<': '<',
          '>': '>',
          "'": '&#x27;',
          '"': '"',
          '&': '&'
        };
        return entityMap[match];
      })
      // Remove null bytes and other control characters
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
      // Limit length to prevent DoS
      .substring(0, 1000);
  }

  // Validate lead data structure
  validateLeadData(leadData) {
    if (!leadData || typeof leadData !== 'object') {
      throw new Error('Invalid lead data provided');
    }

    const requiredFields = ['first_name', 'last_name', 'email'];
    for (const field of requiredFields) {
      if (!leadData.hasOwnProperty(field)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(leadData.email)) {
      throw new Error('Invalid email format');
    }

    return true;
  }

  // Render template with lead data
  async renderTemplate(templateId, userId, leadData) {
    try {
      // Validate inputs
      if (!templateId || !userId) {
        throw new Error('Template ID and User ID are required');
      }

      // Validate lead data
      this.validateLeadData(leadData);

      const template = await this.getTemplate(templateId, userId);
      if (!template) {
        throw new Error('Template not found');
      }

      let content = template.content;
      let subject = template.subject;

      // Prepare sanitized variables
      const variables = {
        first_name: this.sanitizeInput(leadData.first_name || ''),
        last_name: this.sanitizeInput(leadData.last_name || ''),
        email: this.sanitizeInput(leadData.email || ''),
        phone_number: this.sanitizeInput(leadData.phone_number || ''),
        property_type: this.sanitizeInput(leadData.property_type || ''),
        desired_location: this.sanitizeInput(leadData.desired_location || ''),
        budget_min: this.sanitizeInput(String(leadData.budget_min || '')),
        budget_max: this.sanitizeInput(String(leadData.budget_max || '')),
        bedrooms_min: this.sanitizeInput(String(leadData.bedrooms_min || '')),
        bathrooms_min: this.sanitizeInput(String(leadData.bathrooms_min || '')),
        source: this.sanitizeInput(leadData.source || ''),
        status: this.sanitizeInput(leadData.status || ''),
        priority: this.sanitizeInput(leadData.priority || ''),
        notes: this.sanitizeInput(leadData.notes || ''),
        ai_summary: this.sanitizeInput(leadData.ai_summary || '')
      };

      // Replace variables in content with proper escaping
      Object.keys(variables).forEach(key => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        content = content.replace(regex, variables[key]);
      });

      // Replace variables in subject (for email templates)
      if (subject) {
        Object.keys(variables).forEach(key => {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
          subject = subject.replace(regex, variables[key]);
        });
      }

      return {
        type: template.type,
        subject: subject,
        content: content,
        template_name: template.name
      };
    } catch (error) {
      console.error('Error rendering template:', error);
      throw new Error(`Template rendering failed: ${error.message}`);
    }
  }

  // Get default templates for a user
  async getDefaultTemplates(userId) {
    try {
      const query = `
        SELECT template_id, name, type, subject, content, variables
        FROM workflow_templates
        WHERE user_id = $1 AND is_default = true
        ORDER BY type, name
      `;

      const result = await this.pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting default templates:', error);
      throw error;
    }
  }

  // Duplicate a template
  async duplicateTemplate(templateId, userId, newName) {
    try {
      const template = await this.getTemplate(templateId, userId);
      if (!template) {
        throw new Error('Template not found');
      }

      const duplicateData = {
        name: newName,
        type: template.type,
        subject: template.subject,
        content: template.content,
        variables: template.variables
      };

      return await this.createTemplate(userId, duplicateData);
    } catch (error) {
      console.error('Error duplicating template:', error);
      throw error;
    }
  }

  // Validate template variables
  validateTemplate(content, variables) {
    const errors = [];

    // Check for undefined variables in content
    const variableRegex = /\{\{(\w+)\}\}/g;
    let match;
    while ((match = variableRegex.exec(content)) !== null) {
      const variable = match[1];
      if (!variables.hasOwnProperty(variable)) {
        errors.push(`Undefined variable: ${variable}`);
      }
    }

    return errors;
  }
}

module.exports = new TemplateService();