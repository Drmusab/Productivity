import api from './api';

/**
 * Al-Falah Islamic Habit Tracker Service
 * Provides API methods for Islamic worship tracking functionality
 */

// Prayer Management

/**
 * Get today's prayer records
 * @returns {Promise} API response with today's prayers
 */
export const getTodayPrayers = () => api.get('/api/islamic/prayers/today');

/**
 * Get prayer records for a date range
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise} API response with prayers
 */
export const getPrayers = (startDate, endDate) => 
  api.get('/api/islamic/prayers', { params: { startDate, endDate } });

/**
 * Log a prayer
 * @param {Object} payload - Prayer data
 * @returns {Promise} API response
 */
export const logPrayer = (payload) => api.post('/api/islamic/prayers/log', payload);

/**
 * Get prayer summary statistics
 * @param {string} startDate - Optional start date
 * @param {string} endDate - Optional end date
 * @returns {Promise} API response with summary
 */
export const getPrayerSummary = (startDate, endDate) => 
  api.get('/api/islamic/prayers/summary', { params: { startDate, endDate } });

// Qada (Missed Prayers)

/**
 * Get list of pending qada prayers
 * @returns {Promise} API response with qada prayers
 */
export const getQadaPrayers = () => api.get('/api/islamic/qada');

/**
 * Mark a qada prayer as completed
 * @param {number} id - Qada prayer ID
 * @returns {Promise} API response
 */
export const completeQadaPrayer = (id) => api.post(`/api/islamic/qada/${id}/complete`);

// Quran Recitation

/**
 * Get Quran recitation logs
 * @param {string} startDate - Optional start date
 * @param {string} endDate - Optional end date
 * @returns {Promise} API response with Quran logs
 */
export const getQuranLogs = (startDate, endDate) => 
  api.get('/api/islamic/quran', { params: { startDate, endDate } });

/**
 * Log Quran recitation
 * @param {Object} payload - Recitation data
 * @returns {Promise} API response
 */
export const logQuranRecitation = (payload) => api.post('/api/islamic/quran', payload);

/**
 * Get Quran recitation summary
 * @returns {Promise} API response with summary
 */
export const getQuranSummary = () => api.get('/api/islamic/quran/summary');

// Dhikr

/**
 * Get dhikr logs for a date
 * @param {string} date - Date (YYYY-MM-DD)
 * @returns {Promise} API response with dhikr logs
 */
export const getDhikrLogs = (date) => 
  api.get('/api/islamic/dhikr', { params: { date } });

/**
 * Log dhikr count
 * @param {Object} payload - Dhikr data
 * @returns {Promise} API response
 */
export const logDhikr = (payload) => api.post('/api/islamic/dhikr/log', payload);

// Fasting

/**
 * Get fasting records
 * @param {string} startDate - Optional start date
 * @param {string} endDate - Optional end date
 * @returns {Promise} API response with fasting records
 */
export const getFastingRecords = (startDate, endDate) => 
  api.get('/api/islamic/fasting', { params: { startDate, endDate } });

/**
 * Log a fasting day
 * @param {Object} payload - Fasting data
 * @returns {Promise} API response
 */
export const logFasting = (payload) => api.post('/api/islamic/fasting', payload);

// Jumu'ah (Friday)

/**
 * Get Jumu'ah checklist for a date
 * @param {string} date - Date (YYYY-MM-DD)
 * @returns {Promise} API response with checklist
 */
export const getJumuahChecklist = (date) => 
  api.get('/api/islamic/jumuah', { params: { date } });

/**
 * Save Jumu'ah checklist
 * @param {Object} payload - Checklist data
 * @returns {Promise} API response
 */
export const saveJumuahChecklist = (payload) => api.post('/api/islamic/jumuah', payload);

// Dua Journal

/**
 * Get dua journal entries
 * @param {Object} filters - Optional filters (category, status)
 * @returns {Promise} API response with duas
 */
export const getDuas = (filters = {}) => 
  api.get('/api/islamic/dua', { params: filters });

/**
 * Add a dua to journal
 * @param {Object} payload - Dua data
 * @returns {Promise} API response
 */
export const addDua = (payload) => api.post('/api/islamic/dua', payload);

/**
 * Mark a dua as answered
 * @param {number} id - Dua ID
 * @returns {Promise} API response
 */
export const markDuaAnswered = (id) => api.patch(`/api/islamic/dua/${id}/answered`);

// Spiritual Reflection

/**
 * Get spiritual reflection for a date
 * @param {string} date - Date (YYYY-MM-DD)
 * @returns {Promise} API response with reflection
 */
export const getReflection = (date) => 
  api.get('/api/islamic/reflection', { params: { date } });

/**
 * Save spiritual reflection
 * @param {Object} payload - Reflection data
 * @returns {Promise} API response
 */
export const saveReflection = (payload) => api.post('/api/islamic/reflection', payload);

// Dashboard

/**
 * Get comprehensive Islamic dashboard data
 * @returns {Promise} API response with dashboard data
 */
export const getIslamicDashboard = () => api.get('/api/islamic/dashboard');

// Settings

/**
 * Get Islamic settings
 * @returns {Promise} API response with settings
 */
export const getIslamicSettings = () => api.get('/api/islamic/settings');

/**
 * Save Islamic settings
 * @param {Object} payload - Settings data
 * @returns {Promise} API response
 */
export const saveIslamicSettings = (payload) => api.post('/api/islamic/settings', payload);
