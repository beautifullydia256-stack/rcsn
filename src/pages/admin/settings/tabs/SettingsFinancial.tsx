import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { registerApiUrl } from '@/lib/registerApiOrigin';
import SectionHeader from './SectionHeader';
import SchoolPayIntegrationCard from '../components/SchoolPayIntegrationCard';
import { settingsInsetSurface, settingsPrimaryActionClass, settingsSecondaryActionClass } from './settingsTabStyles';

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
  embedded,
}: {
  schoolId: string | null;
  classes: string[];
  embedded?: boolean;
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
        const syncResponse = await fetch(registerApiUrl('/api/admin/sync-student-balances'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schoolId }),
        });
        const syncResult = await syncResponse.json();
        if (syncResponse.ok) {
          const invN =
            (syncResult.invoicesCreated || 0) + (syncResult.invoicesUpdated || 0) > 0
              ? ` Invoices aligned: ${syncResult.invoicesCreated || 0} created, ${syncResult.invoicesUpdated || 0} updated.`
              : '';
          setSuccess(
            `Fee structure saved! ${syncResult.updated || 0} student(s) updated with new fees.${invN}`
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
          embedded={embedded}
          title="Financial Settings"
          desc="Configure tuition fees per class and admission/registration fees."
        />
        <div className="ac-text-muted">Loading fee structure...</div>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        embedded={embedded}
        title="Financial Settings"
        desc="Configure tuition fees per class and admission/registration fees. These will auto-populate when adding students."
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-400/40 bg-red-950/50 p-3 text-sm text-red-100">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-lg border border-emerald-400/35 bg-emerald-950/45 p-3 text-sm text-emerald-100">
          {success}
        </div>
      )}

      {displayFeeStatus && (
        <div
          className={`mb-4 rounded-lg border p-4 ${
            displayFeeStatus.status === 'fully_configured'
              ? 'border-emerald-400/40 bg-emerald-950/35'
              : displayFeeStatus.status === 'partially_configured'
                ? 'border-amber-400/45 bg-amber-950/35'
                : displayFeeStatus.status === 'not_configured'
                  ? 'border-orange-400/45 bg-orange-950/35'
                  : 'border-red-400/45 bg-red-950/35'
          }`}
        >
          <div className="mb-2 flex items-center justify-between">
            <h3
              className={`text-sm font-medium ${
                displayFeeStatus.status === 'fully_configured'
                  ? 'text-emerald-200'
                  : displayFeeStatus.status === 'partially_configured'
                    ? 'text-amber-100'
                    : displayFeeStatus.status === 'not_configured'
                      ? 'text-orange-100'
                      : 'text-red-100'
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
          <p className="mb-2 text-sm ac-text-secondary">{displayFeeStatus.description}</p>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs ac-text-muted">
            <span>
              Classes: {displayFeeStatus.configured_classes || 0}/{displayFeeStatus.total_classes || 0}{' '}
              configured
            </span>
            <span>{displayFeeStatus.action}</span>
          </div>
        </div>
      )}

      <div className={`mb-6 ${settingsInsetSurface} p-4 sm:p-5`}>
        <h3 className="mb-3 font-medium text-[#c4b5fd]">🎓 Admission/Registration Fee</h3>
        <p className="mb-3 text-sm ac-text-secondary">
          This one-time fee is charged when a new student is admitted to the school.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <label className="text-sm ac-text-secondary shrink-0">Amount (UGX):</label>
          <input
            type="number"
            min={0}
            value={admissionFee || ''}
            onChange={(e) => setAdmissionFee(e.target.value)}
            className="ac-input w-full max-w-xs min-h-[44px]"
            placeholder="e.g., 50000"
          />
        </div>
      </div>

      <div className={`mb-6 ${settingsInsetSurface} p-4 sm:p-5`}>
        <h3 className="mb-3 font-medium ac-text-primary">💰 Day Tuition Fees Per Class (Per Term)</h3>
        <p className="mb-4 text-sm ac-text-secondary">
          Set the tuition amount <strong>per term</strong> for each class. The yearly total will be
          calculated automatically (3 terms).
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classList.map((className) => (
            <div
              key={className}
              className="rounded-lg border border-[var(--pw-border)] bg-[var(--pw-s2)] p-4"
            >
              <label className="mb-2 block text-sm font-medium ac-text-primary">{className}</label>
              <div className="flex items-center gap-2">
                <span className="text-sm ac-text-muted">UGX</span>
                <input
                  type="number"
                  min={0}
                  value={feeStructure[className] || ''}
                  onChange={(e) => updateClassFee(className, e.target.value)}
                  className="ac-input min-h-[44px] flex-1"
                  placeholder="e.g., 100000"
                />
              </div>
              <p className="mt-1 text-xs ac-text-muted">
                {feeStructure[className] && parseInt(feeStructure[className], 10) > 0
                  ? `~UGX ${(parseInt(feeStructure[className], 10) * 3).toLocaleString()} per Year`
                  : 'Fee not configured'}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className={`mb-6 ${settingsInsetSurface} p-4 sm:p-5`}>
        <h3 className="mb-3 font-medium ac-text-primary">🏠 Boarding Fees Per Class (Per Term)</h3>
        <p className="mb-4 text-sm ac-text-secondary">
          Set the boarding fees <strong className="ac-text-primary">per term</strong> for each class.
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classList.map((className) => (
            <div
              key={className}
              className="rounded-lg border border-[var(--pw-teal, #10d9a8)]/25 bg-[var(--pw-s3)]/90 p-4"
            >
              <label className="mb-3 block text-sm font-medium" style={{ color: 'var(--pw-teal, #10d9a8)' }}>
                {className} - Boarding
              </label>
              <div className="mb-2">
                <label className="mb-1 block text-xs ac-text-secondary">
                  Boarding Tuition (UGX)
                </label>
                <input
                  type="number"
                  min={0}
                  value={feeStructure[`${className}_boarding_tuition`] || ''}
                  onChange={(e) =>
                    updateClassFee(`${className}_boarding_tuition`, e.target.value)
                  }
                  className="ac-input min-h-[44px] w-full text-sm"
                  placeholder="e.g., 150000"
                />
              </div>
              <div className="mt-2 rounded border border-[var(--pw-border)] bg-[var(--pw-s2)] p-2">
                <p className="text-xs ac-text-muted">
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

      <SchoolPayIntegrationCard schoolId={schoolId} />

      <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row sm:flex-wrap">
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
              const response = await fetch(registerApiUrl('/api/admin/sync-student-balances'), {
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
          className={settingsSecondaryActionClass}
        >
          🔄 Sync Student Balances
        </button>
        <button
          type="button"
          onClick={saveFeeStructure}
          disabled={saving}
          className={settingsPrimaryActionClass}
        >
          {saving ? 'Saving...' : 'Save Fee Structure'}
        </button>
      </div>

      <div className={`mt-6 ${settingsInsetSurface} p-4 sm:p-5`}>
        <h4 className="mb-2 text-sm font-medium" style={{ color: 'var(--pw-blue, #3d8ef8)' }}>
          ℹ️ How This Works
        </h4>
        <ul className="space-y-1 text-xs ac-text-muted">
          <li>• Set tuition fees for each class (per term amount)</li>
          <li>• System calculates yearly total (term amount × 3 terms)</li>
          <li>• When adding a student, select their class — fee auto-populates</li>
          <li>• Admission fee is one-time (charged when student joins)</li>
        </ul>
      </div>
    </div>
  );
}
