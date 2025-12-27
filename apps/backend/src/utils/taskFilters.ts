/**
 * @fileoverview Advanced search and filter utilities for tasks.
 * Provides flexible filtering, sorting, and search capabilities.
 * @module utils/taskFilters
 */

import {  allAsync  } from './database';

interface TaskSearchFilters {
  search?: string;
  board_id?: number;
  column_id?: number;
  swimlane_id?: number | null;
  priority?: string | string[];
  assigned_to?: number | null;
  created_by?: number;
  due_date_from?: string;
  due_date_to?: string;
  overdue?: boolean | string;
  due_today?: boolean | string;
  due_this_week?: boolean | string;
  gtd_status?: string | string[];
  execution_status?: string | string[];
  urgent?: boolean;
  important?: boolean;
  pinned?: boolean;
  project_id?: number | null;
  category?: string;
  tags?: number[];
  tags_all?: number[];
  sort?: {
    by?: string;
    direction?: string;
  };
  limit?: number;
  offset?: number;
}

/**
 * Build SQL WHERE clause from filter options
 * @param {Object} filters - Filter options
 * @returns {Object} Object with SQL where clause and parameters
 */
function buildWhereClause(filters: TaskSearchFilters) {
  const conditions = [];
  const params = [];

  // Board filter
  if (filters.board_id) {
    conditions.push('t.column_id IN (SELECT id FROM columns WHERE board_id = ?)');
    params.push(filters.board_id);
  }

  // Column filter
  if (filters.column_id) {
    conditions.push('t.column_id = ?');
    params.push(filters.column_id);
  }

  // Swimlane filter
  if (filters.swimlane_id !== undefined) {
    if (filters.swimlane_id === null) {
      conditions.push('t.swimlane_id IS NULL');
    } else {
      conditions.push('t.swimlane_id = ?');
      params.push(filters.swimlane_id);
    }
  }

  // Priority filter
  if (filters.priority) {
    if (Array.isArray(filters.priority)) {
      const placeholders = filters.priority.map(() => '?').join(',');
      conditions.push(`t.priority IN (${placeholders})`);
      params.push(...filters.priority);
    } else {
      conditions.push('t.priority = ?');
      params.push(filters.priority);
    }
  }

  // Assigned user filter
  if (filters.assigned_to !== undefined) {
    if (filters.assigned_to === null) {
      conditions.push('t.assigned_to IS NULL');
    } else {
      conditions.push('t.assigned_to = ?');
      params.push(filters.assigned_to);
    }
  }

  // Created by filter
  if (filters.created_by) {
    conditions.push('t.created_by = ?');
    params.push(filters.created_by);
  }

  // Due date filters
  if (filters.due_date_from) {
    conditions.push('t.due_date >= ?');
    params.push(filters.due_date_from);
  }

  if (filters.due_date_to) {
    conditions.push('t.due_date <= ?');
    params.push(filters.due_date_to);
  }

  // Overdue filter
  if (filters.overdue === true || filters.overdue === 'true') {
    conditions.push('t.due_date < datetime("now") AND t.execution_status != "done"');
  }

  // Due today filter
  if (filters.due_today === true || filters.due_today === 'true') {
    conditions.push('DATE(t.due_date) = DATE("now")');
  }

  // Due this week filter
  if (filters.due_this_week === true || filters.due_this_week === 'true') {
    conditions.push('t.due_date BETWEEN datetime("now") AND datetime("now", "+7 days")');
  }

  // GTD status filter
  if (filters.gtd_status) {
    if (Array.isArray(filters.gtd_status)) {
      const placeholders = filters.gtd_status.map(() => '?').join(',');
      conditions.push(`t.gtd_status IN (${placeholders})`);
      params.push(...filters.gtd_status);
    } else {
      conditions.push('t.gtd_status = ?');
      params.push(filters.gtd_status);
    }
  }

  // Execution status filter
  if (filters.execution_status) {
    if (Array.isArray(filters.execution_status)) {
      const placeholders = filters.execution_status.map(() => '?').join(',');
      conditions.push(`t.execution_status IN (${placeholders})`);
      params.push(...filters.execution_status);
    } else {
      conditions.push('t.execution_status = ?');
      params.push(filters.execution_status);
    }
  }

  // Eisenhower Matrix filters
  if (filters.urgent !== undefined) {
    conditions.push('t.urgency = ?');
    params.push(filters.urgent ? 1 : 0);
  }

  if (filters.important !== undefined) {
    conditions.push('t.importance = ?');
    params.push(filters.important ? 1 : 0);
  }

  // Pinned filter
  if (filters.pinned !== undefined) {
    conditions.push('t.pinned = ?');
    params.push(filters.pinned ? 1 : 0);
  }

  // Project filter
  if (filters.project_id !== undefined) {
    if (filters.project_id === null) {
      conditions.push('t.project_id IS NULL');
    } else {
      conditions.push('t.project_id = ?');
      params.push(filters.project_id);
    }
  }

  // Category filter
  if (filters.category) {
    conditions.push('t.category = ?');
    params.push(filters.category);
  }

  // Text search (title and description)
  if (filters.search) {
    conditions.push('(t.title LIKE ? OR t.description LIKE ?)');
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm);
  }

  // Tags filter (tasks with ANY of the specified tags)
  if (filters.tags && filters.tags.length > 0) {
    const tagPlaceholders = filters.tags.map(() => '?').join(',');
    conditions.push(`t.id IN (
      SELECT task_id FROM task_tags 
      WHERE tag_id IN (${tagPlaceholders})
    )`);
    params.push(...filters.tags);
  }

  // Tags filter (tasks with ALL of the specified tags)
  if (filters.tags_all && filters.tags_all.length > 0) {
    const tagCount = filters.tags_all.length;
    const tagPlaceholders = filters.tags_all.map(() => '?').join(',');
    conditions.push(`t.id IN (
      SELECT task_id FROM task_tags 
      WHERE tag_id IN (${tagPlaceholders})
      GROUP BY task_id
      HAVING COUNT(DISTINCT tag_id) = ?
    )`);
    params.push(...filters.tags_all, tagCount);
  }

  const whereClause = conditions.length > 0 
    ? 'WHERE ' + conditions.join(' AND ')
    : '';

  return { whereClause, params };
}

