import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function POST(req: NextRequest) {
  try {
    const res = NextResponse.json({ ok: true });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

    const supabase = createServerClient(supabaseUrl, supabaseAnon, {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          res.cookies.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    });

    await supabase.auth.signOut();
    // Additionally clear the cookies explicitly by setting maxAge=0
    try {
      res.cookies.set({ name: 'sb-access-token', value: '', path: '/', maxAge: 0 });
      res.cookies.set({ name: 'sb-refresh-token', value: '', path: '/', maxAge: 0 });
    } catch {}

    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to logout' }, { status: 500 });
  }
}


