// @ts-nocheck
/**
 * @fileoverview Service for Writing & Research Hub
 * @module services/writingService
 */

import api from './api';

// ============= ARTICLES =============

export const getArticles = (params?: {
  status?: string;
  type?: string;
  archived?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}) => {
  return api.get('/writing/articles', { params });
};

export const getArticleLifecycle = () => {
  return api.get('/writing/articles/lifecycle');
};

export const getArticle = (id: string) => {
  return api.get(`/writing/articles/${id}`);
};

export const createArticle = (data: {
  title: string;
  content?: string;
  excerpt?: string;
  status?: string;
  type?: string;
  target_word_count?: number;
  category?: string;
  tags?: string[];
}) => {
  return api.post('/writing/articles', data);
};

export const updateArticle = (id: string, data: {
  title?: string;
  content?: string;
  excerpt?: string;
  status?: string;
  type?: string;
  target_word_count?: number;
  category?: string;
  tags?: string[];
  is_archived?: boolean;
  publish_date?: string;
}) => {
  return api.put(`/writing/articles/${id}`, data);
};

export const deleteArticle = (id: string) => {
  return api.delete(`/writing/articles/${id}`);
};

// ============= WRITING GOALS =============

export const getWritingGoals = () => {
  return api.get('/writing/goals');
};

export const createWritingGoal = (data: {
  type: string;
  target: number;
  period?: string;
  start_date?: string;
  end_date?: string;
}) => {
  return api.post('/writing/goals', data);
};

// ============= WRITING STATS =============

export const getWritingStats = (days?: number) => {
  return api.get('/writing/stats', { params: { days } });
};

export const logWritingSession = (data: {
  article_id?: string;
  words_written: number;
  duration_minutes?: number;
  notes?: string;
}) => {
  return api.post('/writing/sessions', data);
};

// ============= RESEARCH =============

export const getResearchItems = (params?: {
  status?: string;
  topic?: string;
  type?: string;
  archived?: boolean;
  limit?: number;
  offset?: number;
}) => {
  return api.get('/writing/research', { params });
};

export const getResearchItem = (id: string) => {
  return api.get(`/writing/research/${id}`);
};

export const createResearchItem = (data: {
  title: string;
  type?: string;
  url?: string;
  content?: string;
  summary?: string;
  topic?: string;
  status?: string;
  priority?: string;
  tags?: string[];
}) => {
  return api.post('/writing/research', data);
};

export const updateResearchItem = (id: string, data: {
  title?: string;
  type?: string;
  url?: string;
  content?: string;
  summary?: string;
  topic?: string;
  status?: string;
  priority?: string;
  tags?: string[];
  is_archived?: boolean;
}) => {
  return api.put(`/writing/research/${id}`, data);
};

export const deleteResearchItem = (id: string) => {
  return api.delete(`/writing/research/${id}`);
};

export const addResearchNote = (researchId: string, data: {
  content: string;
  highlight?: string;
  page_number?: string;
}) => {
  return api.post(`/writing/research/${researchId}/notes`, data);
};

// ============= INSPIRATION =============

export const getInspirationItems = (params?: {
  type?: string;
  favorite?: boolean;
  limit?: number;
  offset?: number;
}) => {
  return api.get('/writing/inspiration', { params });
};

export const createInspirationItem = (data: {
  type?: string;
  content: string;
  source?: string;
  url?: string;
  image_url?: string;
  tags?: string[];
}) => {
  return api.post('/writing/inspiration', data);
};

export const toggleInspirationFavorite = (id: string) => {
  return api.put(`/writing/inspiration/${id}/favorite`);
};

export const deleteInspirationItem = (id: string) => {
  return api.delete(`/writing/inspiration/${id}`);
};

const writingService = {
  getArticles,
  getArticleLifecycle,
  getArticle,
  createArticle,
  updateArticle,
  deleteArticle,
  getWritingGoals,
  createWritingGoal,
  getWritingStats,
  logWritingSession,
  getResearchItems,
  getResearchItem,
  createResearchItem,
  updateResearchItem,
  deleteResearchItem,
  addResearchNote,
  getInspirationItems,
  createInspirationItem,
  toggleInspirationFavorite,
  deleteInspirationItem
};

export default writingService;
