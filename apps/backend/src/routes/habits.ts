// @ts-nocheck
/**
 * @fileoverview Routes for habit tracking functionality.
 * Provides CRUD operations for habits and habit logging.
 * @module routes/habits
 */

import express from 'express';
import {  body, validationResult, param, query  } from 'express-validator';
import {  runAsync, allAsync, getAsync  } from '../utils/database';

const router = express.Router();

/**
 * Validation schema for creating/updating a habit
 */
const habitValidationSchema = [
  body('name').notEmpty().withMessage('Name is required'),
  body('description').optional().isString(),
  body('category').optional().isString(),
  body('goalType').optional().isIn(['binary', 'numeric', 'timer']).withMessage('goalType must be binary, numeric, or timer'),
  body('goalValue').optional().isInt({ min: 1 }).withMessage('goalValue must be a positive integer'),
  body('goalUnit').optional().isString(),
  body('frequency').optional().isIn(['daily', 'weekly']).withMessage('frequency must be daily or weekly'),
  body('daysOfWeek').optional().isArray(),
  body('color').optional().isString(),
  body('icon').optional().isString(),
];

/**
 * GET /api/habits
 * Get all habits (excluding archived unless specified)
 */
router.get('/', async (req, res) => {
  try {
    const includeArchived = req.query.includeArchived === 'true';
    const whereClause = includeArchived ? '' : 'WHERE archived = 0';
    
    const habits = await allAsync(
      `SELECT * FROM habits ${whereClause} ORDER BY position ASC, created_at DESC`
    );

    res.json(habits.map(habit => ({
      id: habit.id,
      name: habit.name,
      description: habit.description,
      category: habit.category,
      goalType: habit.goal_type,
      goalValue: habit.goal_value,
      goalUnit: habit.goal_unit,
      frequency: habit.frequency,
      daysOfWeek: habit.days_of_week ? JSON.parse(habit.days_of_week) : null,
      color: habit.color,
      icon: habit.icon,
      position: habit.position,
      archived: Boolean(habit.archived),
      createdAt: habit.created_at,
      updatedAt: habit.updated_at,
    })));
  } catch (error) {
    console.error('Failed to fetch habits:', error);
    res.status(500).json({ error: 'Unable to fetch habits' });
  }
});

/**
 * GET /api/habits/:id
 * Get a specific habit by ID
 */
router.get('/:id', [param('id').isInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const habit = await getAsync('SELECT * FROM habits WHERE id = ?', [req.params.id]);
    
    if (!habit) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    res.json({
      id: habit.id,
      name: habit.name,
      description: habit.description,
      category: habit.category,
      goalType: habit.goal_type,
      goalValue: habit.goal_value,
      goalUnit: habit.goal_unit,
      frequency: habit.frequency,
      daysOfWeek: habit.days_of_week ? JSON.parse(habit.days_of_week) : null,
      color: habit.color,
      icon: habit.icon,
      position: habit.position,
      archived: Boolean(habit.archived),
      createdAt: habit.created_at,
      updatedAt: habit.updated_at,
    });
  } catch (error) {
    console.error('Failed to fetch habit:', error);
    res.status(500).json({ error: 'Unable to fetch habit' });
  }
});

/**
 * POST /api/habits
 * Create a new habit
 */
router.post('/', habitValidationSchema, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    name,
    description = '',
    category = 'general',
    goalType = 'binary',
    goalValue = 1,
    goalUnit = '',
    frequency = 'daily',
    daysOfWeek = null,
    color = '#3498db',
    icon = null,
  } = req.body;

  try {
    // Get max position
    const maxPosition = await getAsync('SELECT MAX(position) as max FROM habits WHERE archived = 0');
    const position = (maxPosition?.max ?? -1) + 1;

    const result = await runAsync(
      `INSERT INTO habits (name, description, category, goal_type, goal_value, goal_unit, frequency, days_of_week, color, icon, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, description, category, goalType, goalValue, goalUnit, frequency, daysOfWeek ? JSON.stringify(daysOfWeek) : null, color, icon, position]
    );

    res.status(201).json({
      id: result.lastID,
      name,
      description,
      category,
      goalType,
      goalValue,
      goalUnit,
      frequency,
      daysOfWeek,
      color,
      icon,
      position,
      archived: false,
      message: 'Habit created successfully',
    });
  } catch (error) {
    console.error('Failed to create habit:', error);
    res.status(500).json({ error: 'Unable to create habit', details: error.message });
  }
});

/**
 * PUT /api/habits/:id
 * Update an existing habit
 */
router.put('/:id', [param('id').isInt(), ...habitValidationSchema], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const habitId = Number(req.params.id);
  const {
    name,
    description,
    category,
    goalType,
    goalValue,
    goalUnit,
    frequency,
    daysOfWeek,
    color,
    icon,
    position,
    archived,
  } = req.body;

  try {
    const existingHabit = await getAsync('SELECT * FROM habits WHERE id = ?', [habitId]);
    if (!existingHabit) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    await runAsync(
      `UPDATE habits SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        category = COALESCE(?, category),
        goal_type = COALESCE(?, goal_type),
        goal_value = COALESCE(?, goal_value),
        goal_unit = COALESCE(?, goal_unit),
        frequency = COALESCE(?, frequency),
        days_of_week = COALESCE(?, days_of_week),
        color = COALESCE(?, color),
        icon = COALESCE(?, icon),
        position = COALESCE(?, position),
        archived = COALESCE(?, archived),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, description, category, goalType, goalValue, goalUnit, frequency, 
       daysOfWeek ? JSON.stringify(daysOfWeek) : null, color, icon, position, 
       archived !== undefined ? (archived ? 1 : 0) : null, habitId]
    );

    res.json({ message: 'Habit updated successfully' });
  } catch (error) {
    console.error('Failed to update habit:', error);
    res.status(500).json({ error: 'Unable to update habit' });
  }
});

