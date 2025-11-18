'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/src/lib/supabase';
import { motion } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import { TrendingUp, Users, DollarSign } from 'lucide-react';

export default function ChartsAnalytics() {
  const [attendanceData, setAttendanceData] = useState<Array<{ date: string; percentage: number; present: number; total: number }>>([]);
  const [loading, setLoading] = useState(true);
  
  // Mock chart data for other charts
  const performanceData = [85, 82, 88, 90, 87, 92, 89];
  const feeData = [2.5, 2.8, 2.3, 3.1, 2.9, 3.2, 3.0];

  // Get last 7 working days (excluding weekends)
  const getLast7WorkingDays = () => {
    const days: string[] = [];
    let date = new Date();
    let count = 0;
    
    while (count < 7) {
      const dayOfWeek = date.getDay();
      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days.push(date.toISOString().slice(0, 10));
        count++;
      }
      // Go back one day
      date.setDate(date.getDate() - 1);
    }
    
    return days.reverse(); // Return in chronological order (oldest first)
  };

  useEffect(() => {
    const loadAttendanceData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data: u } = await supabase.from("users").select("school_id").eq("user_id", user.id).single();
        if (!u?.school_id) return;

        const workingDays = getLast7WorkingDays();
        
        // Get total active students for the school
        const { data: activeStudents } = await supabase
          .from('students')
          .select('student_id', { count: 'exact', head: false })
          .eq('school_id', u.school_id)
          .eq('status', 'active');
        
        const totalActiveStudents = activeStudents?.length || 0;
        
        if (totalActiveStudents === 0) {
          setAttendanceData(workingDays.map(date => ({ date, percentage: 0, present: 0, total: 0 })));
          setLoading(false);
          return;
        }

        // Fetch attendance for each working day
        const attendancePromises = workingDays.map(async (date) => {
          const { data: attendance } = await supabase
            .from('student_attendance')
            .select('student_id, present')
            .eq('school_id', u.school_id)
            .eq('date', date);
          
          const presentCount = (attendance || []).filter(a => a.present === true).length;
          const percentage = totalActiveStudents > 0 ? Math.round((presentCount / totalActiveStudents) * 100) : 0;
          
          return {
            date,
            percentage,
            present: presentCount,
            total: totalActiveStudents
          };
        });

        const results = await Promise.all(attendancePromises);
        setAttendanceData(results);
      } catch (error) {
        console.error('Error loading attendance data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAttendanceData();
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      {/* Student Performance Trends */}
      <GlassCard className="p-6 relative overflow-hidden" hover>
        <div
          className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 blur-2xl"
          style={{ background: '#4dabff' }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-5 h-5" style={{ color: '#4dabff' }} />
            <h3 className="text-lg font-semibold text-white">Performance Trends</h3>
          </div>
          <div className="h-32 flex items-end gap-2">
            {performanceData.map((value, index) => (
              <div
                key={index}
                className="flex-1 rounded-t transition-all hover:opacity-80"
                style={{
                  background: 'linear-gradient(to top, #4dabff, #00d4ff)',
                  height: `${(value / 100) * 100}%`,
                  minHeight: '20px'
                }}
                title={`Week ${index + 1}: ${value}%`}
              />
            ))}
          </div>
          <div className="text-xs text-white/70 mt-2 text-center">Last 7 weeks</div>
        </div>
      </GlassCard>

      {/* Attendance Patterns */}
      <GlassCard className="p-6 relative overflow-hidden" hover>
        <div
          className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 blur-2xl"
          style={{ background: '#10b981' }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5" style={{ color: '#10b981' }} />
            <h3 className="text-lg font-semibold text-white">Attendance Patterns</h3>
          </div>
          {loading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="text-white/70 text-sm">Loading...</div>
            </div>
          ) : attendanceData.length === 0 ? (
            <div className="h-32 flex items-center justify-center">
              <div className="text-white/70 text-sm">No attendance data available</div>
            </div>
          ) : (
            <>
              <div className="h-32 flex items-end gap-2">
                {attendanceData.map((day, index) => {
                  const date = new Date(day.date);
                  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                  const dayNumber = date.getDate();
                  const maxPercentage = Math.max(...attendanceData.map(d => d.percentage), 100);
                  
                  return (
                    <div
                      key={day.date}
                      className="flex-1 flex flex-col items-center group"
                    >
                      <div
                        className="w-full rounded-t transition-all hover:opacity-80 cursor-pointer"
                        style={{
                          background: 'linear-gradient(to top, #10b981, #00d4ff)',
                          height: `${maxPercentage > 0 ? (day.percentage / maxPercentage) * 100 : 0}%`,
                          minHeight: day.percentage > 0 ? '8px' : '4px'
                        }}
                        title={`${dayName} ${dayNumber}: ${day.percentage}% (${day.present}/${day.total})`}
                      />
                      <div className="text-[10px] text-white/70 mt-1 text-center leading-tight">
                        <div className="font-medium">{dayName}</div>
                        <div>{dayNumber}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="text-xs text-white/70 mt-2 text-center">Last 7 working days</div>
            </>
          )}
        </div>
      </GlassCard>

      {/* Fee Collections vs Outstanding */}
      <GlassCard className="p-6 relative overflow-hidden" hover>
        <div
          className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 blur-2xl"
          style={{ background: '#f59e0b' }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="w-5 h-5" style={{ color: '#f59e0b' }} />
            <h3 className="text-lg font-semibold text-white">Fee Collections</h3>
          </div>
          <div className="h-32 flex items-end gap-2">
            {feeData.map((value, index) => (
              <div
                key={index}
                className="flex-1 rounded-t transition-all hover:opacity-80"
                style={{
                  background: 'linear-gradient(to top, #f59e0b, #ff6bcb)',
                  height: `${(value / 4) * 100}%`,
                  minHeight: '20px'
                }}
                title={`Week ${index + 1}: ${value}M UGX`}
              />
            ))}
          </div>
          <div className="text-xs text-white/70 mt-2 text-center">Last 7 weeks (M UGX)</div>
        </div>
      </GlassCard>
    </div>
  );
}

