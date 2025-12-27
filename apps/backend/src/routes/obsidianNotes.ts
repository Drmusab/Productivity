/**
 * @fileoverview Routes for Obsidian-style Notes System
 * 
 * This provides API endpoints for the Obsidian-style notes functionality
 * including backlinks with snippets and unified search.
 */

import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { noteService } from '../services/noteService';
import { unifiedSearchService } from '../services/unifiedSearchService';
import { graphService } from '../services/graphService';
import { dailyNotesService } from '../services/dailyNotesService';
import { 
  CreateNoteParams, 
  UpdateNoteParams, 
  CreateTaskNoteRelationParams,
  TaskNoteRelationType,
  DailyNoteTemplate,
} from '../types/notes';

const router = express.Router();

// ============= OBSIDIAN NOTES CRUD =============

/**
 * GET /api/obsidian-notes
 * List all obsidian notes with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const { folder_path, created_by, limit, offset } = req.query;
    
    const options: any = {};
    
    if (folder_path) {
      options.folderPath = String(folder_path);
    }
    
    if (created_by) {
      options.createdBy = parseInt(String(created_by), 10);
    }
    
    if (limit) {
      options.limit = parseInt(String(limit), 10);
    }
    
    if (offset) {
      options.offset = parseInt(String(offset), 10);
    }
    
    const notes = await noteService.listNotes(options);
    res.json(notes);
  } catch (error) {
    console.error('Error listing obsidian notes:', error);
    res.status(500).json({ error: 'Failed to list notes' });
  }
});

/**
 * GET /api/obsidian-notes/:id
 * Get a specific note by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const note = await noteService.getNote(id);
    
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    res.json(note);
  } catch (error) {
    console.error('Error fetching note:', error);
    res.status(500).json({ error: 'Failed to fetch note' });
  }
});

/**
 * GET /api/obsidian-notes/:id/context
 * Get full note context (note + backlinks + links + tasks)
 */
router.get('/:id/context', async (req, res) => {
  try {
    const { id } = req.params;
    const context = await noteService.getNoteFullContext(id);
    
    if (!context) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    res.json(context);
  } catch (error) {
    console.error('Error fetching note context:', error);
    res.status(500).json({ error: 'Failed to fetch note context' });
  }
});

/**
 * GET /api/obsidian-notes/:id/backlinks
 * Get backlinks with context snippets (Phase C)
 * 
 * This endpoint provides the Obsidian-like experience showing where
 * each backlink appears in its source note.
 */
router.get('/:id/backlinks', async (req, res) => {
  try {
    const { id } = req.params;
    const backlinks = await noteService.getBacklinksWithSnippets(id);
    
    res.json(backlinks);
  } catch (error) {
    console.error('Error fetching backlinks:', error);
    res.status(500).json({ error: 'Failed to fetch backlinks' });
  }
});

/**
 * GET /api/obsidian-notes/:id/with-backlinks
 * Get note with backlinks including snippets
 */
router.get('/:id/with-backlinks', async (req, res) => {
  try {
    const { id } = req.params;
    const noteWithBacklinks = await noteService.getNoteWithBacklinkSnippets(id);
    
    if (!noteWithBacklinks) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    res.json(noteWithBacklinks);
  } catch (error) {
    console.error('Error fetching note with backlinks:', error);
    res.status(500).json({ error: 'Failed to fetch note with backlinks' });
  }
});

/**
 * POST /api/obsidian-notes
 * Create a new obsidian note
 */
