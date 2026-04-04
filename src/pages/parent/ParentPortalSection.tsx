import { Link } from 'react-router-dom';

type Props = { title: string };

/** Standard empty state for parent portal sections that are not yet implemented. */
export default function ParentPortalSection({ title }: Props) {
  return (
    <div className="mx-auto flex min-h-[55vh] max-w-lg flex-col items-center justify-center px-6 py-12 text-center">
      <h1 className="font-['Instrument_Serif',serif] text-2xl font-semibold text-[var(--ac-text-primary)]">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--ac-text-secondary)]">
        We are completing this part of the parent portal. Your dashboard has the latest summary; use Messages to reach the
        school directly.
      </p>
      <Link
        to="/dashboard/parent"
        className="mt-6 rounded-xl bg-[#ff6b6b] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
