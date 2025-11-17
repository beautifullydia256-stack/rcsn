'use client';

import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, TrendingDown, AlertCircle, Lightbulb, BarChart3 } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import GlassCard from './GlassCard';

interface StudentInsight {
  name: string;
  status: 'struggling' | 'improving' | 'stable';
  subject: string;
  recommendation: string;
}

interface AIInsightsProps {
  strugglingStudents?: StudentInsight[];
  improvingStudents?: StudentInsight[];
  performanceData?: Array<{ name: string; average: number; attendance: number }>;
  attendanceData?: Array<{ week: string; attendance: number }>;
  loading?: boolean;
}

export default function AIInsights({
  strugglingStudents = [],
  improvingStudents = [],
  performanceData = [],
  attendanceData = [],
  loading = false
}: AIInsightsProps) {
  // Mock data if not provided
  const mockStruggling: StudentInsight[] = strugglingStudents.length > 0 ? strugglingStudents : [
    { name: 'John Doe', status: 'struggling', subject: 'Mathematics', recommendation: 'Needs additional practice with algebra concepts. Suggest weekly tutoring sessions.' },
    { name: 'Jane Smith', status: 'struggling', subject: 'Physics', recommendation: 'Struggling with problem-solving. Provide more worked examples.' }
  ];

  const mockImproving: StudentInsight[] = improvingStudents.length > 0 ? improvingStudents : [
    { name: 'Alice Johnson', status: 'improving', subject: 'Chemistry', recommendation: 'Showing great progress! Continue with current study plan.' },
    { name: 'Bob Williams', status: 'improving', subject: 'Biology', recommendation: 'Excellent improvement in test scores. Keep up the good work!' }
  ];

  const mockPerformanceData = performanceData.length > 0 ? performanceData : [
    { name: 'Week 1', average: 72, attendance: 85 },
    { name: 'Week 2', average: 75, attendance: 88 },
    { name: 'Week 3', average: 78, attendance: 90 },
    { name: 'Week 4', average: 80, attendance: 92 },
    { name: 'Week 5', average: 82, attendance: 93 }
  ];

  const mockAttendanceData = attendanceData.length > 0 ? attendanceData : [
    { week: 'Mon', attendance: 95 },
    { week: 'Tue', attendance: 92 },
    { week: 'Wed', attendance: 98 },
    { week: 'Thu', attendance: 90 },
    { week: 'Fri', attendance: 94 }
  ];

  // Use real data if provided, otherwise use mock data
  const displayStruggling = strugglingStudents.length > 0 ? strugglingStudents : mockStruggling;
  const displayImproving = improvingStudents.length > 0 ? improvingStudents : mockImproving;
  const displayPerformance = performanceData.length > 0 ? performanceData : mockPerformanceData;
  const displayAttendance = attendanceData.length > 0 ? attendanceData : mockAttendanceData;

  if (loading) {
    return (
      <GlassCard className="p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5" style={{ color: '#ae79ff' }} />
            AI-Powered Insights
          </h2>
          <span 
            className="text-xs px-2 py-1 rounded-lg"
            style={{
              background: 'rgba(174, 121, 255, 0.2)',
              color: '#ae79ff'
            }}
          >
            Powered by AI
          </span>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#ae79ff' }}></div>
            <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>Analyzing student performance with AI...</p>
          </div>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6 mb-8" hover={true}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5" style={{ color: '#ae79ff' }} />
          AI-Powered Insights
        </h2>
        <div className="flex items-center gap-2">
          {strugglingStudents.length > 0 || improvingStudents.length > 0 ? (
            <span 
              className="text-xs px-2 py-1 rounded-lg font-medium"
              style={{
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#10b981'
              }}
            >
              ✓ Real AI Data
            </span>
          ) : (
            <span 
              className="text-xs px-2 py-1 rounded-lg"
              style={{
                background: 'rgba(174, 121, 255, 0.2)',
                color: '#ae79ff'
              }}
            >
              Powered by AI
            </span>
          )}
        </div>
      </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Struggling Students */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5" style={{ color: '#ef4444' }} />
            <h3 className="font-semibold text-white">Students Needing Attention</h3>
            <span 
              className="ml-auto text-xs px-2 py-1 rounded-full"
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#ef4444'
              }}
            >
              {displayStruggling.length}
            </span>
          </div>
          <div className="space-y-3">
            {displayStruggling.length > 0 ? (
              displayStruggling.map((student, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 rounded-lg"
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)'
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium text-white">{student.name}</div>
                    <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>{student.subject}</div>
                  </div>
                  <TrendingDown className="w-4 h-4 flex-shrink-0" style={{ color: '#ef4444' }} />
                </div>
                <div className="flex items-start gap-2 mt-2">
                  <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
                  <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>{student.recommendation}</p>
                </div>
              </motion.div>
              ))
            ) : (
              <div className="text-center py-4 text-sm" style={{ color: 'rgba(255, 255, 255, 0.55)' }}>
                No students needing attention at this time.
              </div>
            )}
          </div>
        </div>

        {/* Improving Students */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5" style={{ color: '#10b981' }} />
            <h3 className="font-semibold text-white">Students Improving</h3>
            <span 
              className="ml-auto text-xs px-2 py-1 rounded-full"
              style={{
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#10b981'
              }}
            >
              {displayImproving.length}
            </span>
          </div>
          <div className="space-y-3">
            {displayImproving.length > 0 ? (
              displayImproving.map((student, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 rounded-lg"
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)'
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium text-white">{student.name}</div>
                    <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>{student.subject}</div>
                  </div>
                  <TrendingUp className="w-4 h-4 flex-shrink-0" style={{ color: '#10b981' }} />
                </div>
                <div className="flex items-start gap-2 mt-2">
                  <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
                  <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>{student.recommendation}</p>
                </div>
              </motion.div>
              ))
            ) : (
              <div className="text-center py-4 text-sm" style={{ color: 'rgba(255, 255, 255, 0.55)' }}>
                No improving students to display at this time.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Trend */}
        <div>
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" style={{ color: '#4dabff' }} />
            Class Performance Trend
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayPerformance}>
                <defs>
                  <linearGradient id="colorAverage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis dataKey="name" stroke="rgba(255, 255, 255, 0.55)" />
                <YAxis stroke="rgba(255, 255, 255, 0.55)" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(30, 30, 40, 0.95)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: '#ffffff'
                  }}
                />
                <Area type="monotone" dataKey="average" stroke="#3b82f6" fillOpacity={1} fill="url(#colorAverage)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Attendance Trend */}
        <div>
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" style={{ color: '#10b981' }} />
            Weekly Attendance Trend
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayAttendance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                <XAxis dataKey="week" stroke="#6b7280" className="dark:stroke-gray-400" />
                <YAxis stroke="#6b7280" className="dark:stroke-gray-400" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                  className="dark:bg-gray-800 dark:border-gray-700"
                />
                <Bar dataKey="attendance" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        </div>
      </div>
    </GlassCard>
  );
}

