/**
 * @fileoverview Bulk operations utility for tasks.
 * Provides efficient batch operations for multiple tasks.
 * @module utils/bulkOperations
 */

import {  runAsync, allAsync, db  } from './database';
import {  recordTaskHistory  } from './history';
import {  triggerAutomation  } from '../services/automation';
import {  emitEvent  } from '../services/eventBus';

/**
 * Update multiple tasks at once
 * @param {Array<number>} taskIds - Array of task IDs to update
 * @param {Object} updates - Fields to update
 * @param {number} userId - ID of user performing the update
 * @returns {Promise<Object>} Result object with count of updated tasks
 */
async function bulkUpdateTasks(taskIds, updates, userId = null) {
  if (!taskIds || taskIds.length === 0) {
    return { updated: 0, errors: [] };
  }

  const allowedFields = [
    'column_id', 'swimlane_id', 'priority', 'due_date', 
    'assigned_to', 'gtd_status', 'execution_status', 
    'urgency', 'importance', 'pinned', 'category', 'project_id'
  ];

  const updateFields = [];
  const params = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      updateFields.push(`${key} = ?`);
      params.push(value);
    }
  }

  if (updateFields.length === 0) {
    return { updated: 0, errors: ['No valid fields to update'] };
  }

  // Add updated_at timestamp
  updateFields.push('updated_at = CURRENT_TIMESTAMP');

  const placeholders = taskIds.map(() => '?').join(',');
  params.push(...taskIds);

  const sql = `
    UPDATE tasks 
    SET ${updateFields.join(', ')}
    WHERE id IN (${placeholders})
  `;

  try {
    const result = await runAsync(sql, params);

    // Record history for each task
    if (userId) {
      for (const taskId of taskIds) {
        for (const [field, value] of Object.entries(updates)) {
          if (allowedFields.includes(field)) {
            await recordTaskHistory(taskId, 'bulk_update', field, String(value), userId);
          }
        }
      }
    }

    // Emit events for real-time updates
    for (const taskId of taskIds) {
      emitEvent('task', 'updated', { taskId, updates });
    }

    // Trigger automation
    for (const taskId of taskIds) {
      await triggerAutomation('task_updated', { taskId, ...updates });
    }

    return {
      updated: result.changes || 0,
      taskIds,
      errors: []
    };
  } catch (error) {
    return {
      updated: 0,
      errors: [error.message]
    };
  }
}

/**
 * Delete multiple tasks at once
 * @param {Array<number>} taskIds - Array of task IDs to delete
 * @param {number} userId - ID of user performing the deletion
 * @returns {Promise<Object>} Result object with count of deleted tasks
 */
async function bulkDeleteTasks(taskIds, userId = null) {
  if (!taskIds || taskIds.length === 0) {
    return { deleted: 0, errors: [] };
  }

  const placeholders = taskIds.map(() => '?').join(',');

  try {
    // Record history before deletion
    if (userId) {
      for (const taskId of taskIds) {
        await recordTaskHistory(taskId, 'deleted', 'status', 'deleted', userId);
      }
    }

    // Delete tasks (cascade will handle related records)
    const result = await runAsync(
      `DELETE FROM tasks WHERE id IN (${placeholders})`,
      taskIds
    );

    // Emit events
    for (const taskId of taskIds) {
      emitEvent('task', 'deleted', { taskId });
    }

    return {
      deleted: result.changes || 0,
      taskIds,
      errors: []
    };
  } catch (error) {
    return {
      deleted: 0,
      errors: [error.message]
    };
  }
}

/**
 * Move multiple tasks to a different column
 * @param {Array<number>} taskIds - Array of task IDs to move
 * @param {number} targetColumnId - ID of target column
 * @param {number} userId - ID of user performing the move
 * @returns {Promise<Object>} Result object
 */
async function bulkMoveTasks(taskIds, targetColumnId, userId = null) {
  return bulkUpdateTasks(taskIds, { column_id: targetColumnId }, userId);
}

/**
 * Assign multiple tasks to a user
 * @param {Array<number>} taskIds - Array of task IDs
 * @param {number} assigneeId - ID of user to assign to
 * @param {number} userId - ID of user performing the assignment
 * @returns {Promise<Object>} Result object
 */
async function bulkAssignTasks(taskIds, assigneeId, userId = null) {
  return bulkUpdateTasks(taskIds, { assigned_to: assigneeId }, userId);
}

/**
 * Update priority for multiple tasks
 * @param {Array<number>} taskIds - Array of task IDs
 * @param {string} priority - Priority level (low, medium, high, critical)
 * @param {number} userId - ID of user performing the update
 * @returns {Promise<Object>} Result object
 */
