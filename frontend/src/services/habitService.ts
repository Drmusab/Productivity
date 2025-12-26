import api from './api';

/**
 * Get all habits
 * @param {boolean} includeArchived - Include archived habits
 * @returns {Promise} API response with habits
 */
export const getHabits = (includeArchived = false) => 
  api.get('/api/habits', { params: { includeArchived } });

/**
 * Get a specific habit by ID
 * @param {number} id - Habit ID
 * @returns {Promise} API response with habit
 */
export const getHabit = (id) => api.get(`/api/habits/${id}`);

/**
 * Create a new habit
 * @param {Object} payload - Habit data
 * @returns {Promise} API response
 */
export const createHabit = (payload) => api.post('/api/habits', payload);

/**
 * Update an existing habit
 * @param {number} id - Habit ID
 * @param {Object} payload - Updated habit data
 * @returns {Promise} API response
 */
export const updateHabit = (id, payload) => api.put(`/api/habits/${id}`, payload);

/**
 * Delete a habit
 * @param {number} id - Habit ID
 * @returns {Promise} API response
 */
export const deleteHabit = (id) => api.delete(`/api/habits/${id}`);

/**
 * Archive or unarchive a habit
 * @param {number} id - Habit ID
 * @param {boolean} archived - Archive status
 * @returns {Promise} API response
 */
export const archiveHabit = (id, archived) => 
  api.patch(`/api/habits/${id}/archive`, { archived });

/**
 * Log a habit completion for a specific date
 * @param {number} habitId - Habit ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} status - Status: 'done', 'missed', 'skipped', 'pending'
 * @param {number} value - Value for numeric/timer habits
 * @param {string} notes - Optional notes
 * @returns {Promise} API response
 */
export const logHabit = (habitId, date, status, value = 0, notes = '') => 
  api.post(`/api/habits/${habitId}/log`, { date, status, value, notes });

/**
 * Get habit logs for a date range
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise} API response with logs
 */
export const getHabitLogs = (startDate, endDate) => 
  api.get('/api/habits/logs/range', { params: { startDate, endDate } });

/**
 * Get statistics for a specific habit
 * @param {number} habitId - Habit ID
 * @returns {Promise} API response with stats
 */
export const getHabitStats = (habitId) => api.get(`/api/habits/${habitId}/stats`);

/**
 * Get weekly summary of all habits
 * @returns {Promise} API response with weekly summary
 */
export const getWeeklySummary = () => api.get('/api/habits/summary/weekly');

/**
 * Get monthly summary of all habits
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @returns {Promise} API response with monthly summary
 */
export const getMonthlySummary = (month, year) => 
  api.get('/api/habits/summary/monthly', { params: { month, year } });

/**
 * Reorder habits
 * @param {number[]} habitIds - Array of habit IDs in new order
 * @returns {Promise} API response
 */
export const reorderHabits = (habitIds) => 
  api.put('/api/habits/reorder', { habitIds });
