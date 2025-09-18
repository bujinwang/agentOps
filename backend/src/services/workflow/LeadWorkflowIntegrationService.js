const { Lead } = require('../../models/Lead');
const WorkflowExecutionService = require('./WorkflowExecutionService');
const WorkflowActivityLogger = require('./WorkflowActivityLogger');

/**
 * Lead Workflow Integration Service
 * Handles integration between automated workflows and lead management system
 */
class LeadWorkflowIntegrationService {
  constructor() {
    this.workflowExecutionService = new WorkflowExecutionService();
    this.activityLogger = new WorkflowActivityLogger();
    this.statusChangeHandlers = new Map();
    this.workflowOverrideHandlers = new Map();

    this.setupStatusChangeMonitoring();
    this.setupWorkflowOverrideSystem();
  }

  /**
   * Setup monitoring for lead status changes
   * @private
   */
  setupStatusChangeMonitoring() {
    // Monitor for status changes that should affect workflows
    this.statusChangeHandlers.set('closed', this.handleLeadClosed.bind(this));
    this.statusChangeHandlers.set('lost', this.handleLeadLost.bind(this));
    this.statusChangeHandlers.set('qualified', this.handleLeadQualified.bind(this));
    this.statusChangeHandlers.set('contacted', this.handleLeadContacted.bind(this));
  }

  /**
   * Setup workflow override system for agent controls
   * @private
   */
  setupWorkflowOverrideSystem() {
    this.workflowOverrideHandlers.set('pause', this.pauseWorkflow.bind(this));
    this.workflowOverrideHandlers.set('resume', this.resumeWorkflow.bind(this));
    this.workflowOverrideHandlers.set('cancel', this.cancelWorkflow.bind(this));
    this.workflowOverrideHandlers.set('restart', this.restartWorkflow.bind(this));
  }

  /**
   * Handle lead status change and update associated workflows
   * @param {number} leadId - Lead identifier
   * @param {string} oldStatus - Previous lead status
   * @param {string} newStatus - New lead status
   * @param {number} changedBy - User who made the change
   * @param {string} reason - Reason for status change
   */
  async handleLeadStatusChange(leadId, oldStatus, newStatus, changedBy, reason = '') {
    try {
      // Log the status change
      await this.activityLogger.logLeadStatusChange(leadId, oldStatus, newStatus, changedBy, reason);

      // Find active workflows for this lead
      const activeWorkflows = await this.workflowExecutionService.getActiveWorkflowsForLead(leadId);

      if (activeWorkflows.length === 0) {
        return; // No active workflows to update
      }

      // Handle status-specific workflow actions
      const handler = this.statusChangeHandlers.get(newStatus.toLowerCase());
      if (handler) {
        await handler(leadId, activeWorkflows, newStatus, changedBy, reason);
      } else {
        // Default behavior: pause workflows for unknown status changes
        await this.pauseWorkflowsForLead(leadId, activeWorkflows, `Lead status changed to ${newStatus}`);
      }

      // Log workflow updates
      for (const workflow of activeWorkflows) {
        await this.activityLogger.logWorkflowStatusChange(
          workflow.id,
          workflow.status,
          `Lead status changed to ${newStatus}`,
          changedBy
        );
      }

    } catch (error) {
      console.error('Error handling lead status change:', error);
      throw new Error(`Failed to handle lead status change: ${error.message}`);
    }
  }

  /**
   * Handle lead closed - cancel all active workflows
   * @private
   */
  async handleLeadClosed(leadId, activeWorkflows, newStatus, changedBy, reason) {
    for (const workflow of activeWorkflows) {
      await this.workflowExecutionService.cancelWorkflow(
        workflow.id,
        `Lead closed: ${reason}`,
        changedBy
      );
    }
  }

  /**
   * Handle lead lost - pause workflows with option to resume later
   * @private
   */
  async handleLeadLost(leadId, activeWorkflows, newStatus, changedBy, reason) {
    for (const workflow of activeWorkflows) {
      await this.workflowExecutionService.pauseWorkflow(
        workflow.id,
        `Lead lost: ${reason}`,
        changedBy
      );
    }
  }

