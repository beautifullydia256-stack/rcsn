import designRaw from '@/assets/pwezacore-parent-dashboard.html?raw';

export function extractParentPortalStyle(raw: string): string {
  const styleMatch = raw.match(/<style>([\s\S]*?)<\/style>/i);
  return styleMatch?.[1] ?? '';
}

/** Inner markup for the home dashboard only (inside `.pd-content`), excluding the shell. */
export function extractParentHomeInnerHtml(raw: string): string {
  const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch?.[1] ?? '';
  const startMark = '<!-- HEADER -->';
  const endMark = '</div><!-- /pd-content -->';
  const start = body.indexOf(startMark);
  const end = body.indexOf(endMark);
  if (start === -1 || end === -1) return '';
  return body.slice(start, end).trim();
}

export const PARENT_PORTAL_SCOPED_STYLE = extractParentPortalStyle(designRaw);
export const PARENT_HOME_INNER_HTML = extractParentHomeInnerHtml(designRaw);
