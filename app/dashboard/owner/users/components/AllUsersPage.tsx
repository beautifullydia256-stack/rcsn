"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

interface User {
  userId: string;
  name: string;
  email: string;
  role: string;
  schoolId: string;
  schoolName: string;
  status: string;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

interface UserFilters {
  role?: string;
  schoolId?: string;
  status?: string;
  search?: string;
}

interface AllUsersPageProps {
  onStatsUpdate: () => void;
}

const ROLES = [
  { value: 'admin', label: 'Admin', color: 'purple' },
  { value: 'teacher', label: 'Teacher', color: 'blue' },
  { value: 'parent', label: 'Parent', color: 'green' },
  { value: 'student', label: 'Student', color: 'yellow' },
  { value: 'accountant', label: 'Accountant', color: 'teal' },
  { value: 'librarian', label: 'Librarian', color: 'pink' },
  { value: 'head_teacher', label: 'Head Teacher', color: 'indigo' },
];

export default function AllUsersPage({ onStatsUpdate }: AllUsersPageProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<UserFilters>({});
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  const pageSize = 50;

  const ownerAuthHeaders = async (): Promise<Record<string, string> | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return null;
    return { Authorization: `Bearer ${session.access_token}` };
  };

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const headers = await ownerAuthHeaders();
      if (!headers) return;

      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: ((currentPage - 1) * pageSize).toString(),
      });

      if (filters.role) params.set('role', filters.role);
      if (filters.schoolId) params.set('schoolId', filters.schoolId);
      if (filters.status) params.set('status', filters.status);
      if (filters.search) params.set('search', filters.search);

      const response = await fetch(`/api/owner/users?${params}`, { headers });
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const result = await response.json();
      
      if (result.success) {
        setUsers(result.data.users);
        setTotalCount(result.data.totalCount);
      } else {
        throw new Error(result.error || 'Failed to fetch users');
      }

    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  const loadSchools = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('schools')
        .select('school_id, name')
        .order('name');
      
      setSchools(data || []);
    } catch (error) {
      console.error('Error loading schools:', error);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadSchools();
  }, [loadSchools]);

  const handleFilterChange = (key: keyof UserFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  const handleUserSelect = (userId: string, selected: boolean) => {
    const newSelected = new Set(selectedUsers);
    if (selected) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUsers(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedUsers(new Set(users.map(u => u.userId)));
    } else {
      setSelectedUsers(new Set());
    }
    setShowBulkActions(selected && users.length > 0);
  };

  const handleBulkAction = async (action: string) => {
    if (selectedUsers.size === 0) return;

    try {
      // Implement bulk actions here
      console.log(`Performing ${action} on users:`, Array.from(selectedUsers));
      
      // For now, just clear selection
      setSelectedUsers(new Set());
      setShowBulkActions(false);
      
      // Reload data
      await loadUsers();
      onStatsUpdate();
      
    } catch (error) {
      console.error('Error performing bulk action:', error);
    }
  };

  const getRoleColor = (role: string) => {
    const roleConfig = ROLES.find(r => r.value === role);
    return roleConfig?.color || 'gray';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <h2 className="text-xl font-semibold">All Users</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/70">
              {totalCount.toLocaleString()} total users
            </span>
            {Object.keys(filters).length > 0 && (
              <button
                onClick={clearFilters}
                className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <input
            type="text"
            placeholder="Search users..."
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 text-sm"
          />

          {/* Role Filter */}
          <select
            value={filters.role || ''}
            onChange={(e) => handleFilterChange('role', e.target.value)}
            className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm"
          >
            <option value="">All Roles</option>
            {ROLES.map(role => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>

          {/* School Filter */}
          <select
            value={filters.schoolId || ''}
            onChange={(e) => handleFilterChange('schoolId', e.target.value)}
            className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm"
          >
            <option value="">All Schools</option>
            {schools.map(school => (
              <option key={school.school_id} value={school.school_id}>
                {school.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm"
          >
            <option value="">All Status</option>
            <option value="active">Active (30d)</option>
            <option value="inactive">Inactive (30d+)</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {showBulkActions && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-blue-500/30 bg-blue-500/10 backdrop-blur-md shadow-lg p-4 text-white"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm">
              {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkAction('export')}
                className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm"
              >
                Export
              </button>
              <button
                onClick={() => handleBulkAction('message')}
                className="px-3 py-1 rounded-lg bg-green-600 hover:bg-green-700 text-sm"
              >
                Send Message
              </button>
              <button
                onClick={() => setSelectedUsers(new Set())}
                className="px-3 py-1 rounded-lg bg-gray-600 hover:bg-gray-700 text-sm"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Users Table */}
      <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 text-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="text-left py-3 px-4">
                  <input
                    type="checkbox"
                    checked={users.length > 0 && selectedUsers.size === users.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-white/20 bg-white/10 text-blue-600"
                  />
                </th>
                <th className="text-left py-3 px-4">User</th>
                <th className="text-left py-3 px-4">Role</th>
                <th className="text-left py-3 px-4">School</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Last Login</th>
                <th className="text-left py-3 px-4">Created</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-white/70">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-white/70">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.userId} className="border-t border-white/10 hover:bg-white/5">
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.userId)}
                        onChange={(e) => handleUserSelect(user.userId, e.target.checked)}
                        className="rounded border-white/20 bg-white/10 text-blue-600"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-white/60">{user.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs bg-${getRoleColor(user.role)}-500/20 text-${getRoleColor(user.role)}-400`}>
                        {user.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{user.schoolName}</p>
                        <p className="text-xs text-white/60">{user.schoolId}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className={user.isActive ? 'text-green-400' : 'text-red-400'}>
                          {user.status}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-white/70">
                      {formatDateTime(user.lastLogin)}
                    </td>
                    <td className="py-3 px-4 text-white/70">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          className="px-2 py-1 rounded text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400"
                          title="View Details"
                        >
                          View
                        </button>
                        <button
                          className="px-2 py-1 rounded text-xs bg-green-500/20 hover:bg-green-500/30 text-green-400"
                          title="Send Message"
                        >
                          Message
                        </button>
                        {user.role !== 'owner' && (
                          <button
                            className="px-2 py-1 rounded text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400"
                            title="Suspend User"
                          >
                            Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-white/10 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-white/70">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} users
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Previous
                </button>
                <span className="text-sm text-white/70">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}