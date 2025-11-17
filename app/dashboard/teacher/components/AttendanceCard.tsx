'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, CheckCircle, XCircle, RefreshCw, LogIn, LogOut } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';

interface AttendanceCardProps {
  schoolId: string;
  teacherId: string;
}

export default function AttendanceCard({ schoolId, teacherId }: AttendanceCardProps) {
  const [locationVerification, setLocationVerification] = useState<{
    isAtSchool: boolean;
    method: 'gps' | 'ip' | 'none';
    distance?: number;
    error?: string;
    loading: boolean;
  }>({
    isAtSchool: false,
    method: 'none',
    loading: true
  });

  const [attendanceStatus, setAttendanceStatus] = useState<{
    punchedIn: boolean;
    punchedOut: boolean;
    punchInTime: string | null;
    punchOutTime: string | null;
  }>({
    punchedIn: false,
    punchedOut: false,
    punchInTime: null,
    punchOutTime: null
  });

  const [punching, setPunching] = useState<'punch_in' | 'punch_out' | null>(null);

  useEffect(() => {
    verifyLocation();
    checkAttendanceStatus();
  }, [schoolId, teacherId]);

  const verifyLocation = async () => {
    setLocationVerification(prev => ({ ...prev, loading: true }));
    
    try {
      let currentLocation = null;
      if (navigator.geolocation) {
        currentLocation = await new Promise<{latitude: number, longitude: number} | null>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              });
            },
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
          );
        });
      }

      const response = await fetch('/api/location/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: schoolId,
          latitude: currentLocation?.latitude,
          longitude: currentLocation?.longitude
        })
      });

      if (response.ok) {
        const result = await response.json();
        setLocationVerification({
          isAtSchool: result.isAtSchool,
          method: result.method || 'gps',
          distance: result.distance,
          error: result.error,
          loading: false
        });
      } else {
        const error = await response.json();
        setLocationVerification({
          isAtSchool: false,
          method: 'none',
          error: error.error || 'Location verification failed',
          loading: false
        });
      }
    } catch (error) {
      console.error('Error verifying location:', error);
      setLocationVerification({
        isAtSchool: false,
        method: 'none',
        error: 'Unable to verify location',
        loading: false
      });
    }
  };

  const checkAttendanceStatus = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: attendanceData } = await supabase
        .from('teacher_attendance_logs')
        .select('punch_in, punch_out')
        .eq('teacher_id', teacherId)
        .eq('date', today)
        .single();

      if (attendanceData) {
        setAttendanceStatus({
          punchedIn: !!attendanceData.punch_in,
          punchedOut: !!attendanceData.punch_out,
          punchInTime: attendanceData.punch_in,
          punchOutTime: attendanceData.punch_out
        });
      } else {
        setAttendanceStatus({
          punchedIn: false,
          punchedOut: false,
          punchInTime: null,
          punchOutTime: null
        });
      }
    } catch (error) {
      console.error('Error checking attendance status:', error);
    }
  };

  const handlePunch = async (type: 'punch_in' | 'punch_out') => {
    if (!locationVerification.isAtSchool) {
      alert(`Location verification failed. Please ensure you are at the school location.\n${locationVerification.error || ''}`);
      return;
    }

    setPunching(type);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();

      if (type === 'punch_in') {
        if (attendanceStatus.punchedIn) {
          alert('You have already punched in today!');
          setPunching(null);
          return;
        }

        const { error } = await supabase.from('teacher_attendance_logs').insert({
          teacher_id: teacherId,
          school_id: schoolId,
          location_verified: true,
          location_method: locationVerification.method,
          location_distance: locationVerification.distance,
          punch_in: now,
          date: today
        });

        if (error) throw error;
        alert('Successfully punched in!');
      } else {
        if (!attendanceStatus.punchedIn) {
          alert('Please punch in first!');
          setPunching(null);
          return;
        }

        if (attendanceStatus.punchedOut) {
          alert('You have already punched out today!');
          setPunching(null);
          return;
        }

        const { error } = await supabase
          .from('teacher_attendance_logs')
          .update({ punch_out: now })
          .eq('teacher_id', teacherId)
          .eq('date', today);

        if (error) throw error;
        alert('Successfully punched out!');
      }

      await checkAttendanceStatus();
    } catch (error) {
      console.error('Error punching in/out:', error);
      alert('Error processing attendance. Please try again.');
    } finally {
      setPunching(null);
    }
  };

  return (
    <div className="relative group overflow-hidden">
      {/* Liquid Glass Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 dark:from-white/10 dark:to-white/5 rounded-2xl backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-2xl"></div>
      <div className="relative bg-white/30 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-white/30 dark:border-white/10 p-6 shadow-lg hover:shadow-2xl transition-all duration-300">
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        <div className="relative z-10 flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 drop-shadow-sm">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Teacher Attendance
          </h2>
          <button
            onClick={verifyLocation}
            disabled={locationVerification.loading}
            className="relative z-10 p-1.5 rounded-lg bg-white/20 dark:bg-white/10 backdrop-blur-sm border border-white/20 dark:border-white/10 hover:bg-white/30 dark:hover:bg-white/15 transition-all"
            title="Refresh Location"
          >
            <RefreshCw className={`w-4 h-4 text-gray-700 dark:text-gray-300 ${locationVerification.loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Location Status */}
        <div className={`relative z-10 mb-4 p-4 rounded-xl border backdrop-blur-sm ${
          locationVerification.isAtSchool
            ? 'bg-green-400/20 dark:bg-green-500/10 border-white/30 dark:border-white/10'
            : 'bg-red-400/20 dark:bg-red-500/10 border-white/30 dark:border-white/10'
        }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <MapPin className={`w-4 h-4 ${
              locationVerification.isAtSchool
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`} />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Location Status</span>
          </div>
          {locationVerification.loading ? (
            <span className="text-sm text-yellow-600 dark:text-yellow-400">Verifying...</span>
          ) : locationVerification.isAtSchool ? (
            <span className="text-sm font-semibold text-green-600 dark:text-green-400 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              At School
            </span>
          ) : (
            <span className="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
              <XCircle className="w-4 h-4" />
              Not at School
            </span>
          )}
        </div>
        {locationVerification.distance && (
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Distance: {Math.round(locationVerification.distance)}m ({locationVerification.method.toUpperCase()})
          </div>
        )}
        {locationVerification.error && !locationVerification.isAtSchool && (
          <div className="text-xs text-red-600 dark:text-red-400 mt-1">
            {locationVerification.error}
          </div>
        )}
        </div>

        {/* Attendance Status */}
        <div className="relative z-10 grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Punch In</div>
          {attendanceStatus.punchedIn ? (
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                {attendanceStatus.punchInTime ? new Date(attendanceStatus.punchInTime).toLocaleTimeString() : 'Done'}
              </span>
            </div>
          ) : (
            <span className="text-sm text-gray-500 dark:text-gray-400">Not punched in</span>
          )}
        </div>
        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Punch Out</div>
          {attendanceStatus.punchedOut ? (
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                {attendanceStatus.punchOutTime ? new Date(attendanceStatus.punchOutTime).toLocaleTimeString() : 'Done'}
              </span>
            </div>
          ) : (
            <span className="text-sm text-gray-500 dark:text-gray-400">Not punched out</span>
          )}
        </div>
      </div>

      {/* Punch Buttons */}
      <div className="flex gap-3">
        <motion.button
          whileHover={{ scale: punching ? 1 : 1.02 }}
          whileTap={{ scale: punching ? 1 : 0.98 }}
          onClick={() => handlePunch('punch_in')}
          disabled={attendanceStatus.punchedIn || punching !== null || !locationVerification.isAtSchool || locationVerification.loading}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
            attendanceStatus.punchedIn || punching !== null || !locationVerification.isAtSchool
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg'
          }`}
        >
          {punching === 'punch_in' ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              {attendanceStatus.punchedIn ? 'Punched In' : 'Punch In'}
            </>
          )}
        </motion.button>

        <motion.button
          whileHover={{ scale: punching ? 1 : 1.02 }}
          whileTap={{ scale: punching ? 1 : 0.98 }}
          onClick={() => handlePunch('punch_out')}
          disabled={!attendanceStatus.punchedIn || attendanceStatus.punchedOut || punching !== null || !locationVerification.isAtSchool || locationVerification.loading}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
            !attendanceStatus.punchedIn || attendanceStatus.punchedOut || punching !== null || !locationVerification.isAtSchool
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg'
          }`}
        >
          {punching === 'punch_out' ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <LogOut className="w-4 h-4" />
              {attendanceStatus.punchedOut ? 'Punched Out' : 'Punch Out'}
            </>
          )}
        </motion.button>
        </div>
      </div>
    </div>
  );
}

