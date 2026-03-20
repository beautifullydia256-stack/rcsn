import { NextRequest, NextResponse } from 'next/server';

/** Browser origins allowed to call Next /api/* with credentials (SPA + local dev). */
function allowedOrigins(): Set<string> {
  const extra = (process.env.CORS_EXTRA_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return new Set([
    'https://pwezacore.com',
    'https://www.pwezacore.com',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    ...extra,
  ]);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const origin = request.headers.get('origin');
  const allow = allowedOrigins();
  const acao = origin && allow.has(origin) ? origin : null;

  if (request.method === 'OPTIONS') {
    const res = new NextResponse(null, { status: 204 });
    if (acao) {
      res.headers.set('Access-Control-Allow-Origin', acao);
      res.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.headers.set('Access-Control-Max-Age', '86400');
    return res;
  }

  const res = NextResponse.next();
  if (acao) {
    res.headers.set('Access-Control-Allow-Origin', acao);
    res.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res;
}

export const config = {
  matcher: '/api/:path*',
};
