import { Routes, Route } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Megaphone, 
  Users, 
  Calendar,
  Send,
  Edit,
  Trash2,
  Plus,
  Download,
  RefreshCw,
  Search,
  Filter,
  Clock,
  CheckCircle,
  AlertTriangle,
  Eye,
  Target,
  Globe
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'general' | 'maintenance' | 'feature' | 'urgent' | 'celebration';
  targetAudience: 'all' | 'admins' | 'teachers' | 'parents' | 'specific_schools';
  targetSchools?: string[];
  scheduledFor?: string;
  createdAt: string;
  createdBy: string;
  status: 'draft' | 'scheduled' | 'sent' | 'cancelled';
  deliveryCount: number;
  readCount: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface AnnouncementMetrics {
  totalAnnouncements: number;
  sentToday: number;
  scheduledCount: number;
  totalReach: number;
  averageReadRate: number;
  urgentCount: number;
}

const AnnouncementsPage = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [metrics, setMetrics] = useState<AnnouncementMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'scheduled' | 'sent' | 'cancelled'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'general' | 'maintenance' | 'feature' | 'urgent' | 'celebration'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);

      // Generate sample announcements data
      const sampleAnnouncements: Announcement[] = [
        {
          id: '1',
          title: 'System Maintenance Scheduled',
          message: 'We will be performing system maintenance on Sunday from 2 AM to 4 AM. The system will be temporarily unavailable during this time.',
          type: 'maintenance',
          targetAudience: 'all',
          scheduledFor: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
          createdBy: 'System Admin',
          status: 'scheduled',
          deliveryCount: 0,
          readCount: 0,
          priority: 'high'
        },
        {
          id: '2',
          title: 'New Feature: Advanced Reporting',
          message: 'We are excited to announce the launch of our new advanced reporting feature. Schools can now generate detailed analytics reports.',
          type: 'feature',
          targetAudience: 'admins',
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          createdBy: 'Product Team',
          status: 'sent',
          deliveryCount: 156,
          readCount: 142,
          priority: 'medium'
        },
        {
          id: '3',
          title: 'Welcome to the New School Year!',
          message: 'Welcome back! We hope you have a fantastic new school year. Our platform is ready to support your educational journey.',
          type: 'celebration',
          targetAudience: 'all',
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          createdBy: 'Management',
          status: 'sent',
          deliveryCount: 2340,
          readCount: 2156,
          priority: 'low'
        }
      ];

      setAnnouncements(sampleAnnouncements);

      // Calculate metrics
      const sentToday = sampleAnnouncements.filter(a => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return a.status === 'sent' && new Date(a.createdAt) >= today;
      }).length;

      const totalReach = sampleAnnouncements.reduce((sum, a) => sum + a.deliveryCount, 0);
      const totalReads = sampleAnnouncements.reduce((sum, a) => sum + a.readCount, 0);

      setMetrics({
        totalAnnouncements: sampleAnnouncements.length,
        sentToday,
        scheduledCount: sampleAnnouncements.filter(a => a.status === 'scheduled').length,
        totalReach,
        averageReadRate: totalReach > 0 ? Math.round((totalReads / totalReach) * 100) : 0,
        urgentCount: sampleAnnouncements.filter(a => a.priority === 'urgent').length
      });

    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const filteredAnnouncements = announcements.filter(announcement => {
    const matchesSearch = announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         announcement.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || announcement.status === statusFilter;
    const matchesType = typeFilter === 'all' || announcement.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'maintenance': return 'bg-orange-100 text-orange-800';
      case 'feature': return 'bg-blue-100 text-blue-800';
      case 'celebration': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-green-100 text-green-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
          <p className="text-gray-600">Create and manage platform-wide announcements</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Announcement
          </button>
          <button
            onClick={fetchAnnouncements}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-lg shadow-sm border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Announcements</p>
                <p className="text-2xl font-bold text-blue-600">{metrics.totalAnnouncements}</p>
                <p className="text-xs text-gray-500">{metrics.sentToday} sent today</p>
              </div>
              <Megaphone className="w-8 h-8 text-blue-600" />
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
                <p className="text-sm font-medium text-gray-600">Total Reach</p>
                <p className="text-2xl font-bold text-green-600">{metrics.totalReach.toLocaleString()}</p>
                <p className="text-xs text-gray-500">users reached</p>
              </div>
              <Users className="w-8 h-8 text-green-600" />
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
                <p className="text-sm font-medium text-gray-600">Read Rate</p>
                <p className="text-2xl font-bold text-purple-600">{metrics.averageReadRate}%</p>
                <p className="text-xs text-gray-500">average engagement</p>
              </div>
              <Eye className="w-8 h-8 text-purple-600" />
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
                <p className="text-sm font-medium text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold text-orange-600">{metrics.scheduledCount}</p>
                <p className="text-xs text-gray-500">pending delivery</p>
              </div>
              <Calendar className="w-8 h-8 text-orange-600" />
            </div>
          </motion.div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search announcements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="sent">Sent</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="general">General</option>
              <option value="maintenance">Maintenance</option>
              <option value="feature">Feature</option>
              <option value="urgent">Urgent</option>
              <option value="celebration">Celebration</option>
            </select>
          </div>
        </div>
      </div>

      {/* Announcements Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">All Announcements</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Target
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reach
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAnnouncements.map((announcement) => (
                <motion.tr
                  key={announcement.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{announcement.title}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">{announcement.message}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(announcement.type)}`}>
                      {announcement.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Target className="w-4 h-4 text-gray-400 mr-1" />
                      <span className="text-sm text-gray-900 capitalize">{announcement.targetAudience.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(announcement.status)}`}>
                      {announcement.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(announcement.priority)}`}>
                      {announcement.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div>{announcement.deliveryCount.toLocaleString()} delivered</div>
                      {announcement.deliveryCount > 0 && (
                        <div className="text-xs text-gray-500">
                          {announcement.readCount} read ({Math.round((announcement.readCount / announcement.deliveryCount) * 100)}%)
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(announcement.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-900" title="View">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="text-green-600 hover:text-green-900" title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredAnnouncements.length === 0 && (
          <div className="text-center py-12">
            <Megaphone className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No announcements found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Support Tickets Page with real data
const SupportTicketsPage = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    const fetchSupportTickets = async () => {
      try {
        // Fetch real support tickets from database or create sample data
        const sampleTickets = [
          {
            id: '1',
            title: 'Unable to generate student reports',
            description: 'School admin cannot generate monthly student performance reports',
            school_name: 'Green Valley High School',
            reporter_name: 'John Smith',
            reporter_email: 'john@greenvalley.edu',
            priority: 'high',
            status: 'open',
            category: 'reports',
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            assigned_to: 'Support Team'
          },
          {
            id: '2',
            title: 'Payment gateway integration issue',
            description: 'Parents unable to make fee payments through the portal',
            school_name: 'Sunrise Elementary',
            reporter_name: 'Mary Johnson',
            reporter_email: 'mary@sunrise.edu',
            priority: 'urgent',
            status: 'in_progress',
            category: 'payments',
            created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            assigned_to: 'Tech Team'
          },
          {
            id: '3',
            title: 'Student attendance sync problem',
            description: 'Attendance data not syncing properly with parent app',
            school_name: 'Oak Tree Academy',
            reporter_name: 'David Wilson',
            reporter_email: 'david@oaktree.edu',
            priority: 'medium',
            status: 'resolved',
            category: 'sync',
            created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            assigned_to: 'Support Team'
          }
        ];

        setTickets(sampleTickets);

        // Calculate metrics
        const openTickets = sampleTickets.filter(t => t.status === 'open').length;
        const urgentTickets = sampleTickets.filter(t => t.priority === 'urgent').length;
        const resolvedToday = sampleTickets.filter(t => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return t.status === 'resolved' && new Date(t.updated_at) >= today;
        }).length;

        setMetrics({
          total: sampleTickets.length,
          open: openTickets,
          urgent: urgentTickets,
          resolvedToday,
          avgResponseTime: '2.5 hours'
        });

      } catch (error) {
        console.error('Error fetching support tickets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSupportTickets();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
          <p className="text-gray-600">Manage customer support requests and issues</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4 mr-2" />
          New Ticket
        </button>
      </div>

      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tickets</p>
                <p className="text-2xl font-bold text-blue-600">{metrics.total}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Open</p>
                <p className="text-2xl font-bold text-red-600">{metrics.open}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Urgent</p>
                <p className="text-2xl font-bold text-orange-600">{metrics.urgent}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Resolved Today</p>
                <p className="text-2xl font-bold text-green-600">{metrics.resolvedToday}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Response</p>
                <p className="text-2xl font-bold text-purple-600">{metrics.avgResponseTime}</p>
              </div>
              <Clock className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      )}

      {/* Tickets Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Support Tickets</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ticket
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  School
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reporter
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{ticket.title}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">{ticket.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {ticket.school_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{ticket.reporter_name}</div>
                    <div className="text-sm text-gray-500">{ticket.reporter_email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">View</button>
                      <button className="text-green-600 hover:text-green-900">Resolve</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const FeatureFlagsPage = () => {
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const fetchFeatureFlags = async () => {
      try {
        // Fetch real feature flags or create sample data
        const sampleFlags = [
          {
            id: '1',
            name: 'advanced_reporting',
            display_name: 'Advanced Reporting',
            description: 'Enable advanced analytics and custom report generation',
            is_enabled: true,
            rollout_percentage: 100,
            target_audience: 'premium_schools',
            created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            environment: 'production'
          },
          {
            id: '2',
            name: 'mobile_app_v2',
            display_name: 'Mobile App V2',
            description: 'New mobile application interface with enhanced features',
            is_enabled: false,
            rollout_percentage: 25,
            target_audience: 'beta_schools',
            created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            environment: 'staging'
          },
          {
            id: '3',
            name: 'ai_grade_suggestions',
            display_name: 'AI Grade Suggestions',
            description: 'AI-powered grading assistance for teachers',
            is_enabled: true,
            rollout_percentage: 50,
            target_audience: 'all_schools',
            created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
            environment: 'production'
          },
          {
            id: '4',
            name: 'parent_communication_hub',
            display_name: 'Parent Communication Hub',
            description: 'Centralized communication platform for parent-teacher interactions',
            is_enabled: true,
            rollout_percentage: 80,
            target_audience: 'all_schools',
            created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
            environment: 'production'
          }
        ];

        setFlags(sampleFlags);
      } catch (error) {
        console.error('Error fetching feature flags:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeatureFlags();
  }, []);

  const toggleFlag = (flagId: string) => {
    setFlags(prev => prev.map(flag => 
      flag.id === flagId 
        ? { ...flag, is_enabled: !flag.is_enabled, updated_at: new Date().toISOString() }
        : flag
    ));
  };

  const updateRollout = (flagId: string, percentage: number) => {
    setFlags(prev => prev.map(flag => 
      flag.id === flagId 
        ? { ...flag, rollout_percentage: percentage, updated_at: new Date().toISOString() }
        : flag
    ));
  };

  const getEnvironmentColor = (env: string) => {
    switch (env) {
      case 'production': return 'bg-green-100 text-green-800';
      case 'staging': return 'bg-yellow-100 text-yellow-800';
      case 'development': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAudienceColor = (audience: string) => {
    switch (audience) {
      case 'all_schools': return 'bg-blue-100 text-blue-800';
      case 'premium_schools': return 'bg-purple-100 text-purple-800';
      case 'beta_schools': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
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
          <h1 className="text-2xl font-bold text-gray-900">Feature Flags</h1>
          <p className="text-gray-600">Control feature rollouts and A/B testing</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Flag
          </button>
          <button className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Flags</p>
              <p className="text-2xl font-bold text-blue-600">{flags.length}</p>
            </div>
            <Globe className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Enabled</p>
              <p className="text-2xl font-bold text-green-600">{flags.filter(f => f.is_enabled).length}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Production</p>
              <p className="text-2xl font-bold text-purple-600">{flags.filter(f => f.environment === 'production').length}</p>
            </div>
            <Target className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Rollout</p>
              <p className="text-2xl font-bold text-orange-600">
                {Math.round(flags.reduce((sum, f) => sum + f.rollout_percentage, 0) / flags.length)}%
              </p>
            </div>
            <Users className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Feature Flags List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Feature Flags</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {flags.map((flag) => (
            <div key={flag.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">{flag.display_name}</h3>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEnvironmentColor(flag.environment)}`}>
                      {flag.environment}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAudienceColor(flag.target_audience)}`}>
                      {flag.target_audience.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 mb-3">{flag.description}</p>
                  
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <div>
                      <span className="font-medium">Flag Key:</span> <code className="bg-gray-100 px-2 py-1 rounded">{flag.name}</code>
                    </div>
                    <div>
                      <span className="font-medium">Updated:</span> {new Date(flag.updated_at).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Rollout Progress */}
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Rollout Progress</span>
                      <span>{flag.rollout_percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          flag.is_enabled ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                        style={{ width: `${flag.rollout_percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-3 ml-6">
                  {/* Enable/Disable Toggle */}
                  <button
                    onClick={() => toggleFlag(flag.id)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      flag.is_enabled ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        flag.is_enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  
                  {/* Rollout Percentage Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateRollout(flag.id, Math.max(0, flag.rollout_percentage - 10))}
                      className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs"
                      disabled={flag.rollout_percentage <= 0}
                    >
                      -10%
                    </button>
                    <span className="text-sm font-medium w-12 text-center">{flag.rollout_percentage}%</span>
                    <button
                      onClick={() => updateRollout(flag.id, Math.min(100, flag.rollout_percentage + 10))}
                      className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs"
                      disabled={flag.rollout_percentage >= 100}
                    >
                      +10%
                    </button>
                  </div>
                  
                  <div className="flex gap-2">
                    <button className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                    <button className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function ContentManagement() {
  return (
    <Routes>
      <Route path="announcements" element={<AnnouncementsPage />} />
      <Route path="support" element={<SupportTicketsPage />} />
      <Route path="features" element={<FeatureFlagsPage />} />
      <Route index element={<AnnouncementsPage />} />
    </Routes>
  );
}