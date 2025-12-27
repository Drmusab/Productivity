// @ts-nocheck
/**
 * @fileoverview Routes for Notes System.
 * Provides Notes Hub with folder system, tags, Cornell Notes, and Zettelkasten support.
 * @module routes/notes
 */

import express from 'express';
import { body, validationResult, param, query } from 'express-validator';
import { runAsync, allAsync, getAsync } from '../utils/database';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * Initialize notes tables
 */
const initNotesTable = async () => {
  // Main notes table
  await runAsync(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT,
      type TEXT DEFAULT 'standard',
      folder_id TEXT,
      is_archived INTEGER DEFAULT 0,
      is_pinned INTEGER DEFAULT 0,
      color TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (folder_id) REFERENCES note_folders(id) ON DELETE SET NULL
    )
  `);

  // Folders for notes
  await runAsync(`
    CREATE TABLE IF NOT EXISTS note_folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_id TEXT,
      color TEXT,
      icon TEXT,
      position INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES note_folders(id) ON DELETE SET NULL
    )
  `);

  // Tags for notes
  await runAsync(`
    CREATE TABLE IF NOT EXISTS note_tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#667eea',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Note-tag relationship
  await runAsync(`
    CREATE TABLE IF NOT EXISTS note_tag_relations (
      note_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (note_id, tag_id),
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES note_tags(id) ON DELETE CASCADE
    )
  `);

  // Cornell notes extension
  await runAsync(`
    CREATE TABLE IF NOT EXISTS cornell_notes (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL UNIQUE,
      cue_column TEXT,
      notes_column TEXT,
      summary TEXT,
      topic TEXT,
      knowledge_rating INTEGER DEFAULT 0,
      study_session_id TEXT,
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
    )
  `);

  // Zettelkasten links (backlinks)
  await runAsync(`
    CREATE TABLE IF NOT EXISTS note_links (
      id TEXT PRIMARY KEY,
      source_note_id TEXT NOT NULL,
      target_note_id TEXT NOT NULL,
      context TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (source_note_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY (target_note_id) REFERENCES notes(id) ON DELETE CASCADE
    )
  `);
};

// Initialize tables
initNotesTable().catch(console.error);

// ============= FOLDERS =============

/**
 * GET /api/notes/folders
 * Get all folders with hierarchy
 */
