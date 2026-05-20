const ITERATIONS = 100_000;

export function generateSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: Uint8Array.from(atob(salt), (c) => c.charCodeAt(0)),
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

export async function verifyPin(pin: string, salt: string, storedHash: string): Promise<boolean> {
  const hash = await hashPin(pin, salt);
  return hash === storedHash;
}
