/**
 * Next.js API Route Middleware Wrapper for Owner Authentication
 * Provides easy integration with Next.js API routes
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { ownerAuthMiddleware, OwnerUser, SessionData } from './ownerAuth';

export interface OwnerApiRequest extends NextApiRequest {
  owner?: {
    user: OwnerUser;
    sessionId: string;
    session: SessionData;
  };
}

export type OwnerApiHandler = (
  req: OwnerApiRequest,
  res: NextApiResponse
) => Promise<void> | void;

/**
 * Middleware wrapper for Next.js API routes that require owner authentication
 */
export function withOwnerAuth(handler: OwnerApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Set CORS headers for owner dashboard
    const origin = process.env.CORS_ORIGIN || 'https://www.pwezacore.com';
    const corsHeaders = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    };

    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    try {
      // Convert NextApiRequest to our middleware format
      const middlewareReq = {
        method: req.method,
        headers: {
          cookie: req.headers.cookie,
          authorization: req.headers.authorization as string,
          'user-agent': req.headers['user-agent'],
          'x-forwarded-for': req.headers['x-forwarded-for'] as string,
        },
        body: req.body,
        url: req.url,
        ip: req.socket.remoteAddress,
      };

      const middlewareRes = {
        setHeader: (key: string, value: string | number) => res.setHeader(key, value),
        status: (code: number) => res.status(code),
        json: (data: unknown) => res.json(data),
        end: (body?: string) => res.end(body),
      };

      // Run owner authentication middleware
      const authResult = await ownerAuthMiddleware(middlewareReq, middlewareRes);
      
      if (!authResult) {
        // Authentication failed, response already sent by middleware
        return;
      }

      // Attach owner info to request
      (req as OwnerApiRequest).owner = authResult;

      // Call the actual handler
      await handler(req as OwnerApiRequest, res);

    } catch (error) {
      console.error('Owner middleware error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'An unexpected error occurred'
      });
    }
  };
}

/**
 * Utility function to get owner info from request
 */
export function getOwnerFromRequest(req: OwnerApiRequest): {
  user: OwnerUser;
  sessionId: string;
  session: SessionData;
} | null {
  return req.owner || null;
}

/**
 * Type guard to check if request has owner authentication
 */
export function isOwnerAuthenticated(req: NextApiRequest): req is OwnerApiRequest & { owner: NonNullable<OwnerApiRequest['owner']> } {
  return 'owner' in req && req.owner !== undefined;
}