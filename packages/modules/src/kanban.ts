import { z } from 'zod';
import type { Task, TaskStatus, TaskPriority } from '@productivity-os/core';

/**
 * Kanban Board Module
 * Manages boards, columns, and task organization
 */

export const KanbanBoardSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  columns: z.array(z.string()).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type KanbanBoard = z.infer<typeof KanbanBoardSchema>;

export const KanbanColumnSchema = z.object({
  id: z.string().uuid(),
  boardId: z.string().uuid(),
  name: z.string().min(1),
  color: z.string().optional(),
  wipLimit: z.number().int().positive().optional(),
  order: z.number().int().nonnegative(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type KanbanColumn = z.infer<typeof KanbanColumnSchema>;

export class KanbanModule {
  private boards: Map<string, KanbanBoard> = new Map();
  private columns: Map<string, KanbanColumn> = new Map();
  private columnTasks: Map<string, Task[]> = new Map();

  /**
   * Create a new board
   */
  createBoard(name: string, description?: string): KanbanBoard {
    const board: KanbanBoard = {
      id: crypto.randomUUID(),
      name,
      description,
      columns: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.boards.set(board.id, board);
    return board;
  }

  /**
   * Get board by ID
   */
  getBoard(boardId: string): KanbanBoard | undefined {
    return this.boards.get(boardId);
  }

  /**
   * Get all boards
   */
  getAllBoards(): KanbanBoard[] {
    return Array.from(this.boards.values());
  }

  /**
   * Update board
   */
  updateBoard(boardId: string, updates: Partial<KanbanBoard>): KanbanBoard | undefined {
    const board = this.boards.get(boardId);
    if (!board) return undefined;

    const updated = { ...board, ...updates, updatedAt: new Date() };
    this.boards.set(boardId, updated);
    return updated;
  }

  /**
   * Delete board
   */
  deleteBoard(boardId: string): boolean {
    return this.boards.delete(boardId);
  }

  /**
   * Add column to board
   */
  addColumn(boardId: string, name: string, options?: {
    color?: string;
    wipLimit?: number;
  }): KanbanColumn | undefined {
    const board = this.boards.get(boardId);
    if (!board) return undefined;

    const column: KanbanColumn = {
      id: crypto.randomUUID(),
      boardId,
      name,
      color: options?.color,
      wipLimit: options?.wipLimit,
      order: board.columns.length,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.columns.set(column.id, column);
    board.columns.push(column.id);
    this.columnTasks.set(column.id, []);

    return column;
  }

  /**
   * Get columns for a board
   */
  getBoardColumns(boardId: string): KanbanColumn[] {
    const board = this.boards.get(boardId);
    if (!board) return [];

    return board.columns
      .map((colId) => this.columns.get(colId))
      .filter((col): col is KanbanColumn => col !== undefined)
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Move task to column
   */
  moveTaskToColumn(task: Task, columnId: string): void {
    const column = this.columns.get(columnId);
    if (!column) {
      throw new Error(`Column ${columnId} not found`);
    }

    // Check WIP limit
    const tasksInColumn = this.columnTasks.get(columnId) || [];
    if (column.wipLimit && tasksInColumn.length >= column.wipLimit) {
      throw new Error(`Column ${column.name} has reached its WIP limit`);
    }

    // Remove from old column if exists
    for (const [_colId, tasks] of this.columnTasks.entries()) {
      const index = tasks.findIndex((t) => t.id === task.id);
      if (index !== -1) {
        tasks.splice(index, 1);
      }
    }

    // Add to new column
    tasksInColumn.push(task);
    this.columnTasks.set(columnId, tasksInColumn);
  }

  /**
   * Get tasks in column
   */
  getColumnTasks(columnId: string): Task[] {
    return this.columnTasks.get(columnId) || [];
  }

  /**
   * Get board statistics
   */
  getBoardStats(boardId: string): {
    totalTasks: number;
    tasksByColumn: Record<string, number>;
    tasksByStatus: Record<TaskStatus, number>;
    tasksByPriority: Record<TaskPriority, number>;
  } {
    const columns = this.getBoardColumns(boardId);
    const stats = {
      totalTasks: 0,
      tasksByColumn: {} as Record<string, number>,
      tasksByStatus: {} as Record<TaskStatus, number>,
      tasksByPriority: {} as Record<TaskPriority, number>,
    };

    for (const column of columns) {
      const tasks = this.getColumnTasks(column.id);
      stats.tasksByColumn[column.name] = tasks.length;
      stats.totalTasks += tasks.length;

      for (const task of tasks) {
        stats.tasksByStatus[task.status] = (stats.tasksByStatus[task.status] || 0) + 1;
        stats.tasksByPriority[task.priority] = (stats.tasksByPriority[task.priority] || 0) + 1;
      }
    }

    return stats;
  }
}

export const createKanbanModule = (): KanbanModule => new KanbanModule();
