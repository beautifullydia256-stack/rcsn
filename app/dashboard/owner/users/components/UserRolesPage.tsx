"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface Role {
  name: string;
  label: string;
  description: string;
  color: string;
  permissions: string[];
  userCount: number;
}

const SYSTEM_PERMISSIONS: Permission[] = [
  // Student Management
  { id: 'students.view', name: 'View Students', description: 'View student profiles and information', category: 'Students' },
  { id: 'students.create', name: 'Create Students', description: 'Add new students to the system', category: 'Students' },
  { id: 'students.edit', name: 'Edit Students', description: 'Modify student information', category: 'Students' },
  { id: 'students.delete', name: 'Delete Students', description: 'Remove students from the system', category: 'Students' },
  
  // Teacher Management
  { id: 'teachers.view', name: 'View Teachers', description: 'View teacher profiles and information', category: 'Teachers' },
  { id: 'teachers.create', name: 'Create Teachers', description: 'Add new teachers to the system', category: 'Teachers' },
  { id: 'teachers.edit', name: 'Edit Teachers', description: 'Modify teacher information', category: 'Teachers' },
  { id: 'teachers.delete', name: 'Delete Teachers', description: 'Remove teachers from the system', category: 'Teachers' },
  
  // Academic Management
  { id: 'classes.manage', name: 'Manage Classes', description: 'Create and manage class schedules', category: 'Academic' },
  { id: 'subjects.manage', name: 'Manage Subjects', description: 'Create and manage subjects', category: 'Academic' },
  { id: 'exams.manage', name: 'Manage Exams', description: 'Create and manage examinations', category: 'Academic' },
  { id: 'grades.manage', name: 'Manage Grades', description: 'Enter and modify student grades', category: 'Academic' },
  
  // Financial Management
  { id: 'payments.view', name: 'View Payments', description: 'View payment records and transactions', category: 'Finance' },
  { id: 'payments.create', name: 'Create Payments', description: 'Record new payments', category: 'Finance' },
  { id: 'payments.edit', name: 'Edit Payments', description: 'Modify payment records', category: 'Finance' },
  { id: 'invoices.manage', name: 'Manage Invoices', description: 'Create and manage invoices', category: 'Finance' },
  
  // Library Management
  { id: 'library.view', name: 'View Library', description: 'View library books and records', category: 'Library' },
  { id: 'library.manage', name: 'Manage Library', description: 'Add, edit, and remove library items', category: 'Library' },
  { id: 'library.checkout', name: 'Library Checkout', description: 'Check out and return books', category: 'Library' },
  
  // System Administration
  { id: 'users.manage', name: 'Manage Users', description: 'Create and manage user accounts', category: 'System' },
  { id: 'school.settings', name: 'School Settings', description: 'Modify school configuration', category: 'System' },
  { id: 'reports.view', name: 'View Reports', description: 'Access system reports and analytics', category: 'System' },
  { id: 'backup.manage', name: 'Manage Backups', description: 'Create and restore system backups', category: 'System' },
];

const DEFAULT_ROLES: Role[] = [
  {
    name: 'owner',
    label: 'Platform Owner',
    description: 'Full platform access across all schools',
    color: 'red',
    permissions: SYSTEM_PERMISSIONS.map(p => p.id), // All permissions
    userCount: 0,
  },
  {
    name: 'admin',
    label: 'School Administrator',
    description: 'Full access to school management functions',
    color: 'purple',
    permissions: [
      'students.view', 'students.create', 'students.edit', 'students.delete',
      'teachers.view', 'teachers.create', 'teachers.edit', 'teachers.delete',
      'classes.manage', 'subjects.manage', 'exams.manage', 'grades.manage',
      'payments.view', 'payments.create', 'payments.edit', 'invoices.manage',
      'library.view', 'library.manage', 'library.checkout',
      'users.manage', 'school.settings', 'reports.view', 'backup.manage',
    ],
    userCount: 0,
  },
  {
    name: 'head_teacher',
    label: 'Head Teacher',
    description: 'Academic oversight and teacher management',
    color: 'indigo',
    permissions: [
      'students.view', 'students.edit',
      'teachers.view', 'teachers.edit',
      'classes.manage', 'subjects.manage', 'exams.manage', 'grades.manage',
      'reports.view',
    ],
    userCount: 0,
  },
  {
    name: 'teacher',
    label: 'Teacher',
    description: 'Classroom and student management',
    color: 'blue',
    permissions: [
      'students.view', 'students.edit',
      'classes.manage', 'exams.manage', 'grades.manage',
      'library.view', 'library.checkout',
    ],
    userCount: 0,
  },
  {
    name: 'accountant',
    label: 'Accountant',
    description: 'Financial management and reporting',
    color: 'teal',
    permissions: [
      'students.view',
      'payments.view', 'payments.create', 'payments.edit', 'invoices.manage',
      'reports.view',
    ],
    userCount: 0,
  },
  {
    name: 'librarian',
    label: 'Librarian',
    description: 'Library management and book tracking',
    color: 'pink',
    permissions: [
      'students.view',
      'library.view', 'library.manage', 'library.checkout',
    ],
    userCount: 0,
  },
  {
    name: 'parent',
    label: 'Parent',
    description: 'View child information and payments',
    color: 'green',
    permissions: [
      'students.view', // Only their children
      'payments.view', // Only their payments
    ],
    userCount: 0,
  },
  {
    name: 'student',
    label: 'Student',
    description: 'View personal academic information',
    color: 'yellow',
    permissions: [
      'library.view', // View available books
    ],
    userCount: 0,
  },
];

