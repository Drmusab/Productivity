// @ts-nocheck
/**
 * @fileoverview Calendar API routes for FullCalendar integration.
 * Provides endpoints for fetching tasks in FullCalendar event format.
 * @module routes/calendar
 */

import express from 'express';
const router = express.Router();
import {  query, validationResult  } from 'express-validator';
import {  db  } from '../utils/database';

/**
 * Priority to color mapping for calendar events.
 * @constant {Object}
 */
const PRIORITY_COLORS = {
  low: '#10b981',      // green
  medium: '#f59e0b',   // orange
  high: '#ef4444',     // red
  critical: '#dc2626', // dark red
  default: '#6366f1'   // purple
};

/**
 * Transforms a database task record into a FullCalendar event object.
 * 
 * @param {Object} task - Task record from database
 * @returns {Object} FullCalendar event object
 */
const transformTaskToEvent = (task) => {
  const priority = task.priority || 'medium';
  const color = PRIORITY_COLORS[priority] || PRIORITY_COLORS.default;
  
  // Determine if the event is all-day (no time component in due_date)
  const dueDate = new Date(task.due_date);
  const isAllDay = task.due_date && !task.due_date.includes('T');
  
  // Build the event title with pin emoji if pinned
  const title = task.pinned ? `📌 ${task.title}` : task.title;
  
  return {
    id: String(task.id),
    title: title,
    start: task.due_date,
    allDay: isAllDay,
    backgroundColor: color,
    borderColor: color,
    extendedProps: {
      description: task.description || '',
      priority: priority,
      columnId: task.column_id,
      columnName: task.column_name,
      swimlaneId: task.swimlane_id,
      swimlaneName: task.swimlane_name,
      assignedTo: task.assigned_to,
      assignedToName: task.assigned_to_name,
      createdBy: task.created_by,
      createdByName: task.created_by_name,
      pinned: Boolean(task.pinned),
      tags: task.tags || [],
      subtasks: task.subtasks || [],
      recurringRule: task.recurring_rule || null,
      gtdStatus: task.gtd_status,
      executionStatus: task.execution_status,
      category: task.category,
      projectId: task.project_id
    }
  };
};

/**
 * Validation rules for calendar events endpoint.
 * @constant {Array}
 */
const calendarEventsValidations = [
  query('start')
    .optional()
    .isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  query('end')
    .optional()
    .isISO8601().withMessage('End date must be a valid ISO 8601 date'),
  query('boardId')
    .optional()
    .isInt({ min: 1 }).withMessage('Board ID must be a positive integer'),
];

/**
 * GET /api/calendar/events
 * Retrieves tasks within a date range formatted as FullCalendar events.
 * 
 * @route GET /api/calendar/events
 * @query {string} [start] - Start date in ISO 8601 format (inclusive)
 * @query {string} [end] - End date in ISO 8601 format (exclusive)
 * @query {number} [boardId] - Filter by board ID
 * @returns {Array<Object>} Array of FullCalendar event objects
 * @example
 * GET /api/calendar/events?start=2025-12-01&end=2026-01-01&boardId=1
 */
router.get('/events', calendarEventsValidations, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { start, end, boardId } = req.query;
    
    // Build the query to fetch tasks with due dates
    let query = `
      SELECT t.*, 
             c.name as column_name, 
             s.name as swimlane_name,
             u1.username as created_by_name, 
             u2.username as assigned_to_name
      FROM tasks t
      JOIN columns c ON t.column_id = c.id
      LEFT JOIN swimlanes s ON t.swimlane_id = s.id
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.assigned_to = u2.id
      WHERE t.due_date IS NOT NULL
    `;
    
    const params = [];
    
    // Filter by date range if provided
    if (start) {
      query += ' AND t.due_date >= ?';
      params.push(start);
    }
    
    if (end) {
      query += ' AND t.due_date < ?';
      params.push(end);
    }
    
    // Filter by board if provided
    if (boardId) {
      query += ' AND c.board_id = ?';
      params.push(parseInt(boardId, 10));
    }
    
    query += ' ORDER BY t.due_date ASC';
    
    // Execute the query
    db.all(query, params, async (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (rows.length === 0) {
        return res.json([]);
      }
      
      // Get all task IDs
      const taskIds = rows.map(task => task.id);
      
      // Fetch all tags for all tasks in a single query
      const tagsQuery = `
        SELECT tt.task_id, tg.* 
        FROM tags tg 
        JOIN task_tags tt ON tg.id = tt.tag_id 
        WHERE tt.task_id IN (${taskIds.map(() => '?').join(',')})
      `;
      
      // Fetch all subtasks for all tasks in a single query
      const subtasksQuery = `
        SELECT * FROM subtasks 
        WHERE task_id IN (${taskIds.map(() => '?').join(',')})
        ORDER BY task_id, position ASC
      `;
      
      try {
        // Execute both queries in parallel
        const [tagsResults, subtasksResults] = await Promise.all([
          new Promise((resolve, reject) => {
            db.all(tagsQuery, taskIds, (err, tagRows) => {
              if (err) reject(err);
              else resolve(tagRows || []);
            });
          }),
          new Promise((resolve, reject) => {
            db.all(subtasksQuery, taskIds, (err, subtaskRows) => {
              if (err) reject(err);
              else resolve(subtaskRows || []);
            });
          })
        ]);
        
        // Group tags and subtasks by task_id
        const tagsByTask = {};
        const subtasksByTask = {};
        
        tagsResults.forEach(tag => {
          if (!tagsByTask[tag.task_id]) {
            tagsByTask[tag.task_id] = [];
          }
          // Remove task_id from the tag object before adding
          const { task_id, ...tagData } = tag;
          tagsByTask[tag.task_id].push(tagData);
        });
        
        subtasksResults.forEach(subtask => {
          if (!subtasksByTask[subtask.task_id]) {
            subtasksByTask[subtask.task_id] = [];
          }
          subtasksByTask[subtask.task_id].push(subtask);
        });
        
        // Attach tags and subtasks to each task
        const tasksWithDetails = rows.map(task => ({
          ...task,
          tags: tagsByTask[task.id] || [],
          subtasks: subtasksByTask[task.id] || []
        }));
        
        // Transform tasks to FullCalendar events
        const events = tasksWithDetails.map(transformTaskToEvent);
        
        res.json(events);
      } catch (queryError) {
        res.status(500).json({ error: queryError.message });
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export = router;
