import parentsTemplateRaw from '@/assets/pwezacore-parents-page.html?raw';

export function extractParentsPageCss(raw: string): string {
  const m = raw.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  return m ? m[1].trim() : '';
}

const DARK_MODE_OVERRIDES = `
  html.dark .pw-parents,
  [data-theme="dark"] .pw-parents,
  .pw-parents[data-theme="dark"],
  body.dark .pw-parents {
    --bg: #070B09 !important;
    --s1: #0D1512 !important;
    --s2: #141F1A !important;
    --s3: #1B2923 !important;
    --t1: #f1f5f9 !important;
    --t2: #94a3b8 !important;
    --t3: #475569 !important;
    --border: rgba(255, 255, 255, 0.08) !important;
    --bh: rgba(255, 255, 255, 0.16) !important;
    background: #070B09 !important;
    color: #f1f5f9 !important;
  }
  html.dark .pw-parents .par-page,
  [data-theme="dark"] .pw-parents .par-page,
  .pw-parents[data-theme="dark"] .par-page {
    background: transparent !important;
    color: #f1f5f9 !important;
  }
  html.dark .pw-parents .par-pcard,
  [data-theme="dark"] .pw-parents .par-pcard,
  .pw-parents[data-theme="dark"] .par-pcard {
    background: #141F1A !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
    color: #f1f5f9 !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
  }
  html.dark .pw-parents .par-pcard-top,
  [data-theme="dark"] .pw-parents .par-pcard-top,
  .pw-parents[data-theme="dark"] .par-pcard-top {
    border-bottom-color: rgba(255, 255, 255, 0.06) !important;
  }
  html.dark .pw-parents .par-pcard-name,
  [data-theme="dark"] .pw-parents .par-pcard-name,
  .pw-parents[data-theme="dark"] .par-pcard-name {
    color: #ffffff !important;
  }
  html.dark .pw-parents .par-pcard-row,
  [data-theme="dark"] .pw-parents .par-pcard-row,
  .pw-parents[data-theme="dark"] .par-pcard-row {
    border-bottom-color: rgba(255, 255, 255, 0.05) !important;
  }
  html.dark .pw-parents .par-pcard-label,
  [data-theme="dark"] .pw-parents .par-pcard-label,
  .pw-parents[data-theme="dark"] .par-pcard-label {
    color: #64748b !important;
  }
  html.dark .pw-parents .par-pcard-val,
  [data-theme="dark"] .pw-parents .par-pcard-val,
  .pw-parents[data-theme="dark"] .par-pcard-val {
    color: #cbd5e1 !important;
  }
  html.dark .pw-parents .par-kpi,
  [data-theme="dark"] .pw-parents .par-kpi,
  .pw-parents[data-theme="dark"] .par-kpi {
    background: #0D1512 !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
  }
  html.dark .pw-parents .par-kpi-val,
  [data-theme="dark"] .pw-parents .par-kpi-val,
  .pw-parents[data-theme="dark"] .par-kpi-val {
    color: #f1f5f9 !important;
  }
  html.dark .pw-parents .par-search input,
  [data-theme="dark"] .pw-parents .par-search input,
  .pw-parents[data-theme="dark"] .par-search input {
    background: #141F1A !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
    color: #f1f5f9 !important;
  }
  html.dark .pw-parents .par-btn-ghost,
  [data-theme="dark"] .pw-parents .par-btn-ghost,
  .pw-parents[data-theme="dark"] .par-btn-ghost {
    background: rgba(255, 255, 255, 0.05) !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
    color: #f1f5f9 !important;
  }
  html.dark .pw-parents .par-btn-ghost:hover,
  [data-theme="dark"] .pw-parents .par-btn-ghost:hover,
  .pw-parents[data-theme="dark"] .par-btn-ghost:hover {
    background: rgba(255, 255, 255, 0.1) !important;
  }
  html.dark .pw-parents .par-pcard-foot,
  [data-theme="dark"] .pw-parents .par-pcard-foot,
  .pw-parents[data-theme="dark"] .par-pcard-foot {
    border-top-color: rgba(255, 255, 255, 0.06) !important;
    background: rgba(255, 255, 255, 0.02) !important;
  }
`;

/** Scoped <style> content from the Parents design template (`.pw-parents`) plus dual-theme dark mode support. */
export const PARENTS_PAGE_STYLE_BLOCK = extractParentsPageCss(parentsTemplateRaw) + '\n' + DARK_MODE_OVERRIDES;
