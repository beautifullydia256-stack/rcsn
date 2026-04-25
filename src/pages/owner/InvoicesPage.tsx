import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Download, 
  Send, 
  Eye, 
  Search,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  Plus,
  Filter
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Invoice {
  invoice_id: string;
  school_id: string;
  school_name: string;
  invoice_number: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issue_date: string;
  due_date: string;
  paid_date?: string;
  description: string;
  items: InvoiceItem[];
  created_at: string;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface InvoiceStats {
  total_invoices: number;
  total_amount: number;
  paid_invoices: number;
  paid_amount: number;
  overdue_invoices: number;
  overdue_amount: number;
  pending_invoices: number;
  pending_amount: number;
}

const InvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchInvoices = async () => {
    try {
      setLoading(true);

      // Fetch invoices from API endpoint
      const response = await fetch('/api/owner/invoices?limit=100');
      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }
      
      const { invoices: invoicesData } = await response.json();
      
      const formattedInvoices = invoicesData?.map((invoice: any) => ({
        invoice_id: invoice.id,
        school_id: invoice.school_id,
        school_name: invoice.school_name || 'Unknown School',
        invoice_number: invoice.invoice_number,
        amount: invoice.amount || 0,
        status: invoice.status || 'draft',
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        paid_date: invoice.paid_date,
        description: invoice.description || '',
        items: invoice.items || [],
        created_at: invoice.created_at
      })) || [];

      setInvoices(formattedInvoices);

      // Calculate statistics from real data
      const totalInvoices = formattedInvoices.length;
      const totalAmount = formattedInvoices.reduce((sum: number, inv: any) => sum + inv.amount, 0);
      const paidInvoices = formattedInvoices.filter((inv: any) => inv.status === 'paid');
      const paidAmount = paidInvoices.reduce((sum: number, inv: any) => sum + inv.amount, 0);
      const overdueInvoices = formattedInvoices.filter((inv: any) => inv.status === 'overdue');
      const overdueAmount = overdueInvoices.reduce((sum: number, inv: any) => sum + inv.amount, 0);
      const pendingInvoices = formattedInvoices.filter((inv: any) => inv.status === 'sent');
      const pendingAmount = pendingInvoices.reduce((sum: number, inv: any) => sum + inv.amount, 0);

      setStats({
        total_invoices: totalInvoices,
        total_amount: totalAmount,
        paid_invoices: paidInvoices.length,
        paid_amount: paidAmount,
        overdue_invoices: overdueInvoices.length,
        overdue_amount: overdueAmount,
        pending_invoices: pendingInvoices.length,
        pending_amount: pendingAmount
      });

    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.school_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const invoiceDate = new Date(invoice.issue_date);
      const now = new Date();
      
      switch (dateFilter) {
        case 'this_month':
          matchesDate = invoiceDate.getMonth() === now.getMonth() && 
                       invoiceDate.getFullYear() === now.getFullYear();
          break;
        case 'last_month':
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
          matchesDate = invoiceDate.getMonth() === lastMonth.getMonth() && 
                       invoiceDate.getFullYear() === lastMonth.getFullYear();
          break;
        case 'this_year':
          matchesDate = invoiceDate.getFullYear() === now.getFullYear();
          break;
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const handleSendInvoice = async (invoiceId: string) => {
    try {
      // In real implementation, send invoice via email
      console.log('Sending invoice:', invoiceId);
      
      // Update invoice status to sent
      setInvoices(prev => prev.map(inv => 
        inv.invoice_id === invoiceId 
          ? { ...inv, status: 'sent' as const }
          : inv
      ));
    } catch (error) {
      console.error('Error sending invoice:', error);
    }
  };

  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      // Generate PDF content (simplified)
      const pdfContent = `
Invoice: ${invoice.invoice_number}
School: ${invoice.school_name}
Amount: $${invoice.amount.toLocaleString()}
Issue Date: ${new Date(invoice.issue_date).toLocaleDateString()}
Due Date: ${new Date(invoice.due_date).toLocaleDateString()}
Status: ${invoice.status}

Items:
${invoice.items.map(item => 
  `${item.description} - Qty: ${item.quantity} - Price: $${item.unit_price} - Total: $${item.total}`
).join('\n')}

Total Amount: $${invoice.amount.toLocaleString()}
      `;

      const blob = new Blob([pdfContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoice_number}.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading invoice:', error);
    }
  };

  const exportInvoices = async () => {
    try {
      const csv = [
        ['Invoice Number', 'School', 'Amount', 'Status', 'Issue Date', 'Due Date', 'Paid Date'].join(','),
        ...filteredInvoices.map(invoice => [
          invoice.invoice_number || '',
          invoice.school_name || '',
          invoice.amount || 0,
          invoice.status || '',
          new Date(invoice.issue_date).toLocaleDateString(),
          new Date(invoice.due_date).toLocaleDateString(),
          invoice.paid_date ? new Date(invoice.paid_date).toLocaleDateString() : 'N/A'
        ].join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoices-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting invoices:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'sent': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'overdue': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'draft': return <FileText className="w-4 h-4 text-gray-500" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-gray-500" />;
      default: return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
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
          <h1 className="text-2xl font-bold text-gray-900">Invoices Management</h1>
          <p className="text-gray-600">Generate and manage billing invoices</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Invoice
          </button>
          <button
            onClick={exportInvoices}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={fetchInvoices}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-lg shadow-sm border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_invoices}</p>
                <p className="text-sm text-gray-500">${stats.total_amount.toLocaleString()}</p>
              </div>
              <FileText className="w-8 h-8 text-gray-600" />
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
                <p className="text-sm font-medium text-gray-600">Paid Invoices</p>
                <p className="text-2xl font-bold text-green-600">{stats.paid_invoices}</p>
                <p className="text-sm text-green-500">${stats.paid_amount.toLocaleString()}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
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
                <p className="text-sm font-medium text-gray-600">Overdue Invoices</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue_invoices}</p>
                <p className="text-sm text-red-500">${stats.overdue_amount.toLocaleString()}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
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
                <p className="text-sm font-medium text-gray-600">Pending Invoices</p>
                <p className="text-2xl font-bold text-blue-600">{stats.pending_invoices}</p>
                <p className="text-sm text-blue-500">${stats.pending_amount.toLocaleString()}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </motion.div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Dates</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_year">This Year</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  School
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInvoices.map((invoice) => (
                <motion.tr
                  key={invoice.invoice_id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.invoice_number}
                      </div>
                      <div className="text-sm text-gray-500">{invoice.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.school_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${invoice.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(invoice.status)}
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(invoice.due_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        className="text-blue-600 hover:text-blue-900"
                        title="View Invoice"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownloadInvoice(invoice)}
                        className="text-green-600 hover:text-green-900"
                        title="Download Invoice"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      {invoice.status === 'draft' && (
                        <button
                          onClick={() => handleSendInvoice(invoice.invoice_id)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Send Invoice"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredInvoices.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        )}
      </div>

      {/* Create Invoice Modal Placeholder */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Invoice</h3>
            <p className="text-gray-600 mb-4">Invoice creation form would be implemented here.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicesPage;