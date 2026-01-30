import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../lib/supabase';
import { useSnapshot } from '../../../hooks/useSnapshot';
import { GlassCard } from '../../../components/Glass/GlassCard';
import { GlassPanel } from '../../../components/Glass/GlassPanel';
import { Play, CheckCircle, XCircle, Loader } from 'lucide-react';

export default function BulkGenerator() {
  const [searchParams] = useSearchParams();
  const snapshotId = searchParams.get('snapshot') || '';
  const { user } = useAuthStore();
  const { snapshot, loading: snapshotLoading } = useSnapshot(snapshotId);
  
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

      if (rpcError) throw rpcError;
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Bulk Report Generation</h1>
        <GlassCard>
          <p className="text-muted-foreground">No snapshot selected. Please select a snapshot first.</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Bulk Report Generation</h1>

      <GlassCard title={`Snapshot: Term ${snapshot.term} ${snapshot.year}`}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status:</span>
            <span className={`font-semibold ${
              snapshot.status === 'locked' ? 'text-blue-600' : 
              snapshot.status === 'generated' ? 'text-green-600' : 
              'text-yellow-600'
            }`}>
              {snapshot.status.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Students:</span>
            <span className="font-semibold">{snapshot.student_count || 0}</span>
          </div>
        </div>
      </GlassCard>

      {error && (
        <GlassPanel variant="normal" className="p-4 bg-red-500/20 text-red-500">
          {error}
        </GlassPanel>
      )}

      {snapshot.status !== 'locked' && (
        <GlassPanel variant="normal" className="p-4 bg-yellow-500/20 text-yellow-600">
          Snapshot must be locked before generating reports. Please lock the snapshot first.
        </GlassPanel>
      )}

      {snapshot.status === 'locked' && (
        <>
          <GlassCard title="Template Selection">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Select Template</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="input-glass w-full"
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
          </GlassCard>

          <GlassCard title="Class Selection (Optional)">
            <div className="space-y-2">
              {classes.map((className) => (
                <label key={className} className="flex items-center gap-2">
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
                    className="rounded"
                  />
                  <span>{className}</span>
                </label>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <div className="space-y-4">
              {status === 'generating' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Generating reports...</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {progress.current} / {progress.total} students
                  </p>
                </div>
              )}

              {status === 'completed' && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span>Reports generated successfully!</span>
                </div>
              )}

              {status === 'error' && (
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="w-5 h-5" />
                  <span>Generation failed</span>
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={generating || snapshot.status !== 'locked'}
                className="btn-glass w-full flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                {generating ? 'Generating...' : 'Generate Reports'}
              </button>
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
}




