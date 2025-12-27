// @ts-nocheck
/**
 * @fileoverview Routes for Supporting Utilities.
 * Provides Quotes Collection, Word Collection, and Sticky Notes.
 * @module routes/utilities
 */

import express from 'express';
import { body, validationResult, param } from 'express-validator';
import { runAsync, allAsync, getAsync } from '../utils/database';
import { randomUUID } from 'crypto';

const router = express.Router();

/**
 * Initialize utilities tables
 */
const initUtilitiesTables = async () => {
  // Quotes collection
  await runAsync(`
    CREATE TABLE IF NOT EXISTS quotes (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      author TEXT,
      source TEXT,
      category TEXT,
      tags TEXT,
      is_favorite INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Word collection (vocabulary tracker)
  await runAsync(`
    CREATE TABLE IF NOT EXISTS words (
      id TEXT PRIMARY KEY,
      word TEXT NOT NULL,
      definition TEXT,
      pronunciation TEXT,
      part_of_speech TEXT,
      example_sentence TEXT,
      origin TEXT,
      synonyms TEXT,
      antonyms TEXT,
      category TEXT,
      tags TEXT,
      is_learned INTEGER DEFAULT 0,
      review_count INTEGER DEFAULT 0,
      last_reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Sticky notes board
  await runAsync(`
    CREATE TABLE IF NOT EXISTS sticky_notes (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      color TEXT DEFAULT '#fef3c7',
      position_x INTEGER DEFAULT 0,
      position_y INTEGER DEFAULT 0,
      width INTEGER DEFAULT 200,
      height INTEGER DEFAULT 200,
      board_id TEXT,
      is_pinned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Sticky note boards
  await runAsync(`
    CREATE TABLE IF NOT EXISTS sticky_boards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      background_color TEXT DEFAULT '#f3f4f6',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

// Initialize tables
initUtilitiesTables().catch(console.error);

// ============= QUOTES =============

/**
 * GET /api/utilities/quotes
 * Get all quotes with filtering
 */
router.get('/quotes', async (req, res) => {
  try {
    const { category, author, favorite, search, limit = 50, offset = 0 } = req.query;
    
    let whereClause = '1=1';
    const params: any[] = [];

    if (category) {
      whereClause += ' AND category = ?';
      params.push(category);
    }

    if (author) {
      whereClause += ' AND author LIKE ?';
      params.push(`%${author}%`);
    }

    if (favorite === 'true') {
      whereClause += ' AND is_favorite = 1';
    }

    if (search) {
      whereClause += ' AND (content LIKE ? OR author LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    params.push(parseInt(limit as string), parseInt(offset as string));

    const quotes = await allAsync(
      `SELECT * FROM quotes WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      params
    );

    res.json(quotes.map(q => ({
      ...q,
      tags: q.tags ? JSON.parse(q.tags) : []
    })));
  } catch (error) {
    console.error('Error fetching quotes:', error);
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

/**
 * GET /api/utilities/quotes/random
 * Get a random quote
 */
router.get('/quotes/random', async (req, res) => {
  try {
    const { category } = req.query;
    let whereClause = '1=1';
    const params: any[] = [];

    if (category) {
      whereClause += ' AND category = ?';
      params.push(category);
    }

    const quote = await getAsync(
      `SELECT * FROM quotes WHERE ${whereClause} ORDER BY RANDOM() LIMIT 1`,
      params
    );

    if (!quote) {
      return res.status(404).json({ error: 'No quotes found' });
    }

    res.json({
      ...quote,
      tags: quote.tags ? JSON.parse(quote.tags) : []
    });
  } catch (error) {
    console.error('Error fetching random quote:', error);
    res.status(500).json({ error: 'Failed to fetch random quote' });
  }
});

/**
 * GET /api/utilities/quotes/categories
 * Get all quote categories
 */
router.get('/quotes/categories', async (req, res) => {
  try {
    const categories = await allAsync(
      `SELECT category, COUNT(*) as count FROM quotes WHERE category IS NOT NULL GROUP BY category ORDER BY count DESC`
    );
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * POST /api/utilities/quotes
 * Create a new quote
 */
router.post('/quotes', [
  body('content').notEmpty().withMessage('Content is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { content, author, source, category, tags = [] } = req.body;
    const id = randomUUID();

    await runAsync(
      `INSERT INTO quotes (id, content, author, source, category, tags) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, content, author, source, category, JSON.stringify(tags)]
    );

    const quote = await getAsync('SELECT * FROM quotes WHERE id = ?', [id]);
    res.status(201).json({
      ...quote,
      tags: tags
    });
  } catch (error) {
    console.error('Error creating quote:', error);
    res.status(500).json({ error: 'Failed to create quote' });
  }
});

/**
 * PUT /api/utilities/quotes/:id
 * Update a quote
 */
router.put('/quotes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, author, source, category, tags, is_favorite } = req.body;

    await runAsync(
      `UPDATE quotes SET 
        content = COALESCE(?, content),
        author = COALESCE(?, author),
        source = COALESCE(?, source),
        category = COALESCE(?, category),
        tags = COALESCE(?, tags),
        is_favorite = COALESCE(?, is_favorite)
      WHERE id = ?`,
      [content, author, source, category, tags ? JSON.stringify(tags) : null, is_favorite, id]
    );

    const quote = await getAsync('SELECT * FROM quotes WHERE id = ?', [id]);
    res.json({
      ...quote,
      tags: quote.tags ? JSON.parse(quote.tags) : []
    });
  } catch (error) {
    console.error('Error updating quote:', error);
    res.status(500).json({ error: 'Failed to update quote' });
  }
});

/**
 * PUT /api/utilities/quotes/:id/favorite
 * Toggle quote favorite status
 */
router.put('/quotes/:id/favorite', async (req, res) => {
  try {
    const { id } = req.params;
    
    await runAsync('UPDATE quotes SET is_favorite = NOT is_favorite WHERE id = ?', [id]);
    const quote = await getAsync('SELECT * FROM quotes WHERE id = ?', [id]);
    
    res.json(quote);
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({ error: 'Failed to toggle favorite' });
  }
});

/**
 * DELETE /api/utilities/quotes/:id
 * Delete a quote
 */
router.delete('/quotes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await runAsync('DELETE FROM quotes WHERE id = ?', [id]);
    res.json({ message: 'Quote deleted successfully' });
  } catch (error) {
    console.error('Error deleting quote:', error);
    res.status(500).json({ error: 'Failed to delete quote' });
  }
});

