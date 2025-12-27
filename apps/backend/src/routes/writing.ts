// @ts-nocheck
/**
 * @fileoverview Routes for Writing & Research Hub.
 * Provides article lifecycle management and research organization.
 * @module routes/writing
 */

import express from 'express';
import { body, validationResult, param } from 'express-validator';
import { runAsync, allAsync, getAsync } from '../utils/database';
import { randomUUID } from 'crypto';

const router = express.Router();

/**
 * Initialize writing tables
 */
const initWritingTables = async () => {
  // Articles/Writing pieces
  await runAsync(`
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT,
      excerpt TEXT,
      status TEXT DEFAULT 'idea',
      type TEXT DEFAULT 'article',
      word_count INTEGER DEFAULT 0,
      target_word_count INTEGER,
      category TEXT,
      tags TEXT,
      publish_date DATETIME,
      is_archived INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Writing goals
  await runAsync(`
    CREATE TABLE IF NOT EXISTS writing_goals (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      target INTEGER NOT NULL,
      current INTEGER DEFAULT 0,
      period TEXT DEFAULT 'daily',
      start_date DATE,
      end_date DATE,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Writing sessions (for stats)
  await runAsync(`
    CREATE TABLE IF NOT EXISTS writing_sessions (
      id TEXT PRIMARY KEY,
      article_id TEXT,
      words_written INTEGER DEFAULT 0,
      duration_minutes INTEGER DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL
    )
  `);

  // Research items
  await runAsync(`
    CREATE TABLE IF NOT EXISTS research_items (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT DEFAULT 'link',
      url TEXT,
      content TEXT,
      summary TEXT,
      topic TEXT,
      status TEXT DEFAULT 'to_read',
      priority TEXT DEFAULT 'medium',
      tags TEXT,
      is_archived INTEGER DEFAULT 0,
      read_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Research notes
  await runAsync(`
    CREATE TABLE IF NOT EXISTS research_notes (
      id TEXT PRIMARY KEY,
      research_id TEXT NOT NULL,
      content TEXT NOT NULL,
      highlight TEXT,
      page_number TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (research_id) REFERENCES research_items(id) ON DELETE CASCADE
    )
  `);

  // Inspiration board
  await runAsync(`
    CREATE TABLE IF NOT EXISTS inspiration_items (
      id TEXT PRIMARY KEY,
      type TEXT DEFAULT 'quote',
      content TEXT NOT NULL,
      source TEXT,
      url TEXT,
      image_url TEXT,
      tags TEXT,
      is_favorite INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

// Initialize tables
initWritingTables().catch(console.error);

/**
 * Article statuses (lifecycle)
 */
const ARTICLE_STATUSES = ['idea', 'research', 'outline', 'draft', 'editing', 'review', 'published', 'archived'];

// ============= ARTICLES =============

/**
 * GET /api/writing/articles
 * Get all articles with filtering
 */
router.get('/articles', async (req, res) => {
  try {
    const { status, type, archived, search, limit = 50, offset = 0 } = req.query;
    
    let whereClause = '1=1';
    const params: any[] = [];

    if (status && ARTICLE_STATUSES.includes(status as string)) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    if (type) {
      whereClause += ' AND type = ?';
      params.push(type);
    }

    if (archived !== undefined) {
      whereClause += ' AND is_archived = ?';
      params.push(archived === 'true' ? 1 : 0);
    } else {
      whereClause += ' AND is_archived = 0';
    }

    if (search) {
      whereClause += ' AND (title LIKE ? OR content LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    params.push(parseInt(limit as string), parseInt(offset as string));

    const articles = await allAsync(
      `SELECT * FROM articles WHERE ${whereClause} ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
      params
    );

    res.json(articles.map(a => ({
      ...a,
      tags: a.tags ? JSON.parse(a.tags) : []
    })));
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

/**
 * GET /api/writing/articles/lifecycle
 * Get article lifecycle stages
 */
router.get('/articles/lifecycle', (req, res) => {
  res.json({
    statuses: ARTICLE_STATUSES,
    descriptions: {
      idea: 'Initial concept or topic idea',
      research: 'Gathering information and sources',
      outline: 'Structuring the content',
      draft: 'Writing the first draft',
      editing: 'Revising and improving',
      review: 'Final review before publishing',
      published: 'Published and live',
      archived: 'Archived or retired'
    }
  });
});

/**
 * GET /api/writing/articles/:id
 * Get a specific article
 */
router.get('/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const article = await getAsync('SELECT * FROM articles WHERE id = ?', [id]);
    
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    res.json({
      ...article,
      tags: article.tags ? JSON.parse(article.tags) : []
    });
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

/**
 * POST /api/writing/articles
 * Create a new article
 */
router.post('/articles', [
  body('title').notEmpty().withMessage('Title is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      title, content, excerpt, status = 'idea', type = 'article',
      target_word_count, category, tags = []
    } = req.body;

    const id = randomUUID();
    const wordCount = content ? content.split(/\s+/).filter(Boolean).length : 0;

    await runAsync(
      `INSERT INTO articles (id, title, content, excerpt, status, type, word_count, target_word_count, category, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, title, content, excerpt, status, type, wordCount, target_word_count, category, JSON.stringify(tags)]
    );

    const article = await getAsync('SELECT * FROM articles WHERE id = ?', [id]);
    res.status(201).json({
      ...article,
      tags: tags
    });
  } catch (error) {
    console.error('Error creating article:', error);
    res.status(500).json({ error: 'Failed to create article' });
  }
});

/**
 * PUT /api/writing/articles/:id
 * Update an article
 */
router.put('/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, excerpt, status, type, target_word_count, category, tags, is_archived, publish_date } = req.body;

    const wordCount = content ? content.split(/\s+/).filter(Boolean).length : undefined;

    await runAsync(
      `UPDATE articles SET 
        title = COALESCE(?, title),
        content = COALESCE(?, content),
        excerpt = COALESCE(?, excerpt),
        status = COALESCE(?, status),
        type = COALESCE(?, type),
        word_count = COALESCE(?, word_count),
        target_word_count = COALESCE(?, target_word_count),
        category = COALESCE(?, category),
        tags = COALESCE(?, tags),
        is_archived = COALESCE(?, is_archived),
        publish_date = COALESCE(?, publish_date),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [title, content, excerpt, status, type, wordCount, target_word_count, category,
       tags ? JSON.stringify(tags) : null, is_archived, publish_date, id]
    );

    const article = await getAsync('SELECT * FROM articles WHERE id = ?', [id]);
    res.json({
      ...article,
      tags: article.tags ? JSON.parse(article.tags) : []
    });
  } catch (error) {
    console.error('Error updating article:', error);
    res.status(500).json({ error: 'Failed to update article' });
  }
});

/**
 * DELETE /api/writing/articles/:id
 * Delete an article
 */
router.delete('/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await runAsync('DELETE FROM articles WHERE id = ?', [id]);
    res.json({ message: 'Article deleted successfully' });
  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({ error: 'Failed to delete article' });
  }
});

// ============= WRITING GOALS =============

/**
 * GET /api/writing/goals
 * Get writing goals
 */
router.get('/goals', async (req, res) => {
  try {
    const goals = await allAsync(
      'SELECT * FROM writing_goals WHERE is_active = 1 ORDER BY created_at DESC'
    );
    res.json(goals);
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

/**
 * POST /api/writing/goals
 * Create a writing goal
 */
router.post('/goals', [
  body('type').notEmpty().withMessage('Type is required'),
  body('target').isInt({ min: 1 }).withMessage('Target must be a positive integer')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { type, target, period = 'daily', start_date, end_date } = req.body;
    const id = randomUUID();

    await runAsync(
      `INSERT INTO writing_goals (id, type, target, period, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, type, target, period, start_date, end_date]
    );

    const goal = await getAsync('SELECT * FROM writing_goals WHERE id = ?', [id]);
    res.status(201).json(goal);
  } catch (error) {
    console.error('Error creating goal:', error);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

// ============= WRITING STATS =============

/**
 * GET /api/writing/stats
 * Get writing statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    // Total articles by status
    const byStatus = await allAsync(
      `SELECT status, COUNT(*) as count FROM articles WHERE is_archived = 0 GROUP BY status`
    );

    // Total words written
    const totalWords = await getAsync(
      `SELECT SUM(word_count) as total FROM articles WHERE is_archived = 0`
    );

    // Words written in period
    const recentWords = await getAsync(
      `SELECT SUM(words_written) as total FROM writing_sessions 
       WHERE created_at >= datetime('now', '-${parseInt(days as string)} days')`
    );

    // Sessions count
    const sessionsCount = await getAsync(
      `SELECT COUNT(*) as count, SUM(duration_minutes) as total_minutes FROM writing_sessions 
       WHERE created_at >= datetime('now', '-${parseInt(days as string)} days')`
    );

    // Daily breakdown
    const dailyStats = await allAsync(
      `SELECT DATE(created_at) as date, SUM(words_written) as words, COUNT(*) as sessions
       FROM writing_sessions 
       WHERE created_at >= datetime('now', '-${parseInt(days as string)} days')
       GROUP BY DATE(created_at)
       ORDER BY date`
    );

    res.json({
      totalArticles: byStatus.reduce((sum, s) => sum + s.count, 0),
      byStatus,
      totalWords: totalWords?.total || 0,
      recentWords: recentWords?.total || 0,
      totalSessions: sessionsCount?.count || 0,
      totalMinutes: sessionsCount?.total_minutes || 0,
      dailyStats
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * POST /api/writing/sessions
 * Log a writing session
 */
router.post('/sessions', [
  body('words_written').isInt({ min: 0 }).withMessage('Words written must be a non-negative integer')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { article_id, words_written, duration_minutes = 0, notes } = req.body;
    const id = randomUUID();

    await runAsync(
      `INSERT INTO writing_sessions (id, article_id, words_written, duration_minutes, notes) VALUES (?, ?, ?, ?, ?)`,
      [id, article_id, words_written, duration_minutes, notes]
    );

    // Update active goals
    await runAsync(
      `UPDATE writing_goals SET current = current + ? WHERE type = 'words' AND is_active = 1`,
      [words_written]
    );

    const session = await getAsync('SELECT * FROM writing_sessions WHERE id = ?', [id]);
    res.status(201).json(session);
  } catch (error) {
    console.error('Error logging session:', error);
    res.status(500).json({ error: 'Failed to log session' });
  }
});

// ============= RESEARCH =============

/**
 * GET /api/writing/research
 * Get research items
 */
router.get('/research', async (req, res) => {
  try {
    const { status, topic, type, archived, limit = 50, offset = 0 } = req.query;
    
    let whereClause = '1=1';
    const params: any[] = [];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    if (topic) {
      whereClause += ' AND topic = ?';
      params.push(topic);
    }

    if (type) {
      whereClause += ' AND type = ?';
      params.push(type);
    }

    if (archived !== undefined) {
      whereClause += ' AND is_archived = ?';
      params.push(archived === 'true' ? 1 : 0);
    } else {
      whereClause += ' AND is_archived = 0';
    }

    params.push(parseInt(limit as string), parseInt(offset as string));

    const items = await allAsync(
      `SELECT * FROM research_items WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      params
    );

    res.json(items.map(item => ({
      ...item,
      tags: item.tags ? JSON.parse(item.tags) : []
    })));
  } catch (error) {
    console.error('Error fetching research:', error);
    res.status(500).json({ error: 'Failed to fetch research items' });
  }
});

/**
 * GET /api/writing/research/:id
 * Get a specific research item with notes
 */
router.get('/research/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const item = await getAsync('SELECT * FROM research_items WHERE id = ?', [id]);
    if (!item) {
      return res.status(404).json({ error: 'Research item not found' });
    }

    const notes = await allAsync(
      'SELECT * FROM research_notes WHERE research_id = ? ORDER BY created_at DESC',
      [id]
    );

    res.json({
      ...item,
      tags: item.tags ? JSON.parse(item.tags) : [],
      notes
    });
  } catch (error) {
    console.error('Error fetching research item:', error);
    res.status(500).json({ error: 'Failed to fetch research item' });
  }
});

/**
 * POST /api/writing/research
 * Create a research item
 */
router.post('/research', [
  body('title').notEmpty().withMessage('Title is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { title, type = 'link', url, content, summary, topic, status = 'to_read', priority = 'medium', tags = [] } = req.body;
    const id = randomUUID();

    await runAsync(
      `INSERT INTO research_items (id, title, type, url, content, summary, topic, status, priority, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, title, type, url, content, summary, topic, status, priority, JSON.stringify(tags)]
    );

    const item = await getAsync('SELECT * FROM research_items WHERE id = ?', [id]);
    res.status(201).json({
      ...item,
      tags: tags
    });
  } catch (error) {
    console.error('Error creating research item:', error);
    res.status(500).json({ error: 'Failed to create research item' });
  }
});

/**
 * PUT /api/writing/research/:id
 * Update a research item
 */
router.put('/research/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, type, url, content, summary, topic, status, priority, tags, is_archived } = req.body;

    const readAt = status === 'read' ? 'CURRENT_TIMESTAMP' : null;

    await runAsync(
      `UPDATE research_items SET 
        title = COALESCE(?, title),
        type = COALESCE(?, type),
        url = COALESCE(?, url),
        content = COALESCE(?, content),
        summary = COALESCE(?, summary),
        topic = COALESCE(?, topic),
        status = COALESCE(?, status),
        priority = COALESCE(?, priority),
        tags = COALESCE(?, tags),
        is_archived = COALESCE(?, is_archived),
        read_at = ${status === 'read' ? 'CURRENT_TIMESTAMP' : 'read_at'},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [title, type, url, content, summary, topic, status, priority, tags ? JSON.stringify(tags) : null, is_archived, id]
    );

    const item = await getAsync('SELECT * FROM research_items WHERE id = ?', [id]);
    res.json({
      ...item,
      tags: item.tags ? JSON.parse(item.tags) : []
    });
  } catch (error) {
    console.error('Error updating research item:', error);
    res.status(500).json({ error: 'Failed to update research item' });
  }
});

/**
 * DELETE /api/writing/research/:id
 * Delete a research item
 */
router.delete('/research/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await runAsync('DELETE FROM research_items WHERE id = ?', [id]);
    res.json({ message: 'Research item deleted successfully' });
  } catch (error) {
    console.error('Error deleting research item:', error);
    res.status(500).json({ error: 'Failed to delete research item' });
  }
});

/**
 * POST /api/writing/research/:id/notes
 * Add a note to research item
 */
router.post('/research/:id/notes', [
  body('content').notEmpty().withMessage('Content is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { content, highlight, page_number } = req.body;
    const noteId = randomUUID();

    await runAsync(
      `INSERT INTO research_notes (id, research_id, content, highlight, page_number) VALUES (?, ?, ?, ?, ?)`,
      [noteId, id, content, highlight, page_number]
    );

    const note = await getAsync('SELECT * FROM research_notes WHERE id = ?', [noteId]);
    res.status(201).json(note);
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

// ============= INSPIRATION =============

/**
 * GET /api/writing/inspiration
 * Get inspiration items
 */
router.get('/inspiration', async (req, res) => {
  try {
    const { type, favorite, limit = 50, offset = 0 } = req.query;
    
    let whereClause = '1=1';
    const params: any[] = [];

    if (type) {
      whereClause += ' AND type = ?';
      params.push(type);
    }

    if (favorite === 'true') {
      whereClause += ' AND is_favorite = 1';
    }

    params.push(parseInt(limit as string), parseInt(offset as string));

    const items = await allAsync(
      `SELECT * FROM inspiration_items WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      params
    );

    res.json(items.map(item => ({
      ...item,
      tags: item.tags ? JSON.parse(item.tags) : []
    })));
  } catch (error) {
    console.error('Error fetching inspiration:', error);
    res.status(500).json({ error: 'Failed to fetch inspiration items' });
  }
});

/**
 * POST /api/writing/inspiration
 * Add an inspiration item
 */
router.post('/inspiration', [
  body('content').notEmpty().withMessage('Content is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { type = 'quote', content, source, url, image_url, tags = [] } = req.body;
    const id = randomUUID();

    await runAsync(
      `INSERT INTO inspiration_items (id, type, content, source, url, image_url, tags) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, type, content, source, url, image_url, JSON.stringify(tags)]
    );

    const item = await getAsync('SELECT * FROM inspiration_items WHERE id = ?', [id]);
    res.status(201).json({
      ...item,
      tags: tags
    });
  } catch (error) {
    console.error('Error adding inspiration:', error);
    res.status(500).json({ error: 'Failed to add inspiration item' });
  }
});

/**
 * PUT /api/writing/inspiration/:id/favorite
 * Toggle favorite status
 */
router.put('/inspiration/:id/favorite', async (req, res) => {
  try {
    const { id } = req.params;
    
    await runAsync(
      'UPDATE inspiration_items SET is_favorite = NOT is_favorite WHERE id = ?',
      [id]
    );

    const item = await getAsync('SELECT * FROM inspiration_items WHERE id = ?', [id]);
    res.json(item);
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({ error: 'Failed to toggle favorite' });
  }
});

/**
 * DELETE /api/writing/inspiration/:id
 * Delete an inspiration item
 */
router.delete('/inspiration/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await runAsync('DELETE FROM inspiration_items WHERE id = ?', [id]);
    res.json({ message: 'Inspiration item deleted successfully' });
  } catch (error) {
    console.error('Error deleting inspiration:', error);
    res.status(500).json({ error: 'Failed to delete inspiration item' });
  }
});

export default router;
