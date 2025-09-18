const { WorkflowActivity } = require('../../models/WorkflowActivity');
const { LeadWorkflowHistory } = require('../../models/LeadWorkflowHistory');

/**
 * Workflow Activity Logger
 * Comprehensive logging system for workflow activities and lead interactions
 */
class WorkflowActivityLogger {
  constructor() {
    this.logLevels = {
      INFO: 'info',
      WARN: 'warning',
      ERROR: 'error',
      DEBUG: 'debug'
    };
  }

  /**
   * Log workflow execution event
   * @param {string} workflowId - Workflow identifier
   * @param {string} eventType - Type of event (started, step_completed, paused, etc.)
   * @param {Object} eventData - Event-specific data
   * @param {number} userId - User who triggered the event
   */
  async logWorkflowEvent(workflowId, eventType, eventData = {}, userId = null) {
    try {
      const activity = await WorkflowActivity.create({
        workflow_id: workflowId,
        event_type: eventType,
        event_data: JSON.stringify(eventData),
        user_id: userId,
        timestamp: new Date(),
        level: this.logLevels.INFO
      });

      return activity;
    } catch (error) {
      console.error('Failed to log workflow event:', error);
      throw new Error(`Workflow event logging failed: ${error.message}`);
    }
  }

  /**
   * Log lead status change event
   * @param {number} leadId - Lead identifier
   * @param {string} oldStatus - Previous status
   * @param {string} newStatus - New status
   * @param {number} changedBy - User who made the change
   * @param {string} reason - Reason for change
   */
  async logLeadStatusChange(leadId, oldStatus, newStatus, changedBy, reason = '') {
    try {
      await LeadWorkflowHistory.create({
        lead_id: leadId,
        event_type: 'status_change',
        old_value: oldStatus,
        new_value: newStatus,
        changed_by: changedBy,
        reason: reason,
        event_data: JSON.stringify({
          oldStatus,
          newStatus,
          reason,
          timestamp: new Date()
        }),
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Failed to log lead status change:', error);
      throw new Error(`Lead status change logging failed: ${error.message}`);
    }
  }

  /**
   * Log workflow status change
   * @param {string} workflowId - Workflow identifier
   * @param {string} newStatus - New workflow status
   * @param {string} reason - Reason for status change
   * @param {number} changedBy - User who made the change
   */
  async logWorkflowStatusChange(workflowId, newStatus, reason, changedBy = null) {
    try {
      await this.logWorkflowEvent(workflowId, 'status_change', {
        newStatus,
        reason,
        changedBy
      }, changedBy);
    } catch (error) {
      console.error('Failed to log workflow status change:', error);
    }
  }

  /**
   * Log workflow override by agent
   * @param {string} workflowId - Workflow identifier
   * @param {string} overrideType - Type of override (pause, resume, cancel, restart)
   * @param {number} agentId - Agent who performed the override
   * @param {string} reason - Reason for override
   */
  async logWorkflowOverride(workflowId, overrideType, agentId, reason = '') {
    try {
      await this.logWorkflowEvent(workflowId, 'agent_override', {
        overrideType,
        reason,
        agentId
      }, agentId);

      // Also log to lead history if we can determine the lead
      const workflowDetails = await this.getWorkflowLeadId(workflowId);
      if (workflowDetails?.leadId) {
        await LeadWorkflowHistory.create({
          lead_id: workflowDetails.leadId,
          event_type: 'workflow_override',
          old_value: '',
          new_value: overrideType,
          changed_by: agentId,
          reason: reason,
          event_data: JSON.stringify({
            workflowId,
            overrideType,
            reason
          }),
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Failed to log workflow override:', error);
    }
  }

  /**
   * Log communication event (email sent, SMS delivered, etc.)
   * @param {string} workflowId - Workflow identifier
   * @param {number} leadId - Lead identifier
   * @param {string} channel - Communication channel (email, sms, in_app)
   * @param {string} eventType - Event type (sent, delivered, opened, clicked)
   * @param {Object} metadata - Additional event metadata
   */
  async logCommunicationEvent(workflowId, leadId, channel, eventType, metadata = {}) {
    try {
      await LeadWorkflowHistory.create({
        lead_id: leadId,
        event_type: 'communication',
        old_value: '',
        new_value: `${channel}_${eventType}`,
        changed_by: null, // System-generated
        reason: `Communication ${eventType} via ${channel}`,
        event_data: JSON.stringify({
          workflowId,
          channel,
          eventType,
          metadata,
          timestamp: new Date()
        }),
        timestamp: new Date()
      });

      // Also log to workflow activity
      await this.logWorkflowEvent(workflowId, 'communication_event', {
        leadId,
        channel,
        eventType,
        metadata
      });
    } catch (error) {
      console.error('Failed to log communication event:', error);
    }
  }

  /**
   * Log workflow performance metrics
   * @param {string} workflowId - Workflow identifier
   * @param {Object} metrics - Performance metrics
   */
  async logWorkflowMetrics(workflowId, metrics) {
    try {
      await this.logWorkflowEvent(workflowId, 'performance_metrics', metrics);
    } catch (error) {
      console.error('Failed to log workflow metrics:', error);
    }
  }

  /**
   * Log system-level events
   * @param {string} eventType - System event type
   * @param {Object} eventData - Event data
   */
  async logSystemEvent(eventType, eventData = {}) {
    try {
      await WorkflowActivity.create({
        workflow_id: null, // System-level event
        event_type: eventType,
        event_data: JSON.stringify(eventData),
        user_id: null,
        timestamp: new Date(),
        level: this.logLevels.INFO
      });
    } catch (error) {
      console.error('Failed to log system event:', error);
    }
  }

  /**
   * Get workflow activity history
   * @param {string} workflowId - Workflow identifier
   * @param {Object} options - Query options
   */
  async getWorkflowActivityHistory(workflowId, options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        eventTypes = [],
        startDate,
        endDate
      } = options;

      const whereClause = { workflow_id: workflowId };

      if (eventTypes.length > 0) {
        whereClause.event_type = eventTypes;
      }

      if (startDate || endDate) {
        whereClause.timestamp = {};
        if (startDate) whereClause.timestamp.$gte = startDate;
        if (endDate) whereClause.timestamp.$lte = endDate;
      }

      const activities = await WorkflowActivity.findAll({
        where: whereClause,
        order: [['timestamp', 'DESC']],
        limit,
        offset
      });

      return activities.map(activity => ({
        id: activity.id,
        workflowId: activity.workflow_id,
        eventType: activity.event_type,
        eventData: JSON.parse(activity.event_data || '{}'),
        userId: activity.user_id,
        timestamp: activity.timestamp,
        level: activity.level
      }));
    } catch (error) {
      throw new Error(`Failed to get workflow activity history: ${error.message}`);
    }
  }

  /**
   * Get lead workflow history
   * @param {number} leadId - Lead identifier
   * @param {Object} options - Query options
   */
  async getLeadWorkflowHistory(leadId, options = {}) {
    try {
      const {
        limit = 100,
        offset = 0,
        eventTypes = [],
        startDate,
        endDate
      } = options;

      const whereClause = { lead_id: leadId };

      if (eventTypes.length > 0) {
        whereClause.event_type = eventTypes;
      }

      if (startDate || endDate) {
        whereClause.timestamp = {};
        if (startDate) whereClause.timestamp.$gte = startDate;
        if (endDate) whereClause.timestamp.$lte = endDate;
      }

      const history = await LeadWorkflowHistory.findAll({
        where: whereClause,
        order: [['timestamp', 'DESC']],
        limit,
        offset
      });

      return history.map(entry => ({
        id: entry.id,
        leadId: entry.lead_id,
        eventType: entry.event_type,
        oldValue: entry.old_value,
        newValue: entry.new_value,
        changedBy: entry.changed_by,
        reason: entry.reason,
        eventData: JSON.parse(entry.event_data || '{}'),
        timestamp: entry.timestamp
      }));
    } catch (error) {
      throw new Error(`Failed to get lead workflow history: ${error.message}`);
    }
  }

  /**
   * Get workflow analytics
   * @param {Object} filters - Analytics filters
   */
  async getWorkflowAnalytics(filters = {}) {
    try {
      const {
        workflowId,
        leadId,
        eventTypes = [],
        startDate,
        endDate,
        groupBy = 'day'
      } = filters;

      // Build base query
      let query = `
        SELECT
          DATE_TRUNC('${groupBy}', timestamp) as period,
          event_type,
          COUNT(*) as event_count
        FROM workflow_activities
        WHERE 1=1
      `;

      const params = [];
      let paramIndex = 1;

      if (workflowId) {
        query += ` AND workflow_id = $${paramIndex}`;
        params.push(workflowId);
        paramIndex++;
      }

      if (leadId) {
        query += ` AND lead_id = $${paramIndex}`;
        params.push(leadId);
        paramIndex++;
      }

      if (eventTypes.length > 0) {
        query += ` AND event_type = ANY($${paramIndex})`;
        params.push(eventTypes);
        paramIndex++;
      }

      if (startDate) {
        query += ` AND timestamp >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        query += ` AND timestamp <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      query += `
        GROUP BY period, event_type
        ORDER BY period DESC, event_count DESC
      `;

      // Execute query (would need database connection)
      // const results = await db.query(query, params);

      return {
        summary: {
          totalEvents: 0,
          uniqueWorkflows: 0,
          dateRange: { startDate, endDate }
        },
        eventsByPeriod: [],
        topEventTypes: [],
        workflowPerformance: []
      };
    } catch (error) {
      throw new Error(`Failed to get workflow analytics: ${error.message}`);
    }
  }

  /**
   * Get workflow lead ID mapping
   * @private
   * @param {string} workflowId - Workflow identifier
   */
  async getWorkflowLeadId(workflowId) {
    // This would query the workflow executions table to find the lead ID
    // Implementation depends on the workflow execution table structure
    return null; // Placeholder
  }

  /**
   * Archive old workflow activities
   * @param {number} daysOld - Archive activities older than this many days
   */
  async archiveOldActivities(daysOld = 365) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      // Move old activities to archive table
      const archivedCount = await WorkflowActivity.archiveOldActivities(cutoffDate);

      await this.logSystemEvent('activity_archive', {
        archivedCount,
        cutoffDate,
        daysOld
      });

      return archivedCount;
    } catch (error) {
      throw new Error(`Failed to archive old activities: ${error.message}`);
    }
  }

  /**
   * Clean up workflow activities (hard delete)
   * @param {number} daysOld - Delete activities older than this many days
   */
  async cleanupOldActivities(daysOld = 730) { // 2 years
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const deletedCount = await WorkflowActivity.destroy({
        where: {
          timestamp: {
            [require('sequelize').Op.lt]: cutoffDate
          }
        }
      });

      await this.logSystemEvent('activity_cleanup', {
        deletedCount,
        cutoffDate,
        daysOld
      });

      return deletedCount;
    } catch (error) {
      throw new Error(`Failed to cleanup old activities: ${error.message}`);
    }
  }
}

module.exports = WorkflowActivityLogger;