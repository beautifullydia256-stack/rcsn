import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';
import { Users, DollarSign, AlertTriangle, CheckCircle, RefreshCw, Calculator, Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { useToast } from '@/components/Toast';

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
  new_schoolpay_code?: string;
};

type SortKey = 'name' | 'current_class' | 'balance' | 'created_at';
type SortDir = 'asc' | 'desc';

type SyncMode = 'assign_fees' | 'update_balances' | 'schoolpay_codes';

export default function StudentFeeSyncPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const toast = useToast();
  
  const [syncMode, setSyncMode] = useState<SyncMode>('assign_fees');
  const [students, setStudents] = useState<StudentSyncData[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedAll, setSelectedAll] = useState(false);
  const [balanceUpdateMode, setBalanceUpdateMode] = useState<'payment' | 'balance'>('payment');
  const [bulkSchoolPayCode, setBulkSchoolPayCode] = useState('');

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
  });

  const schoolId = schoolData?.school_id;

  const loadStudents = async () => {
    if (!schoolId) return;
    setLoading(true);
    
    try {
      if (syncMode === 'assign_fees') {
        // Load students without CURRENT TERM invoices (not all invoices)
        // This matches the existing system logic that shows "Activate invoice for current term"
        
        // First get current term
        const { data: currentTermId } = await supabase.rpc('resolve_current_school_term_id', {
          p_school_id: schoolId,
          p_today: new Date().toISOString().split('T')[0]
        });

        if (!currentTermId) {
          toast.error('No current term found. Please set up school terms first.');
          setStudents([]);
          return;
        }

        const { data, error } = await supabase
          .from('students')
          .select(`
            student_id,
            name,
            current_class,
            boarding_type,
            admission_number,
            created_at,
            status
          `)
          .eq('school_id', schoolId)
          .eq('status', 'active')
          .order('name');

        if (error) throw error;

        // Check which students have invoices for CURRENT TERM (not all terms)
        const studentIds = data.map(s => s.student_id);
        const { data: currentTermInvoices } = await supabase
          .from('student_invoices')
          .select('student_id')
          .eq('school_id', schoolId)
          .eq('term_id', currentTermId)
          .in('student_id', studentIds)
          .eq('is_supplementary', false)
          .neq('status', 'cancelled');

        const studentsWithCurrentTermInvoices = new Set(currentTermInvoices?.map(i => i.student_id) || []);

        const studentsData: StudentSyncData[] = data
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

        setStudents(studentsData);
      } else if (syncMode === 'update_balances') {
        // Load students with existing invoices (for balance updates)
        const { data, error } = await supabase.rpc('get_students_with_balances', {
          p_school_id: schoolId
        });

        if (error) throw error;

        const studentsData: StudentSyncData[] = (data || []).map((s: any) => ({
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
          payment_amount: 0,
          balance_amount: Number(s.balance || 0)
        }));

        setStudents(studentsData);
      } else if (syncMode === 'schoolpay_codes') {
        // Load students without SchoolPay payment codes
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

        const studentsData: StudentSyncData[] = data.map(s => ({
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

        setStudents(studentsData);
      }
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStudents();
    setSearchQ('');
    setClassFilter('all');
    setDateFilter('all');
    setSortKey('name');
    setSortDir('asc');
  }, [schoolId, syncMode]);

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

  const toggleSelectAll = () => {
    const newSelected = !selectedAll;
    setSelectedAll(newSelected);
    setStudents(prev => prev.map(s => ({ ...s, selected: newSelected })));
  };

  const toggleStudent = (studentId: string) => {
    setStudents(prev => prev.map(s => 
      s.student_id === studentId ? { ...s, selected: !s.selected } : s
    ));
  };

  const updateStudentBoardingType = (studentId: string, boardingType: 'Day Scholar' | 'Boarding') => {
    setStudents(prev => prev.map(s => 
      s.student_id === studentId ? { ...s, new_boarding_type: boardingType } : s
    ));
  };

  const updateStudentAmount = (studentId: string, field: 'payment_amount' | 'balance_amount', value: number) => {
    setStudents(prev => prev.map(s => 
      s.student_id === studentId ? { ...s, [field]: value } : s
    ));
  };

  const updateStudentSchoolPayCode = (studentId: string, code: string) => {
    setStudents(prev => prev.map(s => 
      s.student_id === studentId ? { ...s, new_schoolpay_code: code } : s
    ));
  };

  const applyBulkSchoolPayCode = () => {
    if (!bulkSchoolPayCode.trim()) {
      toast.error('Please enter a SchoolPay code');
      return;
    }
    
    setStudents(prev => prev.map(s => 
      s.selected ? { ...s, new_schoolpay_code: bulkSchoolPayCode.trim() } : s
    ));
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
        // Assign initial fees
        for (const student of selectedStudents) {
          try {
            // Update boarding type if changed
            if (student.new_boarding_type !== student.boarding_type) {
              await supabase
                .from('students')
                .update({ 
                  boarding_type: student.new_boarding_type,
                  updated_at: new Date().toISOString()
                })
                .eq('school_id', schoolId)
                .eq('student_id', student.student_id);
            }

            // Trigger fee assignment
            const response = await fetch('/api/admin/sync-student-balances', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                schoolId,
                studentIds: [student.student_id]
              }),
            });

            if (response.ok) {
              successCount++;
            } else {
              errorCount++;
            }
          } catch (error) {
            console.error(`Error syncing student ${student.name}:`, error);
            errorCount++;
          }
        }
      } else if (syncMode === 'update_balances') {
        // Update balances
        for (const student of selectedStudents) {
          try {
            if (balanceUpdateMode === 'payment' && student.payment_amount && student.payment_amount > 0) {
              // Record payment
              const { error } = await supabase.from('student_payments').insert({
                school_id: schoolId,
                student_id: student.student_id,
                amount: student.payment_amount,
                payment_method: 'Manual Adjustment',
                payment_date: new Date().toISOString().split('T')[0],
                description: 'Balance sync adjustment',
                status: 'Approved',
                created_by: user?.id
              });

              if (!error) successCount++;
              else errorCount++;
            } else if (balanceUpdateMode === 'balance' && typeof student.balance_amount === 'number') {
              // Update balance directly
              const adjustment = student.balance_amount - student.balance;
              if (Math.abs(adjustment) > 0.01) {
                const { error } = await supabase.from('student_payments').insert({
                  school_id: schoolId,
                  student_id: student.student_id,
                  amount: -adjustment, // Negative if reducing balance, positive if increasing
                  payment_method: 'Balance Adjustment',
                  payment_date: new Date().toISOString().split('T')[0],
                  description: `Balance correction: ${adjustment > 0 ? 'increased' : 'decreased'} by UGX ${Math.abs(adjustment).toLocaleString()}`,
                  status: 'Approved',
                  created_by: user?.id
                });

                if (!error) successCount++;
                else errorCount++;
              }
            }
          } catch (error) {
            console.error(`Error updating balance for ${student.name}:`, error);
            errorCount++;
          }
        }
      } else if (syncMode === 'schoolpay_codes') {
        // Update SchoolPay codes
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

      // Refresh data
      await loadStudents();
      
      if (successCount > 0) {
        toast.success(`Successfully processed ${successCount} student${successCount !== 1 ? 's' : ''}`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to process ${errorCount} student${errorCount !== 1 ? 's' : ''}`);
      }

      // Reset selections
      setSelectedAll(false);
      
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Sync operation failed');
    } finally {
      setSyncing(false);
    }
  };

  const selectedCount = students.filter(s => s.selected).length;
  const shownCount = filteredStudents.length;

  return (
    <AdminPageWrapper title="Student Fee Sync">
      <div className="space-y-6">
        {/* Mode Selection */}
        <div className={adminCardClass}>
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-lg font-semibold ac-text-primary">Sync Mode</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setSyncMode('assign_fees')}
              className={`p-4 rounded-lg border-2 transition-all ${
                syncMode === 'assign_fees'
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-gray-300 dark:border-gray-600 hover:border-emerald-400'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Users className="h-5 w-5 text-emerald-600" />
                <span className="font-semibold ac-text-primary">Assign Initial Fees</span>
              </div>
              <p className="text-sm ac-text-secondary text-left">
                Set boarding type FIRST, then sync students to current term fees. System automatically calculates fees based on boarding type. Only shows students without current term invoices.
              </p>
            </button>
            
            <button
              onClick={() => setSyncMode('update_balances')}
              className={`p-4 rounded-lg border-2 transition-all ${
                syncMode === 'update_balances'
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Calculator className="h-5 w-5 text-blue-600" />
                <span className="font-semibold ac-text-primary">Update Balances</span>
              </div>
              <p className="text-sm ac-text-secondary text-left">
                Update existing student balances with payments or corrections.
              </p>
            </button>

            <button
              onClick={() => setSyncMode('schoolpay_codes')}
              className={`p-4 rounded-lg border-2 transition-all ${
                syncMode === 'schoolpay_codes'
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-gray-300 dark:border-gray-600 hover:border-purple-400'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="h-5 w-5 text-purple-600" />
                <span className="font-semibold ac-text-primary">SchoolPay Codes</span>
              </div>
              <p className="text-sm ac-text-secondary text-left">
                Assign SchoolPay payment codes to students who don't have them yet.
              </p>
            </button>
          </div>
        </div>

        {/* SchoolPay Bulk Code Input */}
        {syncMode === 'schoolpay_codes' && (
          <div className={adminCardClass}>
            <h3 className="font-semibold ac-text-primary mb-3">Bulk SchoolPay Code Assignment</h3>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium ac-text-secondary mb-1">
                  SchoolPay Code (will be applied to selected students)
                </label>
                <input
                  type="text"
                  value={bulkSchoolPayCode}
                  onChange={(e) => setBulkSchoolPayCode(e.target.value)}
                  className="ac-input w-full"
                  placeholder="Enter SchoolPay code"
                />
              </div>
              <button
                onClick={applyBulkSchoolPayCode}
                disabled={!bulkSchoolPayCode.trim() || selectedCount === 0}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                Apply to Selected ({selectedCount})
              </button>
            </div>
            <p className="text-xs ac-text-muted mt-2">
              This will assign the same SchoolPay code to all selected students. Each student will get their own unique identifier.
            </p>
          </div>
        )}

        {/* Balance Update Mode Selection */}
        {syncMode === 'update_balances' && (
          <div className={adminCardClass}>
            <h3 className="font-semibold ac-text-primary mb-3">Balance Update Method</h3>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="balanceMode"
                  checked={balanceUpdateMode === 'payment'}
                  onChange={() => setBalanceUpdateMode('payment')}
                  className="text-emerald-600"
                />
                <span className="ac-text-primary">Record Payment Amount</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="balanceMode"
                  checked={balanceUpdateMode === 'balance'}
                  onChange={() => setBalanceUpdateMode('balance')}
                  className="text-emerald-600"
                />
                <span className="ac-text-primary">Set Current Balance</span>
              </label>
            </div>
          </div>
        )}

        {/* Students List */}
        <div className={adminCardClass}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold ac-text-primary">
                {syncMode === 'assign_fees' ? 'Students Without Current Term Invoice' :
                 syncMode === 'update_balances' ? 'Students With Existing Balances' :
                 'Students Without SchoolPay Codes'}
              </h3>
              {loading && <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />}
            </div>
            <button
              onClick={loadStudents}
              disabled={loading}
              className="ac-glass-btn-secondary px-3 py-2 text-sm"
            >
              Refresh
            </button>
          </div>

          {/* Search + filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ac-text-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name, admission no., class…"
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                className="ac-input pl-9 w-full text-sm"
              />
            </div>
            {availableClasses.length > 1 && (
              <select
                value={classFilter}
                onChange={e => setClassFilter(e.target.value)}
                className="ac-input text-sm"
              >
                <option value="all">All classes</option>
                {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="ac-input text-sm"
            >
              <option value="all">All time</option>
              <option value="today">Added today</option>
              <option value="week">Added this week</option>
              <option value="month">Added this month</option>
            </select>
          </div>

          <p className="text-xs ac-text-muted mb-3">
            Showing {shownCount} of {students.length} student{students.length !== 1 ? 's' : ''}
            {selectedCount > 0 ? ` · ${selectedCount} selected` : ''}
          </p>

          {students.length === 0 ? (
            <div className="text-center py-8 ac-text-secondary">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-emerald-600" />
              <p className="text-lg font-medium">
                {syncMode === 'assign_fees'
                  ? 'All students have been assigned fees!'
                  : syncMode === 'update_balances'
                  ? 'No students with balances found'
                  : 'All students have SchoolPay codes!'
                }
              </p>
              <p className="text-sm mt-1">
                {syncMode === 'assign_fees'
                  ? 'Every active student has proper fee assignments.'
                  : syncMode === 'update_balances'
                  ? 'Try switching to "Assign Initial Fees" mode.'
                  : 'Every active student has a SchoolPay payment code.'
                }
              </p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-8 ac-text-secondary">
              <Search className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-base font-medium">No students match your filters.</p>
              <button
                onClick={() => { setSearchQ(''); setClassFilter('all'); setDateFilter('all'); }}
                className="mt-2 text-sm text-emerald-600 hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              {/* Bulk Actions */}
              <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedAll}
                    onChange={toggleSelectAll}
                    className="text-emerald-600"
                  />
                  <span className="font-medium ac-text-primary">
                    Select All ({students.length} students)
                  </span>
                </label>

                {selectedCount > 0 && (
                  <button
                    onClick={syncSelectedStudents}
                    disabled={syncing}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {syncing ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <DollarSign className="h-4 w-4" />
                    )}
                    {syncMode === 'assign_fees' ? 'Assign Fees' :
                     syncMode === 'update_balances' ? 'Update Balances' :
                     'Assign Codes'} ({selectedCount})
                  </button>
                )}
              </div>

              {/* Students Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-2 font-medium ac-text-secondary">Select</th>
                      <th
                        className="text-left py-3 px-2 font-medium ac-text-secondary cursor-pointer select-none hover:ac-text-primary"
                        onClick={() => toggleSort('name')}
                      >
                        Student<SortIcon col="name" />
                      </th>
                      <th
                        className="text-left py-3 px-2 font-medium ac-text-secondary cursor-pointer select-none hover:ac-text-primary"
                        onClick={() => toggleSort('current_class')}
                      >
                        Class<SortIcon col="current_class" />
                      </th>
                      <th className="text-left py-3 px-2 font-medium ac-text-secondary">Boarding</th>
                      {syncMode === 'assign_fees' && (
                        <th className="text-left py-3 px-2 font-medium ac-text-secondary">Set Boarding Type</th>
                      )}
                      {syncMode === 'update_balances' && (
                        <>
                          <th
                            className="text-right py-3 px-2 font-medium ac-text-secondary cursor-pointer select-none hover:ac-text-primary"
                            onClick={() => toggleSort('balance')}
                          >
                            Balance<SortIcon col="balance" />
                          </th>
                          <th className="text-right py-3 px-2 font-medium ac-text-secondary">
                            {balanceUpdateMode === 'payment' ? 'Payment Amount' : 'New Balance'}
                          </th>
                        </>
                      )}
                      {syncMode === 'schoolpay_codes' && (
                        <>
                          <th className="text-left py-3 px-2 font-medium ac-text-secondary">Current Code</th>
                          <th className="text-left py-3 px-2 font-medium ac-text-secondary">New Code</th>
                        </>
                      )}
                      <th
                        className="text-left py-3 px-2 font-medium ac-text-secondary cursor-pointer select-none hover:ac-text-primary"
                        onClick={() => toggleSort('created_at')}
                      >
                        Enrolled<SortIcon col="created_at" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr key={student.student_id} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-3 px-2">
                          <input
                            type="checkbox"
                            checked={student.selected || false}
                            onChange={() => toggleStudent(student.student_id)}
                            className="text-emerald-600"
                          />
                        </td>
                        <td className="py-3 px-2">
                          <div>
                            <div className="font-medium ac-text-primary">{student.name}</div>
                            <div className="text-sm ac-text-secondary">{student.admission_number}</div>
                          </div>
                        </td>
                        <td className="py-3 px-2 ac-text-primary">{student.current_class}</td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              student.boarding_type === 'Boarding'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            }`}>
                              {student.boarding_type === 'Boarding' ? '🏠 Boarding' : '🚌 Day Scholar'}
                            </span>
                          </div>
                        </td>
                        {syncMode === 'assign_fees' && (
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              <select
                                value={student.new_boarding_type || student.boarding_type}
                                onChange={(e) => updateStudentBoardingType(student.student_id, e.target.value as 'Day Scholar' | 'Boarding')}
                                className="ac-input py-1 px-3 text-sm min-w-[140px]"
                              >
                                <option value="Day Scholar">🚌 Day Scholar</option>
                                <option value="Boarding">🏠 Boarding</option>
                              </select>
                              {student.new_boarding_type !== student.boarding_type && (
                                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                  Changed
                                </span>
                              )}
                            </div>
                          </td>
                        )}
                        {syncMode === 'update_balances' && (
                          <>
                            <td className="py-3 px-2 text-right font-mono">
                              <span className={student.balance > 0 ? 'text-red-600' : 'text-green-600'}>
                                UGX {student.balance.toLocaleString()}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-right">
                              <input
                                type="number"
                                min="0"
                                step="1000"
                                value={balanceUpdateMode === 'payment' ? (student.payment_amount || 0) : (student.balance_amount || 0)}
                                onChange={(e) => updateStudentAmount(
                                  student.student_id,
                                  balanceUpdateMode === 'payment' ? 'payment_amount' : 'balance_amount',
                                  Number(e.target.value) || 0
                                )}
                                className="ac-input py-1 px-2 text-sm text-right w-32"
                                placeholder="0"
                              />
                            </td>
                          </>
                        )}
                        {syncMode === 'schoolpay_codes' && (
                          <>
                            <td className="py-3 px-2">
                              <span className="text-sm ac-text-muted font-mono">
                                {student.schoolpay_payment_code || '—'}
                              </span>
                            </td>
                            <td className="py-3 px-2">
                              <input
                                type="text"
                                value={student.new_schoolpay_code || ''}
                                onChange={(e) => updateStudentSchoolPayCode(student.student_id, e.target.value)}
                                className="ac-input py-1 px-2 text-sm w-40"
                                placeholder="Enter code"
                              />
                            </td>
                          </>
                        )}
                        <td className="py-3 px-2 text-xs ac-text-muted whitespace-nowrap">
                          {student.created_at
                            ? new Date(student.created_at).toLocaleDateString('en-UG', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Warnings */}
        <div className={`${adminCardClass} border-amber-500/30 bg-amber-500/10`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">Important Notes</h4>
              <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                <li>• <strong>Assign Initial Fees:</strong> Set boarding type FIRST, then fees are calculated automatically</li>
                <li>• <strong>Update Balances:</strong> Creates payment records to adjust existing balances</li>
                <li>• <strong>SchoolPay Codes:</strong> Assigns payment codes for students without them</li>
                <li>• <strong>Boarding Type Changes:</strong> Automatically recalculates fees based on fee structure</li>
                <li>• <strong>Current Term Only:</strong> System prevents duplicate invoices for same term</li>
                <li>• <strong>Backup Recommended:</strong> Consider backing up financial data before bulk operations</li>
                <li>• <strong>Audit Trail:</strong> All changes are logged with timestamps and user information</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AdminPageWrapper>
  );
}