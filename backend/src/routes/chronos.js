/**
 * @fileoverview Chronos Time Intelligence System API routes.
 * Provides endpoints for time blocking, time tracking, analytics, and AI-powered schedule optimization.
 * @module routes/chronos
 */

const express = require('express');
const router = express.Router();
const { allAsync, runAsync, getAsync } = require('../utils/database');
const { authenticateToken } = require('../middleware/apiKeyAuth');
const { autoScheduleTask, addMinutes, getMinutesDifference } = require('../services/chronos');

// ==================== TIME BLOCKS ENDPOINTS ====================

/**
 * Get all time blocks for a date range
 * @route GET /api/chronos/time-blocks
 * @query {string} startDate - Start date (YYYY-MM-DD)
 * @query {string} endDate - End date (YYYY-MM-DD)
 * @query {string} category - Filter by category (optional)
 */
router.get('/time-blocks', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, category } = req.query;
    const userId = req.user.id;

    let query = `
      SELECT tb.*, t.title as task_title, p.name as project_name, h.name as habit_name
      FROM chronos_time_blocks tb
      LEFT JOIN tasks t ON tb.task_id = t.id
      LEFT JOIN projects p ON tb.project_id = p.id
      LEFT JOIN habits h ON tb.habit_id = h.id
      WHERE tb.created_by = ?
    `;
    const params = [userId];

    if (startDate && endDate) {
      query += ' AND tb.date >= ? AND tb.date <= ?';
      params.push(startDate, endDate);
    }

    if (category) {
      query += ' AND tb.category = ?';
      params.push(category);
    }

    query += ' ORDER BY tb.date, tb.start_time';

    const blocks = await allAsync(query, params);
    res.json(blocks);
  } catch (error) {
    console.error('Error fetching time blocks:', error);
    res.status(500).json({ error: 'Failed to fetch time blocks' });
  }
});

/**
 * Get a single time block by ID
 * @route GET /api/chronos/time-blocks/:id
 */
router.get('/time-blocks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const block = await getAsync(
      'SELECT * FROM chronos_time_blocks WHERE id = ? AND created_by = ?',
      [id, userId]
    );

    if (!block) {
      return res.status(404).json({ error: 'Time block not found' });
    }

    res.json(block);
  } catch (error) {
    console.error('Error fetching time block:', error);
    res.status(500).json({ error: 'Failed to fetch time block' });
  }
});

/**
 * Create a new time block
 * @route POST /api/chronos/time-blocks
 */
