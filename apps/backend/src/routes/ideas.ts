// @ts-nocheck
/**
 * @fileoverview Routes for Idea Management System.
 * Provides idea tracking with workflow stages and status management.
 * @module routes/ideas
 */

import express from 'express';
import { body, validationResult, param } from 'express-validator';
import { runAsync, allAsync, getAsync } from '../utils/database';
import { randomUUID } from 'crypto';

const router = express.Router();

/**
 * Initialize ideas table
 */
const initIdeasTable = async () => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS ideas (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      raw_dump TEXT,
      problem_definition TEXT,
      concept_expansion TEXT,
      tools_resources TEXT,
      one_sentence_summary TEXT,
      step_by_step_plan TEXT,
      moodboard_urls TEXT,
      status TEXT DEFAULT 'new',
      priority TEXT DEFAULT 'medium',
      category TEXT,
      tags TEXT,
      is_archived INTEGER DEFAULT 0,
      converted_to TEXT,
      converted_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS idea_resources (
      id TEXT PRIMARY KEY,
      idea_id TEXT NOT NULL,
      type TEXT NOT NULL,
      url TEXT,
      title TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE
    )
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS idea_notes (
      id TEXT PRIMARY KEY,
      idea_id TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'general',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE
    )
  `);
};

// Initialize table on module load
initIdeasTable().catch(console.error);

/**
 * Idea statuses as defined in requirements
 */
const IDEA_STATUSES = ['new', 'exploring', 'developing', 'on_hold', 'completed'];

/**
 * Idea workflow stages
 */
const WORKFLOW_STAGES = [
  { key: 'raw_dump', label: 'Raw Idea Dump', description: 'Initial brain dump of the idea' },
  { key: 'problem_definition', label: 'Problem Definition', description: 'What problem does this solve?' },
  { key: 'concept_expansion', label: 'Concept Expansion', description: 'Explore and expand the concept' },
  { key: 'tools_resources', label: 'Tools & Resources', description: 'What do you need to make this happen?' },
  { key: 'one_sentence_summary', label: 'One-Sentence Summary', description: 'Summarize in one powerful sentence' },
  { key: 'step_by_step_plan', label: 'Step-by-Step Plan', description: 'Break it down into actionable steps' }
];

/**
 * GET /api/ideas
 * Get all ideas with optional filtering
 */
router.get('/', async (req, res) => {
  try {
    const { status, category, archived, search, limit = 50, offset = 0 } = req.query;
    
    let whereClause = '1=1';
    const params: any[] = [];

    if (status && IDEA_STATUSES.includes(status as string)) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    if (category) {
      whereClause += ' AND category = ?';
      params.push(category);
    }

    if (archived !== undefined) {
      whereClause += ' AND is_archived = ?';
      params.push(archived === 'true' ? 1 : 0);
    } else {
      whereClause += ' AND is_archived = 0';
    }

    if (search) {
      whereClause += ' AND (title LIKE ? OR raw_dump LIKE ? OR one_sentence_summary LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    params.push(parseInt(limit as string), parseInt(offset as string));

    const ideas = await allAsync(
      `SELECT * FROM ideas WHERE ${whereClause} ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
      params
    );

    // Parse tags
    const parsedIdeas = ideas.map(idea => ({
      ...idea,
      tags: idea.tags ? JSON.parse(idea.tags) : [],
      moodboard_urls: idea.moodboard_urls ? JSON.parse(idea.moodboard_urls) : []
    }));

    res.json(parsedIdeas);
  } catch (error) {
    console.error('Error fetching ideas:', error);
    res.status(500).json({ error: 'Failed to fetch ideas' });
  }
});

/**
 * GET /api/ideas/workflow
 * Get workflow stages information
 */
router.get('/workflow', (req, res) => {
  res.json({
    stages: WORKFLOW_STAGES,
    statuses: IDEA_STATUSES
  });
});

