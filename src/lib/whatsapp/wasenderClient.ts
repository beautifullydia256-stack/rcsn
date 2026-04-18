import type { SendDocumentParams, SendResult, SendTextParams, WhatsAppProvider } from './whatsappProvider';

/**
 * WasenderAPI REST client.
 * Docs: https://wasenderapi.com/api-docs/messages/send-text-message
 *
 * Environment (server-only):
 * - WASENDER_BEARER_TOKEN — required; Bearer token from Wasender session dashboard
 * - WASENDER_API_BASE — optional; default https://www.wasenderapi.com
 * - WASENDER_WEBHOOK_SECRET — optional; if set, inbound `POST /api/webhooks/wasender` requires `X-Webhook-Signature` to match (see Wasender webhook setup)
 */
export function createWasenderProvider(): WhatsAppProvider {
  const base = (process.env.WASENDER_API_BASE || 'https://www.wasenderapi.com').replace(/\/$/, '');
  const token = process.env.WASENDER_BEARER_TOKEN || '';

  async function post(body: Record<string, unknown>): Promise<SendResult> {
    if (!token) {
      return { ok: false, error: 'WASENDER_BEARER_TOKEN is not set' };
    }
    try {
      const res = await fetch(`${base}/api/send-message`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string; error?: string };
      if (!res.ok) {
        return { ok: false, error: json?.message || json?.error || res.statusText || String(res.status) };
      }
      if (json && json.success === false) {
        return { ok: false, error: json?.message || json?.error || 'Wasender rejected request' };
      }
      return { ok: true, raw: json };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  return {
    async sendText(params: SendTextParams): Promise<SendResult> {
      return post({ to: params.toE164, text: params.text });
    },
    async sendDocument(params: SendDocumentParams): Promise<SendResult> {
      return post({
        to: params.toE164,
        text: params.caption || ' ',
        documentUrl: params.documentUrl,
        fileName: params.fileName,
      });
    },
  };
}
