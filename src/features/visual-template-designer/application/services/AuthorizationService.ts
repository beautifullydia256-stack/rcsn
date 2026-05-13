/**
 * Visual Template Designer - Authorization Service
 *
 * Provides role-based access control, input sanitization,
 * and injection-pattern detection for the template designer.
 */

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class AuthorizationService {
  /**
   * Verify that the current user has admin or owner access.
   * Throws AuthorizationError if the check fails.
   */
  static checkAdminAccess(userRole: string | null | undefined): void {
    if (userRole === 'admin' || userRole === 'owner') return;
    throw new AuthorizationError(
      `Access denied. Required role: admin or owner. Current role: ${userRole ?? 'none'}`
    );
  }

  /**
   * Remove dangerous HTML/JS content from a string.
   * Strips script tags, event handlers, and javascript: protocol references.
   */
  static sanitizeText(input: string): string {
    // Remove <script>...</script> blocks (case-insensitive, multiline)
    let sanitized = input.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '');

    // Remove all remaining HTML tags
    sanitized = sanitized.replace(/<[^>]+>/gi, '');

    // Remove javascript: protocol references
    sanitized = sanitized.replace(/javascript\s*:/gi, '');

    // Remove inline event handlers like onclick=, onload=, onerror=, etc.
    sanitized = sanitized.replace(/\bon\w+\s*=/gi, '');

    return sanitized;
  }

  /**
   * Detect whether an input string contains suspicious injection patterns.
   * Returns false (unsafe) if any dangerous pattern is found.
   */
  static validateNoInjection(input: string): boolean {
    const dangerousPatterns: RegExp[] = [
      /<script/i,
      /javascript\s*:/i,
      /\bon\w+\s*=/i,          // event handlers: onclick=, onload=, onerror= …
      /DROP\s+TABLE/i,
      /INSERT\s+INTO/i,
      /DELETE\s+FROM/i,
      /UPDATE\s+\w+\s+SET/i,
      /SELECT\s+.*\s+FROM/i,
      /UNION\s+SELECT/i,
      /EXEC\s*\(/i,
      /xp_\w+/i,               // SQL Server extended procedures
    ];

    return !dangerousPatterns.some((pattern) => pattern.test(input));
  }
}
