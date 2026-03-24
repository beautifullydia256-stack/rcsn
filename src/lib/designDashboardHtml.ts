import { type RefObject, useEffect } from 'react';
import type { NavigateFunction } from 'react-router-dom';

/** Extract `<style>` and `<body>` from a full HTML design file (Vite `?raw`). */
export function extractStyleAndBody(raw: string) {
  const styleMatch = raw.match(/<style>([\s\S]*?)<\/style>/i);
  const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return {
    style: styleMatch?.[1] ?? '',
    body: bodyMatch?.[1]?.trim() ?? '',
  };
}

/**
 * Event delegation for `[data-nav]` — survives innerHTML updates (unlike per-element listeners).
 */
export function useDesignDashboardNav(
  containerRef: RefObject<HTMLElement | null>,
  navigate: NavigateFunction,
  enabled: boolean
) {
  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      const t = (e.target as HTMLElement).closest('[data-nav]');
      if (!t || !el.contains(t)) return;
      const path = t.getAttribute('data-nav');
      if (!path) return;
      e.preventDefault();
      navigate(path);
    };
    el.addEventListener('click', handler);
    return () => el.removeEventListener('click', handler);
  }, [containerRef, navigate, enabled]);
}

/**
 * Design HTML uses `html.light .pw-*` for light theme. Keep `light` in sync with app dark mode.
 */
export function useDesignDashboardThemeSync(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const sync = () => {
      const root = document.documentElement;
      const isDark = root.classList.contains('dark') || root.getAttribute('data-theme') === 'dark';
      root.classList.toggle('light', !isDark);
    };
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    return () => obs.disconnect();
  }, [enabled]);
}

/**
 * Teacher design HTML should stay on dark tokens only (no `html.light`), matching the PW shell.
 */
export function useDesignDashboardDarkOnly(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    const enforce = () => {
      root.classList.remove('light');
      if (!root.classList.contains('dark')) root.classList.add('dark');
    };
    enforce();
    const obs = new MutationObserver(enforce);
    obs.observe(root, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    return () => obs.disconnect();
  }, [enabled]);
}
