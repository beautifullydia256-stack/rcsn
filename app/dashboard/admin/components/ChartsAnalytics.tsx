'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { motion } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import { TrendingUp, Users, DollarSign } from 'lucide-react';

export default function ChartsAnalytics() {
  const [termEnrollmentData, setTermEnrollmentData] = useState<Array<{ label: string; count: number; year: number; term: number }>>([]);
  const [termLoading, setTermLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState<Array<{ date: string; percentage: number; present: number; total: number }>>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [feeData, setFeeData] = useState<Array<{ label: string; amount: number; rawAmount: number }>>([]);
  const [feeLoading, setFeeLoading] = useState(true);

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

  const getLast7Weeks = () => {
    const weeks: Array<{ start: Date; end: Date; label: string }> = [];
    const today = new Date();
    const day = today.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - diffToMonday);
    currentWeekStart.setHours(0, 0, 0, 0);

    for (let i = 6; i >= 0; i--) {
      const start = new Date(currentWeekStart);
      start.setDate(start.getDate() - i * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      weeks.push({
        start,
        end,
        label: `Wk ${7 - i}`
      });
    }

    return weeks;
  };

  useEffect(() => {
    const loadTermEnrollment = async () => {
      try {
        setTermLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: u } = await supabase.from("users").select("school_id").eq("user_id", user.id).single();
        if (!u?.school_id) return;

        const today = new Date().toISOString().slice(0, 10);
        
        // Get all terms ordered by most recent first
        const { data: allTerms } = await supabase
          .from('school_terms')
          .select('id, year, term, start_date, end_date')
          .eq('school_id', u.school_id)
          .order('year', { ascending: false })
          .order('term', { ascending: false });

        if (!allTerms || allTerms.length === 0) {
          setTermEnrollmentData([]);
          setTermLoading(false);
          return;
        }

        // Find current term (where today falls between start_date and end_date)
        const currentTerm = allTerms.find((t: any) => {
          if (!t.start_date || !t.end_date) return false;
          return t.start_date <= today && t.end_date >= today;
        });

        // If no current term found, use the most recent PAST term (not future)
        let referenceTerm = currentTerm;
        if (!referenceTerm) {
          // Find the most recent term that has ended (end_date < today)
          referenceTerm = allTerms.find((t: any) => {
            if (!t.end_date) return false;
            return t.end_date < today;
          });
          // If still no term found, use the first term
          if (!referenceTerm) referenceTerm = allTerms[0];
        }
        
        if (!referenceTerm) {
          setTermEnrollmentData([]);
          setTermLoading(false);
          return;
        }

        // Filter out future terms (end_date > today) - we only want current and past terms
        const pastAndCurrentTerms = allTerms.filter((t: any) => {
          if (!t.end_date) return false;
          return t.end_date <= today || (t.start_date <= today && t.end_date >= today);
        });

        // Find index of reference term in the filtered list
        let refIndex = pastAndCurrentTerms.findIndex((t: any) => 
          t.year === referenceTerm.year && t.term === referenceTerm.term
        );

        // If reference term not found in filtered list, use the first term from filtered list
        if (refIndex === -1) {
          if (pastAndCurrentTerms.length === 0) {
            setTermEnrollmentData([]);
            setTermLoading(false);
            return;
          }
          referenceTerm = pastAndCurrentTerms[0];
          refIndex = 0;
        }

        // Build list: start with current term, then add 3 previous terms
        const selectedTerms: any[] = [referenceTerm];
        
        // Add terms that come AFTER the current term in the filtered array (which are older/previous)
        // Since array is DESCENDING, indices after refIndex are older terms
        for (let i = refIndex + 1; i < pastAndCurrentTerms.length && selectedTerms.length < 4; i++) {
          selectedTerms.push(pastAndCurrentTerms[i]);
        }
        
        // If we don't have 4 terms yet, we can't add future terms - just use what we have
        // This handles cases where there aren't enough previous terms in the school's history

        // Sort chronologically (oldest first for display)
        const chronological = [...selectedTerms].sort((a: any, b: any) => {
          if (a.year !== b.year) {
            return a.year - b.year;
          }
          return a.term - b.term;
        });

        // Get all students
        const { data: students } = await supabase
          .from('students')
          .select('student_id, created_at, status, graduation_year')
          .eq('school_id', u.school_id);

        // For each term, count students who were enrolled/active at the END of that term
        const termData = chronological.map((term: any) => {
          const termEndDate = term.end_date ? new Date(term.end_date + 'T23:59:59') : null;
          
          if (!termEndDate) {
            return {
              label: `T${term.term} ${term.year}`,
              count: 0,
              year: term.year,
              term: term.term,
            };
          }

          // Count students who:
          // 1. Were created before or during the term (created_at <= term.end_date)
          // 2. Were either active OR graduated after the term ended
          const count = (students || []).filter((student: any) => {
            const createdAt = student.created_at ? new Date(student.created_at) : null;
            if (!createdAt) return false;
            
            // Student must have been created before term ended
            if (createdAt > termEndDate) return false;
            
            // If graduated, check if they graduated after this term
            if (student.status === 'graduated' && student.graduation_year) {
              // If graduated in a year after this term's year, they were enrolled during this term
              if (student.graduation_year > term.year) return true;
              // If graduated in same year but term hasn't ended yet (for current term), count them
              if (student.graduation_year === term.year) {
                // For current term, if it's still ongoing, count active students
                if (currentTerm && term.year === currentTerm.year && term.term === currentTerm.term) {
                  return student.status === 'active';
                }
                // For past terms, if they graduated in same year, they were enrolled
                return true;
              }
              // Graduated before this term's year
              return false;
            }
            
            // Active students are always counted
            return true;
          }).length;

          return {
            label: `T${term.term} ${term.year}`,
            count,
            year: term.year,
            term: term.term,
          };
        });

        setTermEnrollmentData(termData);
      } catch (error) {
        console.error('Error loading term enrollment data:', error);
      } finally {
        setTermLoading(false);
      }
    };

    loadTermEnrollment();
  }, []);

  useEffect(() => {
    const loadAttendanceData = async () => {
      try {
        setAttendanceLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data: u } = await supabase.from("users").select("school_id").eq("user_id", user.id).single();
        if (!u?.school_id) return;

        const workingDays = getLast7WorkingDays();
        
        // Get total active students for the school
        const { count: activeStudentsCount } = await supabase
          .from('students')
          .select('student_id', { count: 'exact', head: true })
          .eq('school_id', u.school_id)
          .eq('status', 'active');
        
        const totalActiveStudents = activeStudentsCount || 0;
        
        if (totalActiveStudents === 0) {
          setAttendanceData(workingDays.map(date => ({ date, percentage: 0, present: 0, total: 0 })));
          setAttendanceLoading(false);
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
        setAttendanceLoading(false);
      }
    };

    loadAttendanceData();
  }, []);

  useEffect(() => {
    const loadFeeData = async () => {
      try {
        setFeeLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: u } = await supabase.from("users").select("school_id").eq("user_id", user.id).single();
        if (!u?.school_id) return;

        const weekRanges = getLast7Weeks();
        const earliestStart = weekRanges[0].start.toISOString().slice(0, 10);
        const latestEnd = weekRanges[weekRanges.length - 1].end.toISOString().slice(0, 10);

        const { data: payments } = await supabase
          .from('student_payments')
          .select('amount_paid, payment_date')
          .eq('school_id', u.school_id)
          .gte('payment_date', earliestStart)
          .lte('payment_date', latestEnd);

        const weeklyTotals = weekRanges.map((week) => {
          const total = (payments || []).reduce((sum, payment) => {
            if (!payment.payment_date) return sum;
            const paymentDate = new Date(payment.payment_date);
            if (paymentDate >= week.start && paymentDate <= week.end) {
              return sum + Number(payment.amount_paid || 0);
            }
            return sum;
          }, 0);

          return {
            label: week.label,
            amount: Number((total / 1_000_000).toFixed(2)),
            rawAmount: total
          };
        });

        setFeeData(weeklyTotals);
      } catch (error) {
        console.error('Error loading fee data:', error);
      } finally {
        setFeeLoading(false);
      }
    };

    loadFeeData();
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      {/* Student Enrollment Trends */}
      <GlassCard className="p-6 relative overflow-hidden" hover>
        <div
          className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 blur-2xl"
          style={{ background: '#4dabff' }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-5 h-5" style={{ color: '#4dabff' }} />
            <h3 className="text-lg font-semibold text-white">Enrollment Trends</h3>
          </div>
          {termLoading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="text-white/70 text-sm">Loading...</div>
            </div>
          ) : termEnrollmentData.length === 0 ? (
            <div className="h-32 flex items-center justify-center">
              <div className="text-white/70 text-sm">No term data available</div>
            </div>
          ) : (() => {
            const maxCount = Math.max(...termEnrollmentData.map(t => t.count), 1);
            return (
              <>
                <div className="h-32 flex items-end gap-2">
                  {termEnrollmentData.map((term) => (
                    <div
                      key={`${term.year}-${term.term}`}
                      className="flex-1 flex flex-col items-center group"
                    >
                      <div
                        className="w-full rounded-t transition-all hover:opacity-80 cursor-pointer"
                        style={{
                          background: 'linear-gradient(to top, #4dabff, #00d4ff)',
                          height: `${(term.count / maxCount) * 100}%`,
                          minHeight: term.count > 0 ? '8px' : '4px'
                        }}
                        title={`${term.label}: ${term.count.toLocaleString()} students`}
                      />
                      <div className="text-[10px] text-white/70 mt-1 text-center leading-tight">
                        <div className="font-medium">{term.label}</div>
                        <div>{term.count}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-white/70 mt-2 text-center">Current term vs previous 3 terms</div>
              </>
            );
          })()}
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
          {attendanceLoading ? (
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
          {feeLoading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="text-white/70 text-sm">Loading...</div>
            </div>
          ) : feeData.length === 0 ? (
            <div className="h-32 flex items-center justify-center">
              <div className="text-white/70 text-sm">No fee data available</div>
            </div>
          ) : (
            <>
              <div className="h-32 flex items-end gap-2">
                {feeData.map((week) => {
                  const maxAmount = Math.max(...feeData.map(f => f.amount), 1);
                  return (
                    <div
                      key={week.label}
                      className="flex-1 flex flex-col items-center group"
                    >
                      <div
                        className="w-full rounded-t transition-all hover:opacity-80 cursor-pointer"
                        style={{
                          background: 'linear-gradient(to top, #f59e0b, #ff6bcb)',
                          height: `${(week.amount / maxAmount) * 100}%`,
                          minHeight: week.amount > 0 ? '8px' : '4px'
                        }}
                        title={`${week.label}: UGX ${week.rawAmount.toLocaleString()}`}
                      />
                      <div className="text-[10px] text-white/70 mt-1 text-center leading-tight">
                        <div className="font-medium">{week.label}</div>
                        <div>{week.amount}M</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="text-xs text-white/70 mt-2 text-center">Last 7 weeks (M UGX)</div>
            </>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

