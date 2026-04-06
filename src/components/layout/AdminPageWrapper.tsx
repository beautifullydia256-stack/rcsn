import { ReactNode } from 'react';

/**
 * Shared wrapper for admin content pages (glass dashboard, dark/light theme).
 * Uses ac-text-* and ac-glass-card for theme-aware styling.
 * Optional `eyebrow` matches Academic Staff / Teachers page pattern (uppercase + bar).
 */
export default function AdminPageWrapper({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="admin-terminal-page space-y-6">
      {(eyebrow || title || subtitle) && (
        <div className="space-y-1">
          {eyebrow && (
            <p className="mb-0 flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.2em] text-emerald-500 dark:text-[#00e5c3]">
              <span className="inline-block h-0.5 w-3.5 shrink-0 rounded-sm bg-emerald-500 dark:bg-[#00e5c3]" aria-hidden />
              {eyebrow}
            </p>
          )}
          {title && (
            <h1
              className="text-[28px] font-normal leading-tight tracking-tight text-slate-900 dark:text-[#e8eeff] sm:text-[32px]"
              style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
            >
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="max-w-2xl text-[13px] leading-relaxed text-slate-600 dark:text-[#b0bdd8]">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

/** Card style for admin pages (glass card, theme-aware) */
export const adminCardClass = 'ac-glass-card p-6';
