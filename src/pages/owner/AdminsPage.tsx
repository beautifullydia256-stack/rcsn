import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Search, 
  Eye, 
  MessageSquare,
  Phone,
  Mail,
  Building,
  Calendar,
  Users,
  RefreshCw,
  Download
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Admin {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  school_id: string;
  school_name: string;
  school_status: string;
  created_at: string;
  last_login: string;
  login_count: number;
  student_count: number;
  teacher_count: number;
}

const AdminsPage: React.FC = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          phone,
          school_id,
          created_at,
          last_login,
          login_count,
          schools!inner(
            name,
            status,
            student_count,
            teacher_count
          )
        `)
        .eq('role', 'admin')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedAdmins = data?.map(admin => ({
        ...admin,
        school_name: admin.schools?.name || 'Unknown School',
        school_status: admin.schools?.status || 'unknown',
        student_count: admin.schools?.student_count || 0,
        teacher_count: admin.schools?.teacher_count || 0
      })) || [];

      setAdmins(formattedAdmins);
    } catch (error) {
      console.error('Error fetching admins:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const filteredAdmins = admins.filter(admin => 
    admin.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.school_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportAdmins = async () => {
    try {
      const csv = [
        ['Name', 'Email', 'Phone', 'School', 'School Status', 'Students', 'Teachers', 'Last Login'].join(','),
        ...filteredAdmins.map(admin => [
          admin.full_name || '',
          admin.email || '',
          admin.phone || '',
          admin.school_name || '',
          admin.school_status || '',
          admin.student_count || 0,
          admin.teacher_count || 0,
          admin.last_login ? new Date(admin.last_login).toLocaleDateString() : 'Never'
        ].join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admins-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting admins:', error);
    }
  };

  const getSchoolStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'trial': return 'bg-blue-100 text-blue-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
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
          <h1 className="text-2xl font-bold text-gray-900">School Administrators</h1>
          <p className="text-gray-600">Primary contacts for each school</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={exportAdmins}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={fetchAdmins}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-lg shadow-sm border"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Admins</p>
              <p className="text-2xl font-bold text-gray-900">{admins.length}</p>
            </div>
            <Shield className="w-8 h-8 text-purple-600" />
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
              <p className="text-sm font-medium text-gray-600">Active Schools</p>
              <p className="text-2xl font-bold text-green-600">
                {admins.filter(admin => admin.school_status === 'active').length}
              </p>
            </div>
            <Building className="w-8 h-8 text-green-600" />
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
              <p className="text-sm font-medium text-gray-600">Recent Logins</p>
              <p className="text-2xl font-bold text-blue-600">
                {admins.filter(admin => {
                  if (!admin.last_login) return false;
                  const lastLogin = new Date(admin.last_login);
                  const sevenDaysAgo = new Date();
                  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                  return lastLogin > sevenDaysAgo;
                }).length}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
        </motion.div>
      </div>

      {/* Search */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search administrators..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Admins Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAdmins.map((admin) => (
          <motion.div
            key={admin.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {admin.full_name || 'No Name'}
                </h3>
                <p className="text-sm text-gray-600">{admin.email}</p>
                {admin.phone && (
                  <p className="text-sm text-gray-600 flex items-center mt-1">
                    <Phone className="w-3 h-3 mr-1" />
                    {admin.phone}
                  </p>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  className="text-blue-600 hover:text-blue-800"
                  title="View Details"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  className="text-green-600 hover:text-green-800"
                  title="Send Message"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">School:</span>
                <span className="text-sm font-medium text-gray-900">
                  {admin.school_name}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status:</span>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSchoolStatusColor(admin.school_status)}`}>
                  {admin.school_status}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Students:</span>
                <span className="text-sm font-medium text-gray-900">
                  {admin.student_count.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Teachers:</span>
                <span className="text-sm font-medium text-gray-900">
                  {admin.teacher_count.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Last Login:</span>
                <span className="text-sm text-gray-900">
                  {admin.last_login 
                    ? new Date(admin.last_login).toLocaleDateString()
                    : 'Never'
                  }
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Login Count:</span>
                <span className="text-sm text-gray-900">
                  {admin.login_count || 0}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <button className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                  <Mail className="w-4 h-4 mr-1" />
                  Email
                </button>
                <button className="flex-1 flex items-center justify-center px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
                  <MessageSquare className="w-4 h-4 mr-1" />
                  Message
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredAdmins.length === 0 && (
        <div className="text-center py-12">
          <Shield className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No administrators found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your search criteria.
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminsPage;