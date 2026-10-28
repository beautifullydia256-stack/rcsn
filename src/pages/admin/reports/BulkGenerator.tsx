import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../lib/supabase';
import { getFunctionInvokeErrorDetail } from '../../../lib/supabaseFunctionInvokeError';
import { useSnapshot } from '../../../hooks/useSnapshot';
import AdminPageWrapper from '../../../components/layout/AdminPageWrapper';
import { Play, CheckCircle, XCircle, ArrowLeft, RefreshCw, FileText } from 'lucide-react';
import { GovPageLoader, GovRollingBox } from '@/components/ui/GovLoadingIndicator';
import '@/styles/government-system.css';

export default function BulkGenerator() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const snapshotId = searchParams.get('snapshot') || '';
  const autoRun = searchParams.get('auto') === '1';
  const { user } = useAuthStore();
  const { snapshot, loading: snapshotLoading } = useSnapshot(snapshotId);
  const autoRunDone = useRef(false);

  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [status, setStatus] = useState<'idle' | 'generating' | 'completed' | 'error'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!snapshotId || !user) return;

    const fetchData = async () => {
      // Get school ID
      const { data: userData } = await supabase
        .from('users')
        .select('school_id')
        .eq('user_id', user.id)
        .single();

      if (!userData?.school_id) return;

      // Get templates
      const { data: templatesData } = await supabase
        .from('report_templates')
        .select('*')
        .eq('school_id', userData.school_id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (templatesData) {
        setTemplates(templatesData);
        // Select default template
        const defaultTemplate = templatesData.find((t) => t.is_default);
        if (defaultTemplate) {
          setSelectedTemplate(defaultTemplate.id);
        }
      }

      // Get classes from snapshot data
      const { data: snapshotData } = await supabase
        .from('report_snapshot_data')
        .select('class_name')
        .eq('snapshot_id', snapshotId);

      if (snapshotData) {
        const uniqueClasses = [...new Set(snapshotData.map((d: any) => d.class_name))];
        setClasses(uniqueClasses);
        setSelectedClasses(uniqueClasses); // Select all by default
      }
    };

    fetchData();
  }, [snapshotId, user]);

  // When coming from Student Report Generator with auto=1: run generation and redirect to viewer (no form)
  useEffect(() => {
    if (!autoRun || !snapshotId || !snapshot || snapshot.status !== 'locked' || autoRunDone.current) return;

    const runAndRedirect = async () => {
      autoRunDone.current = true;
      setGenerating(true);
      setStatus('generating');
      setError('');
      setProgress({ current: 0, total: snapshot.student_count || 0 });

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const { data, error: rpcError } = await supabase.functions.invoke('generate-reports-bulk', {
          body: { snapshotId },
        });

        if (rpcError) throw new Error(await getFunctionInvokeErrorDetail(rpcError));
        if (!data?.success) throw new Error(data?.error || 'Generation failed');

        setStatus('completed');
        setProgress({ current: data.generatedCount || 0, total: data.totalStudents || 0 });
        navigate(`/dashboard/admin/reports/viewer?snapshot=${snapshotId}`, { replace: true });
      } catch (err: any) {
        setError(err.message || 'Generation failed');
        setStatus('error');
      } finally {
        setGenerating(false);
      }
    };

    runAndRedirect();
  }, [autoRun, snapshotId, snapshot, navigate]);

  const handleGenerate = async () => {
    if (!snapshotId) {
      setError('No snapshot selected');
      return;
    }

    if (snapshot?.status !== 'locked') {
      setError('Snapshot must be locked before generation');
      return;
    }

    setGenerating(true);
    setStatus('generating');
    setError('');
    setProgress({ current: 0, total: snapshot?.student_count || 0 });

    try {
      // Call Edge Function for bulk generation
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error: rpcError } = await supabase.functions.invoke('generate-reports-bulk', {
        body: {
          snapshotId,
          templateId: selectedTemplate || undefined,
          classNames: selectedClasses.length < classes.length ? selectedClasses : undefined,
        },
      });

      if (rpcError) throw new Error(await getFunctionInvokeErrorDetail(rpcError));
      if (!data?.success) throw new Error(data?.error || 'Generation failed');

      setStatus('completed');
      setProgress({ current: data.generatedCount || 0, total: data.totalStudents || 0 });
    } catch (err: any) {
      setError(err.message || 'Generation failed');
      setStatus('error');
    } finally {
      setGenerating(false);
    }
  };

  if (snapshotLoading) {
    return (
      <div className="admin-terminal-page space-y-5 p-4">
        <GovPageLoader message="LOADING REPORT SNAPSHOT SPECIFICATION & METADATA..." minHeight="min-h-[40vh]" />
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="admin-terminal-page space-y-5 p-4">
        <div className="gov-card p-8 text-center space-y-3">
          <p className="font-mono text-sm uppercase text-[#111111] font-bold">NO VALID SNAPSHOT SPECIFIED</p>
          <p className="font-mono text-xs text-[#555555]">
            Please select an active academic snapshot from the Snapshot Registry before initializing batch generation.
          </p>
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/reports/generate')}
            className="gov-btn gov-btn-secondary gov-btn-sm font-mono mt-2"
          >
            RETURN TO REPORT GENERATOR
          </button>
        </div>
      </div>
    );
  }

  // When auto=1 (from Student Report Generator): show only "Generating reports..." then redirect to viewer
  if (autoRun) {
    return (
      <div className="admin-terminal-page space-y-5 p-4">
        <div className="border-b border-[#CCCCCC] pb-4">
          <h1 className="text-xl font-bold tracking-tight text-[#111111] uppercase font-mono">
            AUTOMATED BATCH GENERATION DISPATCH
          </h1>
          <p className="text-xs text-[#555555] font-mono tracking-wider uppercase mt-0.5">
            REPUBLIC OF UGANDA • RAKAI COMMUNITY SCHOOL OF NURSING
          </p>
        </div>

        <div className="gov-card p-8 text-center space-y-4">
          {status === 'generating' && (
            <>
              <div className="flex justify-center py-2">
                <GovRollingBox size="md" />
              </div>
              <p className="font-mono text-sm font-bold text-[#111111] uppercase">
                PROCESSING BATCH REPORT GENERATION...
              </p>
              <div className="w-full max-w-md mx-auto bg-[#E5E7EB] h-2.5 border border-[#CCCCCC]">
                <div
                  className="bg-[#111111] h-full transition-all duration-300"
                  style={{
                    width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <p className="text-xs font-mono text-[#555555]">
                {progress.current} / {progress.total} CANDIDATES COMPILED
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="flex justify-center py-2 text-rose-600">
                <XCircle className="w-8 h-8" />
              </div>
              <p className="font-mono text-xs font-bold text-rose-700 uppercase">{error}</p>
              <button
                type="button"
                onClick={() => navigate('/dashboard/admin/reports/generate')}
                className="gov-btn gov-btn-secondary gov-btn-sm font-mono"
              >
                BACK TO REPORT GENERATOR
              </button>
            </>
          )}

          {status === 'idle' && snapshot?.status === 'locked' && (
            <>
              <div className="flex justify-center py-2">
                <GovRollingBox size="sm" />
              </div>
              <p className="font-mono text-xs text-[#555555] uppercase">INITIALIZING BATCH ENGINE WORKERS...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-terminal-page space-y-5 p-4">
      {/* ── 1. TOP HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#CCCCCC] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#111111] uppercase font-mono">
            INSTITUTIONAL BATCH RESULT SLIP & TRANSCRIPT ENGINE
          </h1>
          <p className="text-xs text-[#555555] font-mono tracking-wider uppercase mt-0.5">
            EXAMINATION RECORD SNAPSHOT PROCESSOR • REPUBLIC OF UGANDA
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/dashboard/admin/reports/generate')}
          className="gov-btn gov-btn-secondary gov-btn-sm flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>BACK TO DESK</span>
        </button>
      </div>

      {/* ── 2. MONOCHROME KPI SUMMARY METRIC CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            ACADEMIC CYCLE
          </div>
          <div className="text-xl font-bold font-mono text-[#111111] mt-1">
            TERM {snapshot.term} {snapshot.year}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            TARGET REGISTRATION
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            CANDIDATE COHORT
          </div>
          <div className="text-xl font-bold font-mono text-[#111111] mt-1">
            {snapshot.student_count || 0}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            STUDENTS IN SNAPSHOT
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            SNAPSHOT STATUS
          </div>
          <div className={`text-xl font-bold font-mono mt-1 ${
            snapshot.status === 'locked' ? 'text-emerald-700' :
            snapshot.status === 'generated' ? 'text-blue-700' :
            'text-amber-700'
          }`}>
            {snapshot.status.toUpperCase()}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            {snapshot.status === 'locked' ? 'READY FOR BATCH RUN' : 'ACTION REQUIRED'}
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            ENGINE STATE
          </div>
          <div className="text-xl font-bold font-mono text-[#111111] mt-1 uppercase">
            {status}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            {progress.current} / {progress.total} COMPILED
          </div>
        </div>
      </div>

      {error && (
        <div className="gov-card p-3 border-l-4 border-l-rose-600 bg-rose-50 flex items-center gap-2">
          <XCircle className="w-4 h-4 text-rose-700 shrink-0" />
          <p className="text-xs font-mono text-rose-800 uppercase font-semibold">{error}</p>
        </div>
      )}

      {snapshot.status !== 'locked' && (
        <div className="gov-card p-3 border-l-4 border-l-amber-500 bg-amber-50 flex items-center gap-2">
          <p className="text-xs font-mono text-amber-900 uppercase">
            CRITICAL NOTICE: Snapshot must be officially locked before batch processing to guarantee data integrity.
          </p>
        </div>
      )}

      {snapshot.status === 'locked' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Template Configuration */}
          <div className="gov-card p-4 space-y-3">
            <h2 className="text-xs font-bold font-mono uppercase text-[#111111] border-b border-[#E5E7EB] pb-2">
              1. OFFICIAL DOCUMENT TEMPLATE
            </h2>
            <div>
              <label className="block text-xs font-mono uppercase text-[#555555] mb-1.5">
                SELECT TEMPLATE SCHEME
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="gov-input w-full text-xs font-mono"
                disabled={generating}
              >
                <option value="">-- USE STANDARD GOVERNMENT TEMPLATE --</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.is_default ? '(OFFICIAL DEFAULT)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Class Cohorts */}
          <div className="gov-card p-4 space-y-3">
            <h2 className="text-xs font-bold font-mono uppercase text-[#111111] border-b border-[#E5E7EB] pb-2">
              2. COHORT FILTER SELECTION (OPTIONAL)
            </h2>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {classes.length === 0 ? (
                <p className="text-xs font-mono text-[#777777] italic">All enrolled classes will be processed.</p>
              ) : (
                classes.map((className) => (
                  <label key={className} className="flex items-center gap-2 text-xs font-mono text-[#111111] cursor-pointer hover:bg-[#F9F9FB] p-1 border border-transparent hover:border-[#CCCCCC]">
                    <input
                      type="checkbox"
                      checked={selectedClasses.includes(className)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedClasses([...selectedClasses, className]);
                        } else {
                          setSelectedClasses(selectedClasses.filter((c) => c !== className));
                        }
                      }}
                      disabled={generating}
                      className="rounded-none border-[#000000] text-[#111111] focus:ring-0"
                    />
                    <span>{className}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Execution Panel */}
      {snapshot.status === 'locked' && (
        <div className="gov-card p-4 space-y-4">
          {status === 'generating' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono text-[#111111]">
                <GovRollingBox size="sm" />
                <span className="font-bold uppercase">BATCH GENERATION IN PROGRESS...</span>
              </div>
              <div className="w-full bg-[#E5E7EB] h-2 border border-[#CCCCCC]">
                <div
                  className="bg-[#111111] h-full transition-all"
                  style={{
                    width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <p className="text-xs font-mono text-[#555555]">
                {progress.current} / {progress.total} CANDIDATES COMPILED
              </p>
            </div>
          )}

          {status === 'completed' && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-800 text-xs font-mono font-bold">
                <CheckCircle className="w-4 h-4 text-emerald-700" />
                <span>BATCH GENERATION COMPLETED: {progress.current} RECORDS COMPILED</span>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/dashboard/admin/reports/viewer?snapshot=${snapshotId}`)}
                className="gov-btn gov-btn-primary gov-btn-sm font-mono text-xs"
              >
                VIEW COMPILED ARCHIVE
              </button>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E5E7EB]">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || snapshot.status !== 'locked'}
              className="gov-btn gov-btn-primary gov-btn-md flex items-center gap-2 font-mono"
            >
              {generating ? (
                <>
                  <GovRollingBox size="sm" />
                  <span>PROCESSING BATCH...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>START BATCH GENERATION</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
