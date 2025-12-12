/**
 * @fileoverview Reporting service for generating analytics and sending reports to webhooks.
 * Provides weekly reports, custom date range reports, and productivity analytics.
 * @module services/reporting
 */

const { allAsync, getAsync } = require('../utils/database');
const { triggerWebhook } = require('./webhook');

/**
 * Calculates completion rate as a percentage string.
 * 
 * @function calculateCompletionRate
 * @param {number} completed - Number of completed tasks
 * @param {number} total - Total number of tasks
 * @returns {string} Percentage string (e.g., "72.50%")
 * @private
 * @example
 * calculateCompletionRate(18, 25); // Returns "72.00%"
 * calculateCompletionRate(0, 0);   // Returns "0%"
 */
const calculateCompletionRate = (completed, total) => {
  if (total === 0) return '0%';
  return ((completed / total) * 100).toFixed(2) + '%';
};

/**
 * Generates a comprehensive weekly report covering the last 7 days.
 * Includes task statistics, completion rates, average completion time,
 * tasks by column/priority, and most active boards.
 * 
 * @async
 * @function generateWeeklyReport
 * @returns {Promise<Object>} Weekly report object with period, summary, and detailed analytics
 * @property {Object} period - Report period information
 * @property {string} period.start - ISO 8601 start date
 * @property {string} period.end - ISO 8601 end date
 * @property {number} period.days - Number of days in period (always 7)
 * @property {Object} summary - Summary statistics
 * @property {number} summary.tasksCreated - Number of tasks created this week
 * @property {number} summary.tasksCompleted - Number of tasks completed this week
 * @property {number} summary.tasksOverdue - Number of currently overdue tasks
 * @property {string} summary.completionRate - Completion rate percentage
 * @property {string} summary.avgCompletionTimeHours - Average hours to complete tasks
 * @property {Array<Object>} tasksByColumn - Task count by column
 * @property {Array<Object>} tasksByPriority - Task count by priority
 * @property {Array<Object>} activeBoards - Top 5 most active boards
 * @throws {Error} Database error if report generation fails
 * @example
 * const report = await generateWeeklyReport();
 * console.log(`Tasks completed: ${report.summary.tasksCompleted}`);
 * console.log(`Completion rate: ${report.summary.completionRate}`);
 */
const generateWeeklyReport = async () => {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceISO = since.toISOString();
  const now = new Date().toISOString();

  try {
    // Tasks created this week
    const createdTasks = await allAsync(
      'SELECT COUNT(*) as count FROM tasks WHERE created_at >= ?',
      [sinceISO]
    );

    // Tasks completed this week
    const completedTasks = await allAsync(
      `SELECT COUNT(*) as count
       FROM tasks t
       JOIN columns c ON t.column_id = c.id
       WHERE LOWER(c.name) = 'done' AND t.updated_at >= ?`,
      [sinceISO]
    );

    // Overdue tasks
    const overdueTasks = await allAsync(
      `SELECT COUNT(*) as count FROM tasks 
       WHERE due_date IS NOT NULL 
       AND due_date < ? 
       AND column_id NOT IN (SELECT id FROM columns WHERE LOWER(name) = 'done')`,
      [now]
    );

    // Tasks by column
    const tasksByColumn = await allAsync(
      `SELECT c.name as column, COUNT(t.id) as count
       FROM columns c
       LEFT JOIN tasks t ON t.column_id = c.id
       GROUP BY c.id
       ORDER BY c.position ASC`
    );

    // Tasks by priority
    const tasksByPriority = await allAsync(
      `SELECT priority, COUNT(*) as count
       FROM tasks
       WHERE column_id NOT IN (SELECT id FROM columns WHERE LOWER(name) = 'done')
       GROUP BY priority`
    );

    // Average completion time (tasks completed this week)
    const completionTimes = await allAsync(
      `SELECT 
        CAST((JULIANDAY(t.updated_at) - JULIANDAY(t.created_at)) * 24 AS REAL) as hours
       FROM tasks t
       JOIN columns c ON t.column_id = c.id
       WHERE LOWER(c.name) = 'done' AND t.updated_at >= ?`,
      [sinceISO]
    );

    let avgCompletionTime = 0;
    if (completionTimes && completionTimes.length > 0) {
      const totalHours = completionTimes.reduce((sum, row) => sum + (row.hours || 0), 0);
      avgCompletionTime = totalHours / completionTimes.length;
    }

    // Top 5 most active boards
    const activeBoards = await allAsync(
      `SELECT 
        b.id,
        b.name,
        COUNT(DISTINCT t.id) as task_count,
        COUNT(DISTINCT CASE WHEN t.updated_at >= ? THEN t.id END) as recent_activity
       FROM boards b
       LEFT JOIN columns c ON c.board_id = b.id
       LEFT JOIN tasks t ON t.column_id = c.id
       GROUP BY b.id
       ORDER BY recent_activity DESC, task_count DESC
       LIMIT 5`,
      [sinceISO]
    );

    const report = {
      period: {
        start: sinceISO,
        end: now,
        days: 7
      },
      summary: {
        tasksCreated: createdTasks?.[0]?.count || 0,
        tasksCompleted: completedTasks?.[0]?.count || 0,
        tasksOverdue: overdueTasks?.[0]?.count || 0,
        completionRate: calculateCompletionRate(
          completedTasks?.[0]?.count || 0,
          createdTasks?.[0]?.count || 0
        ),
        avgCompletionTimeHours: avgCompletionTime.toFixed(2)
      },
      tasksByColumn: tasksByColumn || [],
      tasksByPriority: tasksByPriority || [],
      activeBoards: activeBoards || []
    };

    return report;
  } catch (error) {
    console.error('Failed to generate weekly report:', error);
    throw error;
  }
};

