import React, { useState } from 'react';
import { Task, LOCATION_LABELS } from '../../types/index.js';
import { TaskPrioritizer } from '../../core/prioritization.js';

function formatPlannedTime(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const today = new Date().toDateString() === d.toDateString();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return today ? time : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
}

type SortKey = 'smart' | 'time' | 'priority' | 'due' | 'added';

const SORT_LABELS: Record<SortKey, string> = {
  smart: 'Smart order',
  time: 'Planned time',
  priority: 'Priority',
  due: 'Due date',
  added: 'Recently added',
};

const priorityRank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

interface DailyStandupProps {
  tasks: Task[];
  userName?: string;
  onTaskSelect: (task: Task) => void;
  onTaskComplete: (taskId: string) => void;
  onStartSession: (task: Task) => void;
  onAddTask?: () => void;
}

export const DailyStandup: React.FC<DailyStandupProps> = ({
  tasks,
  userName = 'there',
  onTaskSelect,
  onTaskComplete,
  onStartSession,
  onAddTask,
}) => {
  const [sortBy, setSortBy] = useState<SortKey>('smart');
  const prioritizer = new TaskPrioritizer();

  const active = tasks.filter((t) => t.status !== 'completed');
  const smartOrder = prioritizer.prioritizeTasks(active, 999);
  const focus = smartOrder.slice(0, 3);

  const sortedAll = [...active].sort((a, b) => {
    switch (sortBy) {
      case 'time':
        return (a.scheduledAt || '9999').localeCompare(b.scheduledAt || '9999');
      case 'priority':
        return (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9);
      case 'due':
        return (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
      case 'added':
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      default: {
        const ai = smartOrder.findIndex((t) => t.id === a.id);
        const bi = smartOrder.findIndex((t) => t.id === b.id);
        return ai - bi;
      }
    }
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const completedToday = tasks.filter(
    (t) =>
      t.status === 'completed' &&
      t.completedAt &&
      new Date(t.completedAt).toDateString() === new Date().toDateString()
  ).length;

  const renderCard = (task: Task, rank?: number) => (
    <div
      key={task.id}
      className="bg-white/95 rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => onTaskSelect(task)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {rank !== undefined && (
              <span className="text-sm font-semibold bg-clara-secondary text-white px-2 py-1 rounded">
                {rank + 1}
              </span>
            )}
            <h3 className="text-lg font-semibold text-gray-800">{task.title}</h3>
          </div>
          {task.description && <p className="text-sm text-gray-600 mt-2">{task.description}</p>}
          <div className="flex flex-wrap gap-2 mt-3">
            {formatPlannedTime(task.scheduledAt) && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded font-medium">
                ⏰ {formatPlannedTime(task.scheduledAt)}
              </span>
            )}
            {task.location && (
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">
                {LOCATION_LABELS[task.location]}
              </span>
            )}
            {task.estimatedMinutes && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                ~{task.estimatedMinutes}min
              </span>
            )}
            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded capitalize">
              {task.priority}
            </span>
          </div>
          {task.firstStep && (
            <p className="text-xs text-gray-500 mt-2">👉 First step: {task.firstStep}</p>
          )}
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
  );

  return (
    <div className="min-h-screen bg-gradient-primary text-white p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 pt-4">
          <h1 className="text-4xl font-bold mb-2">
            {getGreeting()}, {userName}! 👋
          </h1>
          {active.length === 0 ? (
            <p className="text-lg opacity-90">You're all caught up! Great work.</p>
          ) : (
            <p className="text-lg opacity-90">
              {active.length} {active.length === 1 ? 'task' : 'tasks'} to go.
              {completedToday > 0 && ` You've completed ${completedToday} already! 🎉`}
            </p>
          )}
        </div>

        {/* Today's Focus (top 3 by smart score) */}
        {focus.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Today's Focus</h2>
            <div className="space-y-4">{focus.map((task, i) => renderCard(task, i))}</div>
          </div>
        )}

        {/* All tasks with sorting */}
        {active.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">All Tasks ({active.length})</h2>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="text-sm text-gray-800 bg-white/95 rounded-lg px-3 py-2 focus:outline-none"
              >
                {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                  <option key={k} value={k}>
                    Sort: {SORT_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-3">{sortedAll.map((task) => renderCard(task))}</div>
          </div>
        )}

        {/* Empty State */}
        {active.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-2xl font-semibold mb-2">All done for today!</h2>
            <p className="text-white/80 mb-6">Add a task to get started</p>
            <button
              onClick={onAddTask}
              className="btn bg-white text-clara-primary hover:bg-gray-100 font-semibold"
            >
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
                <div className="text-3xl font-bold">{active.length}</div>
                <div className="text-sm text-white/70">Tasks Remaining</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
