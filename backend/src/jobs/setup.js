
const Queue = require('bull');
const { getRedisClient, isRedisConnected } = require('../config/redis');
const { logger } = require('../config/logger');
const { processAIAnalysis } = require('./aiAnalysis');

// Job queues
let aiAnalysisQueue;
let emailQueue;
let notificationQueue;

const setupJobQueues = async () => {
  try {
    if (!isRedisConnected()) {
      logger.warn('Redis not connected - job queues will be disabled');
      return;
    }

    // AI Analysis Queue
    aiAnalysisQueue = new Queue('AI Analysis', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB || 0
      },
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    });

    // Email Queue
    emailQueue = new Queue('Email Notifications', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB || 0
      },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 30000
        }
      }
    });

    // Notification Queue
    notificationQueue = new Queue('Push Notifications', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB || 0
      },
      defaultJobOptions: {
        removeOnComplete: 1000,
        removeOnFail: 100,
        attempts: 2,
        backoff: {
          type: 'fixed',
          delay: 5000
        }
      }
    });

    // Setup queue processors
    setupQueueProcessors();

    // Setup queue event handlers
    setupQueueEventHandlers();

    logger.info('Job queues setup successfully');
  } catch (error) {
    logger.error('Failed to setup job queues:', error);
    throw error;
  }
};

const setupQueueProcessors = () => {
  // AI Analysis Processor
  aiAnalysisQueue.process('analyze-lead', 2, async (job) => { // Process 2 jobs concurrently
    const { leadId, leadData } = job.data;
    logger.info(`Processing AI analysis for lead ${leadId}`);
    
    try {
      const result = await processAIAnalysis(leadData);
      
      // Update lead with AI summary
      const { getDatabase } = require('../config/database');
      const db = getDatabase();
      
      await db.query(
        'UPDATE leads SET ai_summary = $1, updated_at = NOW() WHERE lead_id = $2',
        [result.summary, leadId]
      );
      
      logger.info(`AI analysis completed for lead ${leadId}`);
      return result;
    } catch (error) {
      logger.error(`AI analysis failed for lead ${leadId}:`, error);
      throw error;
    }
  });

  // Email Processor
  emailQueue.process('send-email', 5, async (job) => {
    const { to, subject, template, data } = job.data;
    logger.info(`Processing email to ${to}`);
    
    try {
      // Email sending logic would go here
      // For now, we'll just log it
      logger.info(`Email sent to ${to}: ${subject}`);
      return { success: true, messageId: 'mock-message-id' };
    } catch (error) {
      logger.error(`Email failed to ${to}:`, error);
      throw error;
    }
  });

  // Notification Processor
  notificationQueue.process('send-notification', 10, async (job) => {
    const { userId, title, message, type } = job.data;
    logger.info(`Processing notification for user ${userId}`);
    
    try {
      // Notification sending logic would go here
      // For now, we'll just log it
      logger.info(`Notification sent to user ${userId}: ${title}`);
      return { success: true, notificationId: 'mock-notification-id' };
    } catch (error) {
      logger.error(`Notification failed for user ${userId}:`, error);
      throw error;
    }
  });
};

const setupQueueEventHandlers = () => {
  // AI Analysis Queue Events
  aiAnalysisQueue.on('completed', (job, result) => {
    logger.info(`AI Analysis job ${job.id} completed for lead ${job.data.leadId}`);
  });

  aiAnalysisQueue.on('failed', (job, err) => {
    logger.error(`AI Analysis job ${job.id} failed:`, err);
  });

  aiAnalysisQueue.on('stalled', (job) => {
    logger.warn(`AI Analysis job ${job.id} stalled`);
  });

  // Email Queue Events
  emailQueue.on('completed', (job, result) => {
    logger.info(`Email job ${job.id} completed`);
  });

  emailQueue.on('failed', (job, err) => {
    logger.error(`Email job ${job.id} failed:`, err);
  });

  // Notification Queue Events
  notificationQueue.on('completed', (job, result) => {
    logger.info(`Notification job ${job.id} completed`);
  });

  notificationQueue.on('failed', (job, err) => {
    logger.error(`Notification job ${job.id} failed:`, err);
  });
};

// Job queue helpers
const addAIAnalysisJob = async (leadId, leadData) => {
  if (!aiAnalysisQueue) {
    logger.warn('AI Analysis queue not available');
    return null;
  }

  try {
    const job = await aiAnalysisQueue.add('analyze-lead', {
      leadId,
      leadData
    }, {
      delay: 1000, // 1 second delay to allow transaction to complete
      priority: 1
    });

    logger.info(`AI Analysis job added for lead ${leadId}: ${job.id}`);
    return job;
  } catch (error) {
    logger.error(`Failed to add AI analysis job for lead ${leadId}:`, error);
    throw error;
  }
};

const addEmailJob = async (emailData) => {
  if (!emailQueue) {
    logger.warn('Email queue not available');
    return null;
  }

  try {
    const job = await emailQueue.add('send-email', emailData, {
      priority: 2
    });

    logger.info(`Email job added: ${job.id}`);
    return job;
  } catch (error) {
    logger.error('Failed to add email job:', error);
    throw error;
  }
};

const addNotificationJob = async (notificationData) => {
  if (!notificationQueue) {
    logger.warn('Notification queue not available');
    return null;
  }

  try {
    const job = await notificationQueue.add('send-notification', notificationData, {
      priority: 3
    });

    logger.info(`Notification job added: ${job.id}`);
    return job;
  } catch (error) {
    logger.error('Failed to add notification job:', error);
    throw error;
  }
};

// Graceful shutdown
const closeJobQueues = async () => {
  try {
    if (aiAnalysisQueue) {
      await aiAnalysisQueue.close();
      logger.info('AI Analysis queue closed');
    }
    if (emailQueue) {
      await emailQueue.close();
      logger.info('Email queue closed');
    }
    if (notificationQueue) {
      await notificationQueue.close();
      logger.info('Notification queue closed');
    }
  } catch (error) {
    logger.error('Error closing job queues:', error);
    throw error;
  }
};

module.exports = {
  setupJobQueues,
  addAIAnalysisJob,
  addEmailJob,
  addNotificationJob,
  closeJobQueues,
  getQueues: () => ({
    aiAnalysis: aiAnalysisQueue,
    email: emailQueue,
    notification: notificationQueue
  })
};