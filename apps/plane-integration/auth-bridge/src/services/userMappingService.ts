/**
 * User Mapping Service
 * 
 * Manages the mapping between Productivity OS users and Plane users
 */

import { Pool } from 'pg';

interface UserMapping {
  productivity_user_id: string;
  plane_user_id: string;
  username: string;
  email: string;
  created_at: Date;
}

export class UserMappingService {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.POSTGRES_HOST || 'productivity-postgres',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: 'auth_bridge',
      user: process.env.POSTGRES_USER || 'productivity',
      password: process.env.POSTGRES_PASSWORD || 'change-this-password',
    });

    this.initializeDatabase();
  }

  /**
   * Initialize database schema
   */
  private async initializeDatabase(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS user_mappings (
        id SERIAL PRIMARY KEY,
        productivity_user_id VARCHAR(255) NOT NULL UNIQUE,
        plane_user_id VARCHAR(255) NOT NULL UNIQUE,
        username VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_productivity_user 
        ON user_mappings(productivity_user_id);
      CREATE INDEX IF NOT EXISTS idx_plane_user 
        ON user_mappings(plane_user_id);
    `;

    try {
      await this.pool.query(createTableQuery);
      console.log('User mappings table initialized');
    } catch (error) {
      console.error('Error initializing user mappings table:', error);
    }
  }

  /**
   * Get user mapping by Productivity OS user ID
   */
  async getMapping(productivityUserId: string): Promise<UserMapping | null> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM user_mappings WHERE productivity_user_id = $1',
        [productivityUserId]
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error getting user mapping:', error);
      throw error;
    }
  }

  /**
   * Get or create Plane user for a Productivity OS user
   */
  async getOrCreatePlaneUser(
    productivityUserId: string,
    username: string,
    email: string
  ): Promise<UserMapping> {
    // Check if mapping exists
    const existing = await this.getMapping(productivityUserId);
    if (existing) {
      return existing;
    }

    // Create new mapping
    // For now, we'll use the same ID for both systems
    // In production, this should create a user in Plane via API
    const planeUserId = `plane_${productivityUserId}`;

    try {
      const result = await this.pool.query(
        `INSERT INTO user_mappings 
         (productivity_user_id, plane_user_id, username, email) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [productivityUserId, planeUserId, username, email]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error creating user mapping:', error);
      throw error;
    }
  }

  /**
   * Update user mapping
   */
  async updateMapping(
    productivityUserId: string,
    updates: Partial<UserMapping>
  ): Promise<UserMapping | null> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (updates.username) {
        fields.push(`username = $${paramCount++}`);
        values.push(updates.username);
      }
      if (updates.email) {
        fields.push(`email = $${paramCount++}`);
        values.push(updates.email);
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(productivityUserId);

      const query = `
        UPDATE user_mappings 
        SET ${fields.join(', ')}
        WHERE productivity_user_id = $${paramCount}
        RETURNING *
      `;

      const result = await this.pool.query(query, values);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error updating user mapping:', error);
      throw error;
    }
  }
}
