import { ReactNode } from 'react';

/**
 * Shared wrapper for admin content pages (light theme, same as dashboard).
 * Background from AdminLayout (bg-gray-50); white cards via adminCardClass.
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
          {title && <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h1>}
          {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

/** Card style for admin pages (white card, same as dashboard) */
export const adminCardClass =
  'rounded-xl border border-gray-200 bg-white shadow-sm p-6';
