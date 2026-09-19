/**
 * Visual Template Designer - Accessibility Integration Tests
 *
 * Tests:
 * - All interactive elements have aria-label or aria-labelledby
 * - Focus indicators are visible (CSS class checks)
 * - Screen reader announcements work (aria-live)
 * - Color contrast check function returns true for 4.5:1 ratio
 */

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AccessibleButton } from '../../presentation/components/AccessibleButton';
import { ErrorToast } from '../../presentation/components/ErrorToast';

// ---------------------------------------------------------------------------
// Utility — color contrast calculation
// ---------------------------------------------------------------------------

/**
 * Parse a hex color string (#rrggbb or #rgb) into [r, g, b] in [0, 1].
 */
function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  return [r, g, b];
}

/**
 * Convert a linear RGB channel to its luminance contribution.
 * Uses the WCAG 2.x formula.
 */
function linearize(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Calculate the relative luminance of a hex color.
 */
function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map(linearize);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate the WCAG 2.x contrast ratio between two hex colors.
 * Returns a value between 1 (no contrast) and 21 (black on white).
 */
export function checkColorContrast(foreground: string, background: string): number {
  const lumFg = relativeLuminance(foreground);
  const lumBg = relativeLuminance(background);
  const lighter = Math.max(lumFg, lumBg);
  const darker = Math.min(lumFg, lumBg);
  return (lighter + 0.05) / (darker + 0.05);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Accessibility — checkColorContrast utility', () => {
  it('returns ≥ 4.5 for black text on white background (21:1)', () => {
    const ratio = checkColorContrast('#000000', '#ffffff');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('returns ≥ 4.5 for dark navy on white (common heading combo)', () => {
    const ratio = checkColorContrast('#1e3a5f', '#ffffff');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('returns < 4.5 for light gray text on white (poor contrast)', () => {
    // #aaaaaa on #ffffff is approximately 2.32:1
    const ratio = checkColorContrast('#aaaaaa', '#ffffff');
    expect(ratio).toBeLessThan(4.5);
  });

  it('is symmetric — swapping fg/bg returns the same ratio', () => {
    const ratio1 = checkColorContrast('#000000', '#ffffff');
    const ratio2 = checkColorContrast('#ffffff', '#000000');
    expect(ratio1).toBeCloseTo(ratio2, 5);
  });

  it('returns 1 for identical colors (no contrast)', () => {
    const ratio = checkColorContrast('#336699', '#336699');
    expect(ratio).toBeCloseTo(1, 5);
  });
});

describe('Accessibility — AccessibleButton', () => {
  it('renders with aria-label', () => {
    render(<AccessibleButton label="Save template">Save</AccessibleButton>);
    const btn = screen.getByRole('button', { name: 'Save template' });
    expect(btn).toBeTruthy();
    expect(btn.getAttribute('aria-label')).toBe('Save template');
  });

  it('shows keyboard shortcut in title attribute', () => {
    render(
      <AccessibleButton label="Undo" shortcut="Ctrl+Z">
        Undo
      </AccessibleButton>,
    );
    const btn = screen.getByRole('button', { name: 'Undo' });
    expect(btn.getAttribute('title')).toBe('Undo (Ctrl+Z)');
  });

  it('applies focus-visible ring class for visible focus indicator', () => {
    render(<AccessibleButton label="Test button">Test</AccessibleButton>);
    const btn = screen.getByRole('button', { name: 'Test button' });
    // Tailwind class that enables the focus ring
    expect(btn.className).toContain('focus-visible:ring-2');
  });

  it('activates onClick when Enter key is pressed', () => {
    const handleClick = vi.fn();
    render(
      <AccessibleButton label="Action" onClick={handleClick}>
        Action
      </AccessibleButton>,
    );
    const btn = screen.getByRole('button', { name: 'Action' });
    fireEvent.keyDown(btn, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('activates onClick when Space key is pressed', () => {
    const handleClick = vi.fn();
    render(
      <AccessibleButton label="Action" onClick={handleClick}>
        Action
      </AccessibleButton>,
    );
    const btn = screen.getByRole('button', { name: 'Action' });
    fireEvent.keyDown(btn, { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not activate onClick when disabled and Enter is pressed', () => {
    const handleClick = vi.fn();
    render(
      <AccessibleButton label="Disabled" disabled onClick={handleClick}>
        Disabled
      </AccessibleButton>,
    );
    const btn = screen.getByRole('button', { name: 'Disabled' });
    fireEvent.keyDown(btn, { key: 'Enter' });
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders icon with aria-hidden', () => {
    const icon = <span data-testid="icon">*</span>;
    render(
      <AccessibleButton label="With icon" icon={icon}>
        Label
      </AccessibleButton>,
    );
    // The wrapper span should be aria-hidden (use parentElement, not closest('span')
    // which would return the icon element itself since it's also a span)
    const iconWrapper = screen.getByTestId('icon').parentElement;
    expect(iconWrapper?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('Accessibility — aria-live / screen reader announcements', () => {
  it('ErrorToast renders with role="alert" and aria-live="assertive"', () => {
    const onDismiss = vi.fn();
    render(
      <ErrorToast message="An error occurred" type="error" onDismiss={onDismiss} autoHide={false} />,
    );
    const alert = screen.getByRole('alert');
    expect(alert).toBeTruthy();
    expect(alert.getAttribute('aria-live')).toBe('assertive');
    expect(alert.getAttribute('aria-atomic')).toBe('true');
  });

  it('ErrorToast dismiss button has aria-label', () => {
    const onDismiss = vi.fn();
    render(
      <ErrorToast message="Warning!" type="warning" onDismiss={onDismiss} autoHide={false} />,
    );
    const dismissBtn = screen.getByRole('button', { name: 'Dismiss notification' });
    expect(dismissBtn).toBeTruthy();
  });

  it('ErrorToast calls onDismiss when dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    render(
      <ErrorToast message="Info" type="info" onDismiss={onDismiss} autoHide={false} />,
    );
    const dismissBtn = screen.getByRole('button', { name: 'Dismiss notification' });
    fireEvent.click(dismissBtn);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('ErrorToast auto-hides after 5 seconds', async () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(
      <ErrorToast message="Auto-hide" type="success" onDismiss={onDismiss} autoHide={true} />,
    );
    expect(onDismiss).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});

describe('Accessibility — focus indicators', () => {
  it('AccessibleButton has focus-visible Tailwind classes', () => {
    render(<AccessibleButton label="Focused button">Click</AccessibleButton>);
    const btn = screen.getByRole('button', { name: 'Focused button' });
    // Tailwind focus-visible utilities are present in className
    expect(btn.className).toContain('focus-visible:ring-2');
    expect(btn.className).toContain('focus-visible:ring-blue-500');
  });

  it('AccessibleButton has outlineOffset style for custom focus ring', () => {
    render(<AccessibleButton label="Test">T</AccessibleButton>);
    const btn = screen.getByRole('button', { name: 'Test' });
    expect(btn.style.outlineOffset).toBe('2px');
  });
});
