/**
 * Shared PW shell (sidebar + main) styles for accountant, admin, and related layouts.
 * 1:1 Visual replica of the UGbased POS Sidebar design system.
 * Supports both the signature Light/White mode (#ffffff / #f8f8fb / #1f2430 / #8b5cf6)
 * and deep Obsidian Dark mode (#070B09 / #f1f5f9 / #a78bfa).
 */

export const POS_SIDEBAR_SHARED_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

  /* ── Dark Tokens (POS deep obsidian mode) ── */
  html.dark,
  [data-theme="dark"],
  body.dark {
    --pos-side-bg: rgba(10, 15, 29, 0.65);
    --pos-header-bg: rgba(10, 15, 29, 0.50);
    --pos-border: rgba(255, 255, 255, 0.12);
    --pos-border-subtle: rgba(255, 255, 255, 0.06);
    --pos-ink: #f1f5f9;
    --pos-ink-soft: #94a3b8;
    --pos-ink-faint: #475569;
    --pos-brand: #a78bfa;
    --pos-brand-purple: #8b5cf6;
    --pos-active-bg: rgba(139, 92, 246, 0.22);
    --pos-active-text: #ffffff;
    --pos-hover-bg: rgba(255, 255, 255, 0.055);
    --pos-select-border: rgba(255, 255, 255, 0.15);
    --pos-select-color: #c4b5fd;
    --pos-screen-bg: #070B09;
    --pos-field-bg: rgba(255, 255, 255, 0.05);
    --pos-card-bg: rgba(255, 255, 255, 0.04);

    /* Legacy mapping for components referencing --pw-* variables */
    --pw-bg: #070B09;
    --pw-s1: #070B09;
    --pw-s2: #0D1512;
    --pw-s3: #121C18;
    --pw-s4: #182620;
    --pw-t1: #f1f5f9;
    --pw-t2: #94a3b8;
    --pw-t3: #475569;
    --pw-border: rgba(255, 255, 255, 0.07);
    --pw-bh: rgba(255, 255, 255, 0.12);
    --pw-teal: #10d9a8;
    --pw-teal-s: rgba(16,217,168,0.10);
    --pw-teal-g: rgba(16,217,168,0.22);
    --pw-rose: #f75c5c;
    --pw-rose-s: rgba(247,92,92,0.10);
    --pw-amber: #f5a623;
    --pw-blue: #3d8ef8;
  }

  /* ── Light Tokens (POS signature White mode) ── */
  html.light,
  [data-theme="light"],
  :root:not(.dark) {
    --pos-side-bg: rgba(255, 255, 255, 0.75);
    --pos-header-bg: rgba(255, 255, 255, 0.60);
    --pos-border: rgba(255, 255, 255, 0.85);
    --pos-border-subtle: rgba(0, 0, 0, 0.05);
    --pos-ink: #1f2430;
    --pos-ink-soft: #6b7280;
    --pos-ink-faint: #9aa0ab;
    --pos-brand: #8b5cf6;
    --pos-brand-purple: #8b5cf6;
    --pos-active-bg: rgba(139, 92, 246, 0.12);
    --pos-active-text: #6d28d9;
    --pos-hover-bg: #f2f3f5;
    --pos-select-border: rgba(139, 92, 246, 0.3);
    --pos-select-color: #8b5cf6;
    --pos-screen-bg: #f7f9f7;
    --pos-field-bg: #ffffff;
    --pos-card-bg: #ffffff;

    /* Legacy mapping for components referencing --pw-* variables */
    --pw-bg: #f7f9f7;
    --pw-s1: #ffffff;
    --pw-s2: #f8f8fb;
    --pw-s3: #f2f3f5;
    --pw-s4: #d0dbe8;
    --pw-t1: #1f2430;
    --pw-t2: #6b7280;
    --pw-t3: #9aa0ab;
    --pw-border: #ececef;
    --pw-bh: rgba(0, 0, 0, 0.12);
    --pw-teal: #10b981;
    --pw-teal-s: rgba(16,185,129,0.10);
    --pw-teal-g: rgba(16,185,129,0.22);
    --pw-rose: #ef4444;
    --pw-rose-s: rgba(239,68,68,0.10);
    --pw-amber: #f59e0b;
    --pw-blue: #3b82f6;
  }

  /* ── Layout container ── */
  .pw-layout {
    display: flex;
    min-height: 100vh;
    height: 100vh;
    max-height: 100vh;
    overflow: hidden;
    background: var(--pos-screen-bg);
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  }

  /* ── Sidebar container (Apple Liquid Glass Rail) ── */
  .pw-sidebar {
    width: 220px !important;
    min-height: 100vh;
    height: 100vh;
    height: 100dvh;
    background: var(--pos-side-bg);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border-right: 1px solid var(--pos-border);
    box-shadow: 
      10px 0 35px -5px rgba(0, 0, 0, 0.38),
      inset -1px 0 1.5px rgba(255, 255, 255, 0.15);
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 200;
    overflow: hidden;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    user-select: none;
    transition: transform 0.24s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s, border-color 0.2s, box-shadow 0.2s;
  }

  /* Right edge specular reflection sheen (refractive glass edge) */
  .pw-sidebar::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 1.5px;
    background: linear-gradient(
      180deg,
      transparent 0%,
      rgba(255, 255, 255, 0.2) 15%,
      rgba(255, 255, 255, 0.8) 50%,
      rgba(255, 255, 255, 0.2) 85%,
      transparent 100%
    );
    pointer-events: none;
    z-index: 205;
  }

  html.light .pw-sidebar,
  [data-theme="light"] .pw-sidebar,
  :root:not(.dark) .pw-sidebar {
    box-shadow: 
      10px 0 30px -5px rgba(0, 0, 0, 0.07),
      inset -1px 0 1.5px rgba(255, 255, 255, 0.95) !important;
  }

  html.light .pw-sidebar::after,
  [data-theme="light"] .pw-sidebar::after,
  :root:not(.dark) .pw-sidebar::after {
    background: linear-gradient(
      180deg,
      transparent 0%,
      rgba(255, 255, 255, 0.6) 15%,
      rgba(255, 255, 255, 1) 50%,
      rgba(255, 255, 255, 0.6) 85%,
      transparent 100%
    ) !important;
  }

  /* Subtle 4px scrollbar matching POS Sidebar.tsx */
  .pw-sidebar::-webkit-scrollbar {
    width: 4px;
  }
  .pw-sidebar::-webkit-scrollbar-thumb {
    background: var(--pos-border);
    border-radius: 4px;
  }

  /* ── Brand header (1:1 POS replica) ── */
  .pw-brand {
    padding: 14px 16px;
    background: var(--pos-header-bg);
    border-bottom: 1px solid var(--pos-border);
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .pw-brand-name {
    font-size: 15px;
    font-weight: 800;
    color: var(--pos-brand);
    letter-spacing: 0.3px;
    line-height: 1.2;
    margin-bottom: 2px;
  }

  .pw-brand-subtitle {
    font-size: 11px;
    color: var(--pos-ink-soft);
    margin-bottom: 8px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.3;
  }

  .pw-brand-pill {
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.2px;
    color: var(--pos-select-color);
    border: 1px solid var(--pos-select-border);
    border-radius: 6px;
    padding: 3px 9px;
    display: inline-block;
    width: fit-content;
    user-select: none;
    line-height: 1.2;
  }

  /* ── Nav sections & labels ── */
  .pw-nav-scroll-area {
    flex: 1 1 0%;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 8px 0;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-y: contain;
  }

  .pw-nav-scroll-area::-webkit-scrollbar {
    width: 4px;
  }
  .pw-nav-scroll-area::-webkit-scrollbar-thumb {
    background: var(--pos-border);
    border-radius: 4px;
  }

  .pw-nav-section {
    margin-bottom: 4px;
  }

  .pw-nav-label {
    padding: 10px 16px 4px 16px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--pos-ink-faint);
    user-select: none;
    display: block;
    line-height: 1.2;
  }

  /* ── Nav links & buttons ── */
  .pw-nav-link {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 1.5px 8px;
    padding: 7px 10px;
    border-radius: 8px;
    text-decoration: none;
    font-size: 13.5px;
    font-weight: 500;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    cursor: pointer;
    background: transparent;
    color: var(--pos-ink);
    border: 1px solid transparent;
    box-sizing: border-box;
    width: calc(100% - 16px);
    transition: background 0.15s, color 0.15s;
  }

  .pw-nav-link:hover:not(.pw-nav-link--active) {
    background: var(--pos-hover-bg);
    color: var(--pos-ink);
  }

  .pw-nav-link:hover:not(.pw-nav-link--active) .pw-nav-ic,
  .pw-nav-link:hover:not(.pw-nav-link--active) svg {
    color: var(--pos-ink);
  }

  /* ── Selected / Active state (Apple Liquid Glass Capsule Pill) ── */
  .pw-nav-link--active,
  .pw-nav-link--active:hover {
    background: rgba(139, 92, 246, 0.22) !important;
    color: #ffffff !important;
    font-weight: 700 !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    border-top: 1px solid rgba(255, 255, 255, 0.45) !important;
    box-shadow: 
      0 4px 14px rgba(0, 0, 0, 0.2),
      inset 0 1px 1.5px rgba(255, 255, 255, 0.35),
      0 0 18px rgba(139, 92, 246, 0.22) !important;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  .pw-nav-link--active .pw-nav-ic,
  .pw-nav-link--active .pw-nav-ic svg,
  .pw-nav-link--active svg {
    color: #ffffff !important;
    filter: drop-shadow(0 2px 8px rgba(139, 92, 246, 0.6));
  }

  html.light .pw-nav-link--active,
  [data-theme="light"] .pw-nav-link--active,
  :root:not(.dark) .pw-nav-link--active {
    background: rgba(139, 92, 246, 0.12) !important;
    color: #6d28d9 !important;
    border: 1px solid rgba(139, 92, 246, 0.25) !important;
    border-top: 1px solid rgba(255, 255, 255, 0.95) !important;
    box-shadow: 
      0 4px 12px rgba(139, 92, 246, 0.12),
      inset 0 1.5px 2px rgba(255, 255, 255, 0.95),
      0 0 14px rgba(139, 92, 246, 0.15) !important;
  }

  html.light .pw-nav-link--active .pw-nav-ic,
  html.light .pw-nav-link--active .pw-nav-ic svg,
  html.light .pw-nav-link--active svg {
    color: #6d28d9 !important;
    filter: drop-shadow(0 2px 6px rgba(124, 58, 237, 0.35));
  }

  .pw-nav-link--active .pw-nav-badge {
    background: rgba(255, 255, 255, 0.25) !important;
    color: #ffffff !important;
  }

  /* ── Icons ── */
  .pw-nav-ic {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    color: var(--pos-ink-soft);
    transition: color 0.15s;
  }

  .pw-nav-ic svg {
    width: 17px;
    height: 17px;
    stroke-width: 1.8;
  }

  .pw-nav-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    text-align: left;
  }

  /* ── Badges ── */
  .pw-nav-badge {
    margin-left: auto;
    font-size: 10px;
    font-weight: 700;
    border-radius: 99px;
    padding: 1px 6px;
    line-height: 1.4;
    flex-shrink: 0;
  }
  .pw-nav-badge--rose  { background: #ef4444; color: #ffffff; }
  .pw-nav-badge--teal  { background: #10b981; color: #ffffff; }
  .pw-nav-badge--amber { background: #f59e0b; color: #ffffff; }

  /* ── Group accordion & Sub-items ── */
  .pw-nav-group-btn {
    width: calc(100% - 16px);
    text-align: left;
  }

  .pw-nav-chevron {
    margin-left: auto;
    font-size: 14px;
    color: var(--pos-ink-faint);
    transition: transform 0.2s;
    display: inline-block;
    line-height: 1;
  }

  .pw-nav-chevron--open {
    transform: rotate(90deg);
  }

  .pw-nav-subitems {
    padding: 2px 0 3px 0;
  }

  .pw-nav-subitem {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 1px 8px 1px 22px;
    padding: 6px 10px;
    border-radius: 7px;
    text-decoration: none;
    font-size: 12.5px;
    font-weight: 500;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    color: var(--pos-ink-soft);
    background: transparent;
    transition: background 0.14s, color 0.14s;
    box-sizing: border-box;
    width: calc(100% - 30px);
  }

  .pw-nav-subitem:hover:not(.pw-nav-subitem--active) {
    background: var(--pos-hover-bg);
    color: var(--pos-ink);
  }

  .pw-nav-subitem--active {
    background: rgba(139, 92, 246, 0.12) !important;
    color: var(--pos-brand) !important;
    font-weight: 700 !important;
  }

  html.dark .pw-nav-subitem--active,
  [data-theme="dark"] .pw-nav-subitem--active {
    background: rgba(139, 92, 246, 0.24) !important;
    color: #c4b5fd !important;
  }

  .pw-nav-sub-dot {
    font-size: 15px;
    color: var(--pos-ink-faint);
    line-height: 1;
  }

  .pw-nav-subitem--active .pw-nav-sub-dot {
    color: var(--pos-brand);
  }

  .pw-nav-subitem--hidden {
    display: none !important;
  }

  /* ── Sidebar footer (POS 1:1 replica pinned footer) ── */
  .pw-sidebar-bottom {
    border-top: 1px solid var(--pos-border);
    padding: 8px 8px calc(8px + env(safe-area-inset-bottom, 0px)) 8px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    background: var(--pos-side-bg);
  }

  .pw-admin-card {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 6px 8px;
    border-radius: 8px;
    background: transparent;
    border: 1px solid transparent;
    cursor: pointer;
    transition: background 0.15s;
    margin-bottom: 2px;
  }

  .pw-admin-card:hover {
    background: var(--pos-hover-bg);
  }

  .pw-admin-av {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: linear-gradient(135deg, #8b5cf6, #22c9dd);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 800;
    color: #ffffff;
    flex-shrink: 0;
  }

  .pw-admin-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--pos-ink);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .pw-admin-role {
    font-size: 10.5px;
    color: var(--pos-ink-soft);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .pw-footer-action,
  .pw-logout-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 10px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    color: var(--pos-ink-soft);
    background: transparent;
    border: none;
    text-decoration: none;
    width: 100%;
    box-sizing: border-box;
    transition: background 0.15s, color 0.15s;
  }

  .pw-footer-action:hover,
  .pw-logout-btn:hover {
    background: var(--pos-hover-bg);
    color: var(--pos-ink);
  }

  .pw-footer-action svg,
  .pw-logout-btn svg {
    color: var(--pos-ink-faint);
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    transition: color 0.15s;
  }

  .pw-footer-action:hover svg,
  .pw-logout-btn:hover svg {
    color: var(--pos-ink);
  }

  .pw-logout-btn {
    margin-top: 2px;
    color: #ef4444;
  }
  .pw-logout-btn:hover {
    background: rgba(239, 68, 68, 0.08);
    color: #ef4444;
  }
  .pw-logout-btn svg {
    color: #ef4444;
  }

  /* ── Sidebar tools (Theme toggle, Search, Notification buttons) ── */
  .pw-sidebar-tools {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    flex-shrink: 0;
    margin-top: auto;
    background: var(--pos-side-bg);
  }

  .pw-sidebar-tools button {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 6px 8px;
    border-radius: 8px;
    border: 1px solid var(--pos-border);
    background: var(--pos-card-bg);
    color: var(--pos-ink-soft);
    cursor: pointer;
    font-size: 12px;
    font-family: inherit;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
  }

  .pw-sidebar-tools button:hover {
    background: var(--pos-hover-bg);
    color: var(--pos-ink);
    border-color: var(--pos-border);
  }

  /* ── Search modal & backdrop ── */
  .pw-search-backdrop {
    position: fixed;
    inset: 0;
    z-index: 400;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 72px 16px 18px;
  }

  .pw-search-panel {
    width: 100%;
    max-width: 440px;
    background: var(--pos-side-bg);
    border: 1px solid var(--pos-border);
    border-radius: 12px;
    padding: 14px;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
  }

  .pw-search-panel input {
    width: 100%;
    padding: 10px 12px 10px 38px;
    border-radius: 8px;
    border: 1px solid var(--pos-border);
    background: var(--pos-field-bg);
    color: var(--pos-ink);
    font-size: 13px;
    font-family: inherit;
    box-sizing: border-box;
  }

  .pw-search-panel input::placeholder {
    color: var(--pos-ink-faint);
  }

  .pw-search-panel input:focus {
    outline: none;
    border-color: var(--pos-brand);
    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.16);
  }

  .pw-search-results {
    margin-top: 10px;
    max-height: 260px;
    overflow-y: auto;
    border-radius: 8px;
    border: 1px solid var(--pos-border);
    background: var(--pos-side-bg);
  }

  /* ── Main content scroll area ── */
  .pw-main {
    margin-left: 220px;
    width: calc(100% - 220px);
    flex: 1;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
    background: var(--pos-screen-bg);
    color: var(--pos-ink);
    transition: background 0.2s, color 0.2s;
  }

  .pw-main.pw-main--chat {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 0;
  }

  .pw-main.pw-main--chat > .pw-back-bar {
    flex: 0 0 auto !important;
    height: auto !important;
  }

  .pw-main.pw-main--chat > *:not(.pw-back-bar) {
    flex: 1 1 0%;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  /* Legacy accountant glass fallback tokens */
  html.light .pw-main,
  :root:not(.dark) .pw-main {
    --ac-cpu-white: #ffffff;
    --ac-page-bg: #f8fafc;
    --ac-card-bg: #ffffff;
    --ac-card-bg-fallback: #ffffff;
    --ac-text-primary: #0f172a;
    --ac-text-secondary: #475569;
    --ac-text-muted: #64748b;
    --ac-border: #e2e8f0;
    --ac-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 4px 12px -2px rgba(0, 0, 0, 0.04);
    --ac-shadow-strong: 0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 10px 20px -5px rgba(0, 0, 0, 0.08);
    --ac-chart-grid: #e2e8f0;
    --ac-chart-axis: #64748b;
    --ac-chart-ref-line: #94a3b8;
    --ac-accent-blue: #2563eb;
    --ac-accent-green: #059669;
    --ac-accent-orange: #d97706;
    --ac-accent-teal: #0d9488;
    --ac-sidebar-active-bg: rgba(0, 0, 0, 0.04);
  }

  html.light .pw-main .ac-input,
  :root:not(.dark) .pw-main .ac-input {
    background-color: #ffffff;
    border-color: #cbd5e1;
    color: #0f172a;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.04);
  }

  html.light .pw-main .ac-glass-card,
  :root:not(.dark) .pw-main .ac-glass-card {
    background: #ffffff;
    border-color: #e2e8f0;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 4px 16px -2px rgba(15, 23, 42, 0.06);
  }

  html.dark .pw-main {
    --ac-cpu-white: #F0F0F0;
    --ac-page-bg: transparent;
    --ac-card-bg: rgba(255, 255, 255, 0.06);
    --ac-card-bg-fallback: rgba(13, 21, 18, 0.92);
    --ac-text-primary: #f8fafc;
    --ac-text-secondary: rgba(248, 250, 252, 0.9);
    --ac-text-muted: rgba(226, 232, 240, 0.75);
    --ac-border: rgba(255, 255, 255, 0.12);
    --ac-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.35);
    --ac-shadow-strong: 0 12px 40px 0 rgba(0, 0, 0, 0.45);
    --ac-chart-grid: rgba(255, 255, 255, 0.08);
    --ac-chart-axis: rgba(255, 255, 255, 0.65);
    --ac-chart-ref-line: rgba(255, 255, 255, 0.35);
    --ac-accent-blue: #60a5fa;
    --ac-accent-green: #34d399;
    --ac-accent-orange: #fbbf24;
    --ac-accent-teal: #2dd4bf;
    --ac-sidebar-active-bg: rgba(255, 255, 255, 0.08);
  }

  /* ── Responsive Mobile Drawer & Hamburger (< 769px) ── */
  .pw-sidebar-overlay {
    display: none;
  }

  .pw-hamburger {
    display: none;
    position: fixed;
    top: calc(env(safe-area-inset-top, 0px) + 8px);
    right: calc(10px + env(safe-area-inset-right, 0px));
    z-index: 300;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: var(--pos-side-bg);
    border: 1px solid var(--pos-border);
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 16px;
    color: var(--pos-ink);
    transition: border-color 0.14s, background 0.14s;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  @media (max-width: 768px) {
    .pw-hamburger {
      display: flex;
    }

    .pw-sidebar {
      width: 250px !important;
      max-width: 85vw !important;
      height: 100vh !important;
      height: 100dvh !important;
      min-height: 100dvh !important;
      max-height: 100dvh !important;
      transform: translateX(-100%);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
      padding-bottom: 0 !important;
      overflow: hidden !important;
      display: flex !important;
      flex-direction: column !important;
      top: 0 !important;
      bottom: 0 !important;
      left: 0 !important;
    }

    .pw-sidebar.pw-sidebar--open {
      transform: translateX(0);
    }

    .pw-sidebar .pw-nav-scroll-area {
      flex: 1 1 0% !important;
      min-height: 0 !important;
      height: auto !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
      -webkit-overflow-scrolling: touch !important;
      overscroll-behavior-y: contain !important;
    }

    .pw-sidebar-tools {
      margin-top: auto !important;
      flex-shrink: 0 !important;
      background: var(--pos-side-bg) !important;
    }

    .pw-sidebar-bottom {
      flex-shrink: 0 !important;
      background: var(--pos-side-bg) !important;
      padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px)) !important;
    }

    .pw-sidebar-overlay {
      display: block;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(3px);
      z-index: 199;
    }

    .pw-main {
      margin-left: 0 !important;
      width: 100% !important;
      -webkit-overflow-scrolling: touch;
    }
  }

  @media (min-width: 769px) {
    .pw-main.pw-main--settings-split {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .pw-main.pw-main--settings-split > * {
      flex: 1 1 0%;
      min-height: 0;
      min-width: 0;
    }
  }

  html.dark .pw-main table,
  html.dark .pw-main th,
  html.dark .pw-main td { color: #f8fafc; }
  html.light .pw-main table,
  html.light .pw-main th,
  html.light .pw-main td { color: #0d1c2e; }

  html.dark .pw-main select,
  html.dark select,
  html.dark select.ac-input {
    color-scheme: dark !important;
    background-color: #070B09 !important;
    color: #f8fafc !important;
    border-color: rgba(255, 255, 255, 0.15) !important;
  }

  html.dark .pw-main select option,
  html.dark select option,
  html.dark select.ac-input option,
  html.dark .ac-input option {
    background-color: #070B09 !important;
    color: #f8fafc !important;
  }

  html.light .pw-main select,
  html.light select {
    color-scheme: light !important;
    background-color: #ffffff !important;
    color: #0f172a !important;
    border-color: #cbd5e1 !important;
  }

  html.light .pw-main select option,
  html.light select option {
    background-color: #ffffff !important;
    color: #0f172a !important;
  }
`;

export const ACCOUNTANT_PW_SHELL_CSS = POS_SIDEBAR_SHARED_CSS;