async function bulkSetPriority(taskIds, priority, userId = null) {
  const validPriorities = ['low', 'medium', 'high', 'critical'];
  if (!validPriorities.includes(priority)) {
    return { updated: 0, errors: ['Invalid priority level'] };
  }
  return bulkUpdateTasks(taskIds, { priority }, userId);
}

/**
 * Add tags to multiple tasks
 * @param {Array<number>} taskIds - Array of task IDs
 * @param {Array<number>} tagIds - Array of tag IDs to add
 * @returns {Promise<Object>} Result object
 */
async function bulkAddTags(taskIds, tagIds) {
  if (!taskIds || taskIds.length === 0 || !tagIds || tagIds.length === 0) {
    return { added: 0, errors: [] };
  }

  let addedCount = 0;
  const errors = [];

  try {
    for (const taskId of taskIds) {
      for (const tagId of tagIds) {
        try {
          await runAsync(
            'INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)',
            [taskId, tagId]
          );
          addedCount++;
        } catch (err) {
          errors.push(`Failed to add tag ${tagId} to task ${taskId}: ${err.message}`);
        }
      }
    }

    return { added: addedCount, errors };
  } catch (error) {
    return { added: addedCount, errors: [error.message] };
  }
}

/**
 * Remove tags from multiple tasks
 * @param {Array<number>} taskIds - Array of task IDs
 * @param {Array<number>} tagIds - Array of tag IDs to remove
 * @returns {Promise<Object>} Result object
 */
async function bulkRemoveTags(taskIds, tagIds) {
  if (!taskIds || taskIds.length === 0 || !tagIds || tagIds.length === 0) {
    return { removed: 0, errors: [] };
  }

  const taskPlaceholders = taskIds.map(() => '?').join(',');
  const tagPlaceholders = tagIds.map(() => '?').join(',');

  try {
    const result = await runAsync(
      `DELETE FROM task_tags WHERE task_id IN (${taskPlaceholders}) AND tag_id IN (${tagPlaceholders})`,
      [...taskIds, ...tagIds]
    );

    return {
      removed: result.changes || 0,
      errors: []
    };
  } catch (error) {
    return {
      removed: 0,
      errors: [error.message]
    };
  }
}

/**
 * Duplicate multiple tasks
 * @param {Array<number>} taskIds - Array of task IDs to duplicate
 * @param {number} userId - ID of user performing the duplication
 * @returns {Promise<Object>} Result object with new task IDs
 */
async function bulkDuplicateTasks(taskIds, userId = null) {
  if (!taskIds || taskIds.length === 0) {
    return { created: [], errors: [] };
  }

  const newTaskIds = [];
  const errors = [];

  try {
    // Fetch all tasks at once to avoid N+1 query pattern
    const placeholders = taskIds.map(() => '?').join(',');
    const tasks = await allAsync(
      `SELECT * FROM tasks WHERE id IN (${placeholders})`,
      taskIds
    );

    if (tasks.length === 0) {
      return { created: [], errors: ['No tasks found'] };
    }

    for (const original of tasks) {

      // Create duplicate
      const result = await runAsync(
        `INSERT INTO tasks (
          title, description, column_id, swimlane_id, position, priority,
          due_date, recurring_rule, created_by, assigned_to, gtd_status,
          context, energy_required, time_estimate, urgency, importance,
          execution_status, project_id, category
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `${original.title} (Copy)`,
          original.description,
          original.column_id,
          original.swimlane_id,
          original.position + 1,
          original.priority,
          original.due_date,
          original.recurring_rule,
          userId || original.created_by,
          original.assigned_to,
          original.gtd_status,
          original.context,
          original.energy_required,
          original.time_estimate,
          original.urgency,
          original.importance,
          original.execution_status,
          original.project_id,
          original.category
        ]
      );

      newTaskIds.push(result.lastID);

      // Copy tags for this task
      const tags = await allAsync(
        'SELECT tag_id FROM task_tags WHERE task_id = ?',
        [original.id]
      );
      for (const tag of tags) {
        await runAsync(
          'INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)',
          [result.lastID, tag.tag_id]
        );
      }

      // Copy subtasks for this task
      const subtasks = await allAsync(
        'SELECT * FROM subtasks WHERE task_id = ? ORDER BY position',
        [original.id]
      );
      for (const subtask of subtasks) {
        await runAsync(
          'INSERT INTO subtasks (task_id, title, completed, position) VALUES (?, ?, ?, ?)',
          [result.lastID, subtask.title, 0, subtask.position]
        );
      }
    }

    return {
      created: newTaskIds,
      errors
    };
  } catch (error) {
    return {
      created: newTaskIds,
      errors: [...errors, error.message]
    };
  }
}

export { bulkUpdateTasks };
export { bulkDeleteTasks };
export { bulkMoveTasks };
export { bulkAssignTasks };
export { bulkSetPriority };
export { bulkAddTags };
export { bulkRemoveTags };
export { bulkDuplicateTasks };
