'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download } from 'lucide-react';

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<string>('');

  const reports = [
    { id: 'collections', name: 'Collections Report', description: 'All payments collected in the current term' },
    { id: 'balances', name: 'Balances Report', description: 'Outstanding balances for all students' },
    { id: 'term-summary', name: 'Term Summary', description: 'Complete financial summary for the term' },
    { id: 'expenses', name: 'Expenses Report', description: 'All expenses recorded in the current term' },
  ];

  const generateReport = (reportId: string) => {
    const q = new URLSearchParams();
    window.open(`/api/accountant/${reportId}.pdf?${q.toString()}`, '_blank');
  };

  return (
    <div className="relative">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Reports</h1>
        <p className="text-white/85">Generate and download financial reports</p>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((report) => (
          <motion.div
            key={report.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg p-6 hover:bg-white/15 transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-500/20 border border-blue-400/40 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{report.name}</h3>
                  <p className="text-sm text-white/60 mt-1">{report.description}</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => generateReport(report.id)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Generate PDF
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}