router.post('/', [
  body('title').notEmpty().withMessage('Title is required'),
  body('contentMarkdown').optional().isString(),
  body('folderPath').optional().isString(),
  body('frontmatter').optional().isObject(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { title, contentMarkdown, folderPath, frontmatter, createdBy } = req.body;
    
    const params: CreateNoteParams = {
      title,
      contentMarkdown,
      folderPath,
      frontmatter,
      createdBy,
    };
    
    const noteId = await noteService.createNote(params);
    
    // Resolve any previously unresolved links
    await noteService.resolveLinksForNewNote(noteId);
    
    const note = await noteService.getNote(noteId);
    res.status(201).json(note);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

/**
 * PUT /api/obsidian-notes/:id
 * Update an obsidian note
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, contentMarkdown, folderPath, frontmatter } = req.body;
    
    const params: UpdateNoteParams = {
      id,
      title,
      contentMarkdown,
      folderPath,
      frontmatter,
    };
    
    await noteService.updateNote(params);
    
    const note = await noteService.getNote(id);
    res.json(note);
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

/**
 * DELETE /api/obsidian-notes/:id
 * Delete an obsidian note
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await noteService.deleteNote(id);
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// ============= SEARCH =============

/**
 * GET /api/obsidian-notes/search/unified
 * Unified search across notes and tasks (Phase D)
 * 
 * This endpoint enables command palette / quick switcher functionality.
 */
router.get('/search/unified', [
  query('q').notEmpty().withMessage('Query parameter q is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const {
      q: query,
      limit,
      offset,
      types,
      includeRelated,
    } = req.query;
    
    const options: any = {};
    
    if (limit) {
      options.limit = parseInt(String(limit), 10);
    }
    
    if (offset) {
      options.offset = parseInt(String(offset), 10);
    }
    
    if (types) {
      // Parse types parameter (comma-separated or array)
      const typesArray = Array.isArray(types) ? types : String(types).split(',');
      options.types = typesArray;
    }
    
    if (includeRelated !== undefined) {
      options.includeRelated = String(includeRelated) === 'true';
    }
    
    const results = await unifiedSearchService.search(String(query), options);
    
    res.json({
      query: String(query),
      results,
      total: results.length,
    });
  } catch (error) {
    console.error('Error performing unified search:', error);
    res.status(500).json({ error: 'Failed to perform search' });
  }
});

/**
 * GET /api/obsidian-notes/search/quick
 * Quick search for command palette (top 10 results, no related entities)
 */
router.get('/search/quick', [
  query('q').notEmpty().withMessage('Query parameter q is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { q: query } = req.query;
    const results = await unifiedSearchService.quickSearch(String(query));
    
    res.json({
      query: String(query),
      results,
    });
  } catch (error) {
    console.error('Error performing quick search:', error);
    res.status(500).json({ error: 'Failed to perform quick search' });
  }
});

// ============= TASK-NOTE RELATIONS =============

/**
 * POST /api/obsidian-notes/:id/link-task
 * Create a task-note relation
 */
router.post('/:id/link-task', [
  body('taskId').isInt().withMessage('Task ID must be an integer'),
  body('relationType').isIn(['reference', 'spec', 'meeting', 'evidence'])
    .withMessage('Invalid relation type'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { id: noteId } = req.params;
    const { taskId, relationType } = req.body;
    
    const params: CreateTaskNoteRelationParams = {
      taskId: parseInt(String(taskId), 10),
      noteId,
      relationType: relationType as TaskNoteRelationType,
    };
    
    const relationId = await noteService.createTaskNoteRelation(params);
    
    res.status(201).json({
      id: relationId,
      noteId,
      taskId,
      relationType,
    });
  } catch (error) {
    console.error('Error creating task-note relation:', error);
    res.status(500).json({ error: 'Failed to create relation' });
  }
});

/**
 * DELETE /api/obsidian-notes/:id/link-task/:relationId
 * Delete a task-note relation
 */
router.delete('/:id/link-task/:relationId', async (req, res) => {
  try {
    const { relationId } = req.params;
    await noteService.deleteTaskNoteRelation(relationId);
    res.json({ message: 'Relation deleted successfully' });
  } catch (error) {
    console.error('Error deleting task-note relation:', error);
    res.status(500).json({ error: 'Failed to delete relation' });
  }
});

/**
 * GET /api/obsidian-notes/:id/related-tasks
 * Get tasks related to a note
 */
router.get('/:id/related-tasks', async (req, res) => {
  try {
    const { id } = req.params;
    const relatedTasks = await noteService.getRelatedTasks(id);
    res.json(relatedTasks);
  } catch (error) {
    console.error('Error fetching related tasks:', error);
    res.status(500).json({ error: 'Failed to fetch related tasks' });
  }
});

// ============= UTILITIES =============

/**
 * GET /api/obsidian-notes/utils/unresolved-links
 * Get all unresolved links across all notes
 */
router.get('/utils/unresolved-links', async (req, res) => {
  try {
    const unresolvedLinks = await noteService.getUnresolvedLinks();
    res.json(unresolvedLinks);
  } catch (error) {
    console.error('Error fetching unresolved links:', error);
    res.status(500).json({ error: 'Failed to fetch unresolved links' });
  }
});

// ============= GRAPH INTELLIGENCE (Phase E) =============

/**
 * GET /api/obsidian-notes/:id/graph/outgoing
 * Get outgoing links from a note (notes referenced by current note)
 */
router.get('/:id/graph/outgoing', async (req, res) => {
  try {
    const { id } = req.params;
    const outgoingLinks = await graphService.getOutgoingLinks(id);
    res.json(outgoingLinks);
  } catch (error) {
    console.error('Error fetching outgoing links:', error);
    res.status(500).json({ error: 'Failed to fetch outgoing links' });
  }
});

/**
 * GET /api/obsidian-notes/:id/graph/backlinks
 * Get backlinks to a note (notes that link to current note)
 */
router.get('/:id/graph/backlinks', async (req, res) => {
  try {
    const { id } = req.params;
    const backlinks = await graphService.getBacklinks(id);
    res.json(backlinks);
  } catch (error) {
    console.error('Error fetching graph backlinks:', error);
    res.status(500).json({ error: 'Failed to fetch backlinks' });
  }
});

/**
 * GET /api/obsidian-notes/:id/graph/neighbors
 * Get neighbors with depth-N traversal
 * Query params:
 *   - depth: maximum depth to traverse (default: 1)
 */
router.get('/:id/graph/neighbors', async (req, res) => {
  try {
    const { id } = req.params;
    const depth = req.query.depth ? parseInt(String(req.query.depth), 10) : 1;
    
    if (depth < 0 || depth > 10) {
      return res.status(400).json({ error: 'Depth must be between 0 and 10' });
    }
    
    const neighbors = await graphService.getNeighbors(id, depth);
    res.json(neighbors);
  } catch (error) {
    console.error('Error fetching neighbors:', error);
    res.status(500).json({ error: 'Failed to fetch neighbors' });
  }
});

/**
 * GET /api/obsidian-notes/graph/unresolved
 * Get all unresolved links (missing notes)
 */
router.get('/graph/unresolved', async (req, res) => {
  try {
    const unresolvedLinks = await graphService.getUnresolvedLinks();
    res.json(unresolvedLinks);
  } catch (error) {
    console.error('Error fetching unresolved links:', error);
    res.status(500).json({ error: 'Failed to fetch unresolved links' });
  }
});

/**
 * GET /api/obsidian-notes/graph/orphans
 * Get orphan notes (notes with no incoming or outgoing links)
 */
router.get('/graph/orphans', async (req, res) => {
  try {
    const orphans = await graphService.getOrphanNotes();
    res.json(orphans);
  } catch (error) {
    console.error('Error fetching orphan notes:', error);
    res.status(500).json({ error: 'Failed to fetch orphan notes' });
  }
});

/**
 * GET /api/obsidian-notes/graph/connected
 * Get connected notes (notes with at least one link)
 */
router.get('/graph/connected', async (req, res) => {
  try {
    const connected = await graphService.getConnectedNotes();
    res.json(connected);
  } catch (error) {
    console.error('Error fetching connected notes:', error);
    res.status(500).json({ error: 'Failed to fetch connected notes' });
  }
});

// ============= DAILY NOTES (Phase F) =============

/**
 * POST /api/obsidian-notes/daily
 * Get or create today's daily note
 */
router.post('/daily', async (req, res) => {
  try {
    const noteId = await dailyNotesService.getOrCreateDailyNote();
    const note = await noteService.getNote(noteId);
    res.json(note);
  } catch (error) {
    console.error('Error creating/fetching daily note:', error);
    res.status(500).json({ error: 'Failed to create/fetch daily note' });
  }
});

/**
 * GET /api/obsidian-notes/daily/:date
 * Get or create daily note for a specific date
 * Date format: YYYY-MM-DD
 */
router.get('/daily/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const noteId = await dailyNotesService.getOrCreateDailyNote(date);
    const note = await noteService.getNote(noteId);
    res.json(note);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid date format')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error creating/fetching daily note:', error);
    res.status(500).json({ error: 'Failed to create/fetch daily note' });
  }
});

