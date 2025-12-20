/**
 * @fileoverview Routes for Daily Work Planner functionality.
 * Provides CRUD operations for daily priorities, notes, reflections, and time blocks.
 * @module routes/planner
 */

const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { runAsync, allAsync, getAsync } = require('../utils/database');

const router = express.Router();

// ============= DAILY PRIORITIES =============

/**
 * GET /api/planner/priorities
 * Get priorities for a specific date (defaults to today)
 */
router.get('/priorities', [
  query('date').optional().isISO8601().toDate(),
], async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    
    const priorities = await allAsync(
      `SELECT dp.*, t.title as task_title, t.column_id, t.priority as task_priority
       FROM daily_priorities dp
       LEFT JOIN tasks t ON dp.task_id = t.id
       WHERE dp.date = ?
       ORDER BY dp.position ASC`,
      [date]
    );

    res.json(priorities.map(p => ({
      id: p.id,
      date: p.date,
      position: p.position,
      title: p.title,
      completed: Boolean(p.completed),
      taskId: p.task_id,
      taskTitle: p.task_title,
      taskColumnId: p.column_id,
      taskPriority: p.task_priority,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    })));
  } catch (error) {
    console.error('Failed to fetch priorities:', error);
    res.status(500).json({ error: 'Unable to fetch priorities' });
  }
});

/**
 * POST /api/planner/priorities
 * Create or update a priority for a specific date and position
 */
router.post('/priorities', [
  body('date').notEmpty().isISO8601(),
  body('position').isInt({ min: 0, max: 2 }).withMessage('Position must be 0, 1, or 2'),
  body('title').notEmpty().withMessage('Title is required'),
  body('completed').optional().isBoolean(),
  body('taskId').optional().isInt(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { date, position, title, completed = false, taskId = null } = req.body;

  try {
    // Use REPLACE to upsert the priority
    await runAsync(
      `INSERT OR REPLACE INTO daily_priorities (date, position, title, completed, task_id, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [date, position, title, completed ? 1 : 0, taskId]
    );

    res.json({ message: 'Priority saved successfully', date, position, title });
  } catch (error) {
    console.error('Failed to save priority:', error);
    res.status(500).json({ error: 'Unable to save priority' });
  }
});

/**
 * PUT /api/planner/priorities/:id
 * Update an existing priority
 */
router.put('/priorities/:id', [
  param('id').isInt(),
  body('title').optional().notEmpty(),
  body('completed').optional().isBoolean(),
  body('taskId').optional(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const priorityId = Number(req.params.id);
  const { title, completed, taskId } = req.body;

  try {
    const existing = await getAsync('SELECT * FROM daily_priorities WHERE id = ?', [priorityId]);
    if (!existing) {
      return res.status(404).json({ error: 'Priority not found' });
    }

    await runAsync(
      `UPDATE daily_priorities SET
        title = COALESCE(?, title),
        completed = COALESCE(?, completed),
        task_id = COALESCE(?, task_id),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [title, completed !== undefined ? (completed ? 1 : 0) : null, taskId, priorityId]
    );

    res.json({ message: 'Priority updated successfully' });
  } catch (error) {
    console.error('Failed to update priority:', error);
    res.status(500).json({ error: 'Unable to update priority' });
  }
});

/**
 * DELETE /api/planner/priorities/:id
 * Delete a priority
 */
router.delete('/priorities/:id', [param('id').isInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const result = await runAsync('DELETE FROM daily_priorities WHERE id = ?', [req.params.id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Priority not found' });
    }
    res.json({ message: 'Priority deleted successfully' });
  } catch (error) {
    console.error('Failed to delete priority:', error);
    res.status(500).json({ error: 'Unable to delete priority' });
  }
});

// ============= DAILY NOTES =============

/**
 * GET /api/planner/notes
 * Get notes for a specific date (defaults to today)
 */
router.get('/notes', [
  query('date').optional().isISO8601().toDate(),
], async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    
    const note = await getAsync(
      'SELECT * FROM daily_notes WHERE date = ?',
      [date]
    );

    res.json(note ? {
      id: note.id,
      date: note.date,
      content: note.content,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
    } : { date, content: '' });
  } catch (error) {
    console.error('Failed to fetch notes:', error);
    res.status(500).json({ error: 'Unable to fetch notes' });
  }
});

