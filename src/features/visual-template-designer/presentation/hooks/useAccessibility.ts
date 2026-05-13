/**
 * Visual Template Designer - useAccessibility Hook
 *
 * Provides focus management utilities:
 * - announceToScreenReader: creates / reuses an aria-live region for announcements
 * - trapFocus: traps tab focus within a container element (for modals)
 * - releaseFocus: releases the currently active focus trap
 */

import { useCallback, useRef } from 'react';

// Singleton live region element so we don't flood the DOM
let liveRegion: HTMLElement | null = null;

function getLiveRegion(): HTMLElement {
  if (liveRegion && document.body.contains(liveRegion)) {
    return liveRegion;
  }
  liveRegion = document.createElement('div');
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.setAttribute('role', 'status');
  // Visually hidden but readable by screen readers
  Object.assign(liveRegion.style, {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0,0,0,0)',
    whiteSpace: 'nowrap',
    borderWidth: '0',
  });
  document.body.appendChild(liveRegion);
  return liveRegion;
}

// FOCUSABLE element selector used for tab-trap
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function useAccessibility() {
  // Ref to the cleanup function for the current trap listener
  const trapCleanupRef = useRef<(() => void) | null>(null);

  /**
   * Announce a message to screen readers via the aria-live region.
   * The message is briefly cleared and then reset so repeated identical
   * messages are also announced.
   */
  const announceToScreenReader = useCallback((message: string) => {
    const region = getLiveRegion();
    // Clear first so the same message triggers an announcement again
    region.textContent = '';
    // Use a microtask to ensure the DOM update is observed
    requestAnimationFrame(() => {
      region.textContent = message;
    });
  }, []);

  /**
   * Trap keyboard focus within the given container.
   * Pressing Tab / Shift+Tab will cycle within the container's focusable elements.
   * Pressing Escape triggers releaseFocus and returns focus to the previously
   * focused element.
   */
  const trapFocus = useCallback((containerRef: React.RefObject<HTMLElement>) => {
    // Release any previously active trap
    trapCleanupRef.current?.();

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const container = containerRef.current;
    if (!container) return;

    // Move initial focus to the first focusable element inside the container
    const firstFocusable = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    firstFocusable?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!container) return;

      const focusableElements = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => !el.closest('[aria-hidden="true"]'));

      if (focusableElements.length === 0) return;

      const firstEl = focusableElements[0];
      const lastEl = focusableElements[focusableElements.length - 1];

      if (e.key === 'Tab') {
        if (e.shiftKey) {
          // Shift + Tab: wrap backwards
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          // Tab: wrap forwards
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      } else if (e.key === 'Escape') {
        // Release trap on Escape
        cleanup();
        previouslyFocused?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    const cleanup = () => {
      document.removeEventListener('keydown', handleKeyDown);
      trapCleanupRef.current = null;
    };

    trapCleanupRef.current = cleanup;
  }, []);

  /**
   * Release the currently active focus trap (if any).
   */
  const releaseFocus = useCallback(() => {
    trapCleanupRef.current?.();
  }, []);

  return { announceToScreenReader, trapFocus, releaseFocus };
}
