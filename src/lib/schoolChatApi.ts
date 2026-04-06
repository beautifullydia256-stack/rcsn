import { supabase } from '@/lib/supabase';

export type EligibleChatUser = {
  user_id: string;
  name: string;
  role: string;
  email: string;
};

export type ChatConversationRow = {
  conversation_id: string;
  peer_user_id: string;
  peer_name: string;
  peer_role: string;
  last_body: string | null;
  last_at: string | null;
  unread_count: number;
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

export async function fetchEligibleChatUsers(): Promise<EligibleChatUser[]> {
  const { data, error } = await supabase.rpc('school_chat_list_eligible_users');
  if (error) throw error;
  return (data || []) as EligibleChatUser[];
}

export async function fetchMyConversations(): Promise<ChatConversationRow[]> {
  const { data, error } = await supabase.rpc('school_chat_my_conversations');
  if (error) throw error;
  return (data || []) as ChatConversationRow[];
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

export async function sendMessage(conversationId: string, schoolId: string, body: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) throw new Error('Not signed in');
  const trimmed = body.trim();
  if (!trimmed) return;
  const { error } = await supabase.from('school_chat_messages').insert({
    conversation_id: conversationId,
    school_id: schoolId,
    sender_id: user.id,
    body: trimmed,
  });
  if (error) throw error;
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
    .subscribe();
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
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
