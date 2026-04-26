import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../src/lib/supabase';
import {
  findReferralByCode,
  normalizeReferralCodeInput,
  REFERRAL_INVALID_MESSAGE,
} from '../../src/lib/referralLookup';
import { signReferralToken } from '../../src/lib/referralJwt';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Server not configured' });
    }

    const body = req.body || {};
    const raw = typeof body.code === 'string' ? body.code : '';
    const normalized = normalizeReferralCodeInput(raw);
    if (!normalized) {
      return res.status(401).json({ error: REFERRAL_INVALID_MESSAGE });
    }

    const validated = await findReferralByCode(supabaseAdmin, normalized);
    if (!validated) {
      return res.status(401).json({ error: REFERRAL_INVALID_MESSAGE });
    }

    let token: string;
    try {
      token = await signReferralToken(validated.id);
    } catch {
      return res.status(500).json({
        error: 'Registration verification is not configured on the server.',
      });
    }

    return res.status(200).json({
      token,
      registeringUnder: validated.registeringUnder,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Verification failed';
    return res.status(500).json({ error: msg });
  }
}
