// Workflow Service - Handles automated follow-up workflows
// Based on Story 4.1 requirements for configurable workflow triggers

const { pool } = require('../config/database');
const TemplatePersonalizationService = require('./TemplatePersonalizationService');
const ABTestingService = require('./ABTestingService');
const { getDatabase } = require('../config/database');
const { logger } = require('../config/logger');

class WorkflowService {
  constructor() {
    this.pool = pool;
  }

  // Check and trigger workflows for a lead based on score
  async checkWorkflowTriggers(leadId, newScore, userId) {
    try {
      // Get active workflows for this user that match the score range
      const workflows = await this.getActiveWorkflowsForScore(userId, newScore);

      if (workflows.length === 0) {
        return { triggered: false, workflows: [] };
      }

      const triggeredWorkflows = [];

      // For each matching workflow, schedule the first sequence step
      for (const workflow of workflows) {
        const triggered = await this.triggerWorkflow(workflow, leadId);
        if (triggered) {
          triggeredWorkflows.push(workflow);
        }
      }

      return {
        triggered: triggeredWorkflows.length > 0,
        workflows: triggeredWorkflows
      };
    } catch (error) {
      console.error('Error checking workflow triggers:', error);
      return { triggered: false, workflows: [], error: error.message };
    }
  }

  // Get active workflows that match the score criteria
  async getActiveWorkflowsForScore(userId, score) {
    const query = `
      SELECT * FROM workflow_configurations
      WHERE user_id = $1
        AND is_active = true
        AND (
          (trigger_score_min IS NULL OR $2 >= trigger_score_min) AND
          (trigger_score_max IS NULL OR $2 <= trigger_score_max)
        )
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query, [userId, score]);
    return result.rows;
  }

  // Trigger a workflow for a specific lead
  async triggerWorkflow(workflow, leadId) {
    try {
      // Check if this workflow has already been triggered for this lead
      const existingExecution = await this.getExistingExecution(workflow.workflow_id, leadId);
      if (existingExecution) {
        return false; // Already triggered
      }

      // Get the first sequence step
      const firstStep = await this.getFirstSequenceStep(workflow.workflow_id);
      if (!firstStep) {
        console.warn(`No sequence steps found for workflow ${workflow.workflow_id}`);
        return false;
      }

      // Schedule the first step execution
      const scheduledAt = new Date();
      scheduledAt.setHours(scheduledAt.getHours() + (firstStep.delay_hours || 0));

      const executionQuery = `
        INSERT INTO workflow_executions
        (workflow_id, lead_id, sequence_id, status, scheduled_at)
        VALUES ($1, $2, $3, 'pending', $4)
        RETURNING execution_id
      `;

      const result = await this.pool.query(executionQuery, [
        workflow.workflow_id,
        leadId,
        firstStep.sequence_id,
        scheduledAt
      ]);

      return result.rows.length > 0;
    } catch (error) {
      console.error('Error triggering workflow:', error);
      return false;
    }
  }

  // Get existing execution for workflow and lead
  async getExistingExecution(workflowId, leadId) {
    const query = `
      SELECT execution_id FROM workflow_executions
      WHERE workflow_id = $1 AND lead_id = $2
      LIMIT 1
    `;

    const result = await this.pool.query(query, [workflowId, leadId]);
    return result.rows[0];
  }

  // Get the first sequence step for a workflow
  async getFirstSequenceStep(workflowId) {
    const query = `
      SELECT * FROM workflow_sequences
      WHERE workflow_id = $1 AND step_number = 1 AND is_active = true
      ORDER BY created_at ASC
      LIMIT 1
    `;

    const result = await this.pool.query(query, [workflowId]);
    return result.rows[0];
  }

  // Process pending workflow executions
  async processPendingExecutions() {
    try {
      const now = new Date();

      // Get pending executions that are due
      const pendingQuery = `
        SELECT we.*, ws.action_type, ws.template_id, pt.name as template_name, pt.channel as template_channel
        FROM workflow_executions we
        JOIN workflow_sequences ws ON we.sequence_id = ws.sequence_id
        LEFT JOIN personalized_templates pt ON ws.template_id = pt.template_id
        WHERE we.status = 'pending'
          AND we.scheduled_at <= $1
        ORDER BY we.scheduled_at ASC
        LIMIT 10
      `;

      const pendingResult = await this.pool.query(pendingQuery, [now]);

      for (const execution of pendingResult.rows) {
        await this.executeWorkflowStep(execution);
      }

      return { processed: pendingResult.rows.length };
    } catch (error) {
      console.error('Error processing pending executions:', error);
      return { processed: 0, error: error.message };
    }
  }

  // Execute a single workflow step
  async executeWorkflowStep(execution) {
    try {
      // Mark as in progress
      await this.updateExecutionStatus(execution.execution_id, 'in_progress');

      // Execute based on action type
      let success = false;
      switch (execution.action_type) {
        case 'email':
          success = await this.sendEmail(execution);
          break;
        case 'sms':
          success = await this.sendSMS(execution);
          break;
        case 'task':
          success = await this.createTask(execution);
          break;
        case 'notification':
          success = await this.sendNotification(execution);
          break;
        default:
          console.warn(`Unknown action type: ${execution.action_type}`);
          success = false;
      }

      // Update execution status
      const status = success ? 'completed' : 'failed';
      await this.updateExecutionStatus(execution.execution_id, status, success ? null : 'Execution failed');

      // If successful and there are more steps, schedule the next one
      if (success) {
        await this.scheduleNextStep(execution);
      }

    } catch (error) {
      console.error('Error executing workflow step:', error);
      await this.updateExecutionStatus(execution.execution_id, 'failed', error.message);
    }
  }

  // Update execution status
  async updateExecutionStatus(executionId, status, errorMessage = null) {
    const query = `
      UPDATE workflow_executions
      SET status = $1, executed_at = CURRENT_TIMESTAMP, error_message = $2, updated_at = CURRENT_TIMESTAMP
      WHERE execution_id = $3
    `;

    await this.pool.query(query, [status, errorMessage, executionId]);
  }

  // Schedule the next step in the sequence
  async scheduleNextStep(currentExecution) {
    try {
      // Get the next step in the sequence
      const nextStepQuery = `
        SELECT * FROM workflow_sequences
        WHERE workflow_id = $1 AND step_number > (
          SELECT step_number FROM workflow_sequences WHERE sequence_id = $2
        ) AND is_active = true
        ORDER BY step_number ASC
        LIMIT 1
      `;

      const nextStepResult = await this.pool.query(nextStepQuery, [
        currentExecution.workflow_id,
        currentExecution.sequence_id
      ]);

      if (nextStepResult.rows.length > 0) {
        const nextStep = nextStepResult.rows[0];

        // Schedule the next execution
        const scheduledAt = new Date();
        scheduledAt.setHours(scheduledAt.getHours() + (nextStep.delay_hours || 0));

        const insertQuery = `
          INSERT INTO workflow_executions
          (workflow_id, lead_id, sequence_id, status, scheduled_at)
          VALUES ($1, $2, $3, 'pending', $4)
        `;

        await this.pool.query(insertQuery, [
          currentExecution.workflow_id,
          currentExecution.lead_id,
          nextStep.sequence_id,
          scheduledAt
        ]);
      }
    } catch (error) {
      console.error('Error scheduling next step:', error);
    }
  }

  // Send email using personalized template
  async sendEmail(execution) {
    try {
      // Get lead data for template rendering
      const leadData = await this.getLeadData(execution.lead_id);
      if (!leadData) {
        throw new Error(`Lead ${execution.lead_id} not found`);
      }

      // Select personalized template based on lead characteristics
      const selectedTemplate = await TemplatePersonalizationService.selectTemplateForLead(
        leadData.user_id,
        leadData,
        { channel: 'email', workflowId: execution.workflow_id }
      );

      if (!selectedTemplate) {
        logger.warn(`No suitable email template found for lead ${execution.lead_id}`);
        return false;
      }

      // Check for A/B testing experiments
      let templateToUse = selectedTemplate;
      let variantId = null;

      try {
        const experiments = await ABTestingService.getExperiments(leadData.user_id, {
          status: 'running',
          templateId: selectedTemplate.templateId
        });

        if (experiments.experiments.length > 0) {
          // Select variant for A/B testing
          const variant = await ABTestingService.selectVariantForLead(
            experiments.experiments[0].experimentId,
            execution.lead_id
          );
          if (variant) {
            templateToUse = {
              ...selectedTemplate,
              contentTemplate: variant.content_template,
              subjectTemplate: variant.subject_template
            };
            variantId = variant.variant_id;
          }
        }
      } catch (abError) {
        logger.warn('A/B testing selection failed, using default template:', abError.message);
      }

      // Render personalized template with lead data
      const renderedTemplate = await TemplatePersonalizationService.renderTemplate(
        templateToUse.templateId,
        leadData,
        { name: 'Real Estate Agent', email: await this.getUserEmail(leadData.user_id) }
      );

      // Get user email for sending
      const userEmail = await this.getUserEmail(leadData.user_id);

      // Track template usage
      await TemplatePersonalizationService.trackTemplateUsage({
        templateId: templateToUse.templateId,
        variantId,
        leadId: execution.lead_id,
        workflowId: execution.workflow_id,
        channel: 'email'
      });

      // Queue email for sending
      const emailQueue = require('../jobs/setup').emailQueue;
      await emailQueue.add('send-email', {
        to: leadData.email,
        from: userEmail,
        subject: renderedTemplate.renderedSubject,
        content: renderedTemplate.renderedContent,
        leadId: execution.lead_id,
        executionId: execution.execution_id,
        templateId: templateToUse.templateId,
        variantId
      });

      logger.info(`Personalized email queued for execution ${execution.execution_id} to ${leadData.email} using template ${templateToUse.templateId}`);
      return true;
    } catch (error) {
      logger.error(`Error sending personalized email for execution ${execution.execution_id}:`, error);
      return false;
    }
  }

  // Send SMS using personalized template
  async sendSMS(execution) {
    try {
      // Get lead data for template rendering
      const leadData = await this.getLeadData(execution.lead_id);
      if (!leadData) {
        throw new Error(`Lead ${execution.lead_id} not found`);
      }

      // Select personalized template based on lead characteristics
      const selectedTemplate = await TemplatePersonalizationService.selectTemplateForLead(
        leadData.user_id,
        leadData,
        { channel: 'sms', workflowId: execution.workflow_id }
      );

      if (!selectedTemplate) {
        logger.warn(`No suitable SMS template found for lead ${execution.lead_id}`);
        return false;
      }

      // Check for A/B testing experiments
      let templateToUse = selectedTemplate;
      let variantId = null;

      try {
        const experiments = await ABTestingService.getExperiments(leadData.user_id, {
          status: 'running',
          templateId: selectedTemplate.templateId
        });

        if (experiments.experiments.length > 0) {
          // Select variant for A/B testing
          const variant = await ABTestingService.selectVariantForLead(
            experiments.experiments[0].experimentId,
            execution.lead_id
          );
          if (variant) {
            templateToUse = {
              ...selectedTemplate,
              contentTemplate: variant.content_template,
              subjectTemplate: variant.subject_template
            };
            variantId = variant.variant_id;
          }
        }
      } catch (abError) {
        logger.warn('A/B testing selection failed, using default template:', abError.message);
      }

      // Render personalized template with lead data
      const renderedTemplate = await TemplatePersonalizationService.renderTemplate(
        templateToUse.templateId,
        leadData,
        { name: 'Real Estate Agent', phone: await this.getUserPhone(leadData.user_id) }
      );

      // Track template usage
      await TemplatePersonalizationService.trackTemplateUsage({
        templateId: templateToUse.templateId,
        variantId,
        leadId: execution.lead_id,
        workflowId: execution.workflow_id,
        channel: 'sms'
      });

      // Queue SMS for sending using Twilio
      const smsQueue = require('../jobs/setup').smsQueue;
      await smsQueue.add('send-sms', {
        to: leadData.phone_number,
        from: process.env.TWILIO_PHONE_NUMBER,
        message: renderedTemplate.renderedContent,
        leadId: execution.lead_id,
        executionId: execution.execution_id,
        templateId: templateToUse.templateId,
        variantId
      });

      logger.info(`Personalized SMS queued for execution ${execution.execution_id} to ${leadData.phone_number} using template ${templateToUse.templateId}`);
      return true;
    } catch (error) {
      logger.error(`Error sending personalized SMS for execution ${execution.execution_id}:`, error);
      return false;
    }
  }

  // Create task for workflow execution
  async createTask(execution) {
    try {
      // Get lead data
      const leadData = await this.getLeadData(execution.lead_id);
      if (!leadData) {
        throw new Error(`Lead ${execution.lead_id} not found`);
      }

      // Create a follow-up task
      const db = getDatabase();
      const taskQuery = `
        INSERT INTO tasks
        (lead_id, user_id, title, description, due_date, priority)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP + INTERVAL '1 day', 'High')
        RETURNING task_id
      `;

      const taskTitle = `Follow-up with ${leadData.first_name} ${leadData.last_name}`;
      const taskDescription = `Automated workflow follow-up for lead ${leadData.first_name} ${leadData.last_name}. Previous interaction: ${leadData.last_contacted_at || 'No previous contact'}`;

      const result = await db.query(taskQuery, [
        execution.lead_id,
        leadData.user_id,
        taskTitle,
        taskDescription
      ]);

      logger.info(`Task created for execution ${execution.execution_id}: ${taskTitle}`);
      return result.rows.length > 0;
    } catch (error) {
      logger.error(`Error creating task for execution ${execution.execution_id}:`, error);
      return false;
    }
  }

  // Send in-app notification
  async sendNotification(execution) {
    try {
      // Get lead data
      const leadData = await this.getLeadData(execution.lead_id);
      if (!leadData) {
        throw new Error(`Lead ${execution.lead_id} not found`);
      }

      // Create in-app notification
      const db = getDatabase();
      const notificationQuery = `
        INSERT INTO notifications
        (user_id, title, message, type, related_id, related_type, action_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING notification_id
      `;

      const title = `Workflow Follow-up: ${leadData.first_name} ${leadData.last_name}`;
      const message = `Automated workflow triggered for lead ${leadData.first_name} ${leadData.last_name}. Please review and follow up.`;
      const actionUrl = `/leads/${execution.lead_id}`;

      const result = await db.query(notificationQuery, [
        leadData.user_id,
        title,
        message,
        'workflow',
        execution.lead_id,
        'lead',
        actionUrl
      ]);

      logger.info(`Notification created for execution ${execution.execution_id}: ${title}`);
      return result.rows.length > 0;
    } catch (error) {
      logger.error(`Error creating notification for execution ${execution.execution_id}:`, error);
      return false;
    }
  }

  // Helper method to get lead data
  async getLeadData(leadId) {
    const query = `
      SELECT l.*, u.email as user_email, u.user_id
      FROM leads l
      JOIN users u ON l.user_id = u.user_id
      WHERE l.lead_id = $1
    `;

    const result = await this.pool.query(query, [leadId]);
    return result.rows[0];
  }

  // Helper method to get user email
  async getUserEmail(userId) {
    const query = 'SELECT email FROM users WHERE user_id = $1';
    const result = await this.pool.query(query, [userId]);
    return result.rows[0]?.email;
  }

  // Helper method to get user phone
  async getUserPhone(userId) {
    const query = 'SELECT phone FROM users WHERE user_id = $1';
    const result = await this.pool.query(query, [userId]);
    return result.rows[0]?.phone;
  }
}

module.exports = new WorkflowService();