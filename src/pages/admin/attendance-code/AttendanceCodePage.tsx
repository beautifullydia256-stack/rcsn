import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { generateAttendanceCode, secondsToNextWindow } from '@/lib/attendanceCode';
import AdminPageWrapper from '@/components/layout/AdminPageWrapper';
import { ArrowLeft, RefreshCw, KeyRound, ShieldCheck } from 'lucide-react';
import '@/styles/government-system.css';

export default function AttendanceCodePage() {
  const navigate = useNavigate();
  const schoolId = useAuthStore((s) => s.schoolId);
  const [code, setCode] = useState('------');
  const [seconds, setSeconds] = useState(secondsToNextWindow());
  const lastWindow = useRef(-1);

  useEffect(() => {
    if (!schoolId) return;

    let cancelled = false;

    async function refresh() {
      const w = Math.floor(Date.now() / 30_000);
      if (w !== lastWindow.current) {
        lastWindow.current = w;
        const c = await generateAttendanceCode(schoolId!);
        if (!cancelled) setCode(c);
      }
    }

    void refresh();

    const tick = setInterval(() => {
      if (cancelled) return;
      setSeconds(secondsToNextWindow());
      void refresh();
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(tick);
    };
  }, [schoolId]);

  const d1 = code.slice(0, 3);
  const d2 = code.slice(3, 6);
  const pct = ((29 - seconds) / 29) * 100;
  const urgent = seconds <= 5;

  return (
    <AdminPageWrapper>
      {/* INSTITUTIONAL GOVERNMENT HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#CCCCCC] pb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-[17px] font-bold tracking-tight text-[#111111] uppercase font-sans">
            ATTENDANCE VERIFICATION CODE GENERATOR
          </h1>
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-bold bg-[#EAEAEA] text-[#222222] border border-[#CCCCCC]">
            {urgent ? 'ROTATING NOW' : '30S ROTATION'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/attendance')}
            className="gov-btn gov-btn-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            ATTENDANCE RECORDS
          </button>
        </div>
      </div>

      {/* CODE DISPLAY DESK */}
      <div className="max-w-2xl mx-auto py-8">
        <div className="gov-card p-8 rounded-lg border border-[#CCCCCC] bg-white text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <KeyRound className="w-4 h-4 text-[#555555]" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#555555]">
              ROLL CALL TEMPORARY ACCESS TOKEN
            </span>
          </div>

          {/* DIGIT BLOCKS */}
          <div className="flex items-center justify-center gap-3 my-6">
            <div className="flex gap-2">
              {d1.split('').map((digit, i) => (
                <span
                  key={`d1-${i}`}
                  className={`w-14 h-16 sm:w-16 sm:h-20 flex items-center justify-center text-3xl sm:text-4xl font-mono font-bold rounded border ${
                    urgent
                      ? 'bg-[#FEF2F2] border-[#EF4444] text-[#B91C1C]'
                      : 'bg-[#F8F9FA] border-[#CCCCCC] text-[#111111]'
                  }`}
                >
                  {digit}
                </span>
              ))}
            </div>

            <span className="text-xl font-mono font-bold text-[#888888] px-1">-</span>

            <div className="flex gap-2">
              {d2.split('').map((digit, i) => (
                <span
                  key={`d2-${i}`}
                  className={`w-14 h-16 sm:w-16 sm:h-20 flex items-center justify-center text-3xl sm:text-4xl font-mono font-bold rounded border ${
                    urgent
                      ? 'bg-[#FEF2F2] border-[#EF4444] text-[#B91C1C]'
                      : 'bg-[#F8F9FA] border-[#CCCCCC] text-[#111111]'
                  }`}
                >
                  {digit}
                </span>
              ))}
            </div>
          </div>

          {/* EXPIRY PROGRESS BAR */}
          <div className="w-full max-w-md mx-auto mb-3">
            <div className="h-1.5 w-full bg-[#EAEAEA] rounded-full overflow-hidden border border-[#DDDDDD]">
              <div
                className={`h-full transition-all duration-1000 ${
                  urgent ? 'bg-[#DC2626]' : 'bg-[#111111]'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div
            className={`text-xs font-mono font-bold uppercase tracking-wider mb-6 ${
              urgent ? 'text-[#DC2626]' : 'text-[#666666]'
            }`}
          >
            {urgent
              ? `EXPIRES IN ${seconds}S — ROTATION IMMINENT`
              : `ROTATES IN ${seconds} SECONDS`}
          </div>

          <div className="border-t border-[#CCCCCC] pt-5 text-left text-xs text-[#444444] space-y-2 font-mono">
            <div className="flex items-center gap-1.5 font-bold text-[#111111] uppercase text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5" />
              OPERATIONAL PROTOCOL
            </div>
            <p className="text-[12px] text-[#555555] leading-relaxed">
              When faculty or clinical instructors cannot punch in or out via biometric geolocation, this institutional token authorizes attendance validation. Instructors input this rolling 6-digit code into their terminal. The token expires and cycles every 30 seconds.
            </p>
          </div>
        </div>

        {!schoolId && (
          <div className="mt-4 p-3 rounded-md bg-[#FEF2F2] border border-[#EF4444] text-xs font-mono text-[#B91C1C] text-center">
            NO ACTIVE SCHOOL PROFILE LINKED TO CURRENT SESSION. CONTACT SYSTEM ADMINISTRATOR.
          </div>
        )}
      </div>
    </AdminPageWrapper>
  );
}
