// @ts-nocheck
/**
 * @fileoverview Routes for Al-Falah Islamic Habit Tracker functionality.
 * Provides CRUD operations for prayer tracking, Quran recitation, dhikr, fasting, and more.
 * @module routes/islamic
 */

import express from 'express';
import {  body, validationResult, param, query  } from 'express-validator';
import {  runAsync, allAsync, getAsync  } from '../utils/database';

const router = express.Router();

// Prayer types constant
const PRAYER_TYPES = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

// Dhikr types constant
const DHIKR_TYPES = [
  'morning_adhkar',
  'evening_adhkar',
  'after_fajr',
  'after_dhuhr',
  'after_asr',
  'after_maghrib',
  'after_isha',
  'custom'
];

/**
 * GET /api/islamic/prayers
 * Get prayer records for a date range
 */
router.get('/prayers', [
  query('startDate').notEmpty().withMessage('startDate is required'),
  query('endDate').notEmpty().withMessage('endDate is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { startDate, endDate } = req.query;

  try {
    const prayers = await allAsync(
      `SELECT * FROM prayer_records 
       WHERE date >= ? AND date <= ?
       ORDER BY date ASC, 
       CASE prayer_type 
         WHEN 'fajr' THEN 1 
         WHEN 'dhuhr' THEN 2 
         WHEN 'asr' THEN 3 
         WHEN 'maghrib' THEN 4 
         WHEN 'isha' THEN 5 
       END`,
      [startDate, endDate]
    );

    res.json(prayers.map(p => ({
      id: p.id,
      date: p.date,
      prayerType: p.prayer_type,
      status: p.status,
      onTime: Boolean(p.on_time),
      withJamaah: Boolean(p.with_jamaah),
      sunnahBefore: Boolean(p.sunnah_before),
      sunnahAfter: Boolean(p.sunnah_after),
      notes: p.notes,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    })));
  } catch (error) {
    console.error('Failed to fetch prayer records:', error);
    res.status(500).json({ error: 'Unable to fetch prayer records' });
  }
});

/**
 * GET /api/islamic/prayers/today
 * Get today's prayer records
 */
router.get('/prayers/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const prayers = await allAsync(
      `SELECT * FROM prayer_records WHERE date = ?
       ORDER BY CASE prayer_type 
         WHEN 'fajr' THEN 1 
         WHEN 'dhuhr' THEN 2 
         WHEN 'asr' THEN 3 
         WHEN 'maghrib' THEN 4 
         WHEN 'isha' THEN 5 
       END`,
      [today]
    );

    // Build a complete response with all 5 prayers
    const prayerMap = {};
    prayers.forEach(p => {
      prayerMap[p.prayer_type] = {
        id: p.id,
        date: p.date,
        prayerType: p.prayer_type,
        status: p.status,
        onTime: Boolean(p.on_time),
        withJamaah: Boolean(p.with_jamaah),
        sunnahBefore: Boolean(p.sunnah_before),
        sunnahAfter: Boolean(p.sunnah_after),
        notes: p.notes,
      };
    });

    const result = PRAYER_TYPES.map(type => prayerMap[type] || {
      date: today,
      prayerType: type,
      status: 'pending',
      onTime: false,
      withJamaah: false,
      sunnahBefore: false,
      sunnahAfter: false,
      notes: '',
    });

    res.json(result);
  } catch (error) {
    console.error('Failed to fetch today\'s prayers:', error);
    res.status(500).json({ error: 'Unable to fetch today\'s prayers' });
  }
});

/**
 * POST /api/islamic/prayers/log
 * Log or update a prayer record
 */
