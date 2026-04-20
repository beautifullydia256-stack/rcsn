import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../lib/supabase';
import { getFunctionInvokeErrorDetail } from '../../../lib/supabaseFunctionInvokeError';
import { useSnapshot } from '../../../hooks/useSnapshot';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';
import { Play, CheckCircle, XCircle, Loader } from 'lucide-react';

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
      <AdminPageWrapper title="Bulk Report Generation">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/30 border-t-white"></div>
        </div>
      </AdminPageWrapper>
    );
  }

  if (!snapshot) {
    return (
      <AdminPageWrapper title="Bulk Report Generation">
        <div className={`${adminCardClass} text-center py-8`}>
          <p className="text-white/85">No snapshot selected. Please select a snapshot from Snapshots first.</p>
        </div>
      </AdminPageWrapper>
    );
  }

  // When auto=1 (from Student Report Generator): show only "Generating reports..." then redirect to viewer
  if (autoRun) {
    return (
      <AdminPageWrapper title="Generating reports">
        <div className={`${adminCardClass} text-center py-12 space-y-6`}>
          {status === 'generating' && (
            <>
              <div className="flex justify-center">
                <Loader className="w-12 h-12 animate-spin text-blue-400" />
              </div>
              <p className="text-white font-medium">Generating reports...</p>
              <div className="w-full max-w-xs mx-auto bg-white/20 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <p className="text-sm text-white/70">{progress.current} / {progress.total} students</p>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle className="w-12 h-12 text-red-400 mx-auto" />
              <p className="text-red-400">{error}</p>
              <button
                type="button"
                onClick={() => navigate('/dashboard/admin/reports/generate')}
                className="rounded-lg bg-white/10 border border-white/20 px-4 py-2 text-white hover:bg-white/15"
              >
                Back to Report Generator
              </button>
            </>
          )}
          {status === 'idle' && snapshot?.status === 'locked' && (
            <>
              <div className="flex justify-center">
                <Loader className="w-12 h-12 animate-spin text-blue-400" />
              </div>
              <p className="text-white font-medium">Preparing...</p>
            </>
          )}
        </div>
      </AdminPageWrapper>
    );
  }

  return (
    <AdminPageWrapper title="Bulk Report Generation">
      <div className={`${adminCardClass} space-y-4`}>
        <h2 className="text-lg font-semibold text-white">Snapshot: Term {snapshot.term} {snapshot.year}</h2>
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/70">Status:</span>
          <span className={`font-semibold ${
            snapshot.status === 'locked' ? 'text-blue-400' :
            snapshot.status === 'generated' ? 'text-green-400' :
            'text-yellow-400'
          }`}>
            {snapshot.status.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/70">Students:</span>
          <span className="font-semibold text-white">{snapshot.student_count || 0}</span>
        </div>
      </div>

      {error && (
        <div className={`${adminCardClass} p-4 border-red-500/50`}>
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {snapshot.status !== 'locked' && (
        <div className={`${adminCardClass} p-4 border-yellow-500/50`}>
          <p className="text-yellow-400">Snapshot must be locked before generating reports. Please lock the snapshot first.</p>
        </div>
      )}

      {snapshot.status === 'locked' && (
        <>
          <div className={`${adminCardClass} space-y-4`}>
            <h2 className="text-lg font-semibold text-white">Template Selection</h2>
            <div>
              <label className="block text-sm font-medium text-white/85 mb-2">Select Template</label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={generating}
              >
                <option value="">-- Use Default Template --</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.is_default ? '(Default)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={`${adminCardClass} space-y-3`}>
            <h2 className="text-lg font-semibold text-white">Class Selection (Optional)</h2>
            <div className="space-y-2">
              {classes.map((className) => (
                <label key={className} className="flex items-center gap-2 text-white/85">
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
                    className="rounded border-white/30 text-blue-500"
                  />
                  <span>{className}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={`${adminCardClass} space-y-4`}>
            {status === 'generating' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-white/85">
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Generating reports...</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                    }}
                  />
                </div>
                <p className="text-sm text-white/70">
                  {progress.current} / {progress.total} students
                </p>
              </div>
            )}

            {status === 'completed' && (
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span>Reports generated successfully!</span>
              </div>
            )}

            {status === 'error' && (
              <div className="flex items-center gap-2 text-red-400">
                <XCircle className="w-5 h-5" />
                <span>Generation failed</span>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={generating || snapshot.status !== 'locked'}
              className="w-full rounded-xl border border-blue-500/50 bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              {generating ? 'Generating...' : 'Generate Reports'}
            </button>
          </div>
        </>
      )}
    </AdminPageWrapper>
  );
}




