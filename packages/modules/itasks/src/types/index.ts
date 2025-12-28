/**
 * @fileoverview Type definitions for iTasks module
 * @module modules/itasks/types
 */

import { z } from 'zod';

/**
 * iTasks priority levels mapped to Eisenhower Matrix
 */
export type ITasksPriority = 'urgent' | 'important' | 'not-urgent' | 'not-important';

/**
 * iTasks status levels
 */
export type ITasksStatus = 'backlog' | 'todo' | 'in progress' | 'done';

/**
 * iTasks labels/categories
 */
export type ITasksLabel = 'bug' | 'feature' | 'documentation' | 'enhancement' | 'question';

/**
 * Eisenhower Matrix quadrants
 */
export type EisenhowerQuadrant = 'do_first' | 'schedule' | 'delegate' | 'eliminate';

/**
 * iTasks task schema
 */
export const iTaskSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().optional(),
  status: z.enum(['backlog', 'todo', 'in progress', 'done']).default('todo'),
  priority: z.enum(['urgent', 'important', 'not-urgent', 'not-important']).default('not-important'),
  label: z.enum(['bug', 'feature', 'documentation', 'enhancement', 'question']).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

/**
 * iTasks task type
 */
export type ITask = z.infer<typeof iTaskSchema>;

/**
 * Eisenhower matrix data structure
 */
export interface EisenhowerMatrixData {
  urgency: boolean;
  importance: boolean;
}

/**
 * Task with Eisenhower mapping
 */
export interface TaskWithEisenhower extends ITask {
  urgency: boolean;
  importance: boolean;
  quadrant: EisenhowerQuadrant;
}

/**
 * Grouped tasks by quadrant
 */
export interface QuadrantTasks {
  do_first: TaskWithEisenhower[];
  schedule: TaskWithEisenhower[];
  delegate: TaskWithEisenhower[];
  eliminate: TaskWithEisenhower[];
}

/**
 * Map iTasks priority to Eisenhower Matrix urgency/importance
 */
export function mapPriorityToEisenhower(priority: ITasksPriority): EisenhowerMatrixData {
  switch (priority) {
    case 'urgent':
      return { urgency: true, importance: true }; // do_first
    case 'important':
      return { urgency: false, importance: true }; // schedule
    case 'not-urgent':
      return { urgency: true, importance: false }; // delegate
    case 'not-important':
      return { urgency: false, importance: false }; // eliminate
    default:
      return { urgency: false, importance: false };
  }
}

/**
 * Calculate Eisenhower quadrant from urgency and importance
 */
export function calculateQuadrant(urgency: boolean, importance: boolean): EisenhowerQuadrant {
  if (importance && urgency) return 'do_first';
  if (importance && !urgency) return 'schedule';
  if (!importance && urgency) return 'delegate';
  return 'eliminate';
}

/**
 * Map Eisenhower matrix back to iTasks priority
 */
export function mapEisenhowerToPriority(urgency: boolean, importance: boolean): ITasksPriority {
  if (importance && urgency) return 'urgent';
  if (importance && !urgency) return 'important';
  if (!importance && urgency) return 'not-urgent';
  return 'not-important';
}
