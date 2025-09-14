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

  // Render template with lead data
  async renderTemplate(templateId, userId, leadData) {
    try {
      const template = await this.getTemplate(templateId, userId);
      if (!template) {
        throw new Error('Template not found');
      }

      let content = template.content;
      let subject = template.subject;

      // Replace template variables with lead data
      const variables = {
        first_name: leadData.first_name || '',
        last_name: leadData.last_name || '',
        email: leadData.email || '',
        phone_number: leadData.phone_number || '',
        property_type: leadData.property_type || '',
        desired_location: leadData.desired_location || '',
        budget_min: leadData.budget_min || '',
        budget_max: leadData.budget_max || '',
        bedrooms_min: leadData.bedrooms_min || '',
        bathrooms_min: leadData.bathrooms_min || '',
        source: leadData.source || '',
        status: leadData.status || '',
        priority: leadData.priority || '',
        notes: leadData.notes || '',
        ai_summary: leadData.ai_summary || ''
      };

      // Replace variables in content
      Object.keys(variables).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        content = content.replace(regex, variables[key]);
      });

      // Replace variables in subject (for email templates)
      if (subject) {
        Object.keys(variables).forEach(key => {
          const regex = new RegExp(`{{${key}}}`, 'g');
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
      throw error;
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