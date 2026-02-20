import { ReactNode } from 'react';

/**
 * Shared wrapper for admin content pages (glass dashboard, dark/light theme).
 * Uses ac-text-* and ac-glass-card for theme-aware styling.
 */
export default function AdminPageWrapper({
  title,
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      {(title || subtitle) && (
        <div>
          {title && <h1 className="text-2xl sm:text-3xl font-bold ac-text-primary">{title}</h1>}
          {subtitle && <p className="ac-text-secondary mt-1">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

/** Card style for admin pages (glass card, theme-aware) */
export const adminCardClass = 'ac-glass-card p-6';