/**
 * POST /api/planner/notes
 * Create or update notes for a specific date
 */
router.post('/notes', [
  body('date').notEmpty().isISO8601(),
  body('content').isString(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { date, content } = req.body;

  try {
    await runAsync(
      `INSERT OR REPLACE INTO daily_notes (date, content, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)`,
      [date, content]
    );

    res.json({ message: 'Notes saved successfully', date });
  } catch (error) {
    console.error('Failed to save notes:', error);
    res.status(500).json({ error: 'Unable to save notes' });
  }
});

// ============= DAILY REFLECTIONS =============

/**
 * GET /api/planner/reflections
 * Get reflection for a specific date (defaults to today)
 */
router.get('/reflections', [
  query('date').optional().isISO8601().toDate(),
], async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    
    const reflection = await getAsync(
      'SELECT * FROM daily_reflections WHERE date = ?',
      [date]
    );

    res.json(reflection ? {
      id: reflection.id,
      date: reflection.date,
      wentWell: reflection.went_well,
      couldImprove: reflection.could_improve,
      keyTakeaways: reflection.key_takeaways,
      createdAt: reflection.created_at,
      updatedAt: reflection.updated_at,
    } : { date, wentWell: '', couldImprove: '', keyTakeaways: '' });
  } catch (error) {
    console.error('Failed to fetch reflection:', error);
    res.status(500).json({ error: 'Unable to fetch reflection' });
  }
});

/**
 * POST /api/planner/reflections
 * Create or update reflection for a specific date
 */
