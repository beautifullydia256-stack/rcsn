/**
 * Calls the serverless route that creates/finds a parent auth user and inserts into public.parents.
 * Must use the same base URL as create-student-login when VITE_API_URL is set (cross-origin / preview).
 */
export async function ensureParentLinkForStudent(body: {
  student_id: string;
  school_id: string;
  name: string;
  email?: string;
  phone?: string;
  relationship?: string;
}): Promise<{ ok: boolean; status: number; error?: string; message?: string }> {
  const apiBase = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
  const url = apiBase ? `${apiBase}/api/admin/ensure-parent-link` : '/api/admin/ensure-parent-link';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
  if (!res.ok) {
    return { ok: false, status: res.status, error: json.error || res.statusText };
  }
  return { ok: true, status: res.status, message: json.message };
}
