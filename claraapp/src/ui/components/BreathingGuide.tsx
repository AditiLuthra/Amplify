

import React, { useEffect, useState } from 'react';

interface Phase {
  label: string;
  scale: number;
  seconds: number;
}

// Box breathing: 4s in, 4s hold, 4s out, 4s hold
const PHASES: Phase[] = [
  { label: 'Breathe in', scale: 1.7, seconds: 4 },
  { label: 'Hold', scale: 1.7, seconds: 4 },
  { label: 'Breathe out', scale: 1.0, seconds: 4 },
  { label: 'Hold', scale: 1.0, seconds: 4 },
];

interface BreathingGuideProps {
  onClose: () => void;
}

export const BreathingGuide: React.FC<BreathingGuideProps> = ({ onClose }) => {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [cycles, setCycles] = useState(0);
  const [count, setCount] = useState(PHASES[0].seconds);

  // Advance phases
  useEffect(() => {
    const phase = PHASES[phaseIndex];
    const timer = setTimeout(() => {
      setPhaseIndex((prev) => {
        const next = (prev + 1) % PHASES.length;
        if (next === 0) setCycles((c) => c + 1);
        return next;
      });
    }, phase.seconds * 1000);
    return () => clearTimeout(timer);
  }, [phaseIndex]);

  // Per-second countdown for the current phase
  useEffect(() => {
    setCount(PHASES[phaseIndex].seconds);
    const id = setInterval(() => setCount((c) => (c > 1 ? c - 1 : c)), 1000);
    return () => clearInterval(id);
  }, [phaseIndex]);

  const phase = PHASES[phaseIndex];

  return (
    <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-6">
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-white/80 hover:text-white text-3xl leading-none"
        aria-label="Close"
      >
        ×
      </button>

      <p className="text-xs uppercase tracking-[0.3em] text-white/60 mb-10">Box breathing</p>

      <div className="relative flex items-center justify-center mb-12" style={{ width: 260, height: 260 }}>
        <div
          className="rounded-full bg-white/15 border border-white/40"
          style={{
            width: 150,
            height: 150,
            transform: `scale(${phase.scale})`,
            transition: `transform ${phase.seconds}s ease-in-out`,
          }}
        />
        <div className="absolute flex flex-col items-center">
          <span className="text-2xl font-semibold">{phase.label}</span>
          <span className="text-white/70 text-lg mt-1">{count}</span>
        </div>
      </div>

      <p className="text-white/80">Follow the circle · in 4 · hold 4 · out 4 · hold 4</p>
      <p className="text-white/60 mt-2 text-sm">
        {cycles} {cycles === 1 ? 'round' : 'rounds'} complete
      </p>

      <button onClick={onClose} className="btn bg-white text-indigo-700 font-semibold mt-10 px-8">
        I feel calmer 🧘
      </button>
    </div>
  );
};