router.post('/reflections', [
  body('date').notEmpty().isISO8601(),
  body('wentWell').optional().isString(),
  body('couldImprove').optional().isString(),
  body('keyTakeaways').optional().isString(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { date, wentWell = '', couldImprove = '', keyTakeaways = '' } = req.body;

  try {
    await runAsync(
      `INSERT OR REPLACE INTO daily_reflections (date, went_well, could_improve, key_takeaways, updated_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [date, wentWell, couldImprove, keyTakeaways]
    );

    res.json({ message: 'Reflection saved successfully', date });
  } catch (error) {
    console.error('Failed to save reflection:', error);
    res.status(500).json({ error: 'Unable to save reflection' });
  }
});

// ============= TIME BLOCKS =============

/**
 * GET /api/planner/time-blocks
 * Get time blocks for a specific date (defaults to today)
 */
router.get('/time-blocks', [
  query('date').optional().isISO8601().toDate(),
], async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    
    const blocks = await allAsync(
      `SELECT tb.*, t.title as task_title, t.priority as task_priority
       FROM time_blocks tb
       LEFT JOIN tasks t ON tb.task_id = t.id
       WHERE tb.date = ?
       ORDER BY tb.start_time ASC`,
      [date]
    );

    res.json(blocks.map(b => ({
      id: b.id,
      date: b.date,
      startTime: b.start_time,
      endTime: b.end_time,
      title: b.title,
      description: b.description,
      color: b.color,
      taskId: b.task_id,
      taskTitle: b.task_title,
      taskPriority: b.task_priority,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
    })));
  } catch (error) {
    console.error('Failed to fetch time blocks:', error);
    res.status(500).json({ error: 'Unable to fetch time blocks' });
  }
});

/**
 * POST /api/planner/time-blocks
 * Create a new time block
 */
router.post('/time-blocks', [
  body('date').notEmpty().isISO8601(),
  body('startTime').notEmpty().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('endTime').notEmpty().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('title').notEmpty().withMessage('Title is required'),
  body('description').optional().isString(),
  body('color').optional().isString(),
  body('taskId').optional().isInt(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { date, startTime, endTime, title, description = '', color = '#3498db', taskId = null } = req.body;

  try {
    const result = await runAsync(
      `INSERT INTO time_blocks (date, start_time, end_time, title, description, color, task_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [date, startTime, endTime, title, description, color, taskId]
    );

    res.status(201).json({ 
      id: result.lastID,
      message: 'Time block created successfully',
      date,
      startTime,
      endTime,
      title,
    });
  } catch (error) {
    console.error('Failed to create time block:', error);
    res.status(500).json({ error: 'Unable to create time block' });
  }
});

/**
 * PUT /api/planner/time-blocks/:id
 * Update an existing time block
 */
router.put('/time-blocks/:id', [
  param('id').isInt(),
  body('startTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('endTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('title').optional().notEmpty(),
  body('description').optional().isString(),
  body('color').optional().isString(),
  body('taskId').optional(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const blockId = Number(req.params.id);
  const { startTime, endTime, title, description, color, taskId } = req.body;

  try {
    const existing = await getAsync('SELECT * FROM time_blocks WHERE id = ?', [blockId]);
    if (!existing) {
      return res.status(404).json({ error: 'Time block not found' });
    }

    await runAsync(
      `UPDATE time_blocks SET
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        color = COALESCE(?, color),
        task_id = COALESCE(?, task_id),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [startTime, endTime, title, description, color, taskId, blockId]
    );

    res.json({ message: 'Time block updated successfully' });
  } catch (error) {
    console.error('Failed to update time block:', error);
    res.status(500).json({ error: 'Unable to update time block' });
  }
});

/**
 * DELETE /api/planner/time-blocks/:id
 * Delete a time block
 */
router.delete('/time-blocks/:id', [param('id').isInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const result = await runAsync('DELETE FROM time_blocks WHERE id = ?', [req.params.id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Time block not found' });
    }
    res.json({ message: 'Time block deleted successfully' });
  } catch (error) {
    console.error('Failed to delete time block:', error);
    res.status(500).json({ error: 'Unable to delete time block' });
  }
});

// ============= DAILY OVERVIEW =============

/**
 * GET /api/planner/overview
 * Get complete daily planner data for a specific date
 */
router.get('/overview', [
  query('date').optional().isISO8601().toDate(),
], async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    
    // Fetch all planner data for the date in parallel
    const [priorities, notes, reflection, timeBlocks, todayTasks] = await Promise.all([
      allAsync(
        `SELECT dp.*, t.title as task_title, t.column_id
         FROM daily_priorities dp
         LEFT JOIN tasks t ON dp.task_id = t.id
         WHERE dp.date = ?
         ORDER BY dp.position ASC`,
        [date]
      ),
      getAsync('SELECT * FROM daily_notes WHERE date = ?', [date]),
      getAsync('SELECT * FROM daily_reflections WHERE date = ?', [date]),
      allAsync(
        `SELECT tb.*, t.title as task_title
         FROM time_blocks tb
         LEFT JOIN tasks t ON tb.task_id = t.id
         WHERE tb.date = ?
         ORDER BY tb.start_time ASC`,
        [date]
      ),
      // Get tasks due today
      allAsync(
        `SELECT t.*, c.name as column_name, c.color as column_color
         FROM tasks t
         JOIN columns c ON t.column_id = c.id
         WHERE DATE(t.due_date) = ?
         ORDER BY t.priority DESC, t.position ASC`,
        [date]
      ),
    ]);

    res.json({
      date,
      priorities: priorities.map(p => ({
        id: p.id,
        position: p.position,
        title: p.title,
        completed: Boolean(p.completed),
        taskId: p.task_id,
        taskTitle: p.task_title,
      })),
      notes: notes ? { content: notes.content } : { content: '' },
      reflection: reflection ? {
        wentWell: reflection.went_well,
        couldImprove: reflection.could_improve,
        keyTakeaways: reflection.key_takeaways,
      } : { wentWell: '', couldImprove: '', keyTakeaways: '' },
      timeBlocks: timeBlocks.map(b => ({
        id: b.id,
        startTime: b.start_time,
        endTime: b.end_time,
        title: b.title,
        description: b.description,
        color: b.color,
        taskId: b.task_id,
        taskTitle: b.task_title,
      })),
      todayTasks: todayTasks.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        priority: t.priority,
        columnId: t.column_id,
        columnName: t.column_name,
        columnColor: t.column_color,
        dueDate: t.due_date,
      })),
    });
  } catch (error) {
    console.error('Failed to fetch planner overview:', error);
    res.status(500).json({ error: 'Unable to fetch planner overview' });
  }
});

module.exports = router;
