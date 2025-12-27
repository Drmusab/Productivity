/**
 * @fileoverview Database API Routes
 * 
 * Provides REST API endpoints for managing databases, views, and rows.
 */

import { Router, Request, Response } from 'express';
import { BlockCRUDEngine } from '../services/blockCRUD';
import { DatabaseService } from '../services/databaseService';
import { PropertyType, ViewType } from '../types/database';
import { AuthenticatedRequest } from '../types';

const router = Router();

// Create global instances
const blockEngine = new BlockCRUDEngine();
const databaseService = new DatabaseService(blockEngine);

// ===== Database Routes =====

/**
 * POST /api/databases
 * Create a new database
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, icon, properties, parentId } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Database name is required' });
    }
    
    const databaseId = databaseService.createDatabase({
      name,
      description,
      icon,
      properties,
      parentId,
    });
    
    const database = databaseService.getDatabase(databaseId);
    
    res.status(201).json({
      success: true,
      database,
    });
  } catch (error: any) {
    console.error('Error creating database:', error);
    res.status(500).json({ error: error.message || 'Failed to create database' });
  }
});

/**
 * GET /api/databases/:id
 * Get database by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const database = databaseService.getDatabase(id);
    
    if (!database) {
      return res.status(404).json({ error: 'Database not found' });
    }
    
    res.json({
      success: true,
      database,
    });
  } catch (error: any) {
    console.error('Error getting database:', error);
    res.status(500).json({ error: error.message || 'Failed to get database' });
  }
});

/**
 * PUT /api/databases/:id
 * Update database
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, icon, properties, defaultViewId } = req.body;
    
    databaseService.updateDatabase(id, {
      name,
      description,
      icon,
      properties,
      defaultViewId,
    });
    
    const database = databaseService.getDatabase(id);
    
    res.json({
      success: true,
      database,
    });
  } catch (error: any) {
    console.error('Error updating database:', error);
    res.status(500).json({ error: error.message || 'Failed to update database' });
  }
});

/**
 * DELETE /api/databases/:id
 * Delete database
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    databaseService.deleteDatabase(id);
    
    res.json({
      success: true,
      message: 'Database deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting database:', error);
    res.status(500).json({ error: error.message || 'Failed to delete database' });
  }
});

/**
 * GET /api/databases/:id/stats
 * Get database statistics
 */
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const stats = databaseService.getDatabaseStats(id);
    
    res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error('Error getting database stats:', error);
    res.status(500).json({ error: error.message || 'Failed to get database stats' });
  }
});

/**
 * POST /api/databases/:id/export
 * Export database
 */
router.post('/:id/export', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = databaseService.exportDatabase(id);
    
    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('Error exporting database:', error);
    res.status(500).json({ error: error.message || 'Failed to export database' });
  }
});

/**
 * POST /api/databases/import
 * Import database
 */
router.post('/import', async (req: Request, res: Response) => {
  try {
    const { database, rows, views } = req.body;
    
    if (!database || !database.name) {
      return res.status(400).json({ error: 'Invalid database data' });
    }
    
    const databaseId = databaseService.importDatabase({
      database,
      rows: rows || [],
      views: views || [],
    });
    
    const importedDatabase = databaseService.getDatabase(databaseId);
    
    res.status(201).json({
      success: true,
      database: importedDatabase,
    });
  } catch (error: any) {
    console.error('Error importing database:', error);
    res.status(500).json({ error: error.message || 'Failed to import database' });
  }
});

// ===== Property Routes =====

/**
 * POST /api/databases/:id/properties
 * Add property to database
 */
router.post('/:id/properties', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const property = req.body;
    
    if (!property.name || !property.type) {
      return res.status(400).json({ error: 'Property name and type are required' });
    }
    
    const propertyId = databaseService.addProperty(id, property);
    const database = databaseService.getDatabase(id);
    const addedProperty = database?.properties.find(p => p.id === propertyId);
    
    res.status(201).json({
      success: true,
      property: addedProperty,
    });
  } catch (error: any) {
    console.error('Error adding property:', error);
    res.status(500).json({ error: error.message || 'Failed to add property' });
  }
});

/**
 * PUT /api/databases/:id/properties/:propertyId
 * Update property
 */
router.put('/:id/properties/:propertyId', async (req: Request, res: Response) => {
  try {
    const { id, propertyId } = req.params;
    const updates = req.body;
    
    databaseService.updateProperty(id, propertyId, updates);
    const database = databaseService.getDatabase(id);
    const updatedProperty = database?.properties.find(p => p.id === propertyId);
    
    res.json({
      success: true,
      property: updatedProperty,
    });
  } catch (error: any) {
    console.error('Error updating property:', error);
    res.status(500).json({ error: error.message || 'Failed to update property' });
  }
});

/**
 * DELETE /api/databases/:id/properties/:propertyId
 * Delete property
 */
router.delete('/:id/properties/:propertyId', async (req: Request, res: Response) => {
  try {
    const { id, propertyId } = req.params;
    databaseService.deleteProperty(id, propertyId);
    
    res.json({
      success: true,
      message: 'Property deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting property:', error);
    res.status(500).json({ error: error.message || 'Failed to delete property' });
  }
});

// ===== Row Routes =====

/**
 * POST /api/databases/:id/rows
 * Create a new row
 */
router.post('/:id/rows', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { values } = req.body;
    
    const rowId = databaseService.createRow(id, values || {});
    const row = databaseService.getRow(rowId);
    
    res.status(201).json({
      success: true,
      row,
    });
  } catch (error: any) {
    console.error('Error creating row:', error);
    res.status(500).json({ error: error.message || 'Failed to create row' });
  }
});