/**
 * Generates a custom report for a specific date range.
 * Includes tasks created, tasks completed, completion rate, and tasks by column.
 * 
 * @async
 * @function generateCustomReport
 * @param {string|Date} startDate - Start date for the report (ISO 8601 or Date object)
 * @param {string|Date} endDate - End date for the report (ISO 8601 or Date object)
 * @returns {Promise<Object>} Custom report object with period and summary statistics
 * @property {Object} period - Report period information
 * @property {string} period.start - ISO 8601 start date
 * @property {string} period.end - ISO 8601 end date
 * @property {number} period.days - Number of days in the period
 * @property {Object} summary - Summary statistics
 * @property {number} summary.tasksCreated - Tasks created in this period
 * @property {number} summary.tasksCompleted - Tasks completed in this period
 * @property {string} summary.completionRate - Completion rate percentage
 * @property {Array<Object>} tasksByColumn - Task count grouped by column
 * @throws {Error} Database error if report generation fails
 * @example
 * const report = await generateCustomReport('2024-01-01', '2024-01-31');
 * console.log(`Period: ${report.period.days} days`);
 * console.log(`Created: ${report.summary.tasksCreated}`);
 */
const generateCustomReport = async (startDate, endDate) => {
  const start = new Date(startDate).toISOString();
  const end = new Date(endDate).toISOString();
  const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));

  try {
    const createdTasks = await allAsync(
      'SELECT COUNT(*) as count FROM tasks WHERE created_at >= ? AND created_at <= ?',
      [start, end]
    );

    const completedTasks = await allAsync(
      `SELECT COUNT(*) as count
       FROM tasks t
       JOIN columns c ON t.column_id = c.id
       WHERE LOWER(c.name) = 'done' AND t.updated_at >= ? AND t.updated_at <= ?`,
      [start, end]
    );

    const tasksByColumn = await allAsync(
      `SELECT c.name as column, COUNT(t.id) as count
       FROM columns c
       LEFT JOIN tasks t ON t.column_id = c.id AND t.created_at >= ? AND t.created_at <= ?
       GROUP BY c.id
       ORDER BY c.position ASC`,
      [start, end]
    );

    return {
      period: {
        start,
        end,
        days
      },
      summary: {
        tasksCreated: createdTasks?.[0]?.count || 0,
        tasksCompleted: completedTasks?.[0]?.count || 0,
        completionRate: calculateCompletionRate(
          completedTasks?.[0]?.count || 0,
          createdTasks?.[0]?.count || 0
        )
      },
      tasksByColumn: tasksByColumn || []
    };
  } catch (error) {
    console.error('Failed to generate custom report:', error);
    throw error;
  }
};

