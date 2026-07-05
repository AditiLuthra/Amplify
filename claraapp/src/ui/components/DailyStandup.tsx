import React, { useState, useEffect } from 'react';
import { Task } from '../../types/index.js';
import { TaskPrioritizer } from '../../core/prioritization.js';

interface DailyStandupProps {
  tasks: Task[];
  userName?: string;
  onTaskSelect: (task: Task) => void;
  onTaskComplete: (taskId: string) => void;
  onStartSession: (task: Task) => void;
}

export const DailyStandup: React.FC<DailyStandupProps> = ({
  tasks,
  userName = 'there',
  onTaskSelect,
  onTaskComplete,
  onStartSession,
}) => {
  const [topTasks, setTopTasks] = useState<Task[]>([]);
  const prioritizer = new TaskPrioritizer();

  useEffect(() => {
    const prioritized = prioritizer.prioritizeTasks(
      tasks.filter(t => t.status !== 'completed'),
      5
    );
    setTopTasks(prioritized);
  }, [tasks]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const completedToday = tasks.filter(
    t => t.status === 'completed' &&
         t.completedAt &&
         new Date(t.completedAt).toDateString() === new Date().toDateString()
  ).length;

  return (
    <div className="min-h-screen bg-gradient-primary text-white p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-12 pt-4">
          <h1 className="text-4xl font-bold mb-2">
            {getGreeting()}, {userName}! 👋
          </h1>
          {topTasks.length === 0 ? (
            <p className="text-lg opacity-90">You're all caught up! Great work.</p>
          ) : (
            <p className="text-lg opacity-90">
              {topTasks.length} {topTasks.length === 1 ? 'task' : 'tasks'} today.
              {completedToday > 0 && ` You've completed ${completedToday} already! 🎉`}
            </p>
          )}
        </div>

        {/* Today's Focus */}
        {topTasks.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Today's Focus</h2>
            <div className="space-y-4">
              {topTasks.map((task, index) => (
                <div
                  key={task.id}
                  className="bg-white/95 rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => onTaskSelect(task)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold bg-clara-secondary text-white px-2 py-1 rounded">
                          {index + 1}
                        </span>
                        <h3 className="text-lg font-semibold text-gray-800 group-hover:text-clara-primary">
                          {task.title}
                        </h3>
                      </div>
                      {task.description && (
                        <p className="text-sm text-gray-600 mt-2">{task.description}</p>
                      )}
                      <div className="flex gap-2 mt-3">
                        {task.estimatedMinutes && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            ~{task.estimatedMinutes}min
                          </span>
                        )}
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded capitalize">
                          {task.priority}
                        </span>
                        {task.dueDate && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                            Due soon
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartSession(task);
                        }}
                        className="btn-primary whitespace-nowrap"
                      >
                        Start
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTaskComplete(task.id);
                        }}
                        className="btn-secondary whitespace-nowrap"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {tasks.length > topTasks.length && (
              <p className="text-center text-opacity-70 text-white mt-6 text-sm">
                + {tasks.length - topTasks.length} more {tasks.length - topTasks.length === 1 ? 'task' : 'tasks'} in backlog
              </p>
            )}
          </div>
        )}

        {/* Empty State */}
        {topTasks.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-2xl font-semibold mb-2">All done for today!</h2>
            <p className="text-white/80 mb-6">Add a task to get started</p>
            <button className="btn bg-white text-clara-primary hover:bg-gray-100 font-semibold">
              + Add First Task
            </button>
          </div>
        )}

        {/* Stats */}
        {completedToday > 0 && (
          <div className="mt-12 bg-white/10 backdrop-blur rounded-lg p-6">
            <h3 className="font-semibold mb-3">Today's Progress</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-3xl font-bold">{completedToday}</div>
                <div className="text-sm text-white/70">Completed Today</div>
              </div>
              <div>
                <div className="text-3xl font-bold">{topTasks.length}</div>
                <div className="text-sm text-white/70">Tasks Remaining</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
