import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  Search, 
  Filter, 
  Eye, 
  RotateCcw, 
  Calendar,
  Users,
  GraduationCap,
  Clock
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { registerApiUrl } from '../../../lib/registerApiOrigin';

interface SuspendedSchool {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  suspension_date: string;
  suspension_reason: string;
  suspended_by: string;
  student_count: number;
  teacher_count: number;
  last_payment_date: string;
  outstanding_amount: number;
}

const SuspendedSchoolsPage: React.FC = () => {
  const [schools, setSchools] = useState<SuspendedSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterReason, setFilterReason] = useState('all');

  useEffect(() => {
    fetchSuspendedSchools();
  }, []);

  const fetchSuspendedSchools = async () => {
    try {
      setLoading(true);
      
      // Fetch real suspended schools from API
      const response = await fetch(registerApiUrl('/api/owner/schools?status=suspended&limit=100'));
      if (!response.ok) {
        throw new Error('Failed to fetch suspended schools');
      }
      
      const { data: schoolsData } = await response.json();
      
      const formattedSchools = schoolsData?.filter((school: any) => school.status === 'suspended').map((school: any) => ({
        id: school.id,
        name: school.name,
        email: school.email || '',
        phone: school.phone || '',
        address: school.address || '',
        suspension_date: school.suspension_date || school.updated_at,
        suspension_reason: school.suspension_reason || 'Unknown',
        suspended_by: school.suspended_by || 'System',
        student_count: school.student_count || 0,
        teacher_count: school.teacher_count || 0,
        last_payment_date: school.last_payment_date || 'Never',
        outstanding_amount: school.outstanding_amount || 0
      })) || [];

      setSchools(formattedSchools);
    } catch (error) {
      console.error('Error fetching suspended schools:', error);
      setSchools([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async (schoolId: string) => {
    if (!confirm('Are you sure you want to reactivate this school?')) return;
    
    try {
      // In a real app, this would make an API call to reactivate the school
      setSchools(prev => prev.filter(school => school.id !== schoolId));
      alert('School reactivated successfully');
    } catch (error) {
      console.error('Error reactivating school:', error);
      alert('Failed to reactivate school');
    }
  };

  const filteredSchools = schools.filter(school => {
    const matchesSearch = school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         school.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterReason === 'all' || school.suspension_reason === filterReason;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suspended Schools</h1>
          <p className="text-gray-600">Manage and review suspended school accounts</p>
        </div>
        <div className="flex items-center space-x-2 text-orange-600">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">{schools.length} Suspended</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search schools..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterReason}
              onChange={(e) => setFilterReason(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Reasons</option>
              <option value="Non-payment">Non-payment</option>
              <option value="Policy violation">Policy violation</option>
              <option value="Compliance issues">Compliance issues</option>
              <option value="Contract breach">Contract breach</option>
            </select>
          </div>
        </div>
      </div>

      {/* Schools List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  School
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Suspension Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statistics
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Outstanding
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSchools.map((school) => (
                <motion.tr
                  key={school.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{school.name}</div>
                      <div className="text-sm text-gray-500">{school.email}</div>
                      <div className="text-sm text-gray-500">{school.phone}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          school.suspension_reason === 'Non-payment' ? 'bg-red-100 text-red-800' :
                          school.suspension_reason === 'Policy violation' ? 'bg-orange-100 text-orange-800' :
                          school.suspension_reason === 'Compliance issues' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {school.suspension_reason}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        Suspended: {school.suspension_date}
                      </div>
                      <div className="text-sm text-gray-500">
                        By: {school.suspended_by}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="w-3 h-3 mr-1" />
                        {school.student_count} students
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <GraduationCap className="w-3 h-3 mr-1" />
                        {school.teacher_count} teachers
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-red-600">
                        ${school.outstanding_amount.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        <Clock className="w-3 h-3 inline mr-1" />
                        Last payment: {school.last_payment_date}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleReactivate(school.id)}
                      className="inline-flex items-center px-3 py-1 border border-green-300 text-green-700 bg-green-50 rounded-md hover:bg-green-100 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Reactivate
                    </button>
                    <button className="inline-flex items-center px-3 py-1 border border-gray-300 text-gray-700 bg-white rounded-md hover:bg-gray-50 transition-colors">
                      <Eye className="w-3 h-3 mr-1" />
                      View Details
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSchools.length === 0 && (
          <div className="text-center py-12">
            <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No suspended schools found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filterReason !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'No schools are currently suspended.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuspendedSchoolsPage;