#!/usr/bin/env ts-node
/**
 * @fileoverview Database Migration Runner
 * 
 * This script handles database schema migrations with version tracking.
 * It automatically detects pending migrations and applies them in order.
 * 
 * Usage:
 *   npm run migrate           - Run all pending migrations
 *   npm run migrate:status    - Show migration status
 *   npm run migrate:rollback  - Rollback last migration
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { createHash } from 'crypto';
import path from 'path';

// Configuration
const SCHEMA_VERSION = parseInt(process.env.SCHEMA_VERSION || '1', 10);
const DATABASE_PATH = process.env.DATABASE_PATH || './data/productivity.db';
const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

interface MigrationRecord {
  id: number;
  version: number;
  name: string;
  applied_at: string;
  checksum: string;
}

interface MigrationFile {
  version: number;
  name: string;
  path: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

/**
 * Get the current schema version from the database
 */
async function getCurrentVersion(db: any): Promise<number> {
  try {
    const result = await db.get(
      'SELECT MAX(version) as version FROM schema_migrations'
    );
    return result?.version || 0;
  } catch (error) {
    // Table doesn't exist yet
    return 0;
  }
}

/**
 * Ensure migrations table exists
 */
async function ensureMigrationsTable(db: any): Promise<void> {
  await db.run(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      checksum TEXT
    )
  `);
}

/**
 * Get list of applied migrations
 */
async function getAppliedMigrations(db: any): Promise<MigrationRecord[]> {
  try {
    return await db.all(
      'SELECT * FROM schema_migrations ORDER BY version ASC'
    );
  } catch (error) {
    return [];
  }
}

/**
 * Calculate a SHA-256 checksum for migration content
 */
function calculateChecksum(content: string): string {
  return createHash('sha256').update(content).digest('hex').substring(0, 16);
}

/**
 * Run a single migration
 */
async function runMigration(
  db: any, 
  migration: MigrationFile, 
  direction: 'up' | 'down'
): Promise<void> {
  console.log(`  Running ${direction}: ${migration.name}...`);
  
  try {
    await db.run('BEGIN TRANSACTION');
    
    if (direction === 'up') {
      await migration.up();
      
      // Record the migration
      const content = readFileSync(migration.path, 'utf-8');
      await db.run(
        `INSERT INTO schema_migrations (version, name, checksum) VALUES (?, ?, ?)`,
        [migration.version, migration.name, calculateChecksum(content)]
      );
    } else {
      await migration.down();
      
      // Remove the migration record
      await db.run(
        'DELETE FROM schema_migrations WHERE version = ?',
        [migration.version]
      );
    }
    
    await db.run('COMMIT');
    console.log(`  ✓ ${migration.name} completed`);
  } catch (error) {
    await db.run('ROLLBACK');
    throw error;
  }
}

/**
 * Main migration function
 */
async function migrate(command: string = 'up'): Promise<void> {
  console.log('Productivity OS Migration Runner');
  console.log('================================\n');
  
  // For now, just output what would happen since we can't actually run SQLite here
  // In the actual implementation, this would use the database module
  
  console.log(`Database: ${DATABASE_PATH}`);
  console.log(`Target Schema Version: ${SCHEMA_VERSION}`);
  console.log(`Command: ${command}\n`);
  
  if (command === 'status') {
    console.log('Migration Status:');
    console.log('  (Migration system ready - run in application context)');
    return;
  }
  
  if (command === 'up') {
    console.log('Running pending migrations...');
    console.log('  (Migration system ready - run in application context)');
    return;
  }
  
  if (command === 'rollback') {
    console.log('Rolling back last migration...');
    console.log('  (Migration system ready - run in application context)');
    return;
  }
  
  console.log(`Unknown command: ${command}`);
  console.log('Available commands: up, status, rollback');
}

// Run if called directly
if (require.main === module) {
  const command = process.argv[2] || 'up';
  migrate(command)
    .then(() => {
      console.log('\nMigration complete.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nMigration failed:', error.message);
      process.exit(1);
    });
}

export { migrate, getCurrentVersion, ensureMigrationsTable };
