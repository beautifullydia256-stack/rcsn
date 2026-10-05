import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Receipt,
  FileText,
  RefreshCw,
  Lock,
  Edit3,
  Check,
  AlertCircle,
  ArrowUpRight,
  Plus,
  BookOpen,
  Building,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { fetchFeeStructure, FEE_STRUCTURE_QUERY_KEY } from './api/feeStructure';
import { useAcademicPeriod } from '../../lib/academicPeriodTerminology';
import { RCSN_OFFICIAL_BANK_ACCOUNT } from '../../lib/rcsnBankDetails';
import {
  getTokens,
  cardGrad,
  fmtUGX,
  SORA,
  INTER,
} from '../../styles/posThemeTokens';
import PosEmptyState from '../../components/finance/pos/PosEmptyState';

const STALE_MS = 2 * 60 * 1000;

export default function FeeStructurePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const schoolId = useAuthStore((s) => s.schoolId);
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const t = getTokens(isDark);

  const { isTertiary, labels } = useAcademicPeriod();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: [...FEE_STRUCTURE_QUERY_KEY, schoolId],
    queryFn: () => fetchFeeStructure(schoolId!),
    enabled: !!schoolId,
    staleTime: STALE_MS,
    gcTime: 10 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const fees = data?.fees ?? [];
  const lockedSet = data?.lockedClasses ?? new Set<string>();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    const next: Record<string, string> = {};
    fees.forEach((r) => {
      next[`${r.id}_day`] = String(r.tuition_amount ?? '');
      next[`${r.id}_boarding`] = String(r.boarding_tuition_amount ?? '');
    });
    setEdits(next);
  }, [fees]);

  function setEdit(key: string, value: string) {
    setEdits((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(id: string) {
    if (!schoolId) return;
    const row = fees.find((f) => f.id === id);
    if (!row) return;
    const locked = lockedSet.has((row.class_name || '').trim().toLowerCase());
    if (locked) {
      setMessage({
        type: 'err',
        text: `This ${isTertiary ? 'programme' : 'class'} has issued invoices; fee cannot be changed to preserve audit trail.`,
      });
      return;
    }
    const rawDay = edits[`${id}_day`] ?? '';
    const rawBoarding = edits[`${id}_boarding`] ?? '';
    const numDay = Number(rawDay.replace(/,/g, ''));
    const numBoarding = Number(rawBoarding.replace(/,/g, ''));
    if (Number.isNaN(numDay) || numDay < 0 || Number.isNaN(numBoarding) || numBoarding < 0) {
      setMessage({ type: 'err', text: 'Enter valid numeric amounts.' });
      return;
    }
    setSavingId(id);
    setMessage(null);
    try {
      const { error } = await supabase
        .from('school_fee_structure')
        .update({
          tuition_amount: numDay,
          boarding_tuition_amount: numBoarding,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('school_id', schoolId);
      if (error) throw error;
      setMessage({ type: 'ok', text: 'Fee schedule updated.' });
      queryClient.invalidateQueries({ queryKey: ['accountant'] });
    } catch (e: unknown) {
      setMessage({ type: 'err', text: (e as Error).message || 'Failed to update.' });
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div
      style={{
        minHeight: '100%',
        background: t.screenBg,
        color: t.textHi,
        padding: '24px 28px 48px',
        fontFamily: INTER,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: SORA,
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: '-0.3px',
              color: t.textHi,
              marginBottom: 4,
            }}
          >
            {isTertiary ? 'Semester Tuition & Functional Fees' : 'Tuition & Functional Fees'}
          </div>
          <div style={{ fontSize: 12.5, color: t.textMid }}>
            Define base tuition and functional fees charged per {isTertiary ? 'programme/cohort' : 'class'} for automated billing
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => refetch()}
            title="Refresh"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 38,
              height: 38,
              borderRadius: 10,
              border: `1px solid ${t.stroke}`,
              background: t.panel,
              color: t.textMid,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => navigate('/dashboard/admin/settings/finance')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 15px',
              borderRadius: 10,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              background: t.panel,
              color: t.textHi,
              border: `1px solid ${t.stroke}`,
            }}
          >
            <Building size={15} color={t.blue} />
            <span>Financial Settings</span>
          </button>

          <button
            onClick={() => navigate('/dashboard/accountant/billing')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 800,
              fontFamily: SORA,
              cursor: 'pointer',
              border: 'none',
              background: `linear-gradient(135deg, ${t.ctaGradA}, ${t.ctaGradB})`,
              color: t.ctaText,
              boxShadow: '0 8px 22px rgba(61,232,160,0.28)',
            }}
          >
            <FileText size={16} />
            <span>Invoices & Billing</span>
          </button>
        </div>
      </div>

      {message && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            marginBottom: 16,
            fontSize: 12.5,
            fontWeight: 600,
            background: message.type === 'ok' ? t.mintDim : t.redDim,
            color: message.type === 'ok' ? t.mintInk : t.red,
            border: `1px solid ${message.type === 'ok' ? t.mintRing : t.redDim}`,
          }}
        >
          {message.text}
        </div>
      )}

      {/* Official RCSN Bank Collection Details Banner */}
      <div
        style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(6,78,59,0.2))'
            : 'linear-gradient(135deg, #f0fdf4, #ecfdf5)',
          border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: 14,
          padding: '14px 18px',
          marginBottom: 16,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'rgba(16,185,129,0.15)',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
            }}
          >
            <Building size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: isDark ? '#34d399' : '#065f46' }}>
                {RCSN_OFFICIAL_BANK_ACCOUNT.bankName} Official Collection Account
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: 'rgba(16,185,129,0.15)',
                  color: '#059669',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Official Circular
              </span>
            </div>
            <div style={{ fontSize: 12, color: t.textMid, marginTop: 2 }}>
              A/C Name:{' '}
              <strong style={{ color: t.textHi }}>{RCSN_OFFICIAL_BANK_ACCOUNT.accountName}</strong> | A/C No:{' '}
              <span
                style={{
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  fontSize: 13,
                  color: isDark ? '#6ee7b7' : '#047857',
                  padding: '1px 6px',
                  background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.7)',
                  borderRadius: 4,
                }}
              >
                {RCSN_OFFICIAL_BANK_ACCOUNT.accountNumber}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 12 }}>
          <div>
            <div style={{ fontSize: 10.5, color: t.textMuted, textTransform: 'uppercase', fontWeight: 600 }}>
              Min First Installment
            </div>
            <div style={{ fontWeight: 700, color: t.textHi }}>
              {RCSN_OFFICIAL_BANK_ACCOUNT.minimumFirstPayment}
            </div>
          </div>
          <div style={{ width: 1, height: 28, background: t.stroke }} />
          <div>
            <div style={{ fontSize: 10.5, color: t.textMuted, textTransform: 'uppercase', fontWeight: 600 }}>
              Bank Charge
            </div>
            <div style={{ fontWeight: 700, color: t.textHi }}>
              {RCSN_OFFICIAL_BANK_ACCOUNT.bankCharge}
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      {isLoading ? (
        <div
          style={{
            background: cardGrad(t),
            border: `1px solid ${t.stroke}`,
            borderRadius: 18,
            padding: 60,
            textAlign: 'center',
            color: t.textMid,
          }}
        >
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px', color: t.mint }} />
          <div>Loading fee schedule...</div>
        </div>
      ) : fees.length === 0 ? (
        <PosEmptyState
          icon={<Receipt size={36} color={t.mintInk} />}
          title="No fee structure configured"
          description={`Configure fees for classes and programmes in Admin Settings to enable automated invoice generation.`}
          accentColor="mint"
          action={{
            label: 'Configure Financial Settings',
            onClick: () => navigate('/dashboard/admin/settings/finance'),
            icon: <ArrowUpRight size={16} />,
          }}
        />
      ) : (
        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.stroke}`,
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr
                  style={{
                    borderBottom: `1px solid ${t.divider}`,
                    color: t.textLow,
                    textAlign: 'left',
                    background: t.cardGradA,
                  }}
                >
                  <th style={{ padding: '12px 18px', fontWeight: 700, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase' }}>
                    {isTertiary ? 'PROGRAMME / COHORT' : 'CLASS'}
                  </th>
                  <th style={{ padding: '12px 18px', fontWeight: 700, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase' }}>
                    DAY TUITION (UGX)
                  </th>
                  <th style={{ padding: '12px 18px', fontWeight: 700, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase' }}>
                    BOARDING TUITION (UGX)
                  </th>
                  <th style={{ padding: '12px 18px', fontWeight: 700, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase' }}>
                    AUDIT LOCK STATUS
                  </th>
                  <th style={{ padding: '12px 18px', fontWeight: 700, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase', textAlign: 'right' }}>
                    ACTION
                  </th>
                </tr>
              </thead>
              <tbody>
                {fees.map((r) => {
                  const locked = lockedSet.has((r.class_name || '').trim().toLowerCase());
                  const isSaving = savingId === r.id;
                  const isItem = r.class_name.startsWith('ITEM:');
                  const displayName = isItem
                    ? r.class_name.replace(/^ITEM:/, '').replace(/:/g, ' – ')
                    : r.class_name;

                  return (
                    <tr
                      key={r.id}
                      style={{
                        borderBottom: `1px solid ${t.divider}`,
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : '#F9FAFB';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <td style={{ padding: '14px 18px', fontWeight: 600, color: t.textHi }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>{displayName}</span>
                          {isItem && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                padding: '2px 6px',
                                borderRadius: 4,
                                background: t.blueDim,
                                color: t.blue,
                              }}
                            >
                              Levy Item
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Day Tuition */}
                      <td style={{ padding: '14px 18px' }}>
                        {locked ? (
                          <span style={{ fontFamily: SORA, fontWeight: 700, color: t.textHi }}>
                            UGX {fmtUGX(r.tuition_amount)}
                          </span>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ color: t.textLow, fontSize: 11 }}>UGX</span>
                            <input
                              type="text"
                              value={edits[`${r.id}_day`] ?? ''}
                              onChange={(e) => setEdit(`${r.id}_day`, e.target.value)}
                              placeholder="0"
                              style={{
                                background: t.fieldBg,
                                border: `1px solid ${t.stroke}`,
                                borderRadius: 8,
                                padding: '6px 10px',
                                fontSize: 12.5,
                                color: t.textHi,
                                width: 130,
                                outline: 'none',
                                fontFamily: SORA,
                                fontWeight: 700,
                              }}
                            />
                          </div>
                        )}
                      </td>

                      {/* Boarding Tuition */}
                      <td style={{ padding: '14px 18px' }}>
                        {isItem ? (
                          <span style={{ color: t.textLow, fontSize: 12 }}>—</span>
                        ) : locked ? (
                          <span style={{ fontFamily: SORA, fontWeight: 700, color: t.textHi }}>
                            UGX {fmtUGX(r.boarding_tuition_amount ?? 0)}
                          </span>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ color: t.textLow, fontSize: 11 }}>UGX</span>
                            <input
                              type="text"
                              value={edits[`${r.id}_boarding`] ?? ''}
                              onChange={(e) => setEdit(`${r.id}_boarding`, e.target.value)}
                              placeholder="0"
                              style={{
                                background: t.fieldBg,
                                border: `1px solid ${t.stroke}`,
                                borderRadius: 8,
                                padding: '6px 10px',
                                fontSize: 12.5,
                                color: t.textHi,
                                width: 130,
                                outline: 'none',
                                fontFamily: SORA,
                                fontWeight: 700,
                              }}
                            />
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        {locked ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '3px 9px',
                              borderRadius: 6,
                              background: t.warnDim,
                              color: t.warn,
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            <Lock size={12} />
                            <span>Locked (Invoices Issued)</span>
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '3px 9px',
                              borderRadius: 6,
                              background: t.mintDim,
                              color: t.mintInk,
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            <Edit3 size={12} />
                            <span>Editable</span>
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        {!locked && (
                          <button
                            type="button"
                            onClick={() => handleSave(r.id)}
                            disabled={isSaving}
                            style={{
                              padding: '6px 14px',
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 700,
                              fontFamily: SORA,
                              cursor: isSaving ? 'not-allowed' : 'pointer',
                              border: 'none',
                              background: `linear-gradient(135deg, ${t.ctaGradA}, ${t.ctaGradB})`,
                              color: t.ctaText,
                              opacity: isSaving ? 0.6 : 1,
                            }}
                          >
                            {isSaving ? 'Saving...' : 'Save'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
