import React from 'react';

interface GovRollingBoxProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  tone?: 'dark' | 'emerald' | 'amber';
  className?: string;
}

const SIZE_MAP = {
  xs: 'w-3.5 h-3.5 border-[1.5px]',
  sm: 'w-5 h-5 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-[2.5px]',
  xl: 'w-16 h-16 border-[3px]',
};

/**
 * Signature Institutional Rolling Box:
 * 3 sides crisp black (#111111), and 1 side vibrant Ugandan green (#16a34a).
 * Smoothly spinning box with subtly rounded corners.
 */
const TONE_MAP = {
  dark: 'border-[#111111] border-t-[#16a34a]',
  emerald: 'border-[#111111] border-t-[#16a34a]',
  amber: 'border-[#111111] border-t-[#16a34a]',
};

export function GovRollingBox({
  size = 'md',
  tone = 'dark',
  className = '',
}: GovRollingBoxProps) {
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;
  const toneClass = TONE_MAP[tone] || TONE_MAP.dark;

  return (
    <div
      role="status"
      aria-label="Loading"
      className={`inline-block rounded-md animate-spin shrink-0 ${sizeClass} ${toneClass} ${className}`}
    />
  );
}

/**
 * Full page / container centered loader featuring the Rolling Box.
 * Pure icon animation with NO text or explanations.
 */
export function GovPageLoader({
  minHeight = 'min-h-[40vh]',
  size = 'lg',
}: {
  message?: string;
  minHeight?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}) {
  return (
    <div className={`flex items-center justify-center ${minHeight} py-12 w-full`}>
      <GovRollingBox size={size} tone="dark" />
    </div>
  );
}

/**
 * High-density data grid / table row loader featuring the Rolling Box.
 * Pure icon animation with NO text or explanations.
 */
export function GovTableLoader({
  colSpan,
  py = 'py-12',
}: {
  colSpan: number;
  message?: string;
  py?: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className={`text-center ${py}`}>
        <div className="flex items-center justify-center">
          <GovRollingBox size="md" tone="dark" />
        </div>
      </td>
    </tr>
  );
}

/**
 * Compact inline loader for cards, headers, or buttons.
 */
export function GovInlineLoader({
  size = 'sm',
  tone = 'dark',
}: {
  size?: 'xs' | 'sm' | 'md';
  tone?: 'dark' | 'emerald' | 'amber';
}) {
  return <GovRollingBox size={size} tone={tone} />;
}

export default GovRollingBox;