  /**
   * Handle lead qualified - resume or start new workflows if appropriate
   * @private
   */
  async handleLeadQualified(leadId, activeWorkflows, newStatus, changedBy, reason) {
    // Resume paused workflows or start new qualification workflows
    for (const workflow of activeWorkflows) {
      if (workflow.status === 'paused') {
        await this.workflowExecutionService.resumeWorkflow(workflow.id, changedBy);
      }
    }
  }

  /**
   * Handle lead contacted - update workflow progress
   * @private
   */
  async handleLeadContacted(leadId, activeWorkflows, newStatus, changedBy, reason) {
    // Update workflow progress to reflect contact
    for (const workflow of activeWorkflows) {
      await this.workflowExecutionService.updateWorkflowProgress(
        workflow.id,
        { lastContactDate: new Date(), contactReason: reason },
        changedBy
      );
    }
  }

  /**
   * Pause all workflows for a lead
   * @private
   */
  async pauseWorkflowsForLead(leadId, activeWorkflows, reason) {
    for (const workflow of activeWorkflows) {
      await this.workflowExecutionService.pauseWorkflow(workflow.id, reason);
    }
  }

  /**
   * Agent workflow override - pause workflow
   * @param {string} workflowId - Workflow identifier
   * @param {number} agentId - Agent performing the override
   * @param {string} reason - Reason for override
   */
  async pauseWorkflow(workflowId, agentId, reason = 'Agent override') {
    try {
      await this.workflowExecutionService.pauseWorkflow(workflowId, reason, agentId);
      await this.activityLogger.logWorkflowOverride(workflowId, 'pause', agentId, reason);
      return { success: true, message: 'Workflow paused successfully' };
    } catch (error) {
      throw new Error(`Failed to pause workflow: ${error.message}`);
    }
  }

  /**
   * Agent workflow override - resume workflow
   * @param {string} workflowId - Workflow identifier
   * @param {number} agentId - Agent performing the override
   */
  async resumeWorkflow(workflowId, agentId) {
    try {
      await this.workflowExecutionService.resumeWorkflow(workflowId, agentId);
      await this.activityLogger.logWorkflowOverride(workflowId, 'resume', agentId);
      return { success: true, message: 'Workflow resumed successfully' };
    } catch (error) {
      throw new Error(`Failed to resume workflow: ${error.message}`);
    }
  }

  /**
   * Agent workflow override - cancel workflow
   * @param {string} workflowId - Workflow identifier
   * @param {number} agentId - Agent performing the override
   * @param {string} reason - Reason for cancellation
   */
  async cancelWorkflow(workflowId, agentId, reason = 'Agent override') {
    try {
      await this.workflowExecutionService.cancelWorkflow(workflowId, reason, agentId);
      await this.activityLogger.logWorkflowOverride(workflowId, 'cancel', agentId, reason);
      return { success: true, message: 'Workflow cancelled successfully' };
    } catch (error) {
      throw new Error(`Failed to cancel workflow: ${error.message}`);
    }
  }

  /**
   * Agent workflow override - restart workflow
   * @param {string} workflowId - Workflow identifier
   * @param {number} agentId - Agent performing the override
   */
  async restartWorkflow(workflowId, agentId) {
    try {
      await this.workflowExecutionService.restartWorkflow(workflowId, agentId);
      await this.activityLogger.logWorkflowOverride(workflowId, 'restart', agentId);
      return { success: true, message: 'Workflow restarted successfully' };
    } catch (error) {
      throw new Error(`Failed to restart workflow: ${error.message}`);
    }
  }