router.post('/time-blocks', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      start_time,
      end_time,
      color,
      category,
      task_id,
      project_id,
      habit_id,
      is_template,
      template_name,
      recurrence_rule,
      buffer_before,
      buffer_after,
      energy_required,
      focus_level,
      location,
      notes
    } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!title || !date || !start_time || !end_time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check for conflicts if conflict warnings are enabled
    const settings = await getAsync(
      'SELECT conflict_warnings_enabled FROM chronos_settings WHERE user_id = ?',
      [userId]
    );

    if (!settings || settings.conflict_warnings_enabled) {
      const conflicts = await allAsync(`
        SELECT * FROM chronos_time_blocks
        WHERE created_by = ? AND date = ?
        AND ((start_time < ? AND end_time > ?)
        OR (start_time < ? AND end_time > ?)
        OR (start_time >= ? AND end_time <= ?))
      `, [userId, date, end_time, start_time, end_time, start_time, start_time, end_time]);

      if (conflicts.length > 0) {
        return res.status(409).json({
          error: 'Time block conflicts with existing blocks',
          conflicts
        });
      }
    }

    const result = await runAsync(`
      INSERT INTO chronos_time_blocks (
        title, description, date, start_time, end_time, color, category,
        task_id, project_id, habit_id, is_template, template_name,
        recurrence_rule, buffer_before, buffer_after, energy_required,
        focus_level, location, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      title, description, date, start_time, end_time,
      color || '#3498db', category || 'general',
      task_id || null, project_id || null, habit_id || null,
      is_template || 0, template_name || null, recurrence_rule || null,
      buffer_before || 0, buffer_after || 0,
      energy_required || 'medium', focus_level || 'normal',
      location || null, notes || null, userId
    ]);

    const newBlock = await getAsync(
      'SELECT * FROM chronos_time_blocks WHERE id = ?',
      [result.lastID]
    );

    res.status(201).json(newBlock);
  } catch (error) {
    console.error('Error creating time block:', error);
    res.status(500).json({ error: 'Failed to create time block' });
  }
});

/**
 * Update a time block
 * @route PUT /api/chronos/time-blocks/:id
 */
router.put('/time-blocks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const existingBlock = await getAsync(
      'SELECT * FROM chronos_time_blocks WHERE id = ? AND created_by = ?',
      [id, userId]
    );

    if (!existingBlock) {
      return res.status(404).json({ error: 'Time block not found' });
    }

    const {
      title, description, date, start_time, end_time, color, category,
      task_id, project_id, habit_id, buffer_before, buffer_after,
      energy_required, focus_level, location, notes
    } = req.body;

    await runAsync(`
      UPDATE chronos_time_blocks SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        date = COALESCE(?, date),
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        color = COALESCE(?, color),
        category = COALESCE(?, category),
        task_id = ?,
        project_id = ?,
        habit_id = ?,
        buffer_before = COALESCE(?, buffer_before),
        buffer_after = COALESCE(?, buffer_after),
        energy_required = COALESCE(?, energy_required),
        focus_level = COALESCE(?, focus_level),
        location = ?,
        notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND created_by = ?
    `, [
      title, description, date, start_time, end_time, color, category,
      task_id, project_id, habit_id,
      buffer_before, buffer_after, energy_required, focus_level,
      location, notes, id, userId
    ]);

    const updatedBlock = await getAsync(
      'SELECT * FROM chronos_time_blocks WHERE id = ?',
      [id]
    );

    res.json(updatedBlock);
  } catch (error) {
    console.error('Error updating time block:', error);
    res.status(500).json({ error: 'Failed to update time block' });
  }
});

/**
 * Delete a time block
 * @route DELETE /api/chronos/time-blocks/:id
 */
router.delete('/time-blocks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await runAsync(
      'DELETE FROM chronos_time_blocks WHERE id = ? AND created_by = ?',
      [id, userId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Time block not found' });
    }

    res.json({ message: 'Time block deleted successfully' });
  } catch (error) {
    console.error('Error deleting time block:', error);
    res.status(500).json({ error: 'Failed to delete time block' });
  }
});

// ==================== TIME SESSIONS ENDPOINTS ====================

/**
 * Get all time sessions
 * @route GET /api/chronos/time-sessions
 * @query {string} startDate - Start date (optional)
 * @query {string} endDate - End date (optional)
 * @query {string} status - Filter by status (optional)
 */
router.get('/time-sessions', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    const userId = req.user.id;

    let query = `
      SELECT ts.*, tb.title as block_title, t.title as task_title, p.name as project_name
      FROM chronos_time_sessions ts
      LEFT JOIN chronos_time_blocks tb ON ts.time_block_id = tb.id
      LEFT JOIN tasks t ON ts.task_id = t.id
      LEFT JOIN projects p ON ts.project_id = p.id
      WHERE ts.created_by = ?
    `;
    const params = [userId];

    if (startDate) {
      query += ' AND DATE(ts.start_time) >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND DATE(ts.start_time) <= ?';
      params.push(endDate);
    }

    if (status) {
      query += ' AND ts.status = ?';
      params.push(status);
    }

    query += ' ORDER BY ts.start_time DESC';

    const sessions = await allAsync(query, params);
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching time sessions:', error);
    res.status(500).json({ error: 'Failed to fetch time sessions' });
  }
});

/**
 * Get active time session (currently running)
 * @route GET /api/chronos/time-sessions/active
 */
router.get('/time-sessions/active', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const session = await getAsync(`
      SELECT ts.*, tb.title as block_title, t.title as task_title
      FROM chronos_time_sessions ts
      LEFT JOIN chronos_time_blocks tb ON ts.time_block_id = tb.id
      LEFT JOIN tasks t ON ts.task_id = t.id
      WHERE ts.created_by = ? AND ts.status = 'active'
      ORDER BY ts.start_time DESC
      LIMIT 1
    `, [userId]);

    res.json(session || null);
  } catch (error) {
    console.error('Error fetching active session:', error);
    res.status(500).json({ error: 'Failed to fetch active session' });
  }
});

/**
 * Start a new time tracking session
 * @route POST /api/chronos/time-sessions/start
 */
router.post('/time-sessions/start', authenticateToken, async (req, res) => {
  try {
    const {
      time_block_id,
      task_id,
      project_id,
      title,
      description,
      category,
      is_pomodoro
    } = req.body;
    const userId = req.user.id;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Check if there's already an active session
    const activeSession = await getAsync(
      'SELECT id FROM chronos_time_sessions WHERE created_by = ? AND status = ?',
      [userId, 'active']
    );

    if (activeSession) {
      return res.status(409).json({
        error: 'Another session is already active',
        sessionId: activeSession.id
      });
    }

    const result = await runAsync(`
      INSERT INTO chronos_time_sessions (
        time_block_id, task_id, project_id, title, description, category,
        start_time, status, is_pomodoro, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), 'active', ?, ?)
    `, [
      time_block_id || null,
      task_id || null,
      project_id || null,
      title,
      description || null,
      category || 'general',
      is_pomodoro || 0,
      userId
    ]);

    const newSession = await getAsync(
      'SELECT * FROM chronos_time_sessions WHERE id = ?',
      [result.lastID]
    );

    res.status(201).json(newSession);
  } catch (error) {
    console.error('Error starting time session:', error);
    res.status(500).json({ error: 'Failed to start time session' });
  }
});

/**
 * Pause a time tracking session
 * @route POST /api/chronos/time-sessions/:id/pause
 */
router.post('/time-sessions/:id/pause', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const session = await getAsync(
      'SELECT * FROM chronos_time_sessions WHERE id = ? AND created_by = ?',
      [id, userId]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'active') {
      return res.status(400).json({ error: 'Session is not active' });
    }

    await runAsync(`
      UPDATE chronos_time_sessions
      SET status = 'paused', pause_time = datetime('now')
      WHERE id = ?
    `, [id]);

    const updatedSession = await getAsync(
      'SELECT * FROM chronos_time_sessions WHERE id = ?',
      [id]
    );

    res.json(updatedSession);
  } catch (error) {
    console.error('Error pausing session:', error);
    res.status(500).json({ error: 'Failed to pause session' });
  }
});

/**
 * Resume a paused time tracking session
 * @route POST /api/chronos/time-sessions/:id/resume
 */
router.post('/time-sessions/:id/resume', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const session = await getAsync(
      'SELECT * FROM chronos_time_sessions WHERE id = ? AND created_by = ?',
      [id, userId]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'paused') {
      return res.status(400).json({ error: 'Session is not paused' });
    }

    // Calculate pause duration and add to total
    const pauseDuration = await getAsync(`
      SELECT (julianday('now') - julianday(?)) * 24 * 60 as minutes
    `, [session.pause_time]);

    const totalPauseDuration = (session.pause_duration || 0) + Math.round(pauseDuration.minutes);

    await runAsync(`
      UPDATE chronos_time_sessions
      SET status = 'active',
          pause_duration = ?,
          pause_time = NULL
      WHERE id = ?
    `, [totalPauseDuration, id]);

    const updatedSession = await getAsync(
      'SELECT * FROM chronos_time_sessions WHERE id = ?',
      [id]
    );

    res.json(updatedSession);
  } catch (error) {
    console.error('Error resuming session:', error);
    res.status(500).json({ error: 'Failed to resume session' });
  }
});

/**
 * Stop/Complete a time tracking session
 * @route POST /api/chronos/time-sessions/:id/stop
 */
router.post('/time-sessions/:id/stop', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      energy_level,
      focus_quality,
      productivity_rating,
      interruptions,
      notes
    } = req.body;
    const userId = req.user.id;

    const session = await getAsync(
      'SELECT * FROM chronos_time_sessions WHERE id = ? AND created_by = ?',
      [id, userId]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status === 'completed') {
      return res.status(400).json({ error: 'Session is already completed' });
    }

    // Calculate total duration
    const durationQuery = await getAsync(`
      SELECT (julianday('now') - julianday(?)) * 24 * 60 as minutes
    `, [session.start_time]);

    const totalDuration = Math.round(durationQuery.minutes) - (session.pause_duration || 0);

    await runAsync(`
      UPDATE chronos_time_sessions
      SET status = 'completed',
          end_time = datetime('now'),
          total_duration = ?,
          energy_level = COALESCE(?, energy_level),
          focus_quality = COALESCE(?, focus_quality),
          productivity_rating = COALESCE(?, productivity_rating),
          interruptions = COALESCE(?, interruptions),
          notes = COALESCE(?, notes)
      WHERE id = ?
    `, [totalDuration, energy_level, focus_quality, productivity_rating, interruptions, notes, id]);

    // Update task time_spent if linked
    if (session.task_id) {
      await runAsync(`
        UPDATE tasks
        SET time_spent = time_spent + ?
        WHERE id = ?
      `, [totalDuration, session.task_id]);
    }

    const updatedSession = await getAsync(
      'SELECT * FROM chronos_time_sessions WHERE id = ?',
      [id]
    );

    res.json(updatedSession);
  } catch (error) {
    console.error('Error stopping session:', error);
    res.status(500).json({ error: 'Failed to stop session' });
  }
});

// ==================== ANALYTICS ENDPOINTS ====================

/**
 * Get weekly analytics
 * @route GET /api/chronos/analytics/weekly
 */
router.get('/analytics/weekly', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate } = req.query;

    const weekStart = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const weekEnd = new Date(new Date(weekStart).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Time blocks vs actual sessions comparison
    const plannedVsActual = await allAsync(`
      SELECT
        DATE(tb.date) as date,
        COUNT(DISTINCT tb.id) as planned_blocks,
        COUNT(DISTINCT ts.id) as completed_sessions,
        SUM(CASE
          WHEN ts.id IS NOT NULL
          THEN (julianday(ts.end_time) - julianday(ts.start_time)) * 24 * 60
          ELSE 0
        END) as actual_minutes,
        SUM(CASE
          WHEN tb.start_time IS NOT NULL AND tb.end_time IS NOT NULL
          THEN (julianday('2000-01-01 ' || tb.end_time) - julianday('2000-01-01 ' || tb.start_time)) * 24 * 60
          ELSE 0
        END) as planned_minutes
      FROM chronos_time_blocks tb
      LEFT JOIN chronos_time_sessions ts ON tb.id = ts.time_block_id AND ts.status = 'completed'
      WHERE tb.created_by = ? AND tb.date >= ? AND tb.date <= ?
      GROUP BY DATE(tb.date)
      ORDER BY date
    `, [userId, weekStart, weekEnd]);

    // Category breakdown
    const categoryBreakdown = await allAsync(`
      SELECT
        category,
        COUNT(*) as session_count,
        SUM(total_duration) as total_minutes,
        AVG(focus_quality) as avg_focus,
        AVG(productivity_rating) as avg_productivity
      FROM chronos_time_sessions
      WHERE created_by = ? AND DATE(start_time) >= ? AND DATE(start_time) <= ?
      AND status = 'completed'
      GROUP BY category
      ORDER BY total_minutes DESC
    `, [userId, weekStart, weekEnd]);

    // Energy patterns (by hour of day)
    const energyPatterns = await allAsync(`
      SELECT
        CAST(strftime('%H', start_time) AS INTEGER) as hour,
        AVG(energy_level) as avg_energy,
        AVG(focus_quality) as avg_focus,
        COUNT(*) as session_count
      FROM chronos_time_sessions
      WHERE created_by = ? AND DATE(start_time) >= ? AND DATE(start_time) <= ?
      AND status = 'completed'
      GROUP BY hour
      ORDER BY hour
    `, [userId, weekStart, weekEnd]);

    // Focus analysis
    const focusAnalysis = await getAsync(`
      SELECT
        COUNT(*) as total_sessions,
        SUM(CASE WHEN focus_quality >= 4 THEN 1 ELSE 0 END) as high_focus_sessions,
        SUM(CASE WHEN focus_quality <= 2 THEN 1 ELSE 0 END) as low_focus_sessions,
        AVG(focus_quality) as avg_focus_quality,
        SUM(interruptions) as total_interruptions,
        SUM(total_duration) as total_minutes
      FROM chronos_time_sessions
      WHERE created_by = ? AND DATE(start_time) >= ? AND DATE(start_time) <= ?
      AND status = 'completed'
    `, [userId, weekStart, weekEnd]);

    res.json({
      period: { startDate: weekStart, endDate: weekEnd },
      plannedVsActual,
      categoryBreakdown,
      energyPatterns,
      focusAnalysis
    });
  } catch (error) {
    console.error('Error fetching weekly analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * Get productivity score
 * @route GET /api/chronos/analytics/productivity-score
 */
router.get('/analytics/productivity-score', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 7 } = req.query;

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const score = await getAsync(`
      SELECT
        COUNT(DISTINCT tb.id) as planned_blocks,
        COUNT(DISTINCT CASE WHEN ts.status = 'completed' THEN ts.id END) as completed_sessions,
        AVG(CASE WHEN ts.status = 'completed' THEN ts.productivity_rating END) as avg_productivity,
        AVG(CASE WHEN ts.status = 'completed' THEN ts.focus_quality END) as avg_focus,
        SUM(CASE WHEN ts.status = 'completed' THEN ts.total_duration ELSE 0 END) as total_minutes
      FROM chronos_time_blocks tb
      LEFT JOIN chronos_time_sessions ts ON tb.id = ts.time_block_id
      WHERE tb.created_by = ? AND tb.date >= ?
    `, [userId, startDate]);

    const completionRate = score.planned_blocks > 0
      ? (score.completed_sessions / score.planned_blocks) * 100
      : 0;

    const productivityScore = Math.round(
      (completionRate * 0.4) +
      ((score.avg_productivity || 0) * 20 * 0.3) +
      ((score.avg_focus || 0) * 20 * 0.3)
    );

    res.json({
      score: productivityScore,
      metrics: {
        completionRate: completionRate.toFixed(2),
        avgProductivity: (score.avg_productivity || 0).toFixed(2),
        avgFocus: (score.avg_focus || 0).toFixed(2),
        totalMinutes: score.total_minutes || 0,
        plannedBlocks: score.planned_blocks,
        completedSessions: score.completed_sessions
      }
    });
  } catch (error) {
    console.error('Error calculating productivity score:', error);
    res.status(500).json({ error: 'Failed to calculate productivity score' });
  }
});

// ==================== TEMPLATES ENDPOINTS ====================

/**
 * Get all time templates
 * @route GET /api/chronos/templates
 */
router.get('/templates', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const templates = await allAsync(
      'SELECT * FROM chronos_time_templates WHERE created_by = ? ORDER BY name',
      [userId]
    );

    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

/**
 * Create a time template
 * @route POST /api/chronos/templates
 */
router.post('/templates', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      description,
      title,
      start_time,
      duration,
      color,
      category,
      recurrence_pattern,
      days_of_week,
      buffer_before,
      buffer_after,
      energy_required,
      focus_level
    } = req.body;
    const userId = req.user.id;

    if (!name || !title || !start_time || !duration || !recurrence_pattern) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await runAsync(`
      INSERT INTO chronos_time_templates (
        name, description, title, start_time, duration, color, category,
        recurrence_pattern, days_of_week, buffer_before, buffer_after,
        energy_required, focus_level, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name, description || null, title, start_time, duration,
      color || '#3498db', category || 'general',
      recurrence_pattern, days_of_week || null,
      buffer_before || 0, buffer_after || 0,
      energy_required || 'medium', focus_level || 'normal',
      userId
    ]);

    const newTemplate = await getAsync(
      'SELECT * FROM chronos_time_templates WHERE id = ?',
      [result.lastID]
    );

    res.status(201).json(newTemplate);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