/**
 * GET /api/ideas/stats
 * Get idea statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const byStatus = await allAsync(
      `SELECT status, COUNT(*) as count FROM ideas WHERE is_archived = 0 GROUP BY status`
    );

    const byCategory = await allAsync(
      `SELECT category, COUNT(*) as count FROM ideas WHERE is_archived = 0 AND category IS NOT NULL GROUP BY category`
    );

    const total = await getAsync('SELECT COUNT(*) as count FROM ideas WHERE is_archived = 0');
    const completed = await getAsync('SELECT COUNT(*) as count FROM ideas WHERE status = "completed"');

    res.json({
      total: total?.count || 0,
      completed: completed?.count || 0,
      byStatus,
      byCategory
    });
  } catch (error) {
    console.error('Error fetching idea stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * GET /api/ideas/:id
 * Get a specific idea with all details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const idea = await getAsync('SELECT * FROM ideas WHERE id = ?', [id]);
    if (!idea) {
      return res.status(404).json({ error: 'Idea not found' });
    }

    // Get resources
    const resources = await allAsync(
      'SELECT * FROM idea_resources WHERE idea_id = ? ORDER BY created_at',
      [id]
    );

    // Get notes
    const notes = await allAsync(
      'SELECT * FROM idea_notes WHERE idea_id = ? ORDER BY created_at DESC',
      [id]
    );

    res.json({
      ...idea,
      tags: idea.tags ? JSON.parse(idea.tags) : [],
      moodboard_urls: idea.moodboard_urls ? JSON.parse(idea.moodboard_urls) : [],
      resources,
      notes
    });
  } catch (error) {
    console.error('Error fetching idea:', error);
    res.status(500).json({ error: 'Failed to fetch idea' });
  }
});

/**
 * POST /api/ideas
 * Create a new idea
 */
router.post('/', [
  body('title').notEmpty().withMessage('Title is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      title,
      raw_dump,
      problem_definition,
      concept_expansion,
      tools_resources,
      one_sentence_summary,
      step_by_step_plan,
      moodboard_urls = [],
      status = 'new',
      priority = 'medium',
      category,
      tags = []
    } = req.body;

    const id = randomUUID();

    await runAsync(
      `INSERT INTO ideas (
        id, title, raw_dump, problem_definition, concept_expansion,
        tools_resources, one_sentence_summary, step_by_step_plan,
        moodboard_urls, status, priority, category, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, title, raw_dump, problem_definition, concept_expansion,
        tools_resources, one_sentence_summary, step_by_step_plan,
        JSON.stringify(moodboard_urls), status, priority, category, JSON.stringify(tags)
      ]
    );

    const idea = await getAsync('SELECT * FROM ideas WHERE id = ?', [id]);
    res.status(201).json({
      ...idea,
      tags: tags,
      moodboard_urls: moodboard_urls
    });
  } catch (error) {
    console.error('Error creating idea:', error);
    res.status(500).json({ error: 'Failed to create idea' });
  }
});

/**
 * PUT /api/ideas/:id
 * Update an idea
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      raw_dump,
      problem_definition,
      concept_expansion,
      tools_resources,
      one_sentence_summary,
      step_by_step_plan,
      moodboard_urls,
      status,
      priority,
      category,
      tags,
      is_archived
    } = req.body;

    const existing = await getAsync('SELECT * FROM ideas WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Idea not found' });
    }

    await runAsync(
      `UPDATE ideas SET 
        title = COALESCE(?, title),
        raw_dump = COALESCE(?, raw_dump),
        problem_definition = COALESCE(?, problem_definition),
        concept_expansion = COALESCE(?, concept_expansion),
        tools_resources = COALESCE(?, tools_resources),
        one_sentence_summary = COALESCE(?, one_sentence_summary),
        step_by_step_plan = COALESCE(?, step_by_step_plan),
        moodboard_urls = COALESCE(?, moodboard_urls),
        status = COALESCE(?, status),
        priority = COALESCE(?, priority),
        category = COALESCE(?, category),
        tags = COALESCE(?, tags),
        is_archived = COALESCE(?, is_archived),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        title, raw_dump, problem_definition, concept_expansion,
        tools_resources, one_sentence_summary, step_by_step_plan,
        moodboard_urls ? JSON.stringify(moodboard_urls) : null,
        status, priority, category,
        tags ? JSON.stringify(tags) : null,
        is_archived, id
      ]
    );

    const idea = await getAsync('SELECT * FROM ideas WHERE id = ?', [id]);
    res.json({
      ...idea,
      tags: idea.tags ? JSON.parse(idea.tags) : [],
      moodboard_urls: idea.moodboard_urls ? JSON.parse(idea.moodboard_urls) : []
    });
  } catch (error) {
    console.error('Error updating idea:', error);
    res.status(500).json({ error: 'Failed to update idea' });
  }
});

