/**
 * Enhanced Owner Middleware with Complete Security Features
 * Integrates authentication, authorization, rate limiting, CSRF protection,
 * input sanitization, audit logging, and security headers
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { 
  ownerAuthMiddleware, 
  OwnerUser, 
  SessionData, 
  AuditLogger 
} from './ownerAuth';
import {
  InputSanitizer,
  CSRFProtection,
  DataMasker,
  SecurityHeaders,
  RequestValidator,
  ErrorSanitizer
} from './ownerSecurity';

export interface SecureOwnerApiRequest extends NextApiRequest {
  owner?: {
    user: OwnerUser;
    sessionId: string;
    session: SessionData;
  };
  sanitizedBody?: any;
  csrfToken?: string;
}

export type SecureOwnerApiHandler = (
  req: SecureOwnerApiRequest,
  res: NextApiResponse
) => Promise<void> | void;

export interface MiddlewareOptions {
  requireCSRF?: boolean;
  maxRequestSize?: number;
  allowedMethods?: string[];
  allowedContentTypes?: string[];
  sanitizeInput?: boolean;
  maskSensitiveData?: boolean;
  auditAction?: string;
}

const DEFAULT_OPTIONS: MiddlewareOptions = {
  requireCSRF: true,
  maxRequestSize: 1024 * 1024, // 1MB
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedContentTypes: ['application/json', 'text/plain'],
  sanitizeInput: true,
  maskSensitiveData: true,
  auditAction: 'api_access'
};

/**
 * Enhanced middleware wrapper with complete security features
 */
export function withSecureOwnerAuth(
  handler: SecureOwnerApiHandler,
  options: MiddlewareOptions = {}
) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  return async (req: NextApiRequest, res: NextApiResponse) => {
    const startTime = Date.now();
    let auditSuccess = true;
    let auditDetails: Record<string, any> = {};

    try {
      // Apply security headers
      SecurityHeaders.applySecurity((key, value) => res.setHeader(key, value));

      // Set CORS headers
      const origin = process.env.CORS_ORIGIN || 'https://www.pwezacore.com';
      const corsHeaders = {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': config.allowedMethods!.join(', '),
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
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

      // Validate request method
      if (!RequestValidator.validateMethod(req.method!, config.allowedMethods!)) {
        auditSuccess = false;
        auditDetails.error = 'Invalid method';
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      // Validate content type for non-GET requests
      if (req.method !== 'GET' && req.body) {
        const contentType = req.headers['content-type'];
        if (!RequestValidator.validateContentType(contentType, config.allowedContentTypes!)) {
          auditSuccess = false;
          auditDetails.error = 'Invalid content type';
          res.status(400).json({ error: 'Invalid content type' });
          return;
        }
      }

      // Validate request size
      if (!RequestValidator.validateRequestSize(req.body, config.maxRequestSize!)) {
        auditSuccess = false;
        auditDetails.error = 'Request too large';
        res.status(413).json({ error: 'Request entity too large' });
        return;
      }

      // Convert NextApiRequest to middleware format
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
        auditSuccess = false;
        auditDetails.error = 'Authentication failed';
        return;
      }

      // Attach owner info to request
      (req as SecureOwnerApiRequest).owner = authResult;

      // CSRF Protection for state-changing operations
      if (config.requireCSRF && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method!)) {
        const csrfToken = req.headers['x-csrf-token'] as string;
        
        if (!csrfToken) {
          auditSuccess = false;
          auditDetails.error = 'Missing CSRF token';
          res.status(400).json({ error: 'CSRF token required' });
          return;
        }

        if (!CSRFProtection.validateToken(csrfToken, authResult.sessionId)) {
          auditSuccess = false;
          auditDetails.error = 'Invalid CSRF token';
          res.status(403).json({ error: 'Invalid CSRF token' });
          return;
        }

        (req as SecureOwnerApiRequest).csrfToken = csrfToken;
      }

      // Input sanitization
      if (config.sanitizeInput && req.body) {
        (req as SecureOwnerApiRequest).sanitizedBody = InputSanitizer.sanitizeObject(req.body);
        auditDetails.inputSanitized = true;
      }

      // Add audit details
      auditDetails = {
        ...auditDetails,
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
        contentLength: req.headers['content-length'],
        processingTime: Date.now() - startTime
      };

      // Call the actual handler
      await handler(req as SecureOwnerApiRequest, res);

      // Log successful request
      await AuditLogger.logOwnerAction(
        authResult.user.id,
        config.auditAction!,
        req.url || 'unknown',
        auditDetails,
        middlewareReq.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
        middlewareReq.ip || '127.0.0.1',
        middlewareReq.headers['user-agent'] || 'Unknown',
        true,
        authResult.sessionId
      );

    } catch (error) {
      auditSuccess = false;
      auditDetails.error = error instanceof Error ? error.message : 'Unknown error';
      auditDetails.processingTime = Date.now() - startTime;

      // Log failed request if we have auth info
      const authInfo = (req as SecureOwnerApiRequest).owner;
      if (authInfo) {
        await AuditLogger.logOwnerAction(
          authInfo.user.id,
          config.auditAction!,
          req.url || 'unknown',
          auditDetails,
          req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || 
          req.socket.remoteAddress || '127.0.0.1',
          req.headers['user-agent'] || 'Unknown',
          false,
          authInfo.sessionId
        );
      }

      console.error('Secure owner middleware error:', error);
      
      // Sanitize error response
      const sanitizedError = ErrorSanitizer.sanitizeError(error);
      res.status(500).json(sanitizedError);
    }
  };
}

/**
 * Utility to generate CSRF token for forms
 */
export function generateCSRFToken(sessionId: string): string {
  return CSRFProtection.generateToken(sessionId);
}

/**
 * Utility to get sanitized body from request
 */
export function getSanitizedBody(req: SecureOwnerApiRequest): any {
  return req.sanitizedBody || req.body;
}

/**
 * Utility to mask sensitive data in responses
 */
export function maskResponseData(data: any): any {
  return DataMasker.maskSensitiveData(data);
}

/**
 * Middleware for endpoints that only read data (lighter security)
 */
export function withOwnerReadAuth(handler: SecureOwnerApiHandler) {
  return withSecureOwnerAuth(handler, {
    requireCSRF: false,
    allowedMethods: ['GET'],
    auditAction: 'read_access'
  });
}

/**
 * Middleware for endpoints that modify data (full security)
 */
export function withOwnerWriteAuth(handler: SecureOwnerApiHandler) {
  return withSecureOwnerAuth(handler, {
    requireCSRF: true,
    allowedMethods: ['POST', 'PUT', 'DELETE', 'PATCH'],
    auditAction: 'write_access'
  });
}

/**
 * Middleware for system administration endpoints (maximum security)
 */
export function withOwnerAdminAuth(handler: SecureOwnerApiHandler) {
  return withSecureOwnerAuth(handler, {
    requireCSRF: true,
    maxRequestSize: 512 * 1024, // 512KB limit for admin operations
    allowedMethods: ['POST', 'PUT', 'DELETE'],
    auditAction: 'admin_access'
  });
}

/**
 * Health check endpoint (no auth required)
 */
export function createOwnerHealthCheck() {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    SecurityHeaders.applySecurity((key, value) => res.setHeader(key, value));
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'owner-dashboard-api'
    });
  };
}