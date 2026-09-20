import { useEffect, type ReactNode } from 'react';
import { useUIStore } from '@/store/uiStore';
import { PARENTS_PAGE_STYLE_BLOCK } from '@/lib/pwParentsPageCss';

const FONT_ID = 'pweza-pw-parents-directory-fonts';
const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap';

/** Wraps content in `.pw-parents` / `.par-page` (same system as the Parents directory page). */
export default function PwParentsDirectoryShell({ children }: { children: ReactNode }) {
  const theme = useUIStore((s) => s.theme);
  useEffect(() => {
    if (!document.getElementById(FONT_ID)) {
      const link = document.createElement('link');
      link.id = FONT_ID;
      link.rel = 'stylesheet';
      link.href = FONT_HREF;
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    const sync = () =>
      document.documentElement.classList.toggle('light', !document.documentElement.classList.contains('dark'));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PARENTS_PAGE_STYLE_BLOCK }} />
      <div className="pw-parents" data-theme={theme} style={{ width: '100%', minHeight: '100%', display: 'block' }}>
        <div className="par-page">{children}</div>
      </div>
    </>
  );
}
