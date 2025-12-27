// @ts-nocheck
/**
 * @fileoverview Routes for Thought Organizer (Mental Clarity System).
 * Helps users organize thoughts, reduce overthinking, and gain clarity.
 * @module routes/thoughts
 */

import express from 'express';
import { body, validationResult, param } from 'express-validator';
import { runAsync, allAsync, getAsync } from '../utils/database';
import { randomUUID } from 'crypto';

const router = express.Router();

/**
 * Initialize thoughts tables
 */
const initThoughtsTable = async () => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS thoughts (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      category TEXT NOT NULL,
      source TEXT,
      related_to TEXT,
      action_extracted TEXT,
      is_processed INTEGER DEFAULT 0,
      priority TEXT DEFAULT 'medium',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS thought_sessions (
      id TEXT PRIMARY KEY,
      title TEXT,
      type TEXT DEFAULT 'brain_dump',
      notes TEXT,
      reflection TEXT,
      clarity_rating INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    )
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS thought_session_items (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      thought_id TEXT NOT NULL,
      position INTEGER DEFAULT 0,
      FOREIGN KEY (session_id) REFERENCES thought_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (thought_id) REFERENCES thoughts(id) ON DELETE CASCADE
    )
  `);
};

// Initialize table on module load
initThoughtsTable().catch(console.error);

/**
 * Thought categories as defined in requirements
 */
const THOUGHT_CATEGORIES = ['facts', 'interpretations', 'emotions', 'assumptions', 'actions', 'questions'];

/**
 * Guided reflection questions for each category
 */
const REFLECTION_QUESTIONS = {
  facts: [
    'What exactly happened?',
    'What are the undeniable facts in this situation?',
    'What do I know for certain?'
  ],
  interpretations: [
    'What am I assuming about this situation?',
    'How else could I interpret this?',
    'What meaning am I adding to the facts?'
  ],
  emotions: [
    'What am I feeling right now?',
    'Why might I be feeling this way?',
    'What triggered this emotion?'
  ],
  assumptions: [
    'What am I taking for granted here?',
    'What if the opposite were true?',
    'What evidence do I have for this assumption?'
  ],
  actions: [
    'What can I do about this?',
    'What is the next step I can take?',
    'What would I do if I knew I couldn\'t fail?'
  ],
  questions: [
    'What do I still need to find out?',
    'Who can help me with this?',
    'What would I advise a friend in this situation?'
  ]
};

/**
 * GET /api/thoughts
 * Get all thoughts with optional filtering
 */
router.get('/', async (req, res) => {
  try {
    const { category, processed, limit = 50, offset = 0 } = req.query;
    
    let whereClause = '1=1';
    const params: any[] = [];
    
    if (category && THOUGHT_CATEGORIES.includes(category as string)) {
      whereClause += ' AND category = ?';
      params.push(category);
    }
    
    if (processed !== undefined) {
      whereClause += ' AND is_processed = ?';
      params.push(processed === 'true' ? 1 : 0);
    }
    
    params.push(parseInt(limit as string));
    params.push(parseInt(offset as string));
    
    const thoughts = await allAsync(
      `SELECT * FROM thoughts WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      params
    );

    res.json(thoughts);
  } catch (error) {
    console.error('Error fetching thoughts:', error);
    res.status(500).json({ error: 'Failed to fetch thoughts' });
  }
});

/**
 * GET /api/thoughts/categories
 * Get available thought categories with reflection questions
 */
router.get('/categories', (req, res) => {
  res.json({
    categories: THOUGHT_CATEGORIES,
    questions: REFLECTION_QUESTIONS
  });
});

/**
 * GET /api/thoughts/stats
 * Get thought statistics by category
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await allAsync(`
      SELECT 
        category,
        COUNT(*) as count,
        SUM(CASE WHEN is_processed = 1 THEN 1 ELSE 0 END) as processed
      FROM thoughts
      GROUP BY category
    `);

    const totalThoughts = await getAsync('SELECT COUNT(*) as total FROM thoughts');
    const unprocessed = await getAsync('SELECT COUNT(*) as count FROM thoughts WHERE is_processed = 0');

    res.json({
      byCategory: stats,
      total: totalThoughts?.total || 0,
      unprocessed: unprocessed?.count || 0
    });
  } catch (error) {
    console.error('Error fetching thought stats:', error);
    res.status(500).json({ error: 'Failed to fetch thought statistics' });
  }
});

/**
 * POST /api/thoughts
 * Create a new thought
 */
