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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-transparent">
        {/* Backdrop - Zero blur, completely crisp background */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-transparent"
        />

        {/* Modal Video Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-4xl bg-slate-950/45 dark:bg-black/55 backdrop-blur-md backdrop-saturate-[150%] rounded-[28px] shadow-2xl overflow-hidden z-10 border border-white/30 text-white"
        >
          {/* Specular highlights & ambient glow */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none z-20" />
          <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none z-20" />

          {/* Top Bar - Liquid Glass */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-black/25 border-b border-white/10 text-white relative z-10">
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
                <p className="text-xs text-emerald-400 font-semibold">
                  School Video & Campus Presentation
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Video Player */}
          <div className="relative aspect-video w-full bg-black/80">
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
          <div className="px-5 py-3 bg-black/25 border-t border-white/10 flex justify-between items-center text-xs text-white/70 relative z-10">
            <span>Rakai District, Uganda</span>
            <span className="text-emerald-400 font-bold">
              Quality Health Care Training
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
