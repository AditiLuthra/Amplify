import { useEffect, useCallback } from 'react';
import { NotificationManager, ActivityTracker } from '../../core/notifications.js';

export function useNotifications() {
  const requestPermission = useCallback(async () => {
    const granted = await NotificationManager.requestPermission();
    return granted;
  }, []);

  const isEnabled = useCallback(() => {
    return NotificationManager.isEnabled();
  }, []);

  const sendNotification = useCallback(
    async (
      type: 'off-track' | 'break' | 'success' | 'standup' | 'end-of-day',
      context?: {
        taskTitle?: string;
        tasksCompleted?: number;
        tasksRemaining?: number;
        taskCount?: number;
      }
    ) => {
      switch (type) {
        case 'off-track':
          await NotificationManager.notifyOffTrack(context?.taskTitle);
          break;
        case 'break':
          await NotificationManager.notifyTakeBreak(context?.taskTitle || 'your current task');
          break;
        case 'success':
          await NotificationManager.notifySuccess(context?.tasksCompleted || 1);
          break;
        case 'standup':
          await NotificationManager.notifyDailyStandup(context?.taskTitle, context?.taskCount);
          break;
        case 'end-of-day':
          await NotificationManager.notifyEndOfDay(
            context?.tasksCompleted || 0,
            context?.tasksRemaining || 0
          );
          break;
      }
    },
    []
  );

  const startActivityTracking = useCallback(() => {
    ActivityTracker.startTracking();
  }, []);

  const startTaskSession = useCallback((taskTitle: string) => {
    ActivityTracker.startTaskSession(taskTitle);
  }, []);

  const endTaskSession = useCallback(() => {
    ActivityTracker.endTaskSession();
  }, []);

  // Request permission on mount
  useEffect(() => {
    requestPermission();
    startActivityTracking();
  }, [requestPermission, startActivityTracking]);

  return {
    requestPermission,
    isEnabled,
    sendNotification,
    startTaskSession,
    endTaskSession,
  };
}
