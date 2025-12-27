// @ts-nocheck
import express from 'express';
import {  body, validationResult, param  } from 'express-validator';
import {  runAsync, allAsync, getAsync  } from '../utils/database';
import { parseRecurringRule } from '../utils/recurringRule';

const router = express.Router();

const recurringRuleSchema = [
  body('title').notEmpty().withMessage('Title is required'),
  body('columnId').isInt().withMessage('columnId is required'),
  body('startAt').notEmpty().withMessage('startAt is required'),
  body('frequency').isIn(['daily', 'weekly', 'monthly', 'yearly']).withMessage('frequency must be daily, weekly, monthly, or yearly'),
  body('interval').optional().isInt({ min: 1 }).withMessage('interval must be a positive integer'),
  body('occurrences').optional().isInt({ min: 1 }).withMessage('occurrences must be a positive integer'),
  body('endDate').optional().isString(),
  body('notificationLeadTime').optional().isInt({ min: 1 }).withMessage('notificationLeadTime must be a positive integer'),
  body('status').optional().isIn(['active', 'paused']).withMessage('status must be active or paused'),
];

router.post('/', recurringRuleSchema, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { title, description = '', columnId, startAt, frequency, interval, occurrences, endDate, notificationLeadTime = 60, status = 'active' } = req.body;
  const startDate = new Date(startAt);
  if (Number.isNaN(startDate.getTime())) {
    return res.status(400).json({ error: 'startAt must be a valid date' });
  }

  const recurringRule = {
    frequency,
    interval: interval || 1,
    maxOccurrences: occurrences,
    endDate,
    notificationLeadTime,
    status,
  };

  try {
    const insertResult = await runAsync(
      `INSERT INTO tasks (title, description, column_id, position, priority, due_date, recurring_rule)
       VALUES (?, ?, ?, (SELECT IFNULL(MAX(position), 0) + 1 FROM tasks WHERE column_id = ?), 'medium', ?, ?)` ,
      [title, description, columnId, columnId, startDate.toISOString(), JSON.stringify(recurringRule)]
    );

    const baseTaskId = insertResult.lastID;

    res.status(201).json({
      message: 'Routine created with recurring tasks',
      taskId: baseTaskId,
      recurringRule,
    });
  } catch (error) {
    console.error('Failed to create routine task:', error);
    res.status(500).json({ error: 'Unable to create routine task', details: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const routines = await allAsync(
      `SELECT t.*, c.name as column_name
       FROM tasks t
       LEFT JOIN columns c ON t.column_id = c.id
       WHERE t.recurring_rule IS NOT NULL`
    );

    const parsed = routines.map(task => {
      const recurringRule = parseRecurringRule(task.recurring_rule);

      return {
        id: task.id,
        title: task.title,
        description: task.description,
        columnId: task.column_id,
        columnName: task.column_name,
        dueDate: task.due_date,
        recurringRule,
      };
    });

    res.json(parsed);
  } catch (error) {
    console.error('Failed to fetch routines:', error);
    res.status(500).json({ error: 'Unable to fetch routines' });
  }
});

router.put('/:id', [param('id').isInt(), ...recurringRuleSchema], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const routineId = Number(req.params.id);
  const { title, description = '', columnId, startAt, frequency, interval, occurrences, endDate, notificationLeadTime = 60, status = 'active' } = req.body;

  try {
    const existingTask = await getAsync('SELECT * FROM tasks WHERE id = ? AND recurring_rule IS NOT NULL', [routineId]);
    if (!existingTask) {
      return res.status(404).json({ error: 'Routine not found' });
    }

    const startDate = new Date(startAt);
    if (Number.isNaN(startDate.getTime())) {
      return res.status(400).json({ error: 'startAt must be a valid date' });
    }

    const recurringRule = {
      frequency,
      interval: interval || 1,
      maxOccurrences: occurrences,
      endDate,
      notificationLeadTime,
      status,
      lastNotificationAt: parseRecurringRule(existingTask.recurring_rule).lastNotificationAt || null,
    };

    await runAsync(
      `UPDATE tasks
       SET title = ?, description = ?, column_id = ?, due_date = ?, recurring_rule = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [title, description, columnId, startDate.toISOString(), JSON.stringify(recurringRule), routineId]
    );

    res.json({ message: 'Routine updated', recurringRule });
  } catch (error) {
    console.error('Failed to update routine:', error);
    res.status(500).json({ error: 'Unable to update routine' });
  }
});

router.patch('/:id/status', [param('id').isInt(), body('status').isIn(['active', 'paused'])], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const routineId = Number(req.params.id);
  const { status } = req.body;

  try {
    const existingTask = await getAsync('SELECT * FROM tasks WHERE id = ? AND recurring_rule IS NOT NULL', [routineId]);
    if (!existingTask) {
      return res.status(404).json({ error: 'Routine not found' });
    }

    const recurringRule = parseRecurringRule(existingTask.recurring_rule);
    recurringRule.status = status;

    await runAsync(
      'UPDATE tasks SET recurring_rule = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [JSON.stringify(recurringRule), routineId]
    );

    res.json({ message: `Routine ${status === 'paused' ? 'paused' : 'resumed'}`, recurringRule });
  } catch (error) {
    console.error('Failed to update routine status:', error);
    res.status(500).json({ error: 'Unable to update routine status' });
  }
});

router.delete('/:id', [param('id').isInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const routineId = Number(req.params.id);

  try {
    const result = await runAsync('DELETE FROM tasks WHERE id = ? AND recurring_rule IS NOT NULL', [routineId]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Routine not found' });
    }

    res.json({ message: 'Routine deleted' });
  } catch (error) {
    console.error('Failed to delete routine:', error);
    res.status(500).json({ error: 'Unable to delete routine' });
  }
});

export = router;
