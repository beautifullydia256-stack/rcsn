import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import '@/styles/government-system.css';

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
    <div className="flex min-w-0 flex-col max-md:flex-none md:min-h-0 md:flex-1">
      {showMobileChrome && (
        <div className="mb-3 flex shrink-0 items-center gap-2 border-b border-[#CCCCCC] pb-3 md:hidden">
          <button
            type="button"
            onClick={onBack}
            className="gov-btn gov-btn-sm"
            aria-label="Back to settings list"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            BACK
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[15px] font-bold text-[#111111] uppercase font-sans">
              {title}
            </h2>
          </div>
        </div>
      )}

      <div className="hidden shrink-0 border-b border-[#CCCCCC] pb-3 md:flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-[16px] font-bold tracking-tight text-[#111111] uppercase font-sans">
            {title}
          </h2>
          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold bg-[#EAEAEA] text-[#222222] border border-[#CCCCCC]">
            CONFIGURATION
          </span>
        </div>
      </div>

      <div
        className={[
          'touch-pan-y pt-4',
          showMobileChrome
            ? 'max-md:overflow-visible max-md:flex-none max-md:pb-[calc(var(--pw-botnav-h,64px)+env(safe-area-inset-bottom,0px)+32px)]'
            : '',
          'md:min-h-0 md:flex-1 md:overflow-x-auto md:overflow-y-auto md:overscroll-y-contain md:pb-0 md:pt-4',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </div>
    </div>
  );
}
