import React, { useState } from 'react';

interface TaskBreakdownModalProps {
  taskTitle: string;
  steps: string[];
  onClose: () => void;
  onAdd: (selected: string[]) => void;
}

export const TaskBreakdownModal: React.FC<TaskBreakdownModalProps> = ({
  taskTitle,
  steps,
  onClose,
  onAdd,
}) => {
  const [checked, setChecked] = useState<boolean[]>(steps.map(() => true));

  const toggle = (i: number) =>
    setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)));

  const selectedCount = checked.filter(Boolean).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-gray-800 mb-1">Break it into steps</h2>
        <p className="text-sm text-gray-500 mb-4">
          Tick the steps you want to add to your list for <span className="font-medium">"{taskTitle}"</span>.
          Unchecked ones are discarded.
        </p>

        <div className="space-y-2 mb-5">
          {steps.map((step, i) => (
            <label
              key={i}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                checked[i] ? 'border-clara-primary bg-indigo-50' : 'border-gray-200'
              }`}
            >
              <input
                type="checkbox"
                checked={checked[i]}
                onChange={() => toggle(i)}
                className="mt-0.5 w-4 h-4 accent-clara-primary"
              />
              <span className="text-gray-800 text-sm">{step}</span>
            </label>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={() => onAdd(steps.filter((_, i) => checked[i]))}
            disabled={selectedCount === 0}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            Add {selectedCount} to my list
          </button>
        </div>
      </div>
    </div>
  );
};
