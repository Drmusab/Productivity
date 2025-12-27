/**
 * @fileoverview Event bus service for real-time event streaming and synchronization across clients.
 * Implements an in-memory event buffer with Server-Sent Events (SSE) support for live updates.
 * @module services/eventBus
 */

import {  EventEmitter  } from 'events';
import { BusEvent, EventListener, EventPayload } from '../types';

/**
 * Maximum number of events to buffer in memory.
 * Prevents memory leaks by limiting the event history size.
 * @constant {number}
 */
const MAX_BUFFERED_EVENTS = 500;

/**
 * Node.js EventEmitter instance for event pub/sub.
 * @private
 * @constant {EventEmitter}
 */
const eventEmitter = new EventEmitter();

/**
 * Circular buffer of recent events for late subscribers.
 * @private
 * @type {Array<Object>}
 */
const bufferedEvents: BusEvent[] = [];

/**
 * Normalizes various boolean representations to a JavaScript boolean.
 * Handles strings, numbers, and actual booleans.
 * 
 * @function normalizeBoolean
 * @param {*} value - Value to normalize to boolean
 * @returns {boolean|undefined} Normalized boolean or undefined if value is null/undefined
 * @private
 * @example
 * normalizeBoolean('true')  // Returns: true
 * normalizeBoolean(1)       // Returns: true
 * normalizeBoolean('yes')   // Returns: true
 * normalizeBoolean(0)       // Returns: false
 */
const normalizeBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
  }

  return Boolean(value);
};

/**
 * Converts a boolean value to numeric representation (1 or 0).
 * Useful for SQLite database storage which doesn't have native boolean type.
 * 
 * @function toNumericBoolean
 * @param {*} value - Value to convert to numeric boolean
 * @returns {number|undefined} 1 for true, 0 for false, undefined if value is null/undefined
 * @example
 * toNumericBoolean(true)   // Returns: 1
 * toNumericBoolean(false)  // Returns: 0
 * toNumericBoolean('yes')  // Returns: 1
 */
const toNumericBoolean = (value: unknown): number | undefined => {
  const normalized = normalizeBoolean(value);
  if (normalized === undefined) {
    return undefined;
  }
  return normalized ? 1 : 0;
};

/**
 * Emits an event to all subscribers and adds it to the buffered event history.
 * Creates a unique event ID and timestamp for tracking and synchronization.
 * 
 * @function emitEvent
 * @param {string} resource - The type of resource (e.g., 'task', 'board', 'column')
 * @param {string} action - The action performed (e.g., 'created', 'updated', 'deleted')
 * @param {Object} payload - Event data containing relevant information
 * @returns {Object} The complete event object with id, timestamp, and data
 * @example
 * emitEvent('task', 'created', { id: 123, title: 'New Task' });
 * emitEvent('board', 'updated', { id: 1, name: 'Updated Board' });
 */
const emitEvent = (resource: string, action: string, payload: EventPayload): BusEvent => {
  const event: BusEvent = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    resource,
    action,
    timestamp: new Date().toISOString(),
    data: payload,
  };

  // Add to circular buffer
  bufferedEvents.push(event);
  if (bufferedEvents.length > MAX_BUFFERED_EVENTS) {
    bufferedEvents.shift();
  }

  // Emit to all active subscribers
  eventEmitter.emit('event', event);
  return event;
};

/**
 * Subscribes a listener function to receive all emitted events.
 * Returns an unsubscribe function to remove the listener.
 * 
 * @function subscribe
 * @param {Function} listener - Callback function to receive events
 * @returns {Function} Unsubscribe function to remove the listener
 * @example
 * const unsubscribe = subscribe((event) => {
 *   console.log('Event received:', event);
 * });
 * // Later: unsubscribe();
 */
const subscribe = (listener: EventListener) => {
  eventEmitter.on('event', listener);
  return () => eventEmitter.off('event', listener);
};

/**
 * Parses and validates a date string from the 'since' parameter.
 * 
 * @function parseSinceParam
 * @param {string} since - ISO 8601 date string
 * @returns {Date|undefined} Parsed Date object or undefined if invalid
 * @private
 * @example
 * parseSinceParam('2024-01-01T00:00:00Z') // Returns: Date object
 * parseSinceParam('invalid')               // Returns: undefined
 */
const parseSinceParam = (since?: string) => {
  if (!since) {
    return undefined;
  }

  const parsedDate = new Date(since);
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate;
  }

  return undefined;
};

/**
 * Retrieves events from the buffer based on various filter criteria.
 * Supports filtering by timestamp, last event ID, and limiting result count.
 * 
 * @function getEventsSince
 * @param {Object} options - Filter options
 * @param {string} [options.since] - ISO 8601 timestamp to filter events after this time
 * @param {string} [options.lastEventId] - Event ID to get events after (exclusive)
 * @param {number} [options.limit] - Maximum number of events to return
 * @returns {Array<Object>} Filtered array of event objects
 * @example
 * getEventsSince({ since: '2024-01-01T00:00:00Z', limit: 10 });
 * getEventsSince({ lastEventId: '1234567890-abc', limit: 50 });
 */
const getEventsSince = ({ since, lastEventId, limit }: { since?: string; lastEventId?: string; limit?: number | string } = {}) => {
  let events = [...bufferedEvents];

  // Filter by last event ID if provided
  if (lastEventId) {
    const index = events.findIndex((event) => event.id === lastEventId);
    if (index !== -1) {
      events = events.slice(index + 1);
    }
  } else if (since) {
    // Filter by timestamp if no event ID provided
    const sinceDate = parseSinceParam(since);
    if (sinceDate) {
      events = events.filter((event) => new Date(event.timestamp) > sinceDate);
    } else {
      events = [];
    }
  }

  // Apply limit if specified
  if (limit !== undefined) {
    const numericLimit = Number(limit);
    if (!Number.isNaN(numericLimit) && numericLimit > 0) {
      events = events.slice(-numericLimit);
    }
  }

  return events;
};

/**
 * Clears all buffered events from memory.
 * Useful for testing or when resetting the event stream.
 * 
 * @function resetEvents
 * @returns {void}
 * @example
 * resetEvents(); // Clears all buffered events
 */
const resetEvents = (): void => {
  bufferedEvents.length = 0;
};

export { emitEvent, subscribe, getEventsSince, toNumericBoolean, resetEvents };
