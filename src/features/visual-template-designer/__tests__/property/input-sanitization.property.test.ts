/**
 * Property 27: Input sanitization safety
 *
 * Verifies that AuthorizationService.sanitizeText:
 *   - Always removes dangerous content (<script>, javascript:, onclick=).
 *   - Returns plain text strings unchanged (no HTML or JS) without modification.
 *
 * Uses fast-check with a minimum of 100 iterations.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { AuthorizationService } from '../../application/services/AuthorizationService';
import { propertyTestParams } from './fast-check.config';

/** Known dangerous payloads to embed */
const DANGEROUS_PAYLOADS = [
  '<script>alert(1)</script>',
  'javascript:void(0)',
  'onclick=evil()',
] as const;

/**
 * Arbitrary that produces strings containing at least one dangerous payload
 * surrounded by arbitrary prefix/suffix text.
 */
const stringWithDangerousPayload = fc
  .tuple(
    fc.constantFrom(...DANGEROUS_PAYLOADS),
    fc.string({ maxLength: 50 }),
    fc.string({ maxLength: 50 })
  )
  .map(([payload, prefix, suffix]) => `${prefix}${payload}${suffix}`);

/**
 * Arbitrary that produces plain text strings with no HTML tags,
 * no script-related keywords, and no event handler patterns.
 */
const plainTextString = fc.stringMatching(/^[a-zA-Z0-9 .,!?;:'"()\-_]*$/).filter(
  (s) =>
    !/</.test(s) &&
    !/javascript:/i.test(s) &&
    !/\bon\w+\s*=/i.test(s) &&
    s.length > 0
);

describe('Property 27: Input sanitization safety', () => {
  /**
   * Property: sanitizeText removes dangerous content from any string
   * that contains a known dangerous payload.
   */
  it('removes <script> tags from any input containing them', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 50 }),
        fc.string({ maxLength: 50 }),
        (prefix, suffix) => {
          const input = `${prefix}<script>alert("xss")</script>${suffix}`;
          const sanitized = AuthorizationService.sanitizeText(input);
          expect(sanitized).not.toMatch(/<script/i);
        }
      ),
      propertyTestParams()
    );
  });

  it('removes javascript: protocol from any input containing it', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 50 }),
        fc.string({ maxLength: 50 }),
        (prefix, suffix) => {
          const input = `${prefix}javascript:void(0)${suffix}`;
          const sanitized = AuthorizationService.sanitizeText(input);
          expect(sanitized).not.toMatch(/javascript\s*:/i);
        }
      ),
      propertyTestParams()
    );
  });

  it('removes onclick= event handlers from any input containing them', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 50 }),
        fc.string({ maxLength: 50 }),
        (prefix, suffix) => {
          const input = `${prefix}onclick=evil()${suffix}`;
          const sanitized = AuthorizationService.sanitizeText(input);
          expect(sanitized).not.toMatch(/\bon\w+\s*=/i);
        }
      ),
      propertyTestParams()
    );
  });

  it('removes dangerous content from strings containing constantFrom payloads', () => {
    fc.assert(
      fc.property(stringWithDangerousPayload, (input) => {
        const sanitized = AuthorizationService.sanitizeText(input);
        // None of the dangerous patterns should remain
        expect(sanitized).not.toMatch(/<script/i);
        expect(sanitized).not.toMatch(/javascript\s*:/i);
        expect(sanitized).not.toMatch(/\bon\w+\s*=/i);
      }),
      propertyTestParams()
    );
  });

  /**
   * Property: sanitizeText does not alter plain text strings
   * that contain no HTML or JS.
   */
  it('returns plain text strings without modification', () => {
    fc.assert(
      fc.property(plainTextString, (input) => {
        const sanitized = AuthorizationService.sanitizeText(input);
        // Plain text should be returned unchanged
        expect(sanitized).toBe(input);
      }),
      propertyTestParams()
    );
  });
});
