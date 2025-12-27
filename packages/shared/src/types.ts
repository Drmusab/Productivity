/**
 * @fileoverview Common types shared across the Productivity OS
 */

// ===== User Types =====

export interface User {
  id: number;
  username: string;
  email: string;
  role?: string;
  avatar_url?: string | null;
  created_at: string;
}

// ===== Task Types =====

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface Task {
  id: number;
  title: string;
  description?: string | null;
  column_id: number;
  position: number;
  priority?: Priority;
  due_date?: string | null;
  created_at: string;
  updated_at: string;
  pinned?: number;
  assigned_to?: number | null;
  swimlane_id?: number | null;
  estimated_hours?: number | null;
  completed_at?: string | null;
  archived?: number;
  // GTD Classification
  gtd_status?: string;
  context?: string;
  energy_required?: string;
  time_estimate?: number;
  // Eisenhower Matrix
  urgency?: boolean;
  importance?: boolean;
  // Project relation
  project_id?: number | null;
  category?: string;
}

// ===== Board Types =====

export interface Board {
  id: number;
  name: string;
  description?: string | null;
  template?: number;
  created_at: string;
  updated_at: string;
}

export interface Column {
  id: number;
  board_id: number;
  name: string;
  color?: string | null;
  icon?: string | null;
  position: number;
  wip_limit?: number | null;
}

export interface Swimlane {
  id: number;
  board_id: number;
  name: string;
  color?: string;
  position: number;
  collapsed?: boolean;
}

// ===== Tag Types =====

export interface Tag {
  id: number;
  name: string;
  color: string;
}

// ===== Subtask Types =====

export interface Subtask {
  id: number;
  task_id: number;
  title: string;
  completed: number;
  position: number;
}

// ===== Settings Types =====

export interface Settings {
  id: number;
  key: string;
  value: string;
  category?: string;
  updated_at: string;
}

// ===== Pomodoro Types =====

export interface PomodoroSession {
  id: number;
  task_id?: number;
  duration: number;
  break_duration: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  started_at?: string;
  completed_at?: string;
  notes?: string;
  created_by: number;
  created_at: string;
}

export interface PomodoroSettings {
  work_duration: number;
  short_break: number;
  long_break: number;
  cycles_before_long_break: number;
  auto_start_breaks: boolean;
  auto_start_pomodoros: boolean;
  notifications_enabled: boolean;
  ticking_sound_enabled: boolean;
  bell_sound_enabled: boolean;
}

// ===== Thought Organizer Types =====

export type ThoughtCategory = 
  | 'fact'
  | 'interpretation'
  | 'emotion'
  | 'assumption'
  | 'action'
  | 'question';

export interface Thought {
  id: number;
  content: string;
  category: ThoughtCategory;
  source_note_id?: string;
  created_task_id?: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

// ===== P.A.R.A. Method Types =====

export type PARACategory = 'project' | 'area' | 'resource' | 'archive';

export interface PARAItem {
  id: string;
  title: string;
  description?: string;
  category: PARACategory;
  parent_id?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

// ===== API Response Types =====

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

// ===== Error Types =====

export interface ValidationError {
  field: string;
  message: string;
}

export interface AppError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ===== Event Types =====

export interface AppEvent {
  id: string;
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

// ===== IPC Types for Electron =====

export interface IPCRequest<T = unknown> {
  channel: string;
  data?: T;
}

export interface IPCResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ===== Migration Types =====

export interface Migration {
  id: number;
  version: number;
  name: string;
  appliedAt: string;
}

export interface MigrationResult {
  success: boolean;
  migrationsApplied: number;
  currentVersion: number;
  error?: string;
}
