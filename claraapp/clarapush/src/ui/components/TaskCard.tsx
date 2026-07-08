import React from 'react';
import { Task } from '../../types/index.js';

interface TaskCardProps {
  task: Task;
  onSelect: (task: Task) => void;
  onComplete: (taskId: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onSelect, onComplete }) => {
  const priorityColor = {
    critical: 'border-l-red-500',
    high: 'border-l-orange-500',
    medium: 'border-l-blue-500',
    low: 'border-l-green-500',
  }[task.priority];

  const daysUntilDue = task.dueDate
    ? Math.ceil(
        (new Date(task.dueDate).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <div
      className={`task-card ${priorityColor} cursor-pointer group`}
      onClick={() => onSelect(task)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800 group-hover:text-clara-primary">
            {task.title}
          </h3>
          {task.description && (
            <p className="text-sm text-gray-600 mt-2">{task.description}</p>
          )}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
              {task.priority}
            </span>
            {task.estimatedMinutes && (
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                ~{task.estimatedMinutes}min
              </span>
            )}
            {daysUntilDue !== null && (
              <span
                className={`text-xs px-2 py-1 rounded ${
                  daysUntilDue < 0
                    ? 'bg-red-100 text-red-700'
                    : daysUntilDue === 0
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-green-100 text-green-700'
                }`}
              >
                {daysUntilDue < 0
                  ? `${Math.abs(daysUntilDue)} days overdue`
                  : daysUntilDue === 0
                  ? 'Due today'
                  : `${daysUntilDue} days left`}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onComplete(task.id);
          }}
          className="btn-primary ml-2 whitespace-nowrap"
        >
          Done
        </button>
      </div>
    </div>
  );
};
