import { Task, UserProfile } from '../types/index.js';

/**
 * Clara data layer.
 *
 * Tasks and the user profile live in the browser's localStorage, so the app is
 * fully self-contained and installable as a PWA with no separate server to run.
 * The only network call is the AI "Support Me" helper, which is proxied through
 * a serverless function (/api/chat) that keeps the Anthropic API key server-side.
 */

const USER_KEY = 'claraUser';
const TASKS_KEY = 'claraTasks';

function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function now(): string {
  return new Date().toISOString();
}

const defaultPreferences = {
  dailyTaskLimit: 5,
  motivationStyle: 'supportive' as const,
  socialMediaUrls: [] as string[],
  workSessionDuration: 25,
  breakDuration: 5,
  breathingGuideType: 'box-breathing' as const,
};

const defaultStats = {
  tasksCompleted: 0,
  tasksCompletedThisWeek: 0,
  streakDays: 0,
  supportSessionsThisWeek: 0,
  avgCompletionTimeMinutes: 0,
};

export class ClaraClient {
  private userId: string | null = null;

  setUserId(userId: string) {
    this.userId = userId;
  }

  private readTasks(): Task[] {
    try {
      const raw = localStorage.getItem(TASKS_KEY);
      return raw ? (JSON.parse(raw) as Task[]) : [];
    } catch {
      return [];
    }
  }

  private writeTasks(tasks: Task[]) {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }

  async createUser(email: string, name: string): Promise<UserProfile> {
    const user: UserProfile = {
      id: uuid(),
      email,
      name,
      createdAt: now(),
      updatedAt: now(),
      preferences: { ...defaultPreferences },
      stats: { ...defaultStats },
    };
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.userId = user.id;
    return user;
  }

  async getUser(userId: string): Promise<UserProfile> {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) {
      const user = JSON.parse(raw) as UserProfile;
      user.preferences = { ...defaultPreferences, ...user.preferences };
      user.stats = { ...defaultStats, ...user.stats };
      this.userId = user.id;
      return user;
    }
    // The saved id exists but the profile was lost — rebuild a minimal one.
    const user: UserProfile = {
      id: userId,
      createdAt: now(),
      updatedAt: now(),
      preferences: { ...defaultPreferences },
      stats: { ...defaultStats },
    };
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.userId = userId;
    return user;
  }

  async createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const tasks = this.readTasks();
    const newTask: Task = {
      id: uuid(),
      userId: this.userId || task.userId,
      title: task.title,
      description: task.description,
      status: task.status || 'backlog',
      priority: task.priority || 'medium',
      dueDate: task.dueDate,
      estimatedMinutes: task.estimatedMinutes,
      tags: task.tags || [],
      parentTaskId: task.parentTaskId,
      notes: task.notes,
      completedAt: task.completedAt,
      createdAt: now(),
      updatedAt: now(),
    };
    tasks.push(newTask);
    this.writeTasks(tasks);
    return newTask;
  }

  async getTasks(status?: string): Promise<Task[]> {
    let tasks = this.readTasks();
    if (status) tasks = tasks.filter((t) => t.status === status);
    return tasks;
  }

  async getTask(taskId: string): Promise<Task> {
    const task = this.readTasks().find((t) => t.id === taskId);
    if (!task) throw new Error('Task not found');
    return task;
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    const tasks = this.readTasks();
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) throw new Error('Task not found');
    tasks[idx] = { ...tasks[idx], ...updates, updatedAt: now() };
    this.writeTasks(tasks);
    return tasks[idx];
  }

  async deleteTask(taskId: string): Promise<void> {
    this.writeTasks(this.readTasks().filter((t) => t.id !== taskId));
  }

  async chat(message: string): Promise<{ response: string; toolCalls?: any[] }> {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });

    if (!res.ok) {
      let detail = '';
      try {
        const data = await res.json();
        detail = data?.error || '';
      } catch {
        /* ignore parse errors */
      }
      throw new Error(detail || `Clara is unavailable (status ${res.status})`);
    }

    const data = await res.json();
    return { response: data.response };
  }
}

export const claraClient = new ClaraClient();
