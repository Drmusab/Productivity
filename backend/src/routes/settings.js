const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { runAsync, allAsync, getAsync } = require('../utils/database');

// Get all settings
router.get('/', async (req, res) => {
  try {
    const settings = await allAsync('SELECT * FROM settings');
    
    // Convert to key-value object
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });
    
    res.json(settingsObj);
  } catch (error) {
    console.error('Failed to get settings:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// Get a specific setting
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await getAsync('SELECT * FROM settings WHERE key = ?', [key]);
    
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    
    res.json({ key: setting.key, value: setting.value });
  } catch (error) {
    console.error('Failed to get setting:', error);
    res.status(500).json({ error: 'Failed to get setting' });
  }
});

// Update a setting
router.put('/:key', [
  body('value').notEmpty().withMessage('Value is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { key } = req.params;
    const { value } = req.body;
    
    // Check if setting exists
    const existingSetting = await getAsync('SELECT * FROM settings WHERE key = ?', [key]);
    
    if (!existingSetting) {
      // Insert new setting
      await runAsync(
        'INSERT INTO settings (key, value) VALUES (?, ?)',
        [key, value]
      );
    } else {
      // Update existing setting
      await runAsync(
        'UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?',
        [value, key]
      );
    }
    
    res.json({ message: 'Setting updated successfully', key, value });
  } catch (error) {
    console.error('Failed to update setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// Update report schedule
router.post('/report-schedule', [
  body('day').isInt({ min: 0, max: 6 }).withMessage('Day must be 0-6'),
  body('hour').isInt({ min: 0, max: 23 }).withMessage('Hour must be 0-23'),
  body('minute').isIn([0, 15, 30, 45]).withMessage('Minute must be 0, 15, 30, or 45')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { day, hour, minute } = req.body;

    // Ensure settings exist even on first-time configuration
    const upsertSetting = async (key, value) => {
      await runAsync(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
        [key, value.toString()]
      );
    };

    // Update all three settings
    await upsertSetting('report_schedule_day', day);
    await upsertSetting('report_schedule_hour', hour);
    await upsertSetting('report_schedule_minute', minute);

    res.json({
      message: 'Report schedule updated successfully. Server restart required for changes to take effect.',
      schedule: { day, hour, minute }
    });
  } catch (error) {
    console.error('Failed to update report schedule:', error);
    res.status(500).json({ error: 'Failed to update report schedule' });
  }
});

module.exports = router;
