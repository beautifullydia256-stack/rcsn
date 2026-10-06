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
      <div style={{ width: '100%', maxWidth: 'none', padding: '24px 32px', boxSizing: 'border-box' }}>
        {/* Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                  color: '#10b981',
                  background: 'rgba(16, 185, 129, 0.1)',
                  padding: '2px 8px',
                  borderRadius: 4,
                }}
              >
                Access Control & Security
              </span>
              <span style={{ fontSize: 12, color: tk.subText }}>Digital & Printable Smart Cards</span>
            </div>
            <h1 style={{ fontFamily: SORA, fontSize: 26, fontWeight: 700, color: tk.text, margin: 0 }}>
              Student Service Access Cards
            </h1>
            <p style={{ fontFamily: INTER, fontSize: 13, color: tk.subText, margin: '4px 0 0' }}>
              Issue and verify secure School Entrance Passes, Examination Cards, and Meal Cards with fee gating & QR verification.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => navigate('/dashboard/security/passes')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: isDark ? '#1e293b' : '#f1f5f9',
                color: tk.text,
                border: `1px solid ${tk.cardBorder}`,
                padding: '9px 16px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span>Gatehouse Scanner</span>
            </button>

            {filteredCards.length > 0 && (
              <button
                type="button"
                onClick={() => setBatchPrintCards(filteredCards)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: isDark ? '#1e293b' : '#f1f5f9',
                  color: tk.text,
                  border: `1px solid ${tk.cardBorder}`,
                  padding: '9px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Printer className="w-4 h-4" />
                <span>Batch Print Cards</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowIssueModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#10b981',
                color: '#ffffff',
                border: 'none',
                padding: '9px 18px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              }}
            >
              <Plus className="w-4 h-4" />
              <span>Issue New Cards</span>
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
          <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 12, color: tk.subText, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Total Issued</span>
              <CreditCard className="w-4 h-4 text-emerald-400" />
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: tk.text, marginTop: 4 }}>{stats.total}</div>
            <div style={{ fontSize: 11, color: '#10b981', marginTop: 2 }}>All access cards</div>
          </div>

          <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 12, color: tk.subText, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Active Passes</span>
              <CheckCircle2 className="w-4 h-4 text-teal-400" />
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981', marginTop: 4 }}>{stats.active}</div>
            <div style={{ fontSize: 11, color: tk.subText, marginTop: 2 }}>Valid access granted</div>
          </div>

          <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 12, color: tk.subText, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Expired Cards</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: stats.expired > 0 ? '#f43f5e' : tk.text, marginTop: 4 }}>
              {stats.expired}
            </div>
            <div style={{ fontSize: 11, color: tk.subText, marginTop: 2 }}>Past validity date</div>
          </div>

          <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 12, color: tk.subText, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Entrance Passes</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: tk.text, marginTop: 4 }}>{stats.entrance}</div>
            <div style={{ fontSize: 11, color: tk.subText, marginTop: 2 }}>Gate / Fee cleared</div>
          </div>

          <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 12, color: tk.subText, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Exam Cards</span>
              <Award className="w-4 h-4 text-indigo-400" />
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: tk.text, marginTop: 4 }}>{stats.exam}</div>
            <div style={{ fontSize: 11, color: tk.subText, marginTop: 2 }}>Exam room entry</div>
          </div>

          <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 12, color: tk.subText, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Meal Cards</span>
              <Utensils className="w-4 h-4 text-amber-400" />
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: tk.text, marginTop: 4 }}>{stats.meal}</div>
            <div style={{ fontSize: 11, color: tk.subText, marginTop: 2 }}>Dining hall access</div>
          </div>
        </div>

        {/* Toolbar & Filter Bar */}
        <div
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${tk.cardBorder}`,
            borderRadius: 12,
            padding: '14px 18px',
            marginBottom: 20,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: 360 }}>
              <Search className="w-4 h-4" style={{ position: 'absolute', left: 12, top: 11, color: tk.subText }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student name or serial..."
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: 8,
                  background: isDark ? '#1e293b' : '#f8fafc',
                  border: `1px solid ${tk.cardBorder}`,
                  color: tk.text,
                  fontSize: 13,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                background: isDark ? '#1e293b' : '#f8fafc',
                border: `1px solid ${tk.cardBorder}`,
                color: tk.text,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              <option value="all">All Card Types</option>
              <option value="entrance">Entrance Passes (Gate)</option>
              <option value="examination">Examination Cards</option>
              <option value="meal">Meal Cards</option>
              <option value="library">Library Passes</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                background: isDark ? '#1e293b' : '#f8fafc',
                border: `1px solid ${tk.cardBorder}`,
                color: tk.text,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active (Valid)</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={loadCards}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                background: 'transparent',
                border: `1px solid ${tk.cardBorder}`,
                color: tk.subText,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
              }}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Cards Table */}
        <div
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${tk.cardBorder}`,
            borderRadius: 14,
            overflow: 'hidden',
          }}
        >
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: tk.subText }}>Loading cards...</div>
          ) : filteredCards.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <CreditCard className="w-12 h-12 text-slate-400" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ margin: 0, fontSize: 16, color: tk.text }}>No service access cards found</h3>
              <p style={{ margin: '6px 0 16px', fontSize: 13, color: tk.subText }}>
                Create entrance passes, examination cards, or meal cards to get started.
              </p>
              <button
                type="button"
                onClick={() => setShowIssueModal(true)}
                style={{
                  background: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Issue First Batch
              </button>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderBottom: `1px solid ${tk.cardBorder}` }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: tk.subText }}>Card Number</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: tk.subText }}>Student</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: tk.subText }}>Class</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: tk.subText }}>Card Type & Title</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: tk.subText }}>Fee Clearance</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: tk.subText }}>Validity / Expiry</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: tk.subText }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: tk.subText, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCards.map((c) => {
                  const isExp = new Date(c.expiry_date) < new Date();
                  const effectiveStatus = c.status === 'revoked' ? 'revoked' : isExp ? 'expired' : 'active';

                  return (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: `1px solid ${tk.cardBorder}`,
                        transition: 'background 0.1s',
                      }}
                    >
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 700, color: '#10b981' }}>
                        {c.card_number}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: tk.text }}>{c.student?.name || 'Student'}</div>
                        <div style={{ fontSize: 11, color: tk.subText }}>{c.student?.admission_number || '—'}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: tk.text }}>
                        {c.student?.current_class || '—'} {c.student?.stream ? `(${c.student.stream})` : ''}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {c.card_type === 'entrance' ? (
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          ) : c.card_type === 'examination' ? (
                            <Award className="w-4 h-4 text-indigo-400" />
                          ) : (
                            <Utensils className="w-4 h-4 text-amber-400" />
                          )}
                          <span style={{ fontWeight: 600, color: tk.text }}>{c.title}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: c.fee_percentage_at_issuance >= 100 ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                            color: c.fee_percentage_at_issuance >= 100 ? '#10b981' : '#f59e0b',
                          }}
                        >
                          {c.fee_percentage_at_issuance}% Paid
                          {c.min_fee_percent_required > 0 ? ` (≥${c.min_fee_percent_required}%)` : ''}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: 12, color: isExp ? '#f43f5e' : tk.text, fontWeight: isExp ? 700 : 500 }}>
                          {new Date(c.expiry_date).toLocaleDateString()} {new Date(c.expiry_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 6,
                            textTransform: 'uppercase',
                            background:
                              effectiveStatus === 'active'
                                ? 'rgba(16, 185, 129, 0.15)'
                                : effectiveStatus === 'expired'
                                ? 'rgba(244, 63, 94, 0.15)'
                                : 'rgba(148, 163, 184, 0.15)',
                            color:
                              effectiveStatus === 'active'
                                ? '#10b981'
                                : effectiveStatus === 'expired'
                                ? '#f43f5e'
                                : tk.subText,
                          }}
                        >
                          {effectiveStatus}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => setPreviewCard(c)}
                            title="View / Print Card"
                            style={{
                              background: 'transparent',
                              border: `1px solid ${tk.cardBorder}`,
                              color: tk.text,
                              padding: '5px 8px',
                              borderRadius: 6,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 12,
                            }}
                          >
                            <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Preview</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setExtendExpiryCard(c);
                              setNewExpiryInput(new Date(c.expiry_date).toISOString().slice(0, 16));
                            }}
                            title="Extend Expiry"
                            style={{
                              background: 'transparent',
                              border: `1px solid ${tk.cardBorder}`,
                              color: tk.text,
                              padding: '5px 8px',
                              borderRadius: 6,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 12,
                            }}
                          >
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>Extend</span>
                          </button>

                          {effectiveStatus !== 'revoked' && (
                            <button
                              type="button"
                              onClick={() => handleRevoke(c)}
                              title="Revoke Card"
                              style={{
                                background: 'transparent',
                                border: '1px solid rgba(244, 63, 94, 0.3)',
                                color: '#f43f5e',
                                padding: '5px 8px',
                                borderRadius: 6,
                                cursor: 'pointer',
                                fontSize: 12,
                              }}
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* BATCH ISSUANCE MODAL */}
        {showIssueModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
            onClick={() => setShowIssueModal(false)}
          >
            <div
              style={{
                background: isDark ? '#0f172a' : '#ffffff',
                border: `1px solid ${tk.cardBorder}`,
                borderRadius: 16,
                width: '100%',
                maxWidth: 680,
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: '20px 24px',
                  borderBottom: `1px solid ${tk.cardBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: tk.text, fontFamily: SORA }}>
                    Issue Student Service Access Cards
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: tk.subText }}>
                    Create entrance cards with fee threshold gating, exam cards, or meal cards.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  style={{ background: 'transparent', border: 'none', color: tk.subText, cursor: 'pointer' }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Step 1: Card Type Selector */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: tk.text, display: 'block', marginBottom: 8 }}>
                    1. Select Card Type
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    <div
                      onClick={() => handleTypeChange('entrance')}
                      style={{
                        padding: 12,
                        borderRadius: 10,
                        border: `2px solid ${batchType === 'entrance' ? '#10b981' : tk.cardBorder}`,
                        background: batchType === 'entrance' ? 'rgba(16,185,129,0.1)' : 'transparent',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      <ShieldCheck className="w-5 h-5 text-emerald-400" style={{ margin: '0 auto 6px' }} />
                      <div style={{ fontSize: 12, fontWeight: 700, color: tk.text }}>Entrance Pass</div>
                      <div style={{ fontSize: 10, color: tk.subText, marginTop: 2 }}>Fee Gated Access</div>
                    </div>

                    <div
                      onClick={() => handleTypeChange('examination')}
                      style={{
                        padding: 12,
                        borderRadius: 10,
                        border: `2px solid ${batchType === 'examination' ? '#6366f1' : tk.cardBorder}`,
                        background: batchType === 'examination' ? 'rgba(99,102,241,0.1)' : 'transparent',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      <Award className="w-5 h-5 text-indigo-400" style={{ margin: '0 auto 6px' }} />
                      <div style={{ fontSize: 12, fontWeight: 700, color: tk.text }}>Exam Card</div>
                      <div style={{ fontSize: 10, color: tk.subText, marginTop: 2 }}>Exam Room Entry</div>
                    </div>

                    <div
                      onClick={() => handleTypeChange('meal')}
                      style={{
                        padding: 12,
                        borderRadius: 10,
                        border: `2px solid ${batchType === 'meal' ? '#f59e0b' : tk.cardBorder}`,
                        background: batchType === 'meal' ? 'rgba(245,158,11,0.1)' : 'transparent',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      <Utensils className="w-5 h-5 text-amber-400" style={{ margin: '0 auto 6px' }} />
                      <div style={{ fontSize: 12, fontWeight: 700, color: tk.text }}>Meal Card</div>
                      <div style={{ fontSize: 10, color: tk.subText, marginTop: 2 }}>Dining Hall</div>
                    </div>
                  </div>
                </div>

                {/* Step 2: Form fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                      Card Title / Heading *
                    </label>
                    <input
                      type="text"
                      value={batchTitle}
                      onChange={(e) => setBatchTitle(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 8,
                        background: isDark ? '#1e293b' : '#f8fafc',
                        border: `1px solid ${tk.cardBorder}`,
                        color: tk.text,
                        fontSize: 13,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                      Target Class Group
                    </label>
                    <select
                      value={batchClass}
                      onChange={(e) => setBatchClass(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 8,
                        background: isDark ? '#1e293b' : '#f8fafc',
                        border: `1px solid ${tk.cardBorder}`,
                        color: tk.text,
                        fontSize: 13,
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="">All Classes ({classList.length} active)</option>
                      {classList.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Step 3: Fee Gating & Expiry */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                      Minimum Fee Threshold Required (%)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={minFeePercent}
                        onChange={(e) => setMinFeePercent(Number(e.target.value) || 0)}
                        style={{
                          width: 80,
                          padding: '8px 12px',
                          borderRadius: 8,
                          background: isDark ? '#1e293b' : '#f8fafc',
                          border: `1px solid ${tk.cardBorder}`,
                          color: tk.text,
                          fontSize: 13,
                        }}
                      />
                      <span style={{ fontSize: 12, color: tk.subText }}>
                        {minFeePercent === 0
                          ? 'No fee gating required'
                          : `Only students with ≥${minFeePercent}% fees paid`}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                      Card Expiration Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={batchExpiry}
                      onChange={(e) => setBatchExpiry(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 8,
                        background: isDark ? '#1e293b' : '#f8fafc',
                        border: `1px solid ${tk.cardBorder}`,
                        color: tk.text,
                        fontSize: 13,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* Step 4: Live Eligible Students List */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: tk.text }}>
                      Students to Receive Cards ({selectedStudentIds.size} of {eligibilityList.length} selected)
                    </label>
                    <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                      <button
                        type="button"
                        onClick={() => setSelectedStudentIds(new Set(eligibilityList.map((s) => s.student_id)))}
                        style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer', fontWeight: 600 }}
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
                        style={{ background: 'transparent', border: 'none', color: '#6366f1', cursor: 'pointer', fontWeight: 600 }}
                      >
                        Select Eligible Only
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      maxHeight: 220,
                      overflowY: 'auto',
                      border: `1px solid ${tk.cardBorder}`,
                      borderRadius: 8,
                      background: isDark ? '#1e293b' : '#f8fafc',
                    }}
                  >
                    {loadingEligibility ? (
                      <div style={{ padding: 24, textAlign: 'center', color: tk.subText, fontSize: 12 }}>
                        Calculating fee percentages & eligibility...
                      </div>
                    ) : eligibilityList.length === 0 ? (
                      <div style={{ padding: 24, textAlign: 'center', color: tk.subText, fontSize: 12 }}>
                        No students found in this selection.
                      </div>
                    ) : (
                      eligibilityList.map((st) => {
                        const isChecked = selectedStudentIds.has(st.student_id);
                        return (
                          <div
                            key={st.student_id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              borderBottom: `1px solid ${tk.cardBorder}`,
                              background: isChecked ? (isDark ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.04)') : 'transparent',
                            }}
                          >
                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flex: 1 }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const next = new Set(selectedStudentIds);
                                  if (e.target.checked) next.add(st.student_id);
                                  else next.delete(st.student_id);
                                  setSelectedStudentIds(next);
                                }}
                              />
                              <div>
                                <span style={{ fontWeight: 600, color: tk.text, fontSize: 12 }}>{st.name}</span>
                                <span style={{ fontSize: 11, color: tk.subText, marginLeft: 8 }}>
                                  {st.current_class} {st.admission_number ? `(${st.admission_number})` : ''}
                                </span>
                              </div>
                            </label>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span
                                style={{
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  background: st.is_eligible ? '#dcfce7' : '#fee2e2',
                                  color: st.is_eligible ? '#166534' : '#991b1b',
                                }}
                              >
                                {st.fee_percentage}% Fees Paid
                              </span>
                              {!st.is_eligible && (
                                <span style={{ fontSize: 10, color: '#ef4444' }}>Below threshold</span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  padding: '16px 24px',
                  borderTop: `1px solid ${tk.cardBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${tk.cardBorder}`,
                    color: tk.text,
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isIssuing || selectedStudentIds.size === 0}
                  onClick={handleGenerateCards}
                  style={{
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 20px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: selectedStudentIds.size === 0 ? 'not-allowed' : 'pointer',
                    opacity: selectedStudentIds.size === 0 ? 0.5 : 1,
                  }}
                >
                  {isIssuing ? 'Issuing...' : `Generate ${selectedStudentIds.size} Cards`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PREVIEW SINGLE CARD MODAL */}
        {previewCard && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
            onClick={() => setPreviewCard(null)}
          >
            <div
              style={{
                background: isDark ? '#0f172a' : '#ffffff',
                border: `1px solid ${tk.cardBorder}`,
                borderRadius: 16,
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
                maxWidth: 420,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: tk.text }}>Official Access Card</h3>
                <button
                  type="button"
                  onClick={() => setPreviewCard(null)}
                  style={{ background: 'transparent', border: 'none', color: tk.subText, cursor: 'pointer' }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <StudentCardBadge
                card={previewCard}
                schoolName={schoolInfo.name}
                schoolLogo={schoolInfo.badge_url}
              />

              <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    setBatchPrintCards([previewCard]);
                    setPreviewCard(null);
                  }}
                  style={{
                    flex: 1,
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Single Card</span>
                </button>
              </div>
            </div>
          </div>
        )}

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
        {extendExpiryCard && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
            onClick={() => setExtendExpiryCard(null)}
          >
            <div
              style={{
                background: isDark ? '#0f172a' : '#ffffff',
                border: `1px solid ${tk.cardBorder}`,
                borderRadius: 16,
                padding: 24,
                width: '100%',
                maxWidth: 400,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: tk.text }}>
                Extend Card Expiration
              </h3>
              <p style={{ margin: '0 0 16px', fontSize: 12, color: tk.subText }}>
                Card: <strong>{extendExpiryCard.card_number}</strong> ({extendExpiryCard.student?.name})
              </p>

              <label style={{ fontSize: 12, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                New Expiry Date & Time
              </label>
              <input
                type="datetime-local"
                value={newExpiryInput}
                onChange={(e) => setNewExpiryInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: isDark ? '#1e293b' : '#f8fafc',
                  border: `1px solid ${tk.cardBorder}`,
                  color: tk.text,
                  fontSize: 13,
                  boxSizing: 'border-box',
                  marginBottom: 16,
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setExtendExpiryCard(null)}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${tk.cardBorder}`,
                    color: tk.text,
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExtendExpiry}
                  style={{
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Save & Renew
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminPageWrapper>
  );
}