/**
 * DELETE /api/habits/:id
 * Delete a habit
 */
router.delete('/:id', [param('id').isInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const habitId = Number(req.params.id);

  try {
    const result = await runAsync('DELETE FROM habits WHERE id = ?', [habitId]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    res.json({ message: 'Habit deleted successfully' });
  } catch (error) {
    console.error('Failed to delete habit:', error);
    res.status(500).json({ error: 'Unable to delete habit' });
  }
});

/**
 * PATCH /api/habits/:id/archive
 * Archive or unarchive a habit
 */
router.patch('/:id/archive', [param('id').isInt(), body('archived').isBoolean()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const habitId = Number(req.params.id);
  const { archived } = req.body;

  try {
    const existingHabit = await getAsync('SELECT * FROM habits WHERE id = ?', [habitId]);
    if (!existingHabit) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    await runAsync(
      'UPDATE habits SET archived = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [archived ? 1 : 0, habitId]
    );

    res.json({ message: archived ? 'Habit archived' : 'Habit restored' });
  } catch (error) {
    console.error('Failed to archive habit:', error);
    res.status(500).json({ error: 'Unable to archive habit' });
  }
});

/**
 * POST /api/habits/:id/log
 * Log a habit for a specific date
 */
router.post('/:id/log', [
  param('id').isInt(),
  body('date').notEmpty().withMessage('Date is required'),
  body('status').isIn(['done', 'missed', 'skipped', 'pending']).withMessage('Invalid status'),
  body('value').optional().isFloat({ min: 0 }),
  body('notes').optional().isString(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const habitId = Number(req.params.id);
  const { date, status, value = 0, notes = '' } = req.body;

  try {
    const habit = await getAsync('SELECT * FROM habits WHERE id = ?', [habitId]);
    if (!habit) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    // Use REPLACE to upsert the log
    await runAsync(
      `INSERT OR REPLACE INTO habit_logs (habit_id, log_date, status, value, notes, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [habitId, date, status, value, notes]
    );

    res.json({ message: 'Habit logged successfully', habitId, date, status, value });
  } catch (error) {
    console.error('Failed to log habit:', error);
    res.status(500).json({ error: 'Unable to log habit', details: error.message });
  }
});

/**
 * GET /api/habits/logs
 * Get habit logs for a date range
 */
router.get('/logs/range', [
  query('startDate').notEmpty().withMessage('startDate is required'),
  query('endDate').notEmpty().withMessage('endDate is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { startDate, endDate } = req.query;

  try {
    const logs = await allAsync(
      `SELECT hl.*, h.name as habit_name, h.goal_type, h.goal_value, h.color
       FROM habit_logs hl
       JOIN habits h ON hl.habit_id = h.id
       WHERE hl.log_date >= ? AND hl.log_date <= ?
       ORDER BY hl.log_date ASC`,
      [startDate, endDate]
    );

    res.json(logs.map(log => ({
      id: log.id,
      habitId: log.habit_id,
      habitName: log.habit_name,
      logDate: log.log_date,
      status: log.status,
      value: log.value,
      notes: log.notes,
      goalType: log.goal_type,
      goalValue: log.goal_value,
      color: log.color,
    })));
  } catch (error) {
    console.error('Failed to fetch habit logs:', error);
    res.status(500).json({ error: 'Unable to fetch habit logs' });
  }
});

/**
 * GET /api/habits/:id/stats
 * Get statistics for a specific habit
 */
router.get('/:id/stats', [param('id').isInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const habitId = Number(req.params.id);

  try {
    const habit = await getAsync('SELECT * FROM habits WHERE id = ?', [habitId]);
    if (!habit) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    // Get all logs for streak calculation
    const logs = await allAsync(
      `SELECT log_date, status FROM habit_logs 
       WHERE habit_id = ? AND status = 'done'
       ORDER BY log_date DESC`,
      [habitId]
    );

    // Calculate current streak
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let prevDate = null;

    const today = new Date().toISOString().split('T')[0];
    
    for (const log of logs) {
      const logDate = log.log_date;
      
      if (prevDate === null) {
        // Check if most recent log is today or yesterday
        const daysDiff = Math.floor((new Date(today) - new Date(logDate)) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 1) {
          tempStreak = 1;
          currentStreak = 1;
        }
      } else {
        const daysDiff = Math.floor((new Date(prevDate) - new Date(logDate)) / (1000 * 60 * 60 * 24));
        if (daysDiff === 1) {
          tempStreak++;
          if (currentStreak > 0) {
            currentStreak = tempStreak;
          }
        } else {
          tempStreak = 1;
        }
      }
      
      longestStreak = Math.max(longestStreak, tempStreak);
      prevDate = logDate;
    }

    // Calculate monthly stats
    const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const monthlyLogs = await allAsync(
      `SELECT status FROM habit_logs 
       WHERE habit_id = ? AND log_date LIKE ?`,
      [habitId, `${thisMonth}%`]
    );

    const monthlyCompleted = monthlyLogs.filter(l => l.status === 'done').length;
    const monthlyTotal = monthlyLogs.length;
    const monthlyPercentage = monthlyTotal > 0 ? Math.round((monthlyCompleted / monthlyTotal) * 100) : 0;

    res.json({
      habitId,
      currentStreak,
      longestStreak,
      monthlyCompleted,
      monthlyTotal,
      monthlyPercentage,
    });
  } catch (error) {
    console.error('Failed to fetch habit stats:', error);
    res.status(500).json({ error: 'Unable to fetch habit statistics' });
  }
});

/**
 * GET /api/habits/summary/weekly
 * Get a weekly summary of all habits for the current week
 */
router.get('/summary/weekly', async (req, res) => {
  try {
    // Calculate week start and end (Monday to Sunday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust for Monday start
    
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const startDateStr = weekStart.toISOString().split('T')[0];
    const endDateStr = weekEnd.toISOString().split('T')[0];

    // Get all active habits
    const habits = await allAsync(
      'SELECT * FROM habits WHERE archived = 0 ORDER BY position ASC'
    );

    // Get all logs for this week
    const logs = await allAsync(
      `SELECT * FROM habit_logs 
       WHERE log_date >= ? AND log_date <= ?`,
      [startDateStr, endDateStr]
    );

    // Build logs map for quick lookup
    const logsMap = {};
    logs.forEach(log => {
      if (!logsMap[log.habit_id]) {
        logsMap[log.habit_id] = {};
      }
      logsMap[log.habit_id][log.log_date] = {
        status: log.status,
        value: log.value,
        notes: log.notes,
      };
    });

    // Generate week days array
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      weekDays.push(day.toISOString().split('T')[0]);
    }

    // Build summary for each habit
    const habitSummaries = habits.map(habit => {
      const dailyLogs = {};
      let completed = 0;
      let total = 0;

      weekDays.forEach(date => {
        const log = logsMap[habit.id]?.[date];
        dailyLogs[date] = log || { status: 'pending', value: 0 };
        
        // Count only days up to and including today
        if (new Date(date) <= today) {
          total++;
          if (log?.status === 'done') {
            completed++;
          }
        }
      });

      const weekProgress = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        id: habit.id,
        name: habit.name,
        category: habit.category,
        goalType: habit.goal_type,
        goalValue: habit.goal_value,
        goalUnit: habit.goal_unit,
        color: habit.color,
        icon: habit.icon,
        dailyLogs,
        weekProgress,
        completed,
        total,
      };
    });

    // Calculate daily averages
    const dailyAverages = {};
    weekDays.forEach(date => {
      if (new Date(date) <= today) {
        const dayLogs = habitSummaries.map(h => h.dailyLogs[date]);
        const dayCompleted = dayLogs.filter(l => l.status === 'done').length;
        dailyAverages[date] = habitSummaries.length > 0 
          ? Math.round((dayCompleted / habitSummaries.length) * 100) 
          : 0;
      } else {
        dailyAverages[date] = null;
      }
    });

    // Calculate overall week average
    const pastDays = weekDays.filter(d => new Date(d) <= today);
    const weekAverage = pastDays.length > 0
      ? Math.round(pastDays.reduce((sum, d) => sum + (dailyAverages[d] || 0), 0) / pastDays.length)
      : 0;

    res.json({
      weekStart: startDateStr,
      weekEnd: endDateStr,
      weekDays,
      habits: habitSummaries,
      dailyAverages,
      weekAverage,
    });
  } catch (error) {
    console.error('Failed to fetch weekly summary:', error);
    res.status(500).json({ error: 'Unable to fetch weekly summary' });
  }
});

/**
 * GET /api/habits/summary/monthly
 * Get a monthly summary of all habits
 */
router.get('/summary/monthly', [
  query('month').optional().isInt({ min: 1, max: 12 }),
  query('year').optional().isInt(),
], async (req, res) => {
  try {
    const now = new Date();
    const month = req.query.month ? parseInt(req.query.month) - 1 : now.getMonth();
    const year = req.query.year ? parseInt(req.query.year) : now.getFullYear();

    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    
    const startDateStr = monthStart.toISOString().split('T')[0];
    const endDateStr = monthEnd.toISOString().split('T')[0];

    // Get all active habits
    const habits = await allAsync(
      'SELECT * FROM habits WHERE archived = 0 ORDER BY position ASC'
    );

    // Get all logs for this month
    const logs = await allAsync(
      `SELECT * FROM habit_logs 
       WHERE log_date >= ? AND log_date <= ?`,
      [startDateStr, endDateStr]
    );

    // Build logs map
    const logsMap = {};
    logs.forEach(log => {
      if (!logsMap[log.habit_id]) {
        logsMap[log.habit_id] = {};
      }
      logsMap[log.habit_id][log.log_date] = {
        status: log.status,
        value: log.value,
      };
    });

    // Calculate stats for each habit
    const habitStats = await Promise.all(habits.map(async habit => {
      const habitLogs = logsMap[habit.id] || {};
      const today = new Date().toISOString().split('T')[0];
      
      let completed = 0;
      let total = 0;
      
      // Count days up to today
      for (let d = new Date(monthStart); d <= monthEnd && d <= new Date(today); d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        total++;
        if (habitLogs[dateStr]?.status === 'done') {
          completed++;
        }
      }

      const monthlyPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      // Get streak info
      const allLogs = await allAsync(
        `SELECT log_date, status FROM habit_logs 
         WHERE habit_id = ? AND status = 'done'
         ORDER BY log_date DESC`,
        [habit.id]
      );

      // Calculate current streak
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      let prevDate = null;

      for (const log of allLogs) {
        const logDate = log.log_date;
        
        if (prevDate === null) {
          const daysDiff = Math.floor((new Date(today) - new Date(logDate)) / (1000 * 60 * 60 * 24));
          if (daysDiff <= 1) {
            tempStreak = 1;
            currentStreak = 1;
          }
        } else {
          const daysDiff = Math.floor((new Date(prevDate) - new Date(logDate)) / (1000 * 60 * 60 * 24));
          if (daysDiff === 1) {
            tempStreak++;
            if (currentStreak > 0) {
              currentStreak = tempStreak;
            }
          } else {
            tempStreak = 1;
          }
        }
        
        longestStreak = Math.max(longestStreak, tempStreak);
        prevDate = logDate;
      }

      return {
        id: habit.id,
        name: habit.name,
        category: habit.category,
        color: habit.color,
        icon: habit.icon,
        monthlyPercentage,
        completed,
        total,
        currentStreak,
        longestStreak,
        dailyLogs: habitLogs,
      };
    }));

    // Calculate daily completion rates for calendar view
    const dailyRates = {};
    const today = new Date();
    for (let d = new Date(monthStart); d <= monthEnd && d <= today; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayCompleted = habits.filter(h => logsMap[h.id]?.[dateStr]?.status === 'done').length;
      dailyRates[dateStr] = habits.length > 0 
        ? Math.round((dayCompleted / habits.length) * 100) 
        : 0;
    }

    res.json({
      month: month + 1,
      year,
      monthStart: startDateStr,
      monthEnd: endDateStr,
      habits: habitStats,
      dailyRates,
    });
  } catch (error) {
    console.error('Failed to fetch monthly summary:', error);
    res.status(500).json({ error: 'Unable to fetch monthly summary' });
  }
});

/**
 * PUT /api/habits/reorder
 * Reorder habits by updating their positions
 */
router.put('/reorder', [body('habitIds').isArray()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { habitIds } = req.body;

  try {
    for (let i = 0; i < habitIds.length; i++) {
      await runAsync(
        'UPDATE habits SET position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [i, habitIds[i]]
      );
    }

    res.json({ message: 'Habits reordered successfully' });
  } catch (error) {
    console.error('Failed to reorder habits:', error);
    res.status(500).json({ error: 'Unable to reorder habits' });
  }
});

export = router;
