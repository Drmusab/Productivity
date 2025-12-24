/**
 * @fileoverview Notification service for sending alerts to users and external systems.
 * Provides functions for sending task reminders, due date alerts, and routine notifications.
 * Integrates with n8n webhooks for external notification delivery.
 * @module services/notifications
 */

const { allAsync } = require('../utils/database');
const { triggerWebhook } = require('./webhook');
const logger = require('../utils/logger');

/**
 * Send a notification to configured channels (n8n webhooks).
 * Creates a structured notification payload and dispatches to all enabled integrations.
 * 
 * @async
 * @function sendNotification
 * @param {string} title - Notification title
 * @param {string} message - Notification message body
 * @param {Object} [options={}] - Additional notification options
 * @param {string} [options.type='info'] - Notification type ('info', 'reminder', 'due', 'routine')
 * @param {number} [options.taskId=null] - Associated task ID
 * @param {number} [options.boardId=null] - Associated board ID
 * @param {string} [options.priority='normal'] - Priority level ('normal', 'high')
 * @param {boolean} [options.sendToN8n=true] - Whether to send to n8n webhooks
 * @param {Object} [options.metadata={}] - Additional metadata for the notification
 * @returns {Promise<Object>} Result object with success status
 * @example
 * await sendNotification('Task Due', 'Your task is due in 30 minutes', {
 *   type: 'due',
 *   taskId: 123,
 *   priority: 'high'
 * });
 */
const sendNotification = async (title, message, options = {}) => {
  try {
    const {
      type = 'info',
      taskId = null,
      boardId = null,
      priority = 'normal',
      sendToN8n = true,
      metadata = {}
    } = options;

    // Send to n8n webhooks if enabled
    if (sendToN8n) {
      try {
        const integrations = await allAsync(
          'SELECT * FROM integrations WHERE type = ? AND enabled = 1',
          ['n8n_webhook']
        );

        if (integrations && integrations.length > 0) {
          const notificationPayload = {
            type: 'notification',
            title,
            message,
            notificationType: type,
            priority,
            taskId,
            boardId,
            timestamp: new Date().toISOString(),
            metadata
          };

          // Send to all enabled n8n webhooks
          const webhookPromises = integrations.map(integration =>
            triggerWebhook(integration.id, notificationPayload)
          );

          await Promise.allSettled(webhookPromises);
        }
      } catch (webhookError) {
        logger.error('Failed to send notification to n8n', { error: webhookError.message });
        // Don't fail the notification if webhook fails
      }
    }
    
    return {
      success: true,
      message: 'Notification sent successfully'
    };
  } catch (error) {
    logger.error('Error sending notification', { error: error.message, title });
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Send a task reminder notification.
 * Used for general task reminders.
 * 
 * @async
 * @function sendTaskReminder
 * @param {Object} task - Task object
 * @param {number} task.id - Task ID
 * @param {string} task.title - Task title
 * @param {string} [task.priority] - Task priority
 * @param {string} [task.due_date] - Task due date
 * @param {number} [task.column_id] - Task column ID
 * @returns {Promise<Object>} Result object with success status
 * @example
 * await sendTaskReminder({ id: 123, title: 'Complete report', priority: 'high' });
 */
const sendTaskReminder = async (task) => {
  const title = 'Task Reminder';
  const message = `Task "${task.title}" is due`;
  
  return sendNotification(title, message, {
    type: 'reminder',
    taskId: task.id,
    priority: task.priority || 'normal',
    metadata: {
      dueDate: task.due_date,
      columnId: task.column_id
    }
  });
};

/**
 * Send a routine task reminder notification.
 * Used for recurring/routine tasks.
 * 
 * @async
 * @function sendRoutineReminder
 * @param {Object} task - Task object with recurring rule
 * @param {number} task.id - Task ID
 * @param {string} task.title - Task title
 * @param {string} [task.priority] - Task priority
 * @param {string} [task.due_date] - Task due date
 * @param {string} [task.recurring_rule] - JSON string of recurring rule configuration
 * @returns {Promise<Object>} Result object with success status
 * @example
 * await sendRoutineReminder({
 *   id: 123,
 *   title: 'Daily standup',
 *   recurring_rule: '{"frequency":"daily","notificationLeadTime":15}'
 * });
 */
const sendRoutineReminder = async (task) => {
  const title = 'Routine Reminder';
  const message = `Routine task "${task.title}" is scheduled`;

  const recurringRule = safeParseRecurringRule(task.recurring_rule);

  return sendNotification(title, message, {
    type: 'routine',
    taskId: task.id,
    priority: task.priority || 'normal',
    metadata: {
      dueDate: task.due_date,
      recurringRule: task.recurring_rule,
      notificationLeadTime: recurringRule.notificationLeadTime
    }
  });
};

/**
 * Send a task due soon or overdue notification.
 * Provides urgency-appropriate messaging based on time until due.
 * 
 * @async
 * @function sendTaskDueNotification
 * @param {Object} task - Task object
 * @param {number} task.id - Task ID
 * @param {string} task.title - Task title
 * @param {string} [task.due_date] - Task due date
 * @param {number} minutesUntilDue - Minutes until the task is due (negative if overdue)
 * @returns {Promise<Object>} Result object with success status
 * @example
 * await sendTaskDueNotification({ id: 123, title: 'Submit report' }, 30);
 * // Sends: "Task 'Submit report' is due in 30 minutes"
 * 
 * await sendTaskDueNotification({ id: 123, title: 'Submit report' }, -15);
 * // Sends: "Task 'Submit report' is overdue"
 */
const sendTaskDueNotification = async (task, minutesUntilDue) => {
  const title = 'Task Due Soon';
  const message = minutesUntilDue > 0 
    ? `Task "${task.title}" is due in ${minutesUntilDue} minutes`
    : `Task "${task.title}" is overdue`;
  
  return sendNotification(title, message, {
    type: 'due',
    taskId: task.id,
    priority: 'high',
    metadata: {
      dueDate: task.due_date,
      minutesUntilDue,
      isOverdue: minutesUntilDue <= 0
    }
  });
};

module.exports = {
  sendNotification,
  sendTaskReminder,
  sendRoutineReminder,
  sendTaskDueNotification
};

/**
 * Safely parse a recurring rule JSON string.
 * Returns default values if parsing fails.
 * 
 * @function safeParseRecurringRule
 * @param {string|Object} ruleString - JSON string or object of recurring rule
 * @returns {Object} Parsed recurring rule with defaults
 * @private
 */
const safeParseRecurringRule = (ruleString) => {
  try {
    const parsed = typeof ruleString === 'string' ? JSON.parse(ruleString) : (ruleString || {});
    return {
      notificationLeadTime: parsed.notificationLeadTime || 60,
      ...parsed,
    };
  } catch (error) {
    return { notificationLeadTime: 60 };
  }
};