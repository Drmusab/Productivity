/**
 * @fileoverview Database Service
 * 
 * Provides high-level operations for managing databases, views, and rows.
 * Built on top of the block system and query engine.
 */

import { randomUUID } from 'crypto';
import { BlockCRUDEngine } from './blockCRUD';
import { DatabaseQueryEngine } from './databaseQueryEngine';
import { BlockType, DatabaseBlockData, DatabaseRowBlockData, Block } from '../types/blocks';
import {
  Property,
  PropertyType,
  DatabaseView,
  ViewType,
  TableView,
  BoardView,
  CalendarView,
  TimelineView,
  GalleryView,
  DatabaseQueryOptions,
  DatabaseQueryResult,
  PropertyValue,
} from '../types/database';

/**
 * Database Service
 * Manages databases, views, and rows using the block system
 */
export class DatabaseService {
  private blockEngine: BlockCRUDEngine;
  private views: Map<string, DatabaseView>;
  
  constructor(blockEngine: BlockCRUDEngine) {
    this.blockEngine = blockEngine;
    this.views = new Map();
  }
  
  // ===== Database Operations =====
  
  /**
   * Create a new database
   */
  createDatabase(params: {
    name: string;
    description?: string;
    icon?: string;
    properties?: Property[];
    parentId?: string;
  }): string {
    const properties = params.properties || [];
    
    const block = this.blockEngine.create({
      type: BlockType.DATABASE,
      data: {
        name: params.name,
        description: params.description,
        icon: params.icon,
        properties: JSON.stringify(properties),
      },
      parentId: params.parentId || null,
    });
    
    return block.id;
  }
  
  /**
   * Get database by ID
   */
  getDatabase(databaseId: string): {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    properties: Property[];
    defaultViewId?: string;
  } | null {
    const block = this.blockEngine.get(databaseId);
    if (!block || block.type !== BlockType.DATABASE) {
      return null;
    }
    
    const data = block.data as DatabaseBlockData;
    return {
      id: block.id,
      name: data.name,
      description: data.description,
      icon: data.icon,
      properties: JSON.parse(data.properties),
      defaultViewId: data.defaultViewId,
    };
  }
  
  /**
   * Update database
   */
  updateDatabase(databaseId: string, params: {
    name?: string;
    description?: string;
    icon?: string;
    properties?: Property[];
    defaultViewId?: string;
  }): void {
    const block = this.blockEngine.get(databaseId);
    if (!block || block.type !== BlockType.DATABASE) {
      throw new Error('Database not found');
    }
    
    const updates: Partial<DatabaseBlockData> = {};
    
    if (params.name !== undefined) updates.name = params.name;
    if (params.description !== undefined) updates.description = params.description;
    if (params.icon !== undefined) updates.icon = params.icon;
    if (params.properties !== undefined) {
      updates.properties = JSON.stringify(params.properties);
    }
    if (params.defaultViewId !== undefined) {
      updates.defaultViewId = params.defaultViewId;
    }
    
    this.blockEngine.update({
      id: databaseId,
      data: updates,
    });
  }
  
  /**
   * Delete database
   */
  deleteDatabase(databaseId: string): void {
    this.blockEngine.delete({
      id: databaseId,
      deleteChildren: true,
    });
    
    // Delete associated views
    const viewsToDelete: string[] = [];
    for (const [viewId, view] of this.views.entries()) {
      if (view.databaseId === databaseId) {
        viewsToDelete.push(viewId);
      }
    }
    viewsToDelete.forEach(viewId => this.views.delete(viewId));
  }
  
  /**
   * Add property to database
   */
  addProperty(databaseId: string, property: Omit<Property, 'id'>): string {
    const db = this.getDatabase(databaseId);
    if (!db) {
      throw new Error('Database not found');
    }
    
    const newProperty: Property = {
      ...property,
      id: randomUUID(),
    } as Property;
    
    db.properties.push(newProperty);
    this.updateDatabase(databaseId, { properties: db.properties });
    
    return newProperty.id;
  }
  
  /**
   * Update property in database
   */
  updateProperty(databaseId: string, propertyId: string, updates: Partial<Property>): void {
    const db = this.getDatabase(databaseId);
    if (!db) {
      throw new Error('Database not found');
    }
    
    const propertyIndex = db.properties.findIndex(p => p.id === propertyId);
    if (propertyIndex === -1) {
      throw new Error('Property not found');
    }
    
    db.properties[propertyIndex] = {
      ...db.properties[propertyIndex],
      ...updates,
    } as Property;
    
    this.updateDatabase(databaseId, { properties: db.properties });
  }
  
  /**
   * Delete property from database
   */
  deleteProperty(databaseId: string, propertyId: string): void {
    const db = this.getDatabase(databaseId);
    if (!db) {
      throw new Error('Database not found');
    }
    
    db.properties = db.properties.filter(p => p.id !== propertyId);
    this.updateDatabase(databaseId, { properties: db.properties });
    
    // Remove property values from all rows
    const rows = this.getRows(databaseId);
    for (const row of rows) {
      const values = { ...row.values };
      delete values[propertyId];
      this.updateRow(row.id, { values });
    }
  }
  
  // ===== Row Operations =====
  
  /**
   * Create a new row in database
   */
  createRow(databaseId: string, values: Record<string, PropertyValue> = {}): string {
    const db = this.getDatabase(databaseId);
    if (!db) {
      throw new Error('Database not found');
    }
    
    const block = this.blockEngine.create({
      type: BlockType.DB_ROW,
      data: {
        databaseId,
        values: JSON.stringify(values),
      },
      parentId: databaseId,
    });
    
    return block.id;
  }
  
  /**
   * Get row by ID
   */
  getRow(rowId: string): {
    id: string;
    databaseId: string;
    values: Record<string, PropertyValue>;
    archived?: boolean;
    pinned?: boolean;
  } | null {
    const block = this.blockEngine.get(rowId);
    if (!block || block.type !== BlockType.DB_ROW) {
      return null;
    }
    
    const data = block.data as DatabaseRowBlockData;
    return {
      id: block.id,
      databaseId: data.databaseId,
      values: JSON.parse(data.values),
      archived: data.archived,
      pinned: data.pinned,
    };
  }
  
  /**
   * Get all rows in a database
   */
  getRows(databaseId: string): Array<{
    id: string;
    databaseId: string;
    values: Record<string, PropertyValue>;
    archived?: boolean;
    pinned?: boolean;
  }> {
    const children = this.blockEngine.getChildren(databaseId);
    return children
      .filter(block => block.type === BlockType.DB_ROW)
      .map(block => {
        const data = block.data as DatabaseRowBlockData;
        return {
          id: block.id,
          databaseId: data.databaseId,
          values: JSON.parse(data.values),
          archived: data.archived,
          pinned: data.pinned,
        };
      });
  }
  
  /**
   * Update row
   */
  updateRow(rowId: string, params: {
    values?: Record<string, PropertyValue>;
    archived?: boolean;
    pinned?: boolean;
  }): void {
    const block = this.blockEngine.get(rowId);
    if (!block || block.type !== BlockType.DB_ROW) {
      throw new Error('Row not found');
    }
    
    const updates: Partial<DatabaseRowBlockData> = {};
    
    if (params.values !== undefined) {
      updates.values = JSON.stringify(params.values);
    }
    if (params.archived !== undefined) {
      updates.archived = params.archived;
    }
    if (params.pinned !== undefined) {
      updates.pinned = params.pinned;
    }
    
    this.blockEngine.update({
      id: rowId,
      data: updates,
    });
  }
  
  /**
   * Delete row
   */
  deleteRow(rowId: string): void {
    this.blockEngine.delete({
      id: rowId,
      deleteChildren: true,
    });
  }
  
  // ===== View Operations =====
  
  /**
   * Create a new view
   */
  createView(view: Omit<DatabaseView, 'id' | 'createdAt' | 'updatedAt'>): string {
    const now = new Date().toISOString();
    const newView: DatabaseView = {
      ...view,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    } as DatabaseView;
    
    this.views.set(newView.id, newView);
    return newView.id;
  }
  
