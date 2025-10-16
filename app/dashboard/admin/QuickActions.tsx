"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

export function AdminQuickActions() {
  const [busy, setBusy] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const router = useRouter();
  const [wifiSSIDs, setWifiSSIDs] = useState<string[]>([]);
  const [newSSID, setNewSSID] = useState("");

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("users").select("school_id").eq("user_id", user.id).single();
      setSchoolId(data?.school_id || null);
      
      // Load existing WiFi SSIDs
      if (data?.school_id) {
        loadWifiSSIDs(data.school_id);
      }
    };
    run();
  }, []);

  const loadWifiSSIDs = async (schoolId: string) => {
    try {
      const { data: schoolData } = await supabase
        .from("schools")
        .select("wifi_ssids")
        .eq("school_id", schoolId)
        .single();
      
      setWifiSSIDs(schoolData?.wifi_ssids || []);
    } catch (error) {
      console.error("Error loading WiFi SSIDs:", error);
    }
  };

  const addWifiSSID = async () => {
    if (!schoolId || !newSSID.trim()) return;
    setBusy("wifi");
    try {
      const updatedSSIDs = [...wifiSSIDs, newSSID.trim()];
      const { error } = await supabase
        .from("schools")
        .update({ wifi_ssids: updatedSSIDs })
        .eq("school_id", schoolId);
      
      if (error) throw error;
      
      setWifiSSIDs(updatedSSIDs);
      setNewSSID("");
      alert("WiFi SSID added successfully");
    } catch (error) {
      console.error("Error adding WiFi SSID:", error);
      alert("Error adding WiFi SSID");
    } finally {
      setBusy(null);
    }
  };

  const removeWifiSSID = async (ssidToRemove: string) => {
    if (!schoolId) return;
    setBusy("wifi");
    try {
      const updatedSSIDs = wifiSSIDs.filter(ssid => ssid !== ssidToRemove);
      const { error } = await supabase
        .from("schools")
        .update({ wifi_ssids: updatedSSIDs })
        .eq("school_id", schoolId);
      
      if (error) throw error;
      
      setWifiSSIDs(updatedSSIDs);
      alert("WiFi SSID removed successfully");
    } catch (error) {
      console.error("Error removing WiFi SSID:", error);
      alert("Error removing WiFi SSID");
    } finally {
      setBusy(null);
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

      {/* WiFi SSID Management */}
      <div className="mt-4 pt-3 border-t border-white/10">
        <div className="text-sm font-medium mb-2 text-white">WiFi SSID for Teacher Attendance</div>
        
        {/* Current WiFi SSIDs */}
        {wifiSSIDs.length > 0 && (
          <div className="mb-3">
            <div className="text-xs text-white/70 mb-2">Current WiFi Networks:</div>
            <div className="flex flex-wrap gap-2">
              {wifiSSIDs.map((ssid, index) => (
                <div key={index} className="flex items-center gap-1 px-2 py-1 rounded bg-green-500/20 border border-green-500/30">
                  <span className="text-green-300 text-xs">{ssid}</span>
                  <button
                    onClick={() => removeWifiSSID(ssid)}
                    disabled={busy === "wifi"}
                    className="text-red-400 hover:text-red-300 text-xs disabled:opacity-50"
                    title="Remove SSID"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Add new WiFi SSID */}
        <div className="flex items-center gap-2">
          <input 
            className="flex-1 rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2 text-sm" 
            placeholder="Enter WiFi network name (e.g., School-WiFi)" 
            value={newSSID} 
            onChange={(e) => setNewSSID(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addWifiSSID()}
          />
          <button 
            className="px-3 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 transition-transform hover:scale-105 text-white text-sm disabled:opacity-50" 
            disabled={busy === "wifi" || !newSSID.trim()} 
            onClick={addWifiSSID}
          >
            {busy === "wifi" ? "Adding..." : "Add"}
          </button>
      </div>

        <div className="text-xs text-white/60 mt-2">
          Teachers can only punch in/out when connected to these WiFi networks
        </div>
      </div>

      {/* creation moved to dedicated pages */}
    </div>
  );
}



