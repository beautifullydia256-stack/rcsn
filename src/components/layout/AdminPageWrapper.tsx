import { ReactNode } from 'react';

/**
 * Shared wrapper for admin content pages (2f00b44 glass style).
 * Background from AdminLayout; glass cards via adminCardClass.
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
          {title && <h1 className="text-2xl sm:text-3xl font-bold text-white">{title}</h1>}
          {subtitle && <p className="text-white/85 mt-1">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

/** Card style for admin pages (2f00b44 glass: frosted, bordered) */
export const adminCardClass =
  'rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-lg p-6';
