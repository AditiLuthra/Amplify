import React, { useState } from 'react';
import { Task, TaskLocation, LOCATION_LABELS } from '../../types/index.js';

interface AddTaskModalProps {
  onClose: () => void;
  onAdd: (task: Partial<Task>, addToCalendar?: boolean) => void;
}

const LOCATIONS: TaskLocation[] = ['deep-work', 'computer', 'home', 'outside'];

export const AddTaskModal: React.FC<AddTaskModalProps> = ({ onClose, onAdd }) => {
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState<TaskLocation | undefined>();
  const [scheduledAt, setScheduledAt] = useState('');
  const [firstStep, setFirstStep] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [isWaiting, setIsWaiting] = useState(false);
  const [waitingOn, setWaitingOn] = useState('');
  const [addToCalendar, setAddToCalendar] = useState(false);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd(
      {
        title: title.trim(),
        location,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        firstStep: firstStep.trim() || undefined,
        estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes, 10) : undefined,
        priority,
        status: isWaiting ? 'waiting' : 'backlog',
        waitingOn: isWaiting ? waitingOn.trim() || undefined : undefined,
      },
      addToCalendar && !!scheduledAt
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-800">New Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
            ×
          </button>
        </div>

        {/* Title */}
        <label className="block text-sm font-medium text-gray-700 mb-1">What do you need to do?</label>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !isWaiting && handleSubmit()}
          placeholder="e.g. Draft the project proposal"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-clara-primary"
        />

        {/* Waiting-for toggle */}
        <label className="flex items-center gap-2 mb-4 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isWaiting}
            onChange={(e) => setIsWaiting(e.target.checked)}
            className="w-4 h-4 accent-clara-primary"
          />
          <span className="text-sm text-gray-700">I'm waiting on someone / something for this</span>
        </label>

        {isWaiting ? (
          <>
            <label className="block text-sm font-medium text-gray-700 mb-1">Who / what are you waiting on?</label>
            <input
              value={waitingOn}
              onChange={(e) => setWaitingOn(e.target.value)}
              placeholder="e.g. Sarah's feedback, invoice from vendor"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-clara-primary"
            />
            <p className="text-xs text-gray-500 mb-4">This goes to your Waiting For list so it's easy to follow up.</p>
          </>
        ) : (
          <>
            {/* Location */}
            <label className="block text-sm font-medium text-gray-700 mb-2">Where will you do it?</label>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocation(location === loc ? undefined : loc)}
                  className={`px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                    location === loc
                      ? 'border-clara-primary bg-indigo-50 text-clara-primary font-medium'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {LOCATION_LABELS[loc]}
                </button>
              ))}
            </div>

            {/* When (if-then planning) */}
            <label className="block text-sm font-medium text-gray-700 mb-1">When will you start? (optional)</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-1 focus:outline-none focus:ring-2 focus:ring-clara-primary"
            />
            <p className="text-xs text-gray-500 mb-3">
              Planning <em>when &amp; where</em> makes you far more likely to follow through.
            </p>

            {scheduledAt && (
              <label className="flex items-center gap-2 mb-4 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={addToCalendar}
                  onChange={(e) => setAddToCalendar(e.target.checked)}
                  className="w-4 h-4 accent-clara-primary"
                />
                <span className="text-sm text-gray-700">📅 Also add this to my calendar (at that time)</span>
              </label>
            )}

            {/* First step */}
            <label className="block text-sm font-medium text-gray-700 mb-1">Tiny first step (optional)</label>
            <input
              value={firstStep}
              onChange={(e) => setFirstStep(e.target.value)}
              placeholder="e.g. Open the doc and write one sentence"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-clara-primary"
            />

            {/* Estimate + priority */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Est. minutes</label>
                <input
                  type="number"
                  min="1"
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(e.target.value)}
                  placeholder="25"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-clara-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Task['priority'])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-clara-primary bg-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
          </>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={!title.trim()} className="btn-primary flex-1 disabled:opacity-50">
            Add Task
          </button>
        </div>
      </div>
    </div>
  );
};
