import api from './api';

/**
 * Get daily planner overview for a specific date
 * @param {string} date - Date in YYYY-MM-DD format (defaults to today)
 * @returns {Promise} API response with full planner overview
 */
export const getPlannerOverview = (date) => 
  api.get('/api/planner/overview', { params: date ? { date } : {} });

/**
 * Get priorities for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise} API response with priorities
 */
export const getPriorities = (date) => 
  api.get('/api/planner/priorities', { params: date ? { date } : {} });

/**
 * Create or update a priority
 * @param {Object} priority - Priority data { date, position, title, completed, taskId }
 * @returns {Promise} API response
 */
export const savePriority = (priority) => 
  api.post('/api/planner/priorities', priority);

/**
 * Update an existing priority
 * @param {number} id - Priority ID
 * @param {Object} updates - Updated fields
 * @returns {Promise} API response
 */
export const updatePriority = (id, updates) => 
  api.put(`/api/planner/priorities/${id}`, updates);

/**
 * Delete a priority
 * @param {number} id - Priority ID
 * @returns {Promise} API response
 */
export const deletePriority = (id) => 
  api.delete(`/api/planner/priorities/${id}`);

/**
 * Get notes for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise} API response with notes
 */
export const getNotes = (date) => 
  api.get('/api/planner/notes', { params: date ? { date } : {} });

/**
 * Save notes for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} content - Notes content
 * @returns {Promise} API response
 */
export const saveNotes = (date, content) => 
  api.post('/api/planner/notes', { date, content });

/**
 * Get reflection for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise} API response with reflection
 */
export const getReflection = (date) => 
  api.get('/api/planner/reflections', { params: date ? { date } : {} });

/**
 * Save reflection for a specific date
 * @param {Object} reflection - Reflection data { date, wentWell, couldImprove, keyTakeaways }
 * @returns {Promise} API response
 */
export const saveReflection = (reflection) => 
  api.post('/api/planner/reflections', reflection);

/**
 * Get time blocks for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise} API response with time blocks
 */
export const getTimeBlocks = (date) => 
  api.get('/api/planner/time-blocks', { params: date ? { date } : {} });

/**
 * Create a new time block
 * @param {Object} block - Time block data
 * @returns {Promise} API response
 */
export const createTimeBlock = (block) => 
  api.post('/api/planner/time-blocks', block);

/**
 * Update an existing time block
 * @param {number} id - Time block ID
 * @param {Object} updates - Updated fields
 * @returns {Promise} API response
 */
export const updateTimeBlock = (id, updates) => 
  api.put(`/api/planner/time-blocks/${id}`, updates);

/**
 * Delete a time block
 * @param {number} id - Time block ID
 * @returns {Promise} API response
 */
export const deleteTimeBlock = (id) => 
  api.delete(`/api/planner/time-blocks/${id}`);