router.get('/folders', async (req, res) => {
  try {
    const folders = await allAsync(
      `SELECT f.*, COUNT(n.id) as note_count
       FROM note_folders f
       LEFT JOIN notes n ON n.folder_id = f.id AND n.is_archived = 0
       GROUP BY f.id
       ORDER BY f.position, f.name`
    );
    res.json(folders);
  } catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

/**
 * POST /api/notes/folders
 * Create a new folder
 */
router.post('/folders', [
  body('name').notEmpty().withMessage('Name is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, parent_id, color, icon } = req.body;
    const id = uuidv4();

    await runAsync(
      `INSERT INTO note_folders (id, name, parent_id, color, icon) VALUES (?, ?, ?, ?, ?)`,
      [id, name, parent_id, color, icon]
    );

    const folder = await getAsync('SELECT * FROM note_folders WHERE id = ?', [id]);
    res.status(201).json(folder);
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

/**
 * PUT /api/notes/folders/:id
 * Update a folder
 */
router.put('/folders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, parent_id, color, icon, position } = req.body;

    await runAsync(
      `UPDATE note_folders SET 
        name = COALESCE(?, name),
        parent_id = COALESCE(?, parent_id),
        color = COALESCE(?, color),
        icon = COALESCE(?, icon),
        position = COALESCE(?, position)
      WHERE id = ?`,
      [name, parent_id, color, icon, position, id]
    );

    const folder = await getAsync('SELECT * FROM note_folders WHERE id = ?', [id]);
    res.json(folder);
  } catch (error) {
    console.error('Error updating folder:', error);
    res.status(500).json({ error: 'Failed to update folder' });
  }
});

/**
 * DELETE /api/notes/folders/:id
 * Delete a folder (moves notes to root)
 */
router.delete('/folders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Move notes to root
    await runAsync('UPDATE notes SET folder_id = NULL WHERE folder_id = ?', [id]);
    // Move child folders to parent
    const folder = await getAsync('SELECT parent_id FROM note_folders WHERE id = ?', [id]);
    await runAsync('UPDATE note_folders SET parent_id = ? WHERE parent_id = ?', [folder?.parent_id, id]);
    // Delete folder
    await runAsync('DELETE FROM note_folders WHERE id = ?', [id]);
    
    res.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

// ============= TAGS =============

/**
 * GET /api/notes/tags
 * Get all tags
 */
router.get('/tags', async (req, res) => {
  try {
    const tags = await allAsync(
      `SELECT t.*, COUNT(ntr.note_id) as usage_count
       FROM note_tags t
       LEFT JOIN note_tag_relations ntr ON t.id = ntr.tag_id
       GROUP BY t.id
       ORDER BY usage_count DESC`
    );
    res.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

/**
 * POST /api/notes/tags
 * Create a new tag
 */
router.post('/tags', [
  body('name').notEmpty().withMessage('Name is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, color } = req.body;
    const id = uuidv4();

    await runAsync(
      `INSERT INTO note_tags (id, name, color) VALUES (?, ?, ?)`,
      [id, name.toLowerCase(), color || '#667eea']
    );

    const tag = await getAsync('SELECT * FROM note_tags WHERE id = ?', [id]);
    res.status(201).json(tag);
  } catch (error) {
    if ((error as any).code === 'SQLITE_CONSTRAINT') {
      return res.status(400).json({ error: 'Tag already exists' });
    }
    console.error('Error creating tag:', error);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

// ============= NOTES =============

/**
 * GET /api/notes
 * Get all notes with filters
 */
router.get('/', async (req, res) => {
  try {
    const { folder_id, tag, type, archived, search, limit = 50, offset = 0 } = req.query;
    
    let whereClause = '1=1';
    const params: any[] = [];

    if (folder_id) {
      whereClause += ' AND n.folder_id = ?';
      params.push(folder_id);
    }

    if (archived !== undefined) {
      whereClause += ' AND n.is_archived = ?';
      params.push(archived === 'true' ? 1 : 0);
    } else {
      whereClause += ' AND n.is_archived = 0';
    }

    if (type) {
      whereClause += ' AND n.type = ?';
      params.push(type);
    }

    if (search) {
      whereClause += ' AND (n.title LIKE ? OR n.content LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    let tagJoin = '';
    if (tag) {
      tagJoin = `INNER JOIN note_tag_relations ntr ON n.id = ntr.note_id
                 INNER JOIN note_tags t ON ntr.tag_id = t.id AND t.name = ?`;
      params.unshift(tag);
    }

    params.push(parseInt(limit as string), parseInt(offset as string));

    const notes = await allAsync(
      `SELECT n.*, f.name as folder_name,
        GROUP_CONCAT(DISTINCT nt.name) as tags
       FROM notes n
       LEFT JOIN note_folders f ON n.folder_id = f.id
       LEFT JOIN note_tag_relations ntr2 ON n.id = ntr2.note_id
       LEFT JOIN note_tags nt ON ntr2.tag_id = nt.id
       ${tagJoin}
       WHERE ${whereClause}
       GROUP BY n.id
       ORDER BY n.is_pinned DESC, n.updated_at DESC
       LIMIT ? OFFSET ?`,
      params
    );

    // Parse tags into array
    const parsedNotes = notes.map(note => ({
      ...note,
      tags: note.tags ? note.tags.split(',') : []
    }));

    res.json(parsedNotes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

/**
 * GET /api/notes/:id
 * Get a specific note with details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const note = await getAsync(
      `SELECT n.*, f.name as folder_name
       FROM notes n
       LEFT JOIN note_folders f ON n.folder_id = f.id
       WHERE n.id = ?`,
      [id]
    );

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Get tags
    const tags = await allAsync(
      `SELECT t.* FROM note_tags t
       INNER JOIN note_tag_relations ntr ON t.id = ntr.tag_id
       WHERE ntr.note_id = ?`,
      [id]
    );

    // Get backlinks (notes linking to this note)
    const backlinks = await allAsync(
      `SELECT n.id, n.title FROM notes n
       INNER JOIN note_links nl ON n.id = nl.source_note_id
       WHERE nl.target_note_id = ?`,
      [id]
    );

    // Get forward links (notes this note links to)
    const forwardLinks = await allAsync(
      `SELECT n.id, n.title FROM notes n
       INNER JOIN note_links nl ON n.id = nl.target_note_id
       WHERE nl.source_note_id = ?`,
      [id]
    );

    // Get Cornell notes if applicable
    let cornellData = null;
    if (note.type === 'cornell') {
      cornellData = await getAsync('SELECT * FROM cornell_notes WHERE note_id = ?', [id]);
    }

    res.json({
      ...note,
      tags,
      backlinks,
      forwardLinks,
      cornell: cornellData
    });
  } catch (error) {
    console.error('Error fetching note:', error);
    res.status(500).json({ error: 'Failed to fetch note' });
  }
});

/**
 * POST /api/notes
 * Create a new note
 */
router.post('/', [
  body('title').notEmpty().withMessage('Title is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { title, content, type = 'standard', folder_id, color, tags = [], cornell } = req.body;
    const id = uuidv4();

    await runAsync(
      `INSERT INTO notes (id, title, content, type, folder_id, color) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, title, content, type, folder_id, color]
    );

    // Add tags
    for (const tagName of tags) {
      let tag = await getAsync('SELECT id FROM note_tags WHERE name = ?', [tagName.toLowerCase()]);
      if (!tag) {
        const tagId = uuidv4();
        await runAsync('INSERT INTO note_tags (id, name) VALUES (?, ?)', [tagId, tagName.toLowerCase()]);
        tag = { id: tagId };
      }
      await runAsync('INSERT OR IGNORE INTO note_tag_relations (note_id, tag_id) VALUES (?, ?)', [id, tag.id]);
    }

    // Add Cornell data if type is cornell
    if (type === 'cornell' && cornell) {
      await runAsync(
        `INSERT INTO cornell_notes (id, note_id, cue_column, notes_column, summary, topic, knowledge_rating) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), id, cornell.cue_column, cornell.notes_column, cornell.summary, cornell.topic, cornell.knowledge_rating || 0]
      );
    }

    const note = await getAsync('SELECT * FROM notes WHERE id = ?', [id]);
    res.status(201).json(note);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

/**
 * PUT /api/notes/:id
 * Update a note
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, folder_id, color, is_pinned, is_archived, tags, cornell } = req.body;

    await runAsync(
      `UPDATE notes SET 
        title = COALESCE(?, title),
        content = COALESCE(?, content),
        folder_id = COALESCE(?, folder_id),
        color = COALESCE(?, color),
        is_pinned = COALESCE(?, is_pinned),
        is_archived = COALESCE(?, is_archived),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [title, content, folder_id, color, is_pinned, is_archived, id]
    );

    // Update tags if provided
    if (tags !== undefined) {
      await runAsync('DELETE FROM note_tag_relations WHERE note_id = ?', [id]);
      for (const tagName of tags) {
        let tag = await getAsync('SELECT id FROM note_tags WHERE name = ?', [tagName.toLowerCase()]);
        if (!tag) {
          const tagId = uuidv4();
          await runAsync('INSERT INTO note_tags (id, name) VALUES (?, ?)', [tagId, tagName.toLowerCase()]);
          tag = { id: tagId };
        }
        await runAsync('INSERT OR IGNORE INTO note_tag_relations (note_id, tag_id) VALUES (?, ?)', [id, tag.id]);
      }
    }

    // Update Cornell data if provided
    if (cornell) {
      const existingCornell = await getAsync('SELECT id FROM cornell_notes WHERE note_id = ?', [id]);
      if (existingCornell) {
        await runAsync(
          `UPDATE cornell_notes SET 
            cue_column = COALESCE(?, cue_column),
            notes_column = COALESCE(?, notes_column),
            summary = COALESCE(?, summary),
            topic = COALESCE(?, topic),
            knowledge_rating = COALESCE(?, knowledge_rating)
          WHERE note_id = ?`,
          [cornell.cue_column, cornell.notes_column, cornell.summary, cornell.topic, cornell.knowledge_rating, id]
        );
      } else {
        await runAsync(
          `INSERT INTO cornell_notes (id, note_id, cue_column, notes_column, summary, topic, knowledge_rating) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [uuidv4(), id, cornell.cue_column, cornell.notes_column, cornell.summary, cornell.topic, cornell.knowledge_rating || 0]
        );
      }
    }

    const note = await getAsync('SELECT * FROM notes WHERE id = ?', [id]);
    res.json(note);
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

/**
 * DELETE /api/notes/:id
 * Delete a note
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await runAsync('DELETE FROM notes WHERE id = ?', [id]);
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

/**
 * POST /api/notes/:id/link
 * Create a link between two notes (Zettelkasten)
 */
router.post('/:id/link', [
  body('target_note_id').notEmpty().withMessage('Target note ID is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { target_note_id, context } = req.body;

    // Verify both notes exist
    const sourceNote = await getAsync('SELECT id FROM notes WHERE id = ?', [id]);
    const targetNote = await getAsync('SELECT id FROM notes WHERE id = ?', [target_note_id]);

    if (!sourceNote || !targetNote) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const linkId = uuidv4();
    await runAsync(
      `INSERT INTO note_links (id, source_note_id, target_note_id, context) VALUES (?, ?, ?, ?)`,
      [linkId, id, target_note_id, context]
    );

    res.status(201).json({ id: linkId, source_note_id: id, target_note_id, context });
  } catch (error) {
    console.error('Error creating link:', error);
    res.status(500).json({ error: 'Failed to create link' });
  }
});

/**
 * DELETE /api/notes/:id/link/:targetId
 * Remove a link between two notes
 */
router.delete('/:id/link/:targetId', async (req, res) => {
  try {
    const { id, targetId } = req.params;
    
    await runAsync(
      'DELETE FROM note_links WHERE source_note_id = ? AND target_note_id = ?',
      [id, targetId]
    );
    
    res.json({ message: 'Link removed successfully' });
  } catch (error) {
    console.error('Error removing link:', error);
    res.status(500).json({ error: 'Failed to remove link' });
  }
});

/**
 * GET /api/notes/zettelkasten/graph
 * Get note link graph for visualization
 */
router.get('/zettelkasten/graph', async (req, res) => {
  try {
    const nodes = await allAsync(
      `SELECT id, title, type FROM notes WHERE is_archived = 0`
    );

    const edges = await allAsync(
      `SELECT source_note_id, target_note_id, context FROM note_links`
    );

    res.json({ nodes, edges });
  } catch (error) {
    console.error('Error fetching graph:', error);
    res.status(500).json({ error: 'Failed to fetch graph' });
  }
});

// ============= TASK-NOTE RELATIONS =============

/**
 * Initialize task_note_relations table
 */
const initTaskNoteRelationsTable = async () => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS task_note_relations (
      id TEXT PRIMARY KEY,
      task_id INTEGER NOT NULL,
      note_id TEXT NOT NULL,
      relation_type TEXT DEFAULT 'reference',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
    )
  `);
  
  // Create index for faster lookups
  await runAsync(`
    CREATE INDEX IF NOT EXISTS idx_task_note_relations_task_id ON task_note_relations(task_id)
  `);
  await runAsync(`
    CREATE INDEX IF NOT EXISTS idx_task_note_relations_note_id ON task_note_relations(note_id)
  `);
};

initTaskNoteRelationsTable().catch(console.error);

/**
 * GET /api/notes/:id/tasks
 * Get tasks linked to a note
 */
router.get('/:id/tasks', async (req, res) => {
  try {
    const { id } = req.params;
    
    const tasks = await allAsync(
      `SELECT t.id, t.title, t.priority, t.description, c.name as column_name, tnr.relation_type, tnr.created_at as linked_at
       FROM task_note_relations tnr
       INNER JOIN tasks t ON tnr.task_id = t.id
       LEFT JOIN columns c ON t.column_id = c.id
       WHERE tnr.note_id = ?
       ORDER BY tnr.created_at DESC`,
      [id]
    );
    
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching linked tasks:', error);
    res.status(500).json({ error: 'Failed to fetch linked tasks' });
  }
});

// ============= DAILY NOTES =============

/**
 * GET /api/notes/daily/:date
 * Get or create daily note for a specific date
 */
router.get('/daily/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const dailyTitle = `Daily Note - ${date}`;
    
    let note = await getAsync('SELECT * FROM notes WHERE title = ?', [dailyTitle]);
    
    if (!note) {
      // Create daily note
      const id = uuidv4();
      const content = `# ${dailyTitle}\n\n## Tasks\n\n- [ ] \n\n## Notes\n\n`;
      
      await runAsync(
        `INSERT INTO notes (id, title, content, type) VALUES (?, ?, ?, ?)`,
        [id, dailyTitle, content, 'standard']
      );
      
      note = await getAsync('SELECT * FROM notes WHERE id = ?', [id]);
    }
    
    res.json(note);
  } catch (error) {
    console.error('Error fetching daily note:', error);
    res.status(500).json({ error: 'Failed to fetch daily note' });
  }
});

/**
 * POST /api/notes/daily
 * Create a daily note for a specific date
 */
router.post('/daily', async (req, res) => {
  try {
    const { date } = req.body;
    const targetDate = date || new Date().toISOString().split('T')[0];
    const dailyTitle = `Daily Note - ${targetDate}`;
    
    // Check if daily note already exists
    let existingNote = await getAsync('SELECT * FROM notes WHERE title = ?', [dailyTitle]);
    if (existingNote) {
      return res.json(existingNote);
    }
    
    // Create daily note
    const id = uuidv4();
    const content = `# ${dailyTitle}\n\n## Tasks\n\n- [ ] \n\n## Notes\n\n`;
    
    await runAsync(
      `INSERT INTO notes (id, title, content, type) VALUES (?, ?, ?, ?)`,
      [id, dailyTitle, content, 'standard']
    );
    
    const note = await getAsync('SELECT * FROM notes WHERE id = ?', [id]);
    res.status(201).json(note);
  } catch (error) {
    console.error('Error creating daily note:', error);
    res.status(500).json({ error: 'Failed to create daily note' });
  }
});

export default router;