/**
 * GET /api/obsidian-notes/templates/daily
 * Get the current daily note template
 */
router.get('/templates/daily', async (req, res) => {
  try {
    const template = dailyNotesService.getTemplate();
    res.json(template);
  } catch (error) {
    console.error('Error fetching daily template:', error);
    res.status(500).json({ error: 'Failed to fetch daily template' });
  }
});

/**
 * PUT /api/obsidian-notes/templates/daily
 * Update the daily note template
 */
router.put('/templates/daily', [
  body('content').notEmpty().withMessage('Template content is required'),
  body('frontmatter').optional().isObject(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { content, frontmatter } = req.body;
    const template: DailyNoteTemplate = {
      content,
      frontmatter,
    };
    
    dailyNotesService.setTemplate(template);
    res.json({ message: 'Template updated successfully', template });
  } catch (error) {
    console.error('Error updating daily template:', error);
    res.status(500).json({ error: 'Failed to update daily template' });
  }
});

/**
 * POST /api/obsidian-notes/templates/daily/reset
 * Reset the daily note template to default
 */
router.post('/templates/daily/reset', async (req, res) => {
  try {
    dailyNotesService.resetTemplate();
    const template = dailyNotesService.getTemplate();
    res.json({ message: 'Template reset to default', template });
  } catch (error) {
    console.error('Error resetting daily template:', error);
    res.status(500).json({ error: 'Failed to reset daily template' });
  }
});

export default router;
