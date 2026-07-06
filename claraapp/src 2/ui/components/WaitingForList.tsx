import React from 'react';
import { Task } from '../../types/index.js';

interface WaitingForListProps {
  tasks: Task[];
  onResolve: (taskId: string) => void;
  onActivate: (taskId: string) => void;
}

export const WaitingForList: React.FC<WaitingForListProps> = ({ tasks, onResolve, onActivate }) => {
  const waiting = tasks.filter((t) => t.status === 'waiting');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 pt-2">
          <h1 className="text-3xl font-bold text-gray-800">Waiting For ⏳</h1>
          <p className="text-gray-600 mt-1">People and things you're following up on.</p>
        </div>

        {waiting.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">📭</div>
            <h2 className="text-xl font-semibold text-gray-800">Nothing pending</h2>
            <p className="text-gray-500 mt-1">
              When you add a task you're blocked on, it lands here so it's easy to chase.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {waiting.map((task) => (
              <div key={task.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{task.title}</h3>
                    {task.waitingOn && (
                      <p className="text-sm text-gray-600 mt-1">
                        Waiting on: <span className="font-medium text-clara-primary">{task.waitingOn}</span>
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Added {new Date(task.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => onActivate(task.id)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-indigo-50 text-clara-primary font-medium hover:bg-indigo-100 whitespace-nowrap"
                      title="It's unblocked — move to my tasks"
                    >
                      Ready →
                    </button>
                    <button
                      onClick={() => onResolve(task.id)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 whitespace-nowrap"
                      title="Done / no longer needed"
                    >
                      ✓ Done
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
