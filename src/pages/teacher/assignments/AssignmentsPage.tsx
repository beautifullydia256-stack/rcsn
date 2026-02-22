import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Plus } from 'lucide-react';
import AssignmentsCard from '../components/AssignmentsCard';

export default function AssignmentsPage() {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);

  useEffect(() => {
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
    fetchAssignments();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-blue-400" />
          <h1 className="text-2xl sm:text-3xl font-bold ac-text-primary">Assignments</h1>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Assignment
        </button>
      </div>
      <p className="ac-text-muted">Manage assignments for your classes</p>
      <AssignmentsCard assignments={assignments} />
    </motion.div>
  );
}
