/**
 * Security utilities for owner dashboard
 * Provides input sanitization, CSRF protection, and data masking
 */

import { createHash, randomBytes } from 'crypto';

/**
 * Input Sanitization
 */
export class InputSanitizer {
  // Basic HTML/XSS sanitization (simple version - in production use DOMPurify)
  static sanitizeHtml(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .replace(/&/g, '&amp;');
  }

  // Sanitize text input
  static sanitizeText(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .trim()
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .substring(0, 1000); // Limit length
  }

  // Validate email format
  static validateEmail(email: string): boolean {
    if (typeof email !== 'string') return false;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  // Validate URL format
  static validateUrl(url: string): boolean {
    if (typeof url !== 'string') return false;
    
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  // Sanitize object recursively
  static sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    
    if (typeof obj === 'string') {
      return this.sanitizeText(obj);
    }
    
    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }
    
    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = this.sanitizeText(key);
        sanitized[sanitizedKey] = this.sanitizeObject(value);
      }
      return sanitized;
    }
    
    return obj;
  }
}

/**
 * CSRF Protection
 */
export class CSRFProtection {
  private static readonly SECRET = process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production';
  
  // Generate CSRF token
  static generateToken(sessionId: string): string {
    const timestamp = Date.now().toString();
    const nonce = randomBytes(16).toString('hex');
    const payload = `${sessionId}:${timestamp}:${nonce}`;
    
    const hash = createHash('sha256')
      .update(payload + this.SECRET)
      .digest('hex');
    
    return Buffer.from(`${payload}:${hash}`).toString('base64');
  }

  // Validate CSRF token
  static validateToken(token: string, sessionId: string): boolean {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf8');
      const parts = decoded.split(':');
      
      if (parts.length !== 4) return false;
      
      const [tokenSessionId, timestamp, nonce, hash] = parts;
      
      // Check session ID matches
      if (tokenSessionId !== sessionId) return false;
      
      // Check token age (max 1 hour)
      const tokenTime = parseInt(timestamp);
      const now = Date.now();
      if (now - tokenTime > 60 * 60 * 1000) return false;
      
      // Verify hash
      const payload = `${tokenSessionId}:${timestamp}:${nonce}`;
      const expectedHash = createHash('sha256')
        .update(payload + this.SECRET)
        .digest('hex');
      
      return hash === expectedHash;
      
    } catch {
      return false;
    }
  }
}

/**
 * Data Masking
 */
export class DataMasker {
  // Mask sensitive strings
  static maskString(value: string, visibleChars: number = 4): string {
    if (typeof value !== 'string' || value.length <= visibleChars) {
      return '*'.repeat(8);
    }
    
    const visible = value.substring(0, visibleChars);
    const masked = '*'.repeat(Math.max(4, value.length - visibleChars));
    return visible + masked;
  }

  // Mask email addresses
  static maskEmail(email: string): string {
    if (typeof email !== 'string' || !email.includes('@')) {
      return '****@****.***';
    }
    
    const [local, domain] = email.split('@');
    const maskedLocal = local.length > 2 
      ? local.substring(0, 2) + '*'.repeat(local.length - 2)
      : '**';
    
    const domainParts = domain.split('.');
    const maskedDomain = domainParts.map((part, index) => {
      if (index === domainParts.length - 1) return part; // Keep TLD
      return part.length > 2 
        ? part.substring(0, 1) + '*'.repeat(part.length - 1)
        : '*'.repeat(part.length);
    }).join('.');
    
    return `${maskedLocal}@${maskedDomain}`;
  }

  // Mask API keys
  static maskApiKey(apiKey: string): string {
    if (typeof apiKey !== 'string') return '****';
    
    if (apiKey.length <= 8) return '*'.repeat(8);
    
    const prefix = apiKey.substring(0, 4);
    const suffix = apiKey.substring(apiKey.length - 4);
    const middle = '*'.repeat(Math.max(4, apiKey.length - 8));
    
    return `${prefix}${middle}${suffix}`;
  }

  // Mask object properties recursively
  static maskSensitiveData(obj: any, sensitiveFields: string[] = [
    'password', 'token', 'secret', 'key', 'api_key', 'apiKey',
    'private_key', 'privateKey', 'auth_token', 'authToken'
  ]): any {
    if (obj === null || obj === undefined) return obj;
    
    if (typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.maskSensitiveData(item, sensitiveFields));
    }
    
    const masked: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveFields.some(field => 
        lowerKey.includes(field.toLowerCase())
      );
      
      if (isSensitive && typeof value === 'string') {
        if (lowerKey.includes('email')) {
          masked[key] = this.maskEmail(value);
        } else if (lowerKey.includes('key') || lowerKey.includes('token')) {
          masked[key] = this.maskApiKey(value);
        } else {
          masked[key] = this.maskString(value);
        }
      } else if (typeof value === 'object') {
        masked[key] = this.maskSensitiveData(value, sensitiveFields);
      } else {
        masked[key] = value;
      }
    }
    
    return masked;
  }
}

/**
 * Security Headers
 */
export class SecurityHeaders {
  static getSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self'",
        "connect-src 'self' https://api.supabase.co wss://api.supabase.co",
        "frame-ancestors 'none'"
      ].join('; '),
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    };
  }

  static applySecurity(setHeader: (key: string, value: string) => void): void {
    const headers = this.getSecurityHeaders();
    Object.entries(headers).forEach(([key, value]) => {
      setHeader(key, value);
    });
  }
}

/**
 * Request Validation
 */
export class RequestValidator {
  // Validate request size
  static validateRequestSize(body: any, maxSizeBytes: number = 1024 * 1024): boolean {
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    return Buffer.byteLength(bodyStr, 'utf8') <= maxSizeBytes;
  }

  // Validate request method
  static validateMethod(method: string, allowedMethods: string[]): boolean {
    return allowedMethods.includes(method.toUpperCase());
  }

  // Validate content type
  static validateContentType(contentType: string | undefined, allowedTypes: string[]): boolean {
    if (!contentType) return false;
    return allowedTypes.some(type => contentType.toLowerCase().includes(type.toLowerCase()));
  }
}

/**
 * Error Response Sanitizer
 */
export class ErrorSanitizer {
  // Sanitize error messages to prevent information disclosure
  static sanitizeError(error: any): { message: string; code?: string } {
    if (!error) {
      return { message: 'An unknown error occurred' };
    }

    // Default safe message
    let message = 'An internal error occurred';
    let code: string | undefined;

    if (typeof error === 'string') {
      // Don't expose raw error strings
      message = 'An error occurred while processing your request';
    } else if (error instanceof Error) {
      // Only expose safe error messages
      const safeMessages = [
        'Authentication required',
        'Owner access required',
        'Invalid input',
        'Resource not found',
        'Rate limit exceeded',
        'Session expired',
        'Invalid CSRF token',
        'Method not allowed'
      ];

      if (safeMessages.some(safe => error.message.includes(safe))) {
        message = error.message;
      }

      // Extract error codes if available
      if ('code' in error && typeof error.code === 'string') {
        code = error.code;
      }
    }

    return { message, code };
  }
}