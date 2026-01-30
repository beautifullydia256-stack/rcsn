import { ReactNode } from 'react';

/**
 * Shared wrapper for admin content pages (2f00b44 style).
 * Same background is provided by AdminLayout main; this adds consistent spacing and optional title.
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
          {title && <h1 className="text-3xl font-bold text-white">{title}</h1>}
          {subtitle && <p className="text-gray-400 mt-1">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

/** Card style for admin pages (bordered, rounded, dark) */
export const adminCardClass =
  'rounded-lg border border-gray-600 bg-[#1e293b] p-6';
