/**
 * @fileoverview TypeScript type definitions for the Kanban backend.
 * Defines interfaces for database entities, API requests/responses, and utility types.
 */

import { Request } from 'express';

// ===== Database Entities =====

export interface Task {
  id: number;
  title: string;
  description?: string | null;
  column_id: number;
  position: number;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  due_date?: string | null;
  created_at: string;
  updated_at: string;
  pinned?: number;
  recurring_interval?: string | null;
  recurring_end_date?: string | null;
  last_recurring_execution?: string | null;
  assigned_to?: number | null;
  swimlane_id?: number | null;
  estimated_hours?: number | null;
  completed_at?: string | null;
  archived?: number;
}

export interface Board {
  id: number;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
  template?: number;
  is_active?: number;
}

export interface Column {
  id: number;
  board_id: number;
  name: string;
  color?: string | null;
  icon?: string | null;
  position: number;
  wip_limit?: number | null;
  is_done?: number;
}

export interface Tag {
  id: number;
  tag_id?: number;
  name: string;
  color: string;
}

export interface Subtask {
  id: number;
  task_id: number;
  title: string;
  completed: number;
  position: number;
}

export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  created_at: string;
  role?: string;
  avatar_url?: string | null;
}

export interface Settings {
  id: number;
  key: string;
  value: string;
  category?: string;
  updated_at: string;
}

export interface Habit {
  id: number;
  name: string;
  description?: string | null;
  frequency: string;
  target_count?: number;
  color?: string | null;
  icon?: string | null;
  created_at: string;
  streak?: number;
}

export interface Routine {
  id: number;
  name: string;
  description?: string | null;
  time_of_day?: string | null;
  days_of_week?: string | null;
  tasks?: string | null;
  created_at: string;
}

export interface PrayerTime {
  id: number;
  date: string;
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  created_at: string;
}

export interface FitnessActivity {
  id: number;
  name: string;
  type: string;
  duration_minutes?: number;
  calories?: number;
  date: string;
  notes?: string | null;
  created_at: string;
}

export interface WorkoutPlan {
  id: number;
  name: string;
  description?: string | null;
  schedule?: string | null;
  created_at: string;
}

export interface MuscleGroup {
  id: number;
  name: string;
  description?: string | null;
}

export interface Exercise {
  id: number;
  name: string;
  muscle_group_id?: number | null;
  equipment?: string | null;
  difficulty?: string | null;
  instructions?: string | null;
}

// ===== Database Result Types =====

export interface DatabaseRunResult {
  lastID: number;
  changes: number;
}

export interface CountResult {
  count: number;
}

// ===== API Request/Response Types =====

export interface TaskFilters {
  boardId?: number;
  columnId?: number;
  swimlaneId?: number;
  assignedTo?: number;
  priority?: string;
  tags?: string;
  search?: string;
  dueBefore?: string;
  dueAfter?: string;
  completed?: boolean;
  archived?: boolean;
}

export interface TaskSearchOptions extends TaskFilters {
  sort?: {
    by?: string;
    direction?: 'ASC' | 'DESC';
  };
  limit?: number;
  offset?: number;
}

export interface BulkUpdateResult {
  updated: number;
  failed: number;
}

export interface BulkDeleteResult {
  deleted: number;
  failed: number;
}

// ===== Utility Types =====

export interface SanitizeOptions {
  maxLength?: number;
  allowedTags?: string[];
  stripTags?: boolean;
}

export interface NumberSanitizeOptions {
  min?: number;
  max?: number;
  integer?: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
}

// ===== Event Bus Types =====

export interface EventPayload {
  [key: string]: unknown;
}

export interface BusEvent {
  id: string;
  resource: string;
  action: string;
  timestamp: string;
  data: EventPayload;
}

export interface EventListener {
  (event: BusEvent): void;
}

// ===== Automation Types =====

export interface AutomationRule {
  id: number;
  name: string;
  trigger_type: string;
  trigger_config?: string | null;
  action_type: string;
  action_config?: string | null;
  enabled: number;
  created_at: string;
}

export interface AutomationContext {
  taskId?: number;
  task?: Task;
  oldTask?: Task;
  boardId?: number;
  columnId?: number;
  [key: string]: unknown;
}

// ===== Webhook Types =====

export interface WebhookConfig {
  id: number;
  url: string;
  events: string;
  enabled: number;
  secret?: string | null;
  created_at: string;
}

// ===== Chronos/Planner Types =====

export interface TimeBlock {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  title: string;
  description?: string | null;
  task_id?: number | null;
  category?: string | null;
  color?: string | null;
}

export interface DailyPlan {
  id: number;
  date: string;
  goals?: string | null;
  notes?: string | null;
  created_at: string;
}

// ===== Express Request Extensions =====

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    role?: string;
  };
}

// Re-export AI types
export * from './ai';
