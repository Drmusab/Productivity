// @ts-nocheck
/**
 * @fileoverview iTasks API routes for task management with Eisenhower Matrix integration.
 * Provides endpoints for CRUD operations, Eisenhower Matrix views, and data migration.
 * @module routes/itasks
 */

import express from 'express';
const router = express.Router();
import { body, validationResult } from 'express-validator';
import { runAsync, getAsync, allAsync } from '../utils/database';

/**
 * Map iTasks priority to Eisenhower Matrix urgency/importance
 * @param {string} priority - iTasks priority: "urgent", "important", "not-urgent", "not-important"
 * @returns {{ urgency: boolean, importance: boolean }} Eisenhower Matrix data
 */
const mapPriorityToEisenhower = (priority) => {
  switch (priority) {
    case 'urgent':
      return { urgency: true, importance: true }; // do_first
    case 'important':
      return { urgency: false, importance: true }; // schedule
    case 'not-urgent':
      return { urgency: true, importance: false }; // delegate
    case 'not-important':
      return { urgency: false, importance: false }; // eliminate
    default:
      return { urgency: false, importance: false };
  }
};

/**
 * Calculate Eisenhower quadrant from urgency and importance
 * @param {boolean} urgency - Is the task urgent
 * @param {boolean} importance - Is the task important
 * @returns {string} Quadrant name: 'do_first', 'schedule', 'delegate', 'eliminate'
 */
const calculateQuadrant = (urgency, importance) => {
  if (importance && urgency) return 'do_first';
  if (importance && !urgency) return 'schedule';
  if (!importance && urgency) return 'delegate';
  return 'eliminate';
};

/**
 * Map Eisenhower matrix back to iTasks priority
 * @param {boolean} urgency - Is the task urgent
 * @param {boolean} importance - Is the task important
 * @returns {string} iTasks priority
 */
const mapEisenhowerToPriority = (urgency, importance) => {
  if (importance && urgency) return 'urgent';
  if (importance && !urgency) return 'important';
  if (!importance && urgency) return 'not-urgent';
  return 'not-important';
};

/**
 * GET /api/itasks/tasks
 * Get all iTasks with Eisenhower mapping
 */
