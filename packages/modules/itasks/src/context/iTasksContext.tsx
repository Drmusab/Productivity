/**
 * @fileoverview iTasks context provider for state management
 * @module modules/itasks/context
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ITask, TaskWithEisenhower } from '../types';
import * as iTasksService from '../services/iTasksService';

interface ITasksContextType {
  tasks: TaskWithEisenhower[];
  loading: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  addTask: (task: Omit<ITask, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<ITask>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  duplicateTask: (id: string) => Promise<void>;
}

const ITasksContext = createContext<ITasksContextType | undefined>(undefined);

export const useITasks = (): ITasksContextType => {
  const context = useContext(ITasksContext);
  if (!context) {
    throw new Error('useITasks must be used within ITasksProvider');
  }
  return context;
};

interface ITasksProviderProps {
  children: React.ReactNode;
}

export const ITasksProvider: React.FC<ITasksProviderProps> = ({ children }) => {
  const [tasks, setTasks] = useState<TaskWithEisenhower[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedTasks = await iTasksService.getTasks();
      setTasks(fetchedTasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addTask = useCallback(async (task: Omit<ITask, 'id' | 'createdAt' | 'updatedAt'>) => {
    setLoading(true);
    setError(null);
    try {
      const newTask = await iTasksService.createTask(task);
      setTasks((prev) => [newTask, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
      console.error('Error creating task:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTask = useCallback(async (id: string, updates: Partial<ITask>) => {
    setLoading(true);
    setError(null);
    try {
      const updatedTask = await iTasksService.updateTask(id, updates);
      setTasks((prev) =>
        prev.map((task) => (task.id === id ? updatedTask : task))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
      console.error('Error updating task:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await iTasksService.deleteTask(id);
      setTasks((prev) => prev.filter((task) => task.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
      console.error('Error deleting task:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const duplicateTask = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const taskToDuplicate = tasks.find((task) => task.id === id);
      if (!taskToDuplicate) {
        throw new Error('Task not found');
      }

      const { id: _, createdAt, updatedAt, ...taskData } = taskToDuplicate;
      const newTask = await iTasksService.createTask({
        ...taskData,
        title: `${taskData.title} (Copy)`,
      });
      setTasks((prev) => [newTask, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate task');
      console.error('Error duplicating task:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [tasks]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const value: ITasksContextType = {
    tasks,
    loading,
    error,
    fetchTasks,
    addTask,
    updateTask,
    deleteTask,
    duplicateTask,
  };

  return <ITasksContext.Provider value={value}>{children}</ITasksContext.Provider>;
};
