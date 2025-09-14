const pool = require('../config/database');
const { validateTemplateVariables, renderTemplate } = require('../utils/templateEngine');

class TemplatePersonalizationService {
    /**
     * Create a new personalized template
     */
    async createTemplate(userId, templateData) {
        const {
            name,
            description,
            category,
            channel,
            subjectTemplate,
            contentTemplate,
            variables = {},
            conditions = {}
        } = templateData;

        // Validate template variables
        const validation = validateTemplateVariables(contentTemplate, variables);
        if (!validation.isValid) {
            throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
        }

        const query = `
            INSERT INTO personalized_templates
            (user_id, name, description, category, channel, subject_template, content_template, variables, conditions)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;

        const values = [
            userId,
            name,
            description,
            category,
            channel,
            subjectTemplate,
            contentTemplate,
            JSON.stringify(variables),
            JSON.stringify(conditions)
        ];

        try {
            const result = await pool.query(query, values);
            return this.formatTemplate(result.rows[0]);
        } catch (error) {
            if (error.code === '23505') { // Unique constraint violation
                throw new Error('Template name already exists');
            }
            throw error;
        }
    }

    /**
     * Get templates for a user with optional filtering
     */
    async getTemplates(userId, filters = {}) {
        let query = `
            SELECT * FROM personalized_templates
            WHERE user_id = $1 AND is_active = true
        `;
        const values = [userId];
        let paramCount = 1;

        if (filters.category) {
            paramCount++;
            query += ` AND category = $${paramCount}`;
            values.push(filters.category);
        }

        if (filters.channel) {
            paramCount++;
            query += ` AND channel = $${paramCount}`;
            values.push(filters.channel);
        }

        if (filters.search) {
            paramCount++;
            query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
            values.push(`%${filters.search}%`);
        }

        query += ' ORDER BY category, name';

        const result = await pool.query(query, values);
        return result.rows.map(row => this.formatTemplate(row));
    }

    /**
     * Get a specific template by ID
     */
    async getTemplate(userId, templateId) {
        const query = 'SELECT * FROM personalized_templates WHERE user_id = $1 AND template_id = $2 AND is_active = true';
        const result = await pool.query(query, [userId, templateId]);

        if (result.rows.length === 0) {
            throw new Error('Template not found');
        }

        return this.formatTemplate(result.rows[0]);
    }

    /**
     * Update a template
     */
    async updateTemplate(userId, templateId, updates) {
        const existingTemplate = await this.getTemplate(userId, templateId);

        const {
            name,
            description,
            category,
            channel,
            subjectTemplate,
            contentTemplate,
            variables,
            conditions
        } = { ...existingTemplate, ...updates };

        // Validate template if content changed
        if (contentTemplate !== existingTemplate.contentTemplate) {
            const validation = validateTemplateVariables(contentTemplate, variables);
            if (!validation.isValid) {
                throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
            }
        }

        const query = `
            UPDATE personalized_templates
            SET name = $1, description = $2, category = $3, channel = $4,
                subject_template = $5, content_template = $6, variables = $7, conditions = $8,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $9 AND template_id = $10
            RETURNING *
        `;

        const values = [
            name, description, category, channel, subjectTemplate, contentTemplate,
            JSON.stringify(variables), JSON.stringify(conditions), userId, templateId
        ];

        const result = await pool.query(query, values);
        return this.formatTemplate(result.rows[0]);
    }

    /**
     * Delete (deactivate) a template
     */
    async deleteTemplate(userId, templateId) {
        const query = 'UPDATE personalized_templates SET is_active = false WHERE user_id = $1 AND template_id = $2';
        await pool.query(query, [userId, templateId]);
    }

    /**
     * Select the best template for a lead based on personalization rules
     */
    async selectTemplateForLead(userId, leadData, context = {}) {
        const rules = await this.getPersonalizationRules(userId);
        const availableTemplates = await this.getTemplates(userId, { channel: context.channel || 'email' });

        let bestTemplate = null;
        let bestScore = 0;

        for (const rule of rules) {
            if (!rule.isActive) continue;

            const score = this.evaluateRuleConditions(rule.conditions, leadData, context);
            if (score > bestScore) {
                // Find template from rule's priority list
                for (const templateId of rule.templatePriority) {
                    const template = availableTemplates.find(t => t.templateId === templateId);
                    if (template) {
                        bestTemplate = template;
                        bestScore = score * rule.scoreWeight;
                        break;
                    }
                }
            }
        }

        // Fallback to first available template if no rules match
        if (!bestTemplate && availableTemplates.length > 0) {
            bestTemplate = availableTemplates[0];
        }

        return bestTemplate;
    }

    /**
     * Render a template with lead data
     */
    async renderTemplate(templateId, leadData, agentData = {}) {
        const template = await this.getTemplate(null, templateId); // Skip user check for rendering

        const context = {
            lead: leadData,
            agent: agentData,
            currentDate: new Date().toISOString().split('T')[0],
            currentTime: new Date().toLocaleTimeString()
        };

        const renderedContent = renderTemplate(template.contentTemplate, context);
        const renderedSubject = template.subjectTemplate ?
            renderTemplate(template.subjectTemplate, context) : null;

        return {
            templateId: template.templateId,
            renderedSubject,
            renderedContent,
            channel: template.channel,
            variables: template.variables
        };
    }

    /**
     * Get personalization rules for a user
     */
    async getPersonalizationRules(userId) {
        const query = 'SELECT * FROM personalization_rules WHERE user_id = $1 AND is_active = true ORDER BY score_weight DESC';
        const result = await pool.query(query, [userId]);
        return result.rows.map(row => ({
            ...row,
            conditions: JSON.parse(row.conditions),
            templatePriority: JSON.parse(row.templatePriority)
        }));
    }

    /**
     * Create a personalization rule
     */
    async createPersonalizationRule(userId, ruleData) {
        const { name, description, conditions, templatePriority, scoreWeight } = ruleData;

        const query = `
            INSERT INTO personalization_rules
            (user_id, name, description, conditions, template_priority, score_weight)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const values = [
            userId, name, description,
            JSON.stringify(conditions),
            JSON.stringify(templatePriority),
            scoreWeight
        ];

        const result = await pool.query(query, values);
        return {
            ...result.rows[0],
            conditions: JSON.parse(result.rows[0].conditions),
            templatePriority: JSON.parse(result.rows[0].templatePriority)
        };
    }

