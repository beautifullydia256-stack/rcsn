import type { ReactNode } from 'react';
import type { PwParChipTone } from '@/components/admin/pwDirectoryUtils';

export type PwDirectoryCardRow = { label: string; value: ReactNode };

export default function PwDirectoryUserCard({
  name,
  subtitle,
  cornerTone,
  cornerLabel,
  initials,
  avatarBackground,
  statusDotActive,
  rows,
  footer,
  onCardClick,
  selected,
  avatarUrl,
}: {
  name: string;
  subtitle: string;
  cornerTone: PwParChipTone;
  cornerLabel: string;
  initials: string;
  avatarBackground: string;
  /** When set, shows photo instead of initials (object-fit cover). */
  avatarUrl?: string | null;
  /** "Portal" dot — reused as active (green) vs inactive account */
  statusDotActive: boolean;
  rows: PwDirectoryCardRow[];
  footer?: ReactNode;
  onCardClick?: () => void;
  selected?: boolean;
}) {
  return (
    <div
      className="par-pcard"
      style={{
        cursor: onCardClick ? 'pointer' : 'default',
        ...(selected
          ? {
              outline: '2px solid var(--violet)',
              outlineOffset: '2px',
            }
          : {}),
      }}
      onClick={onCardClick}
      role={onCardClick ? 'button' : undefined}
      tabIndex={onCardClick ? 0 : undefined}
      onKeyDown={
        onCardClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onCardClick();
              }
            }
          : undefined
      }
    >
      <div className="par-pcard-top">
        <div
          className="par-pcard-av"
          style={{
            position: 'relative',
            overflow: 'hidden',
            background: avatarUrl ? 'var(--s2, #1a1f2e)' : avatarBackground,
          }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
          ) : (
            initials
          )}
          <div className={`par-portal-dot ${statusDotActive ? 'active' : 'none'}`} style={{ zIndex: 1 }} />
        </div>
        <div className="par-pcard-name">{name}</div>
        <div className="par-pcard-rel">{subtitle}</div>
        <div className="par-pcard-corner">
          <span className={`par-chip ${cornerTone}`}>{cornerLabel}</span>
        </div>
      </div>
      <div className="par-pcard-body">
        {rows.map(({ label, value }) => (
          <div className="par-pcard-row" key={label}>
            <span className="par-pcard-label">{label}</span>
            <span className="par-pcard-val">{value}</span>
          </div>
        ))}
      </div>
      {footer ? (
        <div
          className="par-pcard-foot"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}