router.post('/prayers/log', [
  body('date').notEmpty().withMessage('Date is required'),
  body('prayerType').isIn(PRAYER_TYPES).withMessage('Invalid prayer type'),
  body('status').isIn(['pending', 'prayed', 'missed', 'qada']).withMessage('Invalid status'),
  body('onTime').optional().isBoolean(),
  body('withJamaah').optional().isBoolean(),
  body('sunnahBefore').optional().isBoolean(),
  body('sunnahAfter').optional().isBoolean(),
  body('notes').optional().isString(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    date,
    prayerType,
    status,
    onTime = false,
    withJamaah = false,
    sunnahBefore = false,
    sunnahAfter = false,
    notes = '',
  } = req.body;

  try {
    await runAsync(
      `INSERT OR REPLACE INTO prayer_records 
       (date, prayer_type, status, on_time, with_jamaah, sunnah_before, sunnah_after, notes, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [date, prayerType, status, onTime ? 1 : 0, withJamaah ? 1 : 0, sunnahBefore ? 1 : 0, sunnahAfter ? 1 : 0, notes]
    );

    // If prayer was missed, optionally create a qada entry
    if (status === 'missed') {
      const existingQada = await getAsync(
        'SELECT id FROM qada_prayers WHERE prayer_type = ? AND original_date = ?',
        [prayerType, date]
      );
      
      if (!existingQada) {
        await runAsync(
          `INSERT INTO qada_prayers (prayer_type, original_date, status, priority)
           VALUES (?, ?, 'pending', 1)`,
          [prayerType, date]
        );
      }
    }

    res.json({ message: 'Prayer logged successfully', date, prayerType, status });
  } catch (error) {
    console.error('Failed to log prayer:', error);
    res.status(500).json({ error: 'Unable to log prayer', details: error.message });
  }
});

/**
 * GET /api/islamic/prayers/summary
 * Get prayer summary statistics
 */
router.get('/prayers/summary', [
  query('startDate').optional(),
  query('endDate').optional(),
], async (req, res) => {
  try {
    const today = new Date();
    const startDate = req.query.startDate || new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const endDate = req.query.endDate || today.toISOString().split('T')[0];

    const prayers = await allAsync(
      `SELECT prayer_type, status, on_time, with_jamaah 
       FROM prayer_records 
       WHERE date >= ? AND date <= ?`,
      [startDate, endDate]
    );

    const summary = {
      total: prayers.length,
      prayed: prayers.filter(p => p.status === 'prayed').length,
      missed: prayers.filter(p => p.status === 'missed').length,
      onTime: prayers.filter(p => p.on_time).length,
      withJamaah: prayers.filter(p => p.with_jamaah).length,
      byPrayer: {},
    };

    PRAYER_TYPES.forEach(type => {
      const typePrayers = prayers.filter(p => p.prayer_type === type);
      summary.byPrayer[type] = {
        total: typePrayers.length,
        prayed: typePrayers.filter(p => p.status === 'prayed').length,
        missed: typePrayers.filter(p => p.status === 'missed').length,
      };
    });

    res.json(summary);
  } catch (error) {
    console.error('Failed to fetch prayer summary:', error);
    res.status(500).json({ error: 'Unable to fetch prayer summary' });
  }
});

/**
 * GET /api/islamic/qada
 * Get qada (missed) prayers list
 */
router.get('/qada', async (req, res) => {
  try {
    const qadaPrayers = await allAsync(
      `SELECT * FROM qada_prayers 
       WHERE status = 'pending' 
       ORDER BY priority DESC, original_date ASC`
    );

    res.json(qadaPrayers.map(q => ({
      id: q.id,
      prayerType: q.prayer_type,
      originalDate: q.original_date,
      status: q.status,
      completedDate: q.completed_date,
      priority: q.priority,
      notes: q.notes,
      createdAt: q.created_at,
    })));
  } catch (error) {
    console.error('Failed to fetch qada prayers:', error);
    res.status(500).json({ error: 'Unable to fetch qada prayers' });
  }
});

/**
 * POST /api/islamic/qada/:id/complete
 * Mark a qada prayer as completed
 */
router.post('/qada/:id/complete', [param('id').isInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    await runAsync(
      `UPDATE qada_prayers SET status = 'completed', completed_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [today, req.params.id]
    );

    res.json({ message: 'Qada prayer marked as completed' });
  } catch (error) {
    console.error('Failed to complete qada prayer:', error);
    res.status(500).json({ error: 'Unable to complete qada prayer' });
  }
});

