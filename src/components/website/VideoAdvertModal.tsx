import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause } from 'lucide-react';

interface VideoAdvertModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VideoAdvertModal({ isOpen, onClose }: VideoAdvertModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
        />

        {/* Modal Video Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-4xl bg-black rounded-2xl shadow-2xl overflow-hidden z-10 border border-slate-800"
        >
          {/* Top Bar - Solid Slate */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 border-b border-slate-800 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                <img
                  src="/images/rcsn/logo.png"
                  alt="RCSN Crest"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white tracking-tight">
                  Rakai Community School of Nursing
                </h4>
                <p className="text-xs text-emerald-400">
                  School Video
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Video Player */}
          <div className="relative aspect-video w-full bg-black">
            <video
              ref={videoRef}
              src="/videos/rcsn/school-advert.mp4"
              autoPlay
              playsInline
              controls
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              className="w-full h-full object-contain"
            />
          </div>

          {/* Bottom Bar Info */}
          <div className="px-5 py-3 bg-slate-950 flex justify-between items-center text-xs text-slate-400">
            <span>Rakai District, Uganda</span>
            <span className="text-emerald-400 font-semibold">
              Quality Health Care Training
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
