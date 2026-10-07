import { useState } from 'react';
import { Globe, CheckCircle2, Check, Download, Database } from 'lucide-react';
import { isDesktopApp } from '../lib/isDesktopApp';
import { cacheSchoolData } from '../lib/offlineSync';
import { useOfflineModeStore } from '../store/offlineModeStore';

interface Props {
  schoolId: string;
  onDone: () => void;
}

type Phase = 'choice' | 'downloading' | 'done';

function stepLabel(progress: number): string {
  if (progress < 10) return 'Starting download…';
  if (progress < 45) return 'Fetching data from server…';
  if (progress < 72) return 'Saving to local database…';
  if (progress < 100) return 'Downloading student records…';
  return 'All done!';
}

export default function OfflineSetupDialog({ schoolId, onDone }: Props) {
  const { setMode, setCacheStatus, setCacheProgress, setLastSynced } = useOfflineModeStore();
  const [phase, setPhase] = useState<Phase>('choice');
  const [progress, setProgress] = useState(0);

  const handleDownload = async () => {
    setMode('offline');
    setCacheStatus('downloading');
    setPhase('downloading');

    await cacheSchoolData(schoolId, (p) => {
      setProgress(p);
      setCacheProgress(p);
    });

    const now = new Date().toISOString();
    setLastSynced(now);
    setCacheStatus('done');
    setProgress(100);
    setPhase('done');
  };

  const handleSkip = () => {
    setMode('online-only');
    onDone();
  };

  const handleDone = () => {
    onDone();
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-transparent p-4">
      <div className="relative bg-slate-950/45 dark:bg-black/55 backdrop-blur-md backdrop-saturate-[150%] border border-white/30 rounded-[28px] shadow-2xl p-7 w-full max-w-md overflow-hidden text-white">
        {/* Specular highlights & ambient glow */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {phase === 'choice' && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-inner">
              <Database className="w-6 h-6 text-emerald-400" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">
                Enable Offline Access?
              </h2>
              <p className="text-xs text-white/70 mt-1 leading-relaxed">
                Cache institution records locally so the school portal operates smoothly even during connectivity interruptions. Attendance, rosters, and finances remain instantly accessible.
              </p>
            </div>

            <ul className="space-y-2 py-2">
              <li className="flex items-center gap-2.5 text-xs text-white/80">
                <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3" />
                </span>
                Students, Cohorts & Enrollment
              </li>
              <li className="flex items-center gap-2.5 text-xs text-white/80">
                <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3" />
                </span>
                Tutors, Instructors & Staff Directory
              </li>
              <li className="flex items-center gap-2.5 text-xs text-white/80">
                <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3" />
                </span>
                Fee Ledger & Payment References
              </li>
              <li className="flex items-center gap-2.5 text-xs text-white/80">
                <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3" />
                </span>
                Institutional Information & Configurations
              </li>
              {isDesktopApp && (
                <li className="flex items-center gap-2.5 text-xs text-white/80">
                  <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3" />
                  </span>
                  Cached Trainee Identification Photos
                </li>
              )}
            </ul>

            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                onClick={handleDownload}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-950/40 border border-emerald-400/30 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Cache Now (Recommended)</span>
              </button>
              <button
                type="button"
                onClick={handleSkip}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white/70 bg-white/10 hover:bg-white/15 border border-white/15 transition-all text-center"
              >
                Skip — Continue Online Only
              </button>
            </div>
          </div>
        )}

        {phase === 'downloading' && (
          <div className="space-y-4 py-2">
            <div>
              <h2 className="text-base font-bold text-white">
                Caching Institutional Data…
              </h2>
              <p className="text-xs text-emerald-300 font-semibold mt-1">
                {stepLabel(progress)}
              </p>
            </div>

            <div className="w-full h-2 rounded-full bg-black/40 border border-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex justify-between text-xs text-white/60">
              <span>{progress < 100 ? 'Syncing…' : 'Finished!'}</span>
              <span className="font-bold text-white">{progress}%</span>
            </div>

            <p className="text-[11px] text-white/50 leading-relaxed">
              Synchronizing records to encrypted local storage. This enables high-availability offline operation.
            </p>
          </div>
        )}

        {phase === 'done' && (
          <div className="space-y-4 py-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-base font-bold text-white">
                Ready for Offline Use
              </h2>
              <p className="text-xs text-white/70 mt-1 leading-relaxed">
                Institutional records have been verified and cached on this device. You can now operate seamlessly offline. Automatic two-way cloud reconciliation will resume upon reconnection.
              </p>
            </div>

            <div className="text-[11px] text-white/40">
              Synchronized: {new Date().toLocaleString()}
            </div>

            <button
              type="button"
              onClick={handleDone}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-950/40 border border-emerald-400/30 transition-all text-center"
            >
              Launch Portal
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
