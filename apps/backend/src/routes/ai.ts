// @ts-nocheck
import express from 'express';
import {  body, validationResult  } from 'express-validator';
import {  runAsync, getAsync, allAsync  } from '../utils/database';
import {  recordTaskHistory  } from '../utils/history';
import {  emitEvent  } from '../services/eventBus';
import {  generateWeeklyReport, generateProductivityAnalytics  } from '../services/reporting';

const router = express.Router();

const normalize = (value) => (value || '').trim();

const findColumnByName = async (name) => {
  return getAsync('SELECT * FROM columns WHERE LOWER(name) = LOWER(?) LIMIT 1', [name]);
};

const findTaskByTitle = async (title) => {
  return getAsync('SELECT * FROM tasks WHERE LOWER(title) = LOWER(?) LIMIT 1', [title]);
};

const getNextPosition = async (columnId) => {
  const row = await getAsync('SELECT MAX(position) as maxPosition FROM tasks WHERE column_id = ?', [columnId]);
  return ((row && row.maxPosition) || 0) + 1;
};

const createTask = async ({ title, description = '', columnId, dueDate, priority = 'medium' }) => {
  const position = await getNextPosition(columnId);
  const insertResult = await runAsync(
    `INSERT INTO tasks (title, description, column_id, position, priority, due_date)
     VALUES (?, ?, ?, ?, ?, ?)` ,
    [title, description, columnId, position, priority, dueDate || null]
  );

  recordTaskHistory(insertResult.lastID, 'created', null, null, null);
  emitEvent('task', 'created', { taskId: insertResult.lastID, columnId });

  return insertResult.lastID;
};

const moveTaskToColumn = async (taskId, columnId) => {
  const position = await getNextPosition(columnId);
  await runAsync(
    'UPDATE tasks SET column_id = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [columnId, position, taskId]
  );
  recordTaskHistory(taskId, 'moved', null, `column:${columnId}`, null);
  emitEvent('task', 'moved', { taskId, columnId });
};

const updateTaskDueDate = async (taskId, dueDate) => {
  await runAsync(
    'UPDATE tasks SET due_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [dueDate, taskId]
  );
  recordTaskHistory(taskId, 'updated', 'due_date', dueDate, null);
  emitEvent('task', 'updated', { taskId, dueDate });
};

const updateTaskPriority = async (taskId, priority) => {
  await runAsync(
    'UPDATE tasks SET priority = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [priority, taskId]
  );
  recordTaskHistory(taskId, 'updated', 'priority', priority, null);
  emitEvent('task', 'updated', { taskId, priority });
};

const parseCreateCommand = (command) => {
  // Enhanced patterns for task creation
  // "Create task "Write release notes" in Done"
  // "Add task "Fix bug" to In Progress with high priority"
  // "Create high priority task "Deploy" in Done"
  
  // Pattern for quoted task names
  let match = command.match(/create (?:a )?(?:(low|medium|high|critical) priority )?task(?: called| named)?\s+"([^"]+)"(?: in| to)\s+(?:column )?(.+?)(?:\s+with (low|medium|high|critical) priority)?$/i);
  if (match) {
    return {
      action: 'create',
      title: normalize(match[2]),
      columnName: normalize(match[3]),
      priority: match[1] || match[4] || 'medium'
    };
  }
  
  // Pattern for add command with quotes
  match = command.match(/add (?:a )?(?:(low|medium|high|critical) priority )?task(?: called| named)?\s+"([^"]+)"(?: in| to)\s+(?:column )?(.+?)(?:\s+with (low|medium|high|critical) priority)?$/i);
  if (match) {
    return {
      action: 'create',
      title: normalize(match[2]),
      columnName: normalize(match[3]),
      priority: match[1] || match[4] || 'medium'
    };
  }
  
  // Simple pattern without quotes
  match = command.match(/create (?:a )?(?:(low|medium|high|critical) priority )?task(?: called| named)?\s+(.+?)(?: in| to)\s+(?:column )?(.+)$/i);
  if (match) {
    return {
      action: 'create',
      title: normalize(match[2]),
      columnName: normalize(match[3]),
      priority: match[1] || 'medium'
    };
  }
  
  return null;
};

