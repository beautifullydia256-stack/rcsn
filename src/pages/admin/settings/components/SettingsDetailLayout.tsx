import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';

export default function SettingsDetailLayout({
  title,
  subtitle,
  showMobileChrome,
  onBack,
  children,
}: {
  title: string;
  subtitle?: string;
  showMobileChrome: boolean;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {showMobileChrome && (
        <div className="mb-3 flex shrink-0 items-center gap-1 border-b border-slate-200/25 pb-3 dark:border-white/10 md:hidden">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-slate-200/80 dark:text-[#e8eeff] dark:hover:bg-white/10"
            aria-label="Back to settings list"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="min-w-0 flex-1 text-center pr-10">
            <h2 className="truncate text-[17px] font-semibold leading-tight text-slate-900 dark:text-[#e8eeff]">
              {title}
            </h2>
            {subtitle ? (
              <p className="truncate text-[12px] text-slate-600 dark:text-[#9aa8c4]">{subtitle}</p>
            ) : null}
          </div>
        </div>
      )}

      <div className="hidden shrink-0 border-b border-slate-200/25 pb-4 dark:border-white/10 md:block">
        <h2
          className="text-xl font-medium tracking-tight text-slate-900 dark:text-[#e8eeff]"
          style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
        >
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-slate-600 dark:text-[#b0bdd8]">
            {subtitle}
          </p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto pt-4 md:pt-5">{children}</div>
    </div>
  );
}
