import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import SectionHeader from './SectionHeader';

const STALE_TIME_MS = 5 * 60 * 1000;

type FeeStatus = {
  status?: string;
  message?: string;
  description?: string;
  configured_classes?: number;
  total_classes?: number;
  action?: string;
} | null;

async function fetchFinancialSettings(schoolId: string): Promise<{
  feeStructure: Record<string, string>;
  admissionFee: string;
  feeStatus: FeeStatus;
}> {
  const { data, error: fetchError } = await supabase
    .from('school_fee_structure')
    .select('*')
    .eq('school_id', schoolId);
  if (fetchError) throw fetchError;

  const feeMap: Record<string, string> = {};
  let admFee = '';
  (data || []).forEach((fee: { class_name: string; tuition_amount?: number; boarding_tuition_amount?: number }) => {
    const amount = Number(fee.tuition_amount || 0);
    if (fee.class_name === 'ADMISSION') {
      admFee = amount > 0 ? amount.toString() : '';
    } else {
      feeMap[fee.class_name] = amount > 0 ? amount.toString() : '';
      feeMap[`${fee.class_name}_boarding_tuition`] =
        Number(fee.boarding_tuition_amount || 0) > 0 ? String(fee.boarding_tuition_amount) : '';
    }
  });

  let feeStatus: FeeStatus = null;
  try {
    const { data: statusData } = await supabase.rpc('get_fee_structure_status', { p_school_id: schoolId });
    feeStatus = statusData as FeeStatus;
  } catch {
    // RPC may not exist
  }
  return { feeStructure: feeMap, admissionFee: admFee, feeStatus };
}

