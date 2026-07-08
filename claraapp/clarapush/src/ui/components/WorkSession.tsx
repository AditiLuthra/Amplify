import React, { useState, useEffect } from 'react';
import { Task } from '../../types/index.js';
import { SupportMeButton } from './SupportMeButton.js';

interface WorkSessionProps {
  task: Task;
  sessionDuration: number; // in minutes
  onSessionEnd: (completed: boolean, notes?: string, nextStep?: string) => void;
  onExit: () => void;
  onBreakdown?: () => void;
  onBreakSuggestion?: () => void;
  onBreathing?: () => void;
  onMomentumReset?: () => void;
}

export const WorkSession: React.FC<WorkSessionProps> = ({
  task,
  sessionDuration,
  onSessionEnd,
  onExit,
  onBreakdown,
  onBreakSuggestion,
  onBreathing,
  onMomentumReset,
}) => {
  const [timeLeft, setTimeLeft] = useState(sessionDuration * 60); // in seconds
  const [isRunning, setIsRunning] = useState(true);
  const [notes, setNotes] = useState('');
  const [nextStep, setNextStep] = useState('');

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, timeLeft]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = ((sessionDuration * 60 - timeLeft) / (sessionDuration * 60)) * 100;

  const handleComplete = () => {
    onSessionEnd(true, notes, nextStep);
  };

  const handlePause = () => {
    onSessionEnd(false, notes, nextStep);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-600 text-white p-6 flex flex-col">
      <div className="max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-3xl font-bold">Focus Session</h1>
          <button
            onClick={onExit}
            className="btn bg-white/20 hover:bg-white/30 text-white border border-white"
          >
            Exit
          </button>
        </div>

        {/* Task Info */}
        <div className="bg-white/10 backdrop-blur rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-2">{task.title}</h2>
          {task.description && (
            <p className="text-white/80">{task.description}</p>
          )}
        </div>

        {/* Timer */}
        <div className="text-center mb-12">
          <div className="inline-block">
            <div className="relative w-48 h-48 flex items-center justify-center">
              {/* Progress ring */}
              <svg className="absolute w-full h-full -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="90"
                  fill="none"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="4"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="90"
                  fill="none"
                  stroke="white"
                  strokeWidth="4"
                  strokeDasharray={`${(Math.PI * 180 * progress) / 100} ${Math.PI * 180}`}
                  strokeLinecap="round"
                />
              </svg>

              {/* Time display */}
              <div className="text-center z-10">
                <div className="text-6xl font-bold font-mono">
                  {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </div>
                <p className="text-white/80 text-sm mt-2">
                  {isRunning ? 'Keep focused!' : 'Session ended'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="mb-8">
          <label className="block text-sm font-medium mb-2">Quick Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How's it going? Any thoughts to capture?"
            className="w-full px-4 py-3 rounded-lg bg-white/10 backdrop-blur border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white"
            rows={2}
          />
        </div>

        {/* Next tiny step — captured so re-entry is frictionless */}
        <div className="mb-8">
          <label className="block text-sm font-medium mb-2">If you stop now, what's the next tiny step?</label>
          <input
            value={nextStep}
            onChange={(e) => setNextStep(e.target.value)}
            placeholder="e.g. Reply to Sam's email about the date"
            className="w-full px-4 py-3 rounded-lg bg-white/10 backdrop-blur border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white"
          />
        </div>

        {/* Controls */}
        <div className="flex gap-4">
          {isRunning ? (
            <>
              <button
                onClick={() => setIsRunning(false)}
                className="btn-secondary flex-1"
              >
                Pause
              </button>
              <button
                onClick={handleComplete}
                className="btn bg-green-500 hover:bg-green-600 text-white flex-1"
              >
                Done! ✓
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsRunning(true)}
                className="btn-primary flex-1"
              >
                Resume
              </button>
              <button
                onClick={handlePause}
                className="btn bg-red-500 hover:bg-red-600 text-white flex-1"
              >
                Stop
              </button>
            </>
          )}
        </div>

        {/* Motivational message */}
        <div className="mt-12 text-center text-white/70 text-sm">
          <p>You're doing great! Focus on the task, one step at a time.</p>
          {task.estimatedMinutes && (
            <p className="mt-2">
              Estimated time: {task.estimatedMinutes} min | Time elapsed: {Math.floor((sessionDuration * 60 - timeLeft) / 60)} min
            </p>
          )}
        </div>
      </div>

      {/* Support Me Button */}
      <SupportMeButton
        currentTask={task}
        onBreakdown={onBreakdown || (() => {})}
        onBreakSuggestion={onBreakSuggestion || (() => {})}
        onBreathing={onBreathing || (() => {})}
        onMomentumReset={onMomentumReset || (() => {})}
      />
    </div>
  );
};