  /**
   * Get view by ID
   */
  getView(viewId: string): DatabaseView | null {
    return this.views.get(viewId) || null;
  }
  
  /**
   * Get all views for a database
   */
  getViews(databaseId: string): DatabaseView[] {
    return Array.from(this.views.values()).filter(
      view => view.databaseId === databaseId
    );
  }
  
  /**
   * Update view
   */
  updateView(viewId: string, updates: Partial<DatabaseView>): void {
    const view = this.views.get(viewId);
    if (!view) {
      throw new Error('View not found');
    }
    
    const updatedView = {
      ...view,
      ...updates,
      updatedAt: new Date().toISOString(),
    } as DatabaseView;
    
    this.views.set(viewId, updatedView);
  }
  
  /**
   * Delete view
   */
  deleteView(viewId: string): void {
    this.views.delete(viewId);
  }
  
  // ===== Query Operations =====
  
  /**
   * Execute a query against database rows
   */
  queryRows(databaseId: string, options: DatabaseQueryOptions = {}): DatabaseQueryResult {
    const db = this.getDatabase(databaseId);
    if (!db) {
      throw new Error('Database not found');
    }
    
    const rows = this.getRows(databaseId);
    const rowData: DatabaseRowBlockData[] = rows.map(row => ({
      databaseId: row.databaseId,
      values: JSON.stringify(row.values),
      archived: row.archived,
      pinned: row.pinned,
    }));
    
    return DatabaseQueryEngine.query(rowData, db.properties, options);
  }
  
  /**
   * Execute a view query (view includes its own filter/sort config)
   */
  queryView(viewId: string, additionalOptions: DatabaseQueryOptions = {}): DatabaseQueryResult {
    const view = this.views.get(viewId);
    if (!view) {
      throw new Error('View not found');
    }
    
    const options: DatabaseQueryOptions = {
      filter: view.filter,
      sort: view.sort,
      ...additionalOptions,
    };
    
    // For board views, add grouping
    if (view.type === ViewType.BOARD) {
      const boardView = view as BoardView;
      options.groupBy = boardView.config.groupByPropertyId;
    }
    
    return this.queryRows(view.databaseId, options);
  }
  
  // ===== Utility Methods =====
  
  /**
   * Get database statistics
   */
  getDatabaseStats(databaseId: string): {
    totalRows: number;
    archivedRows: number;
    activeRows: number;
    properties: number;
    views: number;
  } {
    const db = this.getDatabase(databaseId);
    if (!db) {
      throw new Error('Database not found');
    }
    
    const rows = this.getRows(databaseId);
    const archivedRows = rows.filter(r => r.archived).length;
    
    return {
      totalRows: rows.length,
      archivedRows,
      activeRows: rows.length - archivedRows,
      properties: db.properties.length,
      views: this.getViews(databaseId).length,
    };
  }
  
  /**
   * Export database as JSON
   */
  exportDatabase(databaseId: string): {
    database: ReturnType<DatabaseService['getDatabase']>;
    rows: ReturnType<DatabaseService['getRows']>;
    views: DatabaseView[];
  } {
    return {
      database: this.getDatabase(databaseId),
      rows: this.getRows(databaseId),
      views: this.getViews(databaseId),
    };
  }
  
  /**
   * Import database from JSON
   */
  importDatabase(data: {
    database: {
      name: string;
      description?: string;
      icon?: string;
      properties: Property[];
    };
    rows: Array<{ values: Record<string, PropertyValue> }>;
    views: Array<Omit<DatabaseView, 'id' | 'databaseId' | 'createdAt' | 'updatedAt'>>;
  }): string {
    // Create database
    const databaseId = this.createDatabase({
      name: data.database.name,
      description: data.database.description,
      icon: data.database.icon,
      properties: data.database.properties,
    });
    
    // Import rows
    for (const row of data.rows) {
      this.createRow(databaseId, row.values);
    }
    
    // Import views
    for (const view of data.views) {
      this.createView({
        ...view,
        databaseId,
      } as any);
    }
    
    return databaseId;
  }
}
