/**
 * Shared PW shell (sidebar + main) styles for accountant, teacher (Primary), and similar layouts.
 * Scoped under `.accountant-glass`.
 */
export const ACCOUNTANT_PW_SHELL_CSS = `
  .accountant-glass.pw-layout[data-theme="dark"] {
    --pw-bg: #05080f;
    --pw-s1: #0b1120;
    --pw-s2: #101828;
    --pw-s3: #141c2e;
    --pw-s4: #1d2d4e;
    --pw-t1: #eef3ff;
    --pw-t2: #8296be;
    --pw-t3: #3d5278;
    --pw-border: rgba(255,255,255,0.07);
    --pw-bh: rgba(255,255,255,0.12);
  }
  .accountant-glass.pw-layout[data-theme="light"] {
    --pw-bg: #f0f4f8;
    --pw-s1: #ffffff;
    --pw-s2: #f5f7fa;
    --pw-s3: #e8edf5;
    --pw-s4: #d0dbe8;
    --pw-t1: #0d1c2e;
    --pw-t2: #4a6080;
    --pw-t3: #8aa0b8;
    --pw-border: rgba(0,0,0,0.08);
    --pw-bh: rgba(0,0,0,0.14);
  }
  .accountant-glass.pw-layout {
    display: flex;
    min-height: 100vh;
    height: 100vh;
    max-height: 100vh;
    overflow: hidden;
    background: var(--pw-bg, #05080f);
    font-family: 'Instrument Sans', 'Cabinet Grotesk', system-ui, sans-serif;
  }
  .accountant-glass .pw-sidebar {
    width: var(--pw-sidebar-width, 232px);
    min-height: 100vh;
    background: var(--pw-s1, #0b1120);
    border-right: 1px solid var(--pw-border, rgba(255,255,255,0.07));
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0; left: 0; bottom: 0;
    z-index: 200;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
    -ms-overflow-style: none;
    transition: transform 0.28s cubic-bezier(.4,0,.2,1);
  }
  .accountant-glass .pw-sidebar::-webkit-scrollbar { width: 0; height: 0; display: none; }
  @media (max-width: 768px) {
    .accountant-glass .pw-sidebar { transform: translateX(-100%); }
    .accountant-glass .pw-sidebar.pw-sidebar--open { transform: translateX(0); }
  }
  .accountant-glass .pw-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 20px 16px 18px;
    border-bottom: 1px solid var(--pw-border, rgba(255,255,255,0.07));
    flex-shrink: 0;
  }
  .accountant-glass .pw-brand-logo {
    width: 33px; height: 33px;
    background: linear-gradient(135deg, var(--pw-teal, #10d9a8), #0ea5e9);
    border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    font-size: 17px; flex-shrink: 0;
    box-shadow: 0 4px 14px rgba(16,217,168,0.22);
  }
  .accountant-glass .pw-brand-name {
    font-family: 'Cabinet Grotesk', sans-serif;
    font-weight: 800; font-size: 16.5px;
    letter-spacing: -0.2px;
    color: var(--pw-t1, #eef3ff);
  }
  .accountant-glass .pw-brand-pill {
    margin-left: auto;
    font-size: 9px; font-weight: 700;
    letter-spacing: 0.8px; text-transform: uppercase;
    color: var(--pw-teal, #10d9a8);
    background: rgba(16,217,168,0.10);
    border: 1px solid rgba(16,217,168,0.2);
    border-radius: 4px;
    padding: 2px 6px;
    flex-shrink: 0;
  }
  .accountant-glass .pw-nav-section { padding: 16px 10px 4px; }
  .accountant-glass .pw-nav-label {
    font-size: 9.5px; font-weight: 700;
    letter-spacing: 1.2px; text-transform: uppercase;
    color: var(--pw-t3, #3d5278);
    padding: 0 6px; margin-bottom: 5px;
    display: block;
  }
  .accountant-glass .pw-nav-link {
    display: flex; align-items: center; gap: 9px;
    padding: 8px 10px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s;
    color: var(--pw-t2, #8296be);
    font-size: 13px; font-weight: 500;
    white-space: nowrap;
    text-decoration: none;
    width: 100%;
    border: 1px solid transparent;
    background: transparent;
    font-family: inherit;
  }
  .accountant-glass .pw-nav-link:hover {
    background: var(--pw-s2, #101828);
    color: var(--pw-t1, #eef3ff);
  }
  .accountant-glass .pw-nav-link--active {
    background: rgba(16,217,168,0.10) !important;
    color: var(--pw-teal, #10d9a8) !important;
    border-color: rgba(16,217,168,0.15) !important;
  }
  .accountant-glass .pw-nav-ic { font-size: 15px; flex-shrink: 0; width: 18px; text-align: center; }
  .accountant-glass .pw-nav-text { flex: 1; text-align: left; }
  .accountant-glass .pw-nav-subitems { padding: 2px 0 4px 14px; }
  .accountant-glass .pw-nav-subitem {
    display: flex; align-items: center; gap: 7px;
    padding: 6px 10px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.14s;
    color: var(--pw-t2, #8296be);
    font-size: 12.5px; font-weight: 500;
    text-decoration: none;
    width: 100%;
    border: 1px solid transparent;
    background: transparent;
    font-family: inherit;
  }
  .accountant-glass .pw-nav-subitem:hover { background: var(--pw-s2, #101828); color: var(--pw-t1, #eef3ff); }
  .accountant-glass .pw-nav-subitem--active {
    color: var(--pw-teal, #10d9a8) !important;
    background: rgba(16,217,168,0.08) !important;
  }
  .accountant-glass .pw-nav-sub-dot {
    color: var(--pw-t3, #3d5278);
    flex-shrink: 0;
    font-size: 16px;
    line-height: 1;
  }
  .accountant-glass .pw-nav-chevron {
    margin-left: auto;
    font-size: 14px;
    color: var(--pw-t3, #3d5278);
    transition: transform 0.2s;
    display: inline-block;
    line-height: 1;
  }
  .accountant-glass .pw-nav-chevron--open { transform: rotate(90deg); }
  .accountant-glass .pw-sidebar-bottom {
    margin-top: auto;
    padding: 12px;
    border-top: 1px solid var(--pw-border, rgba(255,255,255,0.07));
    flex-shrink: 0;
  }
  .accountant-glass .pw-admin-card {
    display: flex; align-items: center; gap: 9px;
    padding: 9px 10px;
    border-radius: 8px;
    background: var(--pw-s2, #101828);
    border: 1px solid var(--pw-border, rgba(255,255,255,0.07));
    cursor: default;
    transition: border-color 0.2s;
  }
  .accountant-glass .pw-admin-av {
    width: 32px; height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--pw-teal, #10d9a8), #3d8ef8);
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700;
    color: #05080f;
    flex-shrink: 0;
  }
  .accountant-glass .pw-admin-name {
    font-size: 12px; font-weight: 600;
    color: var(--pw-t1, #eef3ff);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .accountant-glass .pw-admin-role { font-size: 10.5px; color: var(--pw-t3, #3d5278); }
  .accountant-glass .pw-logout-btn {
    display: flex; align-items: center; gap: 9px;
    padding: 7px 10px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.14s;
    color: var(--pw-rose, #f75c5c);
    font-size: 13px; font-weight: 500;
    background: transparent;
    border: none;
    width: 100%;
    font-family: inherit;
    margin-top: 6px;
  }
  .accountant-glass .pw-logout-btn:hover { background: rgba(247,92,92,0.10); }
  .accountant-glass .pw-sidebar-overlay { display: none; }
  @media (max-width: 768px) {
    .accountant-glass .pw-sidebar-overlay {
      display: block;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      z-index: 199;
      backdrop-filter: blur(2px);
    }
  }
  .accountant-glass .pw-hamburger {
    display: none;
    position: fixed;
    top: 14px; left: 14px;
    z-index: 300;
    width: 36px; height: 36px;
    border-radius: 8px;
    background: var(--pw-s2, #101828);
    border: 1px solid var(--pw-border, rgba(255,255,255,0.07));
    align-items: center; justify-content: center;
    cursor: pointer;
    font-size: 16px;
    color: var(--pw-t1, #eef3ff);
    transition: border-color 0.14s;
  }
  .accountant-glass .pw-hamburger:hover { border-color: var(--pw-bh, rgba(255,255,255,0.12)); }
  @media (max-width: 768px) { .accountant-glass .pw-hamburger { display: flex; } }
  .accountant-glass .pw-main {
    margin-left: var(--pw-sidebar-width, 232px);
    flex: 1;
    min-height: 0;
    width: calc(100% - var(--pw-sidebar-width, 232px));
    overflow-x: hidden;
    overflow-y: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    background: var(--pw-bg, #05080f);
    color: var(--pw-t1, #eef3ff);
  }
  .accountant-glass .pw-main::-webkit-scrollbar { width: 0; height: 0; display: none; }
  @media (max-width: 768px) {
    .accountant-glass .pw-main {
      margin-left: 0;
      width: 100%;
    }
  }
  .accountant-glass[data-theme="dark"] .pw-main table,
  .accountant-glass[data-theme="dark"] .pw-main th,
  .accountant-glass[data-theme="dark"] .pw-main td { color: #eef3ff; }
  .accountant-glass[data-theme="light"] .pw-main table,
  .accountant-glass[data-theme="light"] .pw-main th,
  .accountant-glass[data-theme="light"] .pw-main td { color: #0d1c2e; }
  .accountant-glass .pw-search-backdrop {
    position: fixed;
    inset: 0;
    z-index: 400;
    background: rgba(0,0,0,0.55);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 72px 16px 18px;
  }
  .accountant-glass .pw-search-panel {
    width: 100%;
    max-width: 420px;
    background: var(--pw-s2, #101828);
    border: 1px solid var(--pw-border, rgba(255,255,255,0.07));
    border-radius: 12px;
    padding: 14px 14px 10px;
    box-shadow: 0 24px 60px rgba(0,0,0,0.45);
  }
  .accountant-glass .pw-search-panel input {
    width: 100%;
    padding: 10px 12px 10px 38px;
    border-radius: 8px;
    border: 1px solid var(--pw-border, rgba(255,255,255,0.07));
    background: var(--pw-s1, #0b1120);
    color: var(--pw-t1, #eef3ff);
    font-size: 13px;
    font-family: inherit;
  }
  .accountant-glass .pw-search-panel input::placeholder { color: var(--pw-t3, #3d5278); }
  .accountant-glass .pw-search-panel input:focus {
    outline: none;
    border-color: rgba(16,217,168,0.35);
    box-shadow: 0 0 0 2px rgba(16,217,168,0.12);
  }
  .accountant-glass .pw-sidebar-tools {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 0 12px 10px;
  }
  .accountant-glass .pw-sidebar-tools button {
    flex: 1;
    min-width: 72px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 8px;
    border-radius: 8px;
    border: 1px solid var(--pw-border, rgba(255,255,255,0.07));
    background: var(--pw-s2, #101828);
    color: var(--pw-t2, #8296be);
    cursor: pointer;
    font-size: 12px;
    font-family: inherit;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
  }
  .accountant-glass .pw-sidebar-tools button:hover {
    background: var(--pw-s3, #141c2e);
    color: var(--pw-t1, #eef3ff);
    border-color: var(--pw-bh, rgba(255,255,255,0.12));
  }
  .accountant-glass .pw-search-results {
    margin-top: 10px;
    max-height: 260px;
    overflow-y: auto;
    border-radius: 8px;
    border: 1px solid var(--pw-border, rgba(255,255,255,0.07));
    background: var(--pw-s1, #0b1120);
  }
  .accountant-glass .pw-search-results button {
    font-family: inherit;
    cursor: pointer;
    background: none;
    border: none;
    padding: 0;
  }
`;