/**
 * GET /api/databases/:id/rows
 * Get all rows in database
 */
router.get('/:id/rows', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rows = databaseService.getRows(id);
    
    res.json({
      success: true,
      rows,
      count: rows.length,
    });
  } catch (error: any) {
    console.error('Error getting rows:', error);
    res.status(500).json({ error: error.message || 'Failed to get rows' });
  }
});

/**
 * GET /api/databases/:id/rows/:rowId
 * Get row by ID
 */
router.get('/:id/rows/:rowId', async (req: Request, res: Response) => {
  try {
    const { rowId } = req.params;
    const row = databaseService.getRow(rowId);
    
    if (!row) {
      return res.status(404).json({ error: 'Row not found' });
    }
    
    res.json({
      success: true,
      row,
    });
  } catch (error: any) {
    console.error('Error getting row:', error);
    res.status(500).json({ error: error.message || 'Failed to get row' });
  }
});

/**
 * PUT /api/databases/:id/rows/:rowId
 * Update row
 */
router.put('/:id/rows/:rowId', async (req: Request, res: Response) => {
  try {
    const { rowId } = req.params;
    const { values, archived, pinned } = req.body;
    
    databaseService.updateRow(rowId, {
      values,
      archived,
      pinned,
    });
    
    const row = databaseService.getRow(rowId);
    
    res.json({
      success: true,
      row,
    });
  } catch (error: any) {
    console.error('Error updating row:', error);
    res.status(500).json({ error: error.message || 'Failed to update row' });
  }
});

/**
 * DELETE /api/databases/:id/rows/:rowId
 * Delete row
 */
router.delete('/:id/rows/:rowId', async (req: Request, res: Response) => {
  try {
    const { rowId } = req.params;
    databaseService.deleteRow(rowId);
    
    res.json({
      success: true,
      message: 'Row deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting row:', error);
    res.status(500).json({ error: error.message || 'Failed to delete row' });
  }
});

// ===== View Routes =====

/**
 * POST /api/databases/:id/views
 * Create a new view
 */
router.post('/:id/views', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const view = req.body;
    
    if (!view.name || !view.type) {
      return res.status(400).json({ error: 'View name and type are required' });
    }
    
    view.databaseId = id;
    const viewId = databaseService.createView(view);
    const createdView = databaseService.getView(viewId);
    
    res.status(201).json({
      success: true,
      view: createdView,
    });
  } catch (error: any) {
    console.error('Error creating view:', error);
    res.status(500).json({ error: error.message || 'Failed to create view' });
  }
});

/**
 * GET /api/databases/:id/views
 * Get all views for database
 */
router.get('/:id/views', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const views = databaseService.getViews(id);
    
    res.json({
      success: true,
      views,
      count: views.length,
    });
  } catch (error: any) {
    console.error('Error getting views:', error);
    res.status(500).json({ error: error.message || 'Failed to get views' });
  }
});

/**
 * GET /api/databases/views/:viewId
 * Get view by ID
 */
router.get('/views/:viewId', async (req: Request, res: Response) => {
  try {
    const { viewId } = req.params;
    const view = databaseService.getView(viewId);
    
    if (!view) {
      return res.status(404).json({ error: 'View not found' });
    }
    
    res.json({
      success: true,
      view,
    });
  } catch (error: any) {
    console.error('Error getting view:', error);
    res.status(500).json({ error: error.message || 'Failed to get view' });
  }
});

/**
 * PUT /api/databases/views/:viewId
 * Update view
 */
router.put('/views/:viewId', async (req: Request, res: Response) => {
  try {
    const { viewId } = req.params;
    const updates = req.body;
    
    databaseService.updateView(viewId, updates);
    const view = databaseService.getView(viewId);
    
    res.json({
      success: true,
      view,
    });
  } catch (error: any) {
    console.error('Error updating view:', error);
    res.status(500).json({ error: error.message || 'Failed to update view' });
  }
});

/**
 * DELETE /api/databases/views/:viewId
 * Delete view
 */
router.delete('/views/:viewId', async (req: Request, res: Response) => {
  try {
    const { viewId } = req.params;
    databaseService.deleteView(viewId);
    
    res.json({
      success: true,
      message: 'View deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting view:', error);
    res.status(500).json({ error: error.message || 'Failed to delete view' });
  }
});

// ===== Query Routes =====

/**
 * POST /api/databases/:id/query
 * Execute a query against database rows
 */
router.post('/:id/query', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const options = req.body;
    
    const result = databaseService.queryRows(id, options);
    
    res.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('Error querying database:', error);
    res.status(500).json({ error: error.message || 'Failed to query database' });
  }
});

/**
 * POST /api/databases/views/:viewId/query
 * Execute a view query
 */
router.post('/views/:viewId/query', async (req: Request, res: Response) => {
  try {
    const { viewId } = req.params;
    const additionalOptions = req.body;
    
    const result = databaseService.queryView(viewId, additionalOptions);
    
    res.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('Error querying view:', error);
    res.status(500).json({ error: error.message || 'Failed to query view' });
  }
});

export default router;
export { databaseService, blockEngine };