const parseMoveCommand = (command) => {
  // Pattern for quoted task names
  let match = command.match(/move task\s+"([^"]+)"\s+to\s+(.+)$/i);
  if (match) {
    return {
      action: 'move',
      title: normalize(match[1]),
      columnName: normalize(match[2])
    };
  }
  
  // Pattern without quotes
  match = command.match(/move task\s+(.+?)\s+to\s+(.+)$/i);
  if (match) {
    return {
      action: 'move',
      title: normalize(match[1]),
      columnName: normalize(match[2])
    };
  }
  
  return null;
};

const parseCompleteCommand = (command) => {
  // Pattern for quoted task names
  let match = command.match(/(?:complete|mark|finish) task\s+"([^"]+)"$/i);
  if (match) {
    return { action: 'complete', title: normalize(match[1]) };
  }
  
  // Pattern without quotes
  match = command.match(/(?:complete|mark|finish) task\s+(.+)$/i);
  if (match) {
    return { action: 'complete', title: normalize(match[1]) };
  }
  
  return null;
};

const parseDueDateCommand = (command) => {
  // Pattern for quoted task names
  let match = command.match(/set due date for task\s+"([^"]+)"\s+to\s+(.+)$/i);
  if (match) {
    return { action: 'set_due', title: normalize(match[1]), dueDate: normalize(match[2]) };
  }
  
  // Pattern without quotes
  match = command.match(/set due date for task\s+(.+?)\s+to\s+(.+)$/i);
  if (match) {
    return { action: 'set_due', title: normalize(match[1]), dueDate: normalize(match[2]) };
  }
  
  return null;
};

const parsePriorityCommand = (command) => {
  // Pattern for quoted task names
  let match = command.match(/set (?:task\s+)?"([^"]+)"\s+(?:priority )?to\s+(low|medium|high|critical)$/i);
  if (match) {
    return { action: 'set_priority', title: normalize(match[1]), priority: match[2].toLowerCase() };
  }
  
  // Pattern without quotes
  match = command.match(/set (?:task\s+)?(.+?)\s+(?:priority )?to\s+(low|medium|high|critical)$/i);
  if (match) {
    return { action: 'set_priority', title: normalize(match[1]), priority: match[2].toLowerCase() };
  }
  
  return null;
};

const parseListCommand = (command) => {
  // "List tasks in To Do"
  // "Show all tasks"
  // "Get tasks in In Progress"
  let match = command.match(/list (?:all )?tasks(?: in\s+(.+))?$/i);
  if (match) {
    return {
      action: 'list',
      columnName: match[1] ? normalize(match[1]) : null
    };
  }
  
  match = command.match(/(?:show|get) (?:all )?tasks(?: in\s+(.+))?$/i);
  if (match) {
    return {
      action: 'list',
      columnName: match[1] ? normalize(match[1]) : null
    };
  }
  
  return null;
};

const parseReportCommand = (command) => {
  // "Show weekly report"
  // "Generate report"
  // "Get analytics"
  if (/(?:show|generate|get)\s+(?:weekly\s+)?(?:report|analytics)/i.test(command)) {
    return { action: 'report' };
  }
  return null;
};

const parseCommand = (command) => {
  return (
    parseCreateCommand(command) ||
    parseMoveCommand(command) ||
    parseCompleteCommand(command) ||
    parseDueDateCommand(command) ||
    parsePriorityCommand(command) ||
    parseListCommand(command) ||
    parseReportCommand(command)
  );
};

