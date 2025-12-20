/**
 * @fileoverview OmniPlanner routes for integrated GTD & Eisenhower-Kanban task management.
 * Provides endpoints for unified task views, GTD processing, Eisenhower matrix, and projects.
 * @module routes/omniplanner
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { runAsync, getAsync, allAsync } = require('../utils/database');

/**
 * Calculate Eisenhower quadrant based on urgency and importance
 * @param {boolean} urgency - Is the task urgent
 * @param {boolean} importance - Is the task important
 * @returns {string} Quadrant name: 'do_first', 'schedule', 'delegate', 'eliminate'
 */
const calculateQuadrant = (urgency, importance) => {
  if (importance && urgency) return 'do_first';
  if (importance && !urgency) return 'schedule';
  if (!importance && urgency) return 'delegate';
  return 'eliminate';
};

/**
 * Get OmniPlanner dashboard overview
 * Returns inbox count, today's tasks, weekly tasks, and project summaries
 */
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get inbox count (tasks with gtd_status = 'inbox')
    const inboxCount = await getAsync(
      `SELECT COUNT(*) as count FROM tasks WHERE gtd_status = 'inbox'`
    );

    // Get today's tasks (Do First quadrant + tasks due today)
    const todayTasks = await allAsync(
      `SELECT t.*, c.name as column_name, c.color as column_color, p.name as project_name
       FROM tasks t
       LEFT JOIN columns c ON t.column_id = c.id
       LEFT JOIN projects p ON t.project_id = p.id
       WHERE (t.urgency = 1 AND t.importance = 1)
          OR DATE(t.due_date) = DATE(?)
          OR t.execution_status = 'today'
       ORDER BY t.importance DESC, t.urgency DESC, t.priority DESC`,
      [today]
    );

    // Get this week's tasks
    const weekTasks = await allAsync(
      `SELECT t.*, c.name as column_name, c.color as column_color, p.name as project_name
       FROM tasks t
       LEFT JOIN columns c ON t.column_id = c.id
       LEFT JOIN projects p ON t.project_id = p.id
       WHERE t.execution_status = 'this_week'
          OR (DATE(t.due_date) BETWEEN DATE(?) AND DATE(?))
       ORDER BY t.due_date ASC, t.priority DESC`,
      [today, weekFromNow]
    );

    // Get GTD status distribution
    const gtdDistribution = await allAsync(
      `SELECT gtd_status, COUNT(*) as count FROM tasks GROUP BY gtd_status`
    );

    // Get Eisenhower quadrant distribution
    const tasks = await allAsync(`SELECT urgency, importance FROM tasks WHERE gtd_status != 'done'`);
    const quadrantDistribution = {
      do_first: 0,
      schedule: 0,
      delegate: 0,
      eliminate: 0
    };
    tasks.forEach(task => {
      const quadrant = calculateQuadrant(task.urgency, task.importance);
      quadrantDistribution[quadrant]++;
    });

    // Get active projects summary
    const projects = await allAsync(
      `SELECT p.*, 
              (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
              (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND gtd_status = 'done') as completed_count
       FROM projects p
       WHERE p.status = 'active'
       ORDER BY p.created_at DESC
       LIMIT 5`
    );

    // Get waiting for items
    const waitingFor = await allAsync(
      `SELECT t.*, c.name as column_name
       FROM tasks t
       LEFT JOIN columns c ON t.column_id = c.id
       WHERE t.gtd_status = 'waiting_for'
       ORDER BY t.due_date ASC`
    );

    res.json({
      inbox: { count: inboxCount?.count || 0 },
      today: { count: todayTasks.length, tasks: todayTasks },
      thisWeek: { count: weekTasks.length, tasks: weekTasks },
      gtdDistribution,
      quadrantDistribution,
      projects: projects.map(p => ({
        ...p,
        progress: p.task_count > 0 ? Math.round((p.completed_count / p.task_count) * 100) : 0
      })),
      waitingFor: { count: waitingFor.length, tasks: waitingFor }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get tasks by GTD status
 */
router.get('/gtd/:status', async (req, res) => {
  try {
    const { status } = req.params;
    const validStatuses = ['inbox', 'next_actions', 'waiting_for', 'someday_maybe', 'reference', 'done'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid GTD status' });
    }

    const tasks = await allAsync(
      `SELECT t.*, c.name as column_name, c.color as column_color, p.name as project_name
       FROM tasks t
       LEFT JOIN columns c ON t.column_id = c.id
       LEFT JOIN projects p ON t.project_id = p.id
       WHERE t.gtd_status = ?
       ORDER BY t.priority DESC, t.created_at DESC`,
      [status]
    );

    // Get tags for each task
    const tasksWithTags = await Promise.all(tasks.map(async (task) => {
      const tags = await allAsync(
        `SELECT tg.* FROM tags tg JOIN task_tags tt ON tg.id = tt.tag_id WHERE tt.task_id = ?`,
        [task.id]
      );
      return { ...task, tags, quadrant: calculateQuadrant(task.urgency, task.importance) };
    }));

    res.json(tasksWithTags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get tasks by Eisenhower quadrant
 */
router.get('/eisenhower/:quadrant', async (req, res) => {
  try {
    const { quadrant } = req.params;
    
    // Define quadrant conditions with proper parameter values
    const quadrantParams = {
      'do_first': { urgency: 1, importance: 1 },
      'schedule': { urgency: 0, importance: 1 },
      'delegate': { urgency: 1, importance: 0 },
      'eliminate': { urgency: 0, importance: 0 }
    };

    if (!quadrantParams[quadrant]) {
      return res.status(400).json({ error: 'Invalid quadrant' });
    }

    const { urgency, importance } = quadrantParams[quadrant];

    const tasks = await allAsync(
      `SELECT t.*, c.name as column_name, c.color as column_color, p.name as project_name
       FROM tasks t
       LEFT JOIN columns c ON t.column_id = c.id
       LEFT JOIN projects p ON t.project_id = p.id
       WHERE t.urgency = ? AND t.importance = ? AND t.gtd_status != 'done'
       ORDER BY t.due_date ASC, t.priority DESC`,
      [urgency, importance]
    );

    // Get tags for each task
    const tasksWithTags = await Promise.all(tasks.map(async (task) => {
      const tags = await allAsync(
        `SELECT tg.* FROM tags tg JOIN task_tags tt ON tg.id = tt.tag_id WHERE tt.task_id = ?`,
        [task.id]
      );
      return { ...task, tags, quadrant };
    }));

    res.json(tasksWithTags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get Eisenhower matrix view (all quadrants)
 */
router.get('/eisenhower', async (req, res) => {
  try {
    const tasks = await allAsync(
      `SELECT t.*, c.name as column_name, c.color as column_color, p.name as project_name
       FROM tasks t
       LEFT JOIN columns c ON t.column_id = c.id
       LEFT JOIN projects p ON t.project_id = p.id
       WHERE t.gtd_status != 'done'
       ORDER BY t.priority DESC, t.created_at DESC`,
      []
    );

    // Get tags and organize by quadrant
    const matrix = {
      do_first: [],
      schedule: [],
      delegate: [],
      eliminate: []
    };

    await Promise.all(tasks.map(async (task) => {
      const tags = await allAsync(
        `SELECT tg.* FROM tags tg JOIN task_tags tt ON tg.id = tt.tag_id WHERE tt.task_id = ?`,
        [task.id]
      );
      const quadrant = calculateQuadrant(task.urgency, task.importance);
      matrix[quadrant].push({ ...task, tags, quadrant });
    }));

    res.json(matrix);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Process inbox item - move from inbox to appropriate GTD bucket
 */
router.put('/process/:id', [
  body('gtd_status').isIn(['next_actions', 'waiting_for', 'someday_maybe', 'reference', 'done']),
  body('urgency').optional().isBoolean(),
  body('importance').optional().isBoolean(),
  body('context').optional().isString(),
  body('energy_required').optional().isIn(['high', 'medium', 'low']),
  body('time_estimate').optional().isInt({ min: 0 }),
  body('delegated_to').optional().isString(),
  body('project_id').optional().isInt(),
  body('action_date').optional().isISO8601(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const {
      gtd_status,
      urgency,
      importance,
      context,
      energy_required,
      time_estimate,
      delegated_to,
      project_id,
      action_date,
      category
    } = req.body;

    // Build update query dynamically
    const updates = ['gtd_status = ?', 'updated_at = CURRENT_TIMESTAMP'];
    const values = [gtd_status];

    if (urgency !== undefined) {
      updates.push('urgency = ?');
      values.push(urgency ? 1 : 0);
    }
    if (importance !== undefined) {
      updates.push('importance = ?');
      values.push(importance ? 1 : 0);
    }
    if (context !== undefined) {
      updates.push('context = ?');
      values.push(context);
    }
    if (energy_required !== undefined) {
      updates.push('energy_required = ?');
      values.push(energy_required);
    }
    if (time_estimate !== undefined) {
      updates.push('time_estimate = ?');
      values.push(time_estimate);
    }
    if (delegated_to !== undefined) {
      updates.push('delegated_to = ?');
      values.push(delegated_to);
    }
    if (project_id !== undefined) {
      updates.push('project_id = ?');
      values.push(project_id);
    }
    if (action_date !== undefined) {
      updates.push('action_date = ?');
      values.push(action_date);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      values.push(category);
    }

    values.push(id);
    await runAsync(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, values);

    const task = await getAsync(`SELECT * FROM tasks WHERE id = ?`, [id]);
    res.json({ message: 'Task processed successfully', task });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update task execution status (Kanban flow)
 */
router.put('/execution/:id', [
  body('execution_status').isIn(['backlog', 'today', 'this_week', 'in_progress', 'waiting', 'review', 'done']),
  body('progress_percentage').optional().isInt({ min: 0, max: 100 }),
  body('time_spent').optional().isInt({ min: 0 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { execution_status, progress_percentage, time_spent } = req.body;

    const updates = ['execution_status = ?', 'updated_at = CURRENT_TIMESTAMP'];
    const values = [execution_status];

    if (progress_percentage !== undefined) {
      updates.push('progress_percentage = ?');
      values.push(progress_percentage);
    }
    if (time_spent !== undefined) {
      updates.push('time_spent = ?');
      values.push(time_spent);
    }

    // If moving to done, set completion date and update GTD status
    if (execution_status === 'done') {
      updates.push('completion_date = CURRENT_TIMESTAMP');
      updates.push('gtd_status = ?');
      values.push('done');
      updates.push('progress_percentage = ?');
      values.push(100);
    }

    values.push(id);
    await runAsync(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, values);

    const task = await getAsync(`SELECT * FROM tasks WHERE id = ?`, [id]);
    res.json({ message: 'Task execution updated', task });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get tasks by execution status (Kanban board view)
 */
router.get('/kanban', async (req, res) => {
  try {
    const { projectId, category } = req.query;
    
    let whereClause = "WHERE t.gtd_status NOT IN ('inbox', 'someday_maybe', 'reference')";
    const params = [];
    
    if (projectId) {
      whereClause += ' AND t.project_id = ?';
      params.push(projectId);
    }
    if (category) {
      whereClause += ' AND t.category = ?';
      params.push(category);
    }

    const tasks = await allAsync(
      `SELECT t.*, c.name as column_name, c.color as column_color, p.name as project_name
       FROM tasks t
       LEFT JOIN columns c ON t.column_id = c.id
       LEFT JOIN projects p ON t.project_id = p.id
       ${whereClause}
       ORDER BY t.position ASC`,
      params
    );

    // Organize by execution status
    const kanbanBoard = {
      backlog: [],
      today: [],
      this_week: [],
      in_progress: [],
      waiting: [],
      review: [],
      done: []
    };

    await Promise.all(tasks.map(async (task) => {
      const tags = await allAsync(
        `SELECT tg.* FROM tags tg JOIN task_tags tt ON tg.id = tt.tag_id WHERE tt.task_id = ?`,
        [task.id]
      );
      const status = task.execution_status || 'backlog';
      if (kanbanBoard[status]) {
        kanbanBoard[status].push({ ...task, tags, quadrant: calculateQuadrant(task.urgency, task.importance) });
      }
    }));

    res.json(kanbanBoard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Projects CRUD ====================

/**
 * Get all projects
 */
router.get('/projects', async (req, res) => {
  try {
    const { status } = req.query;
    let query = `SELECT p.*, 
                        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
                        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND gtd_status = 'done') as completed_count
                 FROM projects p`;
    const params = [];

    if (status) {
      query += ' WHERE p.status = ?';
      params.push(status);
    }

    query += ' ORDER BY p.created_at DESC';

    const projects = await allAsync(query, params);
    res.json(projects.map(p => ({
      ...p,
      progress: p.task_count > 0 ? Math.round((p.completed_count / p.task_count) * 100) : 0
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get single project with tasks
 */
router.get('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const project = await getAsync(`SELECT * FROM projects WHERE id = ?`, [id]);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const tasks = await allAsync(
      `SELECT t.*, c.name as column_name
       FROM tasks t
       LEFT JOIN columns c ON t.column_id = c.id
       WHERE t.project_id = ?
       ORDER BY t.gtd_status ASC, t.priority DESC`,
      [id]
    );

    const taskCount = tasks.length;
    const completedCount = tasks.filter(t => t.gtd_status === 'done').length;

    res.json({
      ...project,
      tasks,
      task_count: taskCount,
      completed_count: completedCount,
      progress: taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create a new project
 */
router.post('/projects', [
  body('name').notEmpty().withMessage('Project name is required'),
  body('description').optional().isString(),
  body('goal').optional().isString(),
  body('color').optional().isString(),
  body('start_date').optional().isISO8601(),
  body('target_date').optional().isISO8601(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, description, goal, color, start_date, target_date, created_by } = req.body;
    
    const result = await runAsync(
      `INSERT INTO projects (name, description, goal, color, start_date, target_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, description || null, goal || null, color || '#3498db', start_date || null, target_date || null, created_by || null]
    );

    const project = await getAsync(`SELECT * FROM projects WHERE id = ?`, [result.lastID]);
    res.status(201).json({ message: 'Project created successfully', project });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update a project
 */
router.put('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, goal, status, color, start_date, target_date } = req.body;

    const updates = ['updated_at = CURRENT_TIMESTAMP'];
    const values = [];

    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (goal !== undefined) { updates.push('goal = ?'); values.push(goal); }
    if (status !== undefined) { updates.push('status = ?'); values.push(status); }
    if (color !== undefined) { updates.push('color = ?'); values.push(color); }
    if (start_date !== undefined) { updates.push('start_date = ?'); values.push(start_date); }
    if (target_date !== undefined) { updates.push('target_date = ?'); values.push(target_date); }

    if (values.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(id);
    await runAsync(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`, values);

    const project = await getAsync(`SELECT * FROM projects WHERE id = ?`, [id]);
    res.json({ message: 'Project updated successfully', project });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete a project
 */
router.delete('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // First, unlink tasks from the project
    await runAsync(`UPDATE tasks SET project_id = NULL WHERE project_id = ?`, [id]);
    
    await runAsync(`DELETE FROM projects WHERE id = ?`, [id]);
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Contacts CRUD ====================

/**
 * Get all contacts
 */
router.get('/contacts', async (req, res) => {
  try {
    const { type } = req.query;
    let query = `SELECT * FROM contacts`;
    const params = [];

    if (type) {
      query += ' WHERE contact_type = ?';
      params.push(type);
    }

    query += ' ORDER BY name ASC';

    const contacts = await allAsync(query, params);
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create a new contact
 */
router.post('/contacts', [
  body('name').notEmpty().withMessage('Contact name is required'),
  body('email').optional().isEmail(),
  body('phone').optional().isString(),
  body('organization').optional().isString(),
  body('role').optional().isString(),
  body('contact_type').optional().isIn(['personal', 'work', 'vendor']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, email, phone, organization, role, contact_type, notes, created_by } = req.body;
    
    const result = await runAsync(
      `INSERT INTO contacts (name, email, phone, organization, role, contact_type, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email || null, phone || null, organization || null, role || null, contact_type || 'personal', notes || null, created_by || null]
    );

    const contact = await getAsync(`SELECT * FROM contacts WHERE id = ?`, [result.lastID]);
    res.status(201).json({ message: 'Contact created successfully', contact });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update a contact
 */
router.put('/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, organization, role, contact_type, notes } = req.body;

    const updates = ['updated_at = CURRENT_TIMESTAMP'];
    const values = [];

    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (email !== undefined) { updates.push('email = ?'); values.push(email); }
    if (phone !== undefined) { updates.push('phone = ?'); values.push(phone); }
    if (organization !== undefined) { updates.push('organization = ?'); values.push(organization); }
    if (role !== undefined) { updates.push('role = ?'); values.push(role); }
    if (contact_type !== undefined) { updates.push('contact_type = ?'); values.push(contact_type); }
    if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }

    if (values.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(id);
    await runAsync(`UPDATE contacts SET ${updates.join(', ')} WHERE id = ?`, values);

    const contact = await getAsync(`SELECT * FROM contacts WHERE id = ?`, [id]);
    res.json({ message: 'Contact updated successfully', contact });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete a contact
 */
router.delete('/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await runAsync(`DELETE FROM contacts WHERE id = ?`, [id]);
    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get available contexts for GTD
 */
router.get('/contexts', async (req, res) => {
  try {
    const contexts = await allAsync(
      `SELECT DISTINCT context FROM tasks WHERE context IS NOT NULL AND context != '' ORDER BY context`
    );
    
    // Default GTD contexts
    const defaultContexts = [
      '@Computer',
      '@Phone',
      '@Errands',
      '@Home',
      '@Office',
      '@Anywhere',
      '@Read/Review',
      '@Waiting'
    ];
    
    const existingContexts = contexts.map(c => c.context);
    const allContexts = [...new Set([...defaultContexts, ...existingContexts])].sort();
    
    res.json(allContexts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get tasks by context
 */
router.get('/context/:context', async (req, res) => {
  try {
    const { context } = req.params;
    
    const tasks = await allAsync(
      `SELECT t.*, c.name as column_name, c.color as column_color, p.name as project_name
       FROM tasks t
       LEFT JOIN columns c ON t.column_id = c.id
       LEFT JOIN projects p ON t.project_id = p.id
       WHERE t.context = ? AND t.gtd_status = 'next_actions'
       ORDER BY t.energy_required DESC, t.priority DESC`,
      [context]
    );

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Quick capture - add task to inbox
 */
router.post('/capture', [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').optional().isString(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { title, description, created_by } = req.body;
    
    // Get the first column of the first board for column_id (required field)
    const firstColumn = await getAsync(
      `SELECT c.id FROM columns c 
       JOIN boards b ON c.board_id = b.id 
       ORDER BY b.id ASC, c.position ASC 
       LIMIT 1`
    );

    if (!firstColumn) {
      return res.status(400).json({ error: 'No board/column available. Please create a board first.' });
    }

    // Get next position
    const positionResult = await getAsync(
      `SELECT MAX(position) as maxPosition FROM tasks WHERE column_id = ?`,
      [firstColumn.id]
    );
    const position = (positionResult?.maxPosition || 0) + 1;

    const result = await runAsync(
      `INSERT INTO tasks (title, description, column_id, position, gtd_status, created_by)
       VALUES (?, ?, ?, ?, 'inbox', ?)`,
      [title, description || null, firstColumn.id, position, created_by || null]
    );

    const task = await getAsync(`SELECT * FROM tasks WHERE id = ?`, [result.lastID]);
    res.status(201).json({ message: 'Task captured to inbox', task });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get categories
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await allAsync(
      `SELECT DISTINCT category FROM tasks WHERE category IS NOT NULL AND category != '' ORDER BY category`
    );
    
    // Default categories
    const defaultCategories = [
      'work',
      'personal',
      'health',
      'learning',
      'finance',
      'home',
      'general'
    ];
    
    const existingCategories = categories.map(c => c.category);
    const allCategories = [...new Set([...defaultCategories, ...existingCategories])].sort();
    
    res.json(allCategories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
