// @ts-nocheck
/**
 * @fileoverview Routes for fitness/gym companion functionality.
 * Provides CRUD operations for exercises, workouts, sessions, and progress tracking.
 * @module routes/fitness
 */

import express from 'express';
import {  body, validationResult, param, query  } from 'express-validator';
import {  runAsync, allAsync, getAsync  } from '../utils/database';

const router = express.Router();

// ==================== MUSCLE GROUPS ====================

/**
 * GET /api/fitness/muscle-groups
 * Get all muscle groups (organized hierarchically)
 */
router.get('/muscle-groups', async (req, res) => {
  try {
    const groups = await allAsync(
      'SELECT * FROM muscle_groups ORDER BY parent_id NULLS FIRST, name ASC'
    );

    // Organize into hierarchy
    const mainGroups = groups.filter(g => !g.parent_id);
    const result = mainGroups.map(main => ({
      id: main.id,
      name: main.name,
      description: main.description,
      subGroups: groups
        .filter(sub => sub.parent_id === main.id)
        .map(sub => ({
          id: sub.id,
          name: sub.name,
          description: sub.description
        }))
    }));

    res.json(result);
  } catch (error) {
    console.error('Failed to fetch muscle groups:', error);
    res.status(500).json({ error: 'Unable to fetch muscle groups' });
  }
});

// ==================== EXERCISES ====================

/**
 * GET /api/fitness/exercises
 * Get all exercises with optional filtering
 */
router.get('/exercises', async (req, res) => {
  try {
    const { muscleGroupId, search, difficulty } = req.query;
    
    let sql = `
      SELECT e.*, mg.name as muscle_group_name 
      FROM exercises e 
      LEFT JOIN muscle_groups mg ON e.primary_muscle_group_id = mg.id
      WHERE 1=1
    `;
    const params = [];

    if (muscleGroupId) {
      sql += ' AND e.primary_muscle_group_id = ?';
      params.push(muscleGroupId);
    }
    if (search) {
      sql += ' AND e.name LIKE ?';
      params.push(`%${search}%`);
    }
    if (difficulty) {
      sql += ' AND e.difficulty = ?';
      params.push(difficulty);
    }

    sql += ' ORDER BY e.name ASC';

    const exercises = await allAsync(sql, params);

    res.json(exercises.map(ex => ({
      id: ex.id,
      name: ex.name,
      description: ex.description,
      demonstrationUrl: ex.demonstration_url,
      primaryMuscleGroupId: ex.primary_muscle_group_id,
      muscleGroupName: ex.muscle_group_name,
      equipment: ex.equipment,
      difficulty: ex.difficulty,
      customNotes: ex.custom_notes,
      isCustom: Boolean(ex.is_custom),
      createdAt: ex.created_at
    })));
  } catch (error) {
    console.error('Failed to fetch exercises:', error);
    res.status(500).json({ error: 'Unable to fetch exercises' });
  }
});

/**
 * GET /api/fitness/exercises/:id
 * Get a specific exercise
 */
router.get('/exercises/:id', [param('id').isInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const exercise = await getAsync(
      `SELECT e.*, mg.name as muscle_group_name 
       FROM exercises e 
       LEFT JOIN muscle_groups mg ON e.primary_muscle_group_id = mg.id
       WHERE e.id = ?`,
      [req.params.id]
    );

    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    res.json({
      id: exercise.id,
      name: exercise.name,
      description: exercise.description,
      demonstrationUrl: exercise.demonstration_url,
      primaryMuscleGroupId: exercise.primary_muscle_group_id,
      muscleGroupName: exercise.muscle_group_name,
      equipment: exercise.equipment,
      difficulty: exercise.difficulty,
      customNotes: exercise.custom_notes,
      isCustom: Boolean(exercise.is_custom),
      createdAt: exercise.created_at
    });
  } catch (error) {
    console.error('Failed to fetch exercise:', error);
    res.status(500).json({ error: 'Unable to fetch exercise' });
  }
});

/**
 * POST /api/fitness/exercises
 * Create a custom exercise
 */
