const express = require('express');
const router = express.Router();
const NotificationScheduler = require('../services/NotificationScheduler');
const { sendResponse, sendError } = require('../utils/responseHelper');

/**
 * @route POST /api/notifications/trigger/lead-status-change
 * @desc Trigger notification for lead status change
 * @access Public (called by system events)
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
 * @route POST /api/notifications/trigger/task-completed
 * @desc Trigger notification for task completion
 * @access Public (called by system events)
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
 * @route GET /api/notifications/scheduler/status
 * @desc Get notification scheduler status
 * @access Private (Admin only)
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
 * @route POST /api/notifications/scheduler/start
 * @desc Start the notification scheduler
 * @access Private (Admin only)
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
 * @route POST /api/notifications/scheduler/stop
 * @desc Stop the notification scheduler
 * @access Private (Admin only)
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
 * @route POST /api/notifications/scheduler/test
 * @desc Manually trigger daily reminders for testing
 * @access Private (Admin only)
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