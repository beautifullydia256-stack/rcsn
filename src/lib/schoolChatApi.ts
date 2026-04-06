import { supabase } from '@/lib/supabase';

export type EligibleChatUser = {
  user_id: string;
  name: string;
  role: string;
  email: string;
  /** Activity time: presence heartbeat or, if none, last_sign_in_at fallback from RPC. */
  last_seen_at: string | null;
  /** False after explicit logout; true while the user has an active app session (heartbeats). */
  session_active: boolean;
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
  peer_session_active: boolean;
};

export type ChatMessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  /** Set when the recipient loaded the thread (WhatsApp-style delivered / double gray tick). */
  delivered_at: string | null;
  msg_kind: 'text' | 'voice';
  /** Storage object path in bucket `school-chat-voice` when audio is still available. */
  audio_path: string | null;
  audio_duration_sec: number | null;
};

/** Green "online" only if session is active and last heartbeat is within this window (~WhatsApp). */
export const CHAT_PRESENCE_ONLINE_MS = 3 * 60 * 1000;

/** If heartbeats stop (hidden tab, closed laptop) treat as offline after this idle period even if session flag lagged. */
export const CHAT_PRESENCE_MAX_IDLE_MS = 20 * 60 * 1000;

export type ChatPeerPresence = {
  last_seen_at: string | null;
  session_active: boolean | null;
};

function formatLastSeenSubtitle(lastSeenAtIso: string, deltaMs: number): string {
  const seen = new Date(lastSeenAtIso);
  const now = new Date();
  const timeStr = seen.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const mins = Math.floor(deltaMs / 60_000);

  if (mins < 1) return 'Last seen just now';
  if (mins < 60) return `Last seen ${mins} min ago`;
  if (seen.toDateString() === now.toDateString()) {
    return `Last seen today at ${timeStr}`;
  }
  const yest = new Date(now);
  yest.setDate(yest.getDate() - 1);
  if (seen.toDateString() === yest.toDateString()) {
    return `Last seen yesterday at ${timeStr}`;
  }
  if (deltaMs < 7 * 24 * 60 * 60_000) {
    return `Last seen ${seen.toLocaleDateString(undefined, { weekday: 'short' })} at ${timeStr}`;
  }
  return `Last seen ${seen.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} at ${timeStr}`;
}

/** Voice notes: Opus-in-WebM preferred (~32–64 kbps); Safari may use AAC/mp4. */
export const VOICE_NOTE_MAX_DURATION_SEC = 120;
export const VOICE_NOTE_MAX_BYTES = 1_572_864;

export function formatVoiceDurationLabel(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const secRem = s % 60;
  return `${m}:${secRem.toString().padStart(2, '0')}`;
}

/** File extension allowed by school_chat_finalize_voice (must match upload path). */
export function pickVoiceFileExtension(blob: Blob): 'webm' | 'm4a' | 'mp4' {
  const m = (blob.type || '').toLowerCase();
  if (m.includes('mp4') || m.includes('aac')) return 'mp4';
  if (m.includes('m4a')) return 'm4a';
  return 'webm';
}

function mapMessageRow(r: Record<string, unknown>): ChatMessageRow {
  const mk = r.msg_kind === 'voice' ? 'voice' : 'text';
  return {
    id: String(r.id),
    conversation_id: String(r.conversation_id),
    sender_id: String(r.sender_id),
    body: String(r.body ?? ''),
    created_at: String(r.created_at ?? ''),
    delivered_at: (r.delivered_at as string | null | undefined) ?? null,
    msg_kind: mk,
    audio_path: (r.audio_path as string | null | undefined) ?? null,
    audio_duration_sec:
      r.audio_duration_sec == null || r.audio_duration_sec === ''
        ? null
        : Number(r.audio_duration_sec),
  };
}

/**
 * Online: active session + recent visible-tab heartbeat (not logged out, not idle too long).
 * Otherwise show last-seen line using the same timestamp (from presence or sign-in fallback).
 */
export function formatChatPresence(
  lastSeenAtIso: string | null | undefined,
  sessionActive: boolean | null | undefined = true
): {
  online: boolean;
  label: string;
} {
  if (!lastSeenAtIso) return { online: false, label: '' };
  const t = new Date(lastSeenAtIso).getTime();
  if (Number.isNaN(t)) return { online: false, label: '' };
  const delta = Date.now() - t;

  const sessionOk = sessionActive !== false;
  const heartbeatRecent = delta >= 0 && delta < CHAT_PRESENCE_ONLINE_MS;
  const notLongIdle = delta < CHAT_PRESENCE_MAX_IDLE_MS;

  if (sessionOk && heartbeatRecent && notLongIdle) {
    return { online: true, label: 'Online' };
  }

  return { online: false, label: formatLastSeenSubtitle(lastSeenAtIso, delta) };
}

function mapEligibleRow(raw: Record<string, unknown>): EligibleChatUser {
  return {
    user_id: String(raw.user_id),
    name: String(raw.name ?? ''),
    role: String(raw.role ?? ''),
    email: String(raw.email ?? ''),
    last_seen_at: (raw.last_seen_at as string | null | undefined) ?? null,
    session_active: raw.session_active === true,
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
    peer_session_active: raw.peer_session_active === true,
  };
}

