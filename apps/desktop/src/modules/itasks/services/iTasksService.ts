/**
 * @fileoverview iTasks service for API communication
 * @module modules/itasks/services
 */

import axios from 'axios';
import type { ITask, QuadrantTasks, TaskWithEisenhower } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

/**
 * Get all iTasks
 */
export const getTasks = async (): Promise<TaskWithEisenhower[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/itasks/tasks`);
    return response.data;
  } catch (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }
};

/**
 * Create a new task
 */
export const createTask = async (task: Omit<ITask, 'id' | 'createdAt' | 'updatedAt'>): Promise<TaskWithEisenhower> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/itasks/tasks`, task);
    return response.data;
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
};

/**
 * Update a task
 */
export const updateTask = async (id: string, updates: Partial<ITask>): Promise<TaskWithEisenhower> => {
  try {
    const response = await axios.put(`${API_BASE_URL}/api/itasks/tasks/${id}`, updates);
    return response.data;
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
};

/**
 * Delete a task
 */
export const deleteTask = async (id: string): Promise<void> => {
  try {
    await axios.delete(`${API_BASE_URL}/api/itasks/tasks/${id}`);
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
};

/**
 * Get tasks grouped by Eisenhower quadrant
 */
export const getEisenhowerMatrix = async (): Promise<QuadrantTasks> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/itasks/eisenhower`);
    return response.data;
  } catch (error) {
    console.error('Error fetching Eisenhower matrix:', error);
    throw error;
  }
};

/**
 * Migrate tasks from iTasks format
 */
export const migrateTasks = async (tasks: ITask[]): Promise<{ success: boolean; imported: number; failed: number }> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/itasks/migrate`, { tasks });
    return response.data;
  } catch (error) {
    console.error('Error migrating tasks:', error);
    throw error;
  }
};