// ============= WORD COLLECTION =============

/**
 * GET /api/utilities/words
 * Get all words with filtering
 */
router.get('/words', async (req, res) => {
  try {
    const { category, learned, search, limit = 50, offset = 0 } = req.query;
    
    let whereClause = '1=1';
    const params: any[] = [];

    if (category) {
      whereClause += ' AND category = ?';
      params.push(category);
    }

    if (learned !== undefined) {
      whereClause += ' AND is_learned = ?';
      params.push(learned === 'true' ? 1 : 0);
    }

    if (search) {
      whereClause += ' AND (word LIKE ? OR definition LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    params.push(parseInt(limit as string), parseInt(offset as string));

    const words = await allAsync(
      `SELECT * FROM words WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      params
    );

    res.json(words.map(w => ({
      ...w,
      tags: w.tags ? JSON.parse(w.tags) : [],
      synonyms: w.synonyms ? JSON.parse(w.synonyms) : [],
      antonyms: w.antonyms ? JSON.parse(w.antonyms) : []
    })));
  } catch (error) {
    console.error('Error fetching words:', error);
    res.status(500).json({ error: 'Failed to fetch words' });
  }
});

/**
 * GET /api/utilities/words/review
 * Get words for review (spaced repetition style)
 */
router.get('/words/review', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Get words that need review (not learned, or haven't been reviewed recently)
    const words = await allAsync(
      `SELECT * FROM words 
       WHERE is_learned = 0 
       OR last_reviewed_at IS NULL 
       OR last_reviewed_at < datetime('now', '-1 day')
       ORDER BY review_count ASC, RANDOM()
       LIMIT ?`,
      [parseInt(limit as string)]
    );

    res.json(words.map(w => ({
      ...w,
      tags: w.tags ? JSON.parse(w.tags) : [],
      synonyms: w.synonyms ? JSON.parse(w.synonyms) : [],
      antonyms: w.antonyms ? JSON.parse(w.antonyms) : []
    })));
  } catch (error) {
    console.error('Error fetching review words:', error);
    res.status(500).json({ error: 'Failed to fetch review words' });
  }
});

/**
 * GET /api/utilities/words/stats
 * Get word learning statistics
 */
router.get('/words/stats', async (req, res) => {
  try {
    const total = await getAsync('SELECT COUNT(*) as count FROM words');
    const learned = await getAsync('SELECT COUNT(*) as count FROM words WHERE is_learned = 1');
    const reviewedToday = await getAsync(
      `SELECT COUNT(*) as count FROM words WHERE last_reviewed_at >= datetime('now', '-1 day')`
    );

    const byCategory = await allAsync(
      `SELECT category, COUNT(*) as count FROM words WHERE category IS NOT NULL GROUP BY category`
    );

    res.json({
      total: total?.count || 0,
      learned: learned?.count || 0,
      reviewedToday: reviewedToday?.count || 0,
      progress: total?.count ? Math.round((learned?.count / total?.count) * 100) : 0,
      byCategory
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * POST /api/utilities/words
 * Add a new word
 */
router.post('/words', [
  body('word').notEmpty().withMessage('Word is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      word, definition, pronunciation, part_of_speech, example_sentence,
      origin, synonyms = [], antonyms = [], category, tags = []
    } = req.body;
    
    const id = randomUUID();

    await runAsync(
      `INSERT INTO words (id, word, definition, pronunciation, part_of_speech, example_sentence, origin, synonyms, antonyms, category, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, word, definition, pronunciation, part_of_speech, example_sentence, origin,
       JSON.stringify(synonyms), JSON.stringify(antonyms), category, JSON.stringify(tags)]
    );

    const wordRecord = await getAsync('SELECT * FROM words WHERE id = ?', [id]);
    res.status(201).json({
      ...wordRecord,
      tags: tags,
      synonyms: synonyms,
      antonyms: antonyms
    });
  } catch (error) {
    console.error('Error adding word:', error);
    res.status(500).json({ error: 'Failed to add word' });
  }
});

/**
 * PUT /api/utilities/words/:id
 * Update a word
 */
router.put('/words/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      word, definition, pronunciation, part_of_speech, example_sentence,
      origin, synonyms, antonyms, category, tags, is_learned
    } = req.body;

    await runAsync(
      `UPDATE words SET 
        word = COALESCE(?, word),
        definition = COALESCE(?, definition),
        pronunciation = COALESCE(?, pronunciation),
        part_of_speech = COALESCE(?, part_of_speech),
        example_sentence = COALESCE(?, example_sentence),
        origin = COALESCE(?, origin),
        synonyms = COALESCE(?, synonyms),
        antonyms = COALESCE(?, antonyms),
        category = COALESCE(?, category),
        tags = COALESCE(?, tags),
        is_learned = COALESCE(?, is_learned)
      WHERE id = ?`,
      [word, definition, pronunciation, part_of_speech, example_sentence, origin,
       synonyms ? JSON.stringify(synonyms) : null, antonyms ? JSON.stringify(antonyms) : null,
       category, tags ? JSON.stringify(tags) : null, is_learned, id]
    );

    const wordRecord = await getAsync('SELECT * FROM words WHERE id = ?', [id]);
    res.json({
      ...wordRecord,
      tags: wordRecord.tags ? JSON.parse(wordRecord.tags) : [],
      synonyms: wordRecord.synonyms ? JSON.parse(wordRecord.synonyms) : [],
      antonyms: wordRecord.antonyms ? JSON.parse(wordRecord.antonyms) : []
    });
  } catch (error) {
    console.error('Error updating word:', error);
    res.status(500).json({ error: 'Failed to update word' });
  }
});

