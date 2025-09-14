const express = require('express');
const router = express.Router();
const ABTestingService = require('../services/ABTestingService');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/experiments
 * Get all experiments for the authenticated user
 */
router.get('/', async (req, res) => {
    try {
        const { status, templateId } = req.query;
        const filters = {};

        if (status) filters.status = status;
        if (templateId) filters.templateId = parseInt(templateId);

        const experiments = await ABTestingService.getExperiments(req.user.userId, filters);
        res.json({ experiments, count: experiments.length });
    } catch (error) {
        console.error('Error fetching experiments:', error);
        res.status(500).json({ error: 'Failed to fetch experiments' });
    }
});

/**
 * POST /api/experiments
 * Create a new experiment
 */
router.post('/', async (req, res) => {
    try {
        const experimentData = {
            ...req.body,
            userId: req.user.userId
        };

        const experiment = await ABTestingService.createExperiment(req.user.userId, experimentData);
        res.status(201).json({ experiment });
    } catch (error) {
        console.error('Error creating experiment:', error);

        if (error.message.includes('already exists')) {
            return res.status(409).json({ error: error.message });
        }

        res.status(500).json({ error: 'Failed to create experiment' });
    }
});

/**
 * GET /api/experiments/:id
 * Get a specific experiment
 */
router.get('/:id', async (req, res) => {
    try {
        const experimentId = parseInt(req.params.id);
        const experiment = await ABTestingService.getExperiment(req.user.userId, experimentId);
        res.json({ experiment });
    } catch (error) {
        console.error('Error fetching experiment:', error);

        if (error.message === 'Experiment not found') {
            return res.status(404).json({ error: error.message });
        }

        res.status(500).json({ error: 'Failed to fetch experiment' });
    }
});

/**
 * PUT /api/experiments/:id/start
 * Start an experiment
 */
router.put('/:id/start', async (req, res) => {
    try {
        const experimentId = parseInt(req.params.id);
        const experiment = await ABTestingService.startExperiment(req.user.userId, experimentId);
        res.json({ experiment });
    } catch (error) {
        console.error('Error starting experiment:', error);

        if (error.message.includes('can only be started')) {
            return res.status(400).json({ error: error.message });
        }

        if (error.message === 'Experiment not found') {
            return res.status(404).json({ error: error.message });
        }

        res.status(500).json({ error: 'Failed to start experiment' });
    }
});

/**
 * PUT /api/experiments/:id/stop
 * Stop an experiment
 */
router.put('/:id/stop', async (req, res) => {
    try {
        const experimentId = parseInt(req.params.id);
        const experiment = await ABTestingService.stopExperiment(req.user.userId, experimentId);
        res.json({ experiment });
    } catch (error) {
        console.error('Error stopping experiment:', error);

        if (error.message.includes('can only be stopped')) {
            return res.status(400).json({ error: error.message });
        }

        if (error.message === 'Experiment not found') {
            return res.status(404).json({ error: error.message });
        }

        res.status(500).json({ error: 'Failed to stop experiment' });
    }
});

/**
 * GET /api/experiments/:id/results
 * Get experiment results and statistics
 */
router.get('/:id/results', async (req, res) => {
    try {
        const experimentId = parseInt(req.params.id);
        const results = await ABTestingService.getExperimentResults(experimentId);
        res.json({ results });
    } catch (error) {
        console.error('Error fetching experiment results:', error);
        res.status(500).json({ error: 'Failed to fetch experiment results' });
    }
});

/**
 * POST /api/experiments/:id/select-variant
 * Select a variant for a lead
 */
router.post('/:id/select-variant', async (req, res) => {
    try {
        const experimentId = parseInt(req.params.id);
        const { leadId } = req.body;

        if (!leadId) {
            return res.status(400).json({ error: 'leadId is required' });
        }

        const variant = await ABTestingService.selectVariantForLead(experimentId, leadId);
        res.json({ variant });
    } catch (error) {
        console.error('Error selecting variant:', error);

        if (error.message === 'Experiment not found') {
            return res.status(404).json({ error: 'Experiment not found' });
        }

        if (error.message === 'Experiment is not running') {
            return res.status(400).json({ error: error.message });
        }

        res.status(500).json({ error: 'Failed to select variant' });
    }
});

/**
 * POST /api/experiments/:id/record-result
 * Record experiment result
 */
router.post('/:id/record-result', async (req, res) => {
    try {
        const experimentId = parseInt(req.params.id);
        const { leadId, metricValue, conversionOccurred } = req.body;

        if (!leadId || metricValue === undefined) {
            return res.status(400).json({ error: 'leadId and metricValue are required' });
        }

        await ABTestingService.recordExperimentResult(
            experimentId,
            leadId,
            metricValue,
            conversionOccurred
        );

        res.json({ message: 'Result recorded successfully' });
    } catch (error) {
        console.error('Error recording experiment result:', error);
        res.status(500).json({ error: 'Failed to record experiment result' });
    }
});

/**
 * GET /api/experiments/templates/:templateId
 * Get experiments for a specific template
 */
router.get('/templates/:templateId', async (req, res) => {
    try {
        const templateId = parseInt(req.params.templateId);
        const experiments = await ABTestingService.getExperiments(req.user.userId, { templateId });
        res.json({ experiments, count: experiments.length });
    } catch (error) {
        console.error('Error fetching template experiments:', error);
        res.status(500).json({ error: 'Failed to fetch template experiments' });
    }
});

module.exports = router;