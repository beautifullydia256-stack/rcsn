/**
 * `supabase.functions.invoke` often returns `FunctionsHttpError` with message
 * "Edge Function returned a non-2xx status code" only. The useful detail is the
 * HTTP status and response body on `error.context` (a Fetch Response).
 */
export async function getFunctionInvokeErrorDetail(err: unknown): Promise<string> {
  if (err == null) return 'Unknown error';
  if (typeof err !== 'object') return String(err);

  const e = err as {
    name?: string;
    message?: string;
    context?: Response;
  };

  const base = typeof e.message === 'string' ? e.message : 'Edge Function error';
  const res = e.context;

  if (res && typeof res.clone === 'function' && typeof res.status === 'number') {
    let bodyText = '';
    try {
      bodyText = (await res.clone().text()).trim();
    } catch {
      bodyText = '';
    }

    let detail = bodyText;
    if (bodyText.startsWith('{') || bodyText.startsWith('[')) {
      try {
        const parsed = JSON.parse(bodyText) as Record<string, unknown>;
        if (typeof parsed.error === 'string') detail = parsed.error;
        else if (typeof parsed.msg === 'string') detail = parsed.msg;
        else if (typeof parsed.message === 'string') detail = parsed.message;
      } catch {
        /* keep bodyText */
      }
    }

    const truncated = detail.length > 3000 ? `${detail.slice(0, 3000)}…` : detail;
    const suffix = truncated ? `: ${truncated}` : '';
    const hint =
      res.status === 401 || res.status === 403
        ? ' If this only happens in the desktop app, sign out and sign in again (desktop uses a separate saved session).'
        : '';
    return `${base} (HTTP ${res.status})${suffix}${hint}`;
  }

  return typeof e.message === 'string' ? e.message : String(err);
}
