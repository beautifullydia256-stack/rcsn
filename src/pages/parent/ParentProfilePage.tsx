import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useParentPortal } from '@/context/ParentPortalContext';
import { useUIStore } from '@/store/uiStore';
import { displayStudentName } from '@/lib/parentPortalUtils';
import {
  User,
  ArrowLeft,
  Mail,
  Phone,
  GraduationCap,
  ShieldCheck,
  Building2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { getTokens, cardGrad, SORA, INTER } from '@/styles/posThemeTokens';

export default function ParentProfilePage() {
  const navigate = useNavigate();
  const { userId, parentNameFull, ready, children, setActiveStudentId } = useParentPortal();
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);

  const [email, setEmail] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !userId) return;
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.from('users').select('email, phone').eq('user_id', userId).maybeSingle();
      if (cancelled) return;
      const row = u as { email?: string; phone?: string } | null;
      setEmail(row?.email ?? null);
      setPhone(row?.phone ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, userId]);

  return (
    <div
      className="p-4 sm:p-6 lg:p-8 space-y-6 w-full max-w-none"
      style={{
        backgroundColor: t.screenBg,
        color: t.textHi,
        fontFamily: INTER,
      }}
    >
      {/* Top Breadcrumb & Header */}
      <div>
        <Link
          to="/dashboard/parent"
          className="inline-flex items-center gap-1.5 text-xs font-semibold hover:underline mb-2"
          style={{ color: t.mint }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md"
                style={{
                  backgroundColor: isDark ? 'rgba(16,217,168,0.15)' : 'rgba(16,185,129,0.12)',
                  color: t.mint,
                  fontFamily: SORA,
                }}
              >
                ACCOUNT & PROFILE
              </span>
            </div>
            <h1
              className="text-2xl sm:text-3xl font-bold mt-1 tracking-tight"
              style={{ fontFamily: SORA, color: t.textHi }}
            >
              My Parent Profile
            </h1>
            <p className="text-sm mt-0.5" style={{ color: t.textMid }}>
              Registered guardian contact information and authorized linked learner accounts.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Parent Details Card (1 Col) */}
        <div
          className="p-6 rounded-3xl shadow-sm flex flex-col justify-between"
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div>
            <div className="flex items-center gap-3.5 mb-5">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl shadow-md"
                style={{
                  background: 'linear-gradient(135deg,#10d9a8,#0ea5e9)',
                  color: '#05080f',
                }}
              >
                {(parentNameFull || 'P').charAt(0)}
              </div>
              <div>
                <h2 className="text-base font-bold" style={{ color: t.textHi }}>
                  {parentNameFull || 'Parent / Guardian'}
                </h2>
                <div className="text-xs flex items-center gap-1 mt-0.5" style={{ color: t.mint }}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified Guardian Account</span>
                </div>
              </div>
            </div>

            <div className="space-y-3.5 text-xs pt-4 border-t" style={{ borderColor: t.divider }}>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: t.textLow }}>
                  Official Email Address
                </span>
                <div className="flex items-center gap-2 mt-1 font-medium" style={{ color: t.textHi }}>
                  <Mail className="w-4 h-4" style={{ color: t.textMid }} />
                  <span>{email || 'No email registered'}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: t.textLow }}>
                  Contact Phone Number
                </span>
                <div className="flex items-center gap-2 mt-1 font-medium" style={{ color: t.textHi }}>
                  <Phone className="w-4 h-4 text-emerald-500" />
                  <span>{phone || 'No phone recorded'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 text-[11px] mt-6" style={{ color: t.textMid }}>
            To update your official email or phone records, please consult the school administration front desk.
          </div>
        </div>

        {/* Linked Children Cards (2 Cols) */}
        <div
          className="lg:col-span-2 p-6 rounded-3xl shadow-sm space-y-4"
          style={{
            background: t.panel,
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: t.divider }}>
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-emerald-500" />
              <span className="font-bold text-sm tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
                Authorized Linked Children
              </span>
            </div>
            <span className="text-xs font-semibold" style={{ color: t.mint }}>
              {children.length} {children.length === 1 ? 'Learner' : 'Learners'}
            </span>
          </div>

          {children.length === 0 ? (
            <div className="py-12 text-center text-xs" style={{ color: t.textLow }}>
              No learners linked to this guardian account yet. Please contact the school admissions office to link your student ID.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {children.map((c) => (
                <div
                  key={c.student_id}
                  className="p-4 rounded-2xl flex flex-col justify-between transition-all hover:scale-[1.01]"
                  style={{
                    backgroundColor: t.fieldBg,
                    border: `1px solid ${t.stroke}`,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
                      style={{
                        backgroundColor: isDark ? 'rgba(16,217,168,0.15)' : 'rgba(16,185,129,0.12)',
                        color: t.mint,
                      }}
                    >
                      {(c.name || '?').charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold" style={{ color: t.textHi }}>
                        {displayStudentName(c)}
                      </div>
                      <div className="text-[11px] mt-0.5" style={{ color: t.textMid }}>
                        {c.current_class || 'Class Pending'}
                      </div>
                      <div className="text-[10px] mt-0.5" style={{ color: t.textLow }}>
                        Admission: #{c.admission_number || 'No ID'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveStudentId(c.student_id);
                      navigate('/dashboard/parent/performance');
                    }}
                    className="flex items-center justify-between pt-3 mt-3 border-t text-xs font-semibold hover:underline"
                    style={{ borderColor: t.divider, color: t.mint }}
                  >
                    <span>View Academic Record</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