export async function fetchEligibleChatUsers(): Promise<EligibleChatUser[]> {
  const { data, error } = await supabase.rpc('school_chat_list_eligible_users');
  if (error) throw error;
  return (data || []).map((row: unknown) => mapEligibleRow(row as Record<string, unknown>));
}

export async function fetchMyConversations(): Promise<ChatConversationRow[]> {
  const { data, error } = await supabase.rpc('school_chat_my_conversations');
  if (error) throw error;
  return (data || []).map((row: unknown) => mapConversationRow(row as Record<string, unknown>));
}

/** Upsert activity while the user is using the app (visible tab). Sets session back to active after login. */
export async function pingChatPresence(schoolId: string): Promise<void> {
  if (!schoolId) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return;
  const { error } = await supabase.from('school_chat_presence').upsert(
    {
      user_id: user.id,
      school_id: schoolId,
      last_seen_at: new Date().toISOString(),
      session_active: true,
    },
    { onConflict: 'user_id' }
  );
  if (error && typeof import.meta !== 'undefined' && (import.meta as ImportMeta).env?.DEV) {
    console.warn('[schoolChatApi] pingChatPresence', error.message);
  }
}

/** Call immediately before supabase.auth.signOut() so peers see offline right away. */
export async function markChatPresenceOffline(): Promise<void> {
  const { error } = await supabase.rpc('school_chat_presence_go_offline');
  if (error && typeof import.meta !== 'undefined' && (import.meta as ImportMeta).env?.DEV) {
    console.warn('[schoolChatApi] markChatPresenceOffline', error.message);
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
    .select(
      'id, conversation_id, sender_id, body, created_at, delivered_at, msg_kind, audio_path, audio_duration_sec'
    )
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((row: unknown) => mapMessageRow(row as Record<string, unknown>));
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
      msg_kind: 'text',
    })
    .select(
      'id, conversation_id, sender_id, body, created_at, delivered_at, msg_kind, audio_path, audio_duration_sec'
    )
    .single();
  if (error) throw error;
  return mapMessageRow(data as Record<string, unknown>);
}

/**
 * Upload a short compressed voice blob (WebM/Opus or AAC/mp4). Retention: audio file ~2 days, row ~7 days.
 */
export async function sendVoiceMessage(
  conversationId: string,
  schoolId: string,
  audioBlob: Blob,
  durationSec: number
): Promise<ChatMessageRow | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) throw new Error('Not signed in');
  if (audioBlob.size > VOICE_NOTE_MAX_BYTES) {
    throw new Error('Recording is too large. Try a shorter message.');
  }
  const dur = Math.min(VOICE_NOTE_MAX_DURATION_SEC, Math.max(1, Math.round(durationSec)));
  const preview = `Voice message (${formatVoiceDurationLabel(dur)})`;
  const ext = pickVoiceFileExtension(audioBlob);
  const contentType =
    audioBlob.type ||
    (ext === 'webm' ? 'audio/webm' : ext === 'm4a' ? 'audio/mp4' : 'audio/mp4');

  const { data: ins, error: e1 } = await supabase
    .from('school_chat_messages')
    .insert({
      conversation_id: conversationId,
      school_id: schoolId,
      sender_id: user.id,
      body: preview,
      msg_kind: 'voice',
      audio_duration_sec: dur,
    })
    .select(
      'id, conversation_id, sender_id, body, created_at, delivered_at, msg_kind, audio_path, audio_duration_sec'
    )
    .single();

  if (e1) throw e1;
  const row = mapMessageRow(ins as Record<string, unknown>);
  const path = `${schoolId}/${row.id}.${ext}`;

  const { error: e2 } = await supabase.storage
    .from('school-chat-voice')
    .upload(path, audioBlob, { contentType, upsert: false });

  if (e2) {
    await supabase.from('school_chat_messages').delete().eq('id', row.id);
    throw e2;
  }

  const { error: e3 } = await supabase.rpc('school_chat_finalize_voice', {
    p_message_id: row.id,
    p_relative_path: path,
  });

  if (e3) {
    await supabase.storage.from('school-chat-voice').remove([path]);
    await supabase.from('school_chat_messages').delete().eq('id', row.id);
    throw e3;
  }

  return { ...row, audio_path: path };
}

export async function downloadVoiceBlob(audioPath: string): Promise<Blob | null> {
  const { data, error } = await supabase.storage.from('school-chat-voice').download(audioPath);
  if (error || !data) return null;
  return data;
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
        const r = payload.new as Record<string, unknown>;
        if (r?.id) onInsert(mapMessageRow(r));
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
        const r = payload.new as Record<string, unknown>;
        if (r?.id) onUpdate(mapMessageRow(r));
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

/** Live peer presence row (heartbeat + logout flag) for thread header. */
export function subscribeToPeerPresence(peerUserId: string, onChange: (p: ChatPeerPresence) => void) {
  const apply = (row: { last_seen_at?: string | null; session_active?: boolean | null } | undefined) => {
    if (!row) return;
    onChange({
      last_seen_at: row.last_seen_at ?? null,
      session_active: row.session_active ?? null,
    });
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
      (payload) => apply(payload.new as { last_seen_at?: string | null; session_active?: boolean | null })
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'school_chat_presence',
        filter: `user_id=eq.${peerUserId}`,
      },
      (payload) => apply(payload.new as { last_seen_at?: string | null; session_active?: boolean | null })
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
