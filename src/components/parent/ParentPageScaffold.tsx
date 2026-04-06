import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

export const parentPortal = {
  /** Secondary / muted copy on dark cards (Issue 14 contrast) */
  muted: 'text-[#b0bdd8]',
  backLink:
    'inline-flex items-center gap-1.5 text-sm font-semibold text-[#ff6b6b] hover:opacity-90 transition-opacity',
  h1: "mt-3 font-['Instrument_Serif',serif] text-2xl sm:text-3xl font-semibold text-[#e8eeff] tracking-tight",
  sub: 'mt-2 text-sm sm:text-base text-[#b0bdd8] max-w-2xl leading-relaxed',
  card: 'rounded-xl border border-white/[0.08] bg-[#10141f] p-4 sm:p-5 shadow-lg shadow-black/25',
  cardMuted: 'rounded-xl border border-white/[0.06] bg-[#0b0e18] p-4 sm:p-5',
  label: 'text-[11px] font-bold uppercase tracking-[0.14em] text-[#b0bdd8]',
  statVal: "font-['Instrument_Serif',serif] text-xl sm:text-2xl text-[#e8eeff]",
  btnPrimary:
    'inline-flex items-center justify-center rounded-xl bg-[#ff6b6b] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#ff6b6b]/20 hover:opacity-92 transition-opacity disabled:opacity-40',
  btnGhost:
    'inline-flex items-center justify-center rounded-xl border border-white/[0.12] bg-[#161b2b] px-4 py-2.5 text-sm font-semibold text-[#e8eeff] hover:bg-[#1d2438] transition-colors disabled:opacity-40',
};

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
};

export default function ParentPageScaffold({ title, description, children }: Props) {
  return (
    <div className="min-h-[48vh] w-full max-w-5xl mx-auto px-4 py-5 sm:px-6 sm:py-8">
      <Link to="/dashboard/parent" className={parentPortal.backLink}>
        ← Back to dashboard
      </Link>
      <h1 className={parentPortal.h1}>{title}</h1>
      {description ? <p className={parentPortal.sub}>{description}</p> : null}
      <div className="mt-6 sm:mt-8">{children}</div>
    </div>
  );
}
