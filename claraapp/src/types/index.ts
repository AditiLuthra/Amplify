export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: 'backlog' | 'in-progress' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: string;
  estimatedMinutes?: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  tags: string[];
  parentTaskId?: string;
  notes?: string;
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  order: number;
}

export interface UserProfile {
  id: string;
  email?: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
  preferences: UserPreferences;
  stats: UserStats;
}

export interface UserPreferences {
  dailyTaskLimit: number;
  motivationStyle: 'supportive' | 'direct' | 'balanced';
  socialMediaUrls: string[];
  workSessionDuration: number;
  breakDuration: number;
  breathingGuideType: 'box-breathing' | 'visual-only';
}

export interface UserStats {
  tasksCompleted: number;
  tasksCompletedThisWeek: number;
  streakDays: number;
  supportSessionsThisWeek: number;
  avgCompletionTimeMinutes: number;
}

export interface WorkSession {
  id: string;
  userId: string;
  taskId: string;
  startTime: string;
  endTime?: string;
  durationMinutes: number;
  supportRequestCount: number;
  completed: boolean;
}

export interface SupportSession {
  id: string;
  sessionId: string;
  type: 'breakdown' | 'break-suggestion' | 'breathing' | 'momentum-reset';
  timestamp: string;
  taskTitle: string;
}
