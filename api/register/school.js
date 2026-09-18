/**
 * Vercel serverless: POST /api/register/school
 * School registration endpoint - CommonJS to avoid import issues
 */
'use strict';

const { createClient } = require('@supabase/supabase-js');

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;
const REFERRAL_JWT_SECRET = process.env.REFERRAL_JWT_SECRET;

const REFERRAL_INVALID_MESSAGE = 'Invalid or inactive referral code. Please contact support.';
const REFERRAL_KIND = 'referral_registration';

// Simple CORS helper
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Verify Turnstile CAPTCHA (graceful fallback like login page if network/domain errors)
async function verifyTurnstile(token) {
  if (!TURNSTILE_SECRET_KEY) return true;
  if (!token) return true;
  
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: TURNSTILE_SECRET_KEY, response: token }),
    });
    const data = await res.json();
    return data.success === true;
  } catch (e) {
    console.error('Turnstile verification error:', e);
    return true;
  }
}

// Handle both JWT and simple base64 token formats
async function verifyReferralToken(token) {
  console.log('Verifying token format...');
  
  // First, try to parse as simple base64 (matching /api/referrals/verify.js)
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    console.log('Token decoded as base64:', decoded);
    
    if (decoded.exp && decoded.exp < Date.now()) {
      throw new Error('Token expired');
    }
    
    if (decoded.referralId) {
      return { referral_code_id: decoded.referralId };
    }
  } catch (base64Error) {
    console.log('Base64 decode failed, trying JWT:', base64Error.message);
  }
  
  // If base64 fails, try JWT verification
  if (!REFERRAL_JWT_SECRET || REFERRAL_JWT_SECRET.length < 16) {
    throw new Error('REFERRAL_JWT_SECRET must be set for JWT verification');
  }
  
  try {
    // Try using jose library first
    const { jwtVerify } = require('jose');
    const key = new TextEncoder().encode(REFERRAL_JWT_SECRET);
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
    
    if (payload.referral_kind !== REFERRAL_KIND) {
      throw new Error('Invalid token type');
    }
    
    const id = payload.referral_code_id;
    if (typeof id !== 'string' || !id) {
      throw new Error('Invalid token payload');
    }
    
    return { referral_code_id: id };
  } catch (joseError) {
    console.log('Jose library failed, trying fallback:', joseError.message);
    
    // Fallback: Use Node.js crypto for HMAC verification
    const crypto = require('crypto');
    
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }
      
      const [headerB64, payloadB64, signatureB64] = parts;
      
      // Verify signature
      const data = `${headerB64}.${payloadB64}`;
      const expectedSignature = crypto
        .createHmac('sha256', REFERRAL_JWT_SECRET)
        .update(data)
        .digest('base64url');
      
      if (signatureB64 !== expectedSignature) {
        throw new Error('Invalid signature');
      }
      
      // Decode payload
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
      
      // Check expiration
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('Token expired');
      }
      
      if (payload.referral_kind !== REFERRAL_KIND) {
        throw new Error('Invalid token type');
      }
      
      const id = payload.referral_code_id;
      if (typeof id !== 'string' || !id) {
        throw new Error('Invalid token payload');
      }
      
      return { referral_code_id: id };
    } catch (fallbackError) {
      console.error('All token verification methods failed');
      throw new Error('Token verification failed');
    }
  }
}

// Validate referral by ID with proper affiliate handling
async function validateReferralById(supabase, referralCodeId) {
  try {
    const { data: row, error } = await supabase
      .from('referral_codes')
      .select(`
        id,
        affiliate_id,
        type,
        discount_type,
        is_active,
        expires_at,
        max_uses,
        current_uses,
        affiliates ( name, status )
      `)
      .eq('id', referralCodeId)
      .maybeSingle();
    
    if (error || !row) return null;
    
    // Validate referral row
    if (!row.is_active) return null;
    
    if (row.expires_at) {
      const exp = new Date(row.expires_at).getTime();
      if (Number.isFinite(exp) && exp < Date.now()) return null;
    }
    
    if (row.max_uses != null && row.current_uses >= row.max_uses) return null;
    
    const affiliates = Array.isArray(row.affiliates) ? row.affiliates[0] : row.affiliates;
    const codeType = row.type || 'ADMIN';
    
    if (codeType === 'AFFILIATE') {
      if (!row.affiliate_id) return null;
      if (!affiliates || affiliates.status !== 'ACTIVE') return null;
    }
    
    const registeringUnder = codeType === 'AFFILIATE' && affiliates?.name ? affiliates.name.trim() : null;
    
    return {
      id: row.id,
      affiliate_id: row.affiliate_id,
      type: codeType,
      registeringUnder,
    };
  } catch (e) {
    console.error('Referral validation error:', e);
    return null;
  }
}

