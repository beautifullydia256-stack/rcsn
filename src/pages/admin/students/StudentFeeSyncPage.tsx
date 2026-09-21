import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import {
  Users,
  DollarSign,
  CheckCircle,
  RefreshCw,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Home,
  Bus,
  FilePlus,
  Scale,
  CreditCard,
  QrCode,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useToast } from '@/components/Toast';
import { useAcademicPeriod } from '@/lib/academicPeriodTerminology';
import { getTokens, fmtUGX, fmtUGXCompact, SORA, INTER } from '@/styles/posThemeTokens';

type FeeStructure = {
  class_name: string;
  tuition_amount: number | null;
  boarding_amount: number | null;
  boarding_tuition_amount: number | null;
};

type StudentSyncData = {
  student_id: string;
  name: string;
  current_class: string;
  boarding_type: string;
  admission_number: string;
  has_invoices: boolean;
  total_billed: number;
  total_paid: number;
  balance: number;
  created_at?: string | null;
  schoolpay_payment_code?: string | null;
  selected?: boolean;
  new_boarding_type?: 'Day Scholar' | 'Boarding';
  payment_amount?: number;
  balance_amount?: number;
  supplementary_amount?: number;
  new_schoolpay_code?: string;
};

type SortKey = 'name' | 'current_class' | 'balance' | 'created_at';
type SortDir = 'asc' | 'desc';
type SyncMode = 'assign_fees' | 'update_balances' | 'schoolpay_codes';

interface SyncQueryResult {
  termId: string | null;
  feeStructures: FeeStructure[];
  students: StudentSyncData[];
  errorMsg: string | null;
}

async function fetchSyncStudents(schoolId: string, syncMode: SyncMode): Promise<SyncQueryResult> {
  if (syncMode === 'assign_fees') {
    const [termRes, feeRes, studentsRes] = await Promise.all([
      supabase.rpc('resolve_current_school_term_id', {
        p_school_id: schoolId,
        p_today: new Date().toISOString().split('T')[0]
      }),
      supabase
        .from('school_fee_structure')
        .select('class_name, tuition_amount, boarding_amount, boarding_tuition_amount')
        .eq('school_id', schoolId),
      supabase
        .from('students')
        .select('student_id, name, current_class, boarding_type, admission_number, created_at, status')
        .eq('school_id', schoolId)
        .eq('status', 'active')
        .order('name')
    ]);

    if (studentsRes.error) throw studentsRes.error;
    const termId = termRes.data ?? null;

    if (!termId) {
      return {
        termId: null,
        feeStructures: (feeRes.data ?? []) as FeeStructure[],
        students: [],
        errorMsg: 'No current term found. Please set up school terms first.'
      };
    }

    // Fetch invoices for current term
    const { data: currentTermInvoices } = await supabase
      .from('student_invoices')
      .select('student_id')
      .eq('school_id', schoolId)
      .eq('term_id', termId)
      .eq('is_supplementary', false)
      .neq('status', 'cancelled');

    const studentsWithCurrentTermInvoices = new Set(currentTermInvoices?.map(i => i.student_id) || []);

    const studentsData: StudentSyncData[] = (studentsRes.data || [])
      .filter(s => !studentsWithCurrentTermInvoices.has(s.student_id))
      .map(s => ({
        student_id: s.student_id,
        name: s.name || '',
        current_class: s.current_class || '',
        boarding_type: s.boarding_type || 'Day Scholar',
        admission_number: s.admission_number || '',
        created_at: s.created_at,
        has_invoices: false,
        total_billed: 0,
        total_paid: 0,
        balance: 0,
        selected: false,
        new_boarding_type: (s.boarding_type as 'Day Scholar' | 'Boarding') || 'Day Scholar'
      }));

    return {
      termId,
      feeStructures: (feeRes.data ?? []) as FeeStructure[],
      students: studentsData,
      errorMsg: null
    };
  } else if (syncMode === 'update_balances') {
    const [termRes, balancesRes] = await Promise.all([
      supabase.rpc('resolve_current_school_term_id', {
        p_school_id: schoolId,
        p_today: new Date().toISOString().split('T')[0]
      }),
      supabase.rpc('get_students_with_balances', {
        p_school_id: schoolId
      })
    ]);

    if (balancesRes.error) throw balancesRes.error;

    const studentsData: StudentSyncData[] = (balancesRes.data || []).map((s: any) => ({
      student_id: s.student_id,
      name: s.name || '',
      current_class: s.current_class || '',
      boarding_type: s.boarding_type || 'Day Scholar',
      admission_number: s.admission_number || '',
      created_at: s.created_at,
      has_invoices: true,
      total_billed: Number(s.total_billed || 0),
      total_paid: Number(s.total_paid || 0),
      balance: Number(s.balance || 0),
      selected: false,
      payment_amount: undefined,
      balance_amount: Number(s.balance || 0),
      supplementary_amount: undefined
    }));

    return {
      termId: termRes.data ?? null,
      feeStructures: [],
      students: studentsData,
      errorMsg: null
    };
  } else {
    // schoolpay_codes
    const { data, error } = await supabase
      .from('students')
      .select(`
        student_id,
        name,
        current_class,
        boarding_type,
        admission_number,
        schoolpay_payment_code,
        created_at,
        status
      `)
      .eq('school_id', schoolId)
      .eq('status', 'active')
      .or('schoolpay_payment_code.is.null,schoolpay_payment_code.eq.')
      .order('name');

    if (error) throw error;

    const studentsData: StudentSyncData[] = (data || []).map(s => ({
      student_id: s.student_id,
      name: s.name || '',
      current_class: s.current_class || '',
      boarding_type: s.boarding_type || 'Day Scholar',
      admission_number: s.admission_number || '',
      schoolpay_payment_code: s.schoolpay_payment_code,
      created_at: s.created_at,
      has_invoices: false,
      total_billed: 0,
      total_paid: 0,
      balance: 0,
      selected: false,
      new_schoolpay_code: ''
    }));

    return {
      termId: null,
      feeStructures: [],
      students: studentsData,
      errorMsg: null
    };
  }
}

