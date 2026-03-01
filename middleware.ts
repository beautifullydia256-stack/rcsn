import { NextRequest, NextResponse } from 'next/server';

const CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://www.pwezacore.com';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': CORS_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
};

export function middleware(request: NextRequest) {
  // Handle CORS preflight (OPTIONS) at the edge so browser allows POST from www.pwezacore.com
  if (request.method === 'OPTIONS' && request.nextUrl.pathname.startsWith('/api/')) {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  const res = NextResponse.next();
  // Add CORS headers to all /api responses
  if (request.nextUrl.pathname.startsWith('/api/')) {
    Object.entries(corsHeaders).forEach(([key, value]) => res.headers.set(key, value));
  }
  return res;
}

export const config = {
  matcher: '/api/:path*',
};
