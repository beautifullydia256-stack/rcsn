import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Utensils,
  Plus,
  Package,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  ArrowLeft,
  FileText,
  Printer,
  Trash2,
  Check,
  AlertCircle,
  Building2,
  Search,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';
import { fetchStoreItems } from '@/features/store-inventory/services/storeInventoryService';
import {
  createDailyStoreIndent,
  fetchDailyStoreIndents,
  confirmIndentDispatch,
  type StoreDailyIndent,
  type DailyIndentItemInput,
} from '@/features/store-inventory/services/storeIndentService';

export default function DailyIndentPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);
  const schoolId = useAuthStore((s) => s.schoolId) || '';
  const user = useAuthStore((s) => s.user);

  // Tomorrow as default date for daily kitchen planning
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const [activeTab, setActiveTab] = useState<'create' | 'dispatch' | 'history'>('dispatch');
  const [selectedDate, setSelectedDate] = useState<string>(tomorrowStr);
  const [targetHeadcount, setTargetHeadcount] = useState<number | string>(450);
  const [indentNotes, setIndentNotes] = useState('');
  const [requestItems, setRequestItems] = useState<DailyIndentItemInput[]>([
    { storeItemId: '', itemName: '', quantityRequested: 50, unitOfMeasure: 'kg' },
  ]);

  // Dispatch modal / action state
  const [dispatchIndent, setDispatchIndent] = useState<StoreDailyIndent | null>(null);
  const [actualDispatched, setActualDispatched] = useState<Record<string, number>>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Queries
  const { data: storeInventory = [] } = useQuery({
    queryKey: ['store-items', schoolId],
    queryFn: () => (schoolId ? fetchStoreItems(schoolId) : Promise.resolve([])),
    enabled: Boolean(schoolId),
  });

  const { data: indents = [], isLoading: indentsLoading } = useQuery({
    queryKey: ['daily-store-indents', schoolId],
    queryFn: () => (schoolId ? fetchDailyStoreIndents(schoolId) : Promise.resolve([])),
    enabled: Boolean(schoolId),
  });

  // Mutations
  const createIndentMutation = useMutation({
    mutationFn: async () => {
      const validItems = requestItems.filter((it) => it.storeItemId && it.quantityRequested > 0);
      if (validItems.length === 0) throw new Error('Please select at least one item with a valid quantity');

      return createDailyStoreIndent(schoolId, {
        requestedForDate: selectedDate,
        targetHeadcount: Number(targetHeadcount) || 0,
        requestedBy: user?.id || 'staff',
        requesterName: user?.user_metadata?.name || 'Head Cook',
        notes: indentNotes,
        items: validItems,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-store-indents', schoolId] });
      setSuccessMsg('✓ Daily store indent submitted successfully to the Storekeeper!');
      setActiveTab('dispatch');
      setIndentNotes('');
      setRequestItems([{ storeItemId: '', itemName: '', quantityRequested: 50, unitOfMeasure: 'kg' }]);
      setTimeout(() => setSuccessMsg(null), 5000);
    },
  });

  const dispatchMutation = useMutation({
    mutationFn: async () => {
      if (!dispatchIndent) return;
      const dispatchedList = dispatchIndent.items.map((it) => ({
        storeItemId: it.store_item_id,
        quantityIssued: actualDispatched[it.store_item_id] ?? it.quantity_requested,
      }));

      await confirmIndentDispatch(
        schoolId,
        dispatchIndent.id,
        user?.id || 'storekeeper',
        user?.user_metadata?.name || 'Storekeeper',
        dispatchedList
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-store-indents', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['store-items', schoolId] });
      setDispatchIndent(null);
      setSuccessMsg('✓ Storekeeper confirmed goods physical issuance! Quantities deducted from inventory.');
      setTimeout(() => setSuccessMsg(null), 5000);
    },
  });

  const pendingIndents = useMemo(() => indents.filter((i) => i.status === 'pending'), [indents]);
  const issuedIndents = useMemo(() => indents.filter((i) => i.status === 'issued'), [indents]);

  const handlePrintVoucher = (indent: StoreDailyIndent) => {
    window.print();
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: t.screenBg,
        color: t.textHi,
        padding: '24px 28px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <button
                type="button"
                onClick={() => navigate('/dashboard/admin/store')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: t.panel,
                  border: `1px solid ${t.stroke}`,
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: t.textMid,
                  cursor: 'pointer',
                }}
              >
                <ArrowLeft size={14} />
                Store Inventory
              </button>
              <span style={{ fontSize: '12px', color: t.textLow }}>/</span>
              <span style={{ fontSize: '12px', color: t.mint, fontWeight: 700 }}>Daily Store Indents</span>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: t.textHi }}>
              Daily Kitchen & Store Indent Station
            </h1>
            <p style={{ fontSize: '13px', color: t.textMid, margin: '4px 0 0 0' }}>
              Dynamic daily food requisitions adjusted for on-campus student counts and verified physical store dispatches.
            </p>
          </div>

          {/* Quick Action Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: t.panel, padding: '4px', borderRadius: '12px', border: `1px solid ${t.stroke}` }}>
            <button
              type="button"
              onClick={() => setActiveTab('dispatch')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'dispatch' ? t.mint : 'transparent',
                color: activeTab === 'dispatch' ? '#064E3B' : t.textMid,
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Package size={15} />
              Storekeeper Dispatch
              {pendingIndents.length > 0 && (
                <span style={{ padding: '1px 6px', borderRadius: '9999px', fontSize: '10px', background: activeTab === 'dispatch' ? '#064E3B' : t.gold, color: '#fff' }}>
                  {pendingIndents.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('create')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'create' ? t.mint : 'transparent',
                color: activeTab === 'create' ? '#064E3B' : t.textMid,
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Plus size={15} />
              New Kitchen Requisition
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'history' ? t.mint : 'transparent',
                color: activeTab === 'history' ? '#064E3B' : t.textMid,
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <FileText size={15} />
              Dispatch History
            </button>
          </div>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div
            style={{
              padding: '12px 18px',
              borderRadius: '12px',
              background: isDark ? 'rgba(16, 217, 168, 0.15)' : '#DCFCE7',
              border: `1px solid ${t.mint}`,
              color: isDark ? t.mint : '#065F46',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <CheckCircle2 size={18} />
            {successMsg}
          </div>
        )}

        {/* TAB 1: CREATE NEW REQUISITION */}
        {activeTab === 'create' && (
          <div
            style={{
              borderRadius: '20px',
              background: t.panel,
              border: `1px solid ${t.stroke}`,
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            <div style={{ borderBottom: `1px solid ${t.divider}`, paddingBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: t.textHi }}>
                Draft Daily Kitchen Store Indent
              </h2>
              <p style={{ fontSize: '13px', color: t.textMid, margin: '4px 0 0 0' }}>
                Specify food and supplies needed for tomorrow based on active on-campus student counts.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: t.textMid, marginBottom: '6px' }}>
                  Target Delivery Date *
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: t.fieldBg,
                    border: `1px solid ${t.stroke}`,
                    color: t.textHi,
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: t.textMid, marginBottom: '6px' }}>
                  Target Student Headcount (Present on Campus)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    placeholder="e.g. 450"
                    value={targetHeadcount}
                    onChange={(e) => setTargetHeadcount(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: t.fieldBg,
                      border: `1px solid ${t.stroke}`,
                      color: t.textHi,
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>
                <div style={{ fontSize: '11px', color: t.gold, marginTop: '4px' }}>
                  Adjust for cohorts currently on external hospital practicum
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: t.textMid, marginBottom: '6px' }}>
                  Requisition Notes / Meal Session
                </label>
                <input
                  type="text"
                  placeholder="e.g. Breakfast Porridge & Lunch Posho/Beans"
                  value={indentNotes}
                  onChange={(e) => setIndentNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: t.fieldBg,
                    border: `1px solid ${t.stroke}`,
                    color: t.textHi,
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Line Items Builder */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: t.textHi, textTransform: 'uppercase' }}>
                  Requested Supplies & Foodstuffs
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setRequestItems((p) => [
                      ...p,
                      { storeItemId: '', itemName: '', quantityRequested: 10, unitOfMeasure: 'kg' },
                    ])
                  }
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: t.panel,
                    border: `1px solid ${t.mint}`,
                    color: t.mint,
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Plus size={14} /> Add Line Item
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {requestItems.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 1fr auto',
                      gap: '12px',
                      alignItems: 'center',
                      padding: '12px',
                      borderRadius: '12px',
                      background: isDark ? 'rgba(255,255,255,0.02)' : '#F9FAFB',
                      border: `1px solid ${t.divider}`,
                    }}
                  >
                    <div>
                      <select
                        value={item.storeItemId}
                        onChange={(e) => {
                          const chosen = storeInventory.find((s) => s.id === e.target.value);
                          setRequestItems((prev) =>
                            prev.map((it, i) =>
                              i === idx
                                ? {
                                    ...it,
                                    storeItemId: e.target.value,
                                    itemName: chosen?.name || '',
                                    unitOfMeasure: chosen?.unit_of_measure || 'kg',
                                  }
                                : it
                            )
                          );
                        }}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          background: t.fieldBg,
                          border: `1px solid ${t.stroke}`,
                          color: t.textHi,
                          fontSize: '13px',
                          outline: 'none',
                        }}
                      >
                        <option value="">Select Item from Inventory...</option>
                        {storeInventory.map((si) => (
                          <option key={si.id} value={si.id}>
                            {si.name} (Current Stock: {si.current_stock} {si.unit_of_measure})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <input
                        type="number"
                        placeholder="Quantity"
                        value={item.quantityRequested}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setRequestItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, quantityRequested: val } : it))
                          );
                        }}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          background: t.fieldBg,
                          border: `1px solid ${t.stroke}`,
                          color: t.textHi,
                          fontSize: '13px',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div>
                      <input
                        type="text"
                        placeholder="Unit"
                        value={item.unitOfMeasure}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRequestItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, unitOfMeasure: val } : it))
                          );
                        }}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          background: t.fieldBg,
                          border: `1px solid ${t.stroke}`,
                          color: t.textHi,
                          fontSize: '13px',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setRequestItems((prev) => prev.filter((_, i) => i !== idx))}
                      disabled={requestItems.length <= 1}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: t.red,
                        cursor: requestItems.length <= 1 ? 'not-allowed' : 'pointer',
                        opacity: requestItems.length <= 1 ? 0.3 : 1,
                        padding: '6px',
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                type="button"
                disabled={createIndentMutation.isPending}
                onClick={() => createIndentMutation.mutate()}
                style={{
                  padding: '11px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: t.ctaGradA,
                  color: t.ctaText,
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: createIndentMutation.isPending ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 10px rgba(16, 217, 168, 0.25)',
                }}
              >
                {createIndentMutation.isPending ? 'Submitting Indent...' : 'Submit Daily Store Indent'}
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: STOREKEEPER DISPATCH STATION */}
        {activeTab === 'dispatch' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: t.textHi }}>
                Pending Store Indents ({pendingIndents.length})
              </h2>
              <span style={{ fontSize: '12px', color: t.textMid }}>
                Verify physical goods weighed & dispensed before signing off
              </span>
            </div>

            {pendingIndents.length === 0 ? (
              <div
                style={{
                  padding: '48px 20px',
                  textAlign: 'center',
                  background: t.panel,
                  borderRadius: '16px',
                  border: `1px solid ${t.stroke}`,
                }}
              >
                <CheckCircle2 size={40} color={t.mint} style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: '15px', fontWeight: 700, color: t.textHi }}>
                  All Daily Indents Cleared & Dispatched!
                </div>
                <div style={{ fontSize: '12px', color: t.textMid, marginTop: '4px' }}>
                  No pending food or supplies requests waiting for storekeeper physical issuance.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {pendingIndents.map((ind) => (
                  <div
                    key={ind.id}
                    style={{
                      borderRadius: '16px',
                      background: t.panel,
                      border: `1px solid ${t.strokeHi}`,
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            background: isDark ? 'rgba(245, 192, 68, 0.15)' : '#FEF3C7',
                            color: t.gold,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Clock size={20} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 800, color: t.textHi }}>
                              {ind.requisition_number}
                            </span>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: t.gold, background: isDark ? 'rgba(245, 192, 68, 0.2)' : '#FEF3C7', padding: '2px 8px', borderRadius: '4px' }}>
                              Pending Dispatch
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: t.textMid, marginTop: '2px' }}>
                            Requested for: <strong>{ind.requested_for_date}</strong> • By: {ind.requester_name}
                            {ind.target_headcount && ` • Target Headcount: ${ind.target_headcount} students`}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const initialActual: Record<string, number> = {};
                          ind.items.forEach((it) => {
                            initialActual[it.store_item_id] = it.quantity_requested;
                          });
                          setActualDispatched(initialActual);
                          setDispatchIndent(ind);
                        }}
                        style={{
                          padding: '9px 18px',
                          borderRadius: '8px',
                          border: 'none',
                          background: t.ctaGradA,
                          color: t.ctaText,
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(16, 217, 168, 0.25)',
                        }}
                      >
                        Weigh & Confirm Physical Dispatch
                      </button>
                    </div>

                    {ind.notes && (
                      <div style={{ fontSize: '12px', color: t.textMid, fontStyle: 'italic', background: t.fieldBg, padding: '8px 12px', borderRadius: '8px' }}>
                        Note: {ind.notes}
                      </div>
                    )}

                    {/* Table of items */}
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${t.divider}`, color: t.textLow, textTransform: 'uppercase', fontSize: '11px' }}>
                            <th style={{ padding: '8px 12px' }}>Supply Item</th>
                            <th style={{ padding: '8px 12px' }}>Quantity Requested</th>
                            <th style={{ padding: '8px 12px' }}>Unit</th>
                            <th style={{ padding: '8px 12px' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ind.items.map((it) => (
                            <tr key={it.id} style={{ borderBottom: `1px solid ${t.divider}` }}>
                              <td style={{ padding: '8px 12px', fontWeight: 700, color: t.textHi }}>{it.item_name}</td>
                              <td style={{ padding: '8px 12px', fontWeight: 600, color: t.mint }}>{it.quantity_requested}</td>
                              <td style={{ padding: '8px 12px', color: t.textMid }}>{it.unit_of_measure}</td>
                              <td style={{ padding: '8px 12px', color: t.gold, fontWeight: 600 }}>{it.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DISPATCH HISTORY & AUDIT */}
        {activeTab === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: t.textHi }}>
              Physical Store Dispatch Log & Audit History ({issuedIndents.length})
            </h2>

            <div style={{ borderRadius: '16px', background: t.panel, border: `1px solid ${t.stroke}`, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: t.fieldBg, borderBottom: `1px solid ${t.stroke}`, color: t.textLow, fontSize: '11px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '14px 18px' }}>Requisition Ref</th>
                      <th style={{ padding: '14px 18px' }}>Date Needed</th>
                      <th style={{ padding: '14px 18px' }}>Student Headcount</th>
                      <th style={{ padding: '14px 18px' }}>Dispensed Supplies</th>
                      <th style={{ padding: '14px 18px' }}>Issued By</th>
                      <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issuedIndents.map((ind) => (
                      <tr key={ind.id} style={{ borderBottom: `1px solid ${t.divider}` }}>
                        <td style={{ padding: '14px 18px', fontWeight: 800, color: t.textHi }}>
                          {ind.requisition_number}
                        </td>
                        <td style={{ padding: '14px 18px', color: t.textMid }}>
                          {ind.requested_for_date}
                        </td>
                        <td style={{ padding: '14px 18px', fontWeight: 600, color: t.gold }}>
                          {ind.target_headcount ? `${ind.target_headcount} students` : '—'}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {ind.items.map((it) => (
                              <span
                                key={it.id}
                                style={{
                                  fontSize: '11px',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  background: isDark ? 'rgba(255,255,255,0.04)' : '#F3F4F6',
                                  color: t.textHi,
                                }}
                              >
                                {it.item_name}: <strong>{it.quantity_issued} {it.unit_of_measure}</strong>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '14px 18px', fontSize: '12px', color: t.mint, fontWeight: 600 }}>
                          {ind.issuer_name || 'Storekeeper'}
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handlePrintVoucher(ind)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              border: `1px solid ${t.stroke}`,
                              background: t.panel,
                              color: t.textHi,
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            <Printer size={13} />
                            Issue Voucher
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Storekeeper Physical Dispatch Confirmation */}
        {dispatchIndent && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '20px',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '600px',
                borderRadius: '20px',
                background: t.panel,
                border: `1px solid ${t.strokeHi}`,
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '20px 24px', borderBottom: `1px solid ${t.divider}` }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: t.textHi }}>
                  Confirm Physical Goods Issuance
                </h2>
                <p style={{ fontSize: '12px', color: t.textMid, margin: '4px 0 0 0' }}>
                  Indent: {dispatchIndent.requisition_number} • Target Date: {dispatchIndent.requested_for_date}
                </p>
              </div>

              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: t.textHi }}>
                  Enter actual quantities physically weighed or released to the Cook:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {dispatchIndent.items.map((it) => (
                    <div
                      key={it.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1fr',
                        gap: '12px',
                        alignItems: 'center',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: t.fieldBg,
                        border: `1px solid ${t.stroke}`,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '13px', color: t.textHi }}>{it.item_name}</div>
                        <div style={{ fontSize: '11px', color: t.textLow }}>
                          Requested: {it.quantity_requested} {it.unit_of_measure}
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '10px', color: t.textLow, textTransform: 'uppercase', marginBottom: '2px' }}>
                          Actual Dispensed
                        </label>
                        <input
                          type="number"
                          value={actualDispatched[it.store_item_id] ?? it.quantity_requested}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setActualDispatched((prev) => ({ ...prev, [it.store_item_id]: val }));
                          }}
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            background: t.panel,
                            border: `1px solid ${t.strokeHi}`,
                            color: t.mint,
                            fontWeight: 800,
                            fontSize: '13px',
                            outline: 'none',
                          }}
                        />
                      </div>

                      <div style={{ fontSize: '12px', color: t.textMid, fontWeight: 600 }}>
                        {it.unit_of_measure}
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: isDark ? 'rgba(16, 217, 168, 0.1)' : '#DCFCE7',
                    border: `1px solid ${t.mint}`,
                    color: isDark ? t.mint : '#065F46',
                    fontSize: '12px',
                    lineHeight: 1.4,
                  }}
                >
                  Confirming this dispatch will instantly deduct the above quantities from current physical stock in the Store inventory.
                </div>
              </div>

              <div
                style={{
                  padding: '16px 24px',
                  borderTop: `1px solid ${t.divider}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '10px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setDispatchIndent(null)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: `1px solid ${t.stroke}`,
                    background: 'transparent',
                    color: t.textMid,
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={dispatchMutation.isPending}
                  onClick={() => dispatchMutation.mutate()}
                  style={{
                    padding: '9px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: t.ctaGradA,
                    color: t.ctaText,
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: dispatchMutation.isPending ? 'not-allowed' : 'pointer',
                  }}
                >
                  {dispatchMutation.isPending ? 'Deducting Stock...' : 'Confirm Physical Issuance'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
