import { useState, useCallback } from 'react';
import { Task } from '../../types/index.js';
import { claraClient } from '../../api/client.js';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async (status?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await claraClient.getTasks(status);
      setTasks(data);
    } catch (err) {
      setError((err as any).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTask = useCallback(async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    setLoading(true);
    setError(null);
    try {
      const newTask = await claraClient.createTask(task);
      setTasks(prev => [...prev, newTask]);
      return newTask;
    } catch (err) {
      setError((err as any).message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await claraClient.updateTask(taskId, updates);
      setTasks(prev => prev.map(t => (t.id === taskId ? updated : t)));
      return updated;
    } catch (err) {
      setError((err as any).message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const completeTask = useCallback(async (taskId: string, notes?: string) => {
    return updateTask(taskId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      notes,
    });
  }, [updateTask]);

  const deleteTask = useCallback(async (taskId: string) => {
    setLoading(true);
    setError(null);
    try {
      await claraClient.deleteTask(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      setError((err as any).message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    completeTask,
    deleteTask,
  };
}
