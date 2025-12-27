// @ts-nocheck
import api from './api';

/**
 * Fitness/Gym Companion API service
 * Provides methods for exercise tracking, workout management, and progress monitoring
 */

// ==================== MUSCLE GROUPS ====================

/**
 * Get all muscle groups (organized hierarchically)
 * @returns {Promise} API response with muscle groups
 */
export const getMuscleGroups = () => api.get('/api/fitness/muscle-groups');

// ==================== EXERCISES ====================

/**
 * Get all exercises with optional filtering
 * @param {Object} filters - Filter options
 * @param {number} filters.muscleGroupId - Filter by muscle group
 * @param {string} filters.search - Search by name
 * @param {string} filters.difficulty - Filter by difficulty level
 * @returns {Promise} API response with exercises
 */
export const getExercises = (filters = {}) => 
  api.get('/api/fitness/exercises', { params: filters });

/**
 * Get a specific exercise by ID
 * @param {number} id - Exercise ID
 * @returns {Promise} API response with exercise
 */
export const getExercise = (id) => api.get(`/api/fitness/exercises/${id}`);

/**
 * Create a custom exercise
 * @param {Object} payload - Exercise data
 * @returns {Promise} API response
 */
export const createExercise = (payload) => api.post('/api/fitness/exercises', payload);

/**
 * Update an exercise
 * @param {number} id - Exercise ID
 * @param {Object} payload - Updated exercise data
 * @returns {Promise} API response
 */
export const updateExercise = (id, payload) => api.put(`/api/fitness/exercises/${id}`, payload);

/**
 * Delete a custom exercise
 * @param {number} id - Exercise ID
 * @returns {Promise} API response
 */
export const deleteExercise = (id) => api.delete(`/api/fitness/exercises/${id}`);

// ==================== WORKOUT TEMPLATES ====================

/**
 * Get all workout templates
 * @returns {Promise} API response with templates
 */
export const getWorkoutTemplates = () => api.get('/api/fitness/templates');

/**
 * Get a specific template with its workout days and exercises
 * @param {number} id - Template ID
 * @returns {Promise} API response with template details
 */
export const getWorkoutTemplate = (id) => api.get(`/api/fitness/templates/${id}`);

/**
 * Create a new workout template
 * @param {Object} payload - Template data
 * @returns {Promise} API response
 */
export const createWorkoutTemplate = (payload) => api.post('/api/fitness/templates', payload);

/**
 * Update a workout template
 * @param {number} id - Template ID
 * @param {Object} payload - Updated template data
 * @returns {Promise} API response
 */
export const updateWorkoutTemplate = (id, payload) => api.put(`/api/fitness/templates/${id}`, payload);

/**
 * Delete a workout template
 * @param {number} id - Template ID
 * @returns {Promise} API response
 */
export const deleteWorkoutTemplate = (id) => api.delete(`/api/fitness/templates/${id}`);

/**
 * Add a workout day to a template
 * @param {number} templateId - Template ID
 * @param {Object} payload - Day data
 * @returns {Promise} API response
 */
export const addWorkoutDay = (templateId, payload) => 
  api.post(`/api/fitness/templates/${templateId}/days`, payload);

/**
 * Add an exercise to a workout day
 * @param {number} dayId - Workout day ID
 * @param {Object} payload - Exercise configuration
 * @returns {Promise} API response
 */
export const addExerciseToDay = (dayId, payload) => 
  api.post(`/api/fitness/days/${dayId}/exercises`, payload);

// ==================== WORKOUT SESSIONS ====================

/**
 * Get workout sessions with optional filtering
 * @param {Object} filters - Filter options
 * @param {string} filters.startDate - Start date filter
 * @param {string} filters.endDate - End date filter
 * @param {number} filters.limit - Max number of results
 * @returns {Promise} API response with sessions
 */
export const getWorkoutSessions = (filters = {}) => 
  api.get('/api/fitness/sessions', { params: filters });

/**
 * Get a specific session with all exercise logs
 * @param {number} id - Session ID
 * @returns {Promise} API response with session details
 */
export const getWorkoutSession = (id) => api.get(`/api/fitness/sessions/${id}`);

/**
 * Create a new workout session
 * @param {Object} payload - Session data
 * @returns {Promise} API response
 */
export const createWorkoutSession = (payload) => api.post('/api/fitness/sessions', payload);

/**
 * Update a workout session
 * @param {number} id - Session ID
 * @param {Object} payload - Updated session data
 * @returns {Promise} API response
 */
export const updateWorkoutSession = (id, payload) => api.put(`/api/fitness/sessions/${id}`, payload);

/**
 * Delete a workout session
 * @param {number} id - Session ID
 * @returns {Promise} API response
 */
export const deleteWorkoutSession = (id) => api.delete(`/api/fitness/sessions/${id}`);

// ==================== EXERCISE LOGS ====================

/**
 * Log an exercise set within a session
 * @param {number} sessionId - Session ID
 * @param {Object} payload - Set data (exerciseId, setNumber, reps, weight, etc.)
 * @returns {Promise} API response
 */
export const logExerciseSet = (sessionId, payload) => 
  api.post(`/api/fitness/sessions/${sessionId}/logs`, payload);

/**
 * Update an exercise log
 * @param {number} logId - Log ID
 * @param {Object} payload - Updated log data
 * @returns {Promise} API response
 */
export const updateExerciseLog = (logId, payload) => api.put(`/api/fitness/logs/${logId}`, payload);

// ==================== PERSONAL RECORDS ====================

/**
 * Get personal records
 * @param {number} exerciseId - Optional filter by exercise
 * @returns {Promise} API response with PRs
 */
export const getPersonalRecords = (exerciseId) => 
  api.get('/api/fitness/personal-records', { params: exerciseId ? { exerciseId } : {} });

// ==================== BODY MEASUREMENTS ====================

/**
 * Get body measurements history
 * @param {number} limit - Optional limit
 * @returns {Promise} API response with measurements
 */
export const getBodyMeasurements = (limit) => 
  api.get('/api/fitness/measurements', { params: limit ? { limit } : {} });

/**
 * Add a new body measurement entry
 * @param {Object} payload - Measurement data
 * @returns {Promise} API response
 */
export const addBodyMeasurement = (payload) => api.post('/api/fitness/measurements', payload);

// ==================== FITNESS PROFILE ====================

/**
 * Get the current user's fitness profile
 * @returns {Promise} API response with profile
 */
export const getFitnessProfile = () => api.get('/api/fitness/profile');

/**
 * Create or update fitness profile
 * @param {Object} payload - Profile data
 * @returns {Promise} API response
 */
export const saveFitnessProfile = (payload) => api.post('/api/fitness/profile', payload);

// ==================== FITNESS GOALS ====================

/**
 * Get fitness goals
 * @param {string} status - Optional status filter ('active', 'completed', etc.)
 * @returns {Promise} API response with goals
 */
export const getFitnessGoals = (status) => 
  api.get('/api/fitness/goals', { params: status ? { status } : {} });

/**
 * Create a new fitness goal
 * @param {Object} payload - Goal data
 * @returns {Promise} API response
 */
export const createFitnessGoal = (payload) => api.post('/api/fitness/goals', payload);

/**
 * Update a fitness goal
 * @param {number} id - Goal ID
 * @param {Object} payload - Updated goal data
 * @returns {Promise} API response
 */
export const updateFitnessGoal = (id, payload) => api.put(`/api/fitness/goals/${id}`, payload);

/**
 * Delete a fitness goal
 * @param {number} id - Goal ID
 * @returns {Promise} API response
 */
export const deleteFitnessGoal = (id) => api.delete(`/api/fitness/goals/${id}`);

// ==================== PROGRESS & ANALYTICS ====================

/**
 * Get progress data for a specific exercise
 * @param {number} exerciseId - Exercise ID
 * @param {number} days - Number of days to look back (default 90)
 * @returns {Promise} API response with progress data
 */
export const getExerciseProgress = (exerciseId, days = 90) => 
  api.get(`/api/fitness/progress/exercise/${exerciseId}`, { params: { days } });

/**
 * Get weekly workout statistics
 * @returns {Promise} API response with weekly stats
 */
export const getWeeklyStats = () => api.get('/api/fitness/stats/weekly');

/**
 * Get today's scheduled workout and quick stats
 * @returns {Promise} API response with today's data
 */
export const getTodayWorkout = () => api.get('/api/fitness/today');
