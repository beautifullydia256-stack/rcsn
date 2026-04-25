"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

interface Admin {
  userId: string;
  name: string;
  email: string;
  schoolId: string;
  schoolName: string;
  schoolPlan: string;
  schoolStatus: string;
  lastLogin: string | null;
  createdAt: string;
  isActive: boolean;
  studentCount: number;
  teacherCount: number;
  schoolAddress?: string;
  schoolPhone?: string;
}

interface AdminsPageProps {
  onStatsUpdate: () => void;
}

export default function AdminsPage({ onStatsUpdate }: AdminsPageProps) {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [planFilter, setPlanFilter] = useState<string>('');
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);

  const ownerAuthHeaders = async (): Promise<Record<string, string> | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return null;
    return { Authorization: `Bearer ${session.access_token}` };
  };

  const loadAdmins = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get all admin users with their school information
      const { data: adminUsers, error: usersError } = await supabase
        .from('users')
        .select(`
          user_id,
          name,
          email,
          school_id,
          created_at,
          updated_at,
          schools!inner(
            name,
            plan,
            status,
            address,
            phone,
            created_at
          )
        `)
        .eq('role', 'admin')
        .order('created_at', { ascending: false });

      if (usersError) {
        throw usersError;
      }

      // Get student and teacher counts for each school
      const schoolIds = (adminUsers || []).map(admin => admin.school_id);
      
      const [studentsResult, teachersResult] = await Promise.all([
        supabase
          .from('students')
          .select('school_id')
          .in('school_id', schoolIds),
        supabase
          .from('teachers')
          .select('school_id')
          .in('school_id', schoolIds)
      ]);

      // Count students and teachers by school
      const studentCounts: Record<string, number> = {};
      const teacherCounts: Record<string, number> = {};

      (studentsResult.data || []).forEach((student: any) => {
        studentCounts[student.school_id] = (studentCounts[student.school_id] || 0) + 1;
      });

      (teachersResult.data || []).forEach((teacher: any) => {
        teacherCounts[teacher.school_id] = (teacherCounts[teacher.school_id] || 0) + 1;
      });

      // Transform data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const transformedAdmins: Admin[] = (adminUsers || []).map((admin: any) => {
        const lastActivity = new Date(admin.updated_at);
        const isActive = lastActivity >= thirtyDaysAgo;

        return {
          userId: admin.user_id,
          name: admin.name || 'Unknown',
          email: admin.email || '',
          schoolId: admin.school_id,
          schoolName: admin.schools?.name || 'Unknown School',
          schoolPlan: admin.schools?.plan || 'free',
          schoolStatus: admin.schools?.status || 'active',
          lastLogin: admin.updated_at,
          createdAt: admin.created_at,
          isActive,
          studentCount: studentCounts[admin.school_id] || 0,
          teacherCount: teacherCounts[admin.school_id] || 0,
          schoolAddress: admin.schools?.address,
          schoolPhone: admin.schools?.phone,
        };
      });

      setAdmins(transformedAdmins);

    } catch (error) {
      console.error('Error loading admins:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  const filteredAdmins = admins.filter(admin => {
    const matchesSearch = !searchTerm || 
      admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.schoolName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !statusFilter || 
      (statusFilter === 'active' && admin.isActive) ||
      (statusFilter === 'inactive' && !admin.isActive);

    const matchesPlan = !planFilter || admin.schoolPlan === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  const handleContactAdmin = (admin: Admin) => {
    setSelectedAdmin(admin);
    setShowContactModal(true);
  };

  const handleSendMessage = async (message: string) => {
    if (!selectedAdmin) return;

    try {
      // In a real implementation, this would send an email or notification
      console.log('Sending message to admin:', selectedAdmin.email, message);
      
      // For now, just close the modal
      setShowContactModal(false);
      setSelectedAdmin(null);
      
      // Show success message
      alert('Message sent successfully!');
      
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'premium': return 'text-green-400 bg-green-500/20';
      case 'basic': return 'text-blue-400 bg-blue-500/20';
      case 'free': return 'text-gray-400 bg-gray-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-500/20';
      case 'suspended': return 'text-red-400 bg-red-500/20';
      case 'trial': return 'text-yellow-400 bg-yellow-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-semibold">School Administrators</h2>
            <p className="text-white/70 text-sm">Primary contacts for each school on the platform</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/70">
              {filteredAdmins.length} of {admins.length} admins
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <input
            type="text"
            placeholder="Search admins or schools..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 text-sm"
          />

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm"
          >
            <option value="">All Activity Status</option>
            <option value="active">Active (30d)</option>
            <option value="inactive">Inactive (30d+)</option>
          </select>

          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm"
          >
            <option value="">All Plans</option>
            <option value="free">Free</option>
            <option value="basic">Basic</option>
            <option value="premium">Premium</option>
          </select>
        </div>
      </div>

      {/* Admins Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="text-white">Loading administrators...</div>
          </div>
        ) : filteredAdmins.length === 0 ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="text-white/70">No administrators found</div>
          </div>
        ) : (
          filteredAdmins.map((admin) => (
            <motion.div
              key={admin.userId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white"
            >
              {/* Admin Info */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{admin.name}</h3>
                  <p className="text-white/70 text-sm">{admin.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`w-2 h-2 rounded-full ${admin.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className={`text-xs ${admin.isActive ? 'text-green-400' : 'text-red-400'}`}>
                      {admin.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleContactAdmin(admin)}
                  className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm"
                >
                  Contact
                </button>
              </div>

              {/* School Info */}
              <div className="border-t border-white/10 pt-4 space-y-3">
                <div>
                  <h4 className="font-medium">{admin.schoolName}</h4>
                  <p className="text-white/60 text-xs">{admin.schoolId}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs ${getPlanColor(admin.schoolPlan)}`}>
                    {admin.schoolPlan}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs ${getStatusColor(admin.schoolStatus)}`}>
                    {admin.schoolStatus}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-white/60">Students</p>
                    <p className="font-medium">{admin.studentCount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Teachers</p>
                    <p className="font-medium">{admin.teacherCount.toLocaleString()}</p>
                  </div>
                </div>

                <div className="text-xs text-white/60">
                  <p>Last Login: {formatDateTime(admin.lastLogin)}</p>
                  <p>Joined: {formatDate(admin.createdAt)}</p>
                </div>

                {(admin.schoolAddress || admin.schoolPhone) && (
                  <div className="text-xs text-white/60 space-y-1">
                    {admin.schoolAddress && <p>📍 {admin.schoolAddress}</p>}
                    {admin.schoolPhone && <p>📞 {admin.schoolPhone}</p>}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="border-t border-white/10 pt-4 mt-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleContactAdmin(admin)}
                    className="flex-1 px-3 py-2 rounded-lg bg-green-600/20 hover:bg-green-600/30 text-green-400 text-sm"
                  >
                    Send Message
                  </button>
                  <button
                    className="flex-1 px-3 py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-sm"
                  >
                    View School
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Contact Modal */}
      {showContactModal && selectedAdmin && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 rounded-xl border border-white/10 p-6 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Contact {selectedAdmin.name}
              </h3>
              <button
                onClick={() => setShowContactModal(false)}
                className="text-white/70 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-sm text-white/70">
                <p><strong>School:</strong> {selectedAdmin.schoolName}</p>
                <p><strong>Email:</strong> {selectedAdmin.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Message
                </label>
                <textarea
                  rows={4}
                  placeholder="Enter your message..."
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 text-sm resize-none"
                  id="message-input"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const messageInput = document.getElementById('message-input') as HTMLTextAreaElement;
                    handleSendMessage(messageInput.value);
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
                >
                  Send Message
                </button>
                <button
                  onClick={() => setShowContactModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}