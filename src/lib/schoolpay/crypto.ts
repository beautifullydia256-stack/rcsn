import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

function deriveKey(): Buffer {
  const s = process.env.SCHOOLPAY_CREDENTIALS_SECRET;
  if (!s || s.length < 16) {
    throw new Error('SCHOOLPAY_CREDENTIALS_SECRET must be set (min 16 characters)');
  }
  return createHash('sha256').update(s, 'utf8').digest();
}

/** Encrypt SchoolPay API password for storage in schoolpay_school_settings.api_password_encrypted */
export function encryptSchoolPaySecret(plain: string): string {
  const key = deriveKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptSchoolPaySecret(b64: string): string {
  const key = deriveKey();
  const buf = Buffer.from(b64, 'base64');
  if (buf.length < IV_LEN + TAG_LEN) throw new Error('Invalid ciphertext');
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const enc = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}
