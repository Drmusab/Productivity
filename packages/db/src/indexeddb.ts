import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Note, Block, Task, SyncOperation } from '@productivity-os/core';

/**
 * IndexedDB Schema for Productivity OS
 * Provides offline-first storage with structured indexes
 */

interface ProductivityDBSchema extends DBSchema {
  notes: {
    key: string;
    value: Note;
    indexes: {
      'by-title': string;
      'by-updated': Date;
      'by-tag': string;
    };
  };
  blocks: {
    key: string;
    value: Block;
    indexes: {
      'by-note': string;
      'by-parent': string;
      'by-order': number;
    };
  };
  tasks: {
    key: string;
    value: Task;
    indexes: {
      'by-status': string;
      'by-priority': string;
      'by-due-date': Date;
      'by-note': string;
    };
  };
  syncQueue: {
    key: string;
    value: SyncOperation;
    indexes: {
      'by-timestamp': number;
      'by-entity': string;
    };
  };
  metadata: {
    key: string;
    value: {
      key: string;
      value: unknown;
      updatedAt: Date;
    };
  };
}

export class IndexedDBAdapter {
  private db: IDBPDatabase<ProductivityDBSchema> | null = null;
  private dbName: string;
  private version: number;

  constructor(dbName = 'productivity-os', version = 1) {
    this.dbName = dbName;
    this.version = version;
  }

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    this.db = await openDB<ProductivityDBSchema>(this.dbName, this.version, {
      upgrade(db, _oldVersion, _newVersion, _transaction) {
        // Notes store
        if (!db.objectStoreNames.contains('notes')) {
          const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
          notesStore.createIndex('by-title', 'title');
          notesStore.createIndex('by-updated', 'updatedAt');
          notesStore.createIndex('by-tag', 'tags', { multiEntry: true });
        }

        // Blocks store
        if (!db.objectStoreNames.contains('blocks')) {
          const blocksStore = db.createObjectStore('blocks', { keyPath: 'id' });
          blocksStore.createIndex('by-note', 'noteId');
          blocksStore.createIndex('by-parent', 'parentId');
          blocksStore.createIndex('by-order', 'order');
        }

        // Tasks store
        if (!db.objectStoreNames.contains('tasks')) {
          const tasksStore = db.createObjectStore('tasks', { keyPath: 'id' });
          tasksStore.createIndex('by-status', 'status');
          tasksStore.createIndex('by-priority', 'priority');
          tasksStore.createIndex('by-due-date', 'dueDate');
          tasksStore.createIndex('by-note', 'noteId');
        }

        // Sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncStore.createIndex('by-timestamp', 'timestamp');
          syncStore.createIndex('by-entity', 'entityId');
        }

        // Metadata store
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      },
    });
  }

  /**
   * Ensure database is initialized
   */
  private ensureDB(): IDBPDatabase<ProductivityDBSchema> {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  // ===== Notes Operations =====

  async addNote(note: Note): Promise<void> {
    const db = this.ensureDB();
    await db.add('notes', note);
  }

  async updateNote(note: Note): Promise<void> {
    const db = this.ensureDB();
    await db.put('notes', note);
  }

  async getNote(id: string): Promise<Note | undefined> {
    const db = this.ensureDB();
    return db.get('notes', id);
  }

  async deleteNote(id: string): Promise<void> {
    const db = this.ensureDB();
    await db.delete('notes', id);
  }

  async getAllNotes(): Promise<Note[]> {
    const db = this.ensureDB();
    return db.getAll('notes');
  }

  async getNotesByTag(tag: string): Promise<Note[]> {
    const db = this.ensureDB();
    return db.getAllFromIndex('notes', 'by-tag', tag);
  }

  async searchNotes(query: string): Promise<Note[]> {
    const db = this.ensureDB();
    const allNotes = await db.getAll('notes');
    const lowerQuery = query.toLowerCase();

    return allNotes.filter((note) =>
      note.title.toLowerCase().includes(lowerQuery) ||
      note.content.toLowerCase().includes(lowerQuery)
    );
  }

  // ===== Block Operations =====

  async addBlock(block: Block): Promise<void> {
    const db = this.ensureDB();
    await db.add('blocks', block);
  }

  async updateBlock(block: Block): Promise<void> {
    const db = this.ensureDB();
    await db.put('blocks', block);
  }

  async getBlock(id: string): Promise<Block | undefined> {
    const db = this.ensureDB();
    return db.get('blocks', id);
  }

  async deleteBlock(id: string): Promise<void> {
    const db = this.ensureDB();
    await db.delete('blocks', id);
  }

  async getBlocksByNote(noteId: string): Promise<Block[]> {
    const db = this.ensureDB();
    const blocks = await db.getAllFromIndex('blocks', 'by-note', noteId);
    return blocks.sort((a, b) => a.order - b.order);
  }

  async getChildBlocks(parentId: string): Promise<Block[]> {
    const db = this.ensureDB();
    return db.getAllFromIndex('blocks', 'by-parent', parentId);
  }

  // ===== Task Operations =====

  async addTask(task: Task): Promise<void> {
    const db = this.ensureDB();
    await db.add('tasks', task);
  }

  async updateTask(task: Task): Promise<void> {
    const db = this.ensureDB();
    await db.put('tasks', task);
  }

  async getTask(id: string): Promise<Task | undefined> {
    const db = this.ensureDB();
    return db.get('tasks', id);
  }

  async deleteTask(id: string): Promise<void> {
    const db = this.ensureDB();
    await db.delete('tasks', id);
  }

  async getAllTasks(): Promise<Task[]> {
    const db = this.ensureDB();
    return db.getAll('tasks');
  }

  async getTasksByStatus(status: string): Promise<Task[]> {
    const db = this.ensureDB();
    return db.getAllFromIndex('tasks', 'by-status', status);
  }

  async getTasksByPriority(priority: string): Promise<Task[]> {
    const db = this.ensureDB();
    return db.getAllFromIndex('tasks', 'by-priority', priority);
  }

  async getTasksByNote(noteId: string): Promise<Task[]> {
    const db = this.ensureDB();
    return db.getAllFromIndex('tasks', 'by-note', noteId);
  }

  // ===== Sync Queue Operations =====

  async addSyncOperation(operation: SyncOperation): Promise<void> {
    const db = this.ensureDB();
    await db.add('syncQueue', operation);
  }

  async getSyncQueue(): Promise<SyncOperation[]> {
    const db = this.ensureDB();
    const operations = await db.getAll('syncQueue');
    return operations.sort((a, b) => a.timestamp - b.timestamp);
  }

  async clearSyncOperation(id: string): Promise<void> {
    const db = this.ensureDB();
    await db.delete('syncQueue', id);
  }

  async clearSyncQueue(): Promise<void> {
    const db = this.ensureDB();
    await db.clear('syncQueue');
  }

  // ===== Metadata Operations =====

  async setMetadata(key: string, value: unknown): Promise<void> {
    const db = this.ensureDB();
    await db.put('metadata', {
      key,
      value,
      updatedAt: new Date(),
    });
  }

  async getMetadata<T>(key: string): Promise<T | undefined> {
    const db = this.ensureDB();
    const result = await db.get('metadata', key);
    return result?.value as T | undefined;
  }

  // ===== Utility Operations =====

  async clear(): Promise<void> {
    const db = this.ensureDB();
    const stores = ['notes', 'blocks', 'tasks', 'syncQueue', 'metadata'] as const;
    for (const store of stores) {
      await db.clear(store);
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  async getStats(): Promise<{
    notes: number;
    blocks: number;
    tasks: number;
    syncQueue: number;
  }> {
    const db = this.ensureDB();
    return {
      notes: await db.count('notes'),
      blocks: await db.count('blocks'),
      tasks: await db.count('tasks'),
      syncQueue: await db.count('syncQueue'),
    };
  }
}

export const createIndexedDB = (dbName?: string, version?: number): IndexedDBAdapter => {
  return new IndexedDBAdapter(dbName, version);
};
