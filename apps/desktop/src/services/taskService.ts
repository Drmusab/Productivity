// @ts-nocheck
import api from './api';

export const getTasks = (params = {}) => {
  return api.get('/api/tasks', { params });
};

export const getTask = (id) => {
  return api.get(`/api/tasks/${id}`);
};

export const createTask = (task) => {
  return api.post('/api/tasks', task);
};

export const updateTask = (id, task) => {
  return api.put(`/api/tasks/${id}`, task);
};

export const deleteTask = (id, deletedBy) => {
  return api.delete(`/api/tasks/${id}`, { data: { deleted_by: deletedBy } });
};

export const addSubtask = (taskId, subtask) => {
  return api.post(`/api/tasks/${taskId}/subtasks`, subtask);
};

export const updateSubtask = (taskId, subtaskId, subtask) => {
  return api.put(`/api/tasks/${taskId}/subtasks/${subtaskId}`, subtask);
};

export const deleteSubtask = (taskId, subtaskId) => {
  return api.delete(`/api/tasks/${taskId}/subtasks/${subtaskId}`);
};

export const addTagsToTask = (taskId, tagIds) => {
  return api.post(`/api/tasks/${taskId}/tags`, { tagIds });
};

export const removeTagsFromTask = (taskId, tagIds) => {
  return api.delete(`/api/tasks/${taskId}/tags`, { data: { tagIds } });
};