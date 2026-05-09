import React from 'react';

export type ProgressPhase = 'generating' | 'uploading' | 'completed';

interface ProgressBarProps {
  phase: ProgressPhase;
  current: number;
  total: number;
  isVisible: boolean;
}

export function ProgressBar({ phase, current, total, isVisible }: ProgressBarProps) {
  if (!isVisible) return null;

  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  
  const phaseConfig = {
    generating: {
      label: 'Generating',
      color: 'bg-green-500',
      textColor: 'text-green-700 dark:text-green-300',
      borderColor: 'border-green-500/40',
      bgColor: 'bg-green-500/10',
    },
    uploading: {
      label: 'Uploading',
      color: 'bg-yellow-500',
      textColor: 'text-yellow-700 dark:text-yellow-300',
      borderColor: 'border-yellow-500/40',
      bgColor: 'bg-yellow-500/10',
    },
    completed: {
      label: 'Completed',
      color: 'bg-blue-500',
      textColor: 'text-blue-700 dark:text-blue-300',
      borderColor: 'border-blue-500/40',
      bgColor: 'bg-blue-500/10',
    },
  };

  const config = phaseConfig[phase];

  return (
    <div className={`mb-4 rounded-lg border ${config.borderColor} ${config.bgColor} px-4 py-3`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-semibold ${config.textColor}`}>
          {config.label}
        </span>
        <span className={`text-sm font-medium ${config.textColor}`}>
          {current} / {total}
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full ${config.color} transition-all duration-300 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className={`text-xs mt-1 ${config.textColor}`}>
        {percentage}%
      </div>
    </div>
  );
}
