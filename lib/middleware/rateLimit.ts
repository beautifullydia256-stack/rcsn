import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator: (req: NextRequest) => string; // Function to generate rate limit key
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  message?: string; // Custom error message
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Rate limiting middleware
 */
export function rateLimit(config: RateLimitConfig) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const key = config.keyGenerator(request);
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Clean up expired entries
    cleanupExpiredEntries(windowStart);

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);
    
    if (!entry || entry.resetTime <= now) {
      // Create new entry or reset expired entry
      entry = {
        count: 1,
        resetTime: now + config.windowMs,
        firstRequest: now,
      };
      rateLimitStore.set(key, entry);
    } else {
      // Increment existing entry
      entry.count++;
      rateLimitStore.set(key, entry);
    }

    // Check if limit exceeded
    if (entry.count > config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      
      return NextResponse.json(
        {
          error: config.message || 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter,
          limit: config.maxRequests,
          remaining: 0,
          resetTime: entry.resetTime,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': entry.resetTime.toString(),
            'Retry-After': retryAfter.toString(),
          },
        }
      );
    }

    // Add rate limit headers to successful responses
    const remaining = Math.max(0, config.maxRequests - entry.count);
    
    // Return null to allow request to proceed, but we'll add headers in the actual response
    return null;
  };
}

/**
 * Clean up expired rate limit entries
 */
function cleanupExpiredEntries(windowStart: number): void {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime <= windowStart) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Get rate limit status for a key
 */
export function getRateLimitStatus(key: string, config: RateLimitConfig): {
  limit: number;
  remaining: number;
  resetTime: number;
  exceeded: boolean;
} {
  const entry = rateLimitStore.get(key);
  const now = Date.now();

  if (!entry || entry.resetTime <= now) {
    return {
      limit: config.maxRequests,
      remaining: config.maxRequests,
      resetTime: now + config.windowMs,
      exceeded: false,
    };
  }

  const remaining = Math.max(0, config.maxRequests - entry.count);
  
  return {
    limit: config.maxRequests,
    remaining,
    resetTime: entry.resetTime,
    exceeded: entry.count > config.maxRequests,
  };
}

/**
 * Reset rate limit for a specific key
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Get all active rate limit entries (for monitoring)
 */
export function getActiveRateLimits(): Array<{
  key: string;
  count: number;
  resetTime: number;
  firstRequest: number;
}> {
  const now = Date.now();
  const active: Array<{
    key: string;
    count: number;
    resetTime: number;
    firstRequest: number;
  }> = [];

  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime > now) {
      active.push({
        key,
        count: entry.count,
        resetTime: entry.resetTime,
        firstRequest: entry.firstRequest,
      });
    }
  }

  return active;
}

// Cleanup expired entries every 5 minutes
if (typeof window === 'undefined') {
  setInterval(() => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    cleanupExpiredEntries(fiveMinutesAgo);
  }, 5 * 60 * 1000);
}

export type { RateLimitConfig, RateLimitEntry };