/**
 * Build ORDER BY clause from sort options
 * @param {Object} sort - Sort options
 * @returns {string} SQL ORDER BY clause
 */
function buildOrderByClause(sort: TaskSearchFilters['sort'] = {}) {
  const validColumns = [
    'title', 'created_at', 'updated_at', 'due_date', 
    'priority', 'position', 'execution_status'
  ];
  
  const orderBy = sort.by || 'position';
  const direction = sort.direction || 'ASC';

  if (!validColumns.includes(orderBy)) {
    return 'ORDER BY t.position ASC';
  }

  const directionUpper = direction.toUpperCase();
  if (directionUpper !== 'ASC' && directionUpper !== 'DESC') {
    return `ORDER BY t.${orderBy} ASC`;
  }

  // Special case for priority - custom order
  if (orderBy === 'priority') {
    const priorityOrder = directionUpper === 'ASC'
      ? "CASE t.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END"
      : "CASE t.priority WHEN 'low' THEN 1 WHEN 'medium' THEN 2 WHEN 'high' THEN 3 WHEN 'critical' THEN 4 END";
    return `ORDER BY ${priorityOrder}`;
  }

  return `ORDER BY t.${orderBy} ${directionUpper}`;
}

/**
 * Search and filter tasks with advanced options
 * @param {Object} options - Filter and search options
 * @returns {Promise<Array>} Filtered tasks
 */
async function searchTasks(options: TaskSearchFilters = {}) {
  const { whereClause, params } = buildWhereClause(options);
  const orderByClause = buildOrderByClause(options.sort);

  const limit = Number.isInteger(options.limit) ? options.limit : null;
  const offset = Number.isInteger(options.offset) ? options.offset : 0;

  const paginationClause = limit ? `LIMIT ${limit} OFFSET ${offset}` : '';

  const sql = `
    SELECT
      t.*,
      u.username as created_by_name,
      au.username as assigned_to_name,
      c.name as column_name,
      c.color as column_color,
      s.name as swimlane_name,
      p.name as project_name
    FROM tasks t
    LEFT JOIN users u ON t.created_by = u.id
    LEFT JOIN users au ON t.assigned_to = au.id
    LEFT JOIN columns c ON t.column_id = c.id
    LEFT JOIN swimlanes s ON t.swimlane_id = s.id
    LEFT JOIN projects p ON t.project_id = p.id
    ${whereClause}
    ${orderByClause}
    ${paginationClause}
  `;

  const tasks = await allAsync(sql, params);

  if (!tasks.length) {
    return tasks;
  }

  const taskIds = tasks.map(task => task.id);
  const placeholders = taskIds.map(() => '?').join(',');

  const tagRows = await allAsync(`
    SELECT tt.task_id, t.id as tag_id, t.name as tag_name, t.color as tag_color
    FROM task_tags tt
    JOIN tags t ON t.id = tt.tag_id
    WHERE tt.task_id IN (${placeholders})
  `, taskIds);

  const subtasks = await allAsync(`
    SELECT * FROM subtasks WHERE task_id IN (${placeholders}) ORDER BY position ASC
  `, taskIds);

  const tagsByTask = tagRows.reduce((acc: Record<number, any[]>, row) => {
    if (!acc[row.task_id]) {
      acc[row.task_id] = [];
    }
    acc[row.task_id].push({
      tag_id: row.tag_id,
      tag_name: row.tag_name,
      tag_color: row.tag_color
    });
    return acc;
  }, {});

  const subtasksByTask = subtasks.reduce((acc: Record<number, any[]>, row) => {
    if (!acc[row.task_id]) {
      acc[row.task_id] = [];
    }
    acc[row.task_id].push(row);
    return acc;
  }, {});

  return tasks.map(task => ({
    ...task,
    tags: tagsByTask[task.id] || [],
    subtasks: subtasksByTask[task.id] || []
  }));
}

/**
 * Get count of tasks matching filters
 * @param {Object} filters - Filter options
 * @returns {Promise<number>} Count of matching tasks
 */
async function countTasks(filters: TaskSearchFilters = {}) {
  const { whereClause, params } = buildWhereClause(filters);

  const sql = `
    SELECT COUNT(*) as count
    FROM tasks t
    ${whereClause}
  `;

  const result = await allAsync(sql, params);
  return result[0]?.count || 0;
}

export { searchTasks };
export { countTasks };
export { buildWhereClause };
export { buildOrderByClause };
export type { TaskSearchFilters };