/**
 * GET /api/islamic/quran
 * Get Quran recitation logs
 */
router.get('/quran', [
  query('startDate').optional(),
  query('endDate').optional(),
], async (req, res) => {
  try {
    const today = new Date();
    const startDate = req.query.startDate || new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const endDate = req.query.endDate || today.toISOString().split('T')[0];

    const logs = await allAsync(
      `SELECT * FROM quran_logs 
       WHERE date >= ? AND date <= ?
       ORDER BY date DESC, created_at DESC`,
      [startDate, endDate]
    );

    res.json(logs.map(l => ({
      id: l.id,
      date: l.date,
      recitationType: l.recitation_type,
      surahStart: l.surah_start,
      surahEnd: l.surah_end,
      ayahStart: l.ayah_start,
      ayahEnd: l.ayah_end,
      juz: l.juz,
      pages: l.pages,
      durationMinutes: l.duration_minutes,
      notes: l.notes,
      createdAt: l.created_at,
    })));
  } catch (error) {
    console.error('Failed to fetch Quran logs:', error);
    res.status(500).json({ error: 'Unable to fetch Quran logs' });
  }
});

/**
 * POST /api/islamic/quran
 * Log Quran recitation
 */
router.post('/quran', [
  body('date').notEmpty().withMessage('Date is required'),
  body('recitationType').optional().isIn(['tilawah', 'tafsir', 'hifz', 'muraja']),
  body('surahStart').optional().isString(),
  body('surahEnd').optional().isString(),
  body('ayahStart').optional().isInt({ min: 1 }),
  body('ayahEnd').optional().isInt({ min: 1 }),
  body('juz').optional().isInt({ min: 1, max: 30 }),
  body('pages').optional().isFloat({ min: 0 }),
  body('durationMinutes').optional().isInt({ min: 0 }),
  body('notes').optional().isString(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    date,
    recitationType = 'tilawah',
    surahStart,
    surahEnd,
    ayahStart,
    ayahEnd,
    juz,
    pages,
    durationMinutes,
    notes = '',
  } = req.body;

  try {
    const result = await runAsync(
      `INSERT INTO quran_logs 
       (date, recitation_type, surah_start, surah_end, ayah_start, ayah_end, juz, pages, duration_minutes, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [date, recitationType, surahStart, surahEnd, ayahStart, ayahEnd, juz, pages, durationMinutes, notes]
    );

    res.status(201).json({ 
      id: result.lastID, 
      message: 'Quran recitation logged successfully' 
    });
  } catch (error) {
    console.error('Failed to log Quran recitation:', error);
    res.status(500).json({ error: 'Unable to log Quran recitation' });
  }
});

/**
 * GET /api/islamic/quran/summary
 * Get Quran recitation summary
 */
router.get('/quran/summary', async (req, res) => {
  try {
    const today = new Date();
    const thisMonth = today.toISOString().slice(0, 7);

    const monthlyStats = await getAsync(
      `SELECT 
         COUNT(*) as sessions,
         COALESCE(SUM(pages), 0) as totalPages,
         COALESCE(SUM(duration_minutes), 0) as totalMinutes
       FROM quran_logs 
       WHERE date LIKE ?`,
      [`${thisMonth}%`]
    );

    const byType = await allAsync(
      `SELECT recitation_type, COUNT(*) as count, COALESCE(SUM(duration_minutes), 0) as minutes
       FROM quran_logs 
       WHERE date LIKE ?
       GROUP BY recitation_type`,
      [`${thisMonth}%`]
    );

    res.json({
      month: thisMonth,
      sessions: monthlyStats.sessions,
      totalPages: monthlyStats.totalPages,
      totalMinutes: monthlyStats.totalMinutes,
      byType: byType.map(t => ({
        type: t.recitation_type,
        count: t.count,
        minutes: t.minutes,
      })),
    });
  } catch (error) {
    console.error('Failed to fetch Quran summary:', error);
    res.status(500).json({ error: 'Unable to fetch Quran summary' });
  }
});

/**
 * GET /api/islamic/dhikr
 * Get dhikr logs for a date
 */
router.get('/dhikr', [
  query('date').optional(),
], async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];

    const logs = await allAsync(
      `SELECT * FROM dhikr_logs WHERE date = ? ORDER BY dhikr_type`,
      [date]
    );

    res.json(logs.map(l => ({
      id: l.id,
      date: l.date,
      dhikrType: l.dhikr_type,
      count: l.count,
      target: l.target,
      completed: Boolean(l.completed),
      notes: l.notes,
    })));
  } catch (error) {
    console.error('Failed to fetch dhikr logs:', error);
    res.status(500).json({ error: 'Unable to fetch dhikr logs' });
  }
});

/**
 * POST /api/islamic/dhikr/log
 * Log or update dhikr count
 */
router.post('/dhikr/log', [
  body('date').notEmpty().withMessage('Date is required'),
  body('dhikrType').notEmpty().withMessage('Dhikr type is required'),
  body('count').optional().isInt({ min: 0 }),
  body('target').optional().isInt({ min: 0 }),
  body('completed').optional().isBoolean(),
  body('notes').optional().isString(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    date,
    dhikrType,
    count = 0,
    target = 0,
    completed = false,
    notes = '',
  } = req.body;

  try {
    await runAsync(
      `INSERT OR REPLACE INTO dhikr_logs 
       (date, dhikr_type, count, target, completed, notes, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [date, dhikrType, count, target, completed ? 1 : 0, notes]
    );

    res.json({ message: 'Dhikr logged successfully', date, dhikrType, count });
  } catch (error) {
    console.error('Failed to log dhikr:', error);
    res.status(500).json({ error: 'Unable to log dhikr' });
  }
});

/**
 * GET /api/islamic/fasting
 * Get fasting records
 */
router.get('/fasting', [
  query('startDate').optional(),
  query('endDate').optional(),
], async (req, res) => {
  try {
    const today = new Date();
    const startDate = req.query.startDate || new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const endDate = req.query.endDate || today.toISOString().split('T')[0];

    const records = await allAsync(
      `SELECT * FROM fasting_records 
       WHERE date >= ? AND date <= ?
       ORDER BY date DESC`,
      [startDate, endDate]
    );

    res.json(records.map(r => ({
      id: r.id,
      date: r.date,
      fastType: r.fast_type,
      status: r.status,
      notes: r.notes,
      createdAt: r.created_at,
    })));
  } catch (error) {
    console.error('Failed to fetch fasting records:', error);
    res.status(500).json({ error: 'Unable to fetch fasting records' });
  }
});

/**
 * POST /api/islamic/fasting
 * Log a fasting day
 */
router.post('/fasting', [
  body('date').notEmpty().withMessage('Date is required'),
  body('fastType').optional().isIn(['obligatory', 'voluntary', 'monday_thursday', 'white_days', 'arafah', 'ashura', 'shawwal', 'other']),
  body('status').optional().isIn(['planned', 'completed', 'missed', 'broken']),
  body('notes').optional().isString(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    date,
    fastType = 'voluntary',
    status = 'planned',
    notes = '',
  } = req.body;

  try {
    await runAsync(
      `INSERT OR REPLACE INTO fasting_records (date, fast_type, status, notes, updated_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [date, fastType, status, notes]
    );

    res.json({ message: 'Fasting record saved', date, fastType, status });
  } catch (error) {
    console.error('Failed to save fasting record:', error);
    res.status(500).json({ error: 'Unable to save fasting record' });
  }
});

/**
 * GET /api/islamic/jumuah
 * Get Jumu'ah checklist for a date
 */
router.get('/jumuah', [
  query('date').optional(),
], async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];

    const checklist = await getAsync(
      `SELECT * FROM jumuah_checklist WHERE date = ?`,
      [date]
    );

    if (checklist) {
      res.json({
        id: checklist.id,
        date: checklist.date,
        ghusl: Boolean(checklist.ghusl),
        earlyArrival: Boolean(checklist.early_arrival),
        sunnahPrayers: Boolean(checklist.sunnah_prayers),
        surahKahf: Boolean(checklist.surah_kahf),
        extraDua: Boolean(checklist.extra_dua),
        specialAdhkar: Boolean(checklist.special_adhkar),
        notes: checklist.notes,
      });
    } else {
      res.json({
        date,
        ghusl: false,
        earlyArrival: false,
        sunnahPrayers: false,
        surahKahf: false,
        extraDua: false,
        specialAdhkar: false,
        notes: '',
      });
    }
  } catch (error) {
    console.error('Failed to fetch Jumuah checklist:', error);
    res.status(500).json({ error: 'Unable to fetch Jumuah checklist' });
  }
});

/**
 * POST /api/islamic/jumuah
 * Save Jumu'ah checklist
 */
router.post('/jumuah', [
  body('date').notEmpty().withMessage('Date is required'),
  body('ghusl').optional().isBoolean(),
  body('earlyArrival').optional().isBoolean(),
  body('sunnahPrayers').optional().isBoolean(),
  body('surahKahf').optional().isBoolean(),
  body('extraDua').optional().isBoolean(),
  body('specialAdhkar').optional().isBoolean(),
  body('notes').optional().isString(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    date,
    ghusl = false,
    earlyArrival = false,
    sunnahPrayers = false,
    surahKahf = false,
    extraDua = false,
    specialAdhkar = false,
    notes = '',
  } = req.body;

  try {
    await runAsync(
      `INSERT OR REPLACE INTO jumuah_checklist 
       (date, ghusl, early_arrival, sunnah_prayers, surah_kahf, extra_dua, special_adhkar, notes, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [date, ghusl ? 1 : 0, earlyArrival ? 1 : 0, sunnahPrayers ? 1 : 0, surahKahf ? 1 : 0, extraDua ? 1 : 0, specialAdhkar ? 1 : 0, notes]
    );

    res.json({ message: 'Jumuah checklist saved', date });
  } catch (error) {
    console.error('Failed to save Jumuah checklist:', error);
    res.status(500).json({ error: 'Unable to save Jumuah checklist' });
  }
});

/**
 * GET /api/islamic/dua
 * Get dua journal entries
 */
router.get('/dua', [
  query('category').optional(),
  query('status').optional(),
], async (req, res) => {
  try {
    let query = 'SELECT * FROM dua_journal WHERE 1=1';
    const params = [];

    if (req.query.category) {
      query += ' AND category = ?';
      params.push(req.query.category);
    }
    if (req.query.status) {
      query += ' AND status = ?';
      params.push(req.query.status);
    }

    query += ' ORDER BY created_at DESC';

    const duas = await allAsync(query, params);

    res.json(duas.map(d => ({
      id: d.id,
      title: d.title,
      duaText: d.dua_text,
      category: d.category,
      isRecurring: Boolean(d.is_recurring),
      status: d.status,
      dateLogged: d.date_logged,
      dateAnswered: d.date_answered,
      notes: d.notes,
      createdAt: d.created_at,
    })));
  } catch (error) {
    console.error('Failed to fetch dua journal:', error);
    res.status(500).json({ error: 'Unable to fetch dua journal' });
  }
});

/**
 * POST /api/islamic/dua
 * Add a dua to the journal
 */
router.post('/dua', [
  body('title').notEmpty().withMessage('Title is required'),
  body('duaText').optional().isString(),
  body('category').optional().isIn(['quran', 'sunnah', 'personal', 'other']),
  body('isRecurring').optional().isBoolean(),
  body('notes').optional().isString(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    title,
    duaText = '',
    category = 'personal',
    isRecurring = false,
    notes = '',
  } = req.body;

  const today = new Date().toISOString().split('T')[0];

  try {
    const result = await runAsync(
      `INSERT INTO dua_journal (title, dua_text, category, is_recurring, date_logged, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, duaText, category, isRecurring ? 1 : 0, today, notes]
    );

    res.status(201).json({ id: result.lastID, message: 'Dua added to journal' });
  } catch (error) {
    console.error('Failed to add dua:', error);
    res.status(500).json({ error: 'Unable to add dua' });
  }
});

/**
 * PATCH /api/islamic/dua/:id/answered
 * Mark a dua as answered
 */
router.patch('/dua/:id/answered', [param('id').isInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    await runAsync(
      `UPDATE dua_journal SET status = 'answered', date_answered = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [today, req.params.id]
    );

    res.json({ message: 'Dua marked as answered' });
  } catch (error) {
    console.error('Failed to update dua:', error);
    res.status(500).json({ error: 'Unable to update dua' });
  }
});

/**
 * GET /api/islamic/reflection
 * Get spiritual reflection for a date
 */
router.get('/reflection', [
  query('date').optional(),
], async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];

    const reflection = await getAsync(
      `SELECT * FROM spiritual_reflections WHERE date = ?`,
      [date]
    );

    if (reflection) {
      res.json({
        id: reflection.id,
        date: reflection.date,
        prayerFocus: reflection.prayer_focus,
        gratitude: reflection.gratitude,
        improvements: reflection.improvements,
        keyInsights: reflection.key_insights,
      });
    } else {
      res.json({
        date,
        prayerFocus: '',
        gratitude: '',
        improvements: '',
        keyInsights: '',
      });
    }
  } catch (error) {
    console.error('Failed to fetch reflection:', error);
    res.status(500).json({ error: 'Unable to fetch reflection' });
  }
});

