/**
 * @fileoverview Knowledge Vault Service - Unified Obsidian-style Knowledge Management
 * Integrates all knowledge modules (thoughts, ideas, notes, writing, utilities) into one cohesive vault
 * Implements PARA method (Projects, Areas, Resources, Archives) for organization
 * @module services/knowledgeVault
 */

import { allAsync, getAsync, runAsync } from '../utils/database';
import { randomUUID } from 'crypto';

/**
 * Vault item types - unified representation of all knowledge entities
 */
export enum VaultItemType {
  NOTE = 'note',                    // Obsidian-style notes
  THOUGHT = 'thought',              // Individual thoughts
  THOUGHT_SESSION = 'thought_session', // Brain dump sessions
  IDEA = 'idea',                    // Ideas
  ARTICLE = 'article',              // Writing/articles
  RESEARCH = 'research',            // Research items
  QUOTE = 'quote',                  // Quotes
  WORD = 'word',                    // Vocabulary
  STICKY_NOTE = 'sticky_note',      // Sticky notes
  TASK = 'task',                    // Tasks (linked to vault)
  POMODORO = 'pomodoro',            // Pomodoro sessions
}

/**
 * PARA classification for vault items
 */
export enum PARACategory {
  PROJECT = 'project',    // Short-term efforts with a goal
  AREA = 'area',         // Long-term responsibilities
  RESOURCE = 'resource', // Reference materials
  ARCHIVE = 'archive',   // Completed or inactive items
}

/**
 * Vault Item interface - unified structure for all knowledge entities
 */
export interface VaultItem {
  id: string;
  type: VaultItemType;
  title: string;
  content: string;
  para_category: PARACategory | null;
  folder_path: string | null;
  tags: string[];
  metadata: Record<string, any>;
  linked_items: string[];
  created_by: number;
  created_at: string;
  updated_at: string;
  source_table: string;  // Original table for migration
  source_id: string;     // Original ID in source table
}

/**
 * Vault link interface - relationships between vault items
 */
export interface VaultLink {
  id: string;
  source_id: string;
  target_id: string;
  link_type: 'reference' | 'related' | 'parent' | 'child' | 'wikilink';
  created_at: string;
}

/**
 * Knowledge Vault Service
 * Provides unified API for all knowledge management operations
 */
export class KnowledgeVaultService {
  
  /**
   * Initialize vault tables if they don't exist
   */
  static async initializeVault(): Promise<void> {
    // Main vault items table
    await runAsync(`CREATE TABLE IF NOT EXISTS vault_items (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      para_category TEXT,
      folder_path TEXT,
      tags TEXT,
      metadata TEXT,
      linked_items TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      source_table TEXT,
      source_id TEXT,
      FOREIGN KEY (created_by) REFERENCES users (id)
    )`);

    // Vault links table
    await runAsync(`CREATE TABLE IF NOT EXISTS vault_links (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      link_type TEXT NOT NULL DEFAULT 'reference',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (source_id) REFERENCES vault_items (id) ON DELETE CASCADE,
      FOREIGN KEY (target_id) REFERENCES vault_items (id) ON DELETE CASCADE
    )`);

    // Create indexes
    await runAsync('CREATE INDEX IF NOT EXISTS idx_vault_items_type ON vault_items(type)');
    await runAsync('CREATE INDEX IF NOT EXISTS idx_vault_items_para ON vault_items(para_category)');
    await runAsync('CREATE INDEX IF NOT EXISTS idx_vault_items_folder ON vault_items(folder_path)');
    await runAsync('CREATE INDEX IF NOT EXISTS idx_vault_items_created_by ON vault_items(created_by)');
    await runAsync('CREATE INDEX IF NOT EXISTS idx_vault_links_source ON vault_links(source_id)');
    await runAsync('CREATE INDEX IF NOT EXISTS idx_vault_links_target ON vault_links(target_id)');
  }

