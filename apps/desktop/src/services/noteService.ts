// @ts-nocheck
/**
 * @fileoverview Service for Notes System
 * @module services/noteService
 */

import api from './api';

// ============= FOLDERS =============

export const getFolders = () => {
  return api.get('/notes/folders');
};

export const createFolder = (data: { name: string; parent_id?: string; color?: string; icon?: string }) => {
  return api.post('/notes/folders', data);
};

export const updateFolder = (id: string, data: { name?: string; parent_id?: string; color?: string; icon?: string; position?: number }) => {
  return api.put(`/notes/folders/${id}`, data);
};

export const deleteFolder = (id: string) => {
  return api.delete(`/notes/folders/${id}`);
};

// ============= TAGS =============

export const getTags = () => {
  return api.get('/notes/tags');
};

export const createTag = (data: { name: string; color?: string }) => {
  return api.post('/notes/tags', data);
};

// ============= NOTES =============

export const getNotes = (params?: { 
  folder_id?: string; 
  tag?: string; 
  type?: string; 
  archived?: boolean; 
  search?: string;
  limit?: number;
  offset?: number;
}) => {
  return api.get('/notes', { params });
};

export const getNote = (id: string) => {
  return api.get(`/notes/${id}`);
};

export const createNote = (data: {
  title: string;
  content?: string;
  type?: string;
  folder_id?: string;
  color?: string;
  tags?: string[];
  cornell?: {
    cue_column?: string;
    notes_column?: string;
    summary?: string;
    topic?: string;
    knowledge_rating?: number;
  };
}) => {
  return api.post('/notes', data);
};

export const updateNote = (id: string, data: {
  title?: string;
  content?: string;
  folder_id?: string;
  color?: string;
  is_pinned?: boolean;
  is_archived?: boolean;
  tags?: string[];
  cornell?: {
    cue_column?: string;
    notes_column?: string;
    summary?: string;
    topic?: string;
    knowledge_rating?: number;
  };
}) => {
  return api.put(`/notes/${id}`, data);
};

export const deleteNote = (id: string) => {
  return api.delete(`/notes/${id}`);
};

// ============= ZETTELKASTEN LINKS =============

export const createNoteLink = (sourceId: string, data: { target_note_id: string; context?: string }) => {
  return api.post(`/notes/${sourceId}/link`, data);
};

export const removeNoteLink = (sourceId: string, targetId: string) => {
  return api.delete(`/notes/${sourceId}/link/${targetId}`);
};

export const getZettelkastenGraph = () => {
  return api.get('/notes/zettelkasten/graph');
};

// ============= TASK-NOTE RELATIONS =============

export type TaskNoteRelationType = 'reference' | 'spec' | 'meeting' | 'evidence';

export const getLinkedTasks = (noteId: string) => {
  return api.get(`/api/notes/${noteId}/tasks`);
};

export const getLinkedNotes = (taskId: string) => {
  return api.get(`/api/tasks/${taskId}/notes`);
};

export const linkTaskToNote = (taskId: string, noteId: string, relationType: TaskNoteRelationType = 'reference') => {
  return api.post(`/api/tasks/${taskId}/notes`, { note_id: noteId, relation_type: relationType });
};

export const unlinkTaskFromNote = (taskId: string, noteId: string) => {
  return api.delete(`/api/tasks/${taskId}/notes/${noteId}`);
};

export const createNoteFromTask = (taskId: string) => {
  return api.post(`/api/tasks/${taskId}/create-note`);
};

// ============= DAILY NOTES =============

export const getDailyNote = (date?: string) => {
  const targetDate = date || new Date().toISOString().split('T')[0];
  return api.get(`/api/notes/daily/${targetDate}`);
};

export const createDailyNote = (date?: string) => {
  const targetDate = date || new Date().toISOString().split('T')[0];
  return api.post('/api/notes/daily', { date: targetDate });
};

const noteService = {
  getFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  getTags,
  createTag,
  getNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  createNoteLink,
  removeNoteLink,
  getZettelkastenGraph,
  getLinkedTasks,
  getLinkedNotes,
  linkTaskToNote,
  unlinkTaskFromNote,
  createNoteFromTask,
  getDailyNote,
  createDailyNote,
};

export default noteService;
