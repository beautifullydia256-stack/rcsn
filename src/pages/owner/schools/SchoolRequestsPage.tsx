import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../../lib/supabase';

interface SchoolRequest {
  id: string;
  school_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  city: string;
  country: string;
  student_count: number;
  requested_plan: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

const SchoolRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<SchoolRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchSchoolRequests = async () => {
      try {
        // Fetch real school requests or create sample data
        const sampleRequests: SchoolRequest[] = [
          {
            id: '1',
            school_name: 'Bright Future Academy',
            contact_name: 'Sarah Johnson',
            contact_email: 'sarah@brightfuture.edu',
            contact_phone: '+1-555-0123',
            address: '123 Education St',
            city: 'Springfield',
            country: 'USA',
            student_count: 450,
            requested_plan: 'Premium',
            message: 'We are looking for a comprehensive school management system to help streamline our operations.',
            status: 'pending',
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '2',
            school_name: 'Mountain View Elementary',
            contact_name: 'Michael Chen',
            contact_email: 'michael@mountainview.edu',
            contact_phone: '+1-555-0456',
            address: '456 Hill Road',
            city: 'Denver',
            country: 'USA',
            student_count: 280,
            requested_plan: 'Basic',
            message: 'Small elementary school seeking basic student management features.',
            status: 'approved',
            created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            reviewed_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
            reviewed_by: 'Admin'
          },
          {
            id: '3',
            school_name: 'Tech Innovation High',
            contact_name: 'Dr. Lisa Rodriguez',
            contact_email: 'lisa@techinnovation.edu',
            contact_phone: '+1-555-0789',
            address: '789 Innovation Blvd',
            city: 'San Francisco',
            country: 'USA',
            student_count: 1200,
            requested_plan: 'Enterprise',
            message: 'Large high school with multiple campuses requiring enterprise-level features.',
            status: 'pending',
            created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '4',
            school_name: 'Rural Community School',
            contact_name: 'James Wilson',
            contact_email: 'james@ruralcommunity.edu',
            contact_phone: '+1-555-0321',
            address: '321 Country Lane',
            city: 'Smalltown',
            country: 'USA',
            student_count: 150,
            requested_plan: 'Basic',
            message: 'Small rural school with limited budget seeking affordable solution.',
            status: 'rejected',
            created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
            reviewed_at: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
            reviewed_by: 'Admin'
          }
        ];

        setRequests(sampleRequests);
      } catch (error) {
        console.error('Error fetching school requests:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchoolRequests();
  }, []);

  const handleApprove = async (requestId: string) => {
    setRequests(prev => prev.map(req => 
      req.id === requestId 
        ? { 
            ...req, 
            status: 'approved', 
            reviewed_at: new Date().toISOString(),
            reviewed_by: 'Admin'
          }
        : req
    ));
  };

  const handleReject = async (requestId: string) => {
    setRequests(prev => prev.map(req => 
      req.id === requestId 
        ? { 
            ...req, 
            status: 'rejected', 
            reviewed_at: new Date().toISOString(),
            reviewed_by: 'Admin'
          }
        : req
    ));
  };

  const filteredRequests = requests.filter(request => {
    const matchesFilter = filter === 'all' || request.status === filter;
    const matchesSearch = request.school_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.contact_email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
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

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
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
          <h1 className="text-2xl font-bold text-gray-900">School Requests</h1>
          <p className="text-gray-600">Review and manage school registration requests</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {filteredRequests.length} of {requests.length} requests
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Total Requests</p>
            <p className="text-2xl font-bold text-blue-600">{requests.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{requests.filter(r => r.status === 'pending').length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Approved</p>
            <p className="text-2xl font-bold text-green-600">{requests.filter(r => r.status === 'approved').length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Rejected</p>
            <p className="text-2xl font-bold text-red-600">{requests.filter(r => r.status === 'rejected').length}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search schools or contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'pending', 'approved', 'rejected'].map((filterType) => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === filterType
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <div className="text-gray-400 text-4xl mb-4">🏫</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
            <p className="text-gray-500">No school requests match your current filters.</p>
          </div>
        ) : (
          filteredRequests.map((request, index) => (
            <motion.div
              key={request.id}
              className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">{request.school_name}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPlanColor(request.requested_plan)}`}>
                      {request.requested_plan}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Contact Person</p>
                      <p className="text-sm text-gray-600">{request.contact_name}</p>
                      <p className="text-sm text-gray-500">{request.contact_email}</p>
                      <p className="text-sm text-gray-500">{request.contact_phone}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Location</p>
                      <p className="text-sm text-gray-600">{request.address}</p>
                      <p className="text-sm text-gray-600">{request.city}, {request.country}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">School Details</p>
                      <p className="text-sm text-gray-600">{request.student_count} students</p>
                      <p className="text-sm text-gray-500">Requested: {new Date(request.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {request.message && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-1">Message</p>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{request.message}</p>
                    </div>
                  )}

                  {request.reviewed_at && (
                    <div className="text-xs text-gray-500">
                      Reviewed by {request.reviewed_by} on {new Date(request.reviewed_at).toLocaleString()}
                    </div>
                  )}
                </div>

                {request.status === 'pending' && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleApprove(request.id)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(request.id)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default SchoolRequestsPage;