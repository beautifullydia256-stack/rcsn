'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  UserPlus,
  GraduationCap,
  Users,
  Briefcase,
  FileText,
  Receipt,
  BriefcaseIcon,
  BookOpen,
  UserCog,
  FileCheck,
  MapPin,
  Settings,
} from 'lucide-react';

export default function AdminQuickActions() {
  const router = useRouter();

  const actions = [
    { icon: UserPlus, label: 'Add Student', color: '#16a34a', path: '/dashboard/admin/students/add' },
    { icon: GraduationCap, label: 'Add Teacher', color: '#16a34a', path: '/dashboard/admin/teachers/add' },
    { icon: Users, label: 'Add Parent', color: '#16a34a', path: '/dashboard/admin/parents/add' },
    { icon: Briefcase, label: 'Add Accounts Manager', color: '#6b7280', path: '/dashboard/admin/accounts/add' },
    { icon: FileText, label: 'Generate Reports', color: '#6b7280', path: '/dashboard/admin/reports/generate' },
    { icon: Receipt, label: 'Generate Receipts', color: '#6b7280', path: '/dashboard/admin/receipts/generate' },
    { icon: BriefcaseIcon, label: 'Post Job Vacancy', color: '#6b7280', path: '/dashboard/admin/jobs/post' },
    { icon: BookOpen, label: 'Add Librarian', color: '#6b7280', path: '/dashboard/admin/librarian/add' },
    { icon: UserCog, label: 'Appoint Head Teacher', color: '#6b7280', path: '/dashboard/admin/head-teacher/appoint' },
    { icon: FileCheck, label: 'Headed Paper', color: '#6b7280', path: '/dashboard/head-teacher/headed-paper' },
    { icon: MapPin, label: 'Location Settings', color: '#6b7280', path: '/dashboard/admin/settings/location' },
    { icon: Settings, label: 'System Settings', color: '#6b7280', path: '/dashboard/admin/settings' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          const isGreen = action.color === '#16a34a';
          return (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push(action.path)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                isGreen
                  ? 'bg-green-50 border-green-200 text-green-800 hover:bg-green-100'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" style={{ color: action.color }} />
              <span>{action.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

