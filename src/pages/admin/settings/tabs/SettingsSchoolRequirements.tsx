import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import SectionHeader from './SectionHeader';
import { settingsInsetSurface, settingsPrimaryActionClass } from './settingsTabStyles';

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
      <div>
        <SectionHeader
          embedded={embedded}
          title="School Requirements"
          desc="Manage mandatory school materials, uniforms, books, and other requirements with their costs."
        />
        <div className="ac-text-muted">Loading requirements...</div>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        embedded={embedded}
        title="School Requirements"
        desc="Manage mandatory school materials, uniforms, books, and other requirements with their costs."
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

      <div className={`mb-6 ${settingsInsetSurface} p-4 sm:p-5`}>
        <h3 className="mb-3 font-medium ac-text-primary">
          {editingId ? '✏️ Edit Requirement' : '➕ Add New Requirement'}
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium ac-text-secondary">Requirement Name *</label>
            <input
              type="text"
              value={requirementName}
              onChange={(e) => setRequirementName(e.target.value)}
              className="ac-input min-h-[44px] w-full"
              placeholder="e.g., School Uniform"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium ac-text-secondary">Cost (UGX) *</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="ac-input min-h-[44px] w-full"
              placeholder="e.g., 50000"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium ac-text-secondary">Residency / Accommodation *</label>
            <select
              value={boardingType}
              onChange={(e) =>
                setBoardingType(e.target.value as any)
              }
              className="ac-input min-h-[44px] w-full"
            >
              <option value="Non-Resident">Non-Resident</option>
              <option value="Resident">Resident</option>
              <option value="Both">Both (All Students)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium ac-text-secondary">Class (Optional)</label>
            <select
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="ac-input min-h-[44px] w-full"
            >
              <option value="">All Classes</option>
              {classOptions.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium ac-text-secondary">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive')}
              className="ac-input min-h-[44px] w-full"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium ac-text-secondary">Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="ac-input min-h-[44px] w-full"
              placeholder="Brief description"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !requirementName.trim()}
            className={settingsPrimaryActionClass}
          >
            {saving ? 'Saving...' : editingId ? 'Update' : 'Add'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={handleCancel}
              className="ac-glass-btn-secondary min-h-[44px] rounded-lg px-4 py-2 ac-text-primary"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          placeholder="Search requirements..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="ac-input min-h-[44px] flex-1"
        />
        <div className="flex flex-wrap gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="ac-input min-h-[44px] grow sm:grow-0"
          >
            <option value="name">Sort by Name</option>
            <option value="cost">Sort by Cost</option>
            <option value="boarding_type">Sort by Residency</option>
            <option value="class_name">Sort by Class</option>
            <option value="status">Sort by Status</option>
            <option value="created_at">Sort by Date</option>
          </select>
          <button
            type="button"
            onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
            className="ac-glass-btn-secondary min-h-[44px] min-w-[44px] ac-text-primary"
            aria-label={sortOrder === 'asc' ? 'Sort descending' : 'Sort ascending'}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      <div className={`overflow-x-auto ${settingsInsetSurface}`}>
        <table className="min-w-full min-w-[640px] text-sm md:min-w-0">
          <thead className="bg-[var(--pw-s3)]">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium ac-text-muted">Requirement Name</th>
              <th className="px-4 py-3 font-medium ac-text-muted">Residency</th>
              <th className="px-4 py-3 font-medium ac-text-muted">Class</th>
              <th className="px-4 py-3 font-medium ac-text-muted">Description</th>
              <th className="px-4 py-3 font-medium ac-text-muted">Cost (UGX)</th>
              <th className="px-4 py-3 font-medium ac-text-muted">Status</th>
              <th className="px-4 py-3 font-medium ac-text-muted">Actions</th>
            </tr>
          </thead>
          <tbody className="[&>tr:nth-child(even)]:bg-[var(--pw-s3)]/40">
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center ac-text-muted">
                  {searchTerm ? 'No requirements found.' : 'No requirements added yet.'}
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((req) => (
                <tr key={req.id} className="border-t border-[var(--pw-border)]">
                  <td className="px-4 py-3 font-medium ac-text-primary">{req.requirement_name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-1 text-xs ${
                        req.boarding_type === 'Boarding' || req.boarding_type === 'Resident'
                          ? 'bg-blue-600/25 text-blue-200'
                          : 'bg-emerald-600/25 text-emerald-200'
                      }`}
                    >
                      {req.boarding_type === 'Boarding' || req.boarding_type === 'Resident'
                        ? 'Resident'
                        : req.boarding_type === 'Both'
                        ? 'Both'
                        : 'Non-Resident'}
                    </span>
                  </td>
                  <td className="px-4 py-3 ac-text-secondary">{req.class_name || 'All Classes'}</td>
                  <td className="px-4 py-3 ac-text-secondary">{req.description || '-'}</td>
                  <td className="px-4 py-3 ac-text-primary">
                    {new Intl.NumberFormat('en-UG', {
                      style: 'currency',
                      currency: 'UGX',
                      minimumFractionDigits: 0,
                    }).format(req.cost)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-1 text-xs ${
                        req.status === 'Active'
                          ? 'bg-emerald-600/25 text-emerald-200'
                          : 'bg-red-600/25 text-red-200'
                      }`}
                    >
                      {req.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(req)}
                        className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(req.id)}
                        className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {requirements.length > 0 && (
        <div className="mt-4 rounded-lg border border-[var(--pw-border)] bg-[var(--pw-s2)] p-3">
          <div className="text-sm ac-text-secondary">
            <strong className="ac-text-primary">Total Requirements:</strong> {requirements.length} |{' '}
            <strong className="ac-text-primary">Active:</strong> {requirements.filter((r) => r.status === 'Active').length} |{' '}
            <strong className="ac-text-primary">Total Value:</strong>{' '}
            {new Intl.NumberFormat('en-UG', {
              style: 'currency',
              currency: 'UGX',
              minimumFractionDigits: 0,
            }).format(requirements.reduce((sum, r) => sum + Number(r.cost), 0))}
          </div>
        </div>
      )}
    </div>
  );
}
