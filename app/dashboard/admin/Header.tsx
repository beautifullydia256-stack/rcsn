"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { Search, Filter } from "lucide-react";

export function AdminHeader({ onSearch, onFilter }: { onSearch: (q: string) => void; onFilter: (f: { role?: string; class?: string; status?: string }) => void; }) {
  const [adminName, setAdminName] = useState<string>("Admin");
  const [adminEmail, setAdminEmail] = useState<string>("");
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [filters, setFilters] = useState<{ role?: string; class?: string; status?: string }>({});

  useEffect(() => {
    const run = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user?.id) {
        const { data } = await supabase.from("users").select("name,email").eq("user_id", auth.user.id).single();
        if (data) {
          setAdminName(data.name || "Admin");
          setAdminEmail(data.email || "");
        }
      }
    };
    run();
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setFiltersOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="sticky top-0 z-10 backdrop-blur-md bg-white/10 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-xl font-semibold text-white">PwezaCore</div>
          <div className="hidden md:flex items-center gap-2 text-sm text-white/80">
            <span>Admin Dashboard</span>
          </div>
        </div>

        <div className="flex-1 min-w-0 max-w-xl mx-4">
          <div className="relative">
            <input
              className="w-full rounded-xl border border-white/10 bg-white/10 text-white placeholder:text-white/70 pl-10 pr-10 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search students, teachers, parents, payments, reports..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                onSearch(e.target.value);
              }}
            />
            <Search className="w-4 h-4 text-white/70 absolute left-3 top-1/2 -translate-y-1/2" />
            <button aria-label="Filters" onClick={() => setFiltersOpen((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/80 hover:text-white">
              <Filter className="w-4 h-4" />
            </button>
            {filtersOpen && (
              <div ref={menuRef} className="absolute right-0 mt-2 w-80 rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-3">
                <div className="text-xs text-white/80 mb-2">Filters</div>
                <div className="grid grid-cols-3 gap-2">
                  <select className="rounded-md bg-white/10 text-white text-xs border border-white/10 p-2" value={filters.role || ""} onChange={(e) => { const f = { ...filters, role: e.target.value || undefined }; setFilters(f); onFilter(f); }}>
                    <option value="">Role</option>
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="parent">Parent</option>
                  </select>
                  <select className="rounded-md bg-white/10 text-white text-xs border border-white/10 p-2" value={filters.class || ""} onChange={(e) => { const f = { ...filters, class: e.target.value || undefined }; setFilters(f); onFilter(f); }}>
                    <option value="">Class</option>
                    {Array.from({ length: 7 }).map((_, i) => (
                      <option key={i} value={`Primary ${i + 1}`}>{`Primary ${i + 1}`}</option>
                    ))}
                    {Array.from({ length: 6 }).map((_, i) => (
                      <option key={`S-${i}`} value={`Senior ${i + 1}`}>{`Senior ${i + 1}`}</option>
                    ))}
                  </select>
                  <select className="rounded-md bg-white/10 text-white text-xs border border-white/10 p-2" value={filters.status || ""} onChange={(e) => { const f = { ...filters, status: e.target.value || undefined }; setFilters(f); onFilter(f); }}>
                    <option value="">Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="relative flex items-center gap-3 shrink-0" ref={menuRef}>
          <div className="text-right">
            <div className="text-sm text-white/80">Welcome</div>
            <div className="text-sm font-medium text-white">{adminName}</div>
          </div>
          <button onClick={() => setMenuOpen((v) => !v)} className="w-9 h-9 rounded-full bg-blue-500/30 border border-blue-300/30 backdrop-blur flex items-center justify-center text-white text-sm font-semibold hover:scale-105 transition-transform">
            {adminName?.charAt(0) || "A"}
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-44 rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 overflow-hidden">
              <div className="px-3 py-2 text-xs text-white/70">{adminEmail}</div>
              <button className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors" onClick={handleLogout}>Logout</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



