const express = require('express');
const router = express.Router();
const LeadWorkflowIntegrationService = require('../services/workflow/LeadWorkflowIntegrationService');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');

// Initialize service
const workflowIntegrationService = new LeadWorkflowIntegrationService();

// Validation schemas
const workflowOverrideSchema = {
  workflowId: { type: 'string', required: true },
  operation: { type: 'string', enum: ['pause', 'resume', 'cancel', 'restart'], required: true },
  reason: { type: 'string', maxLength: 500 }
};

const bulkOperationSchema = {
  leadIds: { type: 'array', items: { type: 'number' }, required: true, maxItems: 100 },
  operation: { type: 'string', enum: ['pause', 'resume', 'cancel'], required: true },
  reason: { type: 'string', maxLength: 500 }
};

const statusChangeSchema = {
  leadId: { type: 'number', required: true },
  oldStatus: { type: 'string', required: true },
  newStatus: { type: 'string', required: true },
  reason: { type: 'string', maxLength: 500 }
};

/**
 * POST /api/workflow-integration/status-change
 * Handle lead status change and update workflows
 */
router.post('/status-change',
  authenticateToken,
  requireRole(['agent', 'admin']),
  validateRequest(statusChangeSchema),
  async (req, res) => {
    try {
      const { leadId, oldStatus, newStatus, reason } = req.body;
      const changedBy = req.user.id;

      await workflowIntegrationService.handleLeadStatusChange(
        leadId,
        oldStatus,
        newStatus,
        changedBy,
        reason
      );

      res.json({
        success: true,
        message: `Lead status updated to ${newStatus} and workflows adjusted accordingly`
      });
    } catch (error) {
      console.error('Status change error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process status change',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/workflow-integration/override
 * Agent workflow override operations
 */
router.post('/override',
  authenticateToken,
  requireRole(['agent', 'admin']),
  validateRequest(workflowOverrideSchema),
  async (req, res) => {
    try {
      const { workflowId, operation, reason } = req.body;
      const agentId = req.user.id;

      let result;
      switch (operation) {
        case 'pause':
          result = await workflowIntegrationService.pauseWorkflow(workflowId, agentId, reason);
          break;
        case 'resume':
          result = await workflowIntegrationService.resumeWorkflow(workflowId, agentId);
          break;
        case 'cancel':
          result = await workflowIntegrationService.cancelWorkflow(workflowId, agentId, reason);
          break;
        case 'restart':
          result = await workflowIntegrationService.restartWorkflow(workflowId, agentId);
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid operation'
          });
      }

      res.json(result);
    } catch (error) {
      console.error('Workflow override error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process workflow override',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/workflow-integration/bulk-operation
 * Bulk workflow operations for multiple leads
 */
router.post('/bulk-operation',
  authenticateToken,
  requireRole(['admin']),
  validateRequest(bulkOperationSchema),
  async (req, res) => {
    try {
      const { leadIds, operation, reason } = req.body;
      const agentId = req.user.id;

      const result = await workflowIntegrationService.bulkWorkflowOperation(
        leadIds,
        operation,
        agentId,
        reason
      );

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Bulk operation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process bulk operation',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/workflow-integration/lead/:leadId/history
 * Get workflow history for a lead
 */
router.get('/lead/:leadId/history',
  authenticateToken,
  requireRole(['agent', 'admin']),
  async (req, res) => {
    try {
      const { leadId } = req.params;
      const { limit, offset, eventTypes, startDate, endDate } = req.query;

      // Validate lead access (agent can only see their leads)
      if (req.user.role === 'agent' && !await canAccessLead(req.user.id, leadId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const options = {
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0,
        eventTypes: eventTypes ? eventTypes.split(',') : [],
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null
      };

      const history = await workflowIntegrationService.getLeadWorkflowHistory(leadId, options);

      res.json({
        success: true,
        leadId: parseInt(leadId),
        history,
        pagination: {
          limit: options.limit,
          offset: options.offset,
          hasMore: history.length === options.limit
        }
      });
    } catch (error) {
      console.error('Lead history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve lead workflow history',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/workflow-integration/lead/:leadId/status
 * Get workflow status summary for a lead
 */
router.get('/lead/:leadId/status',
  authenticateToken,
  requireRole(['agent', 'admin']),
  async (req, res) => {
    try {
      const { leadId } = req.params;

      // Validate lead access
      if (req.user.role === 'agent' && !await canAccessLead(req.user.id, leadId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const status = await workflowIntegrationService.getLeadWorkflowStatus(leadId);

      res.json({
        success: true,
        ...status
      });
    } catch (error) {
      console.error('Lead status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve lead workflow status',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/workflow-integration/analytics
 * Get workflow analytics and insights
 */
router.get('/analytics',
  authenticateToken,
  requireRole(['admin', 'manager']),
  async (req, res) => {
    try {
      const {
        workflowId,
        leadId,
        eventTypes,
        startDate,
        endDate,
        groupBy
      } = req.query;

      const filters = {
        workflowId,
        leadId: leadId ? parseInt(leadId) : null,
        eventTypes: eventTypes ? eventTypes.split(',') : [],
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        groupBy: groupBy || 'day'
      };

      const analytics = await workflowIntegrationService.getWorkflowAnalytics(filters);

      res.json({
        success: true,
        analytics
      });
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve workflow analytics',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/workflow-integration/cleanup
 * Cleanup old workflow data (admin only)
 */
router.post('/cleanup',
  authenticateToken,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const { daysOld } = req.body;
      const cleanupDays = daysOld ? parseInt(daysOld) : 90;

      const result = await workflowIntegrationService.cleanupOldWorkflows(cleanupDays);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Cleanup error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cleanup old workflows',
        error: error.message
      });
    }
  }
);

/**
 * Helper function to check if agent can access a lead
 * @param {number} agentId - Agent identifier
 * @param {number} leadId - Lead identifier
 */
async function canAccessLead(agentId, leadId) {
  // Implementation would check lead assignment or team membership
  // For now, return true (would be replaced with actual business logic)
  return true;
}

module.exports = router;