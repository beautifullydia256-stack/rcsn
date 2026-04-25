/**
 * Owner Authentication and Authorization Middleware
 * Provides secure authentication, session management, rate limiting, and audit logging
 * for owner dashboard endpoints.
 */

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

// Types for middleware
export interface OwnerAuthRequest {
  method?: string;
  headers?: { 
    cookie?: string; 
    authorization?: string;
    'user-agent'?: string;
    'x-forwarded-for'?: string;
  };
  body?: string | Record<string, unknown>;
  url?: string;
  ip?: string;
}

export interface OwnerAuthResponse {
  setHeader: (key: string, value: string | number) => void;
  status: (code: number) => OwnerAuthResponse;
  json: (data: unknown) => void;
  end: (body?: string) => void;
}

export interface OwnerUser {
  id: string;
  email: string;
  role: string;
  school_id?: string;
  name?: string;
}

export interface SessionData {
  userId: string;
  email: string;
  role: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivity: Date;
  ipAddress: string;
  userAgent: string;
}

export interface AuditLogEntry {
  userId: string;
  action: string;
  resource: string;
  details?: Record<string, any>;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  sessionId?: string;
}

// Configuration
const SESSION_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
const SESSION_RENEWAL_THRESHOLD = 30 * 60 * 1000; // 30 minutes in milliseconds
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes in milliseconds
const RATE_LIMIT_MAX_REQUESTS = 1000; // requests per window
const MAX_CONCURRENT_SESSIONS = 3;

// In-memory stores (in production, use Redis)
const sessionStore = new Map<string, SessionData>();
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Utility functions
 */
function getCookieString(req: OwnerAuthRequest): string | undefined {
  const headers = req.headers;
  if (!headers) return undefined;
  return headers.cookie;
}

function parseCookies(cookieHeader: string | undefined): (name: string) => string | undefined {
  const map = new Map<string, string>();
  if (cookieHeader) {
    for (const part of cookieHeader.split(';')) {
      const [key, ...v] = part.trim().split('=');
      if (key) {
        map.set(key.trim(), decodeURIComponent((v.join('=') || '').trim()));
      }
    }
  }
  return (name: string) => map.get(name);
}

function getClientIP(req: OwnerAuthRequest): string {
  return req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || 
         req.ip || 
         '127.0.0.1';
}

function getUserAgent(req: OwnerAuthRequest): string {
  return req.headers?.['user-agent'] || 'Unknown';
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Session Management
 */
export class SessionManager {
  static createSession(user: OwnerUser, ipAddress: string, userAgent: string): string {
    const sessionId = generateSessionId();
    const now = new Date();
    
    const sessionData: SessionData = {
      userId: user.id,
      email: user.email,
      role: user.role,
      createdAt: now,
      expiresAt: new Date(now.getTime() + SESSION_TIMEOUT),
      lastActivity: now,
      ipAddress,
      userAgent
    };

    // Clean up old sessions for this user (keep only MAX_CONCURRENT_SESSIONS)
    this.cleanupUserSessions(user.id);
    
    sessionStore.set(sessionId, sessionData);
    return sessionId;
  }

  static validateSession(sessionId: string): SessionData | null {
    const session = sessionStore.get(sessionId);
    if (!session) return null;

    const now = new Date();
    if (session.expiresAt < now) {
      sessionStore.delete(sessionId);
      return null;
    }

    return session;
  }

  static renewSession(sessionId: string): boolean {
    const session = sessionStore.get(sessionId);
    if (!session) return false;

    const now = new Date();
    const timeUntilExpiry = session.expiresAt.getTime() - now.getTime();
    
    // Only renew if within renewal threshold
    if (timeUntilExpiry <= SESSION_RENEWAL_THRESHOLD) {
      session.expiresAt = new Date(now.getTime() + SESSION_TIMEOUT);
      session.lastActivity = now;
      sessionStore.set(sessionId, session);
      return true;
    }

    // Update last activity
    session.lastActivity = now;
    sessionStore.set(sessionId, session);
    return false;
  }

  static destroySession(sessionId: string): void {
    sessionStore.delete(sessionId);
  }

  static cleanupUserSessions(userId: string): void {
    const userSessions = Array.from(sessionStore.entries())
      .filter(([_, session]) => session.userId === userId)
      .sort(([_, a], [__, b]) => b.lastActivity.getTime() - a.lastActivity.getTime());

    // Keep only the most recent sessions
    if (userSessions.length >= MAX_CONCURRENT_SESSIONS) {
      const sessionsToRemove = userSessions.slice(MAX_CONCURRENT_SESSIONS - 1);
      sessionsToRemove.forEach(([sessionId]) => {
        sessionStore.delete(sessionId);
      });
    }
  }

  static cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [sessionId, session] of sessionStore.entries()) {
      if (session.expiresAt < now) {
        sessionStore.delete(sessionId);
      }
    }
  }
}

/**
 * Rate Limiting
 */
export class RateLimiter {
  static checkRateLimit(identifier: string): { allowed: boolean; resetTime?: number; remaining?: number } {
    const now = Date.now();
    const key = `rate_limit_${identifier}`;
    const current = rateLimitStore.get(key);

    if (!current || current.resetTime <= now) {
      // Reset or create new window
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + RATE_LIMIT_WINDOW
      });
      return { 
        allowed: true, 
        resetTime: now + RATE_LIMIT_WINDOW,
        remaining: RATE_LIMIT_MAX_REQUESTS - 1
      };
    }

    if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
      return { 
        allowed: false, 
        resetTime: current.resetTime,
        remaining: 0
      };
    }

    current.count++;
    rateLimitStore.set(key, current);
    
    return { 
      allowed: true, 
      resetTime: current.resetTime,
      remaining: RATE_LIMIT_MAX_REQUESTS - current.count
    };
  }

  static cleanupExpiredLimits(): void {
    const now = Date.now();
    for (const [key, data] of rateLimitStore.entries()) {
      if (data.resetTime <= now) {
        rateLimitStore.delete(key);
      }
    }
  }
}

