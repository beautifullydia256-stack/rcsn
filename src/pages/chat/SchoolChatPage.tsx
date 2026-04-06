import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, MessageCircle, Mic, Paperclip, Search, Send, Smile, UserPlus, X } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import {
  fetchEligibleChatUsers,
  fetchMessages,
  fetchMyConversations,
  fetchPeerLastReadAt,
  getOrCreateDm,
  markConversationRead,
  markPeerMessagesDelivered,
  pingChatPresence,
  downloadVoiceBlob,
  sendMessage,
  sendVoiceMessage,
  subscribeToConversationMessages,
  subscribeToPeerLastRead,
  subscribeToPeerPresence,
  formatChatPresence,
  formatVoiceDurationLabel,
  VOICE_NOTE_MAX_DURATION_SEC,
  SCHOOL_CHAT_QK,
  schoolChatConversationsQueryKey,
  type ChatConversationRow,
  type ChatMessageRow,
  type EligibleChatUser,
} from '@/lib/schoolChatApi';

/** WhatsApp-style chat wallpaper (subtle pattern on #e5ddd5). */
const WA_CHAT_BG = `linear-gradient(rgba(229, 221, 213, 0.92), rgba(229, 221, 213, 0.92)),
  url("data:image/svg+xml,%3Csvg width='52' height='52' viewBox='0 0 52 52' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='%23d4ccc4' fill-opacity='0.35' d='M0 17h17V0H0v17zm17 35h17V35H17v17zM35 0v17h17V0H35z'/%3E%3C/svg%3E")`;

function dashboardHomeForRole(role: string | null): string {
  switch (role) {
    case 'admin':
      return '/dashboard/admin';
    case 'teacher':
      return '/dashboard/teacher';
    case 'student':
      return '/dashboard/student';
    case 'parent':
      return '/dashboard/parent';
    case 'accountant':
      return '/dashboard/accountant';
    case 'head_teacher':
      return '/dashboard/head-teacher';
    case 'owner':
      return '/dashboard/owner';
    case 'librarian':
      return '/dashboard/librarian';
    case 'lab_technician':
      return '/dashboard/lab-technician';
    case 'clinician':
      return '/dashboard/clinician';
    default:
      return '/dashboard';
  }
}

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    head_teacher: 'Head teacher',
    lab_technician: 'Lab technician',
    admin: 'Admin',
    accountant: 'Accountant',
    teacher: 'Teacher',
    parent: 'Parent',
    student: 'Student',
    owner: 'Owner',
    librarian: 'Librarian',
    clinician: 'Clinic',
  };
  return map[role] || role;
}

type ContactFilter = 'all' | 'teacher' | 'parent' | 'student';

function matchesContactFilter(userRole: string, f: ContactFilter): boolean {
  const r = (userRole || '').toLowerCase().trim();
  if (f === 'all') return true;
  if (f === 'teacher') return r === 'teacher' || r === 'head_teacher';
  if (f === 'parent') return r === 'parent';
  if (f === 'student') return r === 'student';
  return true;
}

function displayChatName(u: EligibleChatUser): string {
  const n = u.name?.trim();
  return n || u.email || 'User';
}

/** WhatsApp-style: one gray ✓ sent, two gray ✓✓ delivered, two blue ✓✓ read. */
function OutgoingDeliveryTicks({
  createdAt,
  deliveredAt,
  peerLastReadAt,
}: {
  createdAt: string;
  deliveredAt: string | null;
  peerLastReadAt: string | null;
}) {
  const tMsg = new Date(createdAt).getTime();
  const tRead = peerLastReadAt ? new Date(peerLastReadAt).getTime() : NaN;
  const read = Number.isFinite(tRead) && tRead >= tMsg - 1500;
  const delivered = deliveredAt != null && deliveredAt !== '';
  const colorClass = read ? 'text-[#53bdeb]' : 'text-[#8696a0]';
  if (read || delivered) {
    return (
      <span className={`select-none text-[13px] leading-[1] tracking-[-0.12em] ${colorClass}`} aria-label={read ? 'Read' : 'Delivered'}>
        ✓✓
      </span>
    );
  }
  return (
    <span className={`select-none text-[13px] leading-none ${colorClass}`} aria-label="Sent">
      ✓
    </span>
  );
}

