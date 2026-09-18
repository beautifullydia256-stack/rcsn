import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Users, 
  Settings, 
  Eye, 
  Edit, 
  Plus,
  Trash2,
  Save,
  X,
  Check,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { registerApiUrl } from '../../lib/registerApiOrigin';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  user_count: number;
  permissions: string[];
  is_system_role: boolean;
}

interface RoleStats {
  total_roles: number;
  custom_roles: number;
  total_permissions: number;
  active_users_with_roles: number;
}

const UserRolesPage: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [stats, setStats] = useState<RoleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
    permissions: [] as string[]
  });

  const systemRoles = [
    {
      name: 'admin',
      description: 'School administrator with full access to school management',
      permissions: ['manage_school', 'manage_users', 'view_reports', 'manage_settings']
    },
    {
      name: 'teacher',
      description: 'Teacher with access to classes, students, and grading',
      permissions: ['manage_classes', 'grade_students', 'view_student_reports']
    },
    {
      name: 'parent',
      description: 'Parent with access to their children\'s information',
      permissions: ['view_child_reports', 'communicate_teachers']
    },
    {
      name: 'student',
      description: 'Student with access to their own academic information',
      permissions: ['view_own_reports', 'submit_assignments']
    },
    {
      name: 'accountant',
      description: 'Financial management and billing access',
      permissions: ['manage_finances', 'view_payments', 'generate_invoices']
    },
    {
      name: 'librarian',
      description: 'Library management and book tracking',
      permissions: ['manage_library', 'track_books', 'manage_inventory']
    },
    {
      name: 'head_teacher',
      description: 'Senior teacher with additional administrative privileges',
      permissions: ['manage_teachers', 'view_all_reports', 'approve_activities']
    }
  ];

  const permissionCategories = [
    {
      name: 'School Management',
      permissions: ['manage_school', 'manage_settings', 'view_analytics']
    },
    {
      name: 'User Management',
      permissions: ['manage_users', 'view_user_reports', 'manage_permissions']
    },
    {
      name: 'Academic Management',
      permissions: ['manage_classes', 'grade_students', 'manage_curriculum']
    },
    {
      name: 'Financial Management',
      permissions: ['manage_finances', 'view_payments', 'generate_invoices']
    },
    {
      name: 'Reporting',
      permissions: ['view_reports', 'generate_reports', 'export_data']
    },
    {
      name: 'Communication',
      permissions: ['send_messages', 'manage_announcements', 'communicate_teachers']
    }
  ];

  const fetchRolesAndPermissions = async () => {
    try {
      setLoading(true);

      // Fetch user counts by role from our API
      const response = await fetch(registerApiUrl('/api/owner/users?limit=10000'));
      if (response.ok) {
        const { users } = await response.json();
        
        // Calculate user counts by role
        const rolesWithStats = systemRoles.map(systemRole => {
          const userCount = users?.filter((user: any) => user.role === systemRole.name).length || 0;
          return {
            id: systemRole.name,
            name: systemRole.name,
            description: systemRole.description,
            user_count: userCount,
            permissions: systemRole.permissions,
            is_system_role: true
          };
        });

        setRoles(rolesWithStats);

        // Calculate stats
        const totalUsers = users?.length || 0;
        const stats = {
          total_roles: systemRoles.length,
          custom_roles: 0, // No custom roles yet
          total_permissions: permissionCategories.reduce((sum, cat) => sum + cat.permissions.length, 0),
          active_users_with_roles: totalUsers
        };
        setStats(stats);
      } else {
        // Fallback to system roles with zero counts
        const fallbackRoles = systemRoles.map(systemRole => ({
          id: systemRole.name,
          name: systemRole.name,
          description: systemRole.description,
          user_count: 0,
          permissions: systemRole.permissions,
          is_system_role: true
        }));
        setRoles(fallbackRoles);
        
        setStats({
          total_roles: systemRoles.length,
          custom_roles: 0,
          total_permissions: permissionCategories.reduce((sum, cat) => sum + cat.permissions.length, 0),
          active_users_with_roles: 0
        });
      }

      // Set up permissions based on categories
      const allPermissions = permissionCategories.flatMap(category =>
        category.permissions.map(permission => ({
          id: permission,
          name: permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          description: `Permission to ${permission.replace(/_/g, ' ')}`,
          category: category.name
        }))
      );

      setPermissions(allPermissions);

    } catch (error) {
      console.error('Error fetching roles and permissions:', error);
      // Fallback to system roles with zero counts
      const fallbackRoles = systemRoles.map(systemRole => ({
        id: systemRole.name,
        name: systemRole.name,
        description: systemRole.description,
        user_count: 0,
        permissions: systemRole.permissions,
        is_system_role: true
      }));
      setRoles(fallbackRoles);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRolesAndPermissions();
  }, []);

  const handleSaveRole = async (roleId: string, updatedPermissions: string[]) => {
    try {
      // In a real implementation, you'd update the role in the database
      setRoles(prev => prev.map(role => 
        role.id === roleId 
          ? { ...role, permissions: updatedPermissions }
          : role
      ));
      setEditingRole(null);
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const handleAddRole = async () => {
    try {
      if (!newRole.name.trim()) return;

      const role: Role = {
        id: newRole.name.toLowerCase().replace(/\s+/g, '_'),
        name: newRole.name,
        description: newRole.description,
        user_count: 0,
        permissions: newRole.permissions,
        is_system_role: false
      };

      setRoles(prev => [...prev, role]);
      setNewRole({ name: '', description: '', permissions: [] });
      setShowAddRole(false);
    } catch (error) {
      console.error('Error adding role:', error);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      const role = roles.find(r => r.id === roleId);
      if (role?.is_system_role) {
        alert('Cannot delete system roles');
        return;
      }

      if ((role?.user_count ?? 0) > 0) {
        alert('Cannot delete role with active users');
        return;
      }

      setRoles(prev => prev.filter(r => r.id !== roleId));
    } catch (error) {
      console.error('Error deleting role:', error);
    }
  };

  const RolePermissionEditor: React.FC<{ 
    role: Role; 
    onSave: (permissions: string[]) => void;
    onCancel: () => void;
  }> = ({ role, onSave, onCancel }) => {
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>(role.permissions);

    const togglePermission = (permissionId: string) => {
      setSelectedPermissions(prev => 
        prev.includes(permissionId)
          ? prev.filter(p => p !== permissionId)
          : [...prev, permissionId]
      );
    };

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-medium text-gray-900">Edit Permissions for {role.name}</h4>
          <div className="flex space-x-2">
            <button
              onClick={() => onSave(selectedPermissions)}
              className="flex items-center px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
            >
              <Save className="w-4 h-4 mr-1" />
              Save
            </button>
            <button
              onClick={onCancel}
              className="flex items-center px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {permissionCategories.map(category => (
            <div key={category.name} className="border rounded-lg p-4">
              <h5 className="font-medium text-gray-800 mb-3">{category.name}</h5>
              <div className="space-y-2">
                {category.permissions.map(permission => {
                  const permissionObj = permissions.find(p => p.id === permission);
                  if (!permissionObj) return null;

                  return (
                    <label key={permission} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(permission)}
                        onChange={() => togglePermission(permission)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{permissionObj.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Roles & Permissions</h1>
          <p className="text-gray-600">Manage system roles and permissions</p>
        </div>
        <button
          onClick={() => setShowAddRole(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Custom Role
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-lg shadow-sm border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Roles</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_roles}</p>
              </div>
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-lg shadow-sm border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Custom Roles</p>
                <p className="text-2xl font-bold text-purple-600">{stats.custom_roles}</p>
              </div>
              <Settings className="w-8 h-8 text-purple-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 rounded-lg shadow-sm border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Permissions</p>
                <p className="text-2xl font-bold text-green-600">{stats.total_permissions}</p>
              </div>
              <Eye className="w-8 h-8 text-green-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-6 rounded-lg shadow-sm border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-indigo-600">{stats.active_users_with_roles}</p>
              </div>
              <Users className="w-8 h-8 text-indigo-600" />
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Role Modal */}
      {showAddRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Custom Role</h3>
              <button
                onClick={() => setShowAddRole(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role Name
                </label>
                <input
                  type="text"
                  value={newRole.name}
                  onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter role name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newRole.description}
                  onChange={(e) => setNewRole(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Enter role description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Permissions
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {permissionCategories.map(category => (
                    <div key={category.name} className="border rounded-lg p-4">
                      <h5 className="font-medium text-gray-800 mb-3">{category.name}</h5>
                      <div className="space-y-2">
                        {category.permissions.map(permission => {
                          const permissionObj = permissions.find(p => p.id === permission);
                          if (!permissionObj) return null;

                          return (
                            <label key={permission} className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={newRole.permissions.includes(permission)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewRole(prev => ({
                                      ...prev,
                                      permissions: [...prev.permissions, permission]
                                    }));
                                  } else {
                                    setNewRole(prev => ({
                                      ...prev,
                                      permissions: prev.permissions.filter(p => p !== permission)
                                    }));
                                  }
                                }}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">{permissionObj.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowAddRole(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddRole}
                  disabled={!newRole.name.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Roles List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">System Roles</h3>
        </div>

        <div className="divide-y divide-gray-200">
          {roles.map((role) => (
            <div key={role.id} className="p-6">
              {editingRole === role.id ? (
                <RolePermissionEditor
                  role={role}
                  onSave={(permissions) => handleSaveRole(role.id, permissions)}
                  onCancel={() => setEditingRole(null)}
                />
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-medium text-gray-900 capitalize">
                        {role.name.replace(/_/g, ' ')}
                      </h4>
                      {role.is_system_role && (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          System Role
                        </span>
                      )}
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        {role.user_count} users
                      </span>
                    </div>
                    <p className="text-gray-600 mb-3">{role.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {role.permissions.map(permission => {
                        const permissionObj = permissions.find(p => p.id === permission);
                        return (
                          <span
                            key={permission}
                            className="inline-flex px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800"
                          >
                            {permissionObj?.name || permission}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => setEditingRole(role.id)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Edit Permissions"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {!role.is_system_role && (
                      <button
                        onClick={() => handleDeleteRole(role.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete Role"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserRolesPage;