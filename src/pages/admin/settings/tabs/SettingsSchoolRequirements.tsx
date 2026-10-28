import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { GovRollingBox } from '@/components/ui/GovLoadingIndicator';
import SectionHeader from './SectionHeader';

const STALE_TIME_MS = 5 * 60 * 1000;

type Requirement = {
  id: string;
  requirement_name: string;
  description?: string;
  cost: number;
  status: string;
  boarding_type?: string;
  class_name?: string;
  created_at?: string;
};

async function fetchRequirementsPage(
  schoolId: string,
  classOptionsFallback: string[]
): Promise<{ requirements: Requirement[]; classOptions: string[] }> {
  const [reqRes, classRes] = await Promise.all([
    supabase
      .from('school_requirements')
      .select('*')
      .eq('school_id', schoolId)
      .order('requirement_name'),
    supabase.from('classes').select('class_name').eq('school_id', schoolId).order('class_name'),
  ]);
  if (reqRes.error) throw reqRes.error;
  const requirements = reqRes.data || [];
  const classOptions =
    classRes.data?.length ?
      classRes.data.map((c: { class_name: string }) => c.class_name)
    : classOptionsFallback;
  return { requirements, classOptions };
}

export default function SettingsSchoolRequirements({
  schoolId,
  classOptionsFallback,
  embedded,
}: {
  schoolId: string | null;
  classOptionsFallback: string[];
  embedded?: boolean;
}) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<
    'name' | 'cost' | 'status' | 'boarding_type' | 'class_name' | 'created_at'
  >('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [requirementName, setRequirementName] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [boardingType, setBoardingType] = useState<'Day Scholar' | 'Boarding' | 'Both'>(
    'Day Scholar'
  );
  const [className, setClassName] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'settings', 'requirements', schoolId ?? ''],
    queryFn: () => fetchRequirementsPage(schoolId!, classOptionsFallback),
    enabled: !!schoolId,
    staleTime: STALE_TIME_MS,
  });

  const requirements = data?.requirements ?? [];
  const classOptions = data?.classOptions ?? classOptionsFallback;
  const loading = isLoading;

  const handleSave = async () => {
    if (!schoolId || !requirementName.trim()) {
      setError('Requirement name is required');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const requirementData = {
        school_id: schoolId,
        requirement_name: requirementName.trim(),
        description: description.trim() || null,
        cost: parseFloat(cost) || 0,
        status,
        boarding_type: boardingType,
        class_name: className || null,
      };

      if (editingId) {
        const { error: updateError } = await supabase
          .from('school_requirements')
          .update(requirementData)
          .eq('id', editingId);
        if (updateError) throw updateError;
        setSuccess('Requirement updated successfully!');
      } else {
        const { error: insertError } = await supabase
          .from('school_requirements')
          .insert(requirementData);
        if (insertError) throw insertError;
        setSuccess('Requirement added successfully!');
      }

      setEditingId(null);
      setRequirementName('');
      setDescription('');
      setCost('');
      setStatus('Active');
      setBoardingType('Day Scholar');
      setClassName('');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'requirements', schoolId] });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save requirement');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (requirement: (typeof requirements)[0]) => {
    setEditingId(requirement.id);
    setRequirementName(requirement.requirement_name);
    setDescription(requirement.description || '');
    setCost(String(requirement.cost));
    setStatus(requirement.status as 'Active' | 'Inactive');
    setBoardingType((requirement.boarding_type as 'Day Scholar' | 'Boarding' | 'Both') || 'Day Scholar');
    setClassName(requirement.class_name || '');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this requirement?')) return;
    try {
      const { error: err } = await supabase.from('school_requirements').delete().eq('id', id);
      if (err) throw err;
      setSuccess('Requirement deleted successfully!');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'requirements', schoolId] });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setRequirementName('');
    setDescription('');
    setCost('');
    setStatus('Active');
    setBoardingType('Day Scholar');
    setClassName('');
  };

  const filteredAndSorted = useMemo(() => {
    let filtered = requirements.filter(
      (req) =>
        req.requirement_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (req.description && req.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (req.boarding_type &&
          req.boarding_type.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (req.class_name && req.class_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    filtered.sort((a, b) => {
      let aVal: string | number, bVal: string | number;
      switch (sortBy) {
        case 'name':
          aVal = a.requirement_name.toLowerCase();
          bVal = b.requirement_name.toLowerCase();
          break;
        case 'cost':
          aVal = Number(a.cost);
          bVal = Number(b.cost);
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        case 'boarding_type':
          aVal = (a.boarding_type || 'Day Scholar').toLowerCase();
          bVal = (b.boarding_type || 'Day Scholar').toLowerCase();
          break;
        case 'class_name':
          aVal = (a.class_name || 'All Classes').toLowerCase();
          bVal = (b.class_name || 'All Classes').toLowerCase();
          break;
        case 'created_at':
          aVal = new Date(a.created_at || 0).getTime();
          bVal = new Date(b.created_at || 0).getTime();
          break;
        default:
          return 0;
      }
      if (sortOrder === 'asc') return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    });
    return filtered;
  }, [requirements, searchTerm, sortBy, sortOrder]);

  if (loading) {
    return (
      <div className="py-20 flex items-center justify-center w-full">
        <GovRollingBox size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        embedded={embedded}
        title="STUDENT REQUIREMENTS & MATERIAL FEES"
        badge="INSTITUTIONAL REQUIREMENTS"
      />

      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-xs font-mono text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded border border-emerald-300 bg-emerald-50 p-3 text-xs font-mono text-emerald-800">
          {success}
        </div>
      )}

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="gov-card p-3 text-center border border-[#CCCCCC]">
          <span className="text-[11px] font-mono uppercase font-bold text-[#666666] tracking-wider block">
            REGISTERED ITEMS
          </span>
          <span className="text-xl font-mono font-bold text-[#111111] mt-1 block">
            {requirements.length}
          </span>
        </div>
        <div className="gov-card p-3 text-center border border-[#CCCCCC]">
          <span className="text-[11px] font-mono uppercase font-bold text-[#666666] tracking-wider block">
            ACTIVE REQUIREMENTS
          </span>
          <span className="text-xl font-mono font-bold text-[#111111] mt-1 block">
            {requirements.filter((r) => r.status === 'Active').length}
          </span>
        </div>
        <div className="gov-card p-3 text-center border border-[#CCCCCC]">
          <span className="text-[11px] font-mono uppercase font-bold text-[#666666] tracking-wider block">
            CUMULATIVE VALUE
          </span>
          <span className="text-xl font-mono font-bold text-[#111111] mt-1 block">
            UGX {new Intl.NumberFormat('en-UG').format(requirements.reduce((sum, r) => sum + Number(r.cost || 0), 0))}
          </span>
        </div>
      </div>

      {/* Entry Form Card */}
      <div className="gov-card p-5 space-y-4">
        <div className="border-b border-[#E2E8F0] pb-2 mb-2 flex items-center justify-between">
          <span className="text-xs font-mono uppercase font-bold text-[#111111] tracking-wider">
            {editingId ? 'EDIT REQUIREMENT RECORD' : 'REGISTER NEW REQUIREMENT SPECIFICATION'}
          </span>
          {editingId && (
            <span className="text-[11px] font-mono text-[#888888] uppercase">[EDITING MODE]</span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-mono uppercase font-bold text-[#555555]">
              REQUIREMENT NAME *
            </label>
            <input
              type="text"
              value={requirementName}
              onChange={(e) => setRequirementName(e.target.value)}
              className="gov-input w-full"
              placeholder="e.g. Clinical Uniform / Medical Kit"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-mono uppercase font-bold text-[#555555]">
              COST (UGX) *
            </label>
            <input
              type="number"
              min={0}
              step={100}
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="gov-input w-full font-mono text-xs"
              placeholder="e.g. 50000"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-mono uppercase font-bold text-[#555555]">
              RESIDENCY APPLICABILITY *
            </label>
            <select
              value={boardingType}
              onChange={(e) =>
                setBoardingType(e.target.value as 'Day Scholar' | 'Boarding' | 'Both')
              }
              className="gov-select w-full"
            >
              <option value="Day Scholar">Non-Resident Only</option>
              <option value="Boarding">Resident (Boarding) Only</option>
              <option value="Both">Both (All Trainees)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-mono uppercase font-bold text-[#555555]">
              COHORT / CLASS SPECIFICATION
            </label>
            <select
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="gov-select w-full"
            >
              <option value="">All Programmes & Cohorts</option>
              {classOptions.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-mono uppercase font-bold text-[#555555]">
              STATUS
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive')}
              className="gov-select w-full"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-mono uppercase font-bold text-[#555555]">
              DESCRIPTION / SPECIFICATIONS
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="gov-input w-full"
              placeholder="e.g. 2 Pairs with institutional crest"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !requirementName.trim()}
            className="gov-btn gov-btn-sm gov-btn-primary"
          >
            {saving ? 'SAVING...' : editingId ? 'UPDATE RECORD' : 'SAVE REQUIREMENT'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={handleCancel}
              className="gov-btn gov-btn-sm"
            >
              CANCEL
            </button>
          )}
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="gov-control-bar">
        <div className="gov-control-bar-left">
          <input
            type="text"
            placeholder="SEARCH REQUIREMENTS BY TITLE, COHORT, RESIDENCY..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="gov-input w-72 text-xs uppercase"
          />
        </div>
        <div className="gov-control-bar-right">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="gov-select w-auto text-xs"
          >
            <option value="name">SORT: NAME</option>
            <option value="cost">SORT: COST</option>
            <option value="boarding_type">SORT: RESIDENCY</option>
            <option value="class_name">SORT: COHORT</option>
            <option value="status">SORT: STATUS</option>
            <option value="created_at">SORT: DATE</option>
          </select>
          <button
            type="button"
            onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
            className="gov-btn gov-btn-sm font-mono"
            aria-label={sortOrder === 'asc' ? 'Sort descending' : 'Sort ascending'}
          >
            {sortOrder === 'asc' ? 'ASC ↑' : 'DESC ↓'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="gov-table-container">
        <table className="gov-table">
          <thead>
            <tr>
              <th className="font-mono">REQUIREMENT TITLE</th>
              <th className="font-mono">RESIDENCY</th>
              <th className="font-mono">COHORT / CLASS</th>
              <th className="font-mono">SPECIFICATION DETAILS</th>
              <th className="font-mono text-right">COST (UGX)</th>
              <th className="font-mono">STATUS</th>
              <th className="font-mono text-right w-32">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-xs font-mono text-[#888888]">
                  {searchTerm ? 'NO REQUIREMENTS MATCHING CRITERIA' : 'NO REQUIREMENTS REGISTERED IN SYSTEM'}
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((req) => (
                <tr key={req.id}>
                  <td className="font-bold text-[#111111]">{req.requirement_name}</td>
                  <td>
                    <span
                      className={`gov-tag ${
                        req.boarding_type === 'Boarding' || req.boarding_type === 'Resident'
                          ? 'gov-tag-approved'
                          : req.boarding_type === 'Both'
                          ? 'bg-[#EAEAEA] text-[#222222] border border-[#CCCCCC]'
                          : 'gov-tag-warned'
                      }`}
                    >
                      {req.boarding_type === 'Boarding' || req.boarding_type === 'Resident'
                        ? 'RESIDENT'
                        : req.boarding_type === 'Both'
                        ? 'ALL TRAINEES'
                        : 'NON-RESIDENT'}
                    </span>
                  </td>
                  <td className="font-mono text-xs text-[#555555]">{req.class_name || 'ALL COHORTS'}</td>
                  <td className="text-xs text-[#666666]">{req.description || '—'}</td>
                  <td className="text-right font-mono font-bold text-[#111111]">
                    {new Intl.NumberFormat('en-UG').format(req.cost)}
                  </td>
                  <td>
                    <span
                      className={`gov-tag ${
                        req.status === 'Active' ? 'gov-tag-approved' : 'gov-tag-rejected'
                      }`}
                    >
                      {req.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleEdit(req)}
                        className="gov-btn gov-btn-sm"
                      >
                        EDIT
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(req.id)}
                        className="gov-btn gov-btn-sm text-red-600 border-[#CCCCCC] hover:bg-red-50"
                      >
                        DEL
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
