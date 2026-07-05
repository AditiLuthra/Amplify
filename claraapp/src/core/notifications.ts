/**
 * Clara Notification System
 * Sends helpful nudges to keep you on track
 */

export interface ClaraNotification {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag: string;
  requireInteraction?: boolean;
  actions?: NotificationAction[];
  data?: Record<string, any>;
}

export interface NotificationAction {
  action: string;
  title: string;
}

export class NotificationManager {
  private static hasPermission: boolean = false;

  /**
   * Request notification permission from user
   */
  static async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.hasPermission = true;
      return true;
    }

    if (Notification.permission !== 'denied') {
      try {
        const permission = await Notification.requestPermission();
        this.hasPermission = permission === 'granted';
        return this.hasPermission;
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        return false;
      }
    }

    return false;
  }

  /**
   * Check if notifications are enabled
   */
  static isEnabled(): boolean {
    return (
      'Notification' in window &&
      Notification.permission === 'granted'
    );
  }

  /**
   * Send a notification
   */
  static async send(notification: ClaraNotification): Promise<void> {
    if (!this.isEnabled()) {
      console.log('Notifications not enabled');
      return;
    }

    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        registration.showNotification(notification.title, {
          body: notification.body,
          icon: '✨',
          badge: '✨',
          tag: notification.tag,
          requireInteraction: notification.requireInteraction || false,
          actions: notification.actions,
          data: notification.data,
        });
      } catch (error) {
        console.error('Error sending notification:', error);
      }
    }
  }

  /**
   * Off-track notification - no task started today
   */
  static notifyOffTrack(firstTaskTitle?: string): Promise<void> {
    const body = firstTaskTitle
      ? `Your first task: "${firstTaskTitle}" - Let's get started! 💪`
      : 'Time to check your Clara tasks and pick your first one. You got this! 💪';

    return this.send({
      title: '👋 Good morning!',
      body,
      tag: 'off-track-morning',
      requireInteraction: true,
      actions: [
        { action: 'open', title: 'Open Clara' },
      ],
    });
  }

  /**
   * Long session notification - suggest a break
   */
  static notifyTakeBreak(taskTitle: string): Promise<void> {
    return this.send({
      title: '🌬️ Time for a break!',
      body: `You've been working on "${taskTitle}" for a while. Take a 5-min break to refresh!`,
      tag: 'break-suggestion',
      actions: [
        { action: 'break', title: 'Take a break' },
        { action: 'continue', title: 'Keep working' },
      ],
    });
  }

  /**
   * Social media distraction notification
   */
  static notifyDistraction(appName: string, taskTitle: string): Promise<void> {
    return this.send({
      title: `🚫 ${appName} is calling...`,
      body: `You're working on "${taskTitle}". Let's stay focused! Just 20 more minutes. 💪`,
      tag: 'distraction-warning',
      requireInteraction: false,
      actions: [
        { action: 'refocus', title: 'Stay focused' },
        { action: 'break', title: 'Take a break first' },
      ],
    });
  }

  /**
   * Motivation notification - celebrate progress
   */
  static notifySuccess(tasksCompleted: number): Promise<void> {
    const messages = [
      `🎉 Amazing! You've completed ${tasksCompleted} ${tasksCompleted === 1 ? 'task' : 'tasks'} today!`,
      `⭐ You're on fire! ${tasksCompleted} tasks done. Keep it up!`,
      `🌟 Incredible focus! ${tasksCompleted} completed. You're unstoppable!`,
    ];
    const message = messages[Math.floor(Math.random() * messages.length)];

    return this.send({
      title: '🏆 Great job!',
      body: message,
      tag: 'success-celebration',
      requireInteraction: false,
    });
  }

  /**
   * Gentle reminder - no activity
   */
  static notifyNoActivity(minutesSinceLastActivity: number, nextTaskTitle?: string): Promise<void> {
    let body = `It's been ${minutesSinceLastActivity} minutes. Time to get back to your tasks? 🎯`;

    if (nextTaskTitle) {
      body = `It's been ${minutesSinceLastActivity} minutes. Your next task: "${nextTaskTitle}" 🎯`;
    }

    return this.send({
      title: '👀 We miss you!',
      body,
      tag: 'no-activity',
      requireInteraction: false,
      actions: [
        { action: 'open', title: 'Open Clara' },
      ],
    });
  }

  /**
   * Daily standup reminder
   */
  static notifyDailyStandup(firstTaskTitle?: string, taskCount?: number): Promise<void> {
    let body = 'Check your Clara standup and pick your top 3 tasks for today. Let\'s make it a great day! 🚀';

    if (firstTaskTitle && taskCount) {
      body = `${taskCount} tasks today. Start with: "${firstTaskTitle}" 🎯`;
    } else if (firstTaskTitle) {
      body = `First up: "${firstTaskTitle}" - Let's tackle this! 💪`;
    }

    return this.send({
      title: '☀️ Rise and shine!',
      body,
      tag: 'daily-standup',
      requireInteraction: true,
      actions: [
        { action: 'open', title: 'View standup' },
      ],
    });
  }

  /**
   * End of day summary
   */
  static notifyEndOfDay(tasksCompleted: number, tasksRemaining: number): Promise<void> {
    const message = tasksCompleted > 0
      ? `You completed ${tasksCompleted} ${tasksCompleted === 1 ? 'task' : 'tasks'} today! You're awesome! 🌟`
      : 'Don\'t worry, tomorrow is a new day. You\'ve got this! 💪';

    return this.send({
      title: '🌙 End of day recap',
      body: message,
      tag: 'end-of-day',
      requireInteraction: false,
    });
  }
}

/**
 * Track user activity and send off-track notifications
 */
export class ActivityTracker {
  private static lastActivityTime = Date.now();
  private static noActivityTimeout: NodeJS.Timeout | null = null;
  private static longSessionTimeout: NodeJS.Timeout | null = null;
  private static currentTaskStartTime: number | null = null;

  static startTracking(): void {
    // Reset on any user activity
    document.addEventListener('click', () => this.onActivity());
    document.addEventListener('keydown', () => this.onActivity());
    document.addEventListener('touchstart', () => this.onActivity());
  }

  static startTaskSession(taskTitle: string): void {
    this.currentTaskStartTime = Date.now();
    this.resetLongSessionTimer(taskTitle);
  }

  static endTaskSession(): void {
    this.currentTaskStartTime = null;
    if (this.longSessionTimeout) {
      clearTimeout(this.longSessionTimeout);
    }
  }

  private static onActivity(): void {
    this.lastActivityTime = Date.now();
    this.resetNoActivityTimer();
  }

  private static resetNoActivityTimer(): void {
    if (this.noActivityTimeout) {
      clearTimeout(this.noActivityTimeout);
    }
    // Notify after 1 hour of no activity
    this.noActivityTimeout = setTimeout(() => {
      const minutesPassed = Math.round((Date.now() - this.lastActivityTime) / 60000);
      NotificationManager.notifyNoActivity(minutesPassed);
    }, 60 * 60 * 1000);
  }

  private static resetLongSessionTimer(taskTitle: string): void {
    if (this.longSessionTimeout) {
      clearTimeout(this.longSessionTimeout);
    }
    // Suggest break after 45 minutes of work
    this.longSessionTimeout = setTimeout(() => {
      NotificationManager.notifyTakeBreak(taskTitle);
    }, 45 * 60 * 1000);
  }
}