/**
 * Sends a generated report to all enabled n8n webhook integrations.
 * Creates a standardized report payload and triggers all configured webhooks.
 * 
 * @async
 * @function sendReportToN8n
 * @param {Object} report - Report object from generateWeeklyReport or generateCustomReport
 * @returns {Promise<Object>} Result object with success status and delivery details
 * @property {boolean} success - True if at least one webhook was successful
 * @property {string} message - Summary message of webhook delivery results
 * @property {Array} [results] - Individual webhook delivery results
 * @property {string} [error] - Error message if all webhooks failed
 * @example
 * const report = await generateWeeklyReport();
 * const result = await sendReportToN8n(report);
 * if (result.success) {
 *   console.log(result.message); // "Report sent to 2 of 2 webhooks"
 * }
 */
const sendReportToN8n = async (report) => {
  try {
    const integrations = await allAsync(
      'SELECT * FROM integrations WHERE type = ? AND enabled = 1',
      ['n8n_webhook']
    );

    if (!integrations || integrations.length === 0) {
      return {
        success: false,
        message: 'No n8n webhooks configured'
      };
    }

    const reportPayload = {
      type: 'report',
      reportType: 'weekly',
      timestamp: new Date().toISOString(),
      data: report
    };

    const results = await Promise.allSettled(
      integrations.map(integration =>
        triggerWebhook(integration.id, reportPayload)
      )
    );

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;
    
    return {
      success: successCount > 0,
      message: `Report sent to ${successCount} of ${integrations.length} webhooks`,
      results
    };
  } catch (error) {
    console.error('Failed to send report to n8n:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Generates productivity analytics for a specified number of days.
 * Provides daily completion trends, user productivity stats, and task velocity.
 * 
 * @async
 * @function generateProductivityAnalytics
 * @param {number} [days=30] - Number of days to analyze (default: 30)
 * @returns {Promise<Object>} Productivity analytics object
 * @property {Object} period - Analysis period information
 * @property {number} period.days - Number of days analyzed
 * @property {string} period.start - ISO 8601 start date
 * @property {string} period.end - ISO 8601 end date
 * @property {Array<Object>} dailyCompletions - Tasks completed per day
 * @property {Array<Object>} userProductivity - Tasks completed per user
 * @property {Array<Object>} velocity - Tasks completed per week
 * @throws {Error} Database error if analytics generation fails
 * @example
 * const analytics = await generateProductivityAnalytics(30);
 * console.log(`Daily completions:`, analytics.dailyCompletions);
 * console.log(`Top performers:`, analytics.userProductivity);
 */
const generateProductivityAnalytics = async (days = 30) => {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString();

  try {
    // Daily completion trend
    const dailyCompletions = await allAsync(
      `SELECT 
        DATE(t.updated_at) as date,
        COUNT(*) as count
       FROM tasks t
       JOIN columns c ON t.column_id = c.id
       WHERE LOWER(c.name) = 'done' AND t.updated_at >= ?
       GROUP BY DATE(t.updated_at)
       ORDER BY date ASC`,
      [sinceISO]
    );

    // User productivity (if assigned_to is being used)
    const userProductivity = await allAsync(
      `SELECT 
        assigned_to,
        COUNT(*) as tasks_completed
       FROM tasks t
       JOIN columns c ON t.column_id = c.id
       WHERE LOWER(c.name) = 'done' 
         AND t.updated_at >= ? 
         AND assigned_to IS NOT NULL
       GROUP BY assigned_to
       ORDER BY tasks_completed DESC`,
      [sinceISO]
    );

    // Task velocity (tasks completed per week)
    const velocity = await allAsync(
      `SELECT 
        CAST((JULIANDAY('now') - JULIANDAY(t.updated_at)) / 7 AS INTEGER) as week_ago,
        COUNT(*) as count
       FROM tasks t
       JOIN columns c ON t.column_id = c.id
       WHERE LOWER(c.name) = 'done' AND t.updated_at >= ?
       GROUP BY week_ago
       ORDER BY week_ago ASC`,
      [sinceISO]
    );

    return {
      period: {
        days,
        start: sinceISO,
        end: new Date().toISOString()
      },
      dailyCompletions: dailyCompletions || [],
      userProductivity: userProductivity || [],
      velocity: velocity || []
    };
  } catch (error) {
    console.error('Failed to generate productivity analytics:', error);
    throw error;
  }
};

module.exports = {
  generateWeeklyReport,
  generateCustomReport,
  sendReportToN8n,
  generateProductivityAnalytics
};