  /**
   * Get all vault items with optional filters
   */
  static async getVaultItems(filters?: {
    type?: VaultItemType;
    para_category?: PARACategory;
    folder_path?: string;
    search?: string;
    tags?: string[];
    created_by?: number;
  }): Promise<VaultItem[]> {
    let query = 'SELECT * FROM vault_items WHERE 1=1';
    const params: any[] = [];

    if (filters?.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }

    if (filters?.para_category) {
      query += ' AND para_category = ?';
      params.push(filters.para_category);
    }

    if (filters?.folder_path) {
      query += ' AND folder_path LIKE ?';
      params.push(`${filters.folder_path}%`);
    }

    if (filters?.created_by) {
      query += ' AND created_by = ?';
      params.push(filters.created_by);
    }

    if (filters?.search) {
      query += ' AND (title LIKE ? OR content LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    query += ' ORDER BY updated_at DESC';

    const rows = await allAsync(query, params);
    return rows.map(this.parseVaultItem);
  }

  /**
   * Get a single vault item by ID
   */
  static async getVaultItem(id: string): Promise<VaultItem | null> {
    const row = await getAsync('SELECT * FROM vault_items WHERE id = ?', [id]);
    return row ? this.parseVaultItem(row) : null;
  }

  /**
   * Create a new vault item
   */
  static async createVaultItem(data: Partial<VaultItem> & { type: VaultItemType; title: string; created_by: number }): Promise<VaultItem> {
    const id = data.id || randomUUID();
    const now = new Date().toISOString();

    await runAsync(
      `INSERT INTO vault_items (
        id, type, title, content, para_category, folder_path, tags, metadata, 
        linked_items, created_by, created_at, updated_at, source_table, source_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.type,
        data.title,
        data.content || '',
        data.para_category || null,
        data.folder_path || null,
        JSON.stringify(data.tags || []),
        JSON.stringify(data.metadata || {}),
        JSON.stringify(data.linked_items || []),
        data.created_by,
        now,
        now,
        data.source_table || null,
        data.source_id || null,
      ]
    );

    const item = await this.getVaultItem(id);
    if (!item) {
      throw new Error('Failed to create vault item');
    }
    return item;
  }

  /**
   * Update a vault item
   */
  static async updateVaultItem(id: string, data: Partial<VaultItem>): Promise<VaultItem | null> {
    const updates: string[] = [];
    const params: any[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      params.push(data.title);
    }

    if (data.content !== undefined) {
      updates.push('content = ?');
      params.push(data.content);
    }

    if (data.para_category !== undefined) {
      updates.push('para_category = ?');
      params.push(data.para_category);
    }

    if (data.folder_path !== undefined) {
      updates.push('folder_path = ?');
      params.push(data.folder_path);
    }

    if (data.tags !== undefined) {
      updates.push('tags = ?');
      params.push(JSON.stringify(data.tags));
    }

    if (data.metadata !== undefined) {
      updates.push('metadata = ?');
      params.push(JSON.stringify(data.metadata));
    }

    if (data.linked_items !== undefined) {
      updates.push('linked_items = ?');
      params.push(JSON.stringify(data.linked_items));
    }

    if (updates.length === 0) {
      return this.getVaultItem(id);
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    await runAsync(
      `UPDATE vault_items SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return this.getVaultItem(id);
  }

  /**
   * Delete a vault item
   */
  static async deleteVaultItem(id: string): Promise<void> {
    await runAsync('DELETE FROM vault_items WHERE id = ?', [id]);
  }

  /**
   * Create a link between two vault items
   */
  static async createVaultLink(sourceId: string, targetId: string, linkType: VaultLink['link_type'] = 'reference'): Promise<VaultLink> {
    const id = randomUUID();
    const now = new Date().toISOString();

    await runAsync(
      'INSERT INTO vault_links (id, source_id, target_id, link_type, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, sourceId, targetId, linkType, now]
    );

    const row = await getAsync('SELECT * FROM vault_links WHERE id = ?', [id]);
    return row;
  }

  /**
   * Get all links for a vault item
   */
  static async getVaultLinks(itemId: string): Promise<{ outgoing: VaultLink[]; incoming: VaultLink[] }> {
    const outgoing = await allAsync('SELECT * FROM vault_links WHERE source_id = ?', [itemId]);
    const incoming = await allAsync('SELECT * FROM vault_links WHERE target_id = ?', [itemId]);

    return { outgoing, incoming };
  }

  /**
   * Delete a link between vault items
   */
  static async deleteVaultLink(linkId: string): Promise<void> {
    await runAsync('DELETE FROM vault_links WHERE id = ?', [linkId]);
  }

  /**
   * Search vault items with full-text search
   */
  static async searchVault(query: string, userId?: number): Promise<VaultItem[]> {
    let sql = `
      SELECT * FROM vault_items 
      WHERE (title LIKE ? OR content LIKE ? OR tags LIKE ?)
    `;
    const params: any[] = [`%${query}%`, `%${query}%`, `%${query}%`];

    if (userId) {
      sql += ' AND created_by = ?';
      params.push(userId);
    }

    sql += ' ORDER BY updated_at DESC LIMIT 100';

    const rows = await allAsync(sql, params);
    return rows.map(this.parseVaultItem);
  }

  /**
   * Get vault statistics
   */
  static async getVaultStats(userId?: number): Promise<{
    total: number;
    by_type: Record<string, number>;
    by_para: Record<string, number>;
  }> {
    let whereClause = '';
    const params: any[] = [];

    if (userId) {
      whereClause = 'WHERE created_by = ?';
      params.push(userId);
    }

    const totalRow = await getAsync(`SELECT COUNT(*) as count FROM vault_items ${whereClause}`, params);
    const typeRows = await allAsync(`SELECT type, COUNT(*) as count FROM vault_items ${whereClause} GROUP BY type`, params);
    const paraRows = await allAsync(`SELECT para_category, COUNT(*) as count FROM vault_items ${whereClause} WHERE para_category IS NOT NULL GROUP BY para_category`, params);

    const by_type: Record<string, number> = {};
    typeRows.forEach(row => {
      by_type[row.type] = row.count;
    });

    const by_para: Record<string, number> = {};
    paraRows.forEach(row => {
      by_para[row.para_category] = row.count;
    });

    return {
      total: totalRow?.count || 0,
      by_type,
      by_para,
    };
  }

  /**
   * Parse database row to VaultItem
   */
  private static parseVaultItem(row: any): VaultItem {
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      content: row.content,
      para_category: row.para_category,
      folder_path: row.folder_path,
      tags: row.tags ? JSON.parse(row.tags) : [],
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      linked_items: row.linked_items ? JSON.parse(row.linked_items) : [],
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
      source_table: row.source_table,
      source_id: row.source_id,
    };
  }

  /**
   * Migrate existing data to vault structure
   * This preserves original data while creating unified vault entries
   */
  static async migrateToVault(userId: number): Promise<{
    migrated: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let migrated = 0;

    try {
      // Migrate thoughts
      const thoughts = await allAsync('SELECT * FROM thoughts WHERE created_by = ?', [userId]);
      for (const thought of thoughts) {
        try {
          const contentPreview = thought.content && typeof thought.content === 'string' 
            ? thought.content.substring(0, 100) 
            : 'Untitled Thought';

          await this.createVaultItem({
            type: VaultItemType.THOUGHT,
            title: contentPreview,
            content: thought.content || '',
            para_category: thought.category === 'actions' ? PARACategory.PROJECT : PARACategory.RESOURCE,
            tags: [thought.category],
            metadata: {
              original_category: thought.category,
              is_processed: thought.is_processed,
            },
            created_by: userId,
            source_table: 'thoughts',
            source_id: thought.id.toString(),
          });
          migrated++;
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error);
          errors.push(`Failed to migrate thought ${thought.id}: ${errorMessage}`);
        }
      }

      // Migrate ideas
      const ideas = await allAsync('SELECT * FROM ideas WHERE created_by = ?', [userId]);
      for (const idea of ideas) {
        try {
          await this.createVaultItem({
            type: VaultItemType.IDEA,
            title: idea.title,
            content: idea.description || '',
            para_category: idea.status === 'completed' ? PARACategory.ARCHIVE : PARACategory.PROJECT,
            tags: idea.tags ? JSON.parse(idea.tags) : [],
            metadata: {
              status: idea.status,
              priority: idea.priority,
              category: idea.category,
            },
            created_by: userId,
            source_table: 'ideas',
            source_id: idea.id.toString(),
          });
          migrated++;
        } catch (error: unknown) {
          errors.push(`Failed to migrate idea ${idea.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Migrate articles
      const articles = await allAsync('SELECT * FROM articles WHERE created_by = ?', [userId]);
      for (const article of articles) {
        try {
          await this.createVaultItem({
            type: VaultItemType.ARTICLE,
            title: article.title,
            content: article.content || '',
            para_category: article.status === 'published' ? PARACategory.ARCHIVE : PARACategory.PROJECT,
            tags: article.tags ? JSON.parse(article.tags) : [],
            metadata: {
              status: article.status,
              type: article.type,
              word_count: article.word_count,
              target_word_count: article.target_word_count,
            },
            created_by: userId,
            source_table: 'articles',
            source_id: article.id.toString(),
          });
          migrated++;
        } catch (error: unknown) {
          errors.push(`Failed to migrate article ${article.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Migrate quotes
      const quotes = await allAsync('SELECT * FROM quotes WHERE created_by = ?', [userId]);
      for (const quote of quotes) {
        try {
          await this.createVaultItem({
            type: VaultItemType.QUOTE,
            title: `Quote by ${quote.author || 'Unknown'}`,
            content: quote.content,
            para_category: PARACategory.RESOURCE,
            tags: [quote.category].filter(Boolean),
            metadata: {
              author: quote.author,
              source: quote.source,
              is_favorite: quote.is_favorite,
            },
            created_by: userId,
            source_table: 'quotes',
            source_id: quote.id.toString(),
          });
          migrated++;
        } catch (error: unknown) {
          errors.push(`Failed to migrate quote ${quote.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Migrate words
      const words = await allAsync('SELECT * FROM words WHERE created_by = ?', [userId]);
      for (const word of words) {
        try {
          await this.createVaultItem({
            type: VaultItemType.WORD,
            title: word.word,
            content: word.definition || '',
            para_category: PARACategory.RESOURCE,
            tags: [word.category, word.part_of_speech].filter(Boolean),
            metadata: {
              pronunciation: word.pronunciation,
              example_sentence: word.example_sentence,
              origin: word.origin,
              synonyms: word.synonyms ? JSON.parse(word.synonyms) : [],
              antonyms: word.antonyms ? JSON.parse(word.antonyms) : [],
              mastery_level: word.mastery_level,
            },
            created_by: userId,
            source_table: 'words',
            source_id: word.id.toString(),
          });
          migrated++;
        } catch (error: unknown) {
          errors.push(`Failed to migrate word ${word.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Migrate obsidian notes
      const notes = await allAsync('SELECT * FROM obsidian_notes WHERE created_by = ?', [userId]);
      for (const note of notes) {
        try {
          await this.createVaultItem({
            type: VaultItemType.NOTE,
            title: note.title,
            content: note.content_markdown,
            para_category: null, // Will be categorized by user
            folder_path: note.folder_path,
            tags: [],
            metadata: {
              frontmatter: note.frontmatter ? JSON.parse(note.frontmatter) : {},
            },
            created_by: userId,
            source_table: 'obsidian_notes',
            source_id: note.id,
          });
          migrated++;
        } catch (error: unknown) {
          errors.push(`Failed to migrate note ${note.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

    } catch (error: unknown) {
      errors.push(`Migration error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return { migrated, errors };
  }
}
