import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { School as SchoolIcon } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface School {
  school_id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  subscription_plan: string;
  subscription_status: 'active' | 'trial' | 'expired' | 'suspended';
  student_count: number;
  teacher_count: number;
  created_at: string;
  last_login: string;
  total_revenue: number;
}

const AllSchoolsPage: React.FC = () => {
  const navigate = useNavigate();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'trial' | 'expired' | 'suspended'>('all');
  const [planFilter, setPlanFilter] = useState<'all' | 'basic' | 'premium' | 'enterprise'>('all');

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        // Try to fetch real schools from database
        const { data: schoolsData, error } = await supabase
          .from('schools')
          .select('*')
          .order('created_at', { ascending: false });

        if (error && error.code === '42P01') {
          // Table doesn't exist, use sample data
          const sampleSchools: School[] = [
            {
              school_id: '1',
              name: 'Green Valley High School',
              email: 'admin@greenvalley.edu',
              phone: '+1-555-0123',
              address: '123 Education Ave',
              city: 'Springfield',
              country: 'USA',
              subscription_plan: 'Premium',
              subscription_status: 'active',
              student_count: 1250,
              teacher_count: 85,
              created_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
              last_login: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
              total_revenue: 11880
            },
            {
              school_id: '2',
              name: 'Sunrise Elementary',
              email: 'contact@sunrise.edu',
              phone: '+1-555-0456',
              address: '456 Learning St',
              city: 'Denver',
              country: 'USA',
              subscription_plan: 'Basic',
              subscription_status: 'active',
              student_count: 380,
              teacher_count: 28,
              created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
              last_login: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
              total_revenue: 4410
            },
            {
              school_id: '3',
              name: 'Tech Innovation Academy',
              email: 'info@techinnovation.edu',
              phone: '+1-555-0789',
              address: '789 Future Blvd',
              city: 'San Francisco',
              country: 'USA',
              subscription_plan: 'Enterprise',
              subscription_status: 'active',
              student_count: 2100,
              teacher_count: 145,
              created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
              last_login: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
              total_revenue: 23880
            },
            {
              school_id: '4',
              name: 'Mountain View Middle School',
              email: 'admin@mountainview.edu',
              phone: '+1-555-0321',
              address: '321 Hill Road',
              city: 'Boulder',
              country: 'USA',
              subscription_plan: 'Premium',
              subscription_status: 'trial',
              student_count: 650,
              teacher_count: 42,
              created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
              last_login: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
              total_revenue: 0
            },
            {
              school_id: '5',
              name: 'Riverside Community College',
              email: 'contact@riverside.edu',
              phone: '+1-555-0654',
              address: '654 River Lane',
              city: 'Portland',
              country: 'USA',
              subscription_plan: 'Basic',
              subscription_status: 'expired',
              student_count: 890,
              teacher_count: 67,
              created_at: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
              last_login: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              total_revenue: 2940
            }
          ];

          setSchools(sampleSchools);
        } else {
          // Use real data from database
          const formattedSchools: School[] = (schoolsData || []).map(school => ({
            school_id: school.school_id,
            name: school.name,
            email: school.email || '',
            phone: school.phone || '',
            address: school.address || '',
            city: school.city || '',
            country: school.country || '',
            subscription_plan: school.subscription_plan || 'Basic',
            subscription_status: school.subscription_status || 'trial',
            student_count: school.student_count || 0,
            teacher_count: school.teacher_count || 0,
            created_at: school.created_at,
            last_login: school.last_login || school.created_at,
            total_revenue: school.total_revenue || 0
          }));

          setSchools(formattedSchools);
        }
      } catch (error) {
        console.error('Error fetching schools:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchools();
  }, []);

  const filteredSchools = schools.filter(school => {
    const matchesSearch = school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         school.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         school.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || school.subscription_status === statusFilter;
    const matchesPlan = planFilter === 'all' || school.subscription_plan.toLowerCase() === planFilter;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'trial': return 'bg-blue-100 text-blue-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'suspended': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan.toLowerCase()) {
      case 'basic': return 'bg-blue-100 text-blue-800';
      case 'premium': return 'bg-purple-100 text-purple-800';
      case 'enterprise': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const suspendSchool = (schoolId: string) => {
    setSchools(prev => prev.map(school => 
      school.school_id === schoolId 
        ? { ...school, subscription_status: 'suspended' as const }
        : school
    ));
  };

  const reactivateSchool = (schoolId: string) => {
    setSchools(prev => prev.map(school => 
      school.school_id === schoolId 
        ? { ...school, subscription_status: 'active' as const }
        : school
    ));
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Schools</h1>
          <p className="text-gray-600">Manage all registered schools on the platform</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {filteredSchools.length} of {schools.length} schools
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Total Schools</p>
            <p className="text-2xl font-bold text-blue-600">{schools.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Active</p>
            <p className="text-2xl font-bold text-green-600">{schools.filter(s => s.subscription_status === 'active').length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Trial</p>
            <p className="text-2xl font-bold text-blue-600">{schools.filter(s => s.subscription_status === 'trial').length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Total Students</p>
            <p className="text-2xl font-bold text-purple-600">{schools.reduce((sum, s) => sum + s.student_count, 0).toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Total Revenue</p>
            <p className="text-2xl font-bold text-orange-600">${schools.reduce((sum, s) => sum + s.total_revenue, 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search schools..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="expired">Expired</option>
              <option value="suspended">Suspended</option>
            </select>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Plans</option>
              <option value="basic">Basic</option>
              <option value="premium">Premium</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
        </div>
      </div>

      {/* Schools Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  School
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan & Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Users
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSchools.map((school, index) => (
                <motion.tr
                  key={school.school_id}
                  className="hover:bg-gray-50"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{school.name}</div>
                      <div className="text-sm text-gray-500">{school.email}</div>
                      <div className="text-sm text-gray-500">{school.city}, {school.country}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPlanColor(school.subscription_plan)}`}>
                        {school.subscription_plan}
                      </span>
                      <br />
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(school.subscription_status)}`}>
                        {school.subscription_status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div>{school.student_count.toLocaleString()} students</div>
                      <div className="text-gray-500">{school.teacher_count} teachers</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${school.total_revenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(school.last_login).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => navigate(school.school_id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </button>
                      <button className="text-green-600 hover:text-green-900">Edit</button>
                      {school.subscription_status === 'suspended' ? (
                        <button 
                          onClick={() => reactivateSchool(school.school_id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Reactivate
                        </button>
                      ) : (
                        <button 
                          onClick={() => suspendSchool(school.school_id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Suspend
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSchools.length === 0 && (
          <div className="text-center py-12">
            <SchoolIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No schools found</h3>
            <p className="text-gray-500">No schools match your current filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllSchoolsPage;