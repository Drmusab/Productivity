/**
 * @fileoverview Base repository class providing common database operations.
 * Implements repository pattern for clean separation of data access logic.
 * @module repositories/BaseRepository
 */

import { getAsync, runAsync, allAsync } from '../utils/database';
import { DatabaseError } from '../middleware/errorHandler';
import logger from '../utils/logger';

/**
 * Database parameter type
 */
type DatabaseParam = string | number | boolean | null | undefined;

/**
 * Count result type
 */
interface CountResult {
  count: number;
}

/**
 * Base repository class with common CRUD operations
 * @template T - The entity type
 */
export abstract class BaseRepository<T> {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  /**
   * Find a record by ID
   * @param id - Record ID
   * @returns Promise resolving to the record or undefined
   */
  async findById(id: number): Promise<T | undefined> {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE id = ?`;
      const result = await getAsync<T>(query, [id]);
      return result;
    } catch (error: unknown) {
      const err = error as Error;
      logger.error(`Error finding ${this.tableName} by ID`, { id, error: err.message });
      throw new DatabaseError(`Failed to find ${this.tableName}`, err.message);
    }
  }

  /**
   * Find all records with optional conditions
   * @param conditions - WHERE clause conditions
   * @param params - Query parameters
   * @returns Promise resolving to array of records
   */
  async findAll(conditions?: string, params?: DatabaseParam[]): Promise<T[]> {
    try {
      let query = `SELECT * FROM ${this.tableName}`;
      if (conditions) {
        query += ` WHERE ${conditions}`;
      }
      
      const results = await allAsync<T>(query, params || []);
      return results;
    } catch (error: unknown) {
      const err = error as Error;
      logger.error(`Error finding all ${this.tableName}`, { error: err.message });
      throw new DatabaseError(`Failed to fetch ${this.tableName} records`, err.message);
    }
  }

  /**
   * Find one record matching conditions
   * @param conditions - WHERE clause conditions
   * @param params - Query parameters
   * @returns Promise resolving to the record or undefined
   */
  async findOne(conditions: string, params: DatabaseParam[]): Promise<T | undefined> {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE ${conditions} LIMIT 1`;
      const result = await getAsync<T>(query, params);
      return result;
    } catch (error: unknown) {
      const err = error as Error;
      logger.error(`Error finding one ${this.tableName}`, { error: err.message });
      throw new DatabaseError(`Failed to find ${this.tableName}`, err.message);
    }
  }

  /**
   * Create a new record
   * @param data - Record data
   * @returns Promise resolving to the new record ID
   */
  async create(data: Partial<T>): Promise<number> {
    try {
      const keys = Object.keys(data);
      const values = Object.values(data) as DatabaseParam[];
      const placeholders = keys.map(() => '?').join(', ');
      
      const query = `
        INSERT INTO ${this.tableName} (${keys.join(', ')})
        VALUES (${placeholders})
      `;
      
      const result = await runAsync(query, values);
      return result.lastID;
    } catch (error: unknown) {
      const err = error as Error;
      logger.error(`Error creating ${this.tableName}`, { error: err.message });
      throw new DatabaseError(`Failed to create ${this.tableName}`, err.message);
    }
  }

  /**
   * Update a record by ID
   * @param id - Record ID
   * @param data - Updated data
   * @returns Promise resolving to number of rows changed
   */
  async update(id: number, data: Partial<T>): Promise<number> {
    try {
      const keys = Object.keys(data);
      const values = Object.values(data) as DatabaseParam[];
      const setClause = keys.map(key => `${key} = ?`).join(', ');
      
      const query = `
        UPDATE ${this.tableName}
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      const result = await runAsync(query, [...values, id]);
      return result.changes;
    } catch (error: unknown) {
      const err = error as Error;
      logger.error(`Error updating ${this.tableName}`, { id, error: err.message });
      throw new DatabaseError(`Failed to update ${this.tableName}`, err.message);
    }
  }

  /**
   * Delete a record by ID
   * @param id - Record ID
   * @returns Promise resolving to number of rows deleted
   */
  async delete(id: number): Promise<number> {
    try {
      const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
      const result = await runAsync(query, [id]);
      return result.changes;
    } catch (error: unknown) {
      const err = error as Error;
      logger.error(`Error deleting ${this.tableName}`, { id, error: err.message });
      throw new DatabaseError(`Failed to delete ${this.tableName}`, err.message);
    }
  }

  /**
   * Count records with optional conditions
   * @param conditions - WHERE clause conditions
   * @param params - Query parameters
   * @returns Promise resolving to count
   */
  async count(conditions?: string, params?: DatabaseParam[]): Promise<number> {
    try {
      let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
      if (conditions) {
        query += ` WHERE ${conditions}`;
      }
      
      const result = await getAsync<CountResult>(query, params || []);
      return result?.count || 0;
    } catch (error: unknown) {
      const err = error as Error;
      logger.error(`Error counting ${this.tableName}`, { error: err.message });
      throw new DatabaseError(`Failed to count ${this.tableName} records`, err.message);
    }
  }

  /**
   * Check if a record exists by ID
   * @param id - Record ID
   * @returns Promise resolving to boolean
   */
  async exists(id: number): Promise<boolean> {
    try {
      const count = await this.count('id = ?', [id]);
      return count > 0;
    } catch (error: unknown) {
      const err = error as Error;
      logger.error(`Error checking if ${this.tableName} exists`, { id, error: err.message });
      throw new DatabaseError(`Failed to check ${this.tableName} existence`, err.message);
    }
  }

  /**
   * Execute a custom query
   * @param query - SQL query
   * @param params - Query parameters
   * @returns Promise resolving to query results
   */
  protected async executeQuery<R = Record<string, unknown>>(query: string, params: DatabaseParam[] = []): Promise<R[]> {
    try {
      return await allAsync<R>(query, params);
    } catch (error: unknown) {
      const err = error as Error;
      logger.error('Error executing custom query', { error: err.message });
      throw new DatabaseError('Failed to execute query', err.message);
    }
  }

  /**
   * Execute a custom query that returns a single row
   * @param query - SQL query
   * @param params - Query parameters
   * @returns Promise resolving to single row or undefined
   */
  protected async executeQueryOne<R = Record<string, unknown>>(query: string, params: DatabaseParam[] = []): Promise<R | undefined> {
    try {
      return await getAsync<R>(query, params);
    } catch (error: unknown) {
      const err = error as Error;
      logger.error('Error executing custom query', { error: err.message });
      throw new DatabaseError('Failed to execute query', err.message);
    }
  }
}
