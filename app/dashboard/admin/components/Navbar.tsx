'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Bell, Settings, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/src/lib/supabase';

interface NavbarProps {
  onSearch?: (query: string) => void;
  searchQuery?: string;
  showSearchResults?: boolean;
  onCloseSearch?: () => void;
}

export default function AdminNavbar({
  onSearch,
  searchQuery: externalSearchQuery,
  showSearchResults,
  onCloseSearch,
}: NavbarProps) {
  const [searchQuery, setSearchQuery] = useState(externalSearchQuery || '');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [adminName, setAdminName] = useState('Admin');
  const [adminEmail, setAdminEmail] = useState('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const profileRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const isDashboard = pathname === '/dashboard/admin';

  useEffect(() => {
    if (externalSearchQuery !== undefined) {
      setSearchQuery(externalSearchQuery);
    }
  }, [externalSearchQuery]);

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('name, email')
          .eq('user_id', user.id)
          .single();

        if (userData) {
          setAdminName(userData.name || 'Admin');
          setAdminEmail(userData.email || '');
        }
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <nav
      className={`sticky top-0 z-20 border-b shadow-sm ${
        isDashboard ? 'bg-[#05080f]/85 border-white/10 backdrop-blur-md' : 'bg-white border-gray-200'
      }`}
    >
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Search + Filters row */}
          <div className="flex flex-1 flex-wrap items-center gap-3 max-w-4xl">
            <div className="relative flex-1 min-w-[200px]">
              <Search
                className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                  isDashboard ? 'text-white/70' : 'text-gray-400'
                }`}
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search students, fees, reports..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className={`w-full pl-10 pr-12 py-2.5 rounded-xl border ${
                  isDashboard
                    ? 'border-white/10 bg-white/5 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-green-400/30 focus:border-green-400'
                    : 'border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500'
                }`}
              />
              <span
                className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium ${
                  isDashboard ? 'text-white/50' : 'text-gray-400'
                }`}
              >
                ⌘F
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  isDashboard
                    ? 'border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-green-400/30 focus:border-green-400'
                    : 'border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500'
                }`}
              >
                <option value="">Term</option>
                <option value="1">Term 1</option>
                <option value="2">Term 2</option>
                <option value="3">Term 3</option>
              </select>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  isDashboard
                    ? 'border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-green-400/30 focus:border-green-400'
                    : 'border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500'
                }`}
              >
                <option value="">Class</option>
                <option value="P1">Primary 1</option>
                <option value="P2">Primary 2</option>
                <option value="P3">Primary 3</option>
                <option value="P4">Primary 4</option>
                <option value="P5">Primary 5</option>
                <option value="P6">Primary 6</option>
                <option value="S1">Senior 1</option>
                <option value="S2">Senior 2</option>
                <option value="S3">Senior 3</option>
                <option value="S4">Senior 4</option>
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  isDashboard
                    ? 'border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-green-400/30 focus:border-green-400'
                    : 'border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500'
                }`}
              >
                <option value="">Academic Year</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
              </select>
            </div>
          </div>

          {/* Right: Greeting + Notifications + Profile (name + email visible) */}
          <div className="flex items-center gap-3 shrink-0">
            <span
              className={`hidden sm:block text-sm ${isDashboard ? 'text-white/70' : 'text-gray-600'}`}
            >
              {greeting()},{' '}
              <span className={`font-medium ${isDashboard ? 'text-white' : 'text-gray-900'}`}>{adminName}</span>
            </span>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/dashboard/admin/notifications')}
              className={`relative p-2 rounded-lg border transition-colors ${
                isDashboard
                  ? 'border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </motion.button>

            <div className="relative" ref={profileRef}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className={`flex items-center gap-2 p-1.5 rounded-xl border transition-colors ${
                  isDashboard
                    ? 'border-white/10 bg-white/5 hover:bg-white/10'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white font-semibold text-sm">
                  {adminName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:block text-left max-w-[140px]">
                  <div className={`text-sm font-medium truncate ${isDashboard ? 'text-white' : 'text-gray-900'}`}>{adminName}</div>
                  <div className={`text-xs truncate ${isDashboard ? 'text-white/60' : 'text-gray-500'}`}>{adminEmail}</div>
                </div>
              </motion.button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className={`absolute right-0 mt-2 w-56 rounded-xl shadow-lg overflow-hidden z-50 ${
                      isDashboard
                        ? 'bg-[#05080f] border-white/10'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className={`p-4 border-b ${isDashboard ? 'border-white/10' : 'border-gray-100'}`}>
                      <div className={`font-medium ${isDashboard ? 'text-white' : 'text-gray-900'}`}>{adminName}</div>
                      <div className={`text-sm truncate ${isDashboard ? 'text-white/60' : 'text-gray-500'}`}>{adminEmail}</div>
                    </div>
                    <div className="p-1">
                      <button
                        onClick={() => {
                          router.push('/dashboard/admin/settings');
                          setIsProfileOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isDashboard ? 'text-white/80 hover:bg-white/10' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </button>
                      <button
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isDashboard ? 'text-red-200 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'
                        }`}
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
