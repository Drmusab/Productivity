/**
 * @fileoverview Task repository for database operations.
 * Implements data access layer for tasks with optimized queries.
 * @module repositories/TaskRepository
 */

import { BaseRepository } from './BaseRepository';
import { getAsync, runAsync, allAsync } from '../utils/database';
import { NotFoundError, DatabaseError } from '../middleware/errorHandler';
import logger from '../utils/logger';

/**
 * Task entity interface
 */
export interface Task {
  id?: number;
  title: string;
  description?: string;
  column_id: number;
  swimlane_id?: number;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  status?: string;
  due_date?: string;
  created_by?: number;
  assigned_to?: number;
  position?: number;
  recurring_rule?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Task with related data (tags, subtasks)
 */
export interface TaskWithDetails extends Task {
  tags?: any[];
  subtasks?: any[];
  column_name?: string;
  swimlane_name?: string;
  created_by_name?: string;
  assigned_to_name?: string;
}

/**
 * Task filter options
 */
export interface TaskFilters {
  boardId?: number;
  columnId?: number;
  swimlaneId?: number;
  assignedTo?: number;
  priority?: string;
  status?: string;
  dueBefore?: string;
  dueAfter?: string;
  tags?: number[];
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Task repository with optimized queries and caching
 */
export class TaskRepository extends BaseRepository<Task> {
  constructor() {
    super('tasks');
  }

  /**
   * Find task with all related data (tags, subtasks, column, swimlane, users)
   * @param id - Task ID
   * @returns Task with related data or undefined
   */
  async findByIdWithDetails(id: number): Promise<TaskWithDetails | undefined> {
    try {
      // Get task with joins for related entities
      const task = await this.executeQueryOne(`
        SELECT 
          t.*,
          c.name as column_name,
          s.name as swimlane_name,
          u1.username as created_by_name,
          u2.username as assigned_to_name
        FROM tasks t
        JOIN columns c ON t.column_id = c.id
        LEFT JOIN swimlanes s ON t.swimlane_id = s.id
        LEFT JOIN users u1 ON t.created_by = u1.id
        LEFT JOIN users u2 ON t.assigned_to = u2.id
        WHERE t.id = ?
      `, [id]);

      if (!task) {
        return undefined;
      }

      // Get tags
      const tags = await this.executeQuery(`
        SELECT tg.*
        FROM task_tags tt
        JOIN tags tg ON tg.id = tt.tag_id
        WHERE tt.task_id = ?
      `, [id]);

      // Get subtasks
      const subtasks = await this.executeQuery(`
        SELECT * FROM subtasks
        WHERE task_id = ?
        ORDER BY position ASC
      `, [id]);

      return {
        ...task,
        tags: tags || [],
        subtasks: subtasks || []
      };
    } catch (error: any) {
      logger.error('Error finding task by ID with details', { id, error: error.message });
      throw new DatabaseError('Failed to fetch task details', error.message);
    }
  }

  /**
   * Find tasks with filters, includes pagination and sorting
   * Optimized to avoid N+1 queries
   * @param filters - Filter options
   * @returns Array of tasks with details
   */
  async findWithFilters(filters: TaskFilters): Promise<TaskWithDetails[]> {
    try {
      const params: any[] = [];
      let query = `
        SELECT 
          t.*,
          c.name as column_name,
          s.name as swimlane_name,
          u1.username as created_by_name,
          u2.username as assigned_to_name
        FROM tasks t
        JOIN columns c ON t.column_id = c.id
        LEFT JOIN swimlanes s ON t.swimlane_id = s.id
        LEFT JOIN users u1 ON t.created_by = u1.id
        LEFT JOIN users u2 ON t.assigned_to = u2.id
        WHERE 1=1
      `;

      // Apply filters
      if (filters.boardId) {
        query += ' AND c.board_id = ?';
        params.push(filters.boardId);
      }

      if (filters.columnId) {
        query += ' AND t.column_id = ?';
        params.push(filters.columnId);
      }

      if (filters.swimlaneId) {
        query += ' AND t.swimlane_id = ?';
        params.push(filters.swimlaneId);
      }

      if (filters.assignedTo) {
        query += ' AND t.assigned_to = ?';
        params.push(filters.assignedTo);
      }

      if (filters.priority) {
        query += ' AND t.priority = ?';
        params.push(filters.priority);
      }

      if (filters.status) {
        query += ' AND t.status = ?';
        params.push(filters.status);
      }

      if (filters.dueBefore) {
        query += ' AND t.due_date <= ?';
        params.push(filters.dueBefore);
      }

      if (filters.dueAfter) {
        query += ' AND t.due_date >= ?';
        params.push(filters.dueAfter);
      }

      if (filters.search) {
        query += ' AND (t.title LIKE ? OR t.description LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm);
      }

      if (filters.tags && filters.tags.length > 0) {
        const placeholders = filters.tags.map(() => '?').join(',');
        query += ` AND t.id IN (
          SELECT task_id FROM task_tags WHERE tag_id IN (${placeholders})
        )`;
        params.push(...filters.tags);
      }

      // Order by position
      query += ' ORDER BY t.position ASC';

      // Pagination
      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
      }

      if (filters.offset) {
        query += ' OFFSET ?';
        params.push(filters.offset);
      }

      const tasks = await this.executeQuery(query, params);

      if (!tasks || tasks.length === 0) {
        return [];
      }

      // Get all task IDs for efficient tag/subtask loading
      const taskIds = tasks.map((t: any) => t.id);
      
      // Load tags for all tasks in a single query (prevents N+1)
      const allTags = await this.getTagsForTasks(taskIds);
      
      // Load subtasks for all tasks in a single query (prevents N+1)
      const allSubtasks = await this.getSubtasksForTasks(taskIds);

      // Attach tags and subtasks to tasks
      return tasks.map((task: any) => ({
        ...task,
        tags: allTags[task.id] || [],
        subtasks: allSubtasks[task.id] || []
      }));
    } catch (error: any) {
      logger.error('Error finding tasks with filters', { filters, error: error.message });
      throw new DatabaseError('Failed to fetch tasks', error.message);
    }
  }