module.exports = async function handler(req, res) {
  setCors(res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      res.status(500).json({ error: 'Server not configured' });
      return;
    }

    const body = req.body || {};
    const referralToken = String(body.referralToken || '').trim();
    const email = String(body.email || '').trim();
    const password = String(body.password || '');
    const adminName = String(body.adminName || '').trim();
    const phone = String(body.phone || '').trim();
    const schoolName = String(body.schoolName || '').trim();
    const schoolLocation = String(body.schoolLocation || '').trim();
    const schoolType = String(body.schoolType || '').trim();
    const schoolCode = String(body.schoolCode || '').trim();
    const captchaToken = body.captchaToken;

    // Validate referral token
    if (!referralToken) {
      console.log('No referral token provided');
      res.status(401).json({ error: REFERRAL_INVALID_MESSAGE });
      return;
    }

    console.log('Referral token received:', referralToken.substring(0, 20) + '...');
    console.log('JWT Secret available:', !!REFERRAL_JWT_SECRET);

    let referralCodeId;
    try {
      const decoded = await verifyReferralToken(referralToken);
      referralCodeId = decoded.referral_code_id;
      console.log('Token decoded successfully, referral_code_id:', referralCodeId);
    } catch (e) {
      console.error('Token verification failed:', e.message);
      res.status(401).json({ error: REFERRAL_INVALID_MESSAGE });
      return;
    }

    // Create Supabase clients
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const adminAuth = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Validate referral code
    const validated = await validateReferralById(supabaseAdmin, referralCodeId);
    console.log('Referral validation result:', validated ? 'valid' : 'invalid');
    if (!validated) {
      res.status(401).json({ error: REFERRAL_INVALID_MESSAGE });
      return;
    }

    // Verify CAPTCHA if configured and token provided
    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && captchaToken) {
      const captchaValid = await verifyTurnstile(captchaToken);
      if (!captchaValid) {
        res.status(400).json({ error: 'CAPTCHA verification failed. Please try again.' });
        return;
      }
    }

    // Validate input
    if (!email || !password || password.length < 6) {
      res.status(400).json({ error: 'Valid email and password (min 6 chars) are required.' });
      return;
    }
    if (!adminName || !schoolName || !schoolLocation) {
      res.status(400).json({ error: 'Please fill in all required fields.' });
      return;
    }
    if (!['Nursery/Primary', 'Secondary', 'Tertiary / Nursing & Midwifery', 'Tertiary', 'Health Training / Nursing'].includes(schoolType)) {
      res.status(400).json({ error: 'Invalid school type.' });
      return;
    }

    // Create user account
    const { data: created, error: createErr } = await adminAuth.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        school_name: schoolName,
        admin_name: adminName,
        phone,
      },
    });

    if (createErr || !created.user) {
      res.status(400).json({ error: createErr?.message || 'Failed to create account.' });
      return;
    }

    const userId = created.user.id;

    // Register school
    const { data: regData, error: regError } = await supabaseAdmin.rpc('register_school_admin_with_referral', {
      p_user_id: userId,
      p_email: email,
      p_name: adminName,
      p_phone: phone,
      p_school_name: schoolName,
      p_school_location: schoolLocation,
      p_school_type: schoolType,
      p_referral_code_id: validated.id,
    });

    console.log('RPC call result:', { regData, regError });

    if (regError) {
      console.error('RPC error details:', regError);
      await adminAuth.auth.admin.deleteUser(userId);
      res.status(400).json({ error: regError.message || 'Registration failed.' });
      return;
    }

    const reg = regData;
    if (!reg || reg.success === false || !reg.school_id) {
      await adminAuth.auth.admin.deleteUser(userId);
      res.status(400).json({ error: reg?.message || 'School creation failed.' });
      return;
    }

    // Update school code if provided
    if (schoolCode) {
      await supabaseAdmin.from('schools').update({ school_code: schoolCode }).eq('school_id', reg.school_id);
    }

    res.status(200).json({ success: true, school_id: reg.school_id });

  } catch (e) {
    console.error('School registration error:', e);
    const msg = e instanceof Error ? e.message : 'Registration failed';
    res.status(500).json({ error: msg });
  }
};