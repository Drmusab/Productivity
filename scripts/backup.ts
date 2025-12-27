#!/usr/bin/env ts-node
/**
 * @fileoverview Backup and Restore Utility
 * 
 * This script handles vault and database backups with versioning.
 * 
 * Usage:
 *   npm run backup              - Create a full backup
 *   npm run backup:vault        - Backup vault only
 *   npm run backup:db           - Backup database only
 *   npm run restore <file>      - Restore from backup
 *   npm run backup:list         - List available backups
 */

import { existsSync, mkdirSync, readdirSync, statSync, createWriteStream, createReadStream } from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { createGzip, createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';

// Configuration
const APP_VERSION = process.env.APP_VERSION || '1.0.0';
const DATABASE_PATH = process.env.DATABASE_PATH || './data/productivity.db';
const VAULT_PATH = process.env.VAULT_PATH || './data/vaults';
const BACKUP_DIR = process.env.BACKUP_DIR || './backups';
const ATTACHMENTS_DIR = process.env.ATTACHMENTS_DIR || './attachments';

interface BackupMetadata {
  id: string;
  type: 'full' | 'vault' | 'database';
  appVersion: string;
  schemaVersion: number;
  createdAt: string;
  size: number;
  checksum?: string;
  files: string[];
}

/**
 * Generate a unique backup ID
 */
function generateBackupId(): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, '').replace('T', '-').split('.')[0];
  return `backup-${timestamp}`;
}

/**
 * Ensure backup directory exists
 */
function ensureBackupDir(): void {
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`Created backup directory: ${BACKUP_DIR}`);
  }
}

/**
 * Create a database backup
 */
async function backupDatabase(backupPath: string): Promise<string[]> {
  const files: string[] = [];
  
  if (!existsSync(DATABASE_PATH)) {
    console.log('  No database found, skipping database backup');
    return files;
  }
  
  const dbBackupPath = path.join(backupPath, 'database');
  mkdirSync(dbBackupPath, { recursive: true });
  
  // Copy the database file
  const dbFileName = path.basename(DATABASE_PATH);
  const targetPath = path.join(dbBackupPath, dbFileName);
  
  try {
    // Use SQLite's backup command for a consistent backup
    execSync(`sqlite3 "${DATABASE_PATH}" ".backup '${targetPath}'"`, { stdio: 'pipe' });
    files.push(targetPath);
    console.log(`  ✓ Database backed up: ${dbFileName}`);
  } catch (error) {
    // Fallback to file copy if sqlite3 command not available
    const { copyFileSync } = require('fs');
    copyFileSync(DATABASE_PATH, targetPath);
    files.push(targetPath);
    console.log(`  ✓ Database copied: ${dbFileName}`);
  }
  
  return files;
}

/**
 * Create a vault backup
 */
async function backupVault(backupPath: string): Promise<string[]> {
  const files: string[] = [];
  
  if (!existsSync(VAULT_PATH)) {
    console.log('  No vault directory found, skipping vault backup');
    return files;
  }
  
  const vaultBackupPath = path.join(backupPath, 'vaults');
  mkdirSync(vaultBackupPath, { recursive: true });
  
  // Copy all vault files recursively
  const copyDir = (src: string, dest: string): void => {
    if (!existsSync(dest)) {
      mkdirSync(dest, { recursive: true });
    }
    
    const entries = readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        copyDir(srcPath, destPath);
      } else {
        const { copyFileSync } = require('fs');
        copyFileSync(srcPath, destPath);
        files.push(destPath);
      }
    }
  };
  
  copyDir(VAULT_PATH, vaultBackupPath);
  console.log(`  ✓ Vault backed up: ${files.length} files`);
  
  return files;
}

/**
 * Create a full backup (database + vault + attachments)
 */
