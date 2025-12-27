// @ts-nocheck
import api from './api';

// Dashboard
export const getOmniplannerDashboard = () => {
  return api.get('/api/omniplanner/dashboard');
};

// GTD Operations
export const getTasksByGTDStatus = (status) => {
  return api.get(`/api/omniplanner/gtd/${status}`);
};

export const processInboxTask = (taskId, data) => {
  return api.put(`/api/omniplanner/process/${taskId}`, data);
};

export const captureTask = (task) => {
  return api.post('/api/omniplanner/capture', task);
};

// Eisenhower Matrix
export const getEisenhowerMatrix = () => {
  return api.get('/api/omniplanner/eisenhower');
};

export const getTasksByQuadrant = (quadrant) => {
  return api.get(`/api/omniplanner/eisenhower/${quadrant}`);
};

// Kanban Execution
export const getKanbanBoard = (params = {}) => {
  return api.get('/api/omniplanner/kanban', { params });
};

export const updateExecutionStatus = (taskId, data) => {
  return api.put(`/api/omniplanner/execution/${taskId}`, data);
};

// Contexts
export const getContexts = () => {
  return api.get('/api/omniplanner/contexts');
};

export const getTasksByContext = (context) => {
  return api.get(`/api/omniplanner/context/${encodeURIComponent(context)}`);
};

// Categories
export const getCategories = () => {
  return api.get('/api/omniplanner/categories');
};

// Projects
export const getProjects = (params = {}) => {
  return api.get('/api/omniplanner/projects', { params });
};

export const getProject = (id) => {
  return api.get(`/api/omniplanner/projects/${id}`);
};

export const createProject = (project) => {
  return api.post('/api/omniplanner/projects', project);
};

export const updateProject = (id, project) => {
  return api.put(`/api/omniplanner/projects/${id}`, project);
};

export const deleteProject = (id) => {
  return api.delete(`/api/omniplanner/projects/${id}`);
};

// Contacts
export const getContacts = (params = {}) => {
  return api.get('/api/omniplanner/contacts', { params });
};

export const createContact = (contact) => {
  return api.post('/api/omniplanner/contacts', contact);
};

export const updateContact = (id, contact) => {
  return api.put(`/api/omniplanner/contacts/${id}`, contact);
};

export const deleteContact = (id) => {
  return api.delete(`/api/omniplanner/contacts/${id}`);
};
