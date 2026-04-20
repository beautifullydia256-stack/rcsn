import { SignJWT, jwtVerify } from 'jose';

const REFERRAL_KIND = 'referral_registration';

export function getReferralJwtSecret(): string {
  const s = process.env.REFERRAL_JWT_SECRET;
  if (!s || s.length < 16) {
    throw new Error('REFERRAL_JWT_SECRET must be set (min 16 characters)');
  }
  return s;
}

export async function signReferralToken(referralCodeId: string): Promise<string> {
  const secret = getReferralJwtSecret();
  const key = new TextEncoder().encode(secret);
  return new SignJWT({ referral_kind: REFERRAL_KIND, referral_code_id: referralCodeId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30m')
    .sign(key);
}

export async function verifyReferralToken(token: string): Promise<{ referral_code_id: string }> {
  const secret = getReferralJwtSecret();
  const key = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
  if (payload.referral_kind !== REFERRAL_KIND) {
    throw new Error('Invalid token type');
  }
  const id = payload.referral_code_id;
  if (typeof id !== 'string' || !id) {
    throw new Error('Invalid token payload');
  }
  return { referral_code_id: id };
}