async function createBackup(type: 'full' | 'vault' | 'database' = 'full'): Promise<string> {
  console.log('Creating backup...\n');
  
  ensureBackupDir();
  
  const backupId = generateBackupId();
  const backupPath = path.join(BACKUP_DIR, backupId);
  mkdirSync(backupPath, { recursive: true });
  
  const files: string[] = [];
  
  // Backup based on type
  if (type === 'full' || type === 'database') {
    const dbFiles = await backupDatabase(backupPath);
    files.push(...dbFiles);
  }
  
  if (type === 'full' || type === 'vault') {
    const vaultFiles = await backupVault(backupPath);
    files.push(...vaultFiles);
  }
  
  // Create metadata file
  const metadata: BackupMetadata = {
    id: backupId,
    type,
    appVersion: APP_VERSION,
    schemaVersion: parseInt(process.env.SCHEMA_VERSION || '1', 10),
    createdAt: new Date().toISOString(),
    size: files.reduce((acc, file) => {
      try {
        return acc + statSync(file).size;
      } catch {
        return acc;
      }
    }, 0),
    files: files.map(f => path.relative(backupPath, f)),
  };
  
  const metadataPath = path.join(backupPath, 'metadata.json');
  const { writeFileSync } = require('fs');
  writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  
  // Create a compressed archive
  const archivePath = `${backupPath}.tar.gz`;
  try {
    execSync(`tar -czf "${archivePath}" -C "${BACKUP_DIR}" "${backupId}"`, { stdio: 'pipe' });
    
    // Clean up uncompressed files
    execSync(`rm -rf "${backupPath}"`, { stdio: 'pipe' });
    
    console.log(`\n✓ Backup created: ${archivePath}`);
    console.log(`  Type: ${type}`);
    console.log(`  Size: ${formatBytes(statSync(archivePath).size)}`);
    console.log(`  Files: ${files.length}`);
    
    return archivePath;
  } catch (error) {
    console.log(`\n✓ Backup created: ${backupPath}/`);
    console.log(`  Type: ${type}`);
    console.log(`  Files: ${files.length}`);
    
    return backupPath;
  }
}

/**
 * List available backups
 */
function listBackups(): void {
  console.log('Available backups:\n');
  
  if (!existsSync(BACKUP_DIR)) {
    console.log('  No backups found.');
    return;
  }
  
  const entries = readdirSync(BACKUP_DIR);
  const backups = entries.filter(e => e.startsWith('backup-'));
  
  if (backups.length === 0) {
    console.log('  No backups found.');
    return;
  }
  
  for (const backup of backups.sort().reverse()) {
    const backupPath = path.join(BACKUP_DIR, backup);
    const stat = statSync(backupPath);
    
    console.log(`  ${backup}`);
    console.log(`    Created: ${stat.mtime.toISOString()}`);
    console.log(`    Size: ${formatBytes(stat.size)}`);
    console.log();
  }
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Restore from a backup
 */
async function restoreBackup(backupFile: string): Promise<void> {
  console.log(`Restoring from: ${backupFile}\n`);
  
  if (!existsSync(backupFile)) {
    throw new Error(`Backup file not found: ${backupFile}`);
  }
  
  // For compressed archives
  if (backupFile.endsWith('.tar.gz')) {
    const restoreDir = path.join(BACKUP_DIR, 'restore-temp');
    mkdirSync(restoreDir, { recursive: true });
    
    execSync(`tar -xzf "${backupFile}" -C "${restoreDir}"`, { stdio: 'pipe' });
    
    console.log('  ✓ Backup extracted');
    console.log('  ⚠ Manual restoration required');
    console.log(`    Extracted to: ${restoreDir}`);
    console.log('    Please copy files to appropriate locations.');
    return;
  }
  
  console.log('  ⚠ Manual restoration required');
  console.log(`    Backup directory: ${backupFile}`);
  console.log('    Please copy files to appropriate locations.');
}

// Main execution
async function main(): Promise<void> {
  const command = process.argv[2] || 'full';
  
  console.log('Productivity OS Backup Utility');
  console.log('==============================\n');
  console.log(`App Version: ${APP_VERSION}`);
  console.log(`Database: ${DATABASE_PATH}`);
  console.log(`Vault: ${VAULT_PATH}`);
  console.log(`Backups: ${BACKUP_DIR}\n`);
  
  try {
    switch (command) {
      case 'full':
        await createBackup('full');
        break;
      case 'vault':
        await createBackup('vault');
        break;
      case 'db':
      case 'database':
        await createBackup('database');
        break;
      case 'list':
        listBackups();
        break;
      case 'restore':
        const backupFile = process.argv[3];
        if (!backupFile) {
          throw new Error('Please specify a backup file to restore');
        }
        await restoreBackup(backupFile);
        break;
      default:
        console.log('Unknown command:', command);
        console.log('Available commands: full, vault, db, list, restore <file>');
    }
  } catch (error: any) {
    console.error('\nError:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { createBackup, listBackups, restoreBackup };
