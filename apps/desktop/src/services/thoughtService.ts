// @ts-nocheck
/**
 * @fileoverview Service for Thought Organizer (Mental Clarity System)
 * @module services/thoughtService
 */

import api from './api';

// Get all thoughts with optional filtering
export const getThoughts = (params?: { category?: string; processed?: boolean; limit?: number; offset?: number }) => {
  return api.get('/thoughts', { params });
};

// Get thought categories with reflection questions
export const getThoughtCategories = () => {
  return api.get('/thoughts/categories');
};

// Get thought statistics
export const getThoughtStats = () => {
  return api.get('/thoughts/stats');
};

// Create a new thought
export const createThought = (data: {
  content: string;
  category: string;
  source?: string;
  related_to?: string;
  priority?: string;
}) => {
  return api.post('/thoughts', data);
};

// Update a thought
export const updateThought = (id: string, data: {
  content?: string;
  category?: string;
  is_processed?: boolean;
  action_extracted?: string;
  priority?: string;
}) => {
  return api.put(`/thoughts/${id}`, data);
};

// Delete a thought
export const deleteThought = (id: string) => {
  return api.delete(`/thoughts/${id}`);
};

// Brain dump - capture multiple thoughts at once
export const brainDump = (data: { content: string; sessionTitle?: string }) => {
  return api.post('/thoughts/brain-dump', data);
};

// Get all thought sessions
export const getThoughtSessions = () => {
  return api.get('/thoughts/sessions');
};

// Get a specific session with thoughts
export const getThoughtSession = (id: string) => {
  return api.get(`/thoughts/sessions/${id}`);
};

// Complete a session with reflection
export const completeSession = (id: string, data: { reflection?: string; clarity_rating?: number }) => {
  return api.put(`/thoughts/sessions/${id}/complete`, data);
};

const thoughtService = {
  getThoughts,
  getThoughtCategories,
  getThoughtStats,
  createThought,
  updateThought,
  deleteThought,
  brainDump,
  getThoughtSessions,
  getThoughtSession,
  completeSession
};

export default thoughtService;
