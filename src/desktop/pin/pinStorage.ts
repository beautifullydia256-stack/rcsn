import { generateSalt, hashPin, verifyPin } from './pinCrypto';

const K = {
  hash:    'pwezacore-pin-hash',
  salt:    'pwezacore-pin-salt',
  uid:     'pwezacore-pin-uid',
  name:    'pwezacore-pin-name',
  fails:   'pwezacore-pin-fails',
  active:  'pwezacore-pin-last-active',
};

export const PIN_MAX_FAILS = 5;
export const LOCK_AFTER_MS = 30 * 60 * 1_000; // 30 minutes

export function isPinSet(userId: string): boolean {
  return (
    !!localStorage.getItem(K.hash) &&
    !!localStorage.getItem(K.salt) &&
    localStorage.getItem(K.uid) === userId
  );
}

export function getStoredDisplayName(): string {
  return localStorage.getItem(K.name) ?? '';
}

export async function savePin(userId: string, pin: string, displayName: string): Promise<void> {
  const salt = generateSalt();
  const hash = await hashPin(pin, salt);
  localStorage.setItem(K.hash, hash);
  localStorage.setItem(K.salt, salt);
  localStorage.setItem(K.uid, userId);
  localStorage.setItem(K.name, displayName);
  localStorage.setItem(K.fails, '0');
}

export function getFailCount(): number {
  return parseInt(localStorage.getItem(K.fails) ?? '0', 10);
}

function incFails(): number {
  const n = getFailCount() + 1;
  localStorage.setItem(K.fails, String(n));
  return n;
}

export function clearFails(): void {
  localStorage.setItem(K.fails, '0');
}

export async function checkPin(userId: string, pin: string): Promise<'correct' | 'wrong' | 'locked-out'> {
  if (!isPinSet(userId)) return 'wrong';
  if (getFailCount() >= PIN_MAX_FAILS) return 'locked-out';
  const salt = localStorage.getItem(K.salt) ?? '';
  const hash = localStorage.getItem(K.hash) ?? '';
  const ok = await verifyPin(pin, salt, hash);
  if (ok) {
    clearFails();
    return 'correct';
  }
  const fails = incFails();
  return fails >= PIN_MAX_FAILS ? 'locked-out' : 'wrong';
}

export function clearPin(): void {
  Object.values(K).forEach((k) => localStorage.removeItem(k));
}

export function touchLastActive(): void {
  localStorage.setItem(K.active, String(Date.now()));
}

export function getLastActive(): number {
  return parseInt(localStorage.getItem(K.active) ?? '0', 10);
}