router.post('/', [
  body('content').notEmpty().withMessage('Content is required'),
  body('category').isIn(THOUGHT_CATEGORIES).withMessage('Invalid category')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { content, category, source, related_to, priority = 'medium' } = req.body;
    const id = randomUUID();

    await runAsync(
      `INSERT INTO thoughts (id, content, category, source, related_to, priority) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, content, category, source, related_to, priority]
    );

    const thought = await getAsync('SELECT * FROM thoughts WHERE id = ?', [id]);
    res.status(201).json(thought);
  } catch (error) {
    console.error('Error creating thought:', error);
    res.status(500).json({ error: 'Failed to create thought' });
  }
});

/**
 * PUT /api/thoughts/:id
 * Update a thought
 */
router.put('/:id', [
  param('id').notEmpty()
], async (req, res) => {
  try {
    const { id } = req.params;
    const { content, category, is_processed, action_extracted, priority } = req.body;

    const existing = await getAsync('SELECT * FROM thoughts WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Thought not found' });
    }

    await runAsync(
      `UPDATE thoughts SET 
        content = COALESCE(?, content),
        category = COALESCE(?, category),
        is_processed = COALESCE(?, is_processed),
        action_extracted = COALESCE(?, action_extracted),
        priority = COALESCE(?, priority),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [content, category, is_processed, action_extracted, priority, id]
    );

    const thought = await getAsync('SELECT * FROM thoughts WHERE id = ?', [id]);
    res.json(thought);
  } catch (error) {
    console.error('Error updating thought:', error);
    res.status(500).json({ error: 'Failed to update thought' });
  }
});

/**
 * DELETE /api/thoughts/:id
 * Delete a thought
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const existing = await getAsync('SELECT * FROM thoughts WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Thought not found' });
    }

    await runAsync('DELETE FROM thoughts WHERE id = ?', [id]);
    res.json({ message: 'Thought deleted successfully' });
  } catch (error) {
    console.error('Error deleting thought:', error);
    res.status(500).json({ error: 'Failed to delete thought' });
  }
});

/**
 * POST /api/thoughts/brain-dump
 * Quick brain dump - capture multiple thoughts at once
 */
router.post('/brain-dump', [
  body('content').notEmpty().withMessage('Content is required')
], async (req, res) => {
  try {
    const { content, sessionTitle } = req.body;
    
    // Create a session
    const sessionId = randomUUID();
    await runAsync(
      `INSERT INTO thought_sessions (id, title, type) VALUES (?, ?, 'brain_dump')`,
      [sessionId, sessionTitle || `Brain Dump ${new Date().toLocaleDateString()}`]
    );

    // Split content into lines and create thoughts
    const lines = content.split('\n').filter((line: string) => line.trim());
    const thoughts = [];

    for (let i = 0; i < lines.length; i++) {
      const thoughtId = randomUUID();
      await runAsync(
        `INSERT INTO thoughts (id, content, category) VALUES (?, ?, 'facts')`,
        [thoughtId, lines[i].trim(), 'facts']
      );
      
      await runAsync(
        `INSERT INTO thought_session_items (id, session_id, thought_id, position) VALUES (?, ?, ?, ?)`,
        [randomUUID(), sessionId, thoughtId, i]
      );
      
      thoughts.push({ id: thoughtId, content: lines[i].trim() });
    }

    res.status(201).json({
      session: { id: sessionId, title: sessionTitle },
      thoughts,
      count: thoughts.length
    });
  } catch (error) {
    console.error('Error during brain dump:', error);
    res.status(500).json({ error: 'Failed to process brain dump' });
  }
});

/**
 * GET /api/thoughts/sessions
 * Get all thought sessions
 */
router.get('/sessions', async (req, res) => {
  try {
    const sessions = await allAsync(
      `SELECT 
        ts.*,
        COUNT(tsi.id) as thought_count
      FROM thought_sessions ts
      LEFT JOIN thought_session_items tsi ON ts.id = tsi.session_id
      GROUP BY ts.id
      ORDER BY ts.created_at DESC`
    );
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

/**
 * GET /api/thoughts/sessions/:id
 * Get a specific session with its thoughts
 */
router.get('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const session = await getAsync('SELECT * FROM thought_sessions WHERE id = ?', [id]);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const thoughts = await allAsync(
      `SELECT t.* FROM thoughts t
       INNER JOIN thought_session_items tsi ON t.id = tsi.thought_id
       WHERE tsi.session_id = ?
       ORDER BY tsi.position`,
      [id]
    );

    res.json({ ...session, thoughts });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

/**
 * PUT /api/thoughts/sessions/:id/complete
 * Complete a reflection session with clarity rating
 */
router.put('/sessions/:id/complete', [
  body('reflection').optional().isString(),
  body('clarity_rating').optional().isInt({ min: 1, max: 10 })
], async (req, res) => {
  try {
    const { id } = req.params;
    const { reflection, clarity_rating } = req.body;

    await runAsync(
      `UPDATE thought_sessions SET 
        reflection = ?,
        clarity_rating = ?,
        completed_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [reflection, clarity_rating, id]
    );

    const session = await getAsync('SELECT * FROM thought_sessions WHERE id = ?', [id]);
    res.json(session);
  } catch (error) {
    console.error('Error completing session:', error);
    res.status(500).json({ error: 'Failed to complete session' });
  }
});

export default router;
