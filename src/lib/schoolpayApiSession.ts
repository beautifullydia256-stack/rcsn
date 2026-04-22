import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  resolveSchoolPayApiSession,
  type SchoolPayApiSessionOk,
} from './schoolpayResolveSession';

export type { SchoolPayApiSessionOk, ResolveSchoolPaySessionResult } from './schoolpayResolveSession';
export { resolveSchoolPayApiSession } from './schoolpayResolveSession';

/**
 * Resolve the current user for SchoolPay settings/sync Next routes: Bearer JWT (Vite SPA)
 * or Supabase cookies (Next).
 */
export async function getSchoolPayApiSession(
  request: NextRequest
): Promise<SchoolPayApiSessionOk | { error: NextResponse }> {
  const resolved = await resolveSchoolPayApiSession({
    authorizationHeader: request.headers.get('authorization'),
    cookieHeader: request.headers.get('cookie'),
  });
  if (!resolved.ok) {
    return { error: NextResponse.json(resolved.body, { status: resolved.status }) };
  }
  return resolved.session;
}
