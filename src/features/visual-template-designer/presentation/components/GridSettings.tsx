/**
 * Visual Template Designer - GridSettings
 *
 * A compact toolbar for controlling grid, snap, ruler, and unit settings.
 * Uses only Tailwind + plain HTML — no external UI libraries.
 */

import React, { useState, useRef, useEffect } from 'react';

export interface GridSettingsProps {
  gridEnabled: boolean;
  gridSize: 5 | 10 | 20 | 25 | 50;
  snapEnabled: boolean;
  rulersVisible: boolean;
  unit: 'px' | 'mm' | 'in';
  onToggleGrid: () => void;
  onSetGridSize: (size: 5 | 10 | 20 | 25 | 50) => void;
  onToggleSnap: () => void;
  onToggleRulers: () => void;
  onSetUnit: (unit: 'px' | 'mm' | 'in') => void;
}

const GRID_SIZES = [5, 10, 20, 25, 50] as const;
const UNITS = ['px', 'mm', 'in'] as const;

/** Small toggle pill button. */
function ToggleButton({
  active,
  onClick,
  label,
  title,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={[
        'px-2 py-0.5 rounded text-xs font-medium border transition-colors',
        active
          ? 'bg-blue-500 border-blue-600 text-white'
          : 'bg-white border-gray-300 text-gray-600 hover:border-blue-300 hover:text-blue-600',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

/** Minimal inline select. */
function InlineSelect<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-1 text-xs text-gray-600">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="text-xs border border-gray-300 rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}

export function GridSettings({
  gridEnabled,
  gridSize,
  snapEnabled,
  rulersVisible,
  unit,
  onToggleGrid,
  onSetGridSize,
  onToggleSnap,
  onToggleRulers,
  onSetUnit,
}: GridSettingsProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    if (!popoverOpen) return;
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [popoverOpen]);

  return (
    <div ref={containerRef} className="relative inline-flex items-center gap-1">
      {/* Quick-access toggles always visible in the toolbar */}
      <ToggleButton
        active={gridEnabled}
        onClick={onToggleGrid}
        label="Grid"
        title={gridEnabled ? 'Hide grid' : 'Show grid'}
      />
      <ToggleButton
        active={snapEnabled}
        onClick={onToggleSnap}
        label="Snap"
        title={snapEnabled ? 'Disable snap to grid' : 'Enable snap to grid'}
      />
      <ToggleButton
        active={rulersVisible}
        onClick={onToggleRulers}
        label="Rulers"
        title={rulersVisible ? 'Hide rulers' : 'Show rulers'}
      />

      {/* Gear button to open detailed popover */}
      <button
        type="button"
        onClick={() => setPopoverOpen((o) => !o)}
        title="Grid & ruler settings"
        aria-expanded={popoverOpen}
        className="px-1.5 py-0.5 rounded border border-gray-300 bg-white text-gray-500 hover:text-blue-500 hover:border-blue-300 text-xs transition-colors"
      >
        ⚙
      </button>

      {/* Popover */}
      {popoverOpen && (
        <div
          className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded shadow-lg p-3 flex flex-col gap-3 min-w-max"
          role="dialog"
          aria-label="Grid settings"
        >
          {/* Grid size */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-gray-700">Grid size</span>
            <div className="flex gap-1">
              {GRID_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => onSetGridSize(size)}
                  className={[
                    'px-2 py-0.5 rounded text-xs border transition-colors',
                    gridSize === size
                      ? 'bg-blue-500 border-blue-600 text-white'
                      : 'bg-white border-gray-300 text-gray-600 hover:border-blue-300',
                  ].join(' ')}
                  aria-pressed={gridSize === size}
                >
                  {size}px
                </button>
              ))}
            </div>
          </div>

          {/* Unit selection */}
          <InlineSelect
            label="Unit"
            value={unit}
            options={UNITS}
            onChange={onSetUnit}
          />

          {/* Toggles repeated for convenience */}
          <div className="flex flex-col gap-1.5 border-t border-gray-100 pt-2">
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={gridEnabled}
                onChange={onToggleGrid}
                className="rounded"
              />
              Show grid
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={snapEnabled}
                onChange={onToggleSnap}
                className="rounded"
              />
              Snap to grid
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={rulersVisible}
                onChange={onToggleRulers}
                className="rounded"
              />
              Show rulers
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
