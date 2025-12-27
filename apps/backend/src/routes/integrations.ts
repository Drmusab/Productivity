// @ts-nocheck
import express from 'express';
const router = express.Router();
import {  body, validationResult  } from 'express-validator';
import {  db  } from '../utils/database';
import axios from 'axios';

// Get all integrations
router.get('/', (req, res) => {
  db.all(
    'SELECT i.*, u.username as created_by_name FROM integrations i LEFT JOIN users u ON i.created_by = u.id ORDER BY i.created_at DESC',
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Parse config JSON for each integration
      const integrations = rows.map(row => ({
        ...row,
        config: JSON.parse(row.config)
      }));
      
      res.json(integrations);
    }
  );
});

// Get a specific integration
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  db.get(
    'SELECT i.*, u.username as created_by_name FROM integrations i LEFT JOIN users u ON i.created_by = u.id WHERE i.id = ?',
    [id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (!row) {
        return res.status(404).json({ error: 'Integration not found' });
      }
      
      // Parse config JSON
      const integration = {
        ...row,
        config: JSON.parse(row.config)
      };
      
      res.json(integration);
    }
  );
});

// Create a new integration
router.post('/', [
  body('name').notEmpty().withMessage('Integration name is required'),
  body('type').notEmpty().withMessage('Integration type is required'),
  body('config').notEmpty().withMessage('Integration config is required'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { name, type, config, enabled = 1, created_by } = req.body;
  
  db.run(
    'INSERT INTO integrations (name, type, config, enabled, created_by) VALUES (?, ?, ?, ?, ?)',
    [name, type, JSON.stringify(config), enabled, created_by],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.status(201).json({ id: this.lastID, message: 'Integration created successfully' });
    }
  );
});

// Update an integration
router.put('/:id', [
  body('name').optional().notEmpty().withMessage('Integration name cannot be empty'),
  body('type').optional().notEmpty().withMessage('Integration type cannot be empty'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { id } = req.params;
  const { name, type, config, enabled } = req.body;
  
  // Build update query dynamically
  const updates = [];
  const values = [];
  
  if (name !== undefined) {
    updates.push('name = ?');
    values.push(name);
  }
  
  if (type !== undefined) {
    updates.push('type = ?');
    values.push(type);
  }
  
  if (config !== undefined) {
    updates.push('config = ?');
    values.push(JSON.stringify(config));
  }
  
  if (enabled !== undefined) {
    updates.push('enabled = ?');
    values.push(enabled);
  }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  
  db.run(
    `UPDATE integrations SET ${updates.join(', ')} WHERE id = ?`,
    values,
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Integration not found' });
      }
      
      res.json({ message: 'Integration updated successfully' });
    }
  );
});

// Delete an integration
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM integrations WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    res.json({ message: 'Integration deleted successfully' });
  });
});

// Test an n8n webhook integration
router.post('/test-n8n-webhook', [
  body('webhookUrl').isURL().withMessage('Valid webhook URL is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { webhookUrl, apiKey } = req.body;
  
  try {
    const testPayload = {
      test: true,
      message: 'This is a test webhook from Kanban App',
      timestamp: new Date().toISOString()
    };
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    const response = await axios.post(webhookUrl, testPayload, { headers });
    
    res.json({
      success: true,
      message: 'Webhook test successful',
      status: response.status,
      response: response.data
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Webhook test failed',
      error: error.message
    });
  }
});

// Trigger an n8n webhook
router.post('/trigger-n8n-webhook', async (req, res) => {
  const { integrationId, payload } = req.body;
  
  if (!integrationId || !payload) {
    return res.status(400).json({ error: 'Integration ID and payload are required' });
  }
  
  // Get the integration
  db.get(
    'SELECT * FROM integrations WHERE id = ? AND type = ? AND enabled = 1',
    [integrationId, 'n8n_webhook'],
    async (err, integration) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (!integration) {
        return res.status(404).json({ error: 'n8n webhook integration not found or disabled' });
      }
      
      try {
        const config = JSON.parse(integration.config);
        const { webhookUrl, apiKey } = config;
        
        if (!webhookUrl) {
          return res.status(400).json({ error: 'Webhook URL not configured' });
        }
        
        const headers = {
          'Content-Type': 'application/json'
        };
        
        if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }
        
        const response = await axios.post(webhookUrl, payload, { headers });
        
        res.json({
          success: true,
          message: 'Webhook triggered successfully',
          status: response.status,
          response: response.data
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          message: 'Webhook trigger failed',
          error: error.message
        });
      }
    }
  );
});

export = router;