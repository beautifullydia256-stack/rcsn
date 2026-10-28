import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  ShieldCheck,
  Award,
  Utensils,
  Plus,
  Printer,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  X,
  Calendar,
  Clock,
  QrCode,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import AdminPageWrapper from '@/components/layout/AdminPageWrapper';
import NativeModal from '@/components/NativeModal';
import '@/styles/government-system.css';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getTokens, cardGrad, SORA, INTER } from '@/styles/posThemeTokens';
import type {
  CardType,
  CardStatus,
  StudentServiceCard,
  StudentEligibilityItem,
} from '@/features/student-cards/types';
import {
  fetchServiceCards,
  fetchEligibleStudentsForCards,
  issueBatchCards,
  revokeCard,
  extendCardExpiry,
} from '@/features/student-cards/services/studentCardService';
import {
  StudentCardBadge,
  BatchPrintSheet,
} from '@/features/student-cards/components/StudentCardBadge';
import { supabase } from '@/lib/supabase';

export default function StudentCardsPage() {
  const navigate = useNavigate();
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);
  const schoolId = useAuthStore((s) => s.schoolId);
  const user = useAuthStore((s) => s.user);

  const [cards, setCards] = useState<StudentServiceCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolInfo, setSchoolInfo] = useState<{ name: string; badge_url?: string }>({
    name: 'School',
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [previewCard, setPreviewCard] = useState<StudentServiceCard | null>(null);
  const [batchPrintCards, setBatchPrintCards] = useState<StudentServiceCard[] | null>(null);
  const [extendExpiryCard, setExtendExpiryCard] = useState<StudentServiceCard | null>(null);
  const [newExpiryInput, setNewExpiryInput] = useState('');

  // Batch Wizard State
  const [batchType, setBatchType] = useState<CardType>('entrance');
  const [batchTitle, setBatchTitle] = useState('Term 1 School Entrance Pass');
  const [batchClass, setBatchClass] = useState('');
  const [minFeePercent, setMinFeePercent] = useState<number>(50);
  const [batchExpiry, setBatchExpiry] = useState<string>(() => {
    // Default 30 days ahead at 5:00 PM
    const d = new Date();
    d.setDate(d.getDate() + 30);
    d.setHours(17, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [classList, setClassList] = useState<string[]>([]);
  const [eligibilityList, setEligibilityList] = useState<StudentEligibilityItem[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [loadingEligibility, setLoadingEligibility] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);

  // Load School Info & Classes
  useEffect(() => {
    async function loadSchoolAndClasses() {
      if (!schoolId) return;
      try {
        const { data: sch } = await supabase
          .from('schools')
          .select('name, logo_url')
          .eq('school_id', schoolId)
          .maybeSingle();
        if (sch) setSchoolInfo({ name: sch.name || 'School', badge_url: (sch as { logo_url?: string | null }).logo_url || undefined });

        const { data: stClasses } = await supabase
          .from('students')
          .select('current_class')
          .eq('school_id', schoolId)
          .is('deleted_at', null);

        if (stClasses) {
          const unique = Array.from(
            new Set(stClasses.map((c) => c.current_class).filter(Boolean))
          ) as string[];
          unique.sort();
          setClassList(unique);
        }
      } catch (err) {
        console.error('Error loading school/classes:', err);
      }
    }
    loadSchoolAndClasses();
  }, [schoolId]);

  // Load Cards
  const loadCards = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const data = await fetchServiceCards(schoolId, {
        cardType: typeFilter,
        status: statusFilter,
      });
      setCards(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCards();
  }, [schoolId, typeFilter, statusFilter]);

  // Fetch Eligibility when wizard parameters change
  useEffect(() => {
    if (!showIssueModal || !schoolId) return;
    let active = true;
    setLoadingEligibility(true);

    fetchEligibleStudentsForCards(schoolId, batchClass || undefined, minFeePercent).then((items) => {
      if (!active) return;
      setEligibilityList(items);
      // Auto-select eligible students by default
      const eligible = new Set(items.filter((i) => i.is_eligible).map((i) => i.student_id));
      setSelectedStudentIds(eligible);
      setLoadingEligibility(false);
    });

    return () => {
      active = false;
    };
  }, [showIssueModal, schoolId, batchClass, minFeePercent]);

  // Update default title when type changes
  const handleTypeChange = (t: CardType) => {
    setBatchType(t);
    if (t === 'entrance') {
      setBatchTitle('Term 1 School Entrance Pass');
      setMinFeePercent(50);
    } else if (t === 'examination') {
      setBatchTitle('Mid-Term Examination Access Card');
      setMinFeePercent(0);
    } else if (t === 'meal') {
      setBatchTitle('Student Dining Hall Meal Card');
      setMinFeePercent(0);
    } else {
      setBatchTitle('Official Student Service Pass');
      setMinFeePercent(0);
    }
  };

  // Filter Cards for display
  const filteredCards = useMemo(() => {
    return cards.filter((c) => {
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;
      const nameMatch = c.student?.name?.toLowerCase().includes(query);
      const serialMatch = c.card_number.toLowerCase().includes(query);
      const admMatch = c.student?.admission_number?.toLowerCase().includes(query);
      return nameMatch || serialMatch || admMatch;
    });
  }, [cards, searchQuery]);

  // KPI Calculations
  const stats = useMemo(() => {
    const total = cards.length;
    const active = cards.filter((c) => c.status === 'active').length;
    const expired = cards.filter((c) => c.status === 'expired').length;
    const entrance = cards.filter((c) => c.card_type === 'entrance').length;
    const exam = cards.filter((c) => c.card_type === 'examination').length;
    const meal = cards.filter((c) => c.card_type === 'meal').length;
    return { total, active, expired, entrance, exam, meal };
  }, [cards]);

  // Handle Card Generation
  const handleGenerateCards = async () => {
    if (!schoolId) return;
    const selectedItems = eligibilityList.filter((s) => selectedStudentIds.has(s.student_id));
    if (selectedItems.length === 0) {
      alert('Please select at least one student to issue cards for.');
      return;
    }

    setIsIssuing(true);
    try {
      const res = await issueBatchCards(
        {
          school_id: schoolId,
          card_type: batchType,
          title: batchTitle,
          academic_term: 1,
          academic_year: new Date().getFullYear(),
          min_fee_percent_required: minFeePercent,
          expiry_date: new Date(batchExpiry).toISOString(),
          class_filter: batchClass || undefined,
        },
        selectedItems,
        user?.id
      );

      if (res.success) {
        setShowIssueModal(false);
        await loadCards();
        // Prompt to batch print
        if (confirm(`Successfully generated ${res.createdCards.length} cards! Would you like to view the printable sheet now?`)) {
          setBatchPrintCards(res.createdCards);
        }
      } else {
        alert(`Failed to issue cards: ${res.message || 'Unknown error'}`);
      }
    } finally {
      setIsIssuing(false);
    }
  };

  const handleRevoke = async (c: StudentServiceCard) => {
    if (confirm(`Are you sure you want to revoke card ${c.card_number} for ${c.student?.name}? It will immediately deny access upon scanning.`)) {
      await revokeCard(c.id);
      loadCards();
    }
  };

  const handleExtendExpiry = async () => {
    if (!extendExpiryCard || !newExpiryInput) return;
    const iso = new Date(newExpiryInput).toISOString();
    await extendCardExpiry(extendExpiryCard.id, iso);
    setExtendExpiryCard(null);
    loadCards();
  };

  return (
    <AdminPageWrapper>
      <div className="space-y-4">
        {/* ── 1. TOP HEADER (EXACTLY MATCHING GOVERNMENTSTUDENTSVIEW) ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
          <div className="flex items-center gap-3">
            <h1 className="text-[17px] font-bold tracking-tight text-[#111111] uppercase font-sans m-0">
              STUDENT IDENTITY CARDS & ACCESS PASSES
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-bold bg-[#EAEAEA] text-[#222222] border border-[#CCCCCC]">
              {filteredCards.length} {filteredCards.length === 1 ? 'CARD' : 'CARDS'}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={() => navigate('/dashboard/security/passes')}
              className="gov-btn gov-btn-sm"
              title="Gatehouse Scanner"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Gate Scanner</span>
            </button>

            {filteredCards.length > 0 && (
              <button
                type="button"
                onClick={() => setBatchPrintCards(filteredCards)}
                className="gov-btn gov-btn-sm"
                title="Batch Print Cards"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Batch Print ({filteredCards.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowIssueModal(true)}
              className="gov-btn gov-btn-sm gov-btn-primary"
              title="Issue New Cards"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Issue New Cards</span>
            </button>
          </div>
        </div>

        {/* ── 2. METRICS STRIP (6 BOXES) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="gov-card p-3 rounded-lg text-center">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#666666]">Total Issued</div>
            <div className="text-xl font-bold font-mono text-[#111111] mt-1">{stats.total}</div>
          </div>
          <div className="gov-card p-3 rounded-lg text-center">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#666666]">Active Passes</div>
            <div className="text-xl font-bold font-mono text-[#00873E] mt-1">{stats.active}</div>
          </div>
          <div className="gov-card p-3 rounded-lg text-center">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#666666]">Expired Cards</div>
            <div className="text-xl font-bold font-mono text-[#D9383A] mt-1">{stats.expired}</div>
          </div>
          <div className="gov-card p-3 rounded-lg text-center">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#666666]">Entrance Passes</div>
            <div className="text-xl font-bold font-mono text-[#111111] mt-1">{stats.entrance}</div>
          </div>
          <div className="gov-card p-3 rounded-lg text-center">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#666666]">Exam Cards</div>
            <div className="text-xl font-bold font-mono text-[#111111] mt-1">{stats.exam}</div>
          </div>
          <div className="gov-card p-3 rounded-lg text-center">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#666666]">Meal Cards</div>
            <div className="text-xl font-bold font-mono text-[#111111] mt-1">{stats.meal}</div>
          </div>
        </div>

        {/* ── 3. CONTROL BAR ── */}
        <div className="gov-control-bar justify-between">
          <div className="gov-control-bar-left">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#666666] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="SEARCH STUDENT / CARD NO..."
                className="gov-input pl-8 font-mono text-xs w-full"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="gov-select w-auto text-xs font-mono uppercase"
            >
              <option value="all">ALL CARD TYPES</option>
              <option value="entrance">ENTRANCE PASSES</option>
              <option value="examination">EXAMINATION CARDS</option>
              <option value="meal">MEAL CARDS</option>
              <option value="library">LIBRARY PASSES</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="gov-select w-auto text-xs font-mono uppercase"
            >
              <option value="all">ALL STATUSES</option>
              <option value="active">ACTIVE</option>
              <option value="expired">EXPIRED</option>
              <option value="revoked">REVOKED</option>
            </select>
          </div>

          <div className="gov-control-bar-right">
            <button
              type="button"
              onClick={loadCards}
              disabled={loading}
              className="gov-btn gov-btn-sm"
              title="Refresh card records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* ── 4. HIGH-DENSITY DATA TABLE ── */}
        <div className="gov-table-container">
          <table className="gov-table">
            <thead>
              <tr>
                <th>Card Serial</th>
                <th>Student Name</th>
                <th>Class / Cohort</th>
                <th>Card Type</th>
                <th>Fee Status</th>
                <th>Valid Until</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#666666] font-mono text-xs">
                    LOADING CARDS...
                  </td>
                </tr>
              ) : filteredCards.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#666666] font-mono text-xs">
                    NO ACCESS CARDS FOUND
                  </td>
                </tr>
              ) : (
                filteredCards.map((c) => {
                  const isExp = new Date(c.expiry_date) < new Date();
                  const effectiveStatus = c.status === 'revoked' ? 'revoked' : isExp ? 'expired' : 'active';

                  return (
                    <tr key={c.id} className="hover:bg-[#F9F9FB] transition-colors">
                      <td className="font-mono font-bold text-xs text-[#111111]">
                        {c.card_number}
                      </td>
                      <td>
                        <div className="font-bold text-[#111111]">{c.student?.name || 'Student'}</div>
                        <div className="font-mono text-[11px] text-[#555555]">{c.student?.admission_number || '—'}</div>
                      </td>
                      <td className="font-mono text-xs text-[#555555]">
                        {c.student?.current_class || '—'} {c.student?.stream ? `(${c.student.stream})` : ''}
                      </td>
                      <td>
                        <div className="font-semibold text-xs text-[#111111]">
                          {c.title}
                        </div>
                      </td>
                      <td>
                        <span className={`gov-tag ${c.fee_percentage_at_issuance >= 100 ? 'gov-tag-approved' : 'gov-tag-warned'}`}>
                          {c.fee_percentage_at_issuance}% PAID
                        </span>
                      </td>
                      <td className="font-mono text-xs text-[#555555]">
                        {new Date(c.expiry_date).toLocaleDateString()}
                      </td>
                      <td>
                        {effectiveStatus === 'active' ? (
                          <span className="gov-tag gov-tag-approved">ACTIVE</span>
                        ) : effectiveStatus === 'expired' ? (
                          <span className="gov-tag gov-tag-rejected">EXPIRED</span>
                        ) : (
                          <span className="gov-tag">REVOKED</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }} className="whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewCard(c)}
                            className="gov-btn gov-btn-sm"
                            title="Preview card"
                          >
                            <QrCode className="w-3 h-3" />
                            <span>Card</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setExtendExpiryCard(c);
                              setNewExpiryInput(new Date(c.expiry_date).toISOString().slice(0, 16));
                            }}
                            className="gov-btn gov-btn-sm"
                            title="Extend validity"
                          >
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Extend</span>
                          </button>
                          {effectiveStatus !== 'revoked' && (
                            <button
                              type="button"
                              onClick={() => handleRevoke(c)}
                              className="gov-btn gov-btn-sm"
                              title="Revoke access"
                            >
                              <X className="w-3 h-3 text-rose-600" />
                              <span>Revoke</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

        {/* BATCH ISSUANCE MODAL */}
        <NativeModal
          isOpen={showIssueModal}
          onClose={() => setShowIssueModal(false)}
          title="Issue Student Service Access Cards"
          subtitle="Create entrance cards with fee threshold gating, exam cards, or meal cards."
          icon={CreditCard}
          size="2xl"
        >
          <div className="flex flex-col gap-4 text-white">
            {/* Step 1: Card Type Selector */}
            <div>
              <label className="block text-xs font-bold text-white/90 mb-2">
                1. Select Card Type
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                <div
                  onClick={() => handleTypeChange('entrance')}
                  className={`p-3 rounded-xl border cursor-pointer text-center transition ${
                    batchType === 'entrance'
                      ? 'border-emerald-400 bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                      : 'border-white/15 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
                  <div className="text-xs font-bold text-white">Entrance Pass</div>
                  <div className="text-[10px] text-white/60 mt-0.5">Fee Gated Access</div>
                </div>

                <div
                  onClick={() => handleTypeChange('examination')}
                  className={`p-3 rounded-xl border cursor-pointer text-center transition ${
                    batchType === 'examination'
                      ? 'border-indigo-400 bg-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                      : 'border-white/15 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <Award className="w-5 h-5 text-indigo-400 mx-auto mb-1.5" />
                  <div className="text-xs font-bold text-white">Exam Card</div>
                  <div className="text-[10px] text-white/60 mt-0.5">Exam Room Entry</div>
                </div>

                <div
                  onClick={() => handleTypeChange('meal')}
                  className={`p-3 rounded-xl border cursor-pointer text-center transition ${
                    batchType === 'meal'
                      ? 'border-amber-400 bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                      : 'border-white/15 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <Utensils className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
                  <div className="text-xs font-bold text-white">Meal Card</div>
                  <div className="text-[10px] text-white/60 mt-0.5">Dining Hall</div>
                </div>
              </div>
            </div>

            {/* Step 2: Form fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">
                  Card Title / Heading *
                </label>
                <input
                  type="text"
                  value={batchTitle}
                  onChange={(e) => setBatchTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 hover:border-white/35 focus:border-white/70 focus:bg-black/40 backdrop-blur-sm text-white placeholder-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">
                  Target Class Group
                </label>
                <select
                  value={batchClass}
                  onChange={(e) => setBatchClass(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-slate-900/90 dark:bg-black/90 hover:border-white/35 focus:border-white/70 backdrop-blur-sm text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition"
                >
                  <option value="" className="bg-slate-900 text-white">All Classes ({classList.length} active)</option>
                  {classList.map((c) => (
                    <option key={c} value={c} className="bg-slate-900 text-white">
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Step 3: Fee Gating & Expiry */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">
                  Minimum Fee Threshold Required (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={minFeePercent}
                    onChange={(e) => setMinFeePercent(Number(e.target.value) || 0)}
                    className="w-20 px-3 py-2 rounded-xl border border-white/20 bg-black/25 hover:border-white/35 focus:border-white/70 focus:bg-black/40 backdrop-blur-sm text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition"
                  />
                  <span className="text-xs text-white/60">
                    {minFeePercent === 0
                      ? 'No fee gating required'
                      : `Only students with ≥${minFeePercent}% fees paid`}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">
                  Card Expiration Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={batchExpiry}
                  onChange={(e) => setBatchExpiry(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 hover:border-white/35 focus:border-white/70 focus:bg-black/40 backdrop-blur-sm text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Step 4: Live Eligible Students List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-white/90">
                  Students to Receive Cards ({selectedStudentIds.size} of {eligibilityList.length} selected)
                </label>
                <div className="flex gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setSelectedStudentIds(new Set(eligibilityList.map((s) => s.student_id)))}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold transition"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedStudentIds(
                        new Set(eligibilityList.filter((s) => s.is_eligible).map((s) => s.student_id))
                      )
                    }
                    className="text-indigo-400 hover:text-indigo-300 font-semibold transition"
                  >
                    Select Eligible Only
                  </button>
                </div>
              </div>

              <div className="max-h-52 overflow-y-auto rounded-xl border border-white/15 bg-black/25 divide-y divide-white/10">
                {loadingEligibility ? (
                  <div className="p-6 text-center text-white/60 text-xs">
                    Calculating fee percentages & eligibility...
                  </div>
                ) : eligibilityList.length === 0 ? (
                  <div className="p-6 text-center text-white/60 text-xs">
                    No students found in this selection.
                  </div>
                ) : (
                  eligibilityList.map((st) => {
                    const isChecked = selectedStudentIds.has(st.student_id);
                    return (
                      <div
                        key={st.student_id}
                        className={`flex items-center justify-between p-2.5 px-3 transition hover:bg-white/5 ${
                          isChecked ? 'bg-emerald-500/10' : ''
                        }`}
                      >
                        <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const next = new Set(selectedStudentIds);
                              if (e.target.checked) next.add(st.student_id);
                              else next.delete(st.student_id);
                              setSelectedStudentIds(next);
                            }}
                            className="rounded border-white/30 text-emerald-500 focus:ring-emerald-400"
                          />
                          <div className="truncate">
                            <span className="font-semibold text-white text-xs">{st.name}</span>
                            <span className="text-[11px] text-white/60 ml-2">
                              {st.current_class} {st.admission_number ? `(${st.admission_number})` : ''}
                            </span>
                          </div>
                        </label>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md border ${
                              st.is_eligible
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            }`}
                          >
                            {st.fee_percentage}% Fees Paid
                          </span>
                          {!st.is_eligible && (
                            <span className="text-[10px] text-rose-400 font-medium">Below threshold</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/15">
              <button
                type="button"
                onClick={() => setShowIssueModal(false)}
                className="px-4 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isIssuing || selectedStudentIds.size === 0}
                onClick={handleGenerateCards}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs shadow-[0_4px_16px_rgba(16,185,129,0.3)] transition active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              >
                {isIssuing ? 'Issuing...' : `Generate ${selectedStudentIds.size} Cards`}
              </button>
            </div>
          </div>
        </NativeModal>

        {/* PREVIEW SINGLE CARD MODAL */}
        <NativeModal
          isOpen={!!previewCard}
          onClose={() => setPreviewCard(null)}
          title="Official Access Card"
          subtitle={previewCard ? `Card: ${previewCard.card_number} (${previewCard.student?.name})` : undefined}
          icon={QrCode}
          size="md"
        >
          {previewCard && (
            <div className="flex flex-col items-center gap-4 text-white">
              <StudentCardBadge
                card={previewCard}
                schoolName={schoolInfo.name}
                schoolLogo={schoolInfo.badge_url}
              />

              <div className="flex gap-2.5 w-full mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setBatchPrintCards([previewCard]);
                    setPreviewCard(null);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs shadow-[0_4px_16px_rgba(16,185,129,0.3)] transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Single Card</span>
                </button>
              </div>
            </div>
          )}
        </NativeModal>

        {/* BATCH PRINT SHEET MODAL */}
        {batchPrintCards && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.85)',
              zIndex: 1100,
              overflowY: 'auto',
              padding: 24,
            }}
          >
            <div style={{ maxWidth: 840, margin: '0 auto', background: '#ffffff', borderRadius: 12, padding: 24 }}>
              <div className="print:hidden" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                    Print Preview — {batchPrintCards.length} Student Cards
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
                    Standard A4 printable 8-up layout. Ready for card lamination or badge clipping.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    style={{
                      background: '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 18px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Now</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchPrintCards(null)}
                    style={{
                      background: '#e2e8f0',
                      color: '#334155',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>

              <BatchPrintSheet
                cards={batchPrintCards}
                schoolName={schoolInfo.name}
                schoolLogo={schoolInfo.badge_url}
              />
            </div>
          </div>
        )}

        {/* EXTEND EXPIRY MODAL */}
        <NativeModal
          isOpen={!!extendExpiryCard}
          onClose={() => setExtendExpiryCard(null)}
          title="Extend Card Expiration"
          subtitle={extendExpiryCard ? `Card: ${extendExpiryCard.card_number} (${extendExpiryCard.student?.name})` : undefined}
          icon={Clock}
          size="sm"
        >
          {extendExpiryCard && (
            <div className="flex flex-col gap-3 text-white">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">
                  New Expiry Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={newExpiryInput}
                  onChange={(e) => setNewExpiryInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 hover:border-white/35 focus:border-white/70 focus:bg-black/40 backdrop-blur-sm text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition [color-scheme:dark]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/15">
                <button
                  type="button"
                  onClick={() => setExtendExpiryCard(null)}
                  className="px-4 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExtendExpiry}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs shadow-[0_4px_16px_rgba(16,185,129,0.3)] transition active:scale-95"
                >
                  Save & Renew
                </button>
              </div>
            </div>
          )}
        </NativeModal>
    </AdminPageWrapper>
  );
}
