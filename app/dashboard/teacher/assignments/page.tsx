'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import GlassBackground from '../components/GlassBackground';
import AssignmentsCard from '../components/AssignmentsCard';
import { motion } from 'framer-motion';
import { FileText, Plus } from 'lucide-react';

export default function AssignmentsPage() {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);

  useEffect(() => {
    // Fetch assignments from database
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      // TODO: Fetch real assignments from database
      setAssignments([]);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black flex items-center justify-center">
        <GlassBackground />
        <div className="relative z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/30 border-t-white"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen relative">
      <GlassBackground />
      <Sidebar />
      <div className="flex-1 flex flex-col lg:ml-72 relative z-10">
        <Navbar onSearch={() => {}} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-400" />
                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                  Assignments
                </h1>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg transition-colors">
                <Plus className="w-5 h-5" />
                Create Assignment
              </button>
            </div>
            <p className="text-white/70">
              Manage assignments for your classes
            </p>
          </motion.div>

          <AssignmentsCard assignments={assignments} />
        </main>
      </div>
    </div>
  );
}

