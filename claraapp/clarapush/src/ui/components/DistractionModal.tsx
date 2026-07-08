import React, { useState } from 'react';

interface DistractionModalProps {
  isOpen: boolean;
  appName: string;
  message: string;
  taskTitle: string;
  onIgnore: () => void;
  onTakeBreaK: () => void;
}

export const DistractionModal: React.FC<DistractionModalProps> = ({
  isOpen,
  appName,
  message,
  taskTitle,
  onIgnore,
  onTakeBreaK,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Heads up! 🚨
          </h2>
          <p className="text-gray-600">{appName} is calling...</p>
        </div>

        <div className="bg-blue-50 border-l-4 border-clara-primary p-4 mb-6">
          <p className="text-sm text-gray-700">{message}</p>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Current task: <strong>{taskTitle}</strong>
          </p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onIgnore}
            className="btn-primary flex-1"
          >
            Stay Focused 💪
          </button>
          <button
            onClick={onTakeBreaK}
            className="btn-secondary flex-1"
          >
            Take Break 🌬️
          </button>
        </div>

        <p className="text-center text-xs text-gray-500 mt-4">
          You've got this! Your task is important.
        </p>
      </div>
    </div>
  );
};