/**
 * DELETE /api/ideas/:id
 * Delete an idea
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await runAsync('DELETE FROM ideas WHERE id = ?', [id]);
    res.json({ message: 'Idea deleted successfully' });
  } catch (error) {
    console.error('Error deleting idea:', error);
    res.status(500).json({ error: 'Failed to delete idea' });
  }
});

/**
 * POST /api/ideas/:id/resources
 * Add a resource to an idea
 */
router.post('/:id/resources', [
  body('type').notEmpty().withMessage('Type is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { type, url, title, description } = req.body;

    const resourceId = randomUUID();
    await runAsync(
      `INSERT INTO idea_resources (id, idea_id, type, url, title, description) VALUES (?, ?, ?, ?, ?, ?)`,
      [resourceId, id, type, url, title, description]
    );

    const resource = await getAsync('SELECT * FROM idea_resources WHERE id = ?', [resourceId]);
    res.status(201).json(resource);
  } catch (error) {
    console.error('Error adding resource:', error);
    res.status(500).json({ error: 'Failed to add resource' });
  }
});

/**
 * DELETE /api/ideas/:id/resources/:resourceId
 * Remove a resource from an idea
 */
router.delete('/:id/resources/:resourceId', async (req, res) => {
  try {
    const { resourceId } = req.params;
    
    await runAsync('DELETE FROM idea_resources WHERE id = ?', [resourceId]);
    res.json({ message: 'Resource deleted successfully' });
  } catch (error) {
    console.error('Error deleting resource:', error);
    res.status(500).json({ error: 'Failed to delete resource' });
  }
});

/**
 * POST /api/ideas/:id/notes
 * Add a note to an idea
 */
router.post('/:id/notes', [
  body('content').notEmpty().withMessage('Content is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { content, type = 'general' } = req.body;

    const noteId = randomUUID();
    await runAsync(
      `INSERT INTO idea_notes (id, idea_id, content, type) VALUES (?, ?, ?, ?)`,
      [noteId, id, content, type]
    );

    const note = await getAsync('SELECT * FROM idea_notes WHERE id = ?', [noteId]);
    res.status(201).json(note);
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

/**
 * POST /api/ideas/:id/convert
 * Convert idea to task, note, or project
 */
router.post('/:id/convert', [
  body('type').isIn(['task', 'note', 'project']).withMessage('Type must be task, note, or project')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { type } = req.body;

    const idea = await getAsync('SELECT * FROM ideas WHERE id = ?', [id]);
    if (!idea) {
      return res.status(404).json({ error: 'Idea not found' });
    }

    // Update idea with conversion info
    await runAsync(
      `UPDATE ideas SET converted_to = ?, status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [type, id]
    );

    // Return conversion suggestion (actual creation handled by frontend)
    res.json({
      message: `Idea ready to be converted to ${type}`,
      idea: {
        ...idea,
        converted_to: type
      },
      suggestion: {
        title: idea.title,
        description: idea.one_sentence_summary || idea.raw_dump,
        details: idea.step_by_step_plan
      }
    });
  } catch (error) {
    console.error('Error converting idea:', error);
    res.status(500).json({ error: 'Failed to convert idea' });
  }
});

export default router;
