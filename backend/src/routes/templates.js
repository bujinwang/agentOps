const express = require('express');
const router = express.Router();
const TemplatePersonalizationService = require('../services/TemplatePersonalizationService');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/templates
 * Get all templates for the authenticated user
 */
router.get('/', async (req, res) => {
    try {
        const { category, channel, search } = req.query;
        const filters = {};

        if (category) filters.category = category;
        if (channel) filters.channel = channel;
        if (search) filters.search = search;

        const templates = await TemplatePersonalizationService.getTemplates(req.user.userId, filters);
        res.json({ templates, count: templates.length });
    } catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});

/**
 * GET /api/templates/categories
 * Get available template categories
 */
router.get('/categories', async (req, res) => {
    try {
        const categories = [
            'welcome',
            'followup',
            'objection',
            'closing',
            'announcement',
            'newsletter',
            'general'
        ];
        res.json({ categories });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

/**
 * POST /api/templates
 * Create a new template
 */
router.post('/', async (req, res) => {
    try {
        const templateData = {
            ...req.body,
            userId: req.user.userId
        };

        const template = await TemplatePersonalizationService.createTemplate(req.user.userId, templateData);
        res.status(201).json({ template });
    } catch (error) {
        console.error('Error creating template:', error);

        if (error.message === 'Template name already exists') {
            return res.status(409).json({ error: error.message });
        }

        if (error.message.includes('Template validation failed')) {
            return res.status(400).json({ error: error.message });
        }

        res.status(500).json({ error: 'Failed to create template' });
    }
});

/**
 * GET /api/templates/:id
 * Get a specific template
 */
router.get('/:id', async (req, res) => {
    try {
        const templateId = parseInt(req.params.id);
        const template = await TemplatePersonalizationService.getTemplate(req.user.userId, templateId);
        res.json({ template });
    } catch (error) {
        console.error('Error fetching template:', error);

        if (error.message === 'Template not found') {
            return res.status(404).json({ error: error.message });
        }

        res.status(500).json({ error: 'Failed to fetch template' });
    }
});

/**
 * PUT /api/templates/:id
 * Update a template
 */
router.put('/:id', async (req, res) => {
    try {
        const templateId = parseInt(req.params.id);
        const template = await TemplatePersonalizationService.updateTemplate(req.user.userId, templateId, req.body);
        res.json({ template });
    } catch (error) {
        console.error('Error updating template:', error);

        if (error.message === 'Template not found') {
            return res.status(404).json({ error: error.message });
        }

        if (error.message.includes('Template validation failed')) {
            return res.status(400).json({ error: error.message });
        }

        res.status(500).json({ error: 'Failed to update template' });
    }
});

/**
 * DELETE /api/templates/:id
 * Delete (deactivate) a template
 */
router.delete('/:id', async (req, res) => {
    try {
        const templateId = parseInt(req.params.id);
        await TemplatePersonalizationService.deleteTemplate(req.user.userId, templateId);
        res.json({ message: 'Template deleted successfully' });
    } catch (error) {
        console.error('Error deleting template:', error);
        res.status(500).json({ error: 'Failed to delete template' });
    }
});

/**
 * POST /api/templates/:id/render
 * Render a template with test data
 */
router.post('/:id/render', async (req, res) => {
    try {
        const templateId = parseInt(req.params.id);
        const { leadData, agentData } = req.body;

        const result = await TemplatePersonalizationService.renderTemplate(templateId, leadData, agentData);
        res.json({ result });
    } catch (error) {
        console.error('Error rendering template:', error);
        res.status(500).json({ error: 'Failed to render template' });
    }
});

/**
 * GET /api/templates/:id/variants
 * Get variants for A/B testing
 */
router.get('/:id/variants', async (req, res) => {
    try {
        const templateId = parseInt(req.params.id);
        // TODO: Implement variant fetching
        res.json({ variants: [] });
    } catch (error) {
        console.error('Error fetching variants:', error);
        res.status(500).json({ error: 'Failed to fetch variants' });
    }
});

/**
 * POST /api/templates/select-for-lead
 * Select the best template for a lead
 */
router.post('/select-for-lead', async (req, res) => {
    try {
        const { leadData, context } = req.body;
        const template = await TemplatePersonalizationService.selectTemplateForLead(
            req.user.userId,
            leadData,
            context
        );

        if (!template) {
            return res.status(404).json({ error: 'No suitable template found' });
        }

        res.json({ template });
    } catch (error) {
        console.error('Error selecting template:', error);
        res.status(500).json({ error: 'Failed to select template' });
    }
});

/**
 * POST /api/templates/track-usage
 * Track template usage
 */
router.post('/track-usage', async (req, res) => {
    try {
        const usageData = {
            ...req.body,
            userId: req.user.userId
        };

        const usage = await TemplatePersonalizationService.trackTemplateUsage(usageData);
        res.status(201).json({ usage });
    } catch (error) {
        console.error('Error tracking usage:', error);
        res.status(500).json({ error: 'Failed to track usage' });
    }
});

/**
 * GET /api/personalization-rules
 * Get personalization rules
 */
router.get('/personalization-rules', async (req, res) => {
    try {
        const rules = await TemplatePersonalizationService.getPersonalizationRules(req.user.userId);
        res.json({ rules, count: rules.length });
    } catch (error) {
        console.error('Error fetching rules:', error);
        res.status(500).json({ error: 'Failed to fetch personalization rules' });
    }
});

/**
 * POST /api/personalization-rules
 * Create a personalization rule
 */
router.post('/personalization-rules', async (req, res) => {
    try {
        const ruleData = {
            ...req.body,
            userId: req.user.userId
        };

        const rule = await TemplatePersonalizationService.createPersonalizationRule(req.user.userId, ruleData);
        res.status(201).json({ rule });
    } catch (error) {
        console.error('Error creating rule:', error);
        res.status(500).json({ error: 'Failed to create personalization rule' });
    }
});

module.exports = router;