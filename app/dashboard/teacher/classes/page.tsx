'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import ClassCards from '../components/ClassCards';
import { motion } from 'framer-motion';

export default function ClassesPage() {
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const userMetadata = (user as any).user_metadata || (user as any).raw_user_meta_data || {};
      const schoolId = userMetadata.school_id;
      if (!schoolId) return;

      setSchoolId(schoolId);

      // Fetch teacher class assignments
      const response = await fetch('/api/teacher/resolve-assignments', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        if (data.assignments) {
          setAssignments(data.assignments);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col lg:ml-72">
        <Navbar onSearch={() => {}} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              My Classes
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              View and manage your assigned classes
            </p>
          </motion.div>

          <ClassCards assignments={assignments} />
        </main>
      </div>
    </div>
  );
}

