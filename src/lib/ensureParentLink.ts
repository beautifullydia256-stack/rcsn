import { supabase } from '@/lib/supabase';

/**
 * Calls the serverless route that creates/finds a parent auth user and inserts into public.parents.
 * Must use the same base URL as create-student-login when VITE_API_URL is set (cross-origin / preview).
 *
 * Sends Authorization: Bearer when a session exists (Vite SPA uses sessionStorage; cookies are often empty cross-origin).
 */
export async function ensureParentLinkForStudent(body: {
  student_id: string;
  school_id: string;
  name: string;
  email?: string;
  phone?: string;
  relationship?: string;
}): Promise<{ ok: boolean; status: number; error?: string; message?: string }> {
  const apiBase = (
    import.meta.env.VITE_API_URL ||
    (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL : undefined) ||
    ''
  ).replace(/\/$/, '');
  const url = apiBase ? `${apiBase}/api/admin/ensure-parent-link` : '/api/admin/ensure-parent-link';
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json = {} as { error?: string; message?: string };
    try {
      json = text ? (JSON.parse(text) as typeof json) : {};
    } catch {
      json = { error: text ? text.slice(0, 300) : undefined };
    }
    if (!res.ok) {
      const errMsg =
        json.error ||
        (text && !json.error ? `HTTP ${res.status}: ${text.slice(0, 200)}` : '') ||
        res.statusText ||
        `HTTP ${res.status}`;
      return { ok: false, status: res.status, error: errMsg };
    }
    return { ok: true, status: res.status, message: json.message };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      error:
        e instanceof Error
          ? `${e.message}${e.message.includes('fetch') ? ' (if the app API is on another host, CORS must allow this site.)' : ''}`
          : 'Network error',
    };
  }
}
