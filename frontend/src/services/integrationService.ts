import api from './api';

export const getIntegrations = () => {
  return api.get('/api/integrations');
};

export const getIntegration = (id) => {
  return api.get(`/api/integrations/${id}`);
};

export const createIntegration = (integration) => {
  return api.post('/api/integrations', integration);
};

export const updateIntegration = (id, integration) => {
  return api.put(`/api/integrations/${id}`, integration);
};

export const deleteIntegration = (id) => {
  return api.delete(`/api/integrations/${id}`);
};

export const testN8nWebhook = (webhookUrl, apiKey) => {
  return api.post('/api/integrations/test-n8n-webhook', { webhookUrl, apiKey });
};