    /**
     * Track template usage
     */
    async trackTemplateUsage(usageData) {
        const {
            templateId,
            variantId,
            leadId,
            workflowId,
            channel,
            status = 'sent'
        } = usageData;

        const query = `
            INSERT INTO template_usage
            (template_id, variant_id, lead_id, workflow_id, channel, status)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const values = [templateId, variantId, leadId, workflowId, channel, status];
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    /**
     * Update template usage status
     */
    async updateTemplateUsage(usageId, updates) {
        const { status, deliveredAt, openedAt, clickedAt, respondedAt, errorMessage } = updates;

        const query = `
            UPDATE template_usage
            SET status = $1, delivered_at = $2, opened_at = $3, clicked_at = $4, responded_at = $5, error_message = $6
            WHERE usage_id = $7
        `;

        const values = [status, deliveredAt, openedAt, clickedAt, respondedAt, errorMessage, usageId];
        await pool.query(query, values);
    }

    /**
     * Evaluate rule conditions against lead data
     */
    evaluateRuleConditions(conditions, leadData, context = {}) {
        let score = 0;

        for (const [field, condition] of Object.entries(conditions)) {
            const leadValue = this.getNestedValue(leadData, field);
            const contextValue = this.getNestedValue(context, field);

            if (this.evaluateCondition(leadValue || contextValue, condition)) {
                score += condition.weight || 1;
            }
        }

        return score;
    }

    /**
     * Evaluate a single condition
     */
    evaluateCondition(value, condition) {
        if (typeof condition === 'object') {
            if (condition.min !== undefined && value < condition.min) return false;
            if (condition.max !== undefined && value > condition.max) return false;
            if (condition.equals !== undefined && value !== condition.equals) return false;
            if (condition.contains && !value?.includes(condition.contains)) return false;
            if (condition.days !== undefined) {
                const daysDiff = (Date.now() - new Date(value).getTime()) / (1000 * 60 * 60 * 24);
                if (daysDiff > condition.days) return false;
            }
        } else {
            return value === condition;
        }

        return true;
    }

    /**
     * Get nested object value by dot notation
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    /**
     * Format template for API response
     */
    formatTemplate(row) {
        return {
            templateId: row.template_id,
            userId: row.user_id,
            name: row.name,
            description: row.description,
            category: row.category,
            channel: row.channel,
            subjectTemplate: row.subject_template,
            contentTemplate: row.content_template,
            variables: JSON.parse(row.variables || '{}'),
            conditions: JSON.parse(row.conditions || '{}'),
            isActive: row.is_active,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}

module.exports = new TemplatePersonalizationService();