/**
 * @fileoverview Vault system types for Obsidian-style workspace management
 * A Vault is a workspace containing notes, folders, tags, attachments, and index database
 */

// ===== Vault Types =====

/**
 * Vault - represents a workspace container
 */
export interface Vault {
  /** Unique identifier */
  id: string;
  
  /** Vault name */
  name: string;
  
  /** Path to vault storage (local file system or database) */
  path: string;
  
  /** Vault description */
  description?: string;
  
  /** Whether vault is the default/active vault */
  isDefault?: boolean;
  
  /** Created timestamp */
  createdAt: string;
  
  /** Last updated timestamp */
  updatedAt: string;
  
  /** Last opened timestamp */
  lastOpenedAt?: string;
  
  /** Vault settings */
  settings?: VaultSettings;
}

/**
 * Vault settings
 */
export interface VaultSettings {
  /** Default folder for new notes */
  defaultNoteFolder?: string;
  
  /** Default folder for attachments */
  attachmentFolder?: string;
  
  /** Daily notes folder */
  dailyNotesFolder?: string;
  
  /** Daily note template */
  dailyNoteTemplate?: string;
  
  /** Default note template */
  defaultNoteTemplate?: string;
  
  /** Auto-save interval in milliseconds */
  autoSaveInterval?: number;
  
  /** Whether to use wiki-links */
  useWikiLinks?: boolean;
  
  /** Whether to show frontmatter in preview */
  showFrontmatter?: boolean;
  
  /** Theme preference */
  theme?: 'light' | 'dark' | 'system';
}

/**
 * Vault folder structure
 */
export interface VaultFolder {
  /** Folder path relative to vault root */
  path: string;
  
  /** Folder name */
  name: string;
  
  /** Parent folder path */
  parentPath?: string;
  
  /** Child folders */
  children?: VaultFolder[];
  
  /** Number of notes in this folder */
  noteCount?: number;
}

/**
 * Vault attachment
 */
export interface VaultAttachment {
  /** Unique identifier */
  id: string;
  
  /** File name */
  filename: string;
  
  /** Original file name */
  originalName: string;
  
  /** File path relative to vault */
  path: string;
  
  /** MIME type */
  mimeType?: string;
  
  /** File size in bytes */
  size?: number;
  
  /** Created timestamp */
  createdAt: string;
  
  /** Note ID this attachment belongs to (if any) */
  noteId?: string;
}

/**
 * Vault tag
 */
export interface VaultTag {
  /** Tag name (without #) */
  name: string;
  
  /** Number of notes with this tag */
  count: number;
  
  /** Tag color */
  color?: string;
}

/**
 * Vault statistics
 */
export interface VaultStats {
  /** Total number of notes */
  totalNotes: number;
  
  /** Total number of folders */
  totalFolders: number;
  
  /** Total number of attachments */
  totalAttachments: number;
  
  /** Total number of tags */
  totalTags: number;
  
  /** Total number of links */
  totalLinks: number;
  
  /** Number of unresolved links */
  unresolvedLinks: number;
  
  /** Number of orphan notes (no incoming or outgoing links) */
  orphanNotes: number;
  
  /** Last modified timestamp of any note */
  lastModified?: string;
  
  /** Storage size in bytes */
  storageSize?: number;
}

// ===== Vault Operations =====

/**
 * Create vault parameters
 */
export interface CreateVaultParams {
  /** Vault name */
  name: string;
  
  /** Vault path */
  path: string;
  
  /** Vault description */
  description?: string;
  
  /** Initial settings */
  settings?: VaultSettings;
  
  /** Whether to set as default vault */
  setAsDefault?: boolean;
}

/**
 * Update vault parameters
 */
export interface UpdateVaultParams {
  /** Vault ID */
  id: string;
  
  /** Updated name */
  name?: string;
  
  /** Updated description */
  description?: string;
  
  /** Updated settings */
  settings?: Partial<VaultSettings>;
}

// ===== Backup Types =====

/**
 * Vault backup metadata
 */
export interface VaultBackup {
  /** Backup ID */
  id: string;
  
  /** Vault ID this backup belongs to */
  vaultId: string;
  
  /** Backup file path */
  filePath: string;
  
  /** Backup type */
  type: 'full' | 'incremental';
  
  /** App version when backup was created */
  appVersion: string;
  
  /** Schema version when backup was created */
  schemaVersion: number;
  
  /** Created timestamp */
  createdAt: string;
  
  /** Backup size in bytes */
  size?: number;
  
  /** Checksum for integrity verification */
  checksum?: string;
}

/**
 * Backup options
 */
export interface BackupOptions {
  /** Backup type */
  type?: 'full' | 'incremental';
  
  /** Include attachments */
  includeAttachments?: boolean;
  
  /** Compression level (0-9) */
  compressionLevel?: number;
  
  /** Custom backup path */
  outputPath?: string;
}

/**
 * Restore options
 */
export interface RestoreOptions {
  /** Backup file path */
  backupPath: string;
  
  /** Target vault ID (or create new vault) */
  targetVaultId?: string;
  
  /** Whether to overwrite existing data */
  overwrite?: boolean;
}
