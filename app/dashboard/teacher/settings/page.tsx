'use client';

import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import GlassBackground from '../components/GlassBackground';
import { motion } from 'framer-motion';
import { Settings, User, Bell, Lock, Palette } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen relative">
      <GlassBackground />
      <Sidebar />
      <div className="flex-1 flex flex-col lg:ml-72 relative z-10">
        <Navbar onSearch={() => {}} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <Settings className="w-8 h-8 text-blue-400" />
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Settings
              </h1>
            </div>
            <p className="text-white/70">
              Manage your account settings and preferences
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Profile Settings */}
              <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <User className="w-5 h-5 text-blue-400" />
                  <h2 className="text-lg font-semibold text-white">
                    Profile Settings
                  </h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/60 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/60 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="your.email@example.com"
                    />
                  </div>
                </div>
              </div>

              {/* Notification Settings */}
              <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <Bell className="w-5 h-5 text-blue-400" />
                  <h2 className="text-lg font-semibold text-white">
                    Notifications
                  </h2>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-white/80">
                      Email notifications
                    </span>
                    <input type="checkbox" className="rounded accent-blue-500" defaultChecked />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-white/80">
                      Push notifications
                    </span>
                    <input type="checkbox" className="rounded accent-blue-500" defaultChecked />
                  </label>
                </div>
              </div>

              {/* Security Settings */}
              <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <Lock className="w-5 h-5 text-blue-400" />
                  <h2 className="text-lg font-semibold text-white">
                    Security
                  </h2>
                </div>
                <button className="w-full px-4 py-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg transition-colors">
                  Change Password
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-6">
              <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
                <h3 className="font-semibold text-white mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-white/10 text-sm text-white/80 transition-colors">
                    Export Data
                  </button>
                  <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-white/10 text-sm text-white/80 transition-colors">
                    Download Reports
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