router.get('/tasks', async (req, res) => {
  try {
    const tasks = await allAsync(
      `SELECT id, title, description, urgency, importance, 
              gtd_status as status, category as label,
              created_at as createdAt, updated_at as updatedAt
       FROM tasks
       WHERE category IN ('bug', 'feature', 'documentation', 'enhancement', 'question')
          OR gtd_status IN ('backlog', 'todo', 'in progress', 'done')
       ORDER BY created_at DESC`
    );

    // Map to iTasks format
    const iTasks = tasks.map((task) => ({
      id: task.id.toString(),
      title: task.title,
      description: task.description || '',
      status: task.status || 'todo',
      priority: mapEisenhowerToPriority(task.urgency, task.importance),
      label: task.label,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      urgency: Boolean(task.urgency),
      importance: Boolean(task.importance),
      quadrant: calculateQuadrant(task.urgency, task.importance),
    }));

    res.json(iTasks);
  } catch (error) {
    console.error('Error fetching iTasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

/**
 * POST /api/itasks/tasks
 * Create a new task with priority mapping
 */
router.post(
  '/tasks',
  [
    body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 500 }),
    body('description').optional().isLength({ max: 10000 }),
    body('status').optional().isIn(['backlog', 'todo', 'in progress', 'done']),
    body('priority')
      .optional()
      .isIn(['urgent', 'important', 'not-urgent', 'not-important']),
    body('label')
      .optional()
      .isIn(['bug', 'feature', 'documentation', 'enhancement', 'question']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { title, description, status, priority, label } = req.body;

      // Map priority to Eisenhower matrix
      const eisenhower = mapPriorityToEisenhower(priority || 'not-important');

      // Get default column for iTasks (we'll use the first column or create a special one)
      let column = await getAsync(
        `SELECT id FROM columns WHERE name = 'iTasks' LIMIT 1`
      );

      if (!column) {
        // Create a default column for iTasks if it doesn't exist
        const board = await getAsync(`SELECT id FROM boards LIMIT 1`);
        if (board) {
          const result = await runAsync(
            `INSERT INTO columns (name, board_id, position, color) VALUES (?, ?, ?, ?)`,
            ['iTasks', board.id, 999, '#3498db']
          );
          column = { id: result.lastID };
        } else {
          return res.status(400).json({ error: 'No board found. Please create a board first.' });
        }
      }

      // Insert task
      const result = await runAsync(
        `INSERT INTO tasks (
          title, description, column_id, position, 
          urgency, importance, gtd_status, category,
          priority, execution_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          title,
          description || '',
          column.id,
          Date.now(), // Use timestamp as position
          eisenhower.urgency,
          eisenhower.importance,
          status || 'todo',
          label,
          'medium', // Default priority for existing system
          status || 'backlog',
        ]
      );

      const newTask = {
        id: result.lastID.toString(),
        title,
        description: description || '',
        status: status || 'todo',
        priority: priority || 'not-important',
        label,
        urgency: Boolean(eisenhower.urgency),
        importance: Boolean(eisenhower.importance),
        quadrant: calculateQuadrant(eisenhower.urgency, eisenhower.importance),
      };

      res.status(201).json(newTask);
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({ error: 'Failed to create task' });
    }
  }
);

/**
 * PUT /api/itasks/tasks/:id
 * Update a task
 */
router.put(
  '/tasks/:id',
  [
    body('title').optional().trim().notEmpty().isLength({ max: 500 }),
    body('description').optional().isLength({ max: 10000 }),
    body('status').optional().isIn(['backlog', 'todo', 'in progress', 'done']),
    body('priority')
      .optional()
      .isIn(['urgent', 'important', 'not-urgent', 'not-important']),
    body('label')
      .optional()
      .isIn(['bug', 'feature', 'documentation', 'enhancement', 'question']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { title, description, status, priority, label } = req.body;

      // Check if task exists
      const existingTask = await getAsync(
        `SELECT * FROM tasks WHERE id = ?`,
        [id]
      );

      if (!existingTask) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Build update query dynamically
      const updates = [];
      const values = [];

      if (title !== undefined) {
        updates.push('title = ?');
        values.push(title);
      }

      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
      }

      if (status !== undefined) {
        updates.push('gtd_status = ?');
        updates.push('execution_status = ?');
        values.push(status, status);
      }

      if (priority !== undefined) {
        const eisenhower = mapPriorityToEisenhower(priority);
        updates.push('urgency = ?', 'importance = ?');
        values.push(eisenhower.urgency, eisenhower.importance);
      }

      if (label !== undefined) {
        updates.push('category = ?');
        values.push(label);
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');

      if (updates.length === 1) {
        // Only updated_at was added
        return res.status(400).json({ error: 'No fields to update' });
      }

      values.push(id);

      await runAsync(
        `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      // Fetch updated task
      const updatedTask = await getAsync(
        `SELECT id, title, description, urgency, importance, 
                gtd_status as status, category as label,
                created_at as createdAt, updated_at as updatedAt
         FROM tasks WHERE id = ?`,
        [id]
      );

      const response = {
        id: updatedTask.id.toString(),
        title: updatedTask.title,
        description: updatedTask.description || '',
        status: updatedTask.status,
        priority: mapEisenhowerToPriority(updatedTask.urgency, updatedTask.importance),
        label: updatedTask.label,
        createdAt: updatedTask.createdAt,
        updatedAt: updatedTask.updatedAt,
        urgency: Boolean(updatedTask.urgency),
        importance: Boolean(updatedTask.importance),
        quadrant: calculateQuadrant(updatedTask.urgency, updatedTask.importance),
      };

      res.json(response);
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ error: 'Failed to update task' });
    }
  }
);

/**
 * DELETE /api/itasks/tasks/:id
 * Delete a task
 */
router.delete('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if task exists
    const existingTask = await getAsync(
      `SELECT id FROM tasks WHERE id = ?`,
      [id]
    );

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await runAsync(`DELETE FROM tasks WHERE id = ?`, [id]);

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

/**
 * GET /api/itasks/eisenhower
 * Get tasks grouped by Eisenhower quadrant
 */
router.get('/eisenhower', async (req, res) => {
  try {
    const tasks = await allAsync(
      `SELECT id, title, description, urgency, importance, 
              gtd_status as status, category as label,
              created_at as createdAt, updated_at as updatedAt
       FROM tasks
       WHERE category IN ('bug', 'feature', 'documentation', 'enhancement', 'question')
          OR gtd_status IN ('backlog', 'todo', 'in progress', 'done')
       ORDER BY created_at DESC`
    );

    // Group by quadrant
    const quadrants = {
      do_first: [],
      schedule: [],
      delegate: [],
      eliminate: [],
    };

    tasks.forEach((task) => {
      const quadrant = calculateQuadrant(task.urgency, task.importance);
      quadrants[quadrant].push({
        id: task.id.toString(),
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: mapEisenhowerToPriority(task.urgency, task.importance),
        label: task.label,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        urgency: Boolean(task.urgency),
        importance: Boolean(task.importance),
        quadrant,
      });
    });

    res.json(quadrants);
  } catch (error) {
    console.error('Error fetching Eisenhower matrix:', error);
    res.status(500).json({ error: 'Failed to fetch Eisenhower matrix' });
  }
});

/**
 * POST /api/itasks/migrate
 * Import tasks from iTasks localStorage format
 */
router.post('/migrate', async (req, res) => {
  try {
    const { tasks } = req.body;

    if (!Array.isArray(tasks)) {
      return res.status(400).json({ error: 'Tasks must be an array' });
    }

    // Get or create iTasks column
    let column = await getAsync(
      `SELECT id FROM columns WHERE name = 'iTasks' LIMIT 1`
    );

    if (!column) {
      const board = await getAsync(`SELECT id FROM boards LIMIT 1`);
      if (!board) {
        return res.status(400).json({ error: 'No board found. Please create a board first.' });
      }
      const result = await runAsync(
        `INSERT INTO columns (name, board_id, position, color) VALUES (?, ?, ?, ?)`,
        ['iTasks', board.id, 999, '#3498db']
      );
      column = { id: result.lastID };
    }

    const imported = [];
    const errors = [];

    for (const task of tasks) {
      try {
        const eisenhower = mapPriorityToEisenhower(task.priority || 'not-important');

        const result = await runAsync(
          `INSERT INTO tasks (
            title, description, column_id, position, 
            urgency, importance, gtd_status, category,
            priority, execution_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            task.title,
            task.description || '',
            column.id,
            Date.now(),
            eisenhower.urgency,
            eisenhower.importance,
            task.status || 'todo',
            task.label,
            'medium',
            task.status || 'backlog',
          ]
        );

        imported.push({
          originalId: task.id,
          newId: result.lastID,
          title: task.title,
        });
      } catch (error) {
        errors.push({
          task: task.title,
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      imported: imported.length,
      failed: errors.length,
      tasks: imported,
      errors,
    });
  } catch (error) {
    console.error('Error migrating tasks:', error);
    res.status(500).json({ error: 'Failed to migrate tasks' });
  }
});

export default router;
