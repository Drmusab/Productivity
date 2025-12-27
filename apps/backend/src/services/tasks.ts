/**
 * @fileoverview Task service for managing recurring task creation and scheduling.
 * Handles the business logic for creating new instances of recurring tasks based on
 * their recurrence rules and validating constraints like end dates and max occurrences.
 * @module services/tasks
 */

import {  getAsync, runAsync, allAsync  } from '../utils/database';
import {  recordTaskHistory  } from '../utils/history';

/**
 * Checks if a value is a positive integer.
 * 
 * @function isPositiveInteger
 * @param {*} value - Value to check
 * @returns {boolean} True if value is an integer greater than 0
 * @private
 * @example
 * isPositiveInteger(5)    // Returns: true
 * isPositiveInteger(0)    // Returns: false
 * isPositiveInteger(-1)   // Returns: false
 * isPositiveInteger(1.5)  // Returns: false
 */
const isPositiveInteger = (value) => Number.isInteger(value) && value > 0;

/**
 * Creates a new instance of a recurring task based on the original task and recurrence rule.
 * Calculates the next due date based on frequency and interval, validates constraints,
 * and creates the new task with copied properties and tags.
 * 
 * @async
 * @function createRecurringTask
 * @param {Object} originalTask - The original task object with all properties
 * @param {string} originalTask.title - Task title
 * @param {string} originalTask.description - Task description
 * @param {number} originalTask.column_id - Column ID for the task
 * @param {string} originalTask.priority - Task priority (low, medium, high, critical)
 * @param {string} originalTask.due_date - ISO 8601 date string for the current due date
 * @param {string} [originalTask.recurring_rule] - JSON string of recurring rule
 * @param {number} [originalTask.created_by] - User ID who created the task
 * @param {number} [originalTask.assigned_to] - User ID assigned to the task
 * @param {Object} recurringRule - Recurrence rule configuration
 * @param {string} recurringRule.frequency - 'daily', 'weekly', 'monthly', or 'yearly'
 * @param {number} [recurringRule.interval=1] - Number of frequency units between occurrences
 * @param {string} [recurringRule.endDate] - ISO 8601 date string when recurrence ends
 * @param {number} [recurringRule.maxOccurrences] - Maximum number of task instances to create
 * @returns {Promise<number|null>} Task ID of the created task, or null if no task should be created
 * @throws {Error} If task or recurring rule is invalid, or if database operations fail
 * @example
 * // Create a weekly recurring task
 * const taskId = await createRecurringTask(
 *   { id: 1, title: 'Weekly Report', column_id: 2, priority: 'high', due_date: '2024-01-01T00:00:00Z' },
 *   { frequency: 'weekly', interval: 1, maxOccurrences: 10 }
 * );
 * 
 * // Create a daily recurring task with end date
 * const taskId = await createRecurringTask(
 *   { id: 2, title: 'Daily Standup', column_id: 1, priority: 'medium', due_date: '2024-01-01T09:00:00Z' },
 *   { frequency: 'daily', interval: 1, endDate: '2024-12-31T23:59:59Z' }
 * );
 */
const createRecurringTask = async (originalTask, recurringRule) => {
  // Validate original task has due date
  if (!originalTask || !originalTask.due_date) {
    throw new Error('Cannot create recurring task without a valid due date');
  }

  const lastDueDate = new Date(originalTask.due_date);

  if (Number.isNaN(lastDueDate.getTime())) {
    throw new Error('Cannot create recurring task without a valid due date');
  }

  // Validate recurring rule
  if (!recurringRule || typeof recurringRule !== 'object') {
    throw new Error('Recurring rule must be provided as an object');
  }

  const { frequency, interval, endDate, maxOccurrences } = recurringRule;

  if (!frequency) {
    throw new Error('Recurring rule frequency is required');
  }

  // Default interval to 1 if not specified or invalid
  const normalizedInterval = isPositiveInteger(interval) ? interval : 1;
  const nextDueDate = new Date(lastDueDate.getTime());

  // Calculate next due date based on frequency
  switch (frequency) {
    case 'daily':
      nextDueDate.setDate(nextDueDate.getDate() + normalizedInterval);
      break;
    case 'weekly':
      nextDueDate.setDate(nextDueDate.getDate() + (normalizedInterval * 7));
      break;
    case 'monthly':
      nextDueDate.setMonth(nextDueDate.getMonth() + normalizedInterval);
      break;
    case 'yearly':
      nextDueDate.setFullYear(nextDueDate.getFullYear() + normalizedInterval);
      break;
    default:
      throw new Error(`Unknown frequency: ${frequency}`);
  }

  // Check if end date constraint is violated
  if (endDate) {
    const parsedEndDate = new Date(endDate);
    if (Number.isNaN(parsedEndDate.getTime())) {
      throw new Error('Recurring rule end date is invalid');
    }

    if (parsedEndDate < nextDueDate) {
      return null; // Don't create task if next due date is past end date
    }
  }

  // Check if max occurrences constraint is violated
  if (isPositiveInteger(maxOccurrences)) {
    const ruleToMatch = originalTask.recurring_rule || JSON.stringify(recurringRule);
    const occurrencesRow = await getAsync(
      'SELECT COUNT(*) as count FROM tasks WHERE recurring_rule = ?',
      [ruleToMatch]
    );

    if ((occurrencesRow?.count || 0) >= maxOccurrences) {
      return null; // Don't create task if max occurrences reached
    }
  }

  // Get next position in the column
  const positionRow = await getAsync(
    'SELECT MAX(position) as maxPosition FROM tasks WHERE column_id = ?',
    [originalTask.column_id]
  );

  const position = ((positionRow && positionRow.maxPosition) || 0) + 1;

  const recurringRuleValue = originalTask.recurring_rule || JSON.stringify(recurringRule);

  // Insert new recurring task instance
  const insertResult = await runAsync(
    `INSERT INTO tasks (title, description, column_id, position, priority, due_date, recurring_rule, created_by, assigned_to)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      originalTask.title,
      originalTask.description,
      originalTask.column_id,
      position,
      originalTask.priority,
      nextDueDate.toISOString(),
      recurringRuleValue,
      originalTask.created_by,
      originalTask.assigned_to
    ]
  );

  const taskId = insertResult.lastID;

  // Record task creation in history
  recordTaskHistory(taskId, 'created', null, null, originalTask.created_by);

  // Copy tags from original task to new task instance
  const tagRows = await allAsync(
    'SELECT tag_id FROM task_tags WHERE task_id = ?',
    [originalTask.id]
  );

  if (tagRows.length > 0) {
    await Promise.all(
      tagRows.map(tagRow =>
        runAsync('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)', [taskId, tagRow.tag_id])
      )
    );
  }

  return taskId;
};

export { createRecurringTask };
