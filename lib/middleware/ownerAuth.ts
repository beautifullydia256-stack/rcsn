import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit } from './rateLimit';

// Initialize Supabase client for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface OwnerSession {
  userId: string;
  email: string;
  role: string;
  sessionId: string;
  expiresAt: Date;
  lastActivity: Date;
}

interface AuditLogEntry {
  userId: string;
  action: string;
  resource: string;
  details?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
}

// Session storage (in production, use Redis or database)
const activeSessions = new Map<string, OwnerSession>();

// Rate limiter for owner endpoints (1000 requests per 15 minutes)
const ownerRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 1000,
  keyGenerator: (req: NextRequest) => {
    const userId = req.headers.get('x-user-id') || req.ip || 'anonymous';
    return `owner:${userId}`;
  },
});

/**
 * Validates owner role from database
 */
async function validateOwnerRole(userId: string): Promise<boolean> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (error || !user) {
      console.error('Owner role validation error:', error);
      return false;
    }

    return user.role === 'owner';
  } catch (error) {
    console.error('Owner role validation exception:', error);
    return false;
  }
}

/**
 * Creates or updates owner session
 */
function createOwnerSession(userId: string, email: string): OwnerSession {
  const sessionId = `owner_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 8 * 60 * 60 * 1000); // 8 hours

  const session: OwnerSession = {
    userId,
    email,
    role: 'owner',
    sessionId,
    expiresAt,
    lastActivity: now,
  };

  activeSessions.set(sessionId, session);
  return session;
}

/**
 * Validates and renews owner session
 */
function validateOwnerSession(sessionId: string): OwnerSession | null {
  const session = activeSessions.get(sessionId);
  
  if (!session) {
    return null;
  }

  const now = new Date();
  
  // Check if session expired
  if (now > session.expiresAt) {
    activeSessions.delete(sessionId);
    return null;
  }

  // Renew session if within 30 minutes of expiry
  const thirtyMinutes = 30 * 60 * 1000;
  if (session.expiresAt.getTime() - now.getTime() < thirtyMinutes) {
    session.expiresAt = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  }

  // Update last activity
  session.lastActivity = now;
  activeSessions.set(sessionId, session);

  return session;
}

/**
 * Logs owner actions for audit trail
 */
async function logOwnerAction(entry: AuditLogEntry): Promise<void> {
  try {
    // Insert into audit log table
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: entry.userId,
        action: `owner:${entry.action}`,
        resource: entry.resource,
        details: entry.details || {},
        ip_address: entry.ipAddress,
        user_agent: entry.userAgent,
        timestamp: entry.timestamp.toISOString(),
        success: entry.success,
      });

    if (error) {
      console.error('Audit log error:', error);
    }
  } catch (error) {
    console.error('Audit log exception:', error);
  }
}

/**
 * Main owner authentication middleware
 */
export async function ownerAuthMiddleware(
  request: NextRequest,
  action: string,
  resource: string
): Promise<NextResponse | null> {
  const startTime = Date.now();
  let auditSuccess = false;
  let userId = '';
  let sessionId = '';

  try {
    // Apply rate limiting
    const rateLimitResult = await ownerRateLimit(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Extract session information
    const authHeader = request.headers.get('authorization');
    const sessionCookie = request.cookies.get('owner-session')?.value;
    
    if (!authHeader && !sessionCookie) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Validate Supabase JWT token
    let supabaseUser = null;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        return NextResponse.json(
          { error: 'Invalid authentication token', code: 'INVALID_TOKEN' },
          { status: 401 }
        );
      }
      
      supabaseUser = user;
      userId = user.id;
    }

    // Validate owner role
    if (!userId || !(await validateOwnerRole(userId))) {
      await logOwnerAction({
        userId: userId || 'unknown',
        action: 'unauthorized_access_attempt',
        resource,
        ipAddress: request.ip || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date(),
        success: false,
      });

      return NextResponse.json(
        { error: 'Owner access required', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      );
    }

    // Manage owner session
    let session: OwnerSession | null = null;
    
    if (sessionCookie) {
      session = validateOwnerSession(sessionCookie);
    }
    
    if (!session && supabaseUser) {
      session = createOwnerSession(userId, supabaseUser.email || '');
      sessionId = session.sessionId;
    }

    if (!session) {
      return NextResponse.json(
        { error: 'Invalid or expired session', code: 'SESSION_EXPIRED' },
        { status: 401 }
      );
    }

    // Log successful owner action
    auditSuccess = true;
    await logOwnerAction({
      userId,
      action,
      resource,
      details: {
        method: request.method,
        url: request.url,
        sessionId: session.sessionId,
        duration: Date.now() - startTime,
      },
      ipAddress: request.ip || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date(),
      success: true,
    });

    // Add session info to request headers for downstream handlers
    const response = NextResponse.next();
    response.headers.set('x-owner-user-id', userId);
    response.headers.set('x-owner-session-id', session.sessionId);
    response.headers.set('x-owner-email', session.email);

    // Set/update session cookie
    if (sessionId) {
      response.cookies.set('owner-session', session.sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 8 * 60 * 60, // 8 hours
        path: '/api/owner',
      });
    }

    return null; // Allow request to proceed

  } catch (error) {
    console.error('Owner auth middleware error:', error);

    // Log failed action
    if (userId) {
      await logOwnerAction({
        userId,
        action: 'auth_error',
        resource,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        ipAddress: request.ip || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date(),
        success: false,
      });
    }

    return NextResponse.json(
      { error: 'Authentication error', code: 'AUTH_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * Convenience wrapper for API routes
 */
export function withOwnerAuth(
  handler: (request: NextRequest, context: any) => Promise<NextResponse>,
  action: string,
  resource: string
) {
  return async (request: NextRequest, context: any) => {
    const authResult = await ownerAuthMiddleware(request, action, resource);
    
    if (authResult) {
      return authResult; // Authentication failed
    }
    
    return handler(request, context);
  };
}

/**
 * Get current owner session info
 */
export function getOwnerSession(request: NextRequest): OwnerSession | null {
  const sessionId = request.cookies.get('owner-session')?.value;
  
  if (!sessionId) {
    return null;
  }
  
  return validateOwnerSession(sessionId);
}

/**
 * Cleanup expired sessions (call periodically)
 */
export function cleanupExpiredSessions(): void {
  const now = new Date();
  
  for (const [sessionId, session] of activeSessions.entries()) {
    if (now > session.expiresAt) {
      activeSessions.delete(sessionId);
    }
  }
}

// Cleanup expired sessions every hour
if (typeof window === 'undefined') {
  setInterval(cleanupExpiredSessions, 60 * 60 * 1000);
}

export type { OwnerSession, AuditLogEntry };