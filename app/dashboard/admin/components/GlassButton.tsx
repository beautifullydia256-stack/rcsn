'use client';

import { ReactNode, ButtonHTMLAttributes } from 'react';

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
}

export default function GlassButton({ 
  children, 
  variant = 'primary', 
  className = '',
  ...props 
}: GlassButtonProps) {
  const baseStyles = {
    background: 'rgba(255, 255, 255, 0.12)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    borderRadius: '12px',
    transition: 'all 0.2s ease'
  };

  const variantStyles = {
    primary: {
      ...baseStyles,
      color: '#ffffff'
    },
    secondary: {
      ...baseStyles,
      background: 'rgba(255, 255, 255, 0.08)',
      color: 'rgba(255, 255, 255, 0.85)'
    },
    outline: {
      ...baseStyles,
      background: 'transparent',
      border: '1px solid rgba(255, 255, 255, 0.25)',
      color: 'rgba(255, 255, 255, 0.85)'
    }
  };

  return (
    <button
      className={`px-4 py-2.5 font-medium text-sm ${className}`}
      style={variantStyles[variant]}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = variant === 'outline' 
          ? 'rgba(255, 255, 255, 0.1)' 
          : 'rgba(255, 255, 255, 0.18)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = variantStyles[variant].background as string;
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      {...props}
    >
      {children}
    </button>
  );
}