/**
 * POST /api/islamic/reflection
 * Save spiritual reflection
 */
router.post('/reflection', [
  body('date').notEmpty().withMessage('Date is required'),
  body('prayerFocus').optional().isString(),
  body('gratitude').optional().isString(),
  body('improvements').optional().isString(),
  body('keyInsights').optional().isString(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    date,
    prayerFocus = '',
    gratitude = '',
    improvements = '',
    keyInsights = '',
  } = req.body;

  try {
    await runAsync(
      `INSERT OR REPLACE INTO spiritual_reflections 
       (date, prayer_focus, gratitude, improvements, key_insights, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [date, prayerFocus, gratitude, improvements, keyInsights]
    );

    res.json({ message: 'Reflection saved', date });
  } catch (error) {
    console.error('Failed to save reflection:', error);
    res.status(500).json({ error: 'Unable to save reflection' });
  }
});

/**
 * GET /api/islamic/dashboard
 * Get comprehensive Islamic dashboard data for today
 */
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date().getDay();

    // Get today's prayers
    const prayers = await allAsync(
      `SELECT * FROM prayer_records WHERE date = ?`,
      [today]
    );

    const prayerStatus = {};
    PRAYER_TYPES.forEach(type => {
      const prayer = prayers.find(p => p.prayer_type === type);
      prayerStatus[type] = prayer ? {
        status: prayer.status,
        onTime: Boolean(prayer.on_time),
        withJamaah: Boolean(prayer.with_jamaah),
      } : { status: 'pending', onTime: false, withJamaah: false };
    });

    // Get today's dhikr
    const dhikr = await allAsync(
      `SELECT * FROM dhikr_logs WHERE date = ?`,
      [today]
    );

    // Get today's Quran recitation
    const quranToday = await getAsync(
      `SELECT COALESCE(SUM(pages), 0) as pages, COALESCE(SUM(duration_minutes), 0) as minutes
       FROM quran_logs WHERE date = ?`,
      [today]
    );

    // Get pending qada prayers count
    const qadaCount = await getAsync(
      `SELECT COUNT(*) as count FROM qada_prayers WHERE status = 'pending'`
    );

    // Get fasting status for today
    const fasting = await getAsync(
      `SELECT * FROM fasting_records WHERE date = ?`,
      [today]
    );

    // Get Jumu'ah checklist if it's Friday
    let jumuahChecklist = null;
    if (dayOfWeek === 5) {
      jumuahChecklist = await getAsync(
        `SELECT * FROM jumuah_checklist WHERE date = ?`,
        [today]
      );
    }

    // Calculate prayer completion percentage
    const prayedCount = Object.values(prayerStatus).filter(p => p.status === 'prayed').length;
    const prayerCompletion = Math.round((prayedCount / 5) * 100);

    res.json({
      date: today,
      // Hijri date conversion would require an external library or calculation
      // Future enhancement: integrate with a Hijri calendar library like hijri-js or moment-hijri
      hijriDate: null,
      prayers: prayerStatus,
      prayerCompletion,
      dhikr: dhikr.map(d => ({
        type: d.dhikr_type,
        count: d.count,
        target: d.target,
        completed: Boolean(d.completed),
      })),
      quran: {
        pagesRead: quranToday.pages,
        minutesSpent: quranToday.minutes,
      },
      qadaPending: qadaCount.count,
      fasting: fasting ? {
        type: fasting.fast_type,
        status: fasting.status,
      } : null,
      isFriday: dayOfWeek === 5,
      jumuahChecklist: jumuahChecklist ? {
        ghusl: Boolean(jumuahChecklist.ghusl),
        earlyArrival: Boolean(jumuahChecklist.early_arrival),
        sunnahPrayers: Boolean(jumuahChecklist.sunnah_prayers),
        surahKahf: Boolean(jumuahChecklist.surah_kahf),
        extraDua: Boolean(jumuahChecklist.extra_dua),
        specialAdhkar: Boolean(jumuahChecklist.special_adhkar),
      } : null,
    });
  } catch (error) {
    console.error('Failed to fetch Islamic dashboard:', error);
    res.status(500).json({ error: 'Unable to fetch dashboard data' });
  }
});

/**
 * GET /api/islamic/settings
 * Get Islamic settings for the user
 */
router.get('/settings', async (req, res) => {
  try {
    // For now, return default settings since we don't have user auth in this context
    const settings = await getAsync(
      `SELECT * FROM islamic_settings LIMIT 1`
    );

    if (settings) {
      res.json({
        calculationMethod: settings.calculation_method,
        latitude: settings.latitude,
        longitude: settings.longitude,
        timezone: settings.timezone,
        notificationsEnabled: Boolean(settings.notifications_enabled),
        reminderMinutes: settings.reminder_minutes,
      });
    } else {
      res.json({
        calculationMethod: 'MWL',
        latitude: null,
        longitude: null,
        timezone: null,
        notificationsEnabled: true,
        reminderMinutes: 15,
      });
    }
  } catch (error) {
    console.error('Failed to fetch Islamic settings:', error);
    res.status(500).json({ error: 'Unable to fetch settings' });
  }
});

/**
 * POST /api/islamic/settings
 * Save Islamic settings
 */
router.post('/settings', [
  body('calculationMethod').optional().isString(),
  body('latitude').optional().isFloat({ min: -90, max: 90 }),
  body('longitude').optional().isFloat({ min: -180, max: 180 }),
  body('timezone').optional().isString(),
  body('notificationsEnabled').optional().isBoolean(),
  body('reminderMinutes').optional().isInt({ min: 0, max: 60 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    calculationMethod = 'MWL',
    latitude,
    longitude,
    timezone,
    notificationsEnabled = true,
    reminderMinutes = 15,
  } = req.body;

  try {
    // Upsert settings using id=1 for single-user mode
    // Note: This application currently operates in single-user mode.
    // For multi-user support, this should be updated to use user authentication
    // and store settings per user_id instead of a fixed id.
    await runAsync(
      `INSERT OR REPLACE INTO islamic_settings 
       (id, calculation_method, latitude, longitude, timezone, notifications_enabled, reminder_minutes, updated_at)
       VALUES (1, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [calculationMethod, latitude, longitude, timezone, notificationsEnabled ? 1 : 0, reminderMinutes]
    );

    res.json({ message: 'Islamic settings saved' });
  } catch (error) {
    console.error('Failed to save Islamic settings:', error);
    res.status(500).json({ error: 'Unable to save settings' });
  }
});

export = router;
