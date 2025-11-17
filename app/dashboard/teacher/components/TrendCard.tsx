'use client';

import React from 'react';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';

interface TrendCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  gradient?: string;
  sparkline?: Array<number>;
}

export default function TrendCard({
  title,
  value,
  change,
  changeLabel,
  trend = 'neutral',
  icon,
  gradient,
  sparkline
}: TrendCardProps) {
  const isPositive = trend === 'up' || (change !== undefined && change > 0);
  const trendColor = isPositive ? '#10b981' : change !== undefined && change < 0 ? '#ef4444' : 'rgba(255, 255, 255, 0.55)';
  
  // Generate sparkline path if provided
  const sparklinePath = sparkline && sparkline.length > 0 ? (() => {
    const max = Math.max(...sparkline);
    const min = Math.min(...sparkline);
    const range = max - min || 1;
    const width = 120;
    const height = 40;
    const points = sparkline.map((val, i) => {
      const x = (i / (sparkline.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');
    return `M ${points}`;
  })() : null;

  // Extract color from gradient for blob effect
  const gradientColor = gradient ? (gradient.includes('#4dabff') ? '#4dabff' : 
    gradient.includes('#10b981') ? '#10b981' : 
    gradient.includes('#ae79ff') ? '#ae79ff' : 
    gradient.includes('#f59e0b') ? '#f59e0b' : '#6366f1') : null;

  return (
    <GlassCard 
      className="p-6 relative overflow-hidden" 
      hover
      style={{
        background: gradient || 'rgba(255, 255, 255, 0.08)',
      }}
    >
      {/* Decorative gradient overlay */}
      {gradientColor && (
        <div 
          className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20 blur-3xl"
          style={{ background: gradientColor }}
        />
      )}
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            {icon && <div style={{ color: trendColor }}>{icon}</div>}
            <h3 className="text-sm font-medium" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
              {title}
            </h3>
          </div>
          {change !== undefined && (
            <div className="flex items-center gap-1">
              {isPositive ? (
                <ArrowUpRight className="w-4 h-4" style={{ color: trendColor }} />
              ) : change < 0 ? (
                <ArrowDownRight className="w-4 h-4" style={{ color: trendColor }} />
              ) : null}
              <span 
                className="text-sm font-semibold"
                style={{ color: trendColor }}
              >
                {change > 0 ? '+' : ''}{change.toFixed(2)}%
              </span>
            </div>
          )}
        </div>

        {/* Main Value */}
        <div className="mb-4">
          <div className="text-3xl font-bold text-white mb-1">{value}</div>
          {changeLabel && (
            <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.55)' }}>
              {changeLabel}
            </div>
          )}
        </div>

        {/* Sparkline Mini Graph */}
        {sparkline && sparkline.length > 0 && (
          <div className="h-12 relative">
            <svg width="100%" height="100%" viewBox="0 0 120 40" preserveAspectRatio="none" className="overflow-visible">
              <defs>
                <linearGradient id={`gradient-${title.replace(/\s+/g, '-')}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={trendColor} stopOpacity="0.4" />
                  <stop offset="100%" stopColor={trendColor} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d={sparklinePath || ''}
                fill="none"
                stroke={trendColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={`${sparklinePath} L 120,40 L 0,40 Z`}
                fill={`url(#gradient-${title.replace(/\s+/g, '-')})`}
                opacity="0.3"
              />
            </svg>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

