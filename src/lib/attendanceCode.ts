/** Generates the school's 6-digit attendance verification code for the current 30-second window. */
export async function generateAttendanceCode(schoolId: string, windowOffset = 0): Promise<string> {
  const w = Math.floor(Date.now() / 30_000) + windowOffset;
  const data = new TextEncoder().encode(`pweza:${schoolId}:${w}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  const arr = new Uint8Array(buf);
  const num = ((arr[0] << 24) | (arr[1] << 16) | (arr[2] << 8) | arr[3]) >>> 0;
  return String(num % 1_000_000).padStart(6, '0');
}

/** Seconds remaining until the code rotates (0–29). */
export function secondsToNextWindow(): number {
  return 29 - (Math.floor(Date.now() / 1_000) % 30);
}

/** Validates an entered code against the current window and the previous window (grace). */
export async function validateAttendanceCode(schoolId: string, entered: string): Promise<boolean> {
  const clean = entered.replace(/\s/g, '');
  const [cur, prev] = await Promise.all([
    generateAttendanceCode(schoolId, 0),
    generateAttendanceCode(schoolId, -1),
  ]);
  return clean === cur || clean === prev;
}