router.post('/exercises', [
  body('name').notEmpty().withMessage('Name is required'),
  body('primaryMuscleGroupId').optional().isInt(),
  body('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, description, demonstrationUrl, primaryMuscleGroupId, equipment, difficulty, customNotes } = req.body;

  try {
    const result = await runAsync(
      `INSERT INTO exercises (name, description, demonstration_url, primary_muscle_group_id, equipment, difficulty, custom_notes, is_custom)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [name, description || '', demonstrationUrl || '', primaryMuscleGroupId || null, equipment || '', difficulty || 'intermediate', customNotes || '']
    );

    res.status(201).json({
      id: result.lastID,
      name,
      message: 'Exercise created successfully'
    });
  } catch (error) {
    console.error('Failed to create exercise:', error);
    res.status(500).json({ error: 'Unable to create exercise' });
  }
});

/**
 * PUT /api/fitness/exercises/:id
 * Update an exercise
 */
router.put('/exercises/:id', [param('id').isInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const exerciseId = Number(req.params.id);
  const { name, description, demonstrationUrl, primaryMuscleGroupId, equipment, difficulty, customNotes } = req.body;

  try {
    const existing = await getAsync('SELECT * FROM exercises WHERE id = ?', [exerciseId]);
    if (!existing) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    await runAsync(
      `UPDATE exercises SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        demonstration_url = COALESCE(?, demonstration_url),
        primary_muscle_group_id = COALESCE(?, primary_muscle_group_id),
        equipment = COALESCE(?, equipment),
        difficulty = COALESCE(?, difficulty),
        custom_notes = COALESCE(?, custom_notes),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, description, demonstrationUrl, primaryMuscleGroupId, equipment, difficulty, customNotes, exerciseId]
    );

    res.json({ message: 'Exercise updated successfully' });
  } catch (error) {
    console.error('Failed to update exercise:', error);
    res.status(500).json({ error: 'Unable to update exercise' });
  }
});

/**
 * DELETE /api/fitness/exercises/:id
 * Delete a custom exercise
 */
router.delete('/exercises/:id', [param('id').isInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const result = await runAsync('DELETE FROM exercises WHERE id = ? AND is_custom = 1', [req.params.id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Custom exercise not found or cannot delete built-in exercises' });
    }

    res.json({ message: 'Exercise deleted successfully' });
  } catch (error) {
    console.error('Failed to delete exercise:', error);
    res.status(500).json({ error: 'Unable to delete exercise' });
  }
});

// ==================== WORKOUT TEMPLATES ====================

/**
 * GET /api/fitness/templates
 * Get all workout templates
 */
router.get('/templates', async (req, res) => {
  try {
    const templates = await allAsync(
      'SELECT * FROM workout_templates ORDER BY is_active DESC, created_at DESC'
    );

    res.json(templates.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      frequency: t.frequency,
      durationWeeks: t.duration_weeks,
      goal: t.goal,
      isActive: Boolean(t.is_active),
      createdAt: t.created_at
    })));
  } catch (error) {
    console.error('Failed to fetch templates:', error);
    res.status(500).json({ error: 'Unable to fetch workout templates' });
  }
});

/**
 * GET /api/fitness/templates/:id
 * Get a specific template with its workout days and exercises
 */
router.get('/templates/:id', [param('id').isInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const template = await getAsync('SELECT * FROM workout_templates WHERE id = ?', [req.params.id]);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Get workout days with exercises
    const days = await allAsync(
      'SELECT * FROM workout_days WHERE template_id = ? ORDER BY day_order ASC',
      [req.params.id]
    );

    const daysWithExercises = await Promise.all(days.map(async (day) => {
      const exercises = await allAsync(
        `SELECT wde.*, e.name as exercise_name, e.equipment, mg.name as muscle_group
         FROM workout_day_exercises wde
         JOIN exercises e ON wde.exercise_id = e.id
         LEFT JOIN muscle_groups mg ON e.primary_muscle_group_id = mg.id
         WHERE wde.workout_day_id = ?
         ORDER BY wde.exercise_order ASC`,
        [day.id]
      );

      return {
        id: day.id,
        name: day.name,
        dayOrder: day.day_order,
        notes: day.notes,
        exercises: exercises.map(ex => ({
          id: ex.id,
          exerciseId: ex.exercise_id,
          exerciseName: ex.exercise_name,
          equipment: ex.equipment,
          muscleGroup: ex.muscle_group,
          sets: ex.sets,
          targetReps: ex.target_reps,
          restSeconds: ex.rest_seconds,
          notes: ex.notes,
          exerciseOrder: ex.exercise_order
        }))
      };
    }));

    res.json({
      id: template.id,
      name: template.name,
      description: template.description,
      frequency: template.frequency,
      durationWeeks: template.duration_weeks,
      goal: template.goal,
      isActive: Boolean(template.is_active),
      workoutDays: daysWithExercises
    });
  } catch (error) {
    console.error('Failed to fetch template:', error);
    res.status(500).json({ error: 'Unable to fetch workout template' });
  }
});

/**
 * POST /api/fitness/templates
 * Create a new workout template
 */
