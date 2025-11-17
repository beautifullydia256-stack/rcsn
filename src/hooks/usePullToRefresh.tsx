'use client';

import { useEffect, useRef, useState } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  disabled?: boolean;
}

export function usePullToRefresh({ onRefresh, threshold = 80, disabled = false }: UsePullToRefreshOptions) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);
  const isPullingRef = useRef(false);

  useEffect(() => {
    if (disabled || typeof window === 'undefined') return;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0) return;
      
      startY.current = e.touches[0].clientY;
      currentY.current = startY.current;
      isPullingRef.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current || window.scrollY > 0) return;

      currentY.current = e.touches[0].clientY;
      const distance = Math.max(0, currentY.current - startY.current);

      if (distance > 0) {
        e.preventDefault();
        setPullDistance(distance);
        setIsPulling(distance > 10);
      }
    };

    const handleTouchEnd = async () => {
      if (!isPullingRef.current) return;

      if (pullDistance >= threshold) {
        await onRefresh();
      }

      setIsPulling(false);
      setPullDistance(0);
      isPullingRef.current = false;
      startY.current = 0;
      currentY.current = 0;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onRefresh, threshold, disabled, pullDistance]);

  return {
    isPulling,
    pullDistance,
    pullProgress: Math.min(pullDistance / threshold, 1),
  };
}

