// @ts-nocheck
import api from './api';

// Dashboard
export const getEisenhowerMatrixDashboard = () => {
  return api.get('/api/eisenhower-matrix/dashboard');
};

// GTD Operations
export const getTasksByGTDStatus = (status) => {
  return api.get(`/api/eisenhower-matrix/gtd/${status}`);
};

export const processInboxTask = (taskId, data) => {
  return api.put(`/api/eisenhower-matrix/process/${taskId}`, data);
};

export const captureTask = (task) => {
  return api.post('/api/eisenhower-matrix/capture', task);
};

// Eisenhower Matrix
export const getEisenhowerMatrix = () => {
  return api.get('/api/eisenhower-matrix/eisenhower');
};

export const getTasksByQuadrant = (quadrant) => {
  return api.get(`/api/eisenhower-matrix/eisenhower/${quadrant}`);
};

// Kanban Execution
export const getKanbanBoard = (params = {}) => {
  return api.get('/api/eisenhower-matrix/kanban', { params });
};

export const updateExecutionStatus = (taskId, data) => {
  return api.put(`/api/eisenhower-matrix/execution/${taskId}`, data);
};

// Contexts
export const getContexts = () => {
  return api.get('/api/eisenhower-matrix/contexts');
};

export const getTasksByContext = (context) => {
  return api.get(`/api/eisenhower-matrix/context/${encodeURIComponent(context)}`);
};

// Categories
export const getCategories = () => {
  return api.get('/api/eisenhower-matrix/categories');
};

// Projects
export const getProjects = (params = {}) => {
  return api.get('/api/eisenhower-matrix/projects', { params });
};

export const getProject = (id) => {
  return api.get(`/api/eisenhower-matrix/projects/${id}`);
};

export const createProject = (project) => {
  return api.post('/api/eisenhower-matrix/projects', project);
};

export const updateProject = (id, project) => {
  return api.put(`/api/eisenhower-matrix/projects/${id}`, project);
};

export const deleteProject = (id) => {
  return api.delete(`/api/eisenhower-matrix/projects/${id}`);
};

// Contacts
export const getContacts = (params = {}) => {
  return api.get('/api/eisenhower-matrix/contacts', { params });
};

export const createContact = (contact) => {
  return api.post('/api/eisenhower-matrix/contacts', contact);
};

export const updateContact = (id, contact) => {
  return api.put(`/api/eisenhower-matrix/contacts/${id}`, contact);
};

export const deleteContact = (id) => {
  return api.delete(`/api/eisenhower-matrix/contacts/${id}`);
};