export default function UserRolesPage() {
  const [roles, setRoles] = useState<Role[]>(DEFAULT_ROLES);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserCounts();
  }, []);

  const loadUserCounts = async () => {
    try {
      setLoading(true);
      
      // Get user counts by role
      const { data: userData } = await supabase
        .from('users')
        .select('role');

      const roleCounts: Record<string, number> = {};
      (userData || []).forEach((user: any) => {
        roleCounts[user.role] = (roleCounts[user.role] || 0) + 1;
      });

      // Update roles with user counts
      setRoles(prevRoles => 
        prevRoles.map(role => ({
          ...role,
          userCount: roleCounts[role.name] || 0,
        }))
      );

    } catch (error) {
      console.error('Error loading user counts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole({ ...role });
    setShowEditModal(true);
  };

  const handleSaveRole = async () => {
    if (!selectedRole) return;

    try {
      // In a real implementation, this would update the role permissions in the database
      console.log('Saving role permissions:', selectedRole);
      
      // Update local state
      setRoles(prevRoles => 
        prevRoles.map(role => 
          role.name === selectedRole.name ? selectedRole : role
        )
      );
      
      setShowEditModal(false);
      setSelectedRole(null);
      
      // Show success message
      alert('Role permissions updated successfully!');
      
    } catch (error) {
      console.error('Error saving role:', error);
      alert('Failed to update role permissions');
    }
  };

  const togglePermission = (permissionId: string) => {
    if (!selectedRole) return;

    const hasPermission = selectedRole.permissions.includes(permissionId);
    const newPermissions = hasPermission
      ? selectedRole.permissions.filter(p => p !== permissionId)
      : [...selectedRole.permissions, permissionId];

    setSelectedRole({
      ...selectedRole,
      permissions: newPermissions,
    });
  };

  const getPermissionsByCategory = () => {
    const categories: Record<string, Permission[]> = {};
    SYSTEM_PERMISSIONS.forEach(permission => {
      if (!categories[permission.category]) {
        categories[permission.category] = [];
      }
      categories[permission.category].push(permission);
    });
    return categories;
  };

  const getRoleColor = (color: string) => {
    const colors: Record<string, string> = {
      red: 'text-red-400 bg-red-500/20 border-red-500/30',
      purple: 'text-purple-400 bg-purple-500/20 border-purple-500/30',
      indigo: 'text-indigo-400 bg-indigo-500/20 border-indigo-500/30',
      blue: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
      teal: 'text-teal-400 bg-teal-500/20 border-teal-500/30',
      pink: 'text-pink-400 bg-pink-500/20 border-pink-500/30',
      green: 'text-green-400 bg-green-500/20 border-green-500/30',
      yellow: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
    };
    return colors[color] || colors.blue;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white">Loading user roles...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">User Roles & Permissions</h2>
            <p className="text-white/70 text-sm">Manage system permissions for different user roles</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadUserCounts}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm"
            >
              Refresh Counts
            </button>
          </div>
        </div>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {roles.map((role) => (
          <motion.div
            key={role.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl border ${getRoleColor(role.color)} p-6`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{role.label}</h3>
                <p className="text-white/70 text-sm mt-1">{role.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-white/60">
                    {role.userCount} user{role.userCount !== 1 ? 's' : ''}
                  </span>
                  <span className="text-xs text-white/60">•</span>
                  <span className="text-xs text-white/60">
                    {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleEditRole(role)}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
                disabled={role.name === 'owner'} // Owner role cannot be edited
              >
                {role.name === 'owner' ? 'View' : 'Edit'}
              </button>
            </div>

            {/* Permission Categories */}
            <div className="space-y-2">
              {Object.entries(getPermissionsByCategory()).map(([category, permissions]) => {
                const categoryPermissions = permissions.filter(p => role.permissions.includes(p.id));
                if (categoryPermissions.length === 0) return null;

                return (
                  <div key={category} className="text-xs">
                    <span className="text-white/60">{category}:</span>
                    <span className="ml-2 text-white/80">
                      {categoryPermissions.length} of {permissions.length}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Permission Progress */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-white/60 mb-1">
                <span>Permissions</span>
                <span>{role.permissions.length}/{SYSTEM_PERMISSIONS.length}</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div 
                  className="h-2 rounded-full bg-current opacity-60"
                  style={{ width: `${(role.permissions.length / SYSTEM_PERMISSIONS.length) * 100}%` }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Edit Role Modal */}
      {showEditModal && selectedRole && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 rounded-xl border border-white/10 p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-white">
                  {selectedRole.name === 'owner' ? 'View' : 'Edit'} {selectedRole.label} Permissions
                </h3>
                <p className="text-white/70 text-sm">{selectedRole.description}</p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-white/70 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            {/* Permissions by Category */}
            <div className="space-y-6">
              {Object.entries(getPermissionsByCategory()).map(([category, permissions]) => (
                <div key={category} className="space-y-3">
                  <h4 className="text-lg font-medium text-white border-b border-white/10 pb-2">
                    {category}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {permissions.map((permission) => (
                      <div
                        key={permission.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRole.permissions.includes(permission.id)}
                          onChange={() => togglePermission(permission.id)}
                          disabled={selectedRole.name === 'owner'}
                          className="mt-1 rounded border-white/20 bg-white/10 text-blue-600"
                        />
                        <div className="flex-1">
                          <p className="text-white font-medium text-sm">{permission.name}</p>
                          <p className="text-white/60 text-xs">{permission.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-white/10">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white text-sm"
              >
                Cancel
              </button>
              {selectedRole.name !== 'owner' && (
                <button
                  onClick={handleSaveRole}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
                >
                  Save Changes
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}