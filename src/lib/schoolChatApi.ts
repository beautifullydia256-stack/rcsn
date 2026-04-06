import { supabase } from '@/lib/supabase';

export type EligibleChatUser = {
  user_id: string;
  name: string;
  role: string;
  email: string;
  /** Server heartbeat for online / last seen (via school_chat_presence). */
  last_seen_at: string | null;
};

export type ChatConversationRow = {
  conversation_id: string;
  peer_user_id: string;
  peer_name: string;
  peer_role: string;
  last_body: string | null;
  last_at: string | null;
  unread_count: number;
  peer_last_seen_at: string | null;
};

export type ChatMessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  /** Set when the recipient loaded the thread (WhatsApp-style delivered / double gray tick). */
  delivered_at: string | null;
};

/** Treat peer as online when their last heartbeat is within this window. */
export const CHAT_PRESENCE_ONLINE_MS = 120_000;

/** Human-readable online / last seen for thread and lists. */
export function formatChatPresence(lastSeenAtIso: string | null | undefined): {
  online: boolean;
  label: string;
} {
  if (!lastSeenAtIso) return { online: false, label: '' };
  const t = new Date(lastSeenAtIso).getTime();
  if (Number.isNaN(t)) return { online: false, label: '' };
  const delta = Date.now() - t;
  if (delta < CHAT_PRESENCE_ONLINE_MS) return { online: true, label: 'Online' };
  const seen = new Date(lastSeenAtIso);
  const now = new Date();
  const timeStr = seen.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (seen.toDateString() === now.toDateString()) {
    return { online: false, label: `Last seen today at ${timeStr}` };
  }
  const yest = new Date(now);
  yest.setDate(yest.getDate() - 1);
  if (seen.toDateString() === yest.toDateString()) {
    return { online: false, label: `Last seen yesterday at ${timeStr}` };
  }
  if (delta < 7 * 24 * 60 * 60_000) {
    return {
      online: false,
      label: `Last seen ${seen.toLocaleDateString(undefined, { weekday: 'short' })} at ${timeStr}`,
    };
  }
  return {
    online: false,
    label: `Last seen ${seen.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} at ${timeStr}`,
  };
}

function mapEligibleRow(raw: Record<string, unknown>): EligibleChatUser {
  return {
    user_id: String(raw.user_id),
    name: String(raw.name ?? ''),
    role: String(raw.role ?? ''),
    email: String(raw.email ?? ''),
    last_seen_at: (raw.last_seen_at as string | null | undefined) ?? null,
  };
}

function mapConversationRow(raw: Record<string, unknown>): ChatConversationRow {
  return {
    conversation_id: String(raw.conversation_id),
    peer_user_id: String(raw.peer_user_id),
    peer_name: String(raw.peer_name ?? ''),
    peer_role: String(raw.peer_role ?? ''),
    last_body: (raw.last_body as string | null | undefined) ?? null,
    last_at: (raw.last_at as string | null | undefined) ?? null,
    unread_count: Number(raw.unread_count ?? 0),
    peer_last_seen_at: (raw.peer_last_seen_at as string | null | undefined) ?? null,
  };
}

export async function fetchEligibleChatUsers(): Promise<EligibleChatUser[]> {
  const { data, error } = await supabase.rpc('school_chat_list_eligible_users');
  if (error) throw error;
  return (data || []).map((r) => mapEligibleRow(r as Record<string, unknown>));
}

export async function fetchMyConversations(): Promise<ChatConversationRow[]> {
  const { data, error } = await supabase.rpc('school_chat_my_conversations');
  if (error) throw error;
  return (data || []).map((r) => mapConversationRow(r as Record<string, unknown>));
}

/** Upsert this device's activity timestamp (call on an interval while Messages is open). */
export async function pingChatPresence(schoolId: string): Promise<void> {
  if (!schoolId) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return;
  const { error } = await supabase.from('school_chat_presence').upsert(
    { user_id: user.id, school_id: schoolId, last_seen_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  );
  if (error && typeof import.meta !== 'undefined' && (import.meta as ImportMeta).env?.DEV) {
    console.warn('[schoolChatApi] pingChatPresence', error.message);
  }
}

export async function getOrCreateDm(otherUserId: string): Promise<string> {
  const { data, error } = await supabase.rpc('school_chat_get_or_create_dm', {
    p_other_user_id: otherUserId,
  });
  if (error) throw error;
  if (data == null || data === '') throw new Error('No conversation id returned.');
  return String(data);
}

export async function fetchMessages(conversationId: string): Promise<ChatMessageRow[]> {
  const { data, error } = await supabase
    .from('school_chat_messages')
    .select('id, conversation_id, sender_id, body, created_at, delivered_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((r) => ({
    ...(r as ChatMessageRow),
    delivered_at: (r as { delivered_at?: string | null }).delivered_at ?? null,
  })) as ChatMessageRow[];
}

/** When you open the thread, mark the other person's outgoing lines as delivered (sets delivered_at). */
export async function markPeerMessagesDelivered(conversationId: string): Promise<void> {
  const { error } = await supabase.rpc('school_chat_mark_peer_messages_delivered', {
    p_conversation_id: conversationId,
  });
  if (error) {
    if (typeof import.meta !== 'undefined' && (import.meta as ImportMeta).env?.DEV) {
      console.warn('[schoolChatApi] markPeerMessagesDelivered', error.message);
    }
  }
}

/** Other participant's last_read_at (for blue ticks on your outgoing messages). */
export async function fetchPeerLastReadAt(conversationId: string): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return null;
  const { data, error } = await supabase
    .from('school_chat_participants')
    .select('last_read_at')
    .eq('conversation_id', conversationId)
    .neq('user_id', user.id)
    .maybeSingle();
  if (error) return null;
  return (data as { last_read_at?: string | null } | null)?.last_read_at ?? null;
}

export async function sendMessage(
  conversationId: string,
  schoolId: string,
  body: string
): Promise<ChatMessageRow | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) throw new Error('Not signed in');
  const trimmed = body.trim();
  if (!trimmed) return null;
  const { data, error } = await supabase
    .from('school_chat_messages')
    .insert({
      conversation_id: conversationId,
      school_id: schoolId,
      sender_id: user.id,
      body: trimmed,
    })
    .select('id, conversation_id, sender_id, body, created_at, delivered_at')
    .single();
  if (error) throw error;
  const r = data as ChatMessageRow;
  return { ...r, delivered_at: r.delivered_at ?? null };
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return;
  const { error } = await supabase
    .from('school_chat_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id);
  if (error) throw error;
}

export function subscribeToConversationMessages(
  conversationId: string,
  onInsert: (row: ChatMessageRow) => void,
  onUpdate?: (row: ChatMessageRow) => void
) {
  const channel = supabase
    .channel(`school-chat:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'school_chat_messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const r = payload.new as ChatMessageRow;
        if (r?.id) onInsert({ ...r, delivered_at: r.delivered_at ?? null });
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'school_chat_messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        if (!onUpdate) return;
        const r = payload.new as ChatMessageRow;
        if (r?.id) onUpdate({ ...r, delivered_at: r.delivered_at ?? null });
      }
    )
    .subscribe((status, err) => {
      if (typeof import.meta !== 'undefined' && (import.meta as ImportMeta).env?.DEV) {
        if (status === 'SUBSCRIBED') {
          console.debug('[schoolChat] messages channel subscribed', conversationId);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[schoolChat] messages channel', status, err?.message ?? err);
        }
      }
    });
  return () => {
    void supabase.removeChannel(channel);
  };
}

/** Live peer last_seen_at for online / last seen in the thread header. */
export function subscribeToPeerPresence(peerUserId: string, onLastSeenAt: (iso: string | null) => void) {
  const apply = (row: { last_seen_at?: string | null } | undefined) => {
    if (row?.last_seen_at) onLastSeenAt(row.last_seen_at);
  };
  const channel = supabase
    .channel(`school-chat-presence:${peerUserId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'school_chat_presence',
        filter: `user_id=eq.${peerUserId}`,
      },
      (payload) => apply(payload.new as { last_seen_at?: string | null })
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'school_chat_presence',
        filter: `user_id=eq.${peerUserId}`,
      },
      (payload) => apply(payload.new as { last_seen_at?: string | null })
    )
    .subscribe((status, err) => {
      if (typeof import.meta !== 'undefined' && (import.meta as ImportMeta).env?.DEV) {
        if (status === 'SUBSCRIBED') {
          console.debug('[schoolChat] presence channel subscribed', peerUserId);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[schoolChat] presence channel', status, err?.message ?? err);
        }
      }
    });
  return () => {
    void supabase.removeChannel(channel);
  };
}

/** Live updates when peer updates last_read_at (blue ticks). */
export function subscribeToPeerLastRead(
  conversationId: string,
  peerUserId: string,
  onLastRead: (iso: string | null) => void
) {
  const channel = supabase
    .channel(`school-chat-read:${conversationId}:${peerUserId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'school_chat_participants',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const row = payload.new as { user_id?: string; last_read_at?: string | null };
        if (row.user_id === peerUserId) onLastRead(row.last_read_at ?? null);
      }
    )
    .subscribe((status, err) => {
      if (typeof import.meta !== 'undefined' && (import.meta as ImportMeta).env?.DEV) {
        if (status === 'SUBSCRIBED') {
          console.debug('[schoolChat] read-receipt channel subscribed', conversationId);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[schoolChat] read-receipt channel', status, err?.message ?? err);
        }
      }
    });
  return () => {
    void supabase.removeChannel(channel);
  };
}