function VoiceNoteBubble({ message: m }: { message: ChatMessageRow }) {
  const playable = m.msg_kind === 'voice' && !!m.audio_path;
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!playable || !m.audio_path) {
      setUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setLoading(false);
      return;
    }
    let dead = false;
    let created: string | null = null;
    setLoading(true);
    void downloadVoiceBlob(m.audio_path).then((blob) => {
      if (dead || !blob) {
        if (!dead) setLoading(false);
        return;
      }
      const u = URL.createObjectURL(blob);
      if (dead) {
        URL.revokeObjectURL(u);
        return;
      }
      created = u;
      setUrl(u);
      setLoading(false);
    });
    return () => {
      dead = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [m.id, m.audio_path, playable]);

  if (!playable) {
    return (
      <p className="whitespace-pre-wrap break-words text-[14.2px] leading-snug text-[#667781] italic pr-8">
        {m.body}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1 min-w-[200px] max-w-full pr-8">
      <div className="flex items-center gap-2">
        <span className="text-[#008069] shrink-0" aria-hidden>
          <Mic className="h-5 w-5" strokeWidth={2} />
        </span>
        {loading ? (
          <Loader2 className="h-7 w-7 animate-spin text-[#008069] shrink-0" aria-label="Loading voice message" />
        ) : (
          <audio src={url ?? undefined} controls preload="metadata" className="h-9 flex-1 max-w-[min(100%,260px)]" />
        )}
      </div>
      <span className="text-[11px] text-[#667781] tabular-nums">
        {formatVoiceDurationLabel(m.audio_duration_sec ?? 0)}
      </span>
    </div>
  );
}

