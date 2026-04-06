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
    .select('id, conversation_id, sender_id, body, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as ChatMessageRow[];
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
  onInsert: (row: ChatMessageRow) => void
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
        if (r?.id) onInsert(r);
      }
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
