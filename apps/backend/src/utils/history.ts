/**
 * @fileoverview Task history tracking utility for recording audit trails of task changes.
 * Provides functions to log all modifications made to tasks for compliance and debugging.
 * @module utils/history
 */

import {  db  } from './database';

/**
 * Records a task history event in the database for audit trail purposes.
 * Logs the action performed, old and new values, and the user who made the change.
 * Errors are logged to console but don't throw to avoid interrupting the main operation.
 * 
 * @function recordTaskHistory
 * @param {number} taskId - The ID of the task that was modified
 * @param {string} action - The type of action performed (e.g., 'created', 'updated', 'moved', 'deleted')
 * @param {string|null} oldValue - The previous value before the change (JSON string or null)
 * @param {string|null} newValue - The new value after the change (JSON string or null)
 * @param {number|null} userId - The ID of the user who performed the action (null for system actions)
 * @returns {void}
 * @example
 * recordTaskHistory(123, 'updated', '{"status": "todo"}', '{"status": "done"}', 1);
 * recordTaskHistory(456, 'created', null, null, 2);
 */
const recordTaskHistory = (taskId, action, oldValue, newValue, userId) => {
  db.run(
    'INSERT INTO task_history (task_id, action, old_value, new_value, user_id) VALUES (?, ?, ?, ?, ?)',
    [taskId, action, oldValue, newValue, userId],
    (err) => {
      if (err) {
        console.error('Failed to record task history:', err);
      }
    }
  );
};

export { recordTaskHistory };