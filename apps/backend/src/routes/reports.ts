// @ts-nocheck
import express from 'express';
const router = express.Router();
const { 
  generateWeeklyReport, 
  generateCustomReport, 
  sendReportToN8n,
  generateProductivityAnalytics 
} = require('../services/reporting');

// Get weekly report
router.get('/weekly', async (_req, res) => {
  try {
    const report = await generateWeeklyReport();
    res.json(report);
  } catch (error) {
    console.error('Failed to build weekly report:', error);
    res.status(500).json({ error: 'Unable to generate report', details: error.message });
  }
});

// Get custom date range report
router.get('/custom', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Both startDate and endDate query parameters are required' 
      });
    }

    const report = await generateCustomReport(startDate, endDate);
    res.json(report);
  } catch (error) {
    console.error('Failed to build custom report:', error);
    res.status(500).json({ error: 'Unable to generate report', details: error.message });
  }
});

// Get productivity analytics
router.get('/analytics', async (req, res) => {
  try {
    const days = parseInt(req.query.days || '30', 10);
    const analytics = await generateProductivityAnalytics(days);
    res.json(analytics);
  } catch (error) {
    console.error('Failed to generate analytics:', error);
    res.status(500).json({ error: 'Unable to generate analytics', details: error.message });
  }
});

// Send weekly report to n8n webhooks
router.post('/weekly/send-to-n8n', async (_req, res) => {
  try {
    const report = await generateWeeklyReport();
    const result = await sendReportToN8n(report);
    res.json(result);
  } catch (error) {
    console.error('Failed to send report to n8n:', error);
    res.status(500).json({ error: 'Unable to send report', details: error.message });
  }
});

// Send custom report to n8n webhooks
router.post('/custom/send-to-n8n', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Both startDate and endDate are required' 
      });
    }

    const report = await generateCustomReport(startDate, endDate);
    const result = await sendReportToN8n(report);
    res.json(result);
  } catch (error) {
    console.error('Failed to send report to n8n:', error);
    res.status(500).json({ error: 'Unable to send report', details: error.message });
  }
});

export = router;
