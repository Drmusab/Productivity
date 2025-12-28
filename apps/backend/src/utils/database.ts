/**
 * @fileoverview Database utility module for SQLite database management.
 * Provides promise-based wrappers for SQLite operations and handles database initialization,
 * schema creation, and default data seeding for the Kanban task management application.
 * @module utils/database
 */

import sqlite3Module from 'sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const sqlite3 = sqlite3Module.verbose();

// Database path configuration
const DEFAULT_DB_PATH = path.join(__dirname, '../../data/kanban.db');
const configuredPath = process.env.DATABASE_PATH || DEFAULT_DB_PATH;
const isInMemoryDatabase = configuredPath === ':memory:' || configuredPath === 'memory';
const resolvedPath = isInMemoryDatabase ? ':memory:' : configuredPath;

// Create data directory if it doesn't exist (for file-based database)
if (!isInMemoryDatabase) {
  const dataDir = path.dirname(resolvedPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Initialize SQLite database connection
const db = new sqlite3.Database(resolvedPath);

// Enable foreign key support for SQLite (required for CASCADE DELETE)
db.run('PRAGMA foreign_keys = ON');

/**
 * Database parameter type - values that can be used as SQL parameters
 */
type DatabaseParam = string | number | boolean | null | undefined;

/**
 * Result of a SQL run statement
 */
interface RunResult {
  lastID: number;
  changes: number;
}

/**
 * Executes a SQL statement that modifies the database (INSERT, UPDATE, DELETE, CREATE, etc.).
 * Returns a promise that resolves with the result object containing lastID and changes.
 * 
 * @async
 * @function runAsync
 * @param {string} sql - The SQL statement to execute
 * @param {Array} [params=[]] - Array of parameters for parameterized queries
 * @returns {Promise<Object>} Promise resolving to result object with lastID and changes properties
 * @throws {Error} Database error if the query fails
 * @example
 * const result = await runAsync('INSERT INTO tasks (title) VALUES (?)', ['New Task']);
 * console.log(result.lastID); // ID of inserted row
 */
const runAsync = (sql: string, params: DatabaseParam[] = []): Promise<RunResult> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
};

/**
 * Executes a SQL query that returns a single row.
 * Returns a promise that resolves with the first row or undefined if no rows match.
 * 
 * @async
 * @function getAsync
 * @param {string} sql - The SQL query to execute
 * @param {Array} [params=[]] - Array of parameters for parameterized queries
 * @returns {Promise<Object|undefined>} Promise resolving to the first row object or undefined
 * @throws {Error} Database error if the query fails
 * @example
 * const task = await getAsync('SELECT * FROM tasks WHERE id = ?', [1]);
 * console.log(task.title);
 */
const getAsync = <T = Record<string, unknown>>(sql: string, params: DatabaseParam[] = []): Promise<T | undefined> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row as T | undefined);
      }
    });
  });
};

/**
 * Executes a SQL query that returns multiple rows.
 * Returns a promise that resolves with an array of row objects.
 * 
 * @async
 * @function allAsync
 * @param {string} sql - The SQL query to execute
 * @param {Array} [params=[]] - Array of parameters for parameterized queries
 * @returns {Promise<Array<Object>>} Promise resolving to an array of row objects
 * @throws {Error} Database error if the query fails
 * @example
 * const tasks = await allAsync('SELECT * FROM tasks WHERE column_id = ?', [1]);
 * tasks.forEach(task => console.log(task.title));
 */
const allAsync = <T = Record<string, unknown>>(sql: string, params: DatabaseParam[] = []): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows as T[]);
      }
    });
  });
};

/**
 * Initializes the database schema by creating all required tables, indexes, and default data.
 * This function is idempotent and safe to call multiple times - it only creates tables
 * that don't already exist. Also seeds default data including demo user, default board,
 * columns, tags, and application settings.
 * 
 * @async
 * @function initDatabase
 * @returns {Promise<void>} Promise that resolves when database initialization is complete
 * @throws {Error} Database error if table creation or data seeding fails
 * @example
 * await initDatabase();
 * console.log('Database initialized successfully');
 */
const initDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      try {
        // Initialize Knowledge Vault tables first
        const { KnowledgeVaultService } = await import('../services/knowledgeVault');
        await KnowledgeVaultService.initializeVault();

        // Users table
        await runAsync(`CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT DEFAULT 'user',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Boards table
        await runAsync(`CREATE TABLE IF NOT EXISTS boards (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          template BOOLEAN DEFAULT 0,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users (id)
        )`);

        // Columns table
        await runAsync(`CREATE TABLE IF NOT EXISTS columns (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          board_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          color TEXT DEFAULT '#3498db',
          icon TEXT,
          position INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (board_id) REFERENCES boards (id) ON DELETE CASCADE
        )`);

        // Swimlanes table
        await runAsync(`CREATE TABLE IF NOT EXISTS swimlanes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          board_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          color TEXT DEFAULT '#ecf0f1',
          position INTEGER NOT NULL,
          collapsed BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (board_id) REFERENCES boards (id) ON DELETE CASCADE
        )`);

        // Projects table for Eisenhower Matrix project management
        await runAsync(`CREATE TABLE IF NOT EXISTS projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          goal TEXT,
          status TEXT DEFAULT 'active',
          progress INTEGER DEFAULT 0,
          color TEXT DEFAULT '#3498db',
          start_date DATETIME,
          target_date DATETIME,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users (id)
        )`);

        // Contacts table for delegation and agenda management
        await runAsync(`CREATE TABLE IF NOT EXISTS contacts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          organization TEXT,
          role TEXT,
          contact_type TEXT DEFAULT 'personal',
          notes TEXT,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users (id)
        )`);

        // Tasks table with GTD and Eisenhower Matrix fields
        await runAsync(`CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          column_id INTEGER NOT NULL,
          swimlane_id INTEGER,
          position INTEGER NOT NULL,
          priority TEXT DEFAULT 'medium',
          due_date DATETIME,
          recurring_rule TEXT,
          pinned BOOLEAN DEFAULT 0,
          created_by INTEGER,
          assigned_to INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          -- GTD Classification fields
          gtd_status TEXT DEFAULT 'inbox',
          context TEXT,
          energy_required TEXT DEFAULT 'medium',
          time_estimate INTEGER,
          delegated_to TEXT,
          -- Eisenhower Matrix fields
          urgency BOOLEAN DEFAULT 0,
          importance BOOLEAN DEFAULT 0,
          action_date DATETIME,
          deadline_date DATETIME,
          -- Execution Tracking fields
          execution_status TEXT DEFAULT 'backlog',
          kanban_column TEXT DEFAULT 'todo',
          progress_percentage INTEGER DEFAULT 0,
          time_spent INTEGER DEFAULT 0,
          completion_date DATETIME,
          -- Categorization fields
          project_id INTEGER,
          category TEXT DEFAULT 'general',
          FOREIGN KEY (column_id) REFERENCES columns (id) ON DELETE CASCADE,
          FOREIGN KEY (swimlane_id) REFERENCES swimlanes (id) ON DELETE SET NULL,
          FOREIGN KEY (created_by) REFERENCES users (id),
          FOREIGN KEY (assigned_to) REFERENCES users (id),
          FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL
        )`);

        // Tags table
        await runAsync(`CREATE TABLE IF NOT EXISTS tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          color TEXT DEFAULT '#95a5a6',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Task tags junction table
        await runAsync(`CREATE TABLE IF NOT EXISTS task_tags (
          task_id INTEGER,
          tag_id INTEGER,
          PRIMARY KEY (task_id, tag_id),
          FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
        )`);

        // Subtasks table
        await runAsync(`CREATE TABLE IF NOT EXISTS subtasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          completed BOOLEAN DEFAULT 0,
          position INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
        )`);

        // Attachments table
        await runAsync(`CREATE TABLE IF NOT EXISTS attachments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id INTEGER NOT NULL,
          filename TEXT NOT NULL,
          original_name TEXT NOT NULL,
          file_path TEXT NOT NULL,
          file_size INTEGER,
          mime_type TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
        )`);

        // Task history table
        await runAsync(`CREATE TABLE IF NOT EXISTS task_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id INTEGER NOT NULL,
          action TEXT NOT NULL,
          old_value TEXT,
          new_value TEXT,
          user_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )`);

        // Integrations table
        await runAsync(`CREATE TABLE IF NOT EXISTS integrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          config TEXT NOT NULL,
          enabled BOOLEAN DEFAULT 1,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users (id)
        )`);

        // Automation rules table
        await runAsync(`CREATE TABLE IF NOT EXISTS automation_rules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          trigger_type TEXT NOT NULL,
          trigger_config TEXT NOT NULL,
          action_type TEXT NOT NULL,
          action_config TEXT NOT NULL,
          enabled BOOLEAN DEFAULT 1,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users (id)
        )`);

        // Automation logs table
        await runAsync(`CREATE TABLE IF NOT EXISTS automation_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          rule_id INTEGER NOT NULL,
          status TEXT NOT NULL,
          message TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (rule_id) REFERENCES automation_rules (id) ON DELETE CASCADE
        )`);

        // Settings table for application configuration
        await runAsync(`CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT UNIQUE NOT NULL,
          value TEXT NOT NULL,
          description TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Habits table for habit tracking
        await runAsync(`CREATE TABLE IF NOT EXISTS habits (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          category TEXT DEFAULT 'general',
          goal_type TEXT DEFAULT 'binary',
          goal_value INTEGER DEFAULT 1,
          goal_unit TEXT,
          frequency TEXT DEFAULT 'daily',
          days_of_week TEXT,
          color TEXT DEFAULT '#3498db',
          icon TEXT,
          position INTEGER DEFAULT 0,
          archived BOOLEAN DEFAULT 0,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users (id)
        )`);

        // Habit logs table for tracking daily habit completions
        await runAsync(`CREATE TABLE IF NOT EXISTS habit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          habit_id INTEGER NOT NULL,
          log_date DATE NOT NULL,
          status TEXT DEFAULT 'pending',
          value REAL DEFAULT 0,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (habit_id) REFERENCES habits (id) ON DELETE CASCADE,
          UNIQUE(habit_id, log_date)
        )`);

        // Daily Planner tables
        // Daily priorities table - stores top 3 priorities for each day
        await runAsync(`CREATE TABLE IF NOT EXISTS daily_priorities (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date DATE NOT NULL,
          position INTEGER NOT NULL,
          title TEXT NOT NULL,
          completed BOOLEAN DEFAULT 0,
          task_id INTEGER,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE SET NULL,
          FOREIGN KEY (created_by) REFERENCES users (id),
          UNIQUE(date, position)
        )`);

        // Daily notes table - brain dump / free-form notes for each day
        await runAsync(`CREATE TABLE IF NOT EXISTS daily_notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date DATE NOT NULL UNIQUE,
          content TEXT NOT NULL DEFAULT '',
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users (id)
        )`);

        // Daily reflections table - end of day reflection responses
        await runAsync(`CREATE TABLE IF NOT EXISTS daily_reflections (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date DATE NOT NULL UNIQUE,
          went_well TEXT DEFAULT '',
          could_improve TEXT DEFAULT '',
          key_takeaways TEXT DEFAULT '',
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users (id)
        )`);

        // Time blocks table - time blocking schedule entries
        await runAsync(`CREATE TABLE IF NOT EXISTS time_blocks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date DATE NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT DEFAULT '',
          color TEXT DEFAULT '#3498db',
          task_id INTEGER,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE SET NULL,
          FOREIGN KEY (created_by) REFERENCES users (id)
        )`);

        // Fitness/Gym Companion tables
        // Muscle groups taxonomy
        await runAsync(`CREATE TABLE IF NOT EXISTS muscle_groups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          parent_id INTEGER,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (parent_id) REFERENCES muscle_groups (id) ON DELETE SET NULL
        )`);

        // Exercise database
        await runAsync(`CREATE TABLE IF NOT EXISTS exercises (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          demonstration_url TEXT,
          primary_muscle_group_id INTEGER,
          equipment TEXT,
          difficulty TEXT DEFAULT 'intermediate',
          custom_notes TEXT,
          is_custom BOOLEAN DEFAULT 0,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (primary_muscle_group_id) REFERENCES muscle_groups (id) ON DELETE SET NULL,
          FOREIGN KEY (created_by) REFERENCES users (id)
        )`);

        // Exercise secondary muscle groups (many-to-many)
        await runAsync(`CREATE TABLE IF NOT EXISTS exercise_muscle_groups (
          exercise_id INTEGER NOT NULL,
          muscle_group_id INTEGER NOT NULL,
          PRIMARY KEY (exercise_id, muscle_group_id),
          FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE,
          FOREIGN KEY (muscle_group_id) REFERENCES muscle_groups (id) ON DELETE CASCADE
        )`);

        // Workout templates (programs/splits)
        await runAsync(`CREATE TABLE IF NOT EXISTS workout_templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          frequency INTEGER DEFAULT 3,
          duration_weeks INTEGER,
          goal TEXT DEFAULT 'general',
          is_active BOOLEAN DEFAULT 1,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users (id)
        )`);

        // Workout days within a template
        await runAsync(`CREATE TABLE IF NOT EXISTS workout_days (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          template_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          day_order INTEGER NOT NULL,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (template_id) REFERENCES workout_templates (id) ON DELETE CASCADE
        )`);

        // Exercises planned for each workout day
        await runAsync(`CREATE TABLE IF NOT EXISTS workout_day_exercises (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          workout_day_id INTEGER NOT NULL,
          exercise_id INTEGER NOT NULL,
          sets INTEGER DEFAULT 3,
          target_reps TEXT DEFAULT '8-12',
          rest_seconds INTEGER DEFAULT 90,
          notes TEXT,
          exercise_order INTEGER NOT NULL,
          FOREIGN KEY (workout_day_id) REFERENCES workout_days (id) ON DELETE CASCADE,
          FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE
        )`);

        // Workout sessions (actual workout logs)
        await runAsync(`CREATE TABLE IF NOT EXISTS workout_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          template_id INTEGER,
          workout_day_id INTEGER,
          date DATE NOT NULL,
          start_time DATETIME,
          end_time DATETIME,
          duration_minutes INTEGER,
          notes TEXT,
          energy_level INTEGER DEFAULT 3,
          overall_feeling INTEGER DEFAULT 3,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (template_id) REFERENCES workout_templates (id) ON DELETE SET NULL,
          FOREIGN KEY (workout_day_id) REFERENCES workout_days (id) ON DELETE SET NULL,
          FOREIGN KEY (created_by) REFERENCES users (id)
        )`);

        // Exercise logs (set data within a session)
        await runAsync(`CREATE TABLE IF NOT EXISTS exercise_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id INTEGER NOT NULL,
          exercise_id INTEGER NOT NULL,
          set_number INTEGER NOT NULL,
          reps INTEGER,
          weight REAL,
          rpe INTEGER,
          rest_seconds INTEGER,
          notes TEXT,
          is_pr BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES workout_sessions (id) ON DELETE CASCADE,
          FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE
        )`);

        // Personal records tracking
        await runAsync(`CREATE TABLE IF NOT EXISTS personal_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          exercise_id INTEGER NOT NULL,
          record_type TEXT DEFAULT 'weight',
          value REAL NOT NULL,
          reps INTEGER,
          date DATE NOT NULL,
          session_id INTEGER,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE,
          FOREIGN KEY (session_id) REFERENCES workout_sessions (id) ON DELETE SET NULL,
          FOREIGN KEY (created_by) REFERENCES users (id)
        )`);

        // Body measurements
        await runAsync(`CREATE TABLE IF NOT EXISTS body_measurements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date DATE NOT NULL,
          weight REAL,
          body_fat_percent REAL,
          chest REAL,
          waist REAL,
          hips REAL,
          left_arm REAL,
          right_arm REAL,
          left_thigh REAL,
          right_thigh REAL,
          notes TEXT,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users (id)
        )`);

        // Fitness user profile (initial entry for BMI/BMR calculations)
        await runAsync(`CREATE TABLE IF NOT EXISTS fitness_profile (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER UNIQUE,
          height REAL,
          age INTEGER,
          gender TEXT,
          activity_level TEXT DEFAULT 'moderate',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )`);

        // Fitness goals
        await runAsync(`CREATE TABLE IF NOT EXISTS fitness_goals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          goal_type TEXT NOT NULL,
          target_value REAL,
          target_description TEXT,
          deadline DATE,
          current_progress REAL DEFAULT 0,
          status TEXT DEFAULT 'active',
          exercise_id INTEGER,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE SET NULL,
          FOREIGN KEY (created_by) REFERENCES users (id)
        )`);

        // Al-Falah Islamic Habit Tracker tables
        // Daily prayer records - tracks the five daily prayers
        await runAsync(`CREATE TABLE IF NOT EXISTS prayer_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date DATE NOT NULL,
          prayer_type TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          on_time BOOLEAN DEFAULT 0,
          with_jamaah BOOLEAN DEFAULT 0,
          sunnah_before BOOLEAN DEFAULT 0,
          sunnah_after BOOLEAN DEFAULT 0,
          notes TEXT,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users (id),
          UNIQUE(date, prayer_type, created_by)
        )`);

        // Qada (missed prayer) log - tracks missed prayers to make up
        await runAsync(`CREATE TABLE IF NOT EXISTS qada_prayers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          prayer_type TEXT NOT NULL,
          original_date DATE,
          status TEXT DEFAULT 'pending',
          completed_date DATE,
          priority INTEGER DEFAULT 0,
          notes TEXT,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users (id)
        )`);

        // Quran recitation logs
        await runAsync(`CREATE TABLE IF NOT EXISTS quran_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date DATE NOT NULL,
          recitation_type TEXT DEFAULT 'tilawah',
          surah_start TEXT,
          surah_end TEXT,
          ayah_start INTEGER,
          ayah_end INTEGER,
          juz INTEGER,
          pages REAL,
          duration_minutes INTEGER,
          notes TEXT,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users (id)
        )`);

        // Memorization (Hifz) tracker
        await runAsync(`CREATE TABLE IF NOT EXISTS quran_memorization (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          surah TEXT NOT NULL,
          ayah_start INTEGER NOT NULL,
          ayah_end INTEGER NOT NULL,
          status TEXT DEFAULT 'in_progress',
          last_revision DATE,
          next_revision DATE,
          strength INTEGER DEFAULT 1,
          notes TEXT,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users (id)
        )`);

        // Daily dhikr logs
        await runAsync(`CREATE TABLE IF NOT EXISTS dhikr_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date DATE NOT NULL,
          dhikr_type TEXT NOT NULL,
          count INTEGER DEFAULT 0,
          target INTEGER DEFAULT 0,
          completed BOOLEAN DEFAULT 0,
          notes TEXT,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users (id),
          UNIQUE(date, dhikr_type, created_by)
        )`);

        // Dua journal
        await runAsync(`CREATE TABLE IF NOT EXISTS dua_journal (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          dua_text TEXT,
          category TEXT DEFAULT 'personal',
          is_recurring BOOLEAN DEFAULT 0,
          status TEXT DEFAULT 'active',
          date_logged DATE NOT NULL,
          date_answered DATE,
          notes TEXT,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users (id)
        )`);

        // Fasting records
        await runAsync(`CREATE TABLE IF NOT EXISTS fasting_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date DATE NOT NULL,
          fast_type TEXT DEFAULT 'voluntary',
          status TEXT DEFAULT 'planned',
          notes TEXT,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users (id),
          UNIQUE(date, created_by)
        )`);

        // Friday (Jumu'ah) checklist
        await runAsync(`CREATE TABLE IF NOT EXISTS jumuah_checklist (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date DATE NOT NULL,
          ghusl BOOLEAN DEFAULT 0,
          early_arrival BOOLEAN DEFAULT 0,
          sunnah_prayers BOOLEAN DEFAULT 0,
          surah_kahf BOOLEAN DEFAULT 0,
          extra_dua BOOLEAN DEFAULT 0,
          special_adhkar BOOLEAN DEFAULT 0,
          notes TEXT,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users (id),
          UNIQUE(date, created_by)
        )`);

        // Islamic settings (prayer calculation method, location, etc.)
        await runAsync(`CREATE TABLE IF NOT EXISTS islamic_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER UNIQUE,
          calculation_method TEXT DEFAULT 'MWL',
          latitude REAL,
          longitude REAL,
          timezone TEXT,
          notifications_enabled BOOLEAN DEFAULT 1,
          reminder_minutes INTEGER DEFAULT 15,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )`);

        // Daily reflection for spiritual journaling
        await runAsync(`CREATE TABLE IF NOT EXISTS spiritual_reflections (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date DATE NOT NULL,
          prayer_focus TEXT,
          gratitude TEXT,
          improvements TEXT,
          key_insights TEXT,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users (id),
          UNIQUE(date, created_by)
        )`);

        // Obsidian-Style Notes System tables
        // Notes table - Markdown-based knowledge nodes
        await runAsync(`CREATE TABLE IF NOT EXISTS obsidian_notes (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          folder_path TEXT,
          content_markdown TEXT NOT NULL DEFAULT '',
          frontmatter TEXT,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users (id)
        )`);

        // Note links table - Represents links parsed from note content
        await runAsync(`CREATE TABLE IF NOT EXISTS obsidian_note_links (
          id TEXT PRIMARY KEY,
          source_note_id TEXT NOT NULL,
          target_note_id TEXT,
          unresolved_target TEXT,
          link_type TEXT NOT NULL DEFAULT 'wikilink',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (source_note_id) REFERENCES obsidian_notes (id) ON DELETE CASCADE,
          FOREIGN KEY (target_note_id) REFERENCES obsidian_notes (id) ON DELETE SET NULL
        )`);

        // Task-Note relations table - Connects tasks with notes
        await runAsync(`CREATE TABLE IF NOT EXISTS obsidian_task_note_relations (
          id TEXT PRIMARY KEY,
          task_id INTEGER NOT NULL,
          note_id TEXT NOT NULL,
          relation_type TEXT NOT NULL DEFAULT 'reference',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
          FOREIGN KEY (note_id) REFERENCES obsidian_notes (id) ON DELETE CASCADE
        )`);

        // Chronos Time Intelligence System tables
        // Time blocks table - planned time blocks for activities
        await runAsync(`CREATE TABLE IF NOT EXISTS chronos_time_blocks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          date DATE NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT NOT NULL,
          color TEXT DEFAULT '#3498db',
          category TEXT DEFAULT 'general',
          task_id INTEGER,
          project_id INTEGER,
          habit_id INTEGER,
          is_template BOOLEAN DEFAULT 0,
          template_name TEXT,
          recurrence_rule TEXT,
          buffer_before INTEGER DEFAULT 0,
          buffer_after INTEGER DEFAULT 0,
          energy_required TEXT DEFAULT 'medium',
          focus_level TEXT DEFAULT 'normal',
          location TEXT,
          notes TEXT,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE SET NULL,
          FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL,
          FOREIGN KEY (habit_id) REFERENCES habits (id) ON DELETE SET NULL,
          FOREIGN KEY (created_by) REFERENCES users (id)
        )`);

        // Time sessions table - actual time tracking records
        await runAsync(`CREATE TABLE IF NOT EXISTS chronos_time_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          time_block_id INTEGER,
          task_id INTEGER,
          project_id INTEGER,
          title TEXT NOT NULL,
          description TEXT,
          category TEXT DEFAULT 'general',
          start_time DATETIME NOT NULL,
          end_time DATETIME,
          pause_time DATETIME,
          total_duration INTEGER DEFAULT 0,
          pause_duration INTEGER DEFAULT 0,
          status TEXT DEFAULT 'active',
          session_type TEXT DEFAULT 'manual',
          energy_level INTEGER DEFAULT 3,
          focus_quality INTEGER DEFAULT 3,
          productivity_rating INTEGER DEFAULT 3,
          interruptions INTEGER DEFAULT 0,
          notes TEXT,
          tags TEXT,
          is_billable BOOLEAN DEFAULT 0,
          is_pomodoro BOOLEAN DEFAULT 0,
          pomodoro_count INTEGER DEFAULT 0,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (time_block_id) REFERENCES chronos_time_blocks (id) ON DELETE SET NULL,
          FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE SET NULL,
          FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL,
          FOREIGN KEY (created_by) REFERENCES users (id)
        )`);

        // Time templates table - recurring time block patterns
        await runAsync(`CREATE TABLE IF NOT EXISTS chronos_time_templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          title TEXT NOT NULL,
          start_time TEXT NOT NULL,
          duration INTEGER NOT NULL,
          color TEXT DEFAULT '#3498db',
          category TEXT DEFAULT 'general',
          recurrence_pattern TEXT NOT NULL,
          days_of_week TEXT,
          is_active BOOLEAN DEFAULT 1,
          buffer_before INTEGER DEFAULT 0,
          buffer_after INTEGER DEFAULT 0,
          energy_required TEXT DEFAULT 'medium',
          focus_level TEXT DEFAULT 'normal',
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users (id)
        )`);

        // Time analytics table - computed metrics and insights
        await runAsync(`CREATE TABLE IF NOT EXISTS chronos_analytics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          date DATE NOT NULL,
          metric_type TEXT NOT NULL,
          metric_value REAL NOT NULL,
          category TEXT,
          metadata TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id),
          UNIQUE(user_id, date, metric_type, category)
        )`);

        // Pomodoro sessions table - dedicated Pomodoro tracking
        await runAsync(`CREATE TABLE IF NOT EXISTS chronos_pomodoro_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          time_session_id INTEGER,
          task_id INTEGER,
          duration INTEGER DEFAULT 25,
          break_duration INTEGER DEFAULT 5,
          status TEXT DEFAULT 'active',
          start_time DATETIME NOT NULL,
          end_time DATETIME,
          completed BOOLEAN DEFAULT 0,
          interrupted BOOLEAN DEFAULT 0,
          notes TEXT,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (time_session_id) REFERENCES chronos_time_sessions (id) ON DELETE CASCADE,
          FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE SET NULL,
          FOREIGN KEY (created_by) REFERENCES users (id)
        )`);

        // Focus sessions table - dedicated focus time tracking
        await runAsync(`CREATE TABLE IF NOT EXISTS chronos_focus_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          goal TEXT,
          start_time DATETIME NOT NULL,
          end_time DATETIME,
          planned_duration INTEGER NOT NULL,
          actual_duration INTEGER,
          focus_mode_enabled BOOLEAN DEFAULT 1,
          distractions_blocked INTEGER DEFAULT 0,
          quality_rating INTEGER DEFAULT 3,
          achievements TEXT,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users (id)
        )`);

        // Break records table - tracking breaks and well-being
        await runAsync(`CREATE TABLE IF NOT EXISTS chronos_break_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          time_session_id INTEGER,
          break_type TEXT DEFAULT 'short',
          start_time DATETIME NOT NULL,
          end_time DATETIME,
          duration INTEGER,
          activity TEXT,
          hydration BOOLEAN DEFAULT 0,
          movement BOOLEAN DEFAULT 0,
          mindfulness BOOLEAN DEFAULT 0,
          notes TEXT,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (time_session_id) REFERENCES chronos_time_sessions (id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users (id)
        )`);

        // Chronos settings table - user preferences for time management
        await runAsync(`CREATE TABLE IF NOT EXISTS chronos_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER UNIQUE NOT NULL,
          work_hours_start TEXT DEFAULT '09:00',
          work_hours_end TEXT DEFAULT '17:00',
          default_block_duration INTEGER DEFAULT 60,
          default_break_duration INTEGER DEFAULT 15,
          pomodoro_work_duration INTEGER DEFAULT 25,
          pomodoro_break_duration INTEGER DEFAULT 5,
          pomodoro_long_break INTEGER DEFAULT 15,
          auto_schedule_enabled BOOLEAN DEFAULT 0,
          conflict_warnings_enabled BOOLEAN DEFAULT 1,
          buffer_time_enabled BOOLEAN DEFAULT 1,
          default_buffer_minutes INTEGER DEFAULT 5,
          focus_mode_default BOOLEAN DEFAULT 0,
          break_reminders_enabled BOOLEAN DEFAULT 1,
          idle_timeout_minutes INTEGER DEFAULT 5,
          timezone TEXT DEFAULT 'UTC',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )`);

        // Create indexes for better performance
        await runAsync('CREATE INDEX IF NOT EXISTS idx_tasks_column_id ON tasks(column_id)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_tasks_swimlane_id ON tasks(swimlane_id)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_task_history_task_id ON task_history(task_id)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_automation_logs_rule_id ON automation_logs(rule_id)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_id ON habit_logs(habit_id)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_habit_logs_log_date ON habit_logs(log_date)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_daily_priorities_date ON daily_priorities(date)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_daily_notes_date ON daily_notes(date)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_daily_reflections_date ON daily_reflections(date)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_time_blocks_date ON time_blocks(date)');
        // Obsidian notes indexes
        await runAsync('CREATE INDEX IF NOT EXISTS idx_obsidian_notes_title ON obsidian_notes(title)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_obsidian_notes_folder_path ON obsidian_notes(folder_path)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_obsidian_notes_created_by ON obsidian_notes(created_by)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_obsidian_note_links_source ON obsidian_note_links(source_note_id)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_obsidian_note_links_target ON obsidian_note_links(target_note_id)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_obsidian_note_links_type ON obsidian_note_links(link_type)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_obsidian_task_note_relations_task ON obsidian_task_note_relations(task_id)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_obsidian_task_note_relations_note ON obsidian_task_note_relations(note_id)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_obsidian_task_note_relations_type ON obsidian_task_note_relations(relation_type)');
        // Fitness indexes
        await runAsync('CREATE INDEX IF NOT EXISTS idx_exercises_muscle_group ON exercises(primary_muscle_group_id)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_workout_sessions_date ON workout_sessions(date)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_exercise_logs_session ON exercise_logs(session_id)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_exercise_logs_exercise ON exercise_logs(exercise_id)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_personal_records_exercise ON personal_records(exercise_id)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_body_measurements_date ON body_measurements(date)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_fitness_goals_status ON fitness_goals(status)');
        // Islamic tracker indexes
        await runAsync('CREATE INDEX IF NOT EXISTS idx_prayer_records_date ON prayer_records(date)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_prayer_records_type ON prayer_records(prayer_type)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_quran_logs_date ON quran_logs(date)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_dhikr_logs_date ON dhikr_logs(date)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_fasting_records_date ON fasting_records(date)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_jumuah_checklist_date ON jumuah_checklist(date)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_spiritual_reflections_date ON spiritual_reflections(date)');
        // Eisenhower Matrix indexes - GTD and Eisenhower
        await runAsync('CREATE INDEX IF NOT EXISTS idx_tasks_gtd_status ON tasks(gtd_status)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_tasks_execution_status ON tasks(execution_status)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_tasks_urgency_importance ON tasks(urgency, importance)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(contact_type)');
        // Chronos indexes
        await runAsync('CREATE INDEX IF NOT EXISTS idx_chronos_time_blocks_date ON chronos_time_blocks(date)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_chronos_time_blocks_category ON chronos_time_blocks(category)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_chronos_time_blocks_task ON chronos_time_blocks(task_id)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_chronos_time_sessions_start ON chronos_time_sessions(start_time)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_chronos_time_sessions_status ON chronos_time_sessions(status)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_chronos_time_sessions_task ON chronos_time_sessions(task_id)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_chronos_analytics_user_date ON chronos_analytics(user_id, date)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_chronos_analytics_metric ON chronos_analytics(metric_type)');
        
        // Additional composite indexes for performance optimization
        await runAsync('CREATE INDEX IF NOT EXISTS idx_tasks_column_position ON tasks(column_id, position)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_tasks_priority_due ON tasks(priority, due_date)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status ON tasks(assigned_to, execution_status)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_boards_created_by ON boards(created_by)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_columns_board_position ON columns(board_id, position)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_swimlanes_board_position ON swimlanes(board_id, position)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_task_tags_tag ON task_tags(tag_id)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_subtasks_task_position ON subtasks(task_id, position)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_attachments_task ON attachments(task_id)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_integrations_type_enabled ON integrations(type, enabled)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_automation_rules_enabled ON automation_rules(enabled)');

        // Ensure a default demo user exists for first-run experience
        const userCount = await getAsync('SELECT COUNT(*) as count FROM users');
        if (!userCount || userCount.count === 0) {
          const passwordHash = bcrypt.hashSync('demo123', 10);
          await runAsync(
            'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
            ['demo', 'demo@example.com', passwordHash, 'admin']
          );
        }

        // Insert default board and metadata if none exist
        const boardCount = await getAsync('SELECT COUNT(*) as count FROM boards');
        if (!boardCount || boardCount.count === 0) {
          const boardResult = await runAsync(
            'INSERT INTO boards (name, description, template) VALUES (?, ?, ?)',
            ['Default Board', 'A basic Kanban board', 0]
          );

          const boardId = boardResult.lastID;

          const columns = [
            { name: 'To Do', color: '#e74c3c', icon: 'clipboard-list', position: 0 },
            { name: 'In Progress', color: '#f39c12', icon: 'spinner', position: 1 },
            { name: 'Review', color: '#3498db', icon: 'eye', position: 2 },
            { name: 'Done', color: '#2ecc71', icon: 'check-circle', position: 3 }
          ];

          for (const column of columns) {
            await runAsync(
              'INSERT INTO columns (board_id, name, color, icon, position) VALUES (?, ?, ?, ?, ?)',
              [boardId, column.name, column.color, column.icon, column.position]
            );
          }

          const tags = [
            { name: 'Bug', color: '#e74c3c' },
            { name: 'Feature', color: '#2ecc71' },
            { name: 'Enhancement', color: '#3498db' },
            { name: 'Urgent', color: '#e67e22' }
          ];

          for (const tag of tags) {
            await runAsync('INSERT INTO tags (name, color) VALUES (?, ?)', [tag.name, tag.color]);
          }
        }

        // Insert default settings if none exist
        const settingsCount = await getAsync('SELECT COUNT(*) as count FROM settings');
        if (!settingsCount || settingsCount.count === 0) {
          const defaultSettings = [
            { key: 'report_schedule_day', value: '1', description: 'Day of week for weekly report (0=Sunday, 1=Monday, etc.)' },
            { key: 'report_schedule_hour', value: '9', description: 'Hour of day for weekly report (0-23)' },
            { key: 'report_schedule_minute', value: '0', description: 'Minute of hour for weekly report (0, 15, 30, 45)' }
          ];

          for (const setting of defaultSettings) {
            await runAsync(
              'INSERT INTO settings (key, value, description) VALUES (?, ?, ?)',
              [setting.key, setting.value, setting.description]
            );
          }
        }

        // Insert default muscle groups and exercises if none exist
        const muscleGroupCount = await getAsync('SELECT COUNT(*) as count FROM muscle_groups');
        if (!muscleGroupCount || muscleGroupCount.count === 0) {
          // Main muscle groups
          const mainGroups = [
            { name: 'Chest', description: 'Pectoral muscles' },
            { name: 'Back', description: 'Upper and lower back muscles' },
            { name: 'Legs', description: 'Quadriceps, hamstrings, glutes, calves' },
            { name: 'Shoulders', description: 'Deltoid muscles' },
            { name: 'Arms', description: 'Biceps, triceps, forearms' },
            { name: 'Core', description: 'Abdominals and obliques' },
            { name: 'Cardio', description: 'Cardiovascular exercises' }
          ];

          const groupIds: Record<string, number> = {};
          for (const group of mainGroups) {
            const result = await runAsync(
              'INSERT INTO muscle_groups (name, description) VALUES (?, ?)',
              [group.name, group.description]
            );
            groupIds[group.name] = result.lastID;
          }

          // Sub-groups
          const subGroups = [
            { name: 'Quadriceps', parent: 'Legs' },
            { name: 'Hamstrings', parent: 'Legs' },
            { name: 'Glutes', parent: 'Legs' },
            { name: 'Calves', parent: 'Legs' },
            { name: 'Biceps', parent: 'Arms' },
            { name: 'Triceps', parent: 'Arms' },
            { name: 'Forearms', parent: 'Arms' },
            { name: 'Front Deltoids', parent: 'Shoulders' },
            { name: 'Side Deltoids', parent: 'Shoulders' },
            { name: 'Rear Deltoids', parent: 'Shoulders' },
            { name: 'Upper Back', parent: 'Back' },
            { name: 'Lats', parent: 'Back' },
            { name: 'Lower Back', parent: 'Back' },
            { name: 'Upper Chest', parent: 'Chest' },
            { name: 'Lower Chest', parent: 'Chest' },
            { name: 'Abs', parent: 'Core' },
            { name: 'Obliques', parent: 'Core' }
          ];

          for (const sub of subGroups) {
            await runAsync(
              'INSERT INTO muscle_groups (name, parent_id, description) VALUES (?, ?, ?)',
              [sub.name, groupIds[sub.parent], `Part of ${sub.parent}`]
            );
          }

          // Default exercises
          const defaultExercises = [
            { name: 'Bench Press', muscle: 'Chest', equipment: 'Barbell', difficulty: 'intermediate' },
            { name: 'Incline Bench Press', muscle: 'Chest', equipment: 'Barbell', difficulty: 'intermediate' },
            { name: 'Dumbbell Flyes', muscle: 'Chest', equipment: 'Dumbbells', difficulty: 'beginner' },
            { name: 'Push-ups', muscle: 'Chest', equipment: 'Bodyweight', difficulty: 'beginner' },
            { name: 'Deadlift', muscle: 'Back', equipment: 'Barbell', difficulty: 'advanced' },
            { name: 'Bent Over Rows', muscle: 'Back', equipment: 'Barbell', difficulty: 'intermediate' },
            { name: 'Pull-ups', muscle: 'Back', equipment: 'Bodyweight', difficulty: 'intermediate' },
            { name: 'Lat Pulldown', muscle: 'Back', equipment: 'Cable Machine', difficulty: 'beginner' },
            { name: 'Squat', muscle: 'Legs', equipment: 'Barbell', difficulty: 'intermediate' },
            { name: 'Leg Press', muscle: 'Legs', equipment: 'Machine', difficulty: 'beginner' },
            { name: 'Lunges', muscle: 'Legs', equipment: 'Dumbbells', difficulty: 'beginner' },
            { name: 'Leg Curl', muscle: 'Legs', equipment: 'Machine', difficulty: 'beginner' },
            { name: 'Calf Raises', muscle: 'Legs', equipment: 'Machine', difficulty: 'beginner' },
            { name: 'Overhead Press', muscle: 'Shoulders', equipment: 'Barbell', difficulty: 'intermediate' },
            { name: 'Lateral Raises', muscle: 'Shoulders', equipment: 'Dumbbells', difficulty: 'beginner' },
            { name: 'Face Pulls', muscle: 'Shoulders', equipment: 'Cable Machine', difficulty: 'beginner' },
            { name: 'Bicep Curls', muscle: 'Arms', equipment: 'Dumbbells', difficulty: 'beginner' },
            { name: 'Tricep Pushdowns', muscle: 'Arms', equipment: 'Cable Machine', difficulty: 'beginner' },
            { name: 'Hammer Curls', muscle: 'Arms', equipment: 'Dumbbells', difficulty: 'beginner' },
            { name: 'Skull Crushers', muscle: 'Arms', equipment: 'Barbell', difficulty: 'intermediate' },
            { name: 'Plank', muscle: 'Core', equipment: 'Bodyweight', difficulty: 'beginner' },
            { name: 'Crunches', muscle: 'Core', equipment: 'Bodyweight', difficulty: 'beginner' },
            { name: 'Russian Twists', muscle: 'Core', equipment: 'Bodyweight', difficulty: 'beginner' },
            { name: 'Leg Raises', muscle: 'Core', equipment: 'Bodyweight', difficulty: 'intermediate' },
            { name: 'Running', muscle: 'Cardio', equipment: 'Treadmill', difficulty: 'beginner' },
            { name: 'Cycling', muscle: 'Cardio', equipment: 'Stationary Bike', difficulty: 'beginner' },
            { name: 'Rowing', muscle: 'Cardio', equipment: 'Rowing Machine', difficulty: 'intermediate' }
          ];

          for (const ex of defaultExercises) {
            await runAsync(
              'INSERT INTO exercises (name, primary_muscle_group_id, equipment, difficulty, is_custom) VALUES (?, ?, ?, ?, 0)',
              [ex.name, groupIds[ex.muscle], ex.equipment, ex.difficulty]
            );
          }
        }

        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
};

/**
 * Array defining the order in which database tables should be deleted.
 * Ordered to respect foreign key constraints - child tables before parent tables.
 * @constant {string[]}
 */
const TABLES_IN_DELETE_ORDER = [
  'automation_logs',
  'task_history',
  'attachments',
  'subtasks',
  'task_tags',
  'time_blocks',
  'daily_priorities',
  'daily_notes',
  'daily_reflections',
  // Obsidian notes tables (must come before tasks because of relations)
  'obsidian_task_note_relations',
  'obsidian_note_links',
  'obsidian_notes',
  'tasks',
  'swimlanes',
  'columns',
  'boards',
  // Eisenhower Matrix tables
  'projects',
  'contacts',
  'automation_rules',
  'integrations',
  'tags',
  'habit_logs',
  'habits',
  // Fitness tables
  'exercise_logs',
  'personal_records',
  'workout_sessions',
  'workout_day_exercises',
  'workout_days',
  'workout_templates',
  'exercise_muscle_groups',
  'exercises',
  'muscle_groups',
  'body_measurements',
  'fitness_goals',
  'fitness_profile',
  // Islamic tracker tables
  'prayer_records',
  'qada_prayers',
  'quran_logs',
  'quran_memorization',
  'dhikr_logs',
  'dua_journal',
  'fasting_records',
  'jumuah_checklist',
  'islamic_settings',
  'spiritual_reflections',
  'users'
];

/**
 * Clears all data from all database tables while preserving the schema.
 * Deletes tables in reverse dependency order to avoid foreign key constraint violations.
 * Useful for testing and data reset operations.
 * 
 * @async
 * @function clearDatabase
 * @returns {Promise<void>} Promise that resolves when all tables are cleared
 * @throws {Error} Database error if deletion fails (except for non-existent tables)
 * @example
 * await clearDatabase();
 * console.log('All database tables cleared');
 */
const clearDatabase = async () => {
  // Temporarily disable foreign key enforcement to guarantee a clean wipe
  // regardless of cascade relationships that may change during development.
  await runAsync('PRAGMA foreign_keys = OFF');

  try {
    for (const table of TABLES_IN_DELETE_ORDER) {
      try {
        await runAsync(`DELETE FROM ${table}`);
      } catch (error: unknown) {
        const err = error as Error;
        if (err.message && err.message.includes('no such table')) {
          // Skip tables that are not present in the current schema
          continue;
        }
        throw error;
      }
    }
  } finally {
    await runAsync('PRAGMA foreign_keys = ON');
  }
};

export { db };
export { initDatabase };
export { runAsync };
export { getAsync };
export { allAsync };
export { clearDatabase };