export default function StudentFeeSyncPage() {
  const user = useAuthStore((s) => s.user);
  const authSchoolId = useAuthStore((s) => s.schoolId);
  const queryClient = useQueryClient();
  const toast = useToast();
  const { isTertiary, labels } = useAcademicPeriod();

  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const t = getTokens(isDark);
  
  const [syncMode, setSyncMode] = useState<SyncMode>('assign_fees');
  const [syncing, setSyncing] = useState(false);
  const [selectedAll, setSelectedAll] = useState(false);
  const [balanceUpdateMode, setBalanceUpdateMode] = useState<'payment' | 'supplementary'>('payment');
  const [supplementaryLabel, setSupplementaryLabel] = useState(isTertiary ? 'Outstanding balance from previous semesters' : 'Outstanding balance from previous terms');
  const [bulkSchoolPayCode, setBulkSchoolPayCode] = useState('');

  // Row edits & selection maps (preserves user inputs across re-renders)
  const [rowEdits, setRowEdits] = useState<Record<string, Partial<StudentSyncData>>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Snappy pagination
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Search / filter / sort
  const [searchQ, setSearchQ] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const { data: schoolData } = useQuery({
    queryKey: ['admin', 'school-context', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user');
      const { data, error } = await supabase
        .from('users')
        .select('school_id')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 30 * 60 * 1000,
  });

  const schoolId = authSchoolId || schoolData?.school_id;

  // React Query: Cached per syncMode with 5 min staleTime
  const {
    data: syncData,
    isLoading,
    isFetching,
    refetch: refetchStudents,
  } = useQuery({
    queryKey: ['admin', 'fee-sync', schoolId, syncMode],
    queryFn: () => fetchSyncStudents(schoolId!, syncMode),
    enabled: !!schoolId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const currentTermId = syncData?.termId ?? null;
  const feeStructures = syncData?.feeStructures || [];

  // Merge server data with user's active row edits and checkbox selections
  const students = useMemo(() => {
    const rawList = syncData?.students || [];
    if (!rawList.length) return [];
    return rawList.map(s => {
      const edit = rowEdits[s.student_id];
      const isSelected = selectedIds.has(s.student_id);
      return {
        ...s,
        ...(edit || {}),
        selected: isSelected,
      };
    });
  }, [syncData?.students, rowEdits, selectedIds]);

  const availableClasses = useMemo(() => {
    const s = new Set(students.map(x => x.current_class).filter(Boolean));
    return Array.from(s).sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    let res = students;

    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      res = res.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.admission_number.toLowerCase().includes(q) ||
        s.current_class.toLowerCase().includes(q)
      );
    }

    if (classFilter !== 'all') {
      res = res.filter(s => s.current_class === classFilter);
    }

    if (dateFilter !== 'all' && dateFilter !== 'new') {
      const now = new Date();
      const cutoff = new Date(now);
      if (dateFilter === 'today') cutoff.setHours(0, 0, 0, 0);
      else if (dateFilter === 'week') cutoff.setDate(now.getDate() - 7);
      else if (dateFilter === 'month') cutoff.setMonth(now.getMonth() - 1);
      res = res.filter(s => s.created_at && new Date(s.created_at) >= cutoff);
    }

    return [...res].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortKey === 'current_class') cmp = a.current_class.localeCompare(b.current_class);
      else if (sortKey === 'balance') cmp = (a.balance || 0) - (b.balance || 0);
      else if (sortKey === 'created_at') {
        cmp = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [students, searchQ, classFilter, dateFilter, sortKey, sortDir]);

  // Snappy pagination calculation
  const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(filteredStudents.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const paginatedStudents = useMemo(() => {
    if (pageSize === 0) return filteredStudents;
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronsUpDown className="inline h-3 w-3 ml-1 opacity-40" />;
    return sortDir === 'asc'
      ? <ChevronUp className="inline h-3 w-3 ml-1 text-emerald-500" />
      : <ChevronDown className="inline h-3 w-3 ml-1 text-emerald-500" />;
  }

  const handleModeChange = (mode: SyncMode) => {
    if (mode === syncMode) return;
    setSyncMode(mode);
    setRowEdits({});
    setSelectedIds(new Set());
    setSelectedAll(false);
    setSearchQ('');
    setClassFilter('all');
    setDateFilter('all');
    setSortKey('name');
    setSortDir('asc');
    setCurrentPage(1);
  };

  const toggleSelectAll = () => {
    if (selectedAll) {
      setSelectedAll(false);
      setSelectedIds(new Set());
    } else {
      setSelectedAll(true);
      const allFiltered = new Set(filteredStudents.map(s => s.student_id));
      setSelectedIds(allFiltered);
    }
  };

  const toggleStudent = (studentId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const updateStudentBoardingType = (studentId: string, boardingType: 'Day Scholar' | 'Boarding') => {
    setRowEdits(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        new_boarding_type: boardingType,
      }
    }));
  };

  const updateStudentAmount = (studentId: string, field: 'payment_amount' | 'balance_amount' | 'supplementary_amount', value: number | undefined) => {
    setRowEdits(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      }
    }));
  };

  const updateStudentSchoolPayCode = (studentId: string, code: string) => {
    setRowEdits(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        new_schoolpay_code: code,
      }
    }));
  };

  const applyBulkSchoolPayCode = () => {
    if (!bulkSchoolPayCode.trim()) {
      toast.error('Please enter a SchoolPay code');
      return;
    }
    if (selectedIds.size === 0) {
      toast.error('Please select at least one student');
      return;
    }
    setRowEdits(prev => {
      const next = { ...prev };
      selectedIds.forEach(id => {
        next[id] = {
          ...next[id],
          new_schoolpay_code: bulkSchoolPayCode.trim(),
        };
      });
      return next;
    });
    toast.success(`Applied code to ${selectedIds.size} selected students`);
  };

  const syncSelectedStudents = async () => {
    const selectedStudents = students.filter(s => s.selected);
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    setSyncing(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      if (syncMode === 'assign_fees') {
        let termId = currentTermId;
        if (!termId) {
          const { data: resolvedId } = await supabase.rpc('resolve_current_school_term_id', {
            p_school_id: schoolId,
            p_today: new Date().toISOString().split('T')[0]
          });
          termId = resolvedId ?? null;
        }
        if (!termId) {
          toast.error('No current term found. Cannot assign invoices.');
          setSyncing(false);
          return;
        }

        for (const student of selectedStudents) {
          try {
            const effectiveBoardingType = student.new_boarding_type ?? student.boarding_type;

            if (student.new_boarding_type && student.new_boarding_type !== student.boarding_type) {
              await supabase
                .from('students')
                .update({ boarding_type: student.new_boarding_type, updated_at: new Date().toISOString() })
                .eq('school_id', schoolId)
                .eq('student_id', student.student_id);
            }

            const feeRow = feeStructures.find(f => f.class_name === student.current_class);
            let amount = 0;
            if (feeRow) {
              if (effectiveBoardingType === 'Boarding') {
                amount = Number(feeRow.boarding_amount ?? feeRow.boarding_tuition_amount ?? feeRow.tuition_amount ?? 0);
              } else {
                amount = Number(feeRow.tuition_amount ?? 0);
              }
            }

            if (!amount || amount <= 0) {
              toast.error(`No fee set for ${student.current_class}. Add it in Settings → Financial first.`);
              errorCount++;
              continue;
            }

            let invNum: string | null = null;
            try {
              const res = await supabase.rpc('get_next_invoice_number', { p_school_id: schoolId });
              invNum = res.data ?? null;
            } catch {
              invNum = 'INV-' + new Date().getFullYear() + '-' + Date.now().toString().slice(-6);
            }

            const { error: invErr } = await supabase.from('student_invoices').insert({
              school_id: schoolId,
              student_id: student.student_id,
              term_id: termId,
              total_amount: amount,
              status: 'issued',
              invoice_number: invNum,
              is_supplementary: false,
              created_by: user?.id,
              updated_at: new Date().toISOString(),
            });

            if (!invErr) {
              successCount++;
            } else {
              console.error(`Invoice error for ${student.name}:`, invErr);
              errorCount++;
            }
          } catch (error) {
            console.error(`Error syncing student ${student.name}:`, error);
            errorCount++;
          }
        }
      } else if (syncMode === 'update_balances') {
        if (balanceUpdateMode === 'supplementary') {
          let termId = currentTermId;
          if (!termId) {
            const { data: resolvedId } = await supabase.rpc('resolve_current_school_term_id', {
              p_school_id: schoolId,
              p_today: new Date().toISOString().split('T')[0]
            });
            termId = resolvedId ?? null;
          }
          if (!termId) {
            toast.error('No current term found. Cannot add charges.');
            setSyncing(false);
            return;
          }

          for (const student of selectedStudents) {
            try {
              const amt = student.supplementary_amount;
              if (!amt || amt <= 0) { errorCount++; continue; }
              let invNum: string | null = null;
              try {
                const res = await supabase.rpc('get_next_invoice_number', { p_school_id: schoolId });
                invNum = res.data ?? null;
              } catch {
                invNum = 'INV-' + new Date().getFullYear() + '-' + Date.now().toString().slice(-6);
              }
              const { error: invErr } = await supabase.from('student_invoices').insert({
                school_id: schoolId,
                student_id: student.student_id,
                term_id: termId,
                total_amount: amt,
                status: 'issued',
                invoice_number: invNum,
                invoice_label: supplementaryLabel.trim() || 'Outstanding balance from previous terms',
                is_supplementary: true,
                created_by: user?.id,
                updated_at: new Date().toISOString(),
              });
              if (!invErr) successCount++;
              else { console.error(`Supplementary invoice error for ${student.name}:`, invErr); errorCount++; }
            } catch (error) {
              console.error(`Error adding charge for ${student.name}:`, error);
              errorCount++;
            }
          }
        } else {
          for (const student of selectedStudents) {
            try {
              if (balanceUpdateMode === 'payment' && student.payment_amount && student.payment_amount > 0) {
                const { error } = await supabase.from('student_payments').insert({
                  school_id: schoolId,
                  student_id: student.student_id,
                  amount: student.payment_amount,
                  amount_paid: student.payment_amount,
                  payment_method: 'other',
                  payment_date: new Date().toISOString().split('T')[0],
                  notes: 'Balance sync adjustment',
                  recorded_by: user?.id
                });

                if (!error) successCount++;
                else { console.error(`Payment error for ${student.name}:`, error); errorCount++; }
              }
            } catch (error) {
              console.error(`Error updating balance for ${student.name}:`, error);
              errorCount++;
            }
          }
        }
      } else if (syncMode === 'schoolpay_codes') {
        for (const student of selectedStudents) {
          try {
            if (student.new_schoolpay_code && student.new_schoolpay_code.trim()) {
              const { error } = await supabase
                .from('students')
                .update({
                  schoolpay_payment_code: student.new_schoolpay_code.trim(),
                  updated_at: new Date().toISOString()
                })
                .eq('school_id', schoolId)
                .eq('student_id', student.student_id);

              if (!error) successCount++;
              else errorCount++;
            }
          } catch (error) {
            console.error(`Error updating SchoolPay code for ${student.name}:`, error);
            errorCount++;
          }
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['admin', 'fee-sync', schoolId] });
      setRowEdits({});
      setSelectedIds(new Set());
      setSelectedAll(false);
      await refetchStudents();
      
      if (successCount > 0) {
        toast.success(`Successfully processed ${successCount} student${successCount !== 1 ? 's' : ''}`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to process ${errorCount} student${errorCount !== 1 ? 's' : ''}`);
      }
      
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Sync operation failed');
    } finally {
      setSyncing(false);
    }
  };

  const selectedCount = selectedIds.size;
  const shownCount = filteredStudents.length;

  const totalOutstanding = useMemo(() => {
    return students.reduce((a, b) => a + (b.balance || 0), 0);
  }, [students]);

  const dayScholarCount = useMemo(() => {
    return students.filter(s => (s.new_boarding_type || s.boarding_type) === 'Day Scholar').length;
  }, [students]);

  const boardingCount = useMemo(() => {
    return students.filter(s => (s.new_boarding_type || s.boarding_type) === 'Boarding').length;
  }, [students]);

  return (
    <div
      style={{
        background: t.screenBg,
        minHeight: '100%',
        color: t.textHi,
        fontFamily: INTER,
        padding: '24px 28px 48px',
        transition: 'background 0.2s, color 0.2s',
      }}
    >
      {/* ── ROW 0: HEADER & INSTITUTIONAL CONTEXT ──────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                fontFamily: SORA,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                color: t.mintInk,
                background: t.mintDim,
                padding: '3px 9px',
                borderRadius: 6,
              }}
            >
              FINANCIAL OPERATIONS
            </span>
            {currentTermId && (
              <span style={{ fontSize: 12, color: t.textMid }}>
                Active Session Term Active
              </span>
            )}
          </div>
          <h1
            style={{
              fontFamily: SORA,
              fontSize: 26,
              fontWeight: 800,
              color: t.textHi,
              margin: '8px 0 4px',
            }}
          >
            {isTertiary ? 'Trainee Fee Synchronization & Ledger Sync' : 'Student Fee Synchronization & Ledger Sync'}
          </h1>
          <p style={{ fontSize: 13, color: t.textMid, margin: 0 }}>
            Batch billing, ledger balance corrections, and SchoolPay code assignment with real-time audit protection.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => {
              setRowEdits({});
              void refetchStudents();
            }}
            disabled={isLoading || isFetching}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 16px',
              borderRadius: 10,
              border: `1px solid ${t.stroke}`,
              background: t.panel,
              color: t.textHi,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: isLoading || isFetching ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Refresh student records from database"
          >
            <RefreshCw size={15} className={isLoading || isFetching ? 'animate-spin text-emerald-500' : ''} />
            <span>{isFetching ? 'Refreshing…' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* ── ROW 1: 4-CARD POS SUMMARY STRIP ─────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
          marginBottom: 24,
        }}
      >
        {/* KPI 1 */}
        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.stroke}`,
            borderRadius: 14,
            padding: '16px 18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: t.gold }}>
              {syncMode === 'assign_fees' ? 'AWAITING INVOICES' : syncMode === 'update_balances' ? 'STUDENTS WITH DEBT' : 'UNASSIGNED CODES'}
            </span>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: t.goldDim, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.gold }}>
              <FilePlus size={15} />
            </div>
          </div>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 28 }}>
              <RefreshCw size={15} className="animate-spin text-amber-500" />
              <span style={{ fontSize: 15, fontWeight: 700, color: t.textMid }}>Loading…</span>
            </div>
          ) : (
            <div style={{ fontFamily: SORA, fontSize: 22, fontWeight: 800, color: t.textHi }}>
              {students.length}
            </div>
          )}
          <div style={{ fontSize: 11.5, color: t.textMid, marginTop: 4 }}>
            {syncMode === 'assign_fees'
              ? `Students needing ${labels.periodNoun.toLowerCase()} invoice`
              : syncMode === 'update_balances'
              ? 'Students with balance records'
              : 'Students without payment code'}
          </div>
        </div>

        {/* KPI 2 */}
        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.stroke}`,
            borderRadius: 14,
            padding: '16px 18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: t.mint }}>
              {syncMode === 'assign_fees' ? 'DAY SCHOLARS' : syncMode === 'update_balances' ? 'TOTAL OUTSTANDING' : 'BULK CODE STATUS'}
            </span>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: t.mintDim, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.mint }}>
              {syncMode === 'assign_fees' ? <Bus size={15} /> : <DollarSign size={15} />}
            </div>
          </div>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 28 }}>
              <RefreshCw size={15} className="animate-spin text-emerald-500" />
              <span style={{ fontSize: 15, fontWeight: 700, color: t.textMid }}>Calculating…</span>
            </div>
          ) : (
            <div style={{ fontFamily: SORA, fontSize: 20, fontWeight: 800, color: t.textHi }}>
              {syncMode === 'assign_fees'
                ? dayScholarCount
                : syncMode === 'update_balances'
                ? `UGX ${fmtUGXCompact(totalOutstanding)}`
                : bulkSchoolPayCode.trim() ? 'Code Staged' : 'No Code Staged'}
            </div>
          )}
          <div style={{ fontSize: 11.5, color: t.textMid, marginTop: 4 }}>
            {syncMode === 'assign_fees'
              ? 'Day scholar fee tier applied'
              : syncMode === 'update_balances'
              ? 'Accumulated ledger balance'
              : 'Ready to apply to selection'}
          </div>
        </div>

        {/* KPI 3 */}
        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.stroke}`,
            borderRadius: 14,
            padding: '16px 18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: t.blue }}>
              {syncMode === 'assign_fees' ? 'BOARDING STUDENTS' : syncMode === 'update_balances' ? 'SELECTED STUDENTS' : 'SELECTED STUDENTS'}
            </span>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: isDark ? 'rgba(56,189,248,0.15)' : 'rgba(56,189,248,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.blue }}>
              {syncMode === 'assign_fees' ? <Home size={15} /> : <Users size={15} />}
            </div>
          </div>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 28 }}>
              <RefreshCw size={15} className="animate-spin text-sky-500" />
              <span style={{ fontSize: 15, fontWeight: 700, color: t.textMid }}>Loading…</span>
            </div>
          ) : (
            <div style={{ fontFamily: SORA, fontSize: 22, fontWeight: 800, color: t.textHi }}>
              {syncMode === 'assign_fees'
                ? boardingCount
                : selectedCount}
            </div>
          )}
          <div style={{ fontSize: 11.5, color: t.textMid, marginTop: 4 }}>
            {syncMode === 'assign_fees'
              ? 'Boarding fee tier applied'
              : `${selectedCount} of ${students.length} accounts marked`}
          </div>
        </div>

        {/* KPI 4 */}
        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.stroke}`,
            borderRadius: 14,
            padding: '16px 18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: t.textMid }}>
              ACTIVE SELECTION
            </span>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: t.fieldBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.textMid }}>
              <Users size={15} />
            </div>
          </div>
          <div style={{ fontFamily: SORA, fontSize: 22, fontWeight: 800, color: t.textHi }}>
            {selectedCount} <span style={{ fontSize: 13, fontWeight: 600, color: t.textMid }}>/ {students.length}</span>
          </div>
          <div style={{ fontSize: 11.5, color: t.textMid, marginTop: 4 }}>
            {selectedCount > 0 ? 'Ready for bulk sync' : 'Check rows below to proceed'}
          </div>
        </div>
      </div>

      {/* ── ROW 2: 3-MODE INTERACTIVE SELECTOR ──────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 14,
          marginBottom: 24,
        }}
      >
        {/* Mode 1: Assign Initial Fees */}
        <div
          onClick={() => handleModeChange('assign_fees')}
          style={{
            background: t.panel,
            border: `2px solid ${syncMode === 'assign_fees' ? t.mint : t.stroke}`,
            borderRadius: 14,
            padding: '18px 20px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: syncMode === 'assign_fees' ? (isDark ? '0 8px 24px rgba(61,232,160,0.18)' : '0 6px 20px rgba(61,232,160,0.14)') : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: syncMode === 'assign_fees' ? t.mintDim : t.fieldBg,
                color: syncMode === 'assign_fees' ? t.mintInk : t.textMid,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FilePlus size={18} />
            </div>
            <div style={{ fontFamily: SORA, fontSize: 15, fontWeight: 700, color: t.textHi }}>
              Assign Initial Fees
            </div>
          </div>
          <p style={{ fontSize: 12, color: t.textMid, lineHeight: 1.5, margin: 0 }}>
            Set boarding type (Day Scholar or Boarding), then generate {labels.periodNoun.toLowerCase()} fee invoices. Only displays students lacking current {labels.periodNoun.toLowerCase()} billing.
          </p>
        </div>

        {/* Mode 2: Update Balances */}
        <div
          onClick={() => handleModeChange('update_balances')}
          style={{
            background: t.panel,
            border: `2px solid ${syncMode === 'update_balances' ? t.mint : t.stroke}`,
            borderRadius: 14,
            padding: '18px 20px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: syncMode === 'update_balances' ? (isDark ? '0 8px 24px rgba(61,232,160,0.18)' : '0 6px 20px rgba(61,232,160,0.14)') : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: syncMode === 'update_balances' ? t.mintDim : t.fieldBg,
                color: syncMode === 'update_balances' ? t.mintInk : t.textMid,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Scale size={18} />
            </div>
            <div style={{ fontFamily: SORA, fontSize: 15, fontWeight: 700, color: t.textHi }}>
              Update Balances & Changes
            </div>
          </div>
          <p style={{ fontSize: 12, color: t.textMid, lineHeight: 1.5, margin: 0 }}>
            Record payments, balance corrections, or add supplementary charges to existing student accounts.
          </p>
        </div>

        {/* Mode 3: SchoolPay Codes */}
        <div
          onClick={() => handleModeChange('schoolpay_codes')}
          style={{
            background: t.panel,
            border: `2px solid ${syncMode === 'schoolpay_codes' ? t.mint : t.stroke}`,
            borderRadius: 14,
            padding: '18px 20px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: syncMode === 'schoolpay_codes' ? (isDark ? '0 8px 24px rgba(61,232,160,0.18)' : '0 6px 20px rgba(61,232,160,0.14)') : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: syncMode === 'schoolpay_codes' ? t.mintDim : t.fieldBg,
                color: syncMode === 'schoolpay_codes' ? t.mintInk : t.textMid,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <QrCode size={18} />
            </div>
            <div style={{ fontFamily: SORA, fontSize: 15, fontWeight: 700, color: t.textHi }}>
              Bulk SchoolPay Codes
            </div>
          </div>
          <p style={{ fontSize: 12, color: t.textMid, lineHeight: 1.5, margin: 0 }}>
            Assign electronic SchoolPay payment codes to active students who lack codes for mobile money integration.
          </p>
        </div>
      </div>

      {/* ── ROW 3: MODE-SPECIFIC CONFIGURATION BARS ─────────────────────────── */}
      {syncMode === 'update_balances' && (
        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.stroke}`,
            borderRadius: 12,
            padding: '14px 18px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: t.textHi }}>Action Mode:</span>
            <div style={{ display: 'inline-flex', background: t.fieldBg, padding: 3, borderRadius: 8, border: `1px solid ${t.stroke}` }}>
              <button
                onClick={() => setBalanceUpdateMode('payment')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: 'none',
                  background: balanceUpdateMode === 'payment' ? t.panel : 'transparent',
                  color: balanceUpdateMode === 'payment' ? t.textHi : t.textMid,
                  fontFamily: SORA,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: balanceUpdateMode === 'payment' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                Record Payment
              </button>
              <button
                onClick={() => setBalanceUpdateMode('supplementary')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: 'none',
                  background: balanceUpdateMode === 'supplementary' ? t.panel : 'transparent',
                  color: balanceUpdateMode === 'supplementary' ? t.textHi : t.textMid,
                  fontFamily: SORA,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: balanceUpdateMode === 'supplementary' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                Add Charges
              </button>
            </div>
          </div>

          {balanceUpdateMode === 'supplementary' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 280, maxWidth: 500 }}>
              <span style={{ fontSize: 12, color: t.textMid, whiteSpace: 'nowrap' }}>Charge Label:</span>
              <input
                type="text"
                value={supplementaryLabel}
                onChange={(e) => setSupplementaryLabel(e.target.value)}
                placeholder="e.g. Previous term balance, Uniform, etc."
                style={{
                  width: '100%',
                  height: 34,
                  borderRadius: 8,
                  border: `1px solid ${t.stroke}`,
                  background: t.fieldBg,
                  color: t.textHi,
                  padding: '0 10px',
                  fontSize: 12,
                  outline: 'none',
                }}
              />
            </div>
          )}
        </div>
      )}

      {syncMode === 'schoolpay_codes' && (
        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.stroke}`,
            borderRadius: 12,
            padding: '14px 18px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 280 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: t.textHi, whiteSpace: 'nowrap' }}>Batch Code Prefix/Template:</span>
            <input
              type="text"
              value={bulkSchoolPayCode}
              onChange={(e) => setBulkSchoolPayCode(e.target.value)}
              placeholder="e.g. 1002345..."
              style={{
                width: 200,
                height: 34,
                borderRadius: 8,
                border: `1px solid ${t.stroke}`,
                background: t.fieldBg,
                color: t.textHi,
                padding: '0 10px',
                fontSize: 12,
                outline: 'none',
              }}
            />
            <button
              onClick={applyBulkSchoolPayCode}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: `1px solid ${t.mint}`,
                background: t.mintDim,
                color: t.mintInk,
                fontFamily: SORA,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Apply to Selected ({selectedCount})
            </button>
          </div>
          <div style={{ fontSize: 12, color: t.textMid }}>
            Allows rapid staging of consecutive or shared SchoolPay batch registration codes.
          </div>
        </div>
      )}

      {/* ── ROW 4: DATA TABLE CONTAINER ─────────────────────────────────────── */}
      <div
        style={{
          background: t.panel,
          border: `1px solid ${t.stroke}`,
          borderRadius: 14,
          padding: '20px',
          marginBottom: 24,
        }}
      >
        {/* Table Title & Filter Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ fontFamily: SORA, fontSize: 15, fontWeight: 700, color: t.textHi }}>
            {syncMode === 'assign_fees'
              ? (isTertiary ? 'Trainees Without Current Semester Invoice' : 'Students Without Current Term Invoice')
              : syncMode === 'update_balances'
              ? (isTertiary ? 'Trainees With Existing Balances' : 'Students With Existing Balances')
              : (isTertiary ? 'Trainees Without SchoolPay Codes' : 'Students Without SchoolPay Codes')}
          </div>
          <div style={{ fontSize: 12, color: t.textMid }}>
            Showing {shownCount} of {students.length} student{students.length !== 1 ? 's' : ''}
            {selectedCount > 0 ? ` · ${selectedCount} selected` : ''}
          </div>
        </div>

        {/* Filter Controls Row */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={15} color={t.textMid} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by name, admission no., class…"
              value={searchQ}
              onChange={(e) => {
                setSearchQ(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                height: 38,
                borderRadius: 10,
                border: `1px solid ${t.stroke}`,
                background: t.fieldBg,
                color: t.textHi,
                paddingLeft: 36,
                paddingRight: 12,
                fontSize: 12.5,
                outline: 'none',
              }}
            />
          </div>

          {availableClasses.length > 1 && (
            <select
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                height: 38,
                borderRadius: 10,
                border: `1px solid ${t.stroke}`,
                background: t.fieldBg,
                color: t.textHi,
                padding: '0 12px',
                fontSize: 12.5,
                outline: 'none',
              }}
            >
              <option value="all">All classes</option>
              {availableClasses.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}

          <select
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              height: 38,
              borderRadius: 10,
              border: `1px solid ${t.stroke}`,
              background: t.fieldBg,
              color: t.textHi,
              padding: '0 12px',
              fontSize: 12.5,
              outline: 'none',
            }}
          >
            <option value="all">All time</option>
            <option value="today">Added today</option>
            <option value="week">Added this week</option>
            <option value="month">Added this month</option>
          </select>
        </div>

        {/* Bulk Action Strip */}
        {students.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: 10,
              background: t.fieldBg,
              border: `1px solid ${t.stroke}`,
              marginBottom: 16,
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: t.textHi }}>
              <input
                type="checkbox"
                checked={selectedAll}
                onChange={toggleSelectAll}
              />
              <span>Select All ({filteredStudents.length} students)</span>
            </label>

            {selectedCount > 0 && (
              <button
                onClick={syncSelectedStudents}
                disabled={syncing}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 18px',
                  borderRadius: 8,
                  border: 'none',
                  background: `linear-gradient(135deg, ${t.ctaGradA}, ${t.ctaGradB})`,
                  color: t.ctaText,
                  fontFamily: SORA,
                  fontSize: 12.5,
                  fontWeight: 800,
                  cursor: syncing ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(61,232,160,0.30)',
                }}
              >
                {syncing ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Sparkles size={14} />
                )}
                <span>
                  {syncMode === 'assign_fees' ? 'Assign Fees' :
                   syncMode === 'update_balances' && balanceUpdateMode === 'supplementary' ? 'Add Charges' :
                   syncMode === 'update_balances' ? 'Update Balances' :
                   'Assign Codes'} ({selectedCount})
                </span>
              </button>
            )}
          </div>
        )}

        {/* Table Body States */}
        {isLoading ? (
          <div style={{ padding: '36px 20px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: t.mint, marginBottom: 16 }}>
              <RefreshCw size={20} className="animate-spin" />
              <span style={{ fontFamily: SORA, fontSize: 14, fontWeight: 700 }}>
                {syncMode === 'assign_fees'
                  ? 'Loading students & fee structure…'
                  : syncMode === 'update_balances'
                  ? 'Loading student ledger balances…'
                  : 'Scanning students for SchoolPay codes…'}
              </span>
            </div>
            <div style={{ maxWidth: 500, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3, 4, 5].map((idx) => (
                <div
                  key={idx}
                  style={{
                    height: 32,
                    borderRadius: 8,
                    background: t.fieldBg,
                    opacity: 0.7 - idx * 0.1,
                  }}
                  className="animate-pulse"
                />
              ))}
            </div>
          </div>
        ) : students.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: t.textMid }}>
            <CheckCircle size={44} color={t.mint} style={{ margin: '0 auto 12px' }} />
            <div style={{ fontFamily: SORA, fontSize: 16, fontWeight: 700, color: t.textHi, marginBottom: 4 }}>
              {syncMode === 'assign_fees'
                ? 'All students have been assigned fees!'
                : syncMode === 'update_balances'
                ? 'No students with balances found'
                : 'All students have SchoolPay codes!'}
            </div>
            <div style={{ fontSize: 12.5, color: t.textMid }}>
              {syncMode === 'assign_fees'
                ? `Every active student has proper ${labels.periodNoun.toLowerCase()} fee assignments.`
                : syncMode === 'update_balances'
                ? 'No active balance updates required.'
                : 'Every active student has a SchoolPay payment code.'}
            </div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: t.textMid }}>
            <Search size={38} color={t.textMid} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: t.textHi }}>No students match your filters.</div>
            <button
              onClick={() => { setSearchQ(''); setClassFilter('all'); setDateFilter('all'); }}
              style={{
                marginTop: 8,
                background: 'none',
                border: 'none',
                color: t.mintInk,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          /* Table */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${t.stroke}` }}>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, color: t.textMid, width: 36 }}>
                    #
                  </th>
                  <th
                    style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, color: t.textMid, cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => toggleSort('name')}
                  >
                    Student <SortIcon col="name" />
                  </th>
                  <th
                    style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, color: t.textMid, cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => toggleSort('current_class')}
                  >
                    Class <SortIcon col="current_class" />
                  </th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, color: t.textMid }}>
                    Boarding Type
                  </th>
                  {syncMode === 'assign_fees' && (
                    <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, color: t.textMid }}>
                      Set Boarding Type
                    </th>
                  )}
                  {syncMode === 'update_balances' && (
                    <>
                      <th
                        style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600, color: t.textMid, cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => toggleSort('balance')}
                      >
                        Balance <SortIcon col="balance" />
                      </th>
                      <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600, color: t.textMid }}>
                        {balanceUpdateMode === 'supplementary' ? 'Charge Amount' : 'Payment Amount'}
                      </th>
                    </>
                  )}
                  {syncMode === 'schoolpay_codes' && (
                    <>
                      <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, color: t.textMid }}>
                        Current Code
                      </th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, color: t.textMid }}>
                        New Code
                      </th>
                    </>
                  )}
                  <th
                    style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, color: t.textMid, cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => toggleSort('created_at')}
                  >
                    Enrolled <SortIcon col="created_at" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedStudents.map((student) => {
                  const initials = student.name
                    ? student.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                    : 'ST';
                  const isBoarder = (student.new_boarding_type || student.boarding_type) === 'Boarding';

                  return (
                    <tr
                      key={student.student_id}
                      style={{
                        borderBottom: `1px solid ${t.stroke}`,
                        background: student.selected ? (isDark ? 'rgba(61,232,160,0.06)' : 'rgba(61,232,160,0.04)') : 'transparent',
                        transition: 'background 0.1s',
                      }}
                    >
                      <td style={{ padding: '12px' }}>
                        <input
                          type="checkbox"
                          checked={student.selected || false}
                          onChange={() => toggleStudent(student.student_id)}
                        />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: t.fieldBg,
                              border: `1px solid ${t.stroke}`,
                              color: t.mintInk,
                              fontFamily: SORA,
                              fontSize: 11,
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: t.textHi }}>{student.name}</div>
                            <div style={{ fontSize: 11, color: t.textMid }}>{student.admission_number || 'No ID'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: t.fieldBg,
                            border: `1px solid ${t.stroke}`,
                            fontSize: 11.5,
                            fontWeight: 600,
                            color: t.textHi,
                          }}
                        >
                          {student.current_class}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {isBoarder ? (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '3px 10px',
                              borderRadius: 20,
                              background: isDark ? 'rgba(56,189,248,0.15)' : '#E0F2FE',
                              color: isDark ? '#7DD3FC' : '#0369A1',
                              fontSize: 11.5,
                              fontWeight: 600,
                            }}
                          >
                            <Home size={12} />
                            <span>Boarding</span>
                          </div>
                        ) : (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '3px 10px',
                              borderRadius: 20,
                              background: isDark ? 'rgba(52,211,153,0.15)' : '#DCFCE7',
                              color: isDark ? '#6EE7B7' : '#15803D',
                              fontSize: 11.5,
                              fontWeight: 600,
                            }}
                          >
                            <Bus size={12} />
                            <span>Day Scholar</span>
                          </div>
                        )}
                      </td>

                      {/* Mode 1: Set Boarding Type */}
                      {syncMode === 'assign_fees' && (
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <select
                              value={student.new_boarding_type || student.boarding_type}
                              onChange={(e) => updateStudentBoardingType(student.student_id, e.target.value as 'Day Scholar' | 'Boarding')}
                              style={{
                                height: 32,
                                borderRadius: 8,
                                border: `1px solid ${t.stroke}`,
                                background: t.fieldBg,
                                color: t.textHi,
                                padding: '0 10px',
                                fontSize: 12,
                                fontWeight: 500,
                                outline: 'none',
                              }}
                            >
                              <option value="Day Scholar">Day Scholar</option>
                              <option value="Boarding">Boarding</option>
                            </select>
                            {student.new_boarding_type !== student.boarding_type && (
                              <span style={{ fontSize: 11, fontWeight: 700, color: t.warn }}>
                                Modified
                              </span>
                            )}
                          </div>
                        </td>
                      )}

                      {/* Mode 2: Update Balances */}
                      {syncMode === 'update_balances' && (
                        <>
                          <td style={{ padding: '12px', textAlign: 'right', fontFamily: SORA, fontWeight: 700 }}>
                            <span style={{ color: student.balance > 0 ? t.warn : t.mintInk }}>
                              UGX {fmtUGX(student.balance)}
                            </span>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            <input
                              type="number"
                              min="0"
                              step="1000"
                              value={balanceUpdateMode === 'supplementary' ? (student.supplementary_amount ?? '') : (student.payment_amount ?? '')}
                              onChange={(e) => updateStudentAmount(
                                student.student_id,
                                balanceUpdateMode === 'supplementary' ? 'supplementary_amount' : 'payment_amount',
                                e.target.value === '' ? undefined : Number(e.target.value)
                              )}
                              placeholder="Amount"
                              style={{
                                height: 32,
                                width: 130,
                                borderRadius: 8,
                                border: `1px solid ${t.stroke}`,
                                background: t.fieldBg,
                                color: t.textHi,
                                padding: '0 8px',
                                textAlign: 'right',
                                fontSize: 12,
                                outline: 'none',
                              }}
                            />
                          </td>
                        </>
                      )}

                      {/* Mode 3: SchoolPay Codes */}
                      {syncMode === 'schoolpay_codes' && (
                        <>
                          <td style={{ padding: '12px' }}>
                            <span style={{ fontSize: 12, fontFamily: SORA, color: t.textMid }}>
                              {student.schoolpay_payment_code || '—'}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <input
                              type="text"
                              value={student.new_schoolpay_code || ''}
                              onChange={(e) => updateStudentSchoolPayCode(student.student_id, e.target.value)}
                              placeholder="Enter payment code…"
                              style={{
                                height: 32,
                                width: 160,
                                borderRadius: 8,
                                border: `1px solid ${t.stroke}`,
                                background: t.fieldBg,
                                color: t.textHi,
                                padding: '0 8px',
                                fontSize: 12,
                                outline: 'none',
                              }}
                            />
                          </td>
                        </>
                      )}

                      <td style={{ padding: '12px', fontSize: 11.5, color: t.textMid, whiteSpace: 'nowrap' }}>
                        {student.created_at
                          ? new Date(student.created_at).toLocaleDateString('en-UG', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {filteredStudents.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                  padding: '14px 16px',
                  borderTop: `1px solid ${t.stroke}`,
                  background: t.fieldBg,
                  borderRadius: '0 0 12px 12px',
                  marginTop: 8,
                }}
              >
                <div style={{ fontSize: 12, color: t.textMid }}>
                  Showing{' '}
                  <strong style={{ color: t.textHi }}>
                    {pageSize === 0 ? 1 : Math.min((currentPage - 1) * pageSize + 1, filteredStudents.length)}
                  </strong>
                  {' – '}
                  <strong style={{ color: t.textHi }}>
                    {pageSize === 0 ? filteredStudents.length : Math.min(currentPage * pageSize, filteredStudents.length)}
                  </strong>
                  {' of '}
                  <strong style={{ color: t.textHi }}>{filteredStudents.length}</strong> students
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: t.textMid }}>
                    <span>Per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      style={{
                        height: 28,
                        borderRadius: 6,
                        border: `1px solid ${t.stroke}`,
                        background: t.panel,
                        color: t.textHi,
                        padding: '0 6px',
                        fontSize: 12,
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={0}>All</option>
                    </select>
                  </div>

                  {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                        style={{
                          height: 28,
                          padding: '0 10px',
                          borderRadius: 6,
                          border: `1px solid ${t.stroke}`,
                          background: currentPage <= 1 ? t.fieldBg : t.panel,
                          color: currentPage <= 1 ? t.textMid : t.textHi,
                          cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        <ChevronLeft size={14} />
                        <span>Prev</span>
                      </button>

                      <span style={{ fontSize: 12, color: t.textMid, padding: '0 4px' }}>
                        Page <strong style={{ color: t.textHi }}>{currentPage}</strong> of {totalPages}
                      </span>

                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                        style={{
                          height: 28,
                          padding: '0 10px',
                          borderRadius: 6,
                          border: `1px solid ${t.stroke}`,
                          background: currentPage >= totalPages ? t.fieldBg : t.panel,
                          color: currentPage >= totalPages ? t.textMid : t.textHi,
                          cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        <span>Next</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── ROW 5: SAFETY, AUDIT & BEST PRACTICES CARD ──────────────────────── */}
      <div
        style={{
          background: t.panel,
          border: `1px solid ${t.stroke}`,
          borderRadius: 14,
          padding: '18px 22px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: isDark ? 'rgba(235,168,58,0.1)' : 'rgba(235,168,58,0.08)',
              color: t.warn,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={20} />
          </div>
          <div>
            <div style={{ fontFamily: SORA, fontSize: 14, fontWeight: 700, color: t.textHi, marginBottom: 6 }}>
              Billing Integrity & Ledger Controls
            </div>
            <ul style={{ fontSize: 12, color: t.textMid, lineHeight: 1.6, paddingLeft: 18, margin: 0 }}>
              <li><strong>Assign Initial Fees:</strong> Sets the boarding tier first, then calculates fees automatically from school fee structure without duplicate invoices.</li>
              <li><strong>Update Balances:</strong> Posts ledger adjustment records to accurately initialize or correct opening balance accounts.</li>
              <li><strong>SchoolPay Codes:</strong> Reconciles official payment reference numbers for electronic mobile money and bank collection channels.</li>
              <li><strong>Audit Traceability:</strong> All bulk actions record timestamps and authenticated user IDs to maintain audit integrity.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}