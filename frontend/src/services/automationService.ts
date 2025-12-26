import api from './api';

export const getAutomationRules = () => {
  return api.get('/api/automation');
};

export const getAutomationRule = (id) => {
  return api.get(`/api/automation/${id}`);
};

export const createAutomationRule = (rule) => {
  return api.post('/api/automation', rule);
};

export const updateAutomationRule = (id, rule) => {
  return api.put(`/api/automation/${id}`, rule);
};

export const deleteAutomationRule = (id) => {
  return api.delete(`/api/automation/${id}`);
};

export const triggerAutomationRule = (id) => {
  return api.post(`/api/automation/${id}/trigger`);
};
