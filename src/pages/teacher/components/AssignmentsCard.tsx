import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Upload, Clock, CheckCircle, AlertCircle } from 'lucide-react';

export interface Assignment {
  id: string;
  title: string;
  class_name: string;
  subject: string;
  due_date: string;
  status: 'pending' | 'submitted' | 'overdue';
  submissions?: number;
}

interface AssignmentsCardProps {
  assignments?: Assignment[];
}

const MOCK_ASSIGNMENTS: Assignment[] = [
  { id: '1', title: 'Math Homework Chapter 5', class_name: 'S.1 West', subject: 'Mathematics', due_date: '2024-01-15', status: 'pending', submissions: 25 },
  { id: '2', title: 'Physics Lab Report', class_name: 'S.2 East', subject: 'Physics', due_date: '2024-01-14', status: 'overdue', submissions: 20 },
  { id: '3', title: 'Chemistry Quiz', class_name: 'S.3 North', subject: 'Chemistry', due_date: '2024-01-16', status: 'pending', submissions: 30 },
];

function getStatusColor(status: string) {
  switch (status) {
    case 'pending':
      return { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-200 dark:border-yellow-800', icon: 'text-yellow-600 dark:text-yellow-400' };
    case 'submitted':
      return { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400', border: 'border-green-200 dark:border-green-800', icon: 'text-green-600 dark:text-green-400' };
    case 'overdue':
      return { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-800', icon: 'text-red-600 dark:text-red-400' };
    default:
      return { bg: 'bg-gray-50 dark:bg-gray-900/20', text: 'text-gray-700 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-800', icon: 'text-gray-600 dark:text-gray-400' };
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'pending': return Clock;
    case 'submitted': return CheckCircle;
    case 'overdue': return AlertCircle;
    default: return FileText;
  }
}

export default function AssignmentsCard({ assignments = [] }: AssignmentsCardProps) {
  const navigate = useNavigate();
  const list = assignments.length > 0 ? assignments : MOCK_ASSIGNMENTS;

  return (
    <div className="relative group overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 dark:from-white/10 dark:to-white/5 rounded-2xl backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-2xl" />
      <div className="relative bg-white/30 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-white/30 dark:border-white/10 p-6 shadow-lg hover:shadow-2xl transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        <div className="relative z-10 flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Assignments
          </h2>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/dashboard/teacher/assignments')}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload
            </motion.button>
            <button type="button" onClick={() => navigate('/dashboard/teacher/assignments')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              View All
            </button>
          </div>
        </div>
        <div className="relative z-10 space-y-3">
          {list.slice(0, 3).map((assignment, index) => {
            const statusColors = getStatusColor(assignment.status);
            const StatusIcon = getStatusIcon(assignment.status);
            const isOverdue = assignment.status === 'overdue';
            const due = new Date(assignment.due_date);
            due.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isDueToday = due.getTime() === today.getTime();
            const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

            return (
              <motion.div
                key={assignment.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ x: 4 }}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/dashboard/teacher/assignments/${assignment.id}`)}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/dashboard/teacher/assignments/${assignment.id}`)}
                className={`${statusColors.bg} ${statusColors.border} border rounded-lg p-4 cursor-pointer transition-all`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusIcon className={`w-4 h-4 ${statusColors.icon}`} />
                      <h3 className="font-medium text-gray-900 dark:text-white">{assignment.title}</h3>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{assignment.class_name} • {assignment.subject}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors.text} ${statusColors.bg}`}>
                    {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span className={isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : isDueToday ? 'text-yellow-600 dark:text-yellow-400 font-medium' : ''}>
                        {formatDate(assignment.due_date)}
                      </span>
                    </div>
                    {assignment.submissions != null && (
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>{assignment.submissions} submissions</span>
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/teacher/assignments/${assignment.id}/mark`); }} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">
                    Mark →
                  </button>
                </div>
              </motion.div>
            );
          })}
          {list.length > 3 && (
            <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => navigate('/dashboard/teacher/assignments')} className="w-full mt-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
              View {list.length - 3} more assignments
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
