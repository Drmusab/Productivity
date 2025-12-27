// @ts-nocheck
/**
 * @fileoverview Automation service for triggering rule-based actions.
 * Handles event-driven automation rules with webhook, notification, and task actions.
 * @module services/automation
 */

import {  allAsync, getAsync, runAsync  } from '../utils/database';
import {  triggerWebhook  } from './webhook';
import {  sendNotification  } from './notifications';
import logger from '../utils/logger';

/**
 * Trigger automation rules based on an event type and associated data.
 * Fetches all enabled rules matching the event type, checks conditions,
 * and executes corresponding actions.
 * 
 * @async
 * @function triggerAutomation
 * @param {string} eventType - The type of event (e.g., 'task_created', 'task_moved', 'task_deleted')
 * @param {Object} eventData - Data associated with the event
 * @param {number} [eventData.taskId] - ID of the affected task
 * @param {number} [eventData.columnId] - Current column ID
 * @param {number} [eventData.oldColumnId] - Previous column ID (for move events)
 * @param {number} [eventData.newColumnId] - New column ID (for move events)
 * @param {string} [eventData.priority] - Task priority
 * @param {number} [eventData.assignedTo] - User ID the task is assigned to
 * @returns {Promise<void>}
 * @example
 * await triggerAutomation('task_created', { taskId: 123, columnId: 1, priority: 'high' });
 */
const triggerAutomation = async (eventType, eventData) => {
  try {
    const rules = await allAsync(
      'SELECT * FROM automation_rules WHERE trigger_type = ? AND enabled = 1',
      [eventType]
    );

    for (const rule of rules) {
      try {
        const triggerConfig = parseConfig(rule.trigger_config, 'trigger');
        const actionConfig = parseConfig(rule.action_config, 'action');

        if (!checkTriggerConditions(triggerConfig, eventData)) {
          continue;
        }

        const result = await executeAutomationAction(rule.action_type, actionConfig, eventData);

        const status = result?.success === false ? 'failed' : 'success';
        const message = result?.message || result?.error || `Triggered by ${eventType}`;

        await runAsync(
          'INSERT INTO automation_logs (rule_id, status, message) VALUES (?, ?, ?)',
          [rule.id, status, message]
        );
      } catch (error) {
        logger.error(`Error executing automation rule ${rule.id}`, { error: error.message });

        try {
          await runAsync(
            'INSERT INTO automation_logs (rule_id, status, message) VALUES (?, ?, ?)',
            [rule.id, 'failed', error.message]
          );
        } catch (logError) {
          logger.error('Failed to log automation execution', { error: logError.message });
        }
      }
    }
  } catch (error) {
    logger.error('Error in triggerAutomation', { error: error.message, eventType });
  }
};

/**
 * Check if trigger conditions are met for an automation rule.
 * Validates column, priority, assignment, and movement conditions.
 * 
 * @function checkTriggerConditions
 * @param {Object} triggerConfig - Configuration object from the automation rule
 * @param {number} [triggerConfig.columnId] - Required column ID
 * @param {string} [triggerConfig.priority] - Required priority level
 * @param {number} [triggerConfig.assignedTo] - Required assignee
 * @param {number} [triggerConfig.fromColumnId] - Source column for move events
 * @param {number} [triggerConfig.toColumnId] - Destination column for move events
 * @param {Object} eventData - Data from the triggered event
 * @returns {boolean} True if all conditions are met, false otherwise
 * @example
 * const match = checkTriggerConditions({ priority: 'high' }, { priority: 'high' });
 * // Returns: true
 */
const checkTriggerConditions = (triggerConfig, eventData) => {
  // For task_created, task_updated, task_deleted events
  if (triggerConfig.columnId && eventData.columnId !== triggerConfig.columnId) {
    return false;
  }
  
  if (triggerConfig.priority && eventData.priority !== triggerConfig.priority) {
    return false;
  }
  
  if (triggerConfig.assignedTo && eventData.assignedTo !== triggerConfig.assignedTo) {
    return false;
  }
  
  // For task_moved event
  if (eventData.oldColumnId && triggerConfig.fromColumnId && eventData.oldColumnId !== triggerConfig.fromColumnId) {
    return false;
  }
  
  if (eventData.newColumnId && triggerConfig.toColumnId && eventData.newColumnId !== triggerConfig.toColumnId) {
    return false;
  }
  
  // For task_due, task_overdue events
  if (triggerConfig.priority && eventData.priority !== triggerConfig.priority) {
    return false;
  }
  
  return true;
};

/**
 * Execute an automation action based on the action type.
 * Supports webhook, notification, move_task, update_task, and create_task actions.
 * 
 * @async
 * @function executeAutomationAction
 * @param {string} actionType - Type of action ('webhook', 'notification', 'move_task', 'update_task', 'create_task')
 * @param {Object} actionConfig - Configuration for the action
 * @param {Object} eventData - Data from the triggering event
 * @returns {Promise<Object>} Result object with success status and message or error
 * @throws {Error} If action type is unknown
 * @example
 * const result = await executeAutomationAction('notification', { title: 'Alert', message: 'Task created' }, {});
 */
const executeAutomationAction = async (actionType, actionConfig, eventData) => {
  switch (actionType) {
    case 'webhook':
      return triggerWebhook(actionConfig.webhookId, eventData);
    case 'notification':
      return sendNotification(
        actionConfig.title || 'Automation Triggered',
        actionConfig.message || `Automation triggered by event: ${JSON.stringify(eventData)}`
      );
    case 'move_task': {
      if (!eventData.taskId || !actionConfig.columnId) {
        return { success: false, error: 'Task ID and destination column are required to move a task' };
      }

      const result = await runAsync(
        'UPDATE tasks SET column_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [actionConfig.columnId, eventData.taskId]
      );

      if (result.changes === 0) {
        return { success: false, error: 'Task not found' };
      }

      return { success: true, message: 'Task moved successfully' };
    }
    case 'update_task': {
      if (!eventData.taskId) {
        return { success: false, error: 'Task ID is required to update a task' };
      }

      const updates = [];
      const values = [];

      if (actionConfig.priority) {
        updates.push('priority = ?');
        values.push(actionConfig.priority);
      }

      if (actionConfig.dueDate) {
        updates.push('due_date = ?');
        values.push(actionConfig.dueDate);
      }

      if (actionConfig.assignedTo) {
        updates.push('assigned_to = ?');
        values.push(actionConfig.assignedTo);
      }

      if (updates.length === 0) {
        return { success: false, error: 'No task fields were provided to update' };
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(eventData.taskId);

      const result = await runAsync(
        `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      if (result.changes === 0) {
        return { success: false, error: 'Task not found' };
      }

      return { success: true, message: 'Task updated successfully' };
    }
    case 'create_task': {
      if (!actionConfig.title || !actionConfig.columnId) {
        return { success: false, error: 'Task title and column are required to create a task' };
      }

      const columnId = actionConfig.columnId;
      const columnPosition = await getAsync(
        'SELECT MAX(position) as maxPosition FROM tasks WHERE column_id = ?',
        [columnId]
      );

      const position = ((columnPosition && columnPosition.maxPosition) || 0) + 1;

      const result = await runAsync(
        `INSERT INTO tasks (title, description, column_id, position, priority, due_date, created_by, assigned_to)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          actionConfig.title,
          actionConfig.description || '',
          columnId,
          position,
          actionConfig.priority || 'medium',
          actionConfig.dueDate || null,
          actionConfig.createdBy || null,
          actionConfig.assignedTo || null,
        ]
      );

      return {
        success: true,
        message: 'Task created successfully',
        taskId: result.lastID,
      };
    }
    default:
      throw new Error(`Unknown action type: ${actionType}`);
  }
};

/**
 * Safely parse a JSON configuration string.
 * 
 * @function parseConfig
 * @param {string} configString - JSON string to parse
 * @param {string} label - Label for error messages ('trigger' or 'action')
 * @returns {Object} Parsed configuration object
 * @throws {Error} If JSON parsing fails
 * @private
 */
const parseConfig = (configString, label) => {
  try {
    return JSON.parse(configString);
  } catch (error) {
    throw new Error(`Invalid ${label} configuration: ${error.message}`);
  }
};

export { triggerAutomation };
export { checkTriggerConditions };
export { executeAutomationAction };