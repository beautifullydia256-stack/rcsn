/**
 * Grok / xAI chat completions via fetch (no openai npm package).
 * Avoids Vercel serverless bundling/runtime issues with the OpenAI SDK on the Grok path.
 */

export type GrokChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export async function grokChatCompletion(
  messages: GrokChatMessage[],
  options?: { temperature?: number; maxTokens?: number; signal?: AbortSignal }
): Promise<string> {
  const key = process.env.GROK_API_KEY?.trim();
  if (!key) {
    throw new Error('GROK_API_KEY is not set');
  }
  const base = (process.env.GROK_API_BASE_URL || 'https://api.x.ai/v1').replace(/\/$/, '').trim();
  /** Same default as lesson planner / lib/aiVercelGrok when GROK_MODEL is unset */
  const model = process.env.GROK_MODEL?.trim() || 'grok-3-mini';

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2000,
    }),
    signal: options?.signal,
  });

  const json = (await res.json().catch(() => ({}))) as {
    choices?: Array<{ message?: { content?: string | null } }>;
    error?: { message?: string };
  };

  if (!res.ok) {
    const msg = json?.error?.message || res.statusText || JSON.stringify(json);
    throw new Error(`${res.status} ${msg}`);
  }

  const raw = json?.choices?.[0]?.message?.content;
  if (raw == null || (typeof raw === 'string' && raw.trim() === '')) {
    throw new Error('AI returned empty content. Try another GROK_MODEL or shorten the prompt.');
  }
  return typeof raw === 'string' ? raw : String(raw);
}
