/**
 * @fileoverview Webhook service for triggering external HTTP endpoints (primarily n8n).
 * Handles webhook execution with timeout handling, authentication, and error handling.
 * @module services/webhook
 */

import axios from 'axios';
import {  getAsync  } from '../utils/database';
import logger from '../utils/logger';

/**
 * Default timeout for webhook requests in milliseconds.
 * @constant {number}
 */
const WEBHOOK_TIMEOUT_MS = 10000;

/**
 * Triggers a webhook by sending a POST request to the configured endpoint.
 * Retrieves webhook configuration from database, validates it, and sends the payload.
 * Supports optional API key authentication via Bearer token.
 * 
 * @async
 * @function triggerWebhook
 * @param {number} webhookId - The database ID of the webhook integration to trigger
 * @param {Object} payload - Data object to send as JSON in the request body
 * @returns {Promise<Object>} Result object with success status and response/error details
 * @property {boolean} success - Whether the webhook was triggered successfully
 * @property {number} [status] - HTTP status code from the webhook response
 * @property {*} [response] - Response data from the webhook endpoint
 * @property {string} [error] - Error message if the webhook failed
 * @example
 * const result = await triggerWebhook(1, { event: 'task.created', task: {...} });
 * if (result.success) {
 *   console.log('Webhook triggered:', result.status);
 * } else {
 *   console.error('Webhook failed:', result.error);
 * }
 */
const triggerWebhook = async (webhookId, payload) => {
  try {
    // Retrieve webhook configuration from database
    const integration = await getAsync(
      'SELECT * FROM integrations WHERE id = ? AND type = ? AND enabled = 1',
      [webhookId, 'n8n_webhook']
    );

    if (!integration) {
      return { success: false, error: 'Webhook integration not found or disabled' };
    }

    // Parse webhook configuration JSON
    let config;
    try {
      config = JSON.parse(integration.config);
    } catch (error) {
      logger.error('Invalid webhook configuration', { webhookId, error: error.message });
      return { success: false, error: 'Invalid webhook configuration' };
    }

    const { webhookUrl, apiKey } = config;

    if (!webhookUrl) {
      return { success: false, error: 'Webhook URL not configured' };
    }

    // Validate URL format for security
    if (!isValidUrl(webhookUrl)) {
      logger.warn('Invalid webhook URL format', { webhookId });
      return { success: false, error: 'Invalid webhook URL format' };
    }

    // Prepare HTTP headers
    const headers: any = {
      'Content-Type': 'application/json'
    };

    // Add authentication if API key is configured
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    // Execute webhook POST request
    const response = await axios.post(webhookUrl, payload, {
      headers,
      timeout: WEBHOOK_TIMEOUT_MS,
    });

    return {
      success: true,
      status: response.status,
      response: response.data,
    };
  } catch (error) {
    logger.error('Failed to trigger webhook', { 
      webhookId, 
      error: error.message,
      code: error.code 
    });
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Validates that a string is a valid HTTP/HTTPS URL.
 * 
 * @function isValidUrl
 * @param {string} urlString - URL string to validate
 * @returns {boolean} True if valid HTTP/HTTPS URL, false otherwise
 * @private
 */
const isValidUrl = (urlString) => {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (error) {
    return false;
  }
};

export { triggerWebhook };