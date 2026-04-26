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

const REFERRAL_INVALID_MESSAGE = 'Invalid or inactive referral code. Please contact support.';

// Simple CORS helper
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Verify Turnstile CAPTCHA
async function verifyTurnstile(token) {
  if (!TURNSTILE_SECRET_KEY) return true;
  if (!token) return false;
  
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
    return false;
  }
}

// Verify referral token (simplified version)
function verifyReferralToken(token) {
  try {
    // Simple JWT decode without verification for now
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return { referral_code_id: payload.referral_code_id };
  } catch (e) {
    throw new Error('Invalid token');
  }
}

// Validate referral by ID
async function validateReferralById(supabase, referralCodeId) {
  try {
    const { data, error } = await supabase
      .from('referral_codes')
      .select('id, code, is_active, affiliate_id, affiliates(*)')
      .eq('id', referralCodeId)
      .eq('is_active', true)
      .single();
    
    if (error || !data) return null;
    return data;
  } catch (e) {
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
      res.status(401).json({ error: REFERRAL_INVALID_MESSAGE });
      return;
    }

    let referralCodeId;
    try {
      const decoded = verifyReferralToken(referralToken);
      referralCodeId = decoded.referral_code_id;
    } catch (e) {
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
    if (!validated) {
      res.status(401).json({ error: REFERRAL_INVALID_MESSAGE });
      return;
    }

    // Verify CAPTCHA if configured
    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
      const captchaValid = await verifyTurnstile(captchaToken);
      if (!captchaValid) {
        res.status(400).json({ error: 'Please complete CAPTCHA verification.' });
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
    if (!['Nursery/Primary', 'Secondary'].includes(schoolType)) {
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

    if (regError) {
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