/**
 * POST /api/utilities/words/:id/review
 * Mark word as reviewed
 */
router.post('/words/:id/review', async (req, res) => {
  try {
    const { id } = req.params;
    const { correct } = req.body;

    await runAsync(
      `UPDATE words SET 
        review_count = review_count + 1,
        last_reviewed_at = CURRENT_TIMESTAMP,
        is_learned = CASE WHEN review_count >= 5 AND ? = 1 THEN 1 ELSE is_learned END
      WHERE id = ?`,
      [correct ? 1 : 0, id]
    );

    const wordRecord = await getAsync('SELECT * FROM words WHERE id = ?', [id]);
    res.json(wordRecord);
  } catch (error) {
    console.error('Error reviewing word:', error);
    res.status(500).json({ error: 'Failed to review word' });
  }
});

/**
 * DELETE /api/utilities/words/:id
 * Delete a word
 */
router.delete('/words/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await runAsync('DELETE FROM words WHERE id = ?', [id]);
    res.json({ message: 'Word deleted successfully' });
  } catch (error) {
    console.error('Error deleting word:', error);
    res.status(500).json({ error: 'Failed to delete word' });
  }
});

// ============= STICKY NOTES =============

/**
 * GET /api/utilities/sticky-boards
 * Get all sticky boards
 */
router.get('/sticky-boards', async (req, res) => {
  try {
    const boards = await allAsync(
      `SELECT b.*, COUNT(s.id) as note_count
       FROM sticky_boards b
       LEFT JOIN sticky_notes s ON b.id = s.board_id
       GROUP BY b.id
       ORDER BY b.created_at DESC`
    );
    res.json(boards);
  } catch (error) {
    console.error('Error fetching boards:', error);
    res.status(500).json({ error: 'Failed to fetch boards' });
  }
});

/**
 * POST /api/utilities/sticky-boards
 * Create a sticky board
 */
router.post('/sticky-boards', [
  body('name').notEmpty().withMessage('Name is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, description, background_color } = req.body;
    const id = randomUUID();

    await runAsync(
      `INSERT INTO sticky_boards (id, name, description, background_color) VALUES (?, ?, ?, ?)`,
      [id, name, description, background_color || '#f3f4f6']
    );

    const board = await getAsync('SELECT * FROM sticky_boards WHERE id = ?', [id]);
    res.status(201).json(board);
  } catch (error) {
    console.error('Error creating board:', error);
    res.status(500).json({ error: 'Failed to create board' });
  }
});

/**
 * GET /api/utilities/sticky-notes
 * Get all sticky notes (optionally by board)
 */
router.get('/sticky-notes', async (req, res) => {
  try {
    const { board_id } = req.query;
    
    let whereClause = '1=1';
    const params: any[] = [];

    if (board_id) {
      whereClause += ' AND board_id = ?';
      params.push(board_id);
    }

    const notes = await allAsync(
      `SELECT * FROM sticky_notes WHERE ${whereClause} ORDER BY is_pinned DESC, created_at DESC`,
      params
    );
    res.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

/**
 * POST /api/utilities/sticky-notes
 * Create a sticky note
 */
router.post('/sticky-notes', [
  body('content').notEmpty().withMessage('Content is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { content, color = '#fef3c7', position_x = 0, position_y = 0, width = 200, height = 200, board_id } = req.body;
    const id = randomUUID();

    await runAsync(
      `INSERT INTO sticky_notes (id, content, color, position_x, position_y, width, height, board_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, content, color, position_x, position_y, width, height, board_id]
    );

    const note = await getAsync('SELECT * FROM sticky_notes WHERE id = ?', [id]);
    res.status(201).json(note);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

/**
 * PUT /api/utilities/sticky-notes/:id
 * Update a sticky note
 */
router.put('/sticky-notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, color, position_x, position_y, width, height, board_id, is_pinned } = req.body;

    await runAsync(
      `UPDATE sticky_notes SET 
        content = COALESCE(?, content),
        color = COALESCE(?, color),
        position_x = COALESCE(?, position_x),
        position_y = COALESCE(?, position_y),
        width = COALESCE(?, width),
        height = COALESCE(?, height),
        board_id = COALESCE(?, board_id),
        is_pinned = COALESCE(?, is_pinned),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [content, color, position_x, position_y, width, height, board_id, is_pinned, id]
    );

    const note = await getAsync('SELECT * FROM sticky_notes WHERE id = ?', [id]);
    res.json(note);
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

/**
 * DELETE /api/utilities/sticky-notes/:id
 * Delete a sticky note
 */
router.delete('/sticky-notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await runAsync('DELETE FROM sticky_notes WHERE id = ?', [id]);
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

/**
 * DELETE /api/utilities/sticky-boards/:id
 * Delete a sticky board and its notes
 */
router.delete('/sticky-boards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await runAsync('DELETE FROM sticky_notes WHERE board_id = ?', [id]);
    await runAsync('DELETE FROM sticky_boards WHERE id = ?', [id]);
    res.json({ message: 'Board deleted successfully' });
  } catch (error) {
    console.error('Error deleting board:', error);
    res.status(500).json({ error: 'Failed to delete board' });
  }
});

export default router;