router.post('/templates', [
  body('name').notEmpty().withMessage('Name is required'),
  body('frequency').optional().isInt({ min: 1, max: 7 }),
  body('goal').optional().isIn(['strength', 'hypertrophy', 'endurance', 'general'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, description, frequency, durationWeeks, goal } = req.body;

  try {
    const result = await runAsync(
      `INSERT INTO workout_templates (name, description, frequency, duration_weeks, goal)
       VALUES (?, ?, ?, ?, ?)`,
      [name, description || '', frequency || 3, durationWeeks || null, goal || 'general']
    );

    res.status(201).json({
      id: result.lastID,
      name,
      message: 'Workout template created successfully'
    });
  } catch (error) {
    console.error('Failed to create template:', error);
    res.status(500).json({ error: 'Unable to create workout template' });
  }
});

/**
 * PUT /api/fitness/templates/:id
 * Update a workout template
 */
router.put('/templates/:id', [param('id').isInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const templateId = Number(req.params.id);
  const { name, description, frequency, durationWeeks, goal, isActive } = req.body;

  try {
    const existing = await getAsync('SELECT * FROM workout_templates WHERE id = ?', [templateId]);
    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }

    await runAsync(
      `UPDATE workout_templates SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        frequency = COALESCE(?, frequency),
        duration_weeks = COALESCE(?, duration_weeks),
        goal = COALESCE(?, goal),
        is_active = COALESCE(?, is_active),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, description, frequency, durationWeeks, goal, isActive !== undefined ? (isActive ? 1 : 0) : null, templateId]
    );

    res.json({ message: 'Template updated successfully' });
  } catch (error) {
    console.error('Failed to update template:', error);
    res.status(500).json({ error: 'Unable to update template' });
  }
});

/**
 * DELETE /api/fitness/templates/:id
 * Delete a workout template
 */
router.delete('/templates/:id', [param('id').isInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const result = await runAsync('DELETE FROM workout_templates WHERE id = ?', [req.params.id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Failed to delete template:', error);
    res.status(500).json({ error: 'Unable to delete template' });
  }
});

// ==================== WORKOUT DAYS ====================

/**
 * POST /api/fitness/templates/:templateId/days
 * Add a workout day to a template
 */
router.post('/templates/:templateId/days', [
  param('templateId').isInt(),
  body('name').notEmpty().withMessage('Name is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const templateId = Number(req.params.templateId);
  const { name, notes } = req.body;

  try {
    const template = await getAsync('SELECT * FROM workout_templates WHERE id = ?', [templateId]);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Get next day order
    const maxOrder = await getAsync(
      'SELECT MAX(day_order) as max FROM workout_days WHERE template_id = ?',
      [templateId]
    );
    const dayOrder = (maxOrder?.max ?? -1) + 1;

    const result = await runAsync(
      'INSERT INTO workout_days (template_id, name, day_order, notes) VALUES (?, ?, ?, ?)',
      [templateId, name, dayOrder, notes || '']
    );

    res.status(201).json({
      id: result.lastID,
      name,
      dayOrder,
      message: 'Workout day added successfully'
    });
  } catch (error) {
    console.error('Failed to add workout day:', error);
    res.status(500).json({ error: 'Unable to add workout day' });
  }
});

/**
 * POST /api/fitness/days/:dayId/exercises
 * Add an exercise to a workout day
 */
router.post('/days/:dayId/exercises', [
  param('dayId').isInt(),
  body('exerciseId').isInt().withMessage('Exercise ID is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const dayId = Number(req.params.dayId);
  const { exerciseId, sets, targetReps, restSeconds, notes } = req.body;

  try {
    const day = await getAsync('SELECT * FROM workout_days WHERE id = ?', [dayId]);
    if (!day) {
      return res.status(404).json({ error: 'Workout day not found' });
    }

    // Get next exercise order
    const maxOrder = await getAsync(
      'SELECT MAX(exercise_order) as max FROM workout_day_exercises WHERE workout_day_id = ?',
      [dayId]
    );
    const exerciseOrder = (maxOrder?.max ?? -1) + 1;

    const result = await runAsync(
      `INSERT INTO workout_day_exercises (workout_day_id, exercise_id, sets, target_reps, rest_seconds, notes, exercise_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [dayId, exerciseId, sets || 3, targetReps || '8-12', restSeconds || 90, notes || '', exerciseOrder]
    );

    res.status(201).json({
      id: result.lastID,
      message: 'Exercise added to workout day'
    });
  } catch (error) {
    console.error('Failed to add exercise to day:', error);
    res.status(500).json({ error: 'Unable to add exercise to workout day' });
  }
});

// ==================== WORKOUT SESSIONS ====================

/**
 * GET /api/fitness/sessions
 * Get workout sessions with optional date filtering
 */
router.get('/sessions', async (req, res) => {
  try {
    const { startDate, endDate, limit } = req.query;
    
    let sql = `
      SELECT ws.*, wt.name as template_name, wd.name as workout_day_name
      FROM workout_sessions ws
      LEFT JOIN workout_templates wt ON ws.template_id = wt.id
      LEFT JOIN workout_days wd ON ws.workout_day_id = wd.id
      WHERE 1=1
    `;
    const params = [];

    if (startDate) {
      sql += ' AND ws.date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND ws.date <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY ws.date DESC, ws.start_time DESC';

    if (limit) {
      sql += ' LIMIT ?';
      params.push(parseInt(limit));
    }

    const sessions = await allAsync(sql, params);

    res.json(sessions.map(s => ({
      id: s.id,
      templateId: s.template_id,
      templateName: s.template_name,
      workoutDayId: s.workout_day_id,
      workoutDayName: s.workout_day_name,
      date: s.date,
      startTime: s.start_time,
      endTime: s.end_time,
      durationMinutes: s.duration_minutes,
      notes: s.notes,
      energyLevel: s.energy_level,
      overallFeeling: s.overall_feeling,
      createdAt: s.created_at
    })));
  } catch (error) {
    console.error('Failed to fetch sessions:', error);
    res.status(500).json({ error: 'Unable to fetch workout sessions' });
  }
});

/**
 * GET /api/fitness/sessions/:id
 * Get a specific session with all exercise logs
 */
router.get('/sessions/:id', [param('id').isInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const session = await getAsync(
      `SELECT ws.*, wt.name as template_name, wd.name as workout_day_name
       FROM workout_sessions ws
       LEFT JOIN workout_templates wt ON ws.template_id = wt.id
       LEFT JOIN workout_days wd ON ws.workout_day_id = wd.id
       WHERE ws.id = ?`,
      [req.params.id]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get exercise logs
    const logs = await allAsync(
      `SELECT el.*, e.name as exercise_name, e.equipment, mg.name as muscle_group
       FROM exercise_logs el
       JOIN exercises e ON el.exercise_id = e.id
       LEFT JOIN muscle_groups mg ON e.primary_muscle_group_id = mg.id
       WHERE el.session_id = ?
       ORDER BY el.id ASC`,
      [req.params.id]
    );

    // Group logs by exercise
    const exerciseLogs = {};
    logs.forEach(log => {
      if (!exerciseLogs[log.exercise_id]) {
        exerciseLogs[log.exercise_id] = {
          exerciseId: log.exercise_id,
          exerciseName: log.exercise_name,
          equipment: log.equipment,
          muscleGroup: log.muscle_group,
          sets: []
        };
      }
      exerciseLogs[log.exercise_id].sets.push({
        id: log.id,
        setNumber: log.set_number,
        reps: log.reps,
        weight: log.weight,
        rpe: log.rpe,
        restSeconds: log.rest_seconds,
        notes: log.notes,
        isPR: Boolean(log.is_pr)
      });
    });

    res.json({
      id: session.id,
      templateId: session.template_id,
      templateName: session.template_name,
      workoutDayId: session.workout_day_id,
      workoutDayName: session.workout_day_name,
      date: session.date,
      startTime: session.start_time,
      endTime: session.end_time,
      durationMinutes: session.duration_minutes,
      notes: session.notes,
      energyLevel: session.energy_level,
      overallFeeling: session.overall_feeling,
      exerciseLogs: Object.values(exerciseLogs)
    });
  } catch (error) {
    console.error('Failed to fetch session:', error);
    res.status(500).json({ error: 'Unable to fetch workout session' });
  }
});

/**
 * POST /api/fitness/sessions
 * Create a new workout session
 */
router.post('/sessions', [
  body('date').notEmpty().withMessage('Date is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { templateId, workoutDayId, date, startTime, notes, energyLevel } = req.body;

  try {
    const result = await runAsync(
      `INSERT INTO workout_sessions (template_id, workout_day_id, date, start_time, notes, energy_level)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [templateId || null, workoutDayId || null, date, startTime || null, notes || '', energyLevel || 3]
    );

    res.status(201).json({
      id: result.lastID,
      date,
      message: 'Workout session created successfully'
    });
  } catch (error) {
    console.error('Failed to create session:', error);
    res.status(500).json({ error: 'Unable to create workout session' });
  }
});

/**
 * PUT /api/fitness/sessions/:id
 * Update a workout session
 */
router.put('/sessions/:id', [param('id').isInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const sessionId = Number(req.params.id);
  const { endTime, durationMinutes, notes, energyLevel, overallFeeling } = req.body;

  try {
    const existing = await getAsync('SELECT * FROM workout_sessions WHERE id = ?', [sessionId]);
    if (!existing) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await runAsync(
      `UPDATE workout_sessions SET
        end_time = COALESCE(?, end_time),
        duration_minutes = COALESCE(?, duration_minutes),
        notes = COALESCE(?, notes),
        energy_level = COALESCE(?, energy_level),
        overall_feeling = COALESCE(?, overall_feeling),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [endTime, durationMinutes, notes, energyLevel, overallFeeling, sessionId]
    );

    res.json({ message: 'Session updated successfully' });
  } catch (error) {
    console.error('Failed to update session:', error);
    res.status(500).json({ error: 'Unable to update workout session' });
  }
});

/**
 * DELETE /api/fitness/sessions/:id
 * Delete a workout session
 */
router.delete('/sessions/:id', [param('id').isInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const result = await runAsync('DELETE FROM workout_sessions WHERE id = ?', [req.params.id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Failed to delete session:', error);
    res.status(500).json({ error: 'Unable to delete workout session' });
  }
});

// ==================== EXERCISE LOGS ====================

/**
 * POST /api/fitness/sessions/:sessionId/logs
 * Log an exercise set within a session
 */
router.post('/sessions/:sessionId/logs', [
  param('sessionId').isInt(),
  body('exerciseId').isInt().withMessage('Exercise ID is required'),
  body('setNumber').isInt({ min: 1 }).withMessage('Set number is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const sessionId = Number(req.params.sessionId);
  const { exerciseId, setNumber, reps, weight, rpe, restSeconds, notes } = req.body;

  try {
    const session = await getAsync('SELECT * FROM workout_sessions WHERE id = ?', [sessionId]);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check for PR
    let isPR = false;
    if (weight && reps) {
      const previousBest = await getAsync(
        `SELECT MAX(weight) as max_weight FROM exercise_logs 
         WHERE exercise_id = ? AND reps >= ? AND session_id != ?`,
        [exerciseId, reps, sessionId]
      );
      
      if (!previousBest || !previousBest.max_weight || weight > previousBest.max_weight) {
        isPR = true;
        
        // Record the PR
        await runAsync(
          `INSERT INTO personal_records (exercise_id, record_type, value, reps, date, session_id)
           VALUES (?, 'weight', ?, ?, ?, ?)`,
          [exerciseId, weight, reps, session.date, sessionId]
        );
      }
    }

    const result = await runAsync(
      `INSERT INTO exercise_logs (session_id, exercise_id, set_number, reps, weight, rpe, rest_seconds, notes, is_pr)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sessionId, exerciseId, setNumber, reps || null, weight || null, rpe || null, restSeconds || null, notes || '', isPR ? 1 : 0]
    );

    res.status(201).json({
      id: result.lastID,
      isPR,
      message: isPR ? 'New personal record!' : 'Set logged successfully'
    });
  } catch (error) {
    console.error('Failed to log exercise:', error);
    res.status(500).json({ error: 'Unable to log exercise' });
  }
});

/**
 * PUT /api/fitness/logs/:id
 * Update an exercise log
 */
router.put('/logs/:id', [param('id').isInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const logId = Number(req.params.id);
  const { reps, weight, rpe, restSeconds, notes } = req.body;

  try {
    const existing = await getAsync('SELECT * FROM exercise_logs WHERE id = ?', [logId]);
    if (!existing) {
      return res.status(404).json({ error: 'Log not found' });
    }

    await runAsync(
      `UPDATE exercise_logs SET
        reps = COALESCE(?, reps),
        weight = COALESCE(?, weight),
        rpe = COALESCE(?, rpe),
        rest_seconds = COALESCE(?, rest_seconds),
        notes = COALESCE(?, notes)
       WHERE id = ?`,
      [reps, weight, rpe, restSeconds, notes, logId]
    );

    res.json({ message: 'Log updated successfully' });
  } catch (error) {
    console.error('Failed to update log:', error);
    res.status(500).json({ error: 'Unable to update log' });
  }
});

// ==================== PERSONAL RECORDS ====================

/**
 * GET /api/fitness/personal-records
 * Get personal records, optionally filtered by exercise
 */
router.get('/personal-records', async (req, res) => {
  try {
    const { exerciseId } = req.query;
    
    let sql = `
      SELECT pr.*, e.name as exercise_name, mg.name as muscle_group
      FROM personal_records pr
      JOIN exercises e ON pr.exercise_id = e.id
      LEFT JOIN muscle_groups mg ON e.primary_muscle_group_id = mg.id
    `;
    const params = [];

    if (exerciseId) {
      sql += ' WHERE pr.exercise_id = ?';
      params.push(exerciseId);
    }

    sql += ' ORDER BY pr.date DESC';

    const records = await allAsync(sql, params);

    res.json(records.map(r => ({
      id: r.id,
      exerciseId: r.exercise_id,
      exerciseName: r.exercise_name,
      muscleGroup: r.muscle_group,
      recordType: r.record_type,
      value: r.value,
      reps: r.reps,
      date: r.date
    })));
  } catch (error) {
    console.error('Failed to fetch personal records:', error);
    res.status(500).json({ error: 'Unable to fetch personal records' });
  }
});

// ==================== BODY MEASUREMENTS ====================

/**
 * GET /api/fitness/measurements
 * Get body measurements history
 */
router.get('/measurements', async (req, res) => {
  try {
    const { limit } = req.query;
    
    let sql = 'SELECT * FROM body_measurements ORDER BY date DESC';
    const params = [];

    if (limit) {
      sql += ' LIMIT ?';
      params.push(parseInt(limit));
    }

    const measurements = await allAsync(sql, params);

    res.json(measurements.map(m => ({
      id: m.id,
      date: m.date,
      weight: m.weight,
      bodyFatPercent: m.body_fat_percent,
      chest: m.chest,
      waist: m.waist,
      hips: m.hips,
      leftArm: m.left_arm,
      rightArm: m.right_arm,
      leftThigh: m.left_thigh,
      rightThigh: m.right_thigh,
      notes: m.notes,
      createdAt: m.created_at
    })));
  } catch (error) {
    console.error('Failed to fetch measurements:', error);
    res.status(500).json({ error: 'Unable to fetch measurements' });
  }
});

/**
 * POST /api/fitness/measurements
 * Add a new body measurement entry
 */
router.post('/measurements', [
  body('date').notEmpty().withMessage('Date is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { date, weight, bodyFatPercent, chest, waist, hips, leftArm, rightArm, leftThigh, rightThigh, notes } = req.body;

  try {
    const result = await runAsync(
      `INSERT INTO body_measurements (date, weight, body_fat_percent, chest, waist, hips, left_arm, right_arm, left_thigh, right_thigh, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [date, weight || null, bodyFatPercent || null, chest || null, waist || null, hips || null, leftArm || null, rightArm || null, leftThigh || null, rightThigh || null, notes || '']
    );

    res.status(201).json({
      id: result.lastID,
      date,
      message: 'Measurement recorded successfully'
    });
  } catch (error) {
    console.error('Failed to add measurement:', error);
    res.status(500).json({ error: 'Unable to add measurement' });
  }
});

// ==================== FITNESS PROFILE ====================

/**
 * GET /api/fitness/profile
 * Get the current user's fitness profile
 */
router.get('/profile', async (req, res) => {
  try {
    // For now, get the first profile (single user mode)
    const profile = await getAsync('SELECT * FROM fitness_profile LIMIT 1');

    if (!profile) {
      return res.json(null);
    }

    res.json({
      id: profile.id,
      height: profile.height,
      age: profile.age,
      gender: profile.gender,
      activityLevel: profile.activity_level,
      updatedAt: profile.updated_at
    });
  } catch (error) {
    console.error('Failed to fetch profile:', error);
    res.status(500).json({ error: 'Unable to fetch fitness profile' });
  }
});

/**
 * POST /api/fitness/profile
 * Create or update fitness profile
 */
router.post('/profile', async (req, res) => {
  const { height, age, gender, activityLevel } = req.body;

  try {
    // Check if profile exists
    const existing = await getAsync('SELECT * FROM fitness_profile LIMIT 1');

    if (existing) {
      await runAsync(
        `UPDATE fitness_profile SET
          height = COALESCE(?, height),
          age = COALESCE(?, age),
          gender = COALESCE(?, gender),
          activity_level = COALESCE(?, activity_level),
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [height, age, gender, activityLevel, existing.id]
      );
      res.json({ message: 'Profile updated successfully' });
    } else {
      const result = await runAsync(
        'INSERT INTO fitness_profile (height, age, gender, activity_level) VALUES (?, ?, ?, ?)',
        [height || null, age || null, gender || null, activityLevel || 'moderate']
      );
      res.status(201).json({ id: result.lastID, message: 'Profile created successfully' });
    }
  } catch (error) {
    console.error('Failed to save profile:', error);
    res.status(500).json({ error: 'Unable to save fitness profile' });
  }
});

// ==================== FITNESS GOALS ====================

/**
 * GET /api/fitness/goals
 * Get fitness goals
 */
router.get('/goals', async (req, res) => {
  try {
    const { status } = req.query;
    
    let sql = `
      SELECT fg.*, e.name as exercise_name
      FROM fitness_goals fg
      LEFT JOIN exercises e ON fg.exercise_id = e.id
    `;
    const params = [];

    if (status) {
      sql += ' WHERE fg.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY fg.deadline ASC NULLS LAST, fg.created_at DESC';

    const goals = await allAsync(sql, params);

    res.json(goals.map(g => ({
      id: g.id,
      goalType: g.goal_type,
      targetValue: g.target_value,
      targetDescription: g.target_description,
      deadline: g.deadline,
      currentProgress: g.current_progress,
      status: g.status,
      exerciseId: g.exercise_id,
      exerciseName: g.exercise_name,
      createdAt: g.created_at
    })));
  } catch (error) {
    console.error('Failed to fetch goals:', error);
    res.status(500).json({ error: 'Unable to fetch fitness goals' });
  }
});

/**
 * POST /api/fitness/goals
 * Create a new fitness goal
 */
router.post('/goals', [
  body('goalType').notEmpty().withMessage('Goal type is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { goalType, targetValue, targetDescription, deadline, exerciseId } = req.body;

  try {
    const result = await runAsync(
      `INSERT INTO fitness_goals (goal_type, target_value, target_description, deadline, exercise_id)
       VALUES (?, ?, ?, ?, ?)`,
      [goalType, targetValue || null, targetDescription || '', deadline || null, exerciseId || null]
    );

    res.status(201).json({
      id: result.lastID,
      goalType,
      message: 'Goal created successfully'
    });
  } catch (error) {
    console.error('Failed to create goal:', error);
    res.status(500).json({ error: 'Unable to create fitness goal' });
  }
});

/**
 * PUT /api/fitness/goals/:id
 * Update a fitness goal
 */
router.put('/goals/:id', [param('id').isInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const goalId = Number(req.params.id);
  const { targetValue, targetDescription, deadline, currentProgress, status } = req.body;

  try {
    const existing = await getAsync('SELECT * FROM fitness_goals WHERE id = ?', [goalId]);
    if (!existing) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    await runAsync(
      `UPDATE fitness_goals SET
        target_value = COALESCE(?, target_value),
        target_description = COALESCE(?, target_description),
        deadline = COALESCE(?, deadline),
        current_progress = COALESCE(?, current_progress),
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [targetValue, targetDescription, deadline, currentProgress, status, goalId]
    );

    res.json({ message: 'Goal updated successfully' });
  } catch (error) {
    console.error('Failed to update goal:', error);
    res.status(500).json({ error: 'Unable to update fitness goal' });
  }
});

/**
 * DELETE /api/fitness/goals/:id
 * Delete a fitness goal
 */
router.delete('/goals/:id', [param('id').isInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const result = await runAsync('DELETE FROM fitness_goals WHERE id = ?', [req.params.id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    console.error('Failed to delete goal:', error);
    res.status(500).json({ error: 'Unable to delete fitness goal' });
  }
});

// ==================== PROGRESS & ANALYTICS ====================

/**
 * GET /api/fitness/progress/exercise/:exerciseId
 * Get progress data for a specific exercise
 */
router.get('/progress/exercise/:exerciseId', [param('exerciseId').isInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const exerciseId = Number(req.params.exerciseId);
    const { days = 90 } = req.query;

    // Get exercise info
    const exercise = await getAsync('SELECT * FROM exercises WHERE id = ?', [exerciseId]);
    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    // Get session data with max weight per session
    const progress = await allAsync(
      `SELECT ws.date, MAX(el.weight) as max_weight, MAX(el.reps) as max_reps
       FROM exercise_logs el
       JOIN workout_sessions ws ON el.session_id = ws.id
       WHERE el.exercise_id = ? AND ws.date >= date('now', '-' || ? || ' days')
       GROUP BY ws.date
       ORDER BY ws.date ASC`,
      [exerciseId, days]
    );

    // Calculate suggested next weight (progressive overload)
    let suggestedWeight = null;
    if (progress.length > 0) {
      const lastSession = progress[progress.length - 1];
      suggestedWeight = Math.round(lastSession.max_weight * 1.025 * 2) / 2; // Round to nearest 0.5
    }

    res.json({
      exercise: {
        id: exercise.id,
        name: exercise.name
      },
      progress: progress.map(p => ({
        date: p.date,
        maxWeight: p.max_weight,
        maxReps: p.max_reps
      })),
      suggestedNextWeight: suggestedWeight
    });
  } catch (error) {
    console.error('Failed to fetch progress:', error);
    res.status(500).json({ error: 'Unable to fetch exercise progress' });
  }
});

/**
 * GET /api/fitness/stats/weekly
 * Get weekly workout statistics
 */
router.get('/stats/weekly', async (req, res) => {
  try {
    // Get sessions from last 7 days
    const sessions = await allAsync(
      `SELECT ws.*, 
         (SELECT COUNT(*) FROM exercise_logs WHERE session_id = ws.id) as set_count,
         (SELECT SUM(weight * reps) FROM exercise_logs WHERE session_id = ws.id) as total_volume
       FROM workout_sessions ws
       WHERE ws.date >= date('now', '-7 days')
       ORDER BY ws.date DESC`
    );

    // Calculate stats
    const totalSessions = sessions.length;
    const totalSets = sessions.reduce((sum, s) => sum + (s.set_count || 0), 0);
    const totalVolume = sessions.reduce((sum, s) => sum + (s.total_volume || 0), 0);
    const avgDuration = totalSessions > 0 
      ? Math.round(sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / totalSessions) 
      : 0;

    // Get muscle group volume breakdown
    const muscleVolume = await allAsync(
      `SELECT mg.name, SUM(el.weight * el.reps) as volume
       FROM exercise_logs el
       JOIN workout_sessions ws ON el.session_id = ws.id
       JOIN exercises e ON el.exercise_id = e.id
       LEFT JOIN muscle_groups mg ON e.primary_muscle_group_id = mg.id
       WHERE ws.date >= date('now', '-7 days')
       GROUP BY mg.id
       ORDER BY volume DESC`
    );

    res.json({
      period: 'weekly',
      totalSessions,
      totalSets,
      totalVolume: Math.round(totalVolume),
      avgDurationMinutes: avgDuration,
      muscleGroupVolume: muscleVolume.map(m => ({
        muscleGroup: m.name || 'Unknown',
        volume: Math.round(m.volume || 0)
      })),
      sessions: sessions.map(s => ({
        date: s.date,
        durationMinutes: s.duration_minutes,
        setCount: s.set_count,
        volume: Math.round(s.total_volume || 0)
      }))
    });
  } catch (error) {
    console.error('Failed to fetch weekly stats:', error);
    res.status(500).json({ error: 'Unable to fetch weekly statistics' });
  }
});

/**
 * GET /api/fitness/today
 * Get today's scheduled workout (if any) and quick stats
 */
router.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Check if there's a session today
    const todaySession = await getAsync(
      `SELECT ws.*, wt.name as template_name, wd.name as workout_day_name
       FROM workout_sessions ws
       LEFT JOIN workout_templates wt ON ws.template_id = wt.id
       LEFT JOIN workout_days wd ON ws.workout_day_id = wd.id
       WHERE ws.date = ?`,
      [today]
    );

    // Get active template
    const activeTemplate = await getAsync(
      'SELECT * FROM workout_templates WHERE is_active = 1 LIMIT 1'
    );

    // Get last session
    const lastSession = await getAsync(
      `SELECT ws.*, wt.name as template_name
       FROM workout_sessions ws
       LEFT JOIN workout_templates wt ON ws.template_id = wt.id
       WHERE ws.date < ?
       ORDER BY ws.date DESC LIMIT 1`,
      [today]
    );

    // Get this week's session count
    const weekSessionCount = await getAsync(
      `SELECT COUNT(*) as count FROM workout_sessions 
       WHERE date >= date('now', 'weekday 0', '-7 days')`
    );

    res.json({
      todaySession: todaySession ? {
        id: todaySession.id,
        templateName: todaySession.template_name,
        workoutDayName: todaySession.workout_day_name,
        startTime: todaySession.start_time,
        endTime: todaySession.end_time,
        durationMinutes: todaySession.duration_minutes
      } : null,
      activeTemplate: activeTemplate ? {
        id: activeTemplate.id,
        name: activeTemplate.name,
        frequency: activeTemplate.frequency
      } : null,
      lastSession: lastSession ? {
        date: lastSession.date,
        templateName: lastSession.template_name
      } : null,
      weekSessionCount: weekSessionCount?.count || 0
    });
  } catch (error) {
    console.error('Failed to fetch today data:', error);
    res.status(500).json({ error: 'Unable to fetch today data' });
  }
});

export = router;
