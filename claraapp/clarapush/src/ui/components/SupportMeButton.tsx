import React, { useState } from 'react';
import { Task } from '../../types/index.js';

interface SupportMeButtonProps {
  currentTask: Task;
  onBreakdown: () => void;
  onBreakSuggestion: () => void;
  onBreathing: () => void;
  onMomentumReset: () => void;
}

export const SupportMeButton: React.FC<SupportMeButtonProps> = ({
  currentTask,
  onBreakdown,
  onBreakSuggestion,
  onBreathing,
  onMomentumReset,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const options = [
    {
      label: 'Break This Down',
      description: 'Simplify into smaller steps',
      onClick: onBreakdown,
      icon: '📋',
    },
    {
      label: 'Suggest a Break',
      description: 'Take a focused break',
      onClick: onBreakSuggestion,
      icon: '🌬️',
    },
    {
      label: 'Breathing Guide',
      description: 'Calm your mind',
      onClick: onBreathing,
      icon: '🧘',
    },
    {
      label: 'Momentum Reset',
      description: 'Get back on track',
      onClick: onMomentumReset,
      icon: '⚡',
    },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="absolute bottom-20 right-0 bg-white rounded-lg shadow-2xl w-80 p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2">
          <h3 className="font-semibold text-gray-800 mb-4">How can I support you?</h3>
          {options.map((option) => (
            <button
              key={option.label}
              onClick={() => {
                option.onClick();
                setIsOpen(false);
              }}
              className="w-full text-left p-3 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">{option.icon}</span>
                <div>
                  <div className="font-medium text-gray-800">{option.label}</div>
                  <div className="text-sm text-gray-600">{option.description}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-support w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all"
        title="Support Me"
      >
        <span className="text-xl">💪</span>
      </button>
    </div>
  );
};
