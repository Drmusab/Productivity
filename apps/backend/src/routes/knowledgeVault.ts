/**
 * @fileoverview Knowledge Vault API Routes
 * Unified REST API for Obsidian-style knowledge management
 * @module routes/knowledgeVault
 */

import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/jwtAuth';
import { KnowledgeVaultService, VaultItemType, PARACategory } from '../services/knowledgeVault';

const router = express.Router();

/**
 * Initialize vault tables
 * POST /api/vault/initialize
 */
router.post('/initialize', authenticateToken, async (req: Request, res: Response) => {
  try {
    await KnowledgeVaultService.initializeVault();
    res.json({ message: 'Knowledge Vault initialized successfully' });
  } catch (error: any) {
    console.error('Error initializing vault:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all vault items with filters
 * GET /api/vault/items
 */
router.get('/items', authenticateToken, async (req: Request, res: Response) => {
  try {
    const filters: any = {
      created_by: (req as any).user.id,
    };

    if (req.query.type) {
      filters.type = req.query.type as VaultItemType;
    }

    if (req.query.para_category) {
      filters.para_category = req.query.para_category as PARACategory;
    }

    if (req.query.folder_path) {
      filters.folder_path = req.query.folder_path as string;
    }

    if (req.query.search) {
      filters.search = req.query.search as string;
    }

    if (req.query.tags) {
      const tagsStr = req.query.tags as string;
      filters.tags = tagsStr.split(',').map(t => t.trim());
    }

    const items = await KnowledgeVaultService.getVaultItems(filters);
    res.json(items);
  } catch (error: any) {
    console.error('Error getting vault items:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get a single vault item
 * GET /api/vault/items/:id
 */
router.get('/items/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const item = await KnowledgeVaultService.getVaultItem(req.params.id);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Check ownership
    if (item.created_by !== (req as any).user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(item);
  } catch (error: any) {
    console.error('Error getting vault item:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create a new vault item
 * POST /api/vault/items
 */
router.post('/items', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { type, title, content, para_category, folder_path, tags, metadata, linked_items } = req.body;

    if (!type || !title) {
      return res.status(400).json({ error: 'Type and title are required' });
    }

    const item = await KnowledgeVaultService.createVaultItem({
      type,
      title,
      content: content || '',
      para_category: para_category || null,
      folder_path: folder_path || null,
      tags: tags || [],
      metadata: metadata || {},
      linked_items: linked_items || [],
      created_by: (req as any).user.id,
    });

    res.status(201).json(item);
  } catch (error: any) {
    console.error('Error creating vault item:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update a vault item
 * PUT /api/vault/items/:id
 */
router.put('/items/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Check if item exists and user owns it
    const existing = await KnowledgeVaultService.getVaultItem(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (existing.created_by !== (req as any).user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { title, content, para_category, folder_path, tags, metadata, linked_items } = req.body;

    const updated = await KnowledgeVaultService.updateVaultItem(req.params.id, {
      title,
      content,
      para_category,
      folder_path,
      tags,
      metadata,
      linked_items,
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating vault item:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete a vault item
 * DELETE /api/vault/items/:id
 */
router.delete('/items/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Check if item exists and user owns it
    const existing = await KnowledgeVaultService.getVaultItem(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (existing.created_by !== (req as any).user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await KnowledgeVaultService.deleteVaultItem(req.params.id);
    res.json({ message: 'Item deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting vault item:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create a link between vault items
 * POST /api/vault/links
 */
router.post('/links', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { source_id, target_id, link_type } = req.body;

    if (!source_id || !target_id) {
      return res.status(400).json({ error: 'Source and target IDs are required' });
    }

    // Verify both items exist and user owns the source
    const sourceItem = await KnowledgeVaultService.getVaultItem(source_id);
    const targetItem = await KnowledgeVaultService.getVaultItem(target_id);

    if (!sourceItem || !targetItem) {
      return res.status(404).json({ error: 'Source or target item not found' });
    }

    if (sourceItem.created_by !== (req as any).user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const link = await KnowledgeVaultService.createVaultLink(source_id, target_id, link_type);
    res.status(201).json(link);
  } catch (error: any) {
    console.error('Error creating vault link:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get links for a vault item
 * GET /api/vault/items/:id/links
 */
router.get('/items/:id/links', authenticateToken, async (req: Request, res: Response) => {
  try {
    const item = await KnowledgeVaultService.getVaultItem(req.params.id);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (item.created_by !== (req as any).user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const links = await KnowledgeVaultService.getVaultLinks(req.params.id);
    res.json(links);
  } catch (error: any) {
    console.error('Error getting vault links:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete a vault link
 * DELETE /api/vault/links/:id
 */
router.delete('/links/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    await KnowledgeVaultService.deleteVaultLink(req.params.id);
    res.json({ message: 'Link deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting vault link:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Search vault items
 * GET /api/vault/search
 */
router.get('/search', authenticateToken, async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const results = await KnowledgeVaultService.searchVault(query, (req as any).user.id);
    res.json(results);
  } catch (error: any) {
    console.error('Error searching vault:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get vault statistics
 * GET /api/vault/stats
 */
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const stats = await KnowledgeVaultService.getVaultStats((req as any).user.id);
    res.json(stats);
  } catch (error: any) {
    console.error('Error getting vault stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Migrate existing data to vault
 * POST /api/vault/migrate
 */
router.post('/migrate', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await KnowledgeVaultService.migrateToVault((req as any).user.id);
    res.json(result);
  } catch (error: any) {
    console.error('Error migrating to vault:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
