import api from './api';

export const getBoards = (params = {}) => {
  return api.get('/api/boards', { params });
};

export const getBoard = (id) => {
  return api.get(`/api/boards/${id}`);
};

export const createBoard = (board) => {
  return api.post('/api/boards', board);
};

export const updateBoard = (id, board) => {
  return api.put(`/api/boards/${id}`, board);
};

export const deleteBoard = (id) => {
  return api.delete(`/api/boards/${id}`);
};

export const createColumn = (boardId, column) => {
  return api.post(`/api/boards/${boardId}/columns`, column);
};

export const updateColumn = (boardId, columnId, column) => {
  return api.put(`/api/boards/${boardId}/columns/${columnId}`, column);
};

export const deleteColumn = (boardId, columnId) => {
  return api.delete(`/api/boards/${boardId}/columns/${columnId}`);
};

export const createSwimlane = (boardId, swimlane) => {
  return api.post(`/api/boards/${boardId}/swimlanes`, swimlane);
};

export const updateSwimlane = (boardId, swimlaneId, swimlane) => {
  return api.put(`/api/boards/${boardId}/swimlanes/${swimlaneId}`, swimlane);
};

export const deleteSwimlane = (boardId, swimlaneId) => {
  return api.delete(`/api/boards/${boardId}/swimlanes/${swimlaneId}`);
};

export const duplicateBoard = (id, name, createdBy) => {
  return api.post(`/api/boards/${id}/duplicate`, { name, created_by: createdBy });
};