import React from "react";
import clsx from "clsx";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export default function GlassCard({ children, className, hover }: GlassCardProps) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-lg",
        hover && "transition-all duration-300 hover:bg-white/20 hover:border-white/30",
        className
      )}
    >
      {children}
    </div>
  );
}