/**
 * Delete a template
 * @route DELETE /api/chronos/templates/:id
 */
router.delete('/templates/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await runAsync(
      'DELETE FROM chronos_time_templates WHERE id = ? AND created_by = ?',
      [id, userId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// ==================== SETTINGS ENDPOINTS ====================

/**
 * Get Chronos settings for the current user
 * @route GET /api/chronos/settings
 */
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    let settings = await getAsync(
      'SELECT * FROM chronos_settings WHERE user_id = ?',
      [userId]
    );

    // Create default settings if none exist
    if (!settings) {
      await runAsync(
        'INSERT INTO chronos_settings (user_id) VALUES (?)',
        [userId]
      );
      settings = await getAsync(
        'SELECT * FROM chronos_settings WHERE user_id = ?',
        [userId]
      );
    }

    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/**
 * Update Chronos settings
 * @route PUT /api/chronos/settings
 */
router.put('/settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      work_hours_start,
      work_hours_end,
      default_block_duration,
      default_break_duration,
      pomodoro_work_duration,
      pomodoro_break_duration,
      pomodoro_long_break,
      auto_schedule_enabled,
      conflict_warnings_enabled,
      buffer_time_enabled,
      default_buffer_minutes,
      focus_mode_default,
      break_reminders_enabled,
      idle_timeout_minutes,
      timezone
    } = req.body;

    // Ensure settings exist
    const existingSettings = await getAsync(
      'SELECT * FROM chronos_settings WHERE user_id = ?',
      [userId]
    );

    if (!existingSettings) {
      await runAsync(
        'INSERT INTO chronos_settings (user_id) VALUES (?)',
        [userId]
      );
    }

    // Update settings
    await runAsync(`
      UPDATE chronos_settings SET
        work_hours_start = COALESCE(?, work_hours_start),
        work_hours_end = COALESCE(?, work_hours_end),
        default_block_duration = COALESCE(?, default_block_duration),
        default_break_duration = COALESCE(?, default_break_duration),
        pomodoro_work_duration = COALESCE(?, pomodoro_work_duration),
        pomodoro_break_duration = COALESCE(?, pomodoro_break_duration),
        pomodoro_long_break = COALESCE(?, pomodoro_long_break),
        auto_schedule_enabled = COALESCE(?, auto_schedule_enabled),
        conflict_warnings_enabled = COALESCE(?, conflict_warnings_enabled),
        buffer_time_enabled = COALESCE(?, buffer_time_enabled),
        default_buffer_minutes = COALESCE(?, default_buffer_minutes),
        focus_mode_default = COALESCE(?, focus_mode_default),
        break_reminders_enabled = COALESCE(?, break_reminders_enabled),
        idle_timeout_minutes = COALESCE(?, idle_timeout_minutes),
        timezone = COALESCE(?, timezone),
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `, [
      work_hours_start, work_hours_end, default_block_duration, default_break_duration,
      pomodoro_work_duration, pomodoro_break_duration, pomodoro_long_break,
      auto_schedule_enabled, conflict_warnings_enabled, buffer_time_enabled,
      default_buffer_minutes, focus_mode_default, break_reminders_enabled,
      idle_timeout_minutes, timezone, userId
    ]);

    const updatedSettings = await getAsync(
      'SELECT * FROM chronos_settings WHERE user_id = ?',
      [userId]
    );

    res.json(updatedSettings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ==================== POMODORO ENDPOINTS ====================

/**
 * Start a Pomodoro session
 * @route POST /api/chronos/pomodoro/start
 */
router.post('/pomodoro/start', authenticateToken, async (req, res) => {
  try {
    const { task_id, duration, break_duration } = req.body;
    const userId = req.user.id;

    // Get user's Pomodoro settings
    const settings = await getAsync(
      'SELECT pomodoro_work_duration, pomodoro_break_duration FROM chronos_settings WHERE user_id = ?',
      [userId]
    );

    const workDuration = duration || settings?.pomodoro_work_duration || 25;
    const breakDur = break_duration || settings?.pomodoro_break_duration || 5;

    const result = await runAsync(`
      INSERT INTO chronos_pomodoro_sessions (
        task_id, duration, break_duration, start_time, status, created_by
      ) VALUES (?, ?, ?, datetime('now'), 'active', ?)
    `, [task_id || null, workDuration, breakDur, userId]);

    const newPomodoro = await getAsync(
      'SELECT * FROM chronos_pomodoro_sessions WHERE id = ?',
      [result.lastID]
    );

    res.status(201).json(newPomodoro);
  } catch (error) {
    console.error('Error starting Pomodoro:', error);
    res.status(500).json({ error: 'Failed to start Pomodoro session' });
  }
});

/**
 * Complete a Pomodoro session
 * @route POST /api/chronos/pomodoro/:id/complete
 */
router.post('/pomodoro/:id/complete', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await runAsync(`
      UPDATE chronos_pomodoro_sessions
      SET status = 'completed',
          end_time = datetime('now'),
          completed = 1
      WHERE id = ? AND created_by = ?
    `, [id, userId]);

    const updatedPomodoro = await getAsync(
      'SELECT * FROM chronos_pomodoro_sessions WHERE id = ?',
      [id]
    );

    res.json(updatedPomodoro);
  } catch (error) {
    console.error('Error completing Pomodoro:', error);
    res.status(500).json({ error: 'Failed to complete Pomodoro session' });
  }
});

// ==================== INTEGRATION ENDPOINTS ====================

/**
 * Create time block from task
 * @route POST /api/chronos/integrate/task-to-block
 */
router.post('/integrate/task-to-block', authenticateToken, async (req, res) => {
  try {
    const { task_id, date, start_time, duration } = req.body;
    const userId = req.user.id;

    if (!task_id || !date || !start_time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get task details
    const task = await getAsync('SELECT * FROM tasks WHERE id = ? AND created_by = ?', [task_id, userId]);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Calculate end time
    const blockDuration = duration || task.time_estimate || 60;
    const end_time = addMinutes(start_time, blockDuration);

    // Create time block
    const result = await runAsync(`
      INSERT INTO chronos_time_blocks (
        title, description, date, start_time, end_time, category,
        task_id, project_id, energy_required, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      task.title,
      task.description,
      date,
      start_time,
      end_time,
      task.category || 'general',
      task_id,
      task.project_id,
      task.energy_required || 'medium',
      userId
    ]);

    const newBlock = await getAsync('SELECT * FROM chronos_time_blocks WHERE id = ?', [result.lastID]);
    res.status(201).json(newBlock);
  } catch (error) {
    console.error('Error creating block from task:', error);
    res.status(500).json({ error: 'Failed to create time block from task' });
  }
});

/**
 * Get suggested schedule for tasks
 * @route POST /api/chronos/integrate/auto-schedule-tasks
 */
router.post('/integrate/auto-schedule-tasks', authenticateToken, async (req, res) => {
  try {
    const { task_ids, start_date } = req.body;
    const userId = req.user.id;

    if (!task_ids || !Array.isArray(task_ids)) {
      return res.status(400).json({ error: 'task_ids must be an array' });
    }

    const scheduledBlocks = [];

    for (const taskId of task_ids) {
      const task = await getAsync('SELECT * FROM tasks WHERE id = ? AND created_by = ?', [taskId, userId]);
      if (task) {
        try {
          const suggestion = await autoScheduleTask(userId, {
            duration: task.time_estimate || 60,
            category: task.category || 'general',
            energy_required: task.energy_required || 'medium',
            title: task.title
          }, start_date);

          scheduledBlocks.push({
            task_id: taskId,
            suggestion
          });
        } catch (error) {
          console.error(`Could not schedule task ${taskId}:`, error.message);
        }
      }
    }

    res.json({ scheduledBlocks });
  } catch (error) {
    console.error('Error auto-scheduling tasks:', error);
    res.status(500).json({ error: 'Failed to auto-schedule tasks' });
  }
});

/**
 * Sync time blocks with daily planner
 * @route GET /api/chronos/integrate/daily-blocks/:date
 */
router.get('/integrate/daily-blocks/:date', authenticateToken, async (req, res) => {
  try {
    const { date } = req.params;
    const userId = req.user.id;

    // Get time blocks for the date
    const blocks = await allAsync(`
      SELECT tb.*, t.title as task_title
      FROM chronos_time_blocks tb
      LEFT JOIN tasks t ON tb.task_id = t.id
      WHERE tb.created_by = ? AND tb.date = ?
      ORDER BY tb.start_time
    `, [userId, date]);

    // Get daily priorities for the date
    const priorities = await allAsync(
      'SELECT * FROM daily_priorities WHERE created_by = ? AND date = ? ORDER BY position',
      [userId, date]
    );

    res.json({
      date,
      blocks,
      priorities,
      totalPlannedMinutes: blocks.reduce((sum, block) => {
        return sum + getMinutesDifference(block.start_time, block.end_time);
      }, 0)
    });
  } catch (error) {
    console.error('Error syncing daily blocks:', error);
    res.status(500).json({ error: 'Failed to sync daily blocks' });
  }
});

module.exports = router;
