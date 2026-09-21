import React from 'react';

/**
 * 1. Semicircle Radial Gauge (Pure SVG - No heavy chart libraries needed)
 * @param value Number between 0 and 1 (e.g. 0.75 for 75%)
 */
export function SemicircleGauge({
  value,
  size = 90,
  strokeWidth = 7,
  activeColor = '#10b981', // Mint / Emerald matching PwezaCore
  trackColor = '#e5e7eb',  // Gray track (use #1f2937 or rgba in dark mode)
  showValue = true,
  valueSuffix = '%',
  className = '',
}: {
  value: number | null;
  size?: number;
  strokeWidth?: number;
  activeColor?: string;
  trackColor?: string;
  showValue?: boolean;
  valueSuffix?: string;
  className?: string;
}) {
  const radius = size / 2 - 6;
  const circumference = Math.PI * radius;
  const ratio = value === null ? 0 : Math.min(Math.max(value, 0), 1);

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <svg width={size} height={size / 2 + 8} viewBox={`0 0 ${size} ${size / 2 + 8}`} className="overflow-visible">
        {/* Background track */}
        <path
          d={`M 6 ${size / 2 + 2} A ${radius} ${radius} 0 0 1 ${size - 6} ${size / 2 + 2}`}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Active progress arc */}
        <path
          d={`M 6 ${size / 2 + 2} A ${radius} ${radius} 0 0 1 ${size - 6} ${size / 2 + 2}`}
          fill="none"
          stroke={activeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference * ratio} ${circumference}`}
          style={{
            transition: 'stroke-dasharray 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </svg>
      {/* Centered value */}
      {showValue && (
        <div className="-mt-4 text-center">
          <span className="text-base font-extrabold tabular-nums tracking-tight text-slate-800 dark:text-slate-100" style={{ fontFamily: "'Sora', sans-serif" }}>
            {value === null ? '0%' : `${Math.round(ratio * 100)}${valueSuffix}`}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * 2. Dual Split Ratio Bar
 * Visualizes a proportional split between two values (e.g. Collected vs Outstanding)
 */
export function SplitRatioBar({
  primaryValue,
  secondaryValue,
  primaryColor = '#10b981', // bg-emerald-500
  secondaryColor = '#f43f5e', // bg-rose-500
  trackBg,
  height = 8,
  showLegend = false,
  legendPrimaryLabel = 'collected',
  legendSecondaryLabel = 'pending',
  formatValue = (val) => val.toLocaleString('en-US'),
  className = '',
}: {
  primaryValue: number;
  secondaryValue: number;
  primaryColor?: string;
  secondaryColor?: string;
  trackBg?: string;
  height?: number;
  showLegend?: boolean;
  legendPrimaryLabel?: string;
  legendSecondaryLabel?: string;
  formatValue?: (val: number) => string;
  className?: string;
}) {
  const total = Math.max(0, primaryValue) + Math.max(0, secondaryValue);
  const primaryPercent = total > 0 ? Math.min(100, Math.max(0, (primaryValue / total) * 100)) : 50;
  const secondaryPercent = 100 - primaryPercent;

  const isTailwindPrimary = primaryColor.startsWith('bg-');
  const isTailwindSecondary = secondaryColor.startsWith('bg-');

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`}>
      <div
        className="flex w-full gap-1 overflow-hidden rounded-full p-0.5 bg-slate-100 dark:bg-slate-800/80"
        style={{
          height: `${height}px`,
          backgroundColor: trackBg,
        }}
      >
        <span
          className={`h-full rounded-full transition-all duration-500 ${isTailwindPrimary ? primaryColor : ''}`}
          style={{
            width: `${primaryPercent.toFixed(1)}%`,
            backgroundColor: isTailwindPrimary ? undefined : primaryColor,
          }}
        />
        <span
          className={`h-full flex-1 rounded-full ${isTailwindSecondary ? secondaryColor : ''}`}
          style={{
            backgroundColor: isTailwindSecondary ? undefined : secondaryColor,
          }}
        />
      </div>

      {showLegend && (
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full inline-block flex-shrink-0"
              style={{ backgroundColor: isTailwindPrimary ? undefined : primaryColor }}
            />
            <span>
              +{formatValue(primaryValue)} {legendPrimaryLabel} ({primaryPercent.toFixed(0)}%)
            </span>
          </span>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full inline-block flex-shrink-0"
              style={{ backgroundColor: isTailwindSecondary ? undefined : secondaryColor }}
            />
            <span>
              {formatValue(secondaryValue)} {legendSecondaryLabel} ({secondaryPercent.toFixed(0)}%)
            </span>
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * 3. Attendance Gauge Card Content
 * Ready-to-use composite for attendance breakdown with radial arc on left and vertical counts on right
 */
export function AttendanceGaugeBreakdown({
  presentCount,
  absentCount,
  savedCount,
  totalStudents,
  trackColor,
  activeColor = '#10b981',
}: {
  presentCount: number;
  absentCount: number;
  savedCount: number;
  totalStudents: number;
  trackColor?: string;
  activeColor?: string;
}) {
  const percent = totalStudents > 0 ? presentCount / totalStudents : 0;

  return (
    <div className="flex items-center justify-between gap-3 w-full py-1">
      {/* Semicircle Gauge */}
      <div className="flex-shrink-0">
        <SemicircleGauge
          value={percent}
          size={84}
          strokeWidth={6.5}
          activeColor={activeColor}
          trackColor={trackColor}
        />
      </div>

      {/* Vertical Breakdown on the right */}
      <div className="flex flex-col gap-1.5 flex-1 min-w-0 pr-1">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
          <span className="font-extrabold tabular-nums font-mono text-[13px]" style={{ fontFamily: "'Sora', sans-serif" }}>
            {presentCount.toLocaleString()}
          </span>
          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">Present</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
          <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
          <span className="font-extrabold tabular-nums font-mono text-[13px]" style={{ fontFamily: "'Sora', sans-serif" }}>
            {absentCount.toLocaleString()}
          </span>
          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">Absent</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
          <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
          <span className="font-extrabold tabular-nums font-mono text-[13px]" style={{ fontFamily: "'Sora', sans-serif" }}>
            {savedCount.toLocaleString()}
          </span>
          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">Recorded</span>
        </div>
      </div>
    </div>
  );
}
