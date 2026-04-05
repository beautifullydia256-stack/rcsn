import parentsTemplateRaw from '@/assets/pwezacore-parents-page.html?raw';

export function extractParentsPageCss(raw: string): string {
  const m = raw.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  return m ? m[1].trim() : '';
}

/** Scoped <style> content from the Parents design template (`.pw-parents`). */
export const PARENTS_PAGE_STYLE_BLOCK = extractParentsPageCss(parentsTemplateRaw);