router.post('/command', [body('command').notEmpty().withMessage('Command text is required')], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { command } = req.body;
  const parsed = parseCommand(command);

  if (!parsed) {
    return res.status(400).json({ error: 'Unable to understand the command. Try specifying the task title and column.' });
  }

  try {
    // Handle list command
    if (parsed.action === 'list') {
      let query = 'SELECT t.*, c.name as column_name FROM tasks t JOIN columns c ON t.column_id = c.id';
      let params = [];

      if (parsed.columnName) {
        const column = await findColumnByName(parsed.columnName);
        if (!column) {
          return res.status(404).json({ error: `Column "${parsed.columnName}" was not found` });
        }
        query += ' WHERE t.column_id = ?';
        params.push(column.id);
      }

      query += ' ORDER BY t.position ASC';
      const tasks = await allAsync(query, params);

      return res.json({
        action: 'list',
        success: true,
        count: tasks.length,
        tasks,
        message: parsed.columnName 
          ? `Found ${tasks.length} tasks in ${parsed.columnName}`
          : `Found ${tasks.length} total tasks`
      });
    }

    // Handle report command
    if (parsed.action === 'report') {
      const report = await generateWeeklyReport();
      return res.json({
        action: 'report',
        success: true,
        report,
        message: 'Weekly report generated successfully'
      });
    }

    // Handle create command with priority support
    if (parsed.action === 'create') {
      const column = await findColumnByName(parsed.columnName);
      if (!column) {
        return res.status(404).json({ error: `Column "${parsed.columnName}" was not found` });
      }

      const taskId = await createTask({ 
        title: parsed.title, 
        columnId: column.id, 
        priority: parsed.priority 
      });
      const priorityLabel = parsed.priority.charAt(0).toUpperCase() + parsed.priority.slice(1);
      return res.json({
        action: 'create',
        success: true,
        taskId,
        columnId: column.id,
        priority: parsed.priority,
        message: `Created ${priorityLabel} priority task "${parsed.title}" in ${column.name}`
      });
    }

    const task = await findTaskByTitle(parsed.title);
    if (!task) {
      return res.status(404).json({ error: `Task "${parsed.title}" not found` });
    }

    // Handle move command
    if (parsed.action === 'move') {
      const column = await findColumnByName(parsed.columnName);
      if (!column) {
        return res.status(404).json({ error: `Column "${parsed.columnName}" was not found` });
      }

      await moveTaskToColumn(task.id, column.id);
      return res.json({
        action: 'move',
        success: true,
        taskId: task.id,
        columnId: column.id,
        message: `Moved task "${task.title}" to ${column.name}`
      });
    }

    // Handle complete command
    if (parsed.action === 'complete') {
      const doneColumn = await findColumnByName('Done');
      if (!doneColumn) {
        return res.status(400).json({ error: 'A "Done" column is required to complete tasks automatically.' });
      }

      await moveTaskToColumn(task.id, doneColumn.id);
      return res.json({
        action: 'complete',
        success: true,
        taskId: task.id,
        columnId: doneColumn.id,
        message: `Marked task "${task.title}" as complete`
      });
    }

    // Handle due date command
    if (parsed.action === 'set_due') {
      const dueDate = new Date(parsed.dueDate);
      if (Number.isNaN(dueDate.getTime())) {
        return res.status(400).json({ error: 'Due date could not be parsed. Use an ISO date or clear description like "2024-12-01 17:00".' });
      }

      await updateTaskDueDate(task.id, dueDate.toISOString());
      return res.json({
        action: 'set_due',
        success: true,
        taskId: task.id,
        dueDate: dueDate.toISOString(),
        message: `Updated due date for "${task.title}"`
      });
    }

    // Handle priority command
    if (parsed.action === 'set_priority') {
      await updateTaskPriority(task.id, parsed.priority);
      return res.json({
        action: 'set_priority',
        success: true,
        taskId: task.id,
        priority: parsed.priority,
        message: `Updated priority for "${task.title}" to ${parsed.priority}`
      });
    }

    return res.status(400).json({ error: 'Command detected but no action executed.' });
  } catch (error) {
    console.error('AI command execution failed:', error);
    return res.status(500).json({ error: 'Failed to execute command', details: error.message });
  }
});

router.get('/patterns', async (_req, res) => {
  res.json({
    examples: [
      // Task creation
      'Create task "Write release notes" in Done',
      'Add high priority task "Fix critical bug" to In Progress',
      'Create task "Deploy to production" in To Do with high priority',
      
      // Task management
      'Move task "Upgrade dependencies" to In Progress',
      'Complete task "Push to production"',
      'Set due date for task "Write tests" to 2024-11-01 17:00',
      'Set task "Fix bug" priority to high',
      
      // Queries
      'List tasks in To Do',
      'Show all tasks',
      'Get tasks in In Progress',
      
      // Reports
      'Show weekly report',
      'Generate report',
      'Get analytics'
    ],
    description: 'These commands are designed for n8n AI Agent nodes to translate natural language into Kanban operations.',
    supportedActions: [
      'create - Create a new task with optional priority',
      'move - Move a task to a different column',
      'complete - Mark a task as complete',
      'set_due - Set or update a task due date',
      'set_priority - Update task priority (low, medium, high, critical)',
      'list - List tasks (all or filtered by column)',
      'report - Generate weekly report with analytics'
    ]
  });
});

export = router;
