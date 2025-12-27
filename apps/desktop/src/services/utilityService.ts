// @ts-nocheck
/**
 * @fileoverview Service for Supporting Utilities (Quotes, Words, Sticky Notes)
 * @module services/utilityService
 */

import api from './api';

// ============= QUOTES =============

export const getQuotes = (params?: {
  category?: string;
  author?: string;
  favorite?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}) => {
  return api.get('/utilities/quotes', { params });
};

export const getRandomQuote = (category?: string) => {
  return api.get('/utilities/quotes/random', { params: { category } });
};

export const getQuoteCategories = () => {
  return api.get('/utilities/quotes/categories');
};

export const createQuote = (data: {
  content: string;
  author?: string;
  source?: string;
  category?: string;
  tags?: string[];
}) => {
  return api.post('/utilities/quotes', data);
};

export const updateQuote = (id: string, data: {
  content?: string;
  author?: string;
  source?: string;
  category?: string;
  tags?: string[];
  is_favorite?: boolean;
}) => {
  return api.put(`/utilities/quotes/${id}`, data);
};

export const toggleQuoteFavorite = (id: string) => {
  return api.put(`/utilities/quotes/${id}/favorite`);
};

export const deleteQuote = (id: string) => {
  return api.delete(`/utilities/quotes/${id}`);
};

// ============= WORD COLLECTION =============

export const getWords = (params?: {
  category?: string;
  learned?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}) => {
  return api.get('/utilities/words', { params });
};

export const getWordsForReview = (limit?: number) => {
  return api.get('/utilities/words/review', { params: { limit } });
};

export const getWordStats = () => {
  return api.get('/utilities/words/stats');
};

export const createWord = (data: {
  word: string;
  definition?: string;
  pronunciation?: string;
  part_of_speech?: string;
  example_sentence?: string;
  origin?: string;
  synonyms?: string[];
  antonyms?: string[];
  category?: string;
  tags?: string[];
}) => {
  return api.post('/utilities/words', data);
};

export const updateWord = (id: string, data: {
  word?: string;
  definition?: string;
  pronunciation?: string;
  part_of_speech?: string;
  example_sentence?: string;
  origin?: string;
  synonyms?: string[];
  antonyms?: string[];
  category?: string;
  tags?: string[];
  is_learned?: boolean;
}) => {
  return api.put(`/utilities/words/${id}`, data);
};

export const reviewWord = (id: string, correct: boolean) => {
  return api.post(`/utilities/words/${id}/review`, { correct });
};

export const deleteWord = (id: string) => {
  return api.delete(`/utilities/words/${id}`);
};

// ============= STICKY NOTES =============

export const getStickyBoards = () => {
  return api.get('/utilities/sticky-boards');
};

export const createStickyBoard = (data: {
  name: string;
  description?: string;
  background_color?: string;
}) => {
  return api.post('/utilities/sticky-boards', data);
};

export const deleteStickyBoard = (id: string) => {
  return api.delete(`/utilities/sticky-boards/${id}`);
};

export const getStickyNotes = (board_id?: string) => {
  return api.get('/utilities/sticky-notes', { params: { board_id } });
};

export const createStickyNote = (data: {
  content: string;
  color?: string;
  position_x?: number;
  position_y?: number;
  width?: number;
  height?: number;
  board_id?: string;
}) => {
  return api.post('/utilities/sticky-notes', data);
};

export const updateStickyNote = (id: string, data: {
  content?: string;
  color?: string;
  position_x?: number;
  position_y?: number;
  width?: number;
  height?: number;
  board_id?: string;
  is_pinned?: boolean;
}) => {
  return api.put(`/utilities/sticky-notes/${id}`, data);
};

export const deleteStickyNote = (id: string) => {
  return api.delete(`/utilities/sticky-notes/${id}`);
};

const utilityService = {
  getQuotes,
  getRandomQuote,
  getQuoteCategories,
  createQuote,
  updateQuote,
  toggleQuoteFavorite,
  deleteQuote,
  getWords,
  getWordsForReview,
  getWordStats,
  createWord,
  updateWord,
  reviewWord,
  deleteWord,
  getStickyBoards,
  createStickyBoard,
  deleteStickyBoard,
  getStickyNotes,
  createStickyNote,
  updateStickyNote,
  deleteStickyNote
};

export default utilityService;
