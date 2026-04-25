/**
 * CSRF Token Generation Endpoint
 * GET /api/owner/csrf-token
 * 
 * Generates a CSRF token for the current owner session
 */

import { NextApiResponse } from 'next';
import { withOwnerReadAuth, SecureOwnerApiRequest, generateCSRFToken } from '../../lib/ownerSecureMiddleware';

async function handler(req: SecureOwnerApiRequest, res: NextApiResponse) {
  try {
    const owner = req.owner;
    if (!owner) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const csrfToken = generateCSRFToken(owner.sessionId);

    res.status(200).json({
      csrfToken,
      expiresIn: 3600, // 1 hour
      sessionId: owner.sessionId
    });

  } catch (error) {
    console.error('CSRF token generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate CSRF token',
      message: 'An error occurred while generating security token'
    });
  }
}

export default withOwnerReadAuth(handler);