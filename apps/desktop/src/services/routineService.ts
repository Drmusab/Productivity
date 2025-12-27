// @ts-nocheck
import api from './api';

export const getRoutines = () => api.get('/api/routines');

export const createRoutine = (payload) => api.post('/api/routines', payload);

export const updateRoutine = (id, payload) => api.put(`/api/routines/${id}`, payload);

export const setRoutineStatus = (id, status) => api.patch(`/api/routines/${id}/status`, { status });

export const deleteRoutine = (id) => api.delete(`/api/routines/${id}`);
