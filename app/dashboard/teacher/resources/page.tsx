'use client';

import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import GlassBackground from '../components/GlassBackground';
import { motion } from 'framer-motion';
import { Book, Upload, File, Folder } from 'lucide-react';

export default function ResourcesPage() {
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
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Book className="w-8 h-8 text-blue-400" />
                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                  Resources
                </h1>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg transition-colors">
                <Upload className="w-5 h-5" />
                Upload Resource
              </button>
            </div>
            <p className="text-white/70">
              Access and manage teaching resources
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 hover:shadow-xl transition-shadow text-white"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <File className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">
                      Resource {item}
                    </h3>
                    <p className="text-sm text-white/70 mb-2">
                      Teaching material
                    </p>
                    <div className="flex items-center gap-2 text-xs text-white/60">
                      <Folder className="w-4 h-4" />
                      <span>Category</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

