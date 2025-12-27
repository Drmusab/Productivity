import * as Y from 'yjs';
import type { SyncOperation } from '@productivity-os/core';

/**
 * CRDT-based sync engine using Yjs
 * Provides conflict-free replication for offline-first architecture
 */

export type SyncState = 'idle' | 'syncing' | 'error';
export type SyncDirection = 'push' | 'pull' | 'bidirectional';

export interface SyncConfig {
  clientId: string;
  serverUrl?: string;
  autoSync: boolean;
  syncInterval: number; // milliseconds
  retryAttempts: number;
  retryDelay: number;
}

export class SyncEngine {
  private ydoc: Y.Doc;
  private config: SyncConfig;
  private state: SyncState = 'idle';
  private syncTimer: NodeJS.Timeout | null = null;
  private lamportClock: number = 0;
  private listeners: Map<string, Set<(operation: SyncOperation) => void>> = new Map();

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = {
      clientId: this.generateClientId(),
      autoSync: true,
      syncInterval: 30000, // 30 seconds
      retryAttempts: 3,
      retryDelay: 5000,
      ...config,
    };

    this.ydoc = new Y.Doc();
    this.setupYjsObservers();

    if (this.config.autoSync) {
      this.startAutoSync();
    }
  }

  /**
   * Generate a unique client ID
   */
  private generateClientId(): string {
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Setup Yjs observers to track changes
   */
  private setupYjsObservers(): void {
    this.ydoc.on('update', (update: Uint8Array, origin: unknown) => {
      // Only process local changes (not from sync)
      if (origin !== 'sync') {
        this.handleLocalChange(update);
      }
    });
  }

  /**
   * Handle local changes and create sync operations
   */
  private handleLocalChange(update: Uint8Array): void {
    const operation: SyncOperation = {
      id: this.generateOperationId(),
      type: 'update',
      entityType: 'document',
      entityId: this.ydoc.guid,
      timestamp: this.incrementClock(),
      data: {
        update: Array.from(update),
      },
      clientId: this.config.clientId,
    };

    this.emitChange(operation);
  }

  /**
   * Get the shared Yjs document
   */
  getDocument(): Y.Doc {
    return this.ydoc;
  }

  /**
   * Get a shared map from the Yjs document
   */
  getMap<T = unknown>(name: string): Y.Map<T> {
    return this.ydoc.getMap<T>(name);
  }

  /**
   * Get a shared array from the Yjs document
   */
  getArray<T = unknown>(name: string): Y.Array<T> {
    return this.ydoc.getArray<T>(name);
  }

  /**
   * Apply remote update to local document
   */
  applyRemoteUpdate(update: Uint8Array | number[]): void {
    const updateArray = update instanceof Uint8Array ? update : new Uint8Array(update);
    Y.applyUpdate(this.ydoc, updateArray, 'sync');
  }

  /**
   * Get current document state as update
   */
  getStateAsUpdate(): Uint8Array {
    return Y.encodeStateAsUpdate(this.ydoc);
  }

  /**
   * Get state vector for efficient sync
   */
  getStateVector(): Uint8Array {
    return Y.encodeStateVector(this.ydoc);
  }

  /**
   * Calculate diff between local and remote state
   */
  getDiff(remoteStateVector: Uint8Array): Uint8Array {
    return Y.encodeStateAsUpdate(this.ydoc, remoteStateVector);
  }

  /**
   * Merge documents from another client
   */
  mergeDocument(otherDoc: Y.Doc): void {
    const update = Y.encodeStateAsUpdate(otherDoc);
    this.applyRemoteUpdate(update);
  }

  /**
   * Increment Lamport clock
   */
  private incrementClock(): number {
    this.lamportClock++;
    return this.lamportClock;
  }

  /**
   * Update clock based on received timestamp
   */
  updateClock(remoteTimestamp: number): void {
    this.lamportClock = Math.max(this.lamportClock, remoteTimestamp) + 1;
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `op-${this.config.clientId}-${this.lamportClock}-${Date.now()}`;
  }

  /**
   * Listen to sync operations
   */
  onChange(entityType: string, callback: (operation: SyncOperation) => void): () => void {
    if (!this.listeners.has(entityType)) {
      this.listeners.set(entityType, new Set());
    }
    this.listeners.get(entityType)!.add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(entityType);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  /**
   * Emit change to listeners
   */
  private emitChange(operation: SyncOperation): void {
    const listeners = this.listeners.get(operation.entityType);
    if (listeners) {
      listeners.forEach((callback) => callback(operation));
    }

    // Also emit to wildcard listeners
    const wildcardListeners = this.listeners.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach((callback) => callback(operation));
    }
  }

  /**
   * Start automatic sync
   */
  startAutoSync(): void {
    if (this.syncTimer) {
      return;
    }

    this.syncTimer = setInterval(() => {
      this.sync('bidirectional').catch((error) => {
        console.error('Auto-sync failed:', error);
      });
    }, this.config.syncInterval);
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Perform sync with server
   */
  async sync(direction: SyncDirection = 'bidirectional'): Promise<void> {
    if (!this.config.serverUrl) {
      console.warn('No server URL configured, skipping sync');
      return;
    }

    if (this.state === 'syncing') {
      return; // Already syncing
    }

    this.state = 'syncing';

    try {
      if (direction === 'push' || direction === 'bidirectional') {
        await this.pushChanges();
      }

      if (direction === 'pull' || direction === 'bidirectional') {
        await this.pullChanges();
      }

      this.state = 'idle';
    } catch (error) {
      this.state = 'error';
      throw error;
    }
  }

  /**
   * Push local changes to server
   */
  private async pushChanges(): Promise<void> {
    const update = this.getStateAsUpdate();

    const response = await fetch(`${this.config.serverUrl}/sync/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Client-Id': this.config.clientId,
      },
      body: update as unknown as BodyInit,
    });

    if (!response.ok) {
      throw new Error(`Push failed: ${response.statusText}`);
    }
  }

  /**
   * Pull remote changes from server
   */
  private async pullChanges(): Promise<void> {
    const stateVector = this.getStateVector();

    const response = await fetch(`${this.config.serverUrl}/sync/pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Client-Id': this.config.clientId,
      },
      body: stateVector as unknown as BodyInit,
    });

    if (!response.ok) {
      throw new Error(`Pull failed: ${response.statusText}`);
    }

    const update = new Uint8Array(await response.arrayBuffer());
    this.applyRemoteUpdate(update);
  }

  /**
   * Get current sync state
   */
  getState(): SyncState {
    return this.state;
  }

  /**
   * Check if online
   */
  isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopAutoSync();
    this.ydoc.destroy();
    this.listeners.clear();
  }

  /**
   * Export sync state for debugging
   */
  exportState(): {
    clientId: string;
    lamportClock: number;
    state: SyncState;
    documentSize: number;
  } {
    return {
      clientId: this.config.clientId,
      lamportClock: this.lamportClock,
      state: this.state,
      documentSize: this.getStateAsUpdate().length,
    };
  }
}

export const createSyncEngine = (config?: Partial<SyncConfig>): SyncEngine => {
  return new SyncEngine(config);
};
