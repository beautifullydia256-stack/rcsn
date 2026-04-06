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
  headerActions,
  children,
}: {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  /** Right side of the top header row, aligned with the eyebrow (e.g. action buttons). */
  headerActions?: ReactNode;
  children: ReactNode;
}) {
  const eyebrowRow = eyebrow ? (
    <p className="mb-0 flex min-w-0 items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.2em] text-emerald-500 dark:text-[#00e5c3]">
      <span className="inline-block h-0.5 w-3.5 shrink-0 rounded-sm bg-emerald-500 dark:bg-[#00e5c3]" aria-hidden />
      {eyebrow}
    </p>
  ) : null;

  return (
    <div className="admin-terminal-page space-y-6">
      {(eyebrow || title || subtitle || headerActions) && (
        <div className="space-y-1">
          {headerActions ? (
            <div
              className={`mb-0 flex flex-col gap-3 sm:flex-row sm:items-center ${
                eyebrow ? 'sm:justify-between' : 'sm:justify-end'
              }`}
            >
              {eyebrowRow}
              <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                {headerActions}
              </div>
            </div>
          ) : (
            eyebrowRow
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