  /**
   * Get tags for multiple tasks (prevents N+1 queries)
   * @param taskIds - Array of task IDs
   * @returns Map of task ID to tags array
   */
  private async getTagsForTasks(taskIds: number[]): Promise<{ [key: number]: any[] }> {
    if (taskIds.length === 0) return {};

    const placeholders = taskIds.map(() => '?').join(',');
    const tagRows = await this.executeQuery(`
      SELECT tt.task_id, tg.*
      FROM task_tags tt
      JOIN tags tg ON tg.id = tt.tag_id
      WHERE tt.task_id IN (${placeholders})
    `, taskIds);

    const tagsByTask: { [key: number]: any[] } = {};
    for (const row of tagRows) {
      if (!tagsByTask[row.task_id]) {
        tagsByTask[row.task_id] = [];
      }
      tagsByTask[row.task_id].push(row);
    }

    return tagsByTask;
  }

  /**
   * Get subtasks for multiple tasks (prevents N+1 queries)
   * @param taskIds - Array of task IDs
   * @returns Map of task ID to subtasks array
   */
  private async getSubtasksForTasks(taskIds: number[]): Promise<{ [key: number]: any[] }> {
    if (taskIds.length === 0) return {};

    const placeholders = taskIds.map(() => '?').join(',');
    const subtaskRows = await this.executeQuery(`
      SELECT * FROM subtasks
      WHERE task_id IN (${placeholders})
      ORDER BY position ASC
    `, taskIds);

    const subtasksByTask: { [key: number]: any[] } = {};
    for (const row of subtaskRows) {
      if (!subtasksByTask[row.task_id]) {
        subtasksByTask[row.task_id] = [];
      }
      subtasksByTask[row.task_id].push(row);
    }

    return subtasksByTask;
  }

  /**
   * Create task with tags and subtasks
   * @param task - Task data
   * @param tagIds - Array of tag IDs
   * @param subtasks - Array of subtask objects
   * @returns Created task ID
   */
  async createWithDetails(
    task: Task,
    tagIds?: number[],
    subtasks?: Array<{ title: string; completed?: boolean }>
  ): Promise<number> {
    try {
      // Create task
      const taskId = await this.create(task);

      // Add tags if provided
      if (tagIds && tagIds.length > 0) {
        await this.addTags(taskId, tagIds);
      }

      // Add subtasks if provided
      if (subtasks && subtasks.length > 0) {
        await this.addSubtasks(taskId, subtasks);
      }

      return taskId;
    } catch (error: any) {
      logger.error('Error creating task with details', { error: error.message });
      throw new DatabaseError('Failed to create task', error.message);
    }
  }

  /**
   * Add tags to a task
   * @param taskId - Task ID
   * @param tagIds - Array of tag IDs
   */
  async addTags(taskId: number, tagIds: number[]): Promise<void> {
    if (tagIds.length === 0) return;

    try {
      const values = tagIds.map(() => '(?, ?)').join(', ');
      const params = tagIds.flatMap(tagId => [taskId, tagId]);
      
      await runAsync(
        `INSERT INTO task_tags (task_id, tag_id) VALUES ${values}`,
        params
      );
    } catch (error: any) {
      logger.error('Error adding tags to task', { taskId, tagIds, error: error.message });
      throw new DatabaseError('Failed to add tags', error.message);
    }
  }

  /**
   * Add subtasks to a task
   * @param taskId - Task ID
   * @param subtasks - Array of subtask objects
   */
  async addSubtasks(
    taskId: number,
    subtasks: Array<{ title: string; completed?: boolean }>
  ): Promise<void> {
    if (subtasks.length === 0) return;

    try {
      for (let i = 0; i < subtasks.length; i++) {
        await runAsync(
          `INSERT INTO subtasks (task_id, title, completed, position) VALUES (?, ?, ?, ?)`,
          [taskId, subtasks[i].title, subtasks[i].completed ? 1 : 0, i]
        );
      }
    } catch (error: any) {
      logger.error('Error adding subtasks to task', { taskId, error: error.message });
      throw new DatabaseError('Failed to add subtasks', error.message);
    }
  }

  /**
   * Get tasks by board ID
   * @param boardId - Board ID
   * @returns Array of tasks
   */
  async findByBoardId(boardId: number): Promise<TaskWithDetails[]> {
    return this.findWithFilters({ boardId });
  }

  /**
   * Get tasks by column ID
   * @param columnId - Column ID
   * @returns Array of tasks
   */
  async findByColumnId(columnId: number): Promise<TaskWithDetails[]> {
    return this.findWithFilters({ columnId });
  }

  /**
   * Get overdue tasks
   * @returns Array of overdue tasks
   */
  async findOverdue(): Promise<TaskWithDetails[]> {
    const now = new Date().toISOString();
    return this.findWithFilters({ 
      dueBefore: now,
      status: 'todo' // Assuming only incomplete tasks can be overdue
    });
  }

  /**
   * Get task count by column
   * @param columnId - Column ID
   * @returns Task count
   */
  async countByColumn(columnId: number): Promise<number> {
    return this.count('column_id = ?', [columnId]);
  }
}

// Export singleton instance
export const taskRepository = new TaskRepository();