export default function SettingsFinancial({
  schoolId,
  classes: classList,
}: {
  schoolId: string | null;
  classes: string[];
}) {
  const queryClient = useQueryClient();
  const [feeStructure, setFeeStructure] = useState<Record<string, string>>({});
  const [admissionFee, setAdmissionFee] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [feeStatus, setFeeStatus] = useState<FeeStatus>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'settings', 'financial', schoolId ?? ''],
    queryFn: () => fetchFinancialSettings(schoolId!),
    enabled: !!schoolId,
    staleTime: STALE_TIME_MS,
  });

  useEffect(() => {
    if (data) {
      setFeeStructure(data.feeStructure);
      setAdmissionFee(data.admissionFee);
      setFeeStatus(data.feeStatus);
    }
  }, [data]);

  const loading = isLoading;

  const saveFeeStructure = async () => {
    if (!schoolId) return;
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const feeRecords = classList.map((className) => ({
        school_id: schoolId,
        class_name: className,
        tuition_amount: parseInt(feeStructure[className] || '0', 10) || 0,
        boarding_tuition_amount:
          parseInt(feeStructure[`${className}_boarding_tuition`] || '0', 10) || 0,
      }));

      feeRecords.push({
        school_id: schoolId,
        class_name: 'ADMISSION',
        tuition_amount: parseInt(admissionFee || '0', 10) || 0,
        boarding_tuition_amount: 0,
      });

      const { error: upsertError } = await supabase
        .from('school_fee_structure')
        .upsert(feeRecords, { onConflict: 'school_id,class_name' });

      if (upsertError) throw upsertError;

      try {
        const { data: statusData } = await supabase.rpc('get_fee_structure_status', {
          p_school_id: schoolId,
        });
        setFeeStatus(statusData as typeof feeStatus);
      } catch {
        // ignore
      }

      try {
        const syncResponse = await fetch('/api/admin/sync-student-balances', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schoolId }),
        });
        const syncResult = await syncResponse.json();
        if (syncResponse.ok) {
          setSuccess(
            `Fee structure saved! ${syncResult.updated || 0} student(s) updated with new fees.`
          );
        } else {
          setSuccess('Fee structure saved successfully! (Balance sync will run in background)');
        }
      } catch {
        setSuccess('Fee structure saved successfully!');
      }

      setTimeout(() => setSuccess(null), 5000);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'financial', schoolId] });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save fee structure');
    } finally {
      setSaving(false);
    }
  };

  const updateClassFee = (className: string, value: string) => {
    setFeeStructure((prev) => ({ ...prev, [className]: value }));
  };

  const displayFeeStatus = feeStatus ?? data?.feeStatus;

  if (loading) {
    return (
      <div>
        <SectionHeader
          title="Financial Settings"
          desc="Configure tuition fees per class and admission/registration fees."
        />
        <div className="text-white/60">Loading fee structure...</div>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title="Financial Settings"
        desc="Configure tuition fees per class and admission/registration fees. These will auto-populate when adding students."
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-600/20 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-lg border border-green-500/30 bg-green-600/20 p-3 text-sm text-green-300">
          {success}
        </div>
      )}

      {displayFeeStatus && (
        <div
          className={`mb-4 rounded-lg border p-4 ${
            displayFeeStatus.status === 'fully_configured'
              ? 'border-green-500/30 bg-green-600/10'
              : displayFeeStatus.status === 'partially_configured'
                ? 'border-yellow-500/30 bg-yellow-600/10'
                : displayFeeStatus.status === 'not_configured'
                  ? 'border-orange-500/30 bg-orange-600/10'
                  : 'border-red-500/30 bg-red-600/10'
          }`}
        >
          <div className="mb-2 flex items-center justify-between">
            <h3
              className={`text-sm font-medium ${
                displayFeeStatus.status === 'fully_configured'
                  ? 'text-green-300'
                  : displayFeeStatus.status === 'partially_configured'
                    ? 'text-yellow-300'
                    : displayFeeStatus.status === 'not_configured'
                      ? 'text-orange-300'
                      : 'text-red-300'
              }`}
            >
              {displayFeeStatus.status === 'fully_configured'
                ? '✅'
                : displayFeeStatus.status === 'partially_configured'
                  ? '⚠️'
                  : displayFeeStatus.status === 'not_configured'
                    ? '🔧'
                    : '❌'}{' '}
              {displayFeeStatus.message}
            </h3>
          </div>
          <p className="mb-2 text-sm text-white/70">{displayFeeStatus.description}</p>
          <div className="flex items-center justify-between text-xs text-white/60">
            <span>
              Classes: {displayFeeStatus.configured_classes || 0}/{displayFeeStatus.total_classes || 0}{' '}
              configured
            </span>
            <span className="text-white/50">{displayFeeStatus.action}</span>
          </div>
        </div>
      )}

      <div className="mb-6 rounded-lg border border-purple-500/30 bg-purple-600/10 p-4">
        <h3 className="mb-3 font-medium text-purple-300">🎓 Admission/Registration Fee</h3>
        <p className="mb-3 text-sm text-white/60">
          This one-time fee is charged when a new student is admitted to the school.
        </p>
        <div className="flex items-center gap-3">
          <label className="text-sm text-white/80">Amount (UGX):</label>
          <input
            type="number"
            min={0}
            value={admissionFee || ''}
            onChange={(e) => setAdmissionFee(e.target.value)}
            className="w-48 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
            placeholder="e.g., 50000"
          />
        </div>
      </div>

      <div className="mb-6">
        <h3 className="mb-3 font-medium text-white">💰 Day Tuition Fees Per Class (Per Term)</h3>
        <p className="mb-4 text-sm text-white/60">
          Set the tuition amount <strong>per term</strong> for each class. The yearly total will be
          calculated automatically (3 terms).
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classList.map((className) => (
            <div
              key={className}
              className="rounded-lg border border-white/10 bg-white/5 p-4"
            >
              <label className="mb-2 block text-sm font-medium text-white/80">{className}</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/60">UGX</span>
                <input
                  type="number"
                  min={0}
                  value={feeStructure[className] || ''}
                  onChange={(e) => updateClassFee(className, e.target.value)}
                  className="flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
                  placeholder="e.g., 100000"
                />
              </div>
              <p className="mt-1 text-xs text-white/50">
                {feeStructure[className] && parseInt(feeStructure[className], 10) > 0
                  ? `~UGX ${(parseInt(feeStructure[className], 10) * 3).toLocaleString()} per Year`
                  : 'Fee not configured'}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <h3 className="mb-3 font-medium text-white">🏠 Boarding Fees Per Class (Per Term)</h3>
        <p className="mb-4 text-sm text-white/60">
          Set the boarding fees <strong>per term</strong> for each class.
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classList.map((className) => (
            <div
              key={className}
              className="rounded-lg border border-blue-500/30 bg-blue-600/10 p-4"
            >
              <label className="mb-3 block text-sm font-medium text-blue-300">
                {className} - Boarding
              </label>
              <div className="mb-2">
                <label className="mb-1 block text-xs text-white/70">
                  Boarding Tuition (UGX)
                </label>
                <input
                  type="number"
                  min={0}
                  value={feeStructure[`${className}_boarding_tuition`] || ''}
                  onChange={(e) =>
                    updateClassFee(`${className}_boarding_tuition`, e.target.value)
                  }
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white"
                  placeholder="e.g., 150000"
                />
              </div>
              <div className="mt-2 rounded bg-white/5 p-2">
                <p className="text-xs text-white/60">
                  {(() => {
                    const tuition = parseInt(
                      feeStructure[`${className}_boarding_tuition`] || '0',
                      10
                    );
                    return tuition > 0
                      ? `Total: UGX ${tuition.toLocaleString()}/term (~UGX ${(tuition * 3).toLocaleString()}/year)`
                      : 'Boarding fees not configured';
                  })()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={async () => {
            if (!schoolId) return;
            if (
              !confirm(
                'Manually sync balances for all students based on current fee structure?'
              )
            )
              return;
            setSaving(true);
            try {
              const response = await fetch('/api/admin/sync-student-balances', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ schoolId }),
              });
              const result = await response.json();
              if (response.ok) {
                setSuccess(`Synced ${result.updated || 0} student(s) with current fees!`);
                setTimeout(() => setSuccess(null), 5000);
              } else {
                setError(result.error || 'Failed to sync balances');
              }
            } catch (err: unknown) {
              setError(err instanceof Error ? err.message : 'Failed to sync balances');
            } finally {
              setSaving(false);
            }
          }}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          🔄 Sync Student Balances
        </button>
        <button
          type="button"
          onClick={saveFeeStructure}
          disabled={saving}
          className="rounded-lg bg-green-600 px-6 py-2 font-medium text-white hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Fee Structure'}
        </button>
      </div>

      <div className="mt-6 rounded-lg border border-blue-500/30 bg-blue-600/10 p-4">
        <h4 className="mb-2 text-sm font-medium text-blue-300">ℹ️ How This Works</h4>
        <ul className="space-y-1 text-xs text-white/60">
          <li>• Set tuition fees for each class (per term amount)</li>
          <li>• System calculates yearly total (term amount × 3 terms)</li>
          <li>• When adding a student, select their class — fee auto-populates</li>
          <li>• Admission fee is one-time (charged when student joins)</li>
        </ul>
      </div>
    </div>
  );
}
