/**
 * @productivity-os/db
 * 
 * Local-first database logic with:
 * - IndexedDB adapter for offline storage
 * - CRDT sync engine using Yjs
 * - Conflict-free replication
 * - Offline queue management
 */

// Export IndexedDB adapter
export * from './indexeddb';

// Export sync engine
export * from './sync';

// Re-export Yjs types for convenience
export type { Doc, Map as YMap, Array as YArray } from 'yjs';
