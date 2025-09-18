const express = require('express');
const router = express.Router();
const NotificationScheduler = require('../services/NotificationScheduler');
const { sendResponse, sendError } = require('../utils/responseHelper');

/**
 * @swagger
 * /api/notifications/trigger/lead-status-change:
 *   post:
 *     summary: Trigger lead status change notification
 *     description: Send notification when a lead's status changes (called by system events)
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lead_id
 *               - first_name
 *               - last_name
 *               - status
 *             properties:
 *               lead_id:
 *                 type: integer
 *                 description: Lead ID
 *               first_name:
 *                 type: string
 *                 description: Lead first name
 *               last_name:
 *                 type: string
 *                 description: Lead last name
 *               status:
 *                 type: string
 *                 description: New lead status
 *               previous_status:
 *                 type: string
 *                 description: Previous lead status
 *               changed_by:
 *                 type: integer
 *                 description: User ID who made the change
 *               change_timestamp:
 *                 type: string
 *                 format: date-time
 *                 description: When the status change occurred
 *     responses:
 *       200:
 *         description: Notification queued successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Status change notification queued successfully"
 *       400:
 *         $ref: '#/components/responses/400'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.post('/trigger/lead-status-change', async (req, res) => {
  try {
    const leadData = req.body;

    // Validate required fields
    if (!leadData.lead_id || !leadData.first_name || !leadData.last_name || !leadData.status) {
      return sendError(res, 'Lead ID, name, and status are required', 400);
    }

    // Send notification asynchronously (don't wait for completion)
    NotificationScheduler.sendLeadStatusChangeNotification(leadData)
      .catch(error => {
        console.error('Failed to send lead status change notification:', error);
      });

    // Return success immediately
    sendResponse(res, null, 'Status change notification queued successfully');

  } catch (error) {
    console.error('Error in lead status change trigger:', error);
    sendError(res, 'Internal server error', 500);
  }
});

/**
 * @swagger
 * /api/notifications/trigger/task-completed:
 *   post:
 *     summary: Trigger task completion notification
 *     description: Send notification when a task is completed (called by system events)
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - task_id
 *               - title
 *               - created_by
 *             properties:
 *               task_id:
 *                 type: integer
 *                 description: Task ID
 *               title:
 *                 type: string
 *                 description: Task title
 *               description:
 *                 type: string
 *                 description: Task description
 *               created_by:
 *                 type: integer
 *                 description: User ID who created the task
 *               assigned_to:
 *                 type: integer
 *                 description: User ID assigned to the task
 *               completed_by:
 *                 type: integer
 *                 description: User ID who completed the task
 *               completed_at:
 *                 type: string
 *                 format: date-time
 *                 description: Task completion timestamp
 *               priority:
 *                 type: string
 *                 enum: [Low, Medium, High, Urgent]
 *                 description: Task priority
 *     responses:
 *       200:
 *         description: Notification queued successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Task completion notification queued successfully"
 *       400:
 *         $ref: '#/components/responses/400'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.post('/trigger/task-completed', async (req, res) => {
  try {
    const taskData = req.body;

    // Validate required fields
    if (!taskData.task_id || !taskData.title || !taskData.created_by) {
      return sendError(res, 'Task ID, title, and creator are required', 400);
    }

    // Send notification asynchronously (don't wait for completion)
    NotificationScheduler.sendTaskCompletionNotification(taskData)
      .catch(error => {
        console.error('Failed to send task completion notification:', error);
      });

    // Return success immediately
    sendResponse(res, null, 'Task completion notification queued successfully');

  } catch (error) {
    console.error('Error in task completion trigger:', error);
    sendError(res, 'Internal server error', 500);
  }
});

/**
 * @swagger
 * /api/notifications/scheduler/status:
 *   get:
 *     summary: Get notification scheduler status
 *     description: Retrieve the current status and statistics of the notification scheduler
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Scheduler status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     isRunning:
 *                       type: boolean
 *                       description: Whether the scheduler is currently running
 *                     lastRun:
 *                       type: string
 *                       format: date-time
 *                       description: Timestamp of last scheduler execution
 *                     nextRun:
 *                       type: string
 *                       format: date-time
 *                       description: Timestamp of next scheduled execution
 *                     notificationsSent:
 *                       type: integer
 *                       description: Total notifications sent since startup
 *                     errors:
 *                       type: integer
 *                       description: Number of errors encountered
 *                     uptime:
 *                       type: string
 *                       description: Scheduler uptime duration
 *       401:
 *         $ref: '#/components/responses/401'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           'application/json':
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.get('/scheduler/status', async (req, res) => {
  try {
    // TODO: Add admin authentication check
    // if (!req.user || req.user.role !== 'admin') {
    //   return sendError(res, 'Admin access required', 403);
    // }

    const status = NotificationScheduler.getStatus();

    sendResponse(res, status, 'Scheduler status retrieved successfully');

  } catch (error) {
    console.error('Error getting scheduler status:', error);
    sendError(res, 'Failed to get scheduler status', 500);
  }
});

/**
 * @swagger
 * /api/notifications/scheduler/start:
 *   post:
 *     summary: Start notification scheduler
 *     description: Start the automated notification scheduler for daily reminders and follow-ups
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Scheduler started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: "started"
 *                     startedAt:
 *                       type: string
 *                       format: date-time
 *                       description: Scheduler start timestamp
 *                     nextRun:
 *                       type: string
 *                       format: date-time
 *                       description: Next scheduled execution time
 *                 message:
 *                   type: string
 *                   example: "Notification scheduler started successfully"
 *       401:
 *         $ref: '#/components/responses/401'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           'application/json':
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.post('/scheduler/start', async (req, res) => {
  try {
    // TODO: Add admin authentication check
    // if (!req.user || req.user.role !== 'admin') {
    //   return sendError(res, 'Admin access required', 403);
    // }

    NotificationScheduler.start();

    sendResponse(res, { status: 'started' }, 'Notification scheduler started successfully');

  } catch (error) {
    console.error('Error starting notification scheduler:', error);
    sendError(res, 'Failed to start scheduler', 500);
  }
});

/**
 * @swagger
 * /api/notifications/scheduler/stop:
 *   post:
 *     summary: Stop notification scheduler
 *     description: Stop the automated notification scheduler
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Scheduler stopped successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: "stopped"
 *                     stoppedAt:
 *                       type: string
 *                       format: date-time
 *                       description: Scheduler stop timestamp
 *                     uptime:
 *                       type: string
 *                       description: Total scheduler uptime before stopping
 *                 message:
 *                   type: string
 *                   example: "Notification scheduler stopped successfully"
 *       401:
 *         $ref: '#/components/responses/401'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           'application/json':
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.post('/scheduler/stop', async (req, res) => {
  try {
    // TODO: Add admin authentication check
    // if (!req.user || req.user.role !== 'admin') {
    //   return sendError(res, 'Admin access required', 403);
    // }

    NotificationScheduler.stop();

    sendResponse(res, { status: 'stopped' }, 'Notification scheduler stopped successfully');

  } catch (error) {
    console.error('Error stopping notification scheduler:', error);
    sendError(res, 'Failed to stop scheduler', 500);
  }
});

/**
 * @swagger
 * /api/notifications/scheduler/test:
 *   post:
 *     summary: Test notification scheduler
 *     description: Manually trigger daily reminders for testing purposes
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daily reminders sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: "completed"
 *                     remindersSent:
 *                       type: integer
 *                       description: Number of reminders sent
 *                     overdueTasks:
 *                       type: integer
 *                       description: Number of overdue task reminders
 *                     inactiveLeads:
 *                       type: integer
 *                       description: Number of inactive lead reminders
 *                     dueTomorrow:
 *                       type: integer
 *                       description: Number of due tomorrow reminders
 *                     executedAt:
 *                       type: string
 *                       format: date-time
 *                       description: Test execution timestamp
 *                 message:
 *                   type: string
 *                   example: "Daily reminders sent successfully"
 *       401:
 *         $ref: '#/components/responses/401'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           'application/json':
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/responses/500'
 */
router.post('/scheduler/test', async (req, res) => {
  try {
    // TODO: Add admin authentication check
    // if (!req.user || req.user.role !== 'admin') {
    //   return sendError(res, 'Admin access required', 403);
    // }

    // Trigger daily reminders manually
    await NotificationScheduler.sendDailyReminders();

    sendResponse(res, { status: 'completed' }, 'Daily reminders sent successfully');

  } catch (error) {
    console.error('Error testing daily reminders:', error);
    sendError(res, 'Failed to send daily reminders', 500);
  }
});

module.exports = router;