import {
  defaultMessageFormatter,
  whatsappNavFooter,
  type WhatsappFormatPayload,
} from './whatsappStructuredPayload';

const SYSTEM_PROMPT = `You are a professional school assistant for PwezaCore.

Your role is to convert structured school data into clear, polite, and professional WhatsApp messages.

Rules:
- Do NOT change or invent any data.
- Do NOT add assumptions.
- Only use the data provided in the JSON payload.
- Keep responses short, clear, and friendly.
- Use simple English for parents.
- Optionally include polite emojis (not excessive; at most one or two per message).
- Preserve all numbers, dates, currency amounts, names, and menu option numbers exactly as given.
- For menu-style intents, keep numbered options readable and in order.
- Do NOT add navigation lines such as "0 — Menu" or "9 — Start over" (they are appended separately).
- Do NOT say you are an AI, Grok, or xAI, and do not add your own "enhanced by AI" disclaimers (the app adds one line for transparency).

Output only the final message body text, with no surrounding quotes or markdown code fences.`;

const GROK_TIMEOUT_MS = 2800;

/** Shown only when Grok returns a successful reply (not on fallback). Set GROK_REPLY_ATTRIBUTION=0 to hide. */
function grokAttributionSuffix(): string {
  const v = process.env.GROK_REPLY_ATTRIBUTION?.trim().toLowerCase();
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') return '';
  return '\n\n✨ Wording enhanced with Grok AI (xAI). Numbers and facts come only from your school’s data in PwezaCore.';
}

function isNonEmptyString(s: unknown): s is string {
  return typeof s === 'string' && s.trim().length > 0;
}

/**
 * Format a bot reply via Grok when configured; otherwise or on failure, use defaultMessageFormatter.
 * On success, appends the standard navigation footer (same as default).
 */
export async function formatWhatsappReply(payload: WhatsappFormatPayload): Promise<string> {
  const fallback = defaultMessageFormatter(payload);
  const apiKey = process.env.GROK_API_KEY?.trim();
  const baseRaw = (process.env.GROK_API_BASE_URL || 'https://api.x.ai/v1').replace(/\/$/, '');

  if (!apiKey) return fallback;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GROK_TIMEOUT_MS);

  try {
    const model = process.env.GROK_MODEL?.trim() || 'grok-3-mini';
    const res = await fetch(`${baseRaw}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        max_tokens: 600,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Convert this JSON payload into the WhatsApp message body.\n\n${JSON.stringify(payload)}`,
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) return fallback;

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const raw = json?.choices?.[0]?.message?.content;
    const text = typeof raw === 'string' ? raw.trim() : '';
    if (!isNonEmptyString(text) || text.length > 4500) return fallback;

    return `${text}${grokAttributionSuffix()}${whatsappNavFooter()}`;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}
