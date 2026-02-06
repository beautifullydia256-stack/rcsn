import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
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
}: {
  schoolId: string | null;
  classOptionsFallback: string[];
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
          title="School Requirements"
          desc="Manage mandatory school materials, uniforms, books, and other requirements with their costs."
        />
        <div className="text-gray-500">Loading requirements...</div>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title="School Requirements"
        desc="Manage mandatory school materials, uniforms, books, and other requirements with their costs."
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h3 className="mb-3 font-medium text-gray-900">
          {editingId ? '✏️ Edit Requirement' : '➕ Add New Requirement'}
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Requirement Name *</label>
            <input
              type="text"
              value={requirementName}
              onChange={(e) => setRequirementName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 placeholder-gray-400"
              placeholder="e.g., School Uniform"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Cost (UGX) *</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900"
              placeholder="e.g., 50000"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Boarding Type *</label>
            <select
              value={boardingType}
              onChange={(e) =>
                setBoardingType(e.target.value as 'Day Scholar' | 'Boarding' | 'Both')
              }
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900"
            >
              <option value="Day Scholar">Day Scholar</option>
              <option value="Boarding">Boarding</option>
              <option value="Both">Both</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Class (Optional)</label>
            <select
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900"
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
            <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive')}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 placeholder-gray-400"
              placeholder="Brief description"
            />
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !requirementName.trim()}
            className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : editingId ? 'Update' : 'Add'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-500"
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
          className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 placeholder-gray-400"
        />
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900"
          >
            <option value="name">Sort by Name</option>
            <option value="cost">Sort by Cost</option>
            <option value="boarding_type">Sort by Boarding Type</option>
            <option value="class_name">Sort by Class</option>
            <option value="status">Sort by Status</option>
            <option value="created_at">Sort by Date</option>
          </select>
          <button
            type="button"
            onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 hover:bg-gray-50"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium text-gray-700">Requirement Name</th>
              <th className="px-4 py-3 font-medium text-gray-700">Boarding Type</th>
              <th className="px-4 py-3 font-medium text-gray-700">Class</th>
              <th className="px-4 py-3 font-medium text-gray-700">Description</th>
              <th className="px-4 py-3 font-medium text-gray-700">Cost (UGX)</th>
              <th className="px-4 py-3 font-medium text-gray-700">Status</th>
              <th className="px-4 py-3 font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="[&>tr:nth-child(even)]:bg-gray-50">
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                  {searchTerm ? 'No requirements found.' : 'No requirements added yet.'}
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((req) => (
                <tr key={req.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium text-gray-900">{req.requirement_name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-1 text-xs ${
                        req.boarding_type === 'Boarding'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {req.boarding_type || 'Day Scholar'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{req.class_name || 'All Classes'}</td>
                  <td className="px-4 py-3 text-gray-700">{req.description || '-'}</td>
                  <td className="px-4 py-3 text-gray-900">
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
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
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
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="text-sm text-gray-700">
            <strong>Total Requirements:</strong> {requirements.length} |{' '}
            <strong>Active:</strong> {requirements.filter((r) => r.status === 'Active').length} |{' '}
            <strong>Total Value:</strong>{' '}
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
