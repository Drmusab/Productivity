import api from './api';

export const getSettings = () => {
  return api.get('/settings');
};

export const getSetting = (key) => {
  return api.get(`/settings/${key}`);
};

export const updateSetting = (key, value) => {
  return api.put(`/settings/${key}`, { value });
};

export const updateReportSchedule = (day, hour, minute) => {
  return api.post('/settings/report-schedule', { day, hour, minute });
};

const settingsService = {
  getSettings,
  getSetting,
  updateSetting,
  updateReportSchedule
};

export default settingsService;
