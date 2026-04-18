import type { SupabaseClient } from '@supabase/supabase-js';

export type BotContext = Record<string, unknown>;

export async function loadSession(
  client: SupabaseClient,
  waE164: string
): Promise<{ step: string; context: BotContext }> {
  const { data, error } = await client
    .from('whatsapp_bot_sessions')
    .select('step, context')
    .eq('wa_e164', waE164)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as { step?: string; context?: BotContext } | null;
  return {
    step: row?.step ?? 'entry',
    context: (row?.context as BotContext) ?? {},
  };
}

export async function saveSession(
  client: SupabaseClient,
  waE164: string,
  step: string,
  context: BotContext
): Promise<void> {
  const { error } = await client.from('whatsapp_bot_sessions').upsert(
    {
      wa_e164: waE164,
      step,
      context: context as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'wa_e164' }
  );
  if (error) throw new Error(error.message);
}

export async function clearSession(client: SupabaseClient, waE164: string): Promise<void> {
  const { error } = await client.from('whatsapp_bot_sessions').delete().eq('wa_e164', waE164);
  if (error) throw new Error(error.message);
}
