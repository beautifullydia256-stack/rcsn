'use client';

import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  enableHover?: boolean;
}

export default function GlassCard({ children, className = '', enableHover = false }: GlassCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-[20px] ${
        enableHover ? 'transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.35)]' : ''
      } ${className}`}
      style={{
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(25px)',
        WebkitBackdropFilter: 'blur(25px)',
        border: '1px solid rgba(255, 255, 255, 0.20)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
      }}
    >
      {children}
    </div>
  );
}

