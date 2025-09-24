export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(req: NextRequest) {
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

	const { data: { session } } = await supabase.auth.getSession();
	if (!session) return NextResponse.json({ authenticated: false });

	const role = (session.user.user_metadata as any)?.role as string | undefined;
	return NextResponse.json({ authenticated: true, role: (role || '').toLowerCase() });
}
