const express = require('express');
const router = express.Router();
const enrichmentService = require('../services/enrichment/EnrichmentService');
const complianceService = require('../services/enrichment/ComplianceService');
const { authenticateToken } = require('../middleware/auth');
const { validateEnrichmentRequest } = require('../middleware/validation');

// Apply authentication to all enrichment routes
router.use(authenticateToken);

/**
 * POST /webhook/leads/:leadId/enrich
 * Trigger enrichment for a specific lead
 */
router.post('/webhook/leads/:leadId/enrich', validateEnrichmentRequest, async (req, res) => {
  try {
    const { leadId } = req.params;
    const { options } = req.body;
    const userId = req.user.id;

    // Verify lead ownership
    const lead = await require('../models/Lead').getById(leadId, userId);
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found or access denied',
      });
    }

    // Start enrichment process (async)
    enrichmentService.enrichLead(leadId, options)
      .then(result => {
        console.log(`Enrichment completed for lead ${leadId}:`, result.qualityScore);
      })
      .catch(error => {
        console.error(`Enrichment failed for lead ${leadId}:`, error.message);
      });

    res.json({
      success: true,
      message: 'Enrichment process started',
      leadId,
      status: 'processing',
    });

  } catch (error) {
    console.error('Enrichment trigger error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger enrichment',
      details: error.message,
    });
  }
});

/**
 * GET /webhook/leads/:leadId/enrichment-status
 * Get enrichment status for a lead
 */
router.get('/webhook/leads/:leadId/enrichment-status', async (req, res) => {
  try {
    const { leadId } = req.params;
    const userId = req.user.id;

    // Verify lead ownership
    const lead = await require('../models/Lead').getById(leadId, userId);
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found or access denied',
      });
    }

    const status = await enrichmentService.getEnrichmentStatus(leadId);

    res.json({
      success: true,
      data: status,
    });

  } catch (error) {
    console.error('Enrichment status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get enrichment status',
      details: error.message,
    });
  }
});

/**
 * POST /webhook/leads/batch-enrich
 * Trigger enrichment for multiple leads
 */
router.post('/webhook/leads/batch-enrich', async (req, res) => {
  try {
    const { leadIds, options } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'leadIds must be a non-empty array',
      });
    }

    if (leadIds.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 50 leads can be processed in a single batch',
      });
    }

    // Verify all leads belong to the user
    const Lead = require('../models/Lead');
    for (const leadId of leadIds) {
      const lead = await Lead.getById(leadId, userId);
      if (!lead) {
        return res.status(404).json({
          success: false,
          error: `Lead ${leadId} not found or access denied`,
        });
      }
    }

    // Start batch enrichment process (async)
    enrichmentService.enrichLeadsBatch(leadIds, options)
      .then(result => {
        console.log(`Batch enrichment completed: ${result.successful} successful, ${result.failed} failed`);
      })
      .catch(error => {
        console.error('Batch enrichment failed:', error.message);
      });

    res.json({
      success: true,
      message: 'Batch enrichment process started',
      leadIds,
      total: leadIds.length,
      status: 'processing',
    });

  } catch (error) {
    console.error('Batch enrichment trigger error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger batch enrichment',
      details: error.message,
    });
  }
});

/**
 * POST /consent/:leadId/grant
 * Grant enrichment consent for a lead
 */
router.post('/consent/:leadId/grant', async (req, res) => {
  try {
    const { leadId } = req.params;
    const userId = req.user.id;
    const consentData = req.body;

    // Verify lead ownership
    const lead = await require('../models/Lead').getById(leadId, userId);
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found or access denied',
      });
    }

    // Validate consent data
    if (!consentData.consentText || !consentData.consentVersion) {
      return res.status(400).json({
        success: false,
        error: 'consentText and consentVersion are required',
      });
    }

    const consentRecord = await complianceService.grantConsent(leadId, {
      ...consentData,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({
      success: true,
      message: 'Enrichment consent granted',
      data: consentRecord,
    });

  } catch (error) {
    console.error('Consent grant error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to grant consent',
      details: error.message,
    });
  }
});

/**
 * POST /consent/:leadId/withdraw
 * Withdraw enrichment consent for a lead
 */
router.post('/consent/:leadId/withdraw', async (req, res) => {
  try {
    const { leadId } = req.params;
    const userId = req.user.id;
    const { reason } = req.body;

    // Verify lead ownership
    const lead = await require('../models/Lead').getById(leadId, userId);
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found or access denied',
      });
    }

    await complianceService.withdrawConsent(leadId, reason);

    res.json({
      success: true,
      message: 'Enrichment consent withdrawn',
      leadId,
    });

  } catch (error) {
    console.error('Consent withdrawal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to withdraw consent',
      details: error.message,
    });
  }
});

/**
 * GET /consent/:leadId/status
 * Get consent status for a lead
 */
router.get('/consent/:leadId/status', async (req, res) => {
  try {
    const { leadId } = req.params;
    const userId = req.user.id;

    // Verify lead ownership
    const lead = await require('../models/Lead').getById(leadId, userId);
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found or access denied',
      });
    }

    const consentStatus = await complianceService.validateConsent(leadId);

    res.json({
      success: true,
      data: consentStatus,
    });

  } catch (error) {
    console.error('Consent status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get consent status',
      details: error.message,
    });
  }
});

/**
 * POST /data/:leadId/delete
 * Delete enrichment data for a lead (GDPR compliance)
 */
router.post('/data/:leadId/delete', async (req, res) => {
  try {
    const { leadId } = req.params;
    const userId = req.user.id;
    const { requestType } = req.body;

    // Verify lead ownership
    const lead = await require('../models/Lead').getById(leadId, userId);
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found or access denied',
      });
    }

    const deletionResult = await complianceService.handleDeletionRequest(
      leadId,
      requestType || 'gdpr'
    );

    res.json({
      success: true,
      message: 'Data deletion request processed',
      data: deletionResult,
    });

  } catch (error) {
    console.error('Data deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process data deletion request',
      details: error.message,
    });
  }
});

/**
 * GET /data/:leadId/portability
 * Export enrichment data for portability (GDPR)
 */
router.get('/data/:leadId/portability', async (req, res) => {
  try {
    const { leadId } = req.params;
    const userId = req.user.id;

    // Verify lead ownership
    const lead = await require('../models/Lead').getById(leadId, userId);
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found or access denied',
      });
    }

    const dataPackage = await complianceService.exportDataForPortability(leadId);

    res.json({
      success: true,
      message: 'Data portability package generated',
      data: dataPackage,
    });

  } catch (error) {
    console.error('Data portability error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate data portability package',
      details: error.message,
    });
  }
});

/**
 * GET /compliance/report
 * Get compliance report
 */
router.get('/compliance/report', async (req, res) => {
  try {
    const stats = await complianceService.getComplianceStats();

    res.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    console.error('Compliance report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate compliance report',
      details: error.message,
    });
  }
});

/**
 * GET /health
 * Get enrichment service health status
 */
router.get('/health', async (req, res) => {
  try {
    const healthStatus = {
      service: 'enrichment',
      status: 'healthy',
      timestamp: new Date(),
      version: '1.0',
    };

    // Check provider health
    const providerHealth = await enrichmentService.getProviderHealth();
    healthStatus.providers = providerHealth;

    // Overall status
    const hasUnhealthyProvider = Object.values(providerHealth).some(
      provider => provider.status !== 'healthy'
    );

    if (hasUnhealthyProvider) {
      healthStatus.status = 'degraded';
    }

    res.json(healthStatus);

  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      service: 'enrichment',
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date(),
    });
  }
});

module.exports = router;