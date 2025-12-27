// @ts-nocheck
/**
 * @fileoverview Service for Idea Management System
 * @module services/ideaService
 */

import api from './api';

// Get all ideas with filtering
export const getIdeas = (params?: {
  status?: string;
  category?: string;
  archived?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}) => {
  return api.get('/ideas', { params });
};

// Get workflow stages and statuses
export const getWorkflow = () => {
  return api.get('/ideas/workflow');
};

// Get idea statistics
export const getIdeaStats = () => {
  return api.get('/ideas/stats');
};

// Get a specific idea
export const getIdea = (id: string) => {
  return api.get(`/ideas/${id}`);
};

// Create a new idea
export const createIdea = (data: {
  title: string;
  raw_dump?: string;
  problem_definition?: string;
  concept_expansion?: string;
  tools_resources?: string;
  one_sentence_summary?: string;
  step_by_step_plan?: string;
  moodboard_urls?: string[];
  status?: string;
  priority?: string;
  category?: string;
  tags?: string[];
}) => {
  return api.post('/ideas', data);
};

// Update an idea
export const updateIdea = (id: string, data: {
  title?: string;
  raw_dump?: string;
  problem_definition?: string;
  concept_expansion?: string;
  tools_resources?: string;
  one_sentence_summary?: string;
  step_by_step_plan?: string;
  moodboard_urls?: string[];
  status?: string;
  priority?: string;
  category?: string;
  tags?: string[];
  is_archived?: boolean;
}) => {
  return api.put(`/ideas/${id}`, data);
};

// Delete an idea
export const deleteIdea = (id: string) => {
  return api.delete(`/ideas/${id}`);
};

// Add a resource to an idea
export const addIdeaResource = (ideaId: string, data: {
  type: string;
  url?: string;
  title?: string;
  description?: string;
}) => {
  return api.post(`/ideas/${ideaId}/resources`, data);
};

// Remove a resource from an idea
export const removeIdeaResource = (ideaId: string, resourceId: string) => {
  return api.delete(`/ideas/${ideaId}/resources/${resourceId}`);
};

// Add a note to an idea
export const addIdeaNote = (ideaId: string, data: { content: string; type?: string }) => {
  return api.post(`/ideas/${ideaId}/notes`, data);
};

// Convert idea to task, note, or project
export const convertIdea = (id: string, type: 'task' | 'note' | 'project') => {
  return api.post(`/ideas/${id}/convert`, { type });
};

const ideaService = {
  getIdeas,
  getWorkflow,
  getIdeaStats,
  getIdea,
  createIdea,
  updateIdea,
  deleteIdea,
  addIdeaResource,
  removeIdeaResource,
  addIdeaNote,
  convertIdea
};

export default ideaService;