export default function SchoolChatPage() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const role = useAuthStore((s) => s.role);
  const schoolId = useAuthStore((s) => s.schoolId);
  const myId = useAuthStore((s) => s.user?.id) ?? null;
  const [searchParams, setSearchParams] = useSearchParams();
  const withUserId = searchParams.get('with');

  const embedded = /\/(admin|teacher|parent|student|accountant)\/messages/.test(location.pathname);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [pickQ, setPickQ] = useState('');
  const [contactFilter, setContactFilter] = useState<ContactFilter>('all');
  const [mobileThread, setMobileThread] = useState(false);
  /** Shown in header until `fetchMyConversations` includes the new DM (avoids blank thread after New chat). */
  const [peerPreview, setPeerPreview] = useState<{
    name: string;
    role: string;
    user_id: string;
    last_seen_at: string | null;
    session_active: boolean;
  } | null>(null);
  /** Live merge of peer presence (RPC + realtime). */
  const [peerLastSeenAt, setPeerLastSeenAt] = useState<string | null>(null);
  const [peerSessionActive, setPeerSessionActive] = useState<boolean | null>(null);
  const [newChatError, setNewChatError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [peerLastReadAt, setPeerLastReadAt] = useState<string | null>(null);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [voiceUploading, setVoiceUploading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  /** Browser timer id; typed as number because DOM + merged Node timer types disagree on CI. */
  const voiceTickRef = useRef<number | null>(null);
  const recordStartRef = useRef(0);

  const home = dashboardHomeForRole(role);

  const { data: conversations = [], isLoading: loadingConv } = useQuery({
    queryKey: myId ? schoolChatConversationsQueryKey(myId) : (['school-chat', 'conversations', '__none'] as const),
    queryFn: fetchMyConversations,
    enabled: !!myId,
  });

  const { data: eligible = [], isLoading: loadingElig } = useQuery({
    queryKey: [...SCHOOL_CHAT_QK, 'eligible', myId],
    queryFn: fetchEligibleChatUsers,
    enabled: !!myId && newOpen,
  });

  const selectedConv = useMemo(
    () => conversations.find((c) => c.conversation_id === selectedId) ?? null,
    [conversations, selectedId]
  );

  useEffect(() => {
    if (selectedConv) setPeerPreview(null);
  }, [selectedConv]);

  useEffect(() => {
    setSendError(null);
    setPeerLastReadAt(null);
    setPeerSessionActive(null);
  }, [selectedId]);

  useEffect(() => {
    const ts = selectedConv?.peer_last_seen_at ?? peerPreview?.last_seen_at ?? null;
    const sa =
      selectedConv?.peer_session_active ?? peerPreview?.session_active ?? null;
    setPeerLastSeenAt(ts);
    setPeerSessionActive(sa);
  }, [
    selectedConv?.conversation_id,
    selectedConv?.peer_last_seen_at,
    selectedConv?.peer_session_active,
    peerPreview?.user_id,
    peerPreview?.last_seen_at,
    peerPreview?.session_active,
  ]);

  useEffect(() => {
    const uid = myId;
    if (!uid) return;
    const t = setInterval(() => {
      void queryClient.invalidateQueries({ queryKey: schoolChatConversationsQueryKey(uid) });
    }, 60_000);
    return () => clearInterval(t);
  }, [myId, queryClient]);

  useEffect(() => {
    const uid = myId;
    if (!uid) return;
    const onFocus = () => {
      void queryClient.invalidateQueries({ queryKey: schoolChatConversationsQueryKey(uid) });
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [myId, queryClient]);

  const loadThread = useCallback(
    async (conversationId: string) => {
      await markPeerMessagesDelivered(conversationId);
      const rows = await fetchMessages(conversationId);
      setMessages(rows);
      const peerRead = await fetchPeerLastReadAt(conversationId);
      setPeerLastReadAt(peerRead);
      await markConversationRead(conversationId);
      if (myId) void queryClient.invalidateQueries({ queryKey: schoolChatConversationsQueryKey(myId) });
    },
    [myId, queryClient]
  );

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    void loadThread(selectedId);
  }, [selectedId, loadThread]);

  useEffect(() => {
    const uid = myId;
    if (!selectedId || !uid) return;
    const unsub = subscribeToConversationMessages(
      selectedId,
      (row) => {
        setMessages((prev) => {
          const i = prev.findIndex((m) => m.id === row.id);
          if (i >= 0) {
            const merged = { ...prev[i], ...row, audio_path: row.audio_path ?? prev[i].audio_path };
            return prev.map((m, j) => (j === i ? merged : m));
          }
          return [...prev, row];
        });
        // Unread count uses last_read_at on the server. If we invalidate the list in parallel with
        // markConversationRead, the refetch often finishes before the UPDATE commits — badge stays wrong.
        void (async () => {
          if (row.sender_id !== uid) {
            try {
              await markConversationRead(selectedId);
            } catch (e) {
              console.error('[SchoolChatPage] mark read on live message', e);
            }
          }
          await queryClient.invalidateQueries({ queryKey: schoolChatConversationsQueryKey(uid) });
        })();
      },
      (row) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === row.id ? { ...m, ...row, audio_path: row.audio_path ?? m.audio_path } : m
          )
        );
      }
    );
    return unsub;
  }, [selectedId, myId, queryClient]);

  const peerUserId = selectedConv?.peer_user_id ?? peerPreview?.user_id ?? null;
  useEffect(() => {
    if (!peerUserId) return;
    return subscribeToPeerPresence(peerUserId, ({ last_seen_at, session_active }) => {
      setPeerLastSeenAt(last_seen_at);
      setPeerSessionActive(session_active);
    });
  }, [peerUserId]);

  useEffect(() => {
    if (!selectedId || !peerUserId) return;
    return subscribeToPeerLastRead(selectedId, peerUserId, (iso) => {
      setPeerLastReadAt(iso);
    });
  }, [selectedId, peerUserId]);

  useEffect(() => {
    const uid = myId;
    if (!withUserId || !uid) return;
    let cancelled = false;
    void (async () => {
      try {
        const cid = await getOrCreateDm(withUserId);
        if (cancelled) return;
        await queryClient.refetchQueries({ queryKey: schoolChatConversationsQueryKey(uid) });
        if (cancelled) return;
        setSelectedId(cid);
        setMobileThread(true);
        setSearchParams({}, { replace: true });
      } catch {
        setSearchParams({}, { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [withUserId, myId, setSearchParams, queryClient]);

  const filteredEligible = useMemo(() => {
    const byRole = eligible.filter((u) => matchesContactFilter(u.role, contactFilter));
    const q = pickQ.trim().toLowerCase();
    if (!q) return byRole;
    return byRole.filter(
      (u) =>
        (u.name || '').toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [eligible, pickQ, contactFilter]);

  const openNewConversation = async (u: EligibleChatUser) => {
    setSending(true);
    setNewChatError(null);
    setPeerPreview({
      name: displayChatName(u),
      role: u.role,
      user_id: u.user_id,
      last_seen_at: u.last_seen_at ?? null,
      session_active: u.session_active,
    });
    try {
      const cid = await getOrCreateDm(u.user_id);
      if (!cid || typeof cid !== 'string') {
        throw new Error('Could not create conversation. Try again.');
      }
      if (myId) await queryClient.refetchQueries({ queryKey: schoolChatConversationsQueryKey(myId) });
      closeNewChatModal();
      setSelectedId(cid);
      setMobileThread(true);
    } catch (e) {
      console.error('[SchoolChatPage] openNewConversation', e);
      setPeerPreview(null);
      const msg =
        e && typeof e === 'object' && 'message' in e && typeof (e as Error).message === 'string'
          ? (e as Error).message
          : 'Could not open chat. Check your connection or try again.';
      setNewChatError(msg);
    } finally {
      setSending(false);
    }
  };

  const closeNewChatModal = () => {
    setNewOpen(false);
    setPickQ('');
    setContactFilter('all');
    setNewChatError(null);
  };

  const cancelVoiceRecording = useCallback(() => {
    if (voiceTickRef.current) {
      clearInterval(voiceTickRef.current);
      voiceTickRef.current = null;
    }
    const rec = mediaRecorderRef.current;
    const stream = mediaStreamRef.current;
    mediaRecorderRef.current = null;
    mediaStreamRef.current = null;
    mediaChunksRef.current = [];
    if (stream) stream.getTracks().forEach((t) => t.stop());
    if (rec && rec.state !== 'inactive') {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    }
    setVoiceRecording(false);
    setVoiceSeconds(0);
  }, []);

  const finishRecordingAndSend = useCallback(async () => {
    if (voiceTickRef.current) {
      clearInterval(voiceTickRef.current);
      voiceTickRef.current = null;
    }
    const rec = mediaRecorderRef.current;
    const stream = mediaStreamRef.current;
    mediaRecorderRef.current = null;
    mediaStreamRef.current = null;
    if (stream) stream.getTracks().forEach((t) => t.stop());

    if (!rec || rec.state === 'inactive') {
      setVoiceRecording(false);
      setVoiceSeconds(0);
      return;
    }

    const chunks = [...mediaChunksRef.current];
    mediaChunksRef.current = [];
    const mime = rec.mimeType || 'audio/webm';

    await new Promise<void>((resolve) => {
      rec.onstop = () => resolve();
      rec.stop();
    });

    const durationSec = Math.max(0.5, (Date.now() - recordStartRef.current) / 1000);
    setVoiceRecording(false);
    setVoiceSeconds(0);

    const blob = new Blob(chunks, { type: mime });
    if (blob.size < 400) return;

    if (!selectedId || !schoolId) return;

    setVoiceUploading(true);
    setSendError(null);
    try {
      const row = await sendVoiceMessage(selectedId, schoolId, blob, durationSec);
      if (row) {
        setMessages((prev) => {
          const i = prev.findIndex((m) => m.id === row.id);
          if (i >= 0) {
            const merged = { ...prev[i], ...row, audio_path: row.audio_path ?? prev[i].audio_path };
            return prev.map((m, j) => (j === i ? merged : m));
          }
          return [...prev, row];
        });
      }
      if (myId) void queryClient.invalidateQueries({ queryKey: schoolChatConversationsQueryKey(myId) });
      void markConversationRead(selectedId);
      if (schoolId) void pingChatPresence(schoolId);
    } catch (err) {
      console.error('[SchoolChatPage] voice send', err);
      const msg =
        err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string'
          ? (err as { message: string }).message
          : 'Could not send voice note.';
      setSendError(msg);
    } finally {
      setVoiceUploading(false);
    }
  }, [selectedId, schoolId, myId, queryClient]);

  const startVoiceRecording = useCallback(async () => {
    if (!selectedId || !schoolId || sending || voiceUploading || voiceRecording) return;
    if (typeof window === 'undefined' || !window.MediaRecorder || !navigator.mediaDevices?.getUserMedia) {
      setSendError('Voice notes are not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
      const mime = types.find((t) => MediaRecorder.isTypeSupported(t));
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mediaChunksRef.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) mediaChunksRef.current.push(ev.data);
      };
      rec.start(250);
      mediaRecorderRef.current = rec;
      recordStartRef.current = Date.now();
      setVoiceSeconds(0);
      setVoiceRecording(true);
      if (voiceTickRef.current != null) clearInterval(voiceTickRef.current);
      voiceTickRef.current = window.setInterval(() => {
        const sec = Math.floor((Date.now() - recordStartRef.current) / 1000);
        setVoiceSeconds(sec);
        if (sec >= VOICE_NOTE_MAX_DURATION_SEC) {
          if (voiceTickRef.current != null) clearInterval(voiceTickRef.current);
          voiceTickRef.current = null;
          void finishRecordingAndSend();
        }
      }, 400) as unknown as number;
    } catch {
      setSendError('Could not access the microphone. Check browser permissions.');
    }
  }, [selectedId, schoolId, sending, voiceUploading, voiceRecording, finishRecordingAndSend]);

  useEffect(() => {
    return () => {
      if (voiceTickRef.current) clearInterval(voiceTickRef.current);
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      try {
        mediaRecorderRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedId || !schoolId || !draft.trim()) return;
    setSending(true);
    setSendError(null);
    try {
      const row = await sendMessage(selectedId, schoolId, draft);
      setDraft('');
      if (row) {
        setMessages((prev) => {
          const i = prev.findIndex((m) => m.id === row.id);
          if (i >= 0) {
            const merged = { ...prev[i], ...row, audio_path: row.audio_path ?? prev[i].audio_path };
            return prev.map((m, j) => (j === i ? merged : m));
          }
          return [...prev, row];
        });
      }
      if (myId) void queryClient.invalidateQueries({ queryKey: schoolChatConversationsQueryKey(myId) });
      void markConversationRead(selectedId);
      if (schoolId) void pingChatPresence(schoolId);
    } catch (err) {
      console.error('[SchoolChatPage] send', err);
      const msg =
        err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string'
          ? (err as { message: string }).message
          : 'Could not send message.';
      setSendError(msg);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatMsgTime = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className={`wa-root flex flex-col min-h-0 w-full ${embedded ? 'flex-1 h-full max-h-[100dvh]' : 'min-h-[calc(100vh-2rem)]'}`}
      style={{ fontFamily: 'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}
    >
      <style>{`
        .wa-root { --wa-header: #075e54; --wa-header-light: #008069; --wa-in: #ffffff; --wa-out: #d9fdd3; --wa-list: #f0f2f5; --wa-border: #e9edef; }
        .wa-sidebar-item:hover { background: #f5f6f6; }
        .wa-sidebar-item.wa-active { background: #ebebeb; }
        .wa-input::placeholder { color: #8696a0; }
        /* Scroll without visible scrollbar (wheel / touch / trackpad still work). */
        .wa-scroll-y {
          overflow-y: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .wa-scroll-y::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
      `}</style>

      {!embedded && (
        <header className="flex flex-wrap items-center gap-3 border-b px-4 py-3 shrink-0 bg-white text-slate-900 border-slate-200">
          <Link to={home} className="inline-flex items-center gap-1.5 text-sm font-medium text-[#008069] hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <MessageCircle className="h-6 w-6 text-[#008069] shrink-0" />
            <div className="min-w-0">
              <h1 className="text-lg font-bold truncate">School messages</h1>
              <p className="text-xs text-slate-500 truncate">People you are allowed to contact at your school.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setContactFilter('all');
              setPickQ('');
              setNewChatError(null);
              setNewOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-[#008069] px-3 py-2 text-sm font-semibold text-white shadow hover:bg-[#006b58]"
          >
            <UserPlus className="h-4 w-4" />
            New chat
          </button>
        </header>
      )}

      {embedded && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 shrink-0 border-b border-[var(--wa-border)] bg-[var(--wa-list)]">
          <div className="flex items-center gap-2 min-w-0">
            <MessageCircle className="h-6 w-6 text-[#54656f] shrink-0" />
            <div>
              <h1 className="text-[17px] font-semibold text-[#111b21] leading-tight">Messages</h1>
              <p className="text-[12px] text-[#667781]">School chat</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setContactFilter('all');
              setPickQ('');
              setNewChatError(null);
              setNewOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#008069] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#006b58] shadow-sm"
          >
            <UserPlus className="h-4 w-4" />
            New chat
          </button>
        </div>
      )}

      <div className="flex flex-1 min-h-0 border-t border-[var(--wa-border)]">
        {/* Chat list — WhatsApp left column */}
        <aside
          className={`${
            mobileThread ? 'hidden md:flex' : 'flex'
          } w-full md:w-[min(100%,380px)] md:max-w-[40%] flex-col border-r border-[var(--wa-border)] bg-[var(--wa-list)] shrink-0`}
        >
          <div className="p-2 border-b border-[var(--wa-border)] bg-[var(--wa-list)]">
            <div className="relative rounded-lg bg-white flex items-center px-3 py-1.5 border border-[var(--wa-border)]">
              <Search className="h-4 w-4 text-[#8696a0] shrink-0 mr-2" />
              <input
                type="search"
                readOnly
                placeholder="Search or start new chat"
                className="w-full text-[14px] text-[#3b4a54] bg-transparent border-0 outline-none placeholder:text-[#8696a0] cursor-default"
                aria-hidden
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto wa-scroll-y">
            {loadingConv && <p className="p-4 text-[14px] text-[#667781]">Loading…</p>}
            {!loadingConv && conversations.length === 0 && (
              <p className="p-4 text-[14px] text-[#667781]">No chats yet. Tap <strong>New chat</strong>.</p>
            )}
            {conversations.map((c: ChatConversationRow) => (
              <button
                key={c.conversation_id}
                type="button"
                onClick={() => {
                  setSelectedId(c.conversation_id);
                  setMobileThread(true);
                }}
                className={`wa-sidebar-item w-full text-left px-3 py-2.5 border-b border-[var(--wa-border)] flex gap-3 transition-colors ${
                  selectedId === c.conversation_id ? 'wa-active' : ''
                }`}
              >
                <div className="relative shrink-0">
                  <div
                    className="h-12 w-12 rounded-full flex items-center justify-center text-white text-[15px] font-medium"
                    style={{ background: 'linear-gradient(180deg, #6b7c85, #54656f)' }}
                  >
                    {(c.peer_name || '?').slice(0, 1).toUpperCase()}
                  </div>
                  {formatChatPresence(c.peer_last_seen_at, c.peer_session_active).online && (
                    <span
                      className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-[#25d366] border-2 border-[var(--wa-list)]"
                      aria-hidden
                      title="Online"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2 items-baseline">
                    <span className="font-medium text-[#111b21] text-[16px] truncate">{c.peer_name}</span>
                    <span className="text-[11px] text-[#667781] shrink-0 whitespace-nowrap">{formatTime(c.last_at)}</span>
                  </div>
                  <div className="text-[12px] text-[#667781] truncate">{roleLabel(c.peer_role)}</div>
                  <div className="flex justify-between gap-2 items-center mt-0.5">
                    <span className="text-[14px] text-[#667781] truncate">{c.last_body || ' '}</span>
                    {c.unread_count > 0 && (
                      <span className="shrink-0 rounded-full bg-[#25d366] text-white text-[11px] font-semibold min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Thread — WhatsApp right column */}
        <section
          className={`${!mobileThread ? 'hidden md:flex' : 'flex'} flex-1 flex-col min-h-0 bg-[#efeae2]`}
        >
          <div className="md:hidden flex items-center gap-2 border-b border-[var(--wa-border)] px-2 py-2 shrink-0 bg-[var(--wa-header)] text-white">
            <button
              type="button"
              className="p-2 rounded-full hover:bg-white/10"
              onClick={() => setMobileThread(false)}
              aria-label="Back to chats"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="text-[16px] font-medium truncate">
                {selectedConv?.peer_name || peerPreview?.name || 'Chat'}
              </div>
              {(() => {
                const p = formatChatPresence(peerLastSeenAt, peerSessionActive);
                const roleStr = roleLabel(selectedConv?.peer_role ?? peerPreview?.role ?? '');
                if (p.online) {
                  return (
                    <div className="text-[12px] text-emerald-200 truncate">
                      {roleStr} · Online
                    </div>
                  );
                }
                if (p.label) {
                  return (
                    <div className="text-[12px] text-white/75 truncate">
                      {roleStr} · {p.label}
                    </div>
                  );
                }
                return <div className="text-[12px] text-white/75 truncate">{roleStr}</div>;
              })()}
            </div>
          </div>

          {!selectedId && (
            <div
              className="hidden md:flex flex-1 flex-col items-center justify-center p-8 text-center border-l border-[var(--wa-border)]"
              style={{ background: WA_CHAT_BG }}
            >
              <div className="max-w-sm rounded-lg bg-white/90 px-6 py-8 shadow-sm border border-[var(--wa-border)]">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 text-[#8696a0]" strokeWidth={1.25} />
                <p className="text-[20px] font-light text-[#41525d]">PwezaCore Web</p>
                <p className="text-[14px] text-[#667781] mt-2">
                  Select a conversation to start messaging, or start a new chat.
                </p>
              </div>
            </div>
          )}

          {selectedId && (selectedConv || peerPreview) && (
            <>
              <div className="hidden md:flex items-center gap-3 px-4 py-2.5 shrink-0 border-b border-[var(--wa-border)] bg-[var(--wa-header)] text-white">
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center text-[15px] font-medium bg-white/20"
                  aria-hidden
                >
                  {((selectedConv?.peer_name || peerPreview?.name) ?? '?').slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-[16px] truncate">
                    {selectedConv?.peer_name ?? peerPreview?.name ?? 'Chat'}
                  </div>
                  <div className="text-[13px] text-white/80 truncate">
                    {(() => {
                      const p = formatChatPresence(peerLastSeenAt, peerSessionActive);
                      const roleStr = roleLabel(selectedConv?.peer_role ?? peerPreview?.role ?? '');
                      if (p.online) {
                        return (
                          <>
                            {roleStr} · <span className="text-emerald-200">Online</span>
                          </>
                        );
                      }
                      if (p.label) {
                        return (
                          <>
                            {roleStr} · <span className="text-white/75">{p.label}</span>
                          </>
                        );
                      }
                      return roleStr;
                    })()}
                  </div>
                </div>
              </div>

              <div
                className="flex-1 overflow-y-auto wa-scroll-y px-[4%] py-3 space-y-1"
                style={{ background: WA_CHAT_BG }}
              >
                {messages.map((m) => {
                  const mine = m.sender_id === myId;
                  return (
                    <div key={m.id} className={`flex w-full ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[75%] sm:max-w-[65%] rounded-lg px-2 py-1.5 pb-5 shadow-sm relative ${
                          mine
                            ? 'rounded-br-none bg-[var(--wa-out)] text-[#111b21]'
                            : 'rounded-bl-none bg-[var(--wa-in)] text-[#111b21] border border-[#e9edef]'
                        }`}
                      >
                        {m.msg_kind === 'voice' ? (
                          <VoiceNoteBubble message={m} />
                        ) : (
                          <p
                            className={`whitespace-pre-wrap break-words text-[14.2px] leading-snug ${mine ? 'pr-[4.5rem]' : 'pr-12'}`}
                          >
                            {m.body}
                          </p>
                        )}
                        <div className="absolute bottom-1 right-2 flex items-center gap-1">
                          <span className={`text-[11px] tabular-nums ${mine ? 'text-[#667781]' : 'text-[#667781]'}`}>
                            {formatMsgTime(m.created_at)}
                          </span>
                          {mine && (
                            <OutgoingDeliveryTicks
                              createdAt={m.created_at}
                              deliveredAt={m.delivered_at ?? null}
                              peerLastReadAt={peerLastReadAt}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {sendError && (
                <div
                  className="shrink-0 px-3 py-2 text-[13px] text-red-800 bg-red-50 border-t border-red-100"
                  role="alert"
                >
                  {sendError}
                </div>
              )}

              <form
                onSubmit={handleSend}
                className="flex items-end gap-2 px-3 py-2 shrink-0 border-t border-[var(--wa-border)] bg-[#f0f2f5]"
              >
                {!voiceRecording && (
                  <>
                    <button
                      type="button"
                      className="p-2 text-[#8696a0] hover:text-[#54656f] rounded-full hidden sm:block"
                      aria-label="Emoji"
                    >
                      <Smile className="h-6 w-6" />
                    </button>
                    <button
                      type="button"
                      className="p-2 text-[#8696a0] hover:text-[#54656f] rounded-full hidden sm:block"
                      aria-label="Attach"
                    >
                      <Paperclip className="h-6 w-6" />
                    </button>
                  </>
                )}
                {voiceRecording ? (
                  <>
                    <div className="flex-1 flex items-center gap-2 rounded-lg bg-white border border-[var(--wa-border)] min-h-[42px] px-3 py-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse shrink-0"
                        aria-hidden
                      />
                      <span className="text-[15px] font-semibold tabular-nums text-[#111b21] shrink-0">
                        {formatVoiceDurationLabel(voiceSeconds)}
                      </span>
                      <span className="text-[13px] text-[#667781] truncate flex-1">Recording… tap send to finish</span>
                      <button
                        type="button"
                        className="text-[13px] font-semibold text-[#c0392b] hover:underline shrink-0 px-1"
                        onClick={cancelVoiceRecording}
                      >
                        Cancel
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={voiceUploading}
                      onClick={() => void finishRecordingAndSend()}
                      className="p-3 rounded-full bg-[#008069] text-white hover:bg-[#006b58] disabled:opacity-40 shadow-sm"
                      aria-label="Send voice note"
                    >
                      {voiceUploading ? (
                        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 rounded-lg bg-white border border-[var(--wa-border)] flex items-center min-h-[42px] px-3">
                      <input
                        className="flex-1 wa-input bg-transparent border-0 text-[15px] text-[#111b21] outline-none py-2 placeholder:text-[#8696a0]"
                        placeholder="Type a message"
                        value={draft}
                        onChange={(e) => {
                          setDraft(e.target.value);
                          if (sendError) setSendError(null);
                        }}
                        disabled={sending || voiceUploading}
                      />
                    </div>
                    {draft.trim() ? (
                      <button
                        type="submit"
                        disabled={sending || voiceUploading}
                        className="p-3 rounded-full bg-[#008069] text-white hover:bg-[#006b58] disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                        aria-label="Send"
                      >
                        <Send className="h-5 w-5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!selectedId || !schoolId || sending || voiceUploading}
                        onClick={() => void startVoiceRecording()}
                        className="p-3 rounded-full bg-[#008069] text-white hover:bg-[#006b58] disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                        aria-label="Record voice note"
                        title="Voice message"
                      >
                        <Mic className="h-5 w-5" />
                      </button>
                    )}
                  </>
                )}
              </form>
            </>
          )}
        </section>
      </div>

      {typeof document !== 'undefined' &&
        newOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 pointer-events-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-chat-title"
            onClick={closeNewChatModal}
          >
            <div
              className="w-full max-w-lg rounded-xl bg-white shadow-2xl max-h-[85vh] flex flex-col border border-[var(--wa-border)] pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[var(--wa-border)] px-4 py-3 bg-[#f0f2f5]">
                <h2 id="new-chat-title" className="font-semibold text-[#111b21]">
                  New chat
                </h2>
                <button type="button" className="p-1.5 rounded-full hover:bg-black/5 text-[#54656f]" onClick={closeNewChatModal}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              {newChatError && (
                <div className="mx-3 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800" role="alert">
                  {newChatError}
                </div>
              )}
              <div className="p-3 border-b border-[var(--wa-border)] space-y-3">
              <div className="relative rounded-lg bg-[#f0f2f5] flex items-center px-3 py-2">
                <Search className="absolute left-5 h-4 w-4 text-[#8696a0]" />
                <input
                  className="w-full rounded-lg bg-white border border-[var(--wa-border)] py-2 pl-9 pr-3 text-[14px] outline-none focus:border-[#008069]"
                  placeholder="Search name or email…"
                  value={pickQ}
                  onChange={(e) => setPickQ(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by role">
                {(
                  [
                    { id: 'all' as const, label: 'All' },
                    { id: 'teacher' as const, label: 'Teachers' },
                    { id: 'parent' as const, label: 'Parents' },
                    { id: 'student' as const, label: 'Students' },
                  ] as const
                ).map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setContactFilter(id)}
                    className={`rounded-full px-3 py-1.5 text-[13px] font-medium border transition-colors ${
                      contactFilter === id
                        ? 'bg-[#008069] text-white border-[#008069]'
                        : 'bg-white text-[#54656f] border-[var(--wa-border)] hover:bg-[#f5f6f6]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto wa-scroll-y p-2">
              {loadingElig && <p className="p-3 text-[14px] text-[#667781]">Loading contacts…</p>}
              {!loadingElig &&
                filteredEligible.map((u) => {
                  const pres = formatChatPresence(u.last_seen_at, u.session_active);
                  return (
                    <button
                      key={u.user_id}
                      type="button"
                      disabled={sending}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void openNewConversation(u);
                      }}
                      className="w-full text-left rounded-lg px-3 py-3 hover:bg-[#f5f6f6] flex gap-3 items-center disabled:opacity-60"
                    >
                      <div className="relative h-12 w-12 shrink-0 rounded-full bg-[#dfe5e7] flex items-center justify-center text-[#54656f] font-medium">
                        {displayChatName(u).slice(0, 1).toUpperCase()}
                        {pres.online && (
                          <span
                            className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[#25d366] border-2 border-white"
                            aria-hidden
                            title="Online"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-[#111b21]">{displayChatName(u)}</div>
                        <div className="text-[13px] text-[#667781] truncate">
                          {roleLabel(u.role)} · {u.email}
                        </div>
                        {!pres.online && pres.label && (
                          <div className="text-[12px] text-[#8696a0] truncate">{pres.label}</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              {!loadingElig && filteredEligible.length === 0 && (
                <p className="p-4 text-[14px] text-[#667781]">No contacts match filters or search.</p>
              )}
            </div>
          </div>
        </div>,
          document.body
        )}
    </div>
  );
}
