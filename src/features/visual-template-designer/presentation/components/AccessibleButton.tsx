/**
 * Visual Template Designer - AccessibleButton
 *
 * A button wrapper that ensures full accessibility compliance:
 * - aria-label for screen readers
 * - role="button" for semantic clarity
 * - visible focus ring (2px solid blue)
 * - keyboard activation (Enter / Space)
 */

import React, { useCallback } from 'react';

export interface AccessibleButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required aria-label text for screen readers */
  label: string;
  /** Optional icon element rendered before children */
  icon?: React.ReactNode;
  /** Optional children rendered inside the button */
  children?: React.ReactNode;
  /** Keyboard shortcut hint shown as a tooltip title suffix */
  shortcut?: string;
}

export function AccessibleButton({
  label,
  icon,
  children,
  shortcut,
  onClick,
  onKeyDown,
  className = '',
  style,
  disabled,
  ...rest
}: AccessibleButtonProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      // Activate on Enter or Space (browsers do this natively for <button>,
      // but we also forward to any custom onKeyDown handler)
      if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
        e.preventDefault();
        onClick?.(e as unknown as React.MouseEvent<HTMLButtonElement>);
      }
      onKeyDown?.(e);
    },
    [disabled, onClick, onKeyDown],
  );

  const titleText = shortcut ? `${label} (${shortcut})` : label;

  return (
    <button
      {...rest}
      role="button"
      aria-label={label}
      title={titleText}
      disabled={disabled}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={[
        'inline-flex items-center gap-1 rounded px-2 py-1 text-sm transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        // Ensure focus ring is always visible even without Tailwind utilities
        outlineOffset: 2,
        ...style,
      }}
    >
      {icon && <span aria-hidden="true" className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
}

export default AccessibleButton;