/**
 * Audit Logger
 */
export class AuditLogger {
  static async log(entry: AuditLogEntry): Promise<void> {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing Supabase configuration for audit logging');
        return;
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      await supabase.from('audit_logs').insert({
        user_id: entry.userId,
        action: entry.action,
        resource: entry.resource,
        details: entry.details || {},
        timestamp: entry.timestamp.toISOString(),
        ip_address: entry.ipAddress,
        user_agent: entry.userAgent,
        success: entry.success,
        session_id: entry.sessionId
      });
    } catch (error) {
      console.error('Failed to log audit entry:', error);
      // Don't throw - audit logging failure shouldn't break the request
    }
  }

  static async logOwnerAction(
    userId: string,
    action: string,
    resource: string,
    details: Record<string, any>,
    ipAddress: string,
    userAgent: string,
    success: boolean = true,
    sessionId?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: `owner:${action}`,
      resource,
      details,
      timestamp: new Date(),
      ipAddress,
      userAgent,
      success,
      sessionId
    });
  }
}

/**
 * Main Authentication Middleware
 */
export async function validateOwnerAuth(req: OwnerAuthRequest): Promise<{
  user: OwnerUser;
  sessionId: string;
  session: SessionData;
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnon) {
    throw new Error('Missing Supabase configuration');
  }

  // Try session-based auth first
  const cookieStr = getCookieString(req);
  const getCookie = parseCookies(cookieStr);
  const sessionId = getCookie('owner_session');

  if (sessionId) {
    const session = SessionManager.validateSession(sessionId);
    if (session && session.role === 'owner') {
      // Renew session if needed
      SessionManager.renewSession(sessionId);
      
      return {
        user: {
          id: session.userId,
          email: session.email,
          role: session.role
        },
        sessionId,
        session
      };
    }
  }

  // Fall back to token-based auth
  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      get(name: string) { return getCookie(name) ?? undefined; },
      set() {},
      remove() {},
    },
  });

  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser) {
    throw new Error('Authentication required');
  }

  // Verify owner role in database
  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('user_id, email, role, school_id, name')
    .eq('user_id', authUser.id)
    .single();

  if (userError || !userRow || userRow.role !== 'owner') {
    throw new Error('Owner access required');
  }

  // Create new session
  const ipAddress = getClientIP(req);
  const userAgent = getUserAgent(req);
  const newSessionId = SessionManager.createSession(userRow, ipAddress, userAgent);
  const newSession = SessionManager.validateSession(newSessionId)!;

  return {
    user: userRow,
    sessionId: newSessionId,
    session: newSession
  };
}

/**
 * Complete Owner Auth Middleware
 */
export async function ownerAuthMiddleware(
  req: OwnerAuthRequest,
  res: OwnerAuthResponse
): Promise<{
  user: OwnerUser;
  sessionId: string;
  session: SessionData;
} | null> {
  const ipAddress = getClientIP(req);
  const userAgent = getUserAgent(req);

  try {
    // Rate limiting check
    const rateLimitKey = `owner:${ipAddress}`;
    const rateLimit = RateLimiter.checkRateLimit(rateLimitKey);
    
    if (!rateLimit.allowed) {
      res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimit.resetTime! / 1000));
      res.setHeader('Retry-After', Math.ceil((rateLimit.resetTime! - Date.now()) / 1000));
      
      res.status(429).json({
        error: 'Too many requests',
        message: 'Rate limit exceeded for owner endpoints',
        retryAfter: Math.ceil((rateLimit.resetTime! - Date.now()) / 1000)
      });
      return null;
    }

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS);
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining || 0);
    res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimit.resetTime! / 1000));

    // Authentication check
    const authResult = await validateOwnerAuth(req);
    
    // Log successful access
    await AuditLogger.logOwnerAction(
      authResult.user.id,
      'dashboard_access',
      req.url || 'unknown',
      { method: req.method },
      ipAddress,
      userAgent,
      true,
      authResult.sessionId
    );

    // Set session cookie if new session was created
    if (authResult.sessionId) {
      const cookieOptions = [
        `owner_session=${authResult.sessionId}`,
        'HttpOnly',
        'Secure',
        'SameSite=Strict',
        `Max-Age=${SESSION_TIMEOUT / 1000}`,
        'Path=/'
      ].join('; ');
      
      res.setHeader('Set-Cookie', cookieOptions);
    }

    return authResult;

  } catch (error) {
    // Log failed access attempt
    try {
      await AuditLogger.log({
        userId: 'unknown',
        action: 'owner:access_denied',
        resource: req.url || 'unknown',
        details: { 
          method: req.method,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date(),
        ipAddress,
        userAgent,
        success: false
      });
    } catch (logError) {
      console.error('Failed to log access denial:', logError);
    }

    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        res.status(401).json({ error: 'Authentication required' });
      } else if (error.message === 'Owner access required') {
        res.status(403).json({ error: 'Owner access required' });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
    
    return null;
  }
}

/**
 * Cleanup function to be called periodically
 */
export function cleanupMiddleware(): void {
  SessionManager.cleanupExpiredSessions();
  RateLimiter.cleanupExpiredLimits();
}

// Set up periodic cleanup (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupMiddleware, 5 * 60 * 1000);
}