  /**
   * Get workflow activity history for a lead
   * @param {number} leadId - Lead identifier
   * @param {Object} options - Query options
   */
  async getLeadWorkflowHistory(leadId, options = {}) {
    try {
      const history = await this.activityLogger.getLeadWorkflowHistory(leadId, options);

      // Enrich with workflow details
      for (const entry of history) {
        if (entry.workflowId) {
          const workflowDetails = await this.workflowExecutionService.getWorkflowDetails(entry.workflowId);
          entry.workflow = workflowDetails;
        }
      }

      return history;
    } catch (error) {
      throw new Error(`Failed to get workflow history: ${error.message}`);
    }
  }

  /**
   * Get workflow status summary for a lead
   * @param {number} leadId - Lead identifier
   */
  async getLeadWorkflowStatus(leadId) {
    try {
      const activeWorkflows = await this.workflowExecutionService.getActiveWorkflowsForLead(leadId);
      const pausedWorkflows = await this.workflowExecutionService.getPausedWorkflowsForLead(leadId);
      const completedWorkflows = await this.workflowExecutionService.getCompletedWorkflowsForLead(leadId);

      return {
        leadId,
        activeWorkflows: activeWorkflows.length,
        pausedWorkflows: pausedWorkflows.length,
        completedWorkflows: completedWorkflows.length,
        totalWorkflows: activeWorkflows.length + pausedWorkflows.length + completedWorkflows.length,
        workflows: {
          active: activeWorkflows,
          paused: pausedWorkflows,
          completed: completedWorkflows.slice(0, 5) // Last 5 completed
        }
      };
    } catch (error) {
      throw new Error(`Failed to get workflow status: ${error.message}`);
    }
  }

  /**
   * Bulk workflow operations for multiple leads
   * @param {Array<number>} leadIds - Array of lead identifiers
   * @param {string} operation - Operation to perform (pause, resume, cancel)
   * @param {number} agentId - Agent performing the operation
   * @param {string} reason - Reason for operation
   */
  async bulkWorkflowOperation(leadIds, operation, agentId, reason = '') {
    const results = [];
    const errors = [];

    for (const leadId of leadIds) {
      try {
        const activeWorkflows = await this.workflowExecutionService.getActiveWorkflowsForLead(leadId);

        for (const workflow of activeWorkflows) {
          const handler = this.workflowOverrideHandlers.get(operation);
          if (handler) {
            await handler(workflow.id, agentId, reason);
            results.push({
              leadId,
              workflowId: workflow.id,
              operation,
              success: true
            });
          }
        }
      } catch (error) {
        errors.push({
          leadId,
          operation,
          error: error.message
        });
      }
    }

    return {
      total: leadIds.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors
    };
  }

  /**
   * Get workflow analytics for lead management
   * @param {Object} filters - Analytics filters
   */
  async getWorkflowAnalytics(filters = {}) {
    try {
      const analytics = await this.activityLogger.getWorkflowAnalytics(filters);

      // Add lead status correlation
      const leadStatusCorrelation = await this.getLeadStatusWorkflowCorrelation(filters);

      return {
        ...analytics,
        leadStatusCorrelation
      };
    } catch (error) {
      throw new Error(`Failed to get workflow analytics: ${error.message}`);
    }
  }

  /**
   * Get correlation between lead status changes and workflow activities
   * @private
   */
  async getLeadStatusWorkflowCorrelation(filters) {
    // Implementation would analyze how lead status changes affect workflow performance
    return {
      statusChanges: [],
      workflowImpacts: [],
      recommendations: []
    };
  }

  /**
   * Cleanup completed workflows older than specified days
   * @param {number} daysOld - Age threshold in days
   */
  async cleanupOldWorkflows(daysOld = 90) {
    try {
      const deletedCount = await this.workflowExecutionService.cleanupCompletedWorkflows(daysOld);
      await this.activityLogger.logSystemEvent('workflow_cleanup', {
        deletedWorkflows: deletedCount,
        daysThreshold: daysOld
      });

      return {
        deletedWorkflows: deletedCount,
        message: `Cleaned up ${deletedCount} workflows older than ${daysOld} days`
      };
    } catch (error) {
      throw new Error(`Failed to cleanup old workflows: ${error.message}`);
    }
  }
}

module.exports = LeadWorkflowIntegrationService;