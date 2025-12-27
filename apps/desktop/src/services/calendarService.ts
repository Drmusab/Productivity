// @ts-nocheck
/**
 * Calendar service for interacting with the calendar API.
 * Provides methods for fetching calendar events.
 * @module services/calendarService
 */

import api from './api';

/**
 * Fetches calendar events within a date range.
 * 
 * @param {Object} params - Query parameters
 * @param {string} [params.start] - Start date in ISO 8601 format
 * @param {string} [params.end] - End date in ISO 8601 format
 * @param {number} [params.boardId] - Board ID to filter events
 * @returns {Promise} API response with calendar events
 * @example
 * getCalendarEvents({ start: '2025-12-01', end: '2026-01-01', boardId: 1 })
 */
export const getCalendarEvents = (params = {}) => {
  return api.get('/api/calendar/events', { params });
};

const calendarService = {
  getCalendarEvents,
};

export default calendarService;
