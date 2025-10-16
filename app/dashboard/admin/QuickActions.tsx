"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

export function AdminQuickActions() {
  const [busy, setBusy] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolLocation, setSchoolLocation] = useState<{
    name: string;
    latitude: number;
    longitude: number;
    radius: number;
  } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("users").select("school_id").eq("user_id", user.id).single();
      setSchoolId(data?.school_id || null);
      
      // Load school location if school_id exists
      if (data?.school_id) {
        loadSchoolLocation(data.school_id);
      }
    };
    run();
  }, []);

  const loadSchoolLocation = async (schoolId: string) => {
    try {
      const { data: schoolData } = await supabase
        .from("schools")
        .select("location_name, location_latitude, location_longitude, location_radius")
        .eq("school_id", schoolId)
        .single();
      
      if (schoolData) {
        setSchoolLocation({
          name: schoolData.location_name || "School Location",
          latitude: schoolData.location_latitude || 0,
          longitude: schoolData.location_longitude || 0,
          radius: schoolData.location_radius || 100
        });
      }
    } catch (error) {
      console.error("Error loading school location:", error);
    }
  };


  return (
    <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4">
      <div className="text-sm font-medium mb-3 text-white">Quick Actions</div>
      <div className="flex flex-wrap gap-2">
        <button className="px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 transition-transform hover:scale-105 text-white text-sm" onClick={() => router.push('/dashboard/admin/students/add')}>Add Student</button>
        <button className="px-3 py-2 rounded-lg bg-green-500 hover:bg-green-400 transition-transform hover:scale-105 text-white text-sm" onClick={() => router.push('/dashboard/admin/teachers/add')}>Add Teacher</button>
        <button className="px-3 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 transition-transform hover:scale-105 text-white text-sm" onClick={() => router.push('/dashboard/admin/parents/add')}>Add Parent</button>
        <button className="px-3 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 transition-transform hover:scale-105 text-white text-sm" onClick={() => router.push('/dashboard/admin/accounts/add')}>Add Accounts Manager</button>
        <button className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 transition-transform hover:scale-105 text-white text-sm" onClick={() => router.push('/dashboard/admin/reports/generate')}>Generate Reports</button>
        <button className="px-3 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 transition-transform hover:scale-105 text-white text-sm" onClick={() => router.push('/dashboard/admin/receipts/generate')}>Generate Receipts</button>
        <button className="px-3 py-2 rounded-lg bg-purple-500 hover:bg-purple-400 transition-transform hover:scale-105 text-white text-sm" onClick={() => router.push('/dashboard/admin/jobs/post')}>Post Job Vacancy</button>
        <button className="px-3 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 transition-transform hover:scale-105 text-white text-sm" onClick={() => router.push('/dashboard/admin/librarian/add')}>Add Librarian</button>
        <button className="px-3 py-2 rounded-lg bg-slate-500 hover:bg-slate-400 transition-transform hover:scale-105 text-white text-sm" onClick={() => router.push('/dashboard/admin/settings')}>System Settings</button>
        <button className="px-3 py-2 rounded-lg bg-purple-500 hover:bg-purple-400 transition-transform hover:scale-105 text-white text-sm" onClick={() => router.push('/dashboard/admin/settings/location')}>Location Settings</button>
        <button className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 transition-transform hover:scale-105 text-white text-sm" onClick={() => router.push('/dashboard/head-teacher/headed-paper')}>Headed Paper</button>
        <button className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 transition-transform hover:scale-105 text-white text-sm" onClick={() => router.push('/dashboard/admin/head-teacher/appoint')}>Appoint Head Teacher</button>
      </div>

      {/* School Location Management */}
      <div className="mt-4 pt-3 border-t border-white/10">
        <div className="text-sm font-medium mb-2 text-white">School Location Settings</div>
        
        {/* Current School Location */}
        <div className="mb-3">
          <div className="text-xs text-white/70 mb-2">Current Location:</div>
          <div className="p-3 rounded-lg bg-blue-500/20 border border-blue-500/30">
            <div className="text-blue-300 text-sm font-medium">
              {schoolLocation?.name || "GPS Location Verification"}
            </div>
            {schoolLocation && (
              <div className="text-blue-200 text-xs mt-1 space-y-1">
                <div>📍 {schoolLocation.latitude.toFixed(6)}, {schoolLocation.longitude.toFixed(6)}</div>
                <div>📏 Radius: {schoolLocation.radius}m</div>
                <div>✅ Teachers must be within this radius to punch in/out</div>
              </div>
            )}
            <button
              onClick={() => router.push('/dashboard/admin/settings/location')}
              className="mt-2 px-3 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700 transition-colors"
            >
              {schoolLocation ? "Update Location" : "Configure Location"}
            </button>
          </div>
        </div>
        
        <div className="text-xs text-white/60">
          Set GPS coordinates and radius for teacher attendance verification
        </div>
      </div>

      {/* creation moved to dedicated pages */}
    </div>
  );
}



