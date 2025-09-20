"use client";

import { useEffect, useRef, useState } from "react";
import { supabase, User } from "@/src/lib/supabase";
import { Search } from "lucide-react";

export function OwnerHeader({
  onSearch,
}: {
  onSearch: (q: string) => void;
}) {
  const [owner, setOwner] = useState<User | null>(null);
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) return;
      const { data } = await supabase.from("users").select("*").eq("user_id", userId).single();
      if (data) setOwner(data as unknown as User);
    };
    load();
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="sticky top-0 z-10 backdrop-blur-md bg-white/10 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="text-xl font-semibold text-white">PwezaCore</div>
          <div className="hidden md:flex items-center gap-2 text-sm text-gray-200">
            <span>Owner Dashboard</span>
          </div>
        </div>

        <div className="flex-1 max-w-2xl mx-4">
          <div className="relative">
            <input
              className="w-full rounded-xl border border-white/10 bg-white/10 text-white placeholder:text-white/70 pl-10 pr-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search schools, users, transactions, jobs, library..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                onSearch(e.target.value);
              }}
            />
            <Search className="w-4 h-4 text-white/70 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div className="flex items-center gap-3" ref={menuRef}>
          <div className="text-right">
            <div className="text-sm text-white/80">Welcome</div>
            <div className="text-sm font-medium text-white">{owner?.name ?? "Owner"}</div>
          </div>
          <button
            aria-label="Account menu"
            onClick={() => setMenuOpen((v) => !v)}
            className="w-9 h-9 rounded-full bg-blue-500/30 border border-blue-300/30 backdrop-blur flex items-center justify-center text-white text-sm font-semibold hover:scale-105 transition-transform"
          >
            {owner?.name ? owner.name.charAt(0) : "O"}
          </button>
          {menuOpen && (
            <div className="absolute right-4 top-14 w-44 rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 overflow-hidden">
              <div className="px-3 py-2 text-xs text-white/70">{owner?.email ?? ""}</div>
              <button
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



