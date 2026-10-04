import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Loader2,
  MessageCircle,
  Mic,
  Paperclip,
  Pause,
  Play,
  Search,
  Send,
  Smile,
  UserPlus,
  X,
  Check,
  CheckCheck,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
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

/** WhatsApp Web–style dark chat wallpaper (subtle doodle on #0b141a). */
const WA_CHAT_BG_DARK = `linear-gradient(rgba(11, 20, 26, 0.97), rgba(11, 20, 26, 0.97)),
  url("data:image/svg+xml,%3Csvg width='52' height='52' viewBox='0 0 52 52' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='%231f2c34' fill-opacity='0.45' d='M0 17h17V0H0v17zm17 35h17V35H17v17zM35 0v17h17V0H35z'/%3E%3C/svg%3E")`;

/** WhatsApp Web–style light chat wallpaper (subtle doodle on #efeae2). */
const WA_CHAT_BG_LIGHT = `linear-gradient(rgba(239, 234, 226, 0.94), rgba(239, 234, 226, 0.94)),
  url("data:image/svg+xml,%3Csvg width='52' height='52' viewBox='0 0 52 52' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='%23d1d7db' fill-opacity='0.45' d='M0 17h17V0H0v17zm17 35h17V35H17v17zM35 0v17h17V0H35z'/%3E%3C/svg%3E")`;

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
    case 'deputy_head_teacher':
    case 'dos':
    case 'deputy_dos':
      return '/dashboard/academic-registrar';
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
    head_teacher: 'Academic Registrar',
    dos: 'Academic Registrar',
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

/** WhatsApp-style delivery ticks: sent, delivered, read. */
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
      <CheckCheck className={`w-3.5 h-3.5 inline shrink-0 ${colorClass}`} aria-label={read ? 'Read' : 'Delivered'} />
    );
  }
  return (
    <Check className={`w-3.5 h-3.5 inline shrink-0 ${colorClass}`} aria-label="Sent" />
  );
}

const VOICE_WAVE_BARS = 52;

/** Single active voice player in the thread (WhatsApp-style: starting one stops another). */
let activeSchoolChatVoiceEl: HTMLAudioElement | null = null;

function prepareSchoolChatVoicePlay(next: HTMLAudioElement) {
  if (activeSchoolChatVoiceEl === next) return;
  const prev = activeSchoolChatVoiceEl;
  activeSchoolChatVoiceEl = next;
  if (prev && prev !== next) {
    prev.pause();
  }
}

function releaseSchoolChatVoiceIfCurrent(el: HTMLAudioElement | null) {
  if (el && activeSchoolChatVoiceEl === el) {
    activeSchoolChatVoiceEl = null;
  }
}

function hashToWaveHeights(seed: string): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Array.from({ length: VOICE_WAVE_BARS }, (_, i) => {
    const t = (i + 1) * 0.812 + (h & 0xffff) * 0.0001;
    const v = Math.sin(t) * 0.5 + 0.5;
    return 0.28 + v * 0.72;
  });
}

function VoiceNoteBubble({
  message: m,
  mine,
  avatarLetter,
}: {
  message: ChatMessageRow;
  mine: boolean;
  avatarLetter: string;
}) {
  const playable = m.msg_kind === 'voice' && !!m.audio_path;
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(Math.max(0, m.audio_duration_sec ?? 0));
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const seekRef = useRef<HTMLDivElement | null>(null);

  const waveHeights = useMemo(() => hashToWaveHeights(m.id), [m.id]);
  const metaDuration = m.audio_duration_sec ?? 0;
  const effectiveDuration = Math.max(duration, metaDuration, 0.001);
  const progress = Math.min(1, Math.max(0, currentTime / effectiveDuration));

  useEffect(() => {
    if (!playable || !m.audio_path) {
      setUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setLoading(false);
      setPlaying(false);
      setCurrentTime(0);
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

  useEffect(() => {
    return () => {
      const a = audioRef.current;
      if (a && activeSchoolChatVoiceEl === a) {
        activeSchoolChatVoiceEl = null;
        a.pause();
      }
    };
  }, []);

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a || !url) return;
    if (a.paused) {
      prepareSchoolChatVoicePlay(a);
      void a.play().catch(() => {
        releaseSchoolChatVoiceIfCurrent(a);
        setPlaying(false);
      });
    } else {
      a.pause();
    }
  }, [url]);

  const seekFromPointer = useCallback(
    (clientX: number) => {
      const el = seekRef.current;
      const a = audioRef.current;
      if (!el || !a || !Number.isFinite(effectiveDuration)) return;
      const rect = el.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      a.currentTime = ratio * effectiveDuration;
      setCurrentTime(a.currentTime);
    },
    [effectiveDuration]
  );

  const barPlayedColor = mine ? 'rgba(146, 201, 176, 0.95)' : 'rgba(169, 186, 194, 0.85)';
  const barUnplayedColor = mine ? 'rgba(146, 201, 176, 0.28)' : 'rgba(169, 186, 194, 0.22)';
  const avatarClass = mine
    ? 'bg-gradient-to-br from-[#6b8f7c] to-[#4a6b5a] text-white'
    : 'bg-gradient-to-br from-[#9ca8b8] to-[#6b7c85] text-white';
  const letter = (avatarLetter || '?').slice(0, 1).toUpperCase();

  if (!playable) {
    return (
      <p className="whitespace-pre-wrap break-words text-[14.2px] leading-snug text-[var(--wa-text-secondary)] italic pr-8">
        {m.body}
      </p>
    );
  }

  const durationLabel = formatVoiceDurationLabel(
    Math.round(metaDuration > 0 ? metaDuration : effectiveDuration)
  );

  return (
    <div className="flex w-full min-w-0 max-w-full items-center gap-2 overflow-hidden pr-9">
      <audio
        ref={audioRef}
        src={url ?? undefined}
        preload="metadata"
        className="hidden"
        onPlay={() => setPlaying(true)}
        onPause={(e) => {
          setPlaying(false);
          releaseSchoolChatVoiceIfCurrent(e.currentTarget);
        }}
        onEnded={(e) => {
          setPlaying(false);
          setCurrentTime(0);
          releaseSchoolChatVoiceIfCurrent(e.currentTarget);
        }}
        onTimeUpdate={() => {
          const a = audioRef.current;
          if (a) setCurrentTime(a.currentTime);
        }}
        onLoadedMetadata={() => {
          const a = audioRef.current;
          if (a && Number.isFinite(a.duration) && a.duration > 0) {
            setDuration(a.duration);
          }
        }}
      />
      <div className="relative h-8 w-8 shrink-0">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-semibold shadow-sm ${avatarClass}`}
          aria-hidden
        >
          {letter}
        </div>
        <div
          className="absolute -bottom-px -right-px flex h-[14px] w-[14px] items-center justify-center rounded-full border border-[var(--wa-border)] bg-[var(--wa-surface)] shadow-sm"
          aria-hidden
        >
          <Mic className="h-2 w-2 text-[var(--wa-text-secondary)]" strokeWidth={2.25} />
        </div>
      </div>
      {loading ? (
        <Loader2 className="h-7 w-7 shrink-0 animate-spin text-[#00a884]" aria-label="Loading voice message" />
      ) : (
        <>
          <button
            type="button"
            onClick={togglePlay}
            disabled={!url}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--wa-text)] transition-colors hover:bg-black/10 dark:hover:bg-white/12 disabled:opacity-40"
            aria-label={playing ? 'Pause voice message' : 'Play voice message'}
          >
            {playing ? (
              <Pause className="h-4 w-4 fill-current" fill="currentColor" />
            ) : (
              <Play className="h-4 w-4 translate-x-px fill-current" fill="currentColor" />
            )}
          </button>
          {/* Center: waveform + scrub (between play and right edge). */}
          <div
            ref={seekRef}
            role="slider"
            tabIndex={0}
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="flex min-w-0 flex-1 cursor-pointer flex-col justify-center gap-0.5 py-0.5 select-none"
            onClick={(e) => seekFromPointer(e.clientX)}
            onKeyDown={(e) => {
              if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
              e.preventDefault();
              const a = audioRef.current;
              if (!a) return;
              const step = effectiveDuration * 0.05;
              a.currentTime = Math.max(0, Math.min(effectiveDuration, a.currentTime + (e.key === 'ArrowRight' ? step : -step)));
              setCurrentTime(a.currentTime);
            }}
          >
            <div className="flex h-3 min-w-0 w-full items-end gap-px px-px">
              {waveHeights.map((rh, i) => {
                const played = (i + 0.5) / waveHeights.length <= progress;
                const hPct = Math.round(rh * 100);
                return (
                  <div
                    key={i}
                    className="min-w-0 flex-1 basis-0 rounded-full"
                    style={{
                      height: `${hPct}%`,
                      minHeight: 2,
                      maxWidth: '100%',
                      backgroundColor: played ? barPlayedColor : barUnplayedColor,
                    }}
                  />
                );
              })}
            </div>
            <div className="relative mx-px h-0.5 min-w-0 w-full overflow-hidden rounded-full bg-white/14">
              <div
                className={`absolute inset-y-0 left-0 rounded-full ${mine ? 'bg-[#62c6a9]' : 'bg-[#00a884]'}`}
                style={{ width: `${progress * 100}%` }}
              />
              <div
                className={`absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/90 shadow-sm ${mine ? 'bg-[#62c6a9]' : 'bg-[#00a884]'}`}
                style={{ left: `${progress * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-medium tabular-nums leading-none text-[var(--wa-text-secondary)]">
              {durationLabel}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export default function SchoolChatPage() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const role = useAuthStore((s) => s.role);
  const schoolId = useAuthStore((s) => s.schoolId);
  const user = useAuthStore((s) => s.user);
  const myId = user?.id ?? null;
  const myVoiceInitial = useMemo(() => {
    const n = (user?.user_metadata?.name as string | undefined)?.trim();
    const a = n?.charAt(0) || user?.email?.trim()?.charAt(0);
    return (a || 'Y').toUpperCase();
  }, [user?.user_metadata?.name, user?.email]);
  const [searchParams, setSearchParams] = useSearchParams();
  const withUserId = searchParams.get('with');

  const embedded = /\/(admin|teacher|parent|student|accountant)\/messages/.test(location.pathname);
  const uiTheme = useUIStore((s) => s.theme);
  const isDark = uiTheme === 'dark';
  const chatBg = isDark ? WA_CHAT_BG_DARK : WA_CHAT_BG_LIGHT;

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

  const peerVoiceInitial = useMemo(
    () => ((selectedConv?.peer_name || peerPreview?.name || '?').trim().charAt(0) || '?').toUpperCase(),
    [selectedConv?.peer_name, peerPreview?.name]
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
      className={`wa-root flex flex-col min-h-0 w-full bg-[var(--wa-list)] text-[var(--wa-text)] ${embedded ? 'flex-1 h-full max-h-[100dvh]' : 'min-h-[calc(100vh-2rem)]'}`}
      data-theme={uiTheme}
      style={{ fontFamily: 'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}
    >
      <style>{`
        /* Default / Light theme (WhatsApp Web signature Light mode) */
        :root,
        body,
        .wa-root,
        .wa-modal-backdrop,
        .wa-root[data-theme="light"],
        html.light .wa-root,
        html.light .wa-modal-backdrop,
        [data-theme="light"] {
          --wa-header: #f0f2f5;
          --wa-header-light: #008069;
          --wa-in: #ffffff;
          --wa-out: #d9fdd3;
          --wa-list: #ffffff;
          --wa-border: #e9edef;
          --wa-page-bg: #efeae2;
          --wa-text: #111b21;
          --wa-text-secondary: #667781;
          --wa-surface: #f0f2f5;
          --wa-input-bar: #f0f2f5;
          --wa-input-bg: #ffffff;
          --wa-modal-surface: #ffffff;
          --wa-bubble-meta-out: #667781;
          --wa-bubble-meta-in: #667781;
          --wa-item-hover: #f5f6f6;
          --wa-item-active: #ebebeb;
          --wa-avatar-bg: #dfe5e7;
        }

        /* Dark theme (WhatsApp Web signature Dark mode) */
        html.dark,
        html.dark body,
        html.dark .wa-root,
        html.dark .wa-modal-backdrop,
        .wa-root[data-theme="dark"],
        .wa-modal-backdrop[data-theme="dark"],
        [data-theme="dark"] {
          --wa-header: #202c33;
          --wa-header-light: #00a884;
          --wa-in: #202c33;
          --wa-out: #005c4b;
          --wa-list: #111b21;
          --wa-border: #2a3942;
          --wa-page-bg: #0b141a;
          --wa-text: #e9edef;
          --wa-text-secondary: #8696a0;
          --wa-surface: #2a3942;
          --wa-input-bar: #202c33;
          --wa-input-bg: #2a3942;
          --wa-modal-surface: #202c33;
          --wa-bubble-meta-out: #92c9b0;
          --wa-bubble-meta-in: #8696a0;
          --wa-item-hover: #202c33;
          --wa-item-active: #2a3942;
          --wa-avatar-bg: #3d4f5c;
        }

        .wa-sidebar-item:hover { background: var(--wa-item-hover); }
        .wa-sidebar-item.wa-active { background: var(--wa-item-active); }
        .wa-input::placeholder { color: var(--wa-text-secondary); }
        .wa-root .wa-input:focus,
        .wa-root .wa-input:focus-visible,
        .wa-root .wa-input:active {
          outline: none !important;
          box-shadow: none !important;
          border-color: transparent !important;
        }
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
        <header className={`${mobileThread ? 'hidden md:flex' : 'flex'} flex-wrap items-center gap-3 border-b px-4 py-3 shrink-0 bg-[var(--wa-list)] text-[var(--wa-text)] border-[var(--wa-border)]`}>
          <Link
            to={home}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--wa-header-light)] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <MessageCircle className="h-6 w-6 text-[var(--wa-header-light)] shrink-0" />
            <div className="min-w-0">
              <h1 className="text-lg font-bold truncate">School messages</h1>
              <p className="text-xs text-[var(--wa-text-secondary)] truncate">
                People you are allowed to contact at your school.
              </p>
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
        <div className={`${mobileThread ? 'hidden md:flex' : 'flex'} items-center justify-between gap-3 px-4 py-3 shrink-0 border-b border-[var(--wa-border)] bg-[var(--wa-list)]`}>
          <div className="flex items-center gap-2 min-w-0">
            <MessageCircle className="h-6 w-6 text-[var(--wa-text-secondary)] shrink-0" />
            <div>
              <h1 className="text-[17px] font-semibold text-[var(--wa-text)] leading-tight">Messages</h1>
              <p className="text-[12px] text-[var(--wa-text-secondary)]">School chat</p>
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
            <div className="relative rounded-lg bg-[var(--wa-surface)] flex items-center px-3 py-1.5 border border-[var(--wa-border)]">
              <Search className="h-4 w-4 text-[var(--wa-text-secondary)] shrink-0 mr-2" />
              <input
                type="search"
                readOnly
                placeholder="Search or start new chat"
                className="w-full text-[14px] text-[var(--wa-text)] bg-transparent border-0 outline-none placeholder:text-[var(--wa-text-secondary)] cursor-default"
                aria-hidden
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto wa-scroll-y">
            {loadingConv && <p className="p-4 text-[14px] text-[var(--wa-text-secondary)]">Loading…</p>}
            {!loadingConv && conversations.length === 0 && (
              <p className="p-4 text-[14px] text-[var(--wa-text-secondary)]">
                No chats yet. Tap <strong className="text-[var(--wa-text)]">New chat</strong>.
              </p>
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
                    <span className="font-medium text-[var(--wa-text)] text-[16px] truncate">{c.peer_name}</span>
                    <span className="text-[11px] text-[var(--wa-text-secondary)] shrink-0 whitespace-nowrap">
                      {formatTime(c.last_at)}
                    </span>
                  </div>
                  <div className="text-[12px] text-[var(--wa-text-secondary)] truncate">{roleLabel(c.peer_role)}</div>
                  <div className="flex justify-between gap-2 items-center mt-0.5">
                    <span className="text-[14px] text-[var(--wa-text-secondary)] truncate">{c.last_body || ' '}</span>
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
          className={`${!mobileThread ? 'hidden md:flex' : 'flex'} flex-1 flex-col min-h-0 bg-[var(--wa-page-bg)]`}
        >
          <div className="md:hidden flex items-center gap-2 border-b border-[var(--wa-border)] px-2 py-2 shrink-0 bg-[var(--wa-header)] text-[var(--wa-text)]">
            <button
              type="button"
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[var(--wa-text)]"
              onClick={() => setMobileThread(false)}
              aria-label="Back to chats"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="text-[16px] font-medium truncate text-[var(--wa-text)]">
                {selectedConv?.peer_name || peerPreview?.name || 'Chat'}
              </div>
              {(() => {
                const p = formatChatPresence(peerLastSeenAt, peerSessionActive);
                const roleStr = roleLabel(selectedConv?.peer_role ?? peerPreview?.role ?? '');
                if (p.online) {
                  return (
                    <div className="text-[12px] text-emerald-600 dark:text-emerald-300 truncate">
                      {roleStr} · Online
                    </div>
                  );
                }
                if (p.label) {
                  return (
                    <div className="text-[12px] text-[var(--wa-text-secondary)] truncate">
                      {roleStr} · {p.label}
                    </div>
                  );
                }
                return <div className="text-[12px] text-[var(--wa-text-secondary)] truncate">{roleStr}</div>;
              })()}
            </div>
          </div>

          {!selectedId && (
            <div
              className="hidden md:flex flex-1 flex-col items-center justify-center p-8 text-center border-l border-[var(--wa-border)]"
              style={{ background: chatBg }}
            >
              <div className="max-w-sm rounded-lg bg-[var(--wa-surface)]/95 px-6 py-8 shadow-sm border border-[var(--wa-border)] backdrop-blur-sm">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 text-[var(--wa-text-secondary)]" strokeWidth={1.25} />
                <p className="text-[20px] font-light text-[var(--wa-text)]">PwezaCore Web</p>
                <p className="text-[14px] text-[var(--wa-text-secondary)] mt-2">
                  Select a conversation to start messaging, or start a new chat.
                </p>
              </div>
            </div>
          )}

          {selectedId && (selectedConv || peerPreview) && (
            <>
              <div className="hidden md:flex items-center gap-3 px-4 py-2.5 shrink-0 border-b border-[var(--wa-border)] bg-[var(--wa-header)] text-[var(--wa-text)]">
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center text-[15px] font-medium bg-[var(--wa-surface)] text-[var(--wa-text)]"
                  aria-hidden
                >
                  {((selectedConv?.peer_name || peerPreview?.name) ?? '?').slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-[16px] text-[var(--wa-text)] truncate">
                    {selectedConv?.peer_name ?? peerPreview?.name ?? 'Chat'}
                  </div>
                  <div className="text-[13px] text-[var(--wa-text-secondary)] truncate">
                    {(() => {
                      const p = formatChatPresence(peerLastSeenAt, peerSessionActive);
                      const roleStr = roleLabel(selectedConv?.peer_role ?? peerPreview?.role ?? '');
                      if (p.online) {
                        return (
                          <>
                            {roleStr} · <span className="text-emerald-600 dark:text-emerald-300 font-medium">Online</span>
                          </>
                        );
                      }
                      if (p.label) {
                        return (
                          <>
                            {roleStr} · <span>{p.label}</span>
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
                style={{ background: chatBg }}
              >
                {messages.map((m) => {
                  const mine = m.sender_id === myId;
                  return (
                    <div key={m.id} className={`flex w-full ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`min-w-0 max-w-[75%] sm:max-w-[65%] rounded-lg px-2 py-1.5 pb-5 shadow-sm relative ${
                          mine
                            ? 'rounded-br-none bg-[var(--wa-out)] text-[var(--wa-text)]'
                            : 'rounded-bl-none bg-[var(--wa-in)] text-[var(--wa-text)] border border-[var(--wa-border)]'
                        }`}
                      >
                        {m.msg_kind === 'voice' ? (
                          <VoiceNoteBubble
                            message={m}
                            mine={mine}
                            avatarLetter={mine ? myVoiceInitial : peerVoiceInitial}
                          />
                        ) : (
                          <p
                            className={`whitespace-pre-wrap break-words text-[14.2px] leading-snug ${mine ? 'pr-[4.5rem]' : 'pr-12'}`}
                          >
                            {m.body}
                          </p>
                        )}
                        <div className="absolute bottom-1 right-2 flex items-center gap-1">
                          <span
                            className={`text-[11px] tabular-nums ${mine ? 'text-[var(--wa-bubble-meta-out)]' : 'text-[var(--wa-bubble-meta-in)]'}`}
                          >
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
                  className="shrink-0 px-3 py-2 text-[13px] text-red-200 bg-red-950/50 border-t border-red-900/60"
                  role="alert"
                >
                  {sendError}
                </div>
              )}

              <form
                onSubmit={handleSend}
                className="flex items-end gap-2 px-3 py-2 shrink-0 border-t border-[var(--wa-border)] bg-[var(--wa-input-bar)]"
              >
                {!voiceRecording && (
                  <>
                    <button
                      type="button"
                      className="p-2 text-[var(--wa-text-secondary)] hover:text-[var(--wa-text)] rounded-full hidden sm:block"
                      aria-label="Emoji"
                    >
                      <Smile className="h-6 w-6" />
                    </button>
                    <button
                      type="button"
                      className="p-2 text-[var(--wa-text-secondary)] hover:text-[var(--wa-text)] rounded-full hidden sm:block"
                      aria-label="Attach"
                    >
                      <Paperclip className="h-6 w-6" />
                    </button>
                  </>
                )}
                {voiceRecording ? (
                  <>
                    <div className="flex-1 flex items-center gap-2 rounded-lg bg-[var(--wa-surface)] border border-[var(--wa-border)] min-h-[42px] px-3 py-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse shrink-0"
                        aria-hidden
                      />
                      <span className="text-[15px] font-semibold tabular-nums text-[var(--wa-text)] shrink-0">
                        {formatVoiceDurationLabel(voiceSeconds)}
                      </span>
                      <span className="text-[13px] text-[var(--wa-text-secondary)] truncate flex-1">
                        Recording… tap send to finish
                      </span>
                      <button
                        type="button"
                        className="text-[13px] font-semibold text-red-300 hover:text-red-200 hover:underline shrink-0 px-1"
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
                    <div className="flex-1 rounded-lg bg-[var(--wa-input-bg)] border border-[var(--wa-border)] flex items-center min-h-[42px] px-3 shadow-none">
                      <input
                        className="flex-1 wa-input min-w-0 bg-transparent border-0 text-[15px] text-[var(--wa-text)] py-2 placeholder:text-[var(--wa-text-secondary)] outline-none ring-0 ring-offset-0 focus:outline-none focus:ring-0 focus:ring-offset-0 focus:shadow-none focus-visible:outline-none focus-visible:ring-0"
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
            className="wa-modal-backdrop wa-root fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm pointer-events-auto"
            data-theme={uiTheme}
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-chat-title"
            onClick={closeNewChatModal}
          >
            <div
              className="w-full max-w-lg rounded-2xl shadow-2xl max-h-[85vh] flex flex-col border pointer-events-auto overflow-hidden text-[var(--wa-text)]"
              style={{
                backgroundColor: isDark ? '#202c33' : '#ffffff',
                borderColor: isDark ? '#2a3942' : '#e9edef',
                color: isDark ? '#e9edef' : '#111b21',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="flex items-center justify-between border-b px-5 py-3.5 shrink-0"
                style={{
                  backgroundColor: isDark ? '#202c33' : '#ffffff',
                  borderColor: isDark ? '#2a3942' : '#e9edef',
                }}
              >
                <h2 id="new-chat-title" className="font-semibold text-[17px]" style={{ color: isDark ? '#e9edef' : '#111b21' }}>
                  New chat
                </h2>
                <button
                  type="button"
                  className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  style={{ color: isDark ? '#8696a0' : '#667781' }}
                  onClick={closeNewChatModal}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {newChatError && (
                <div
                  className="mx-3 mt-3 rounded-lg border border-red-900/50 bg-red-950/45 px-3 py-2 text-[13px] text-red-200"
                  role="alert"
                >
                  {newChatError}
                </div>
              )}
              <div
                className="p-3 border-b space-y-3 shrink-0"
                style={{
                  backgroundColor: isDark ? '#111b21' : '#f0f2f5',
                  borderColor: isDark ? '#2a3942' : '#e9edef',
                }}
              >
                <div
                  className="relative rounded-lg flex items-center px-3 py-1.5 border shadow-sm"
                  style={{
                    backgroundColor: isDark ? '#202c33' : '#ffffff',
                    borderColor: isDark ? '#2a3942' : '#e9edef',
                  }}
                >
                  <Search className="h-4 w-4 shrink-0 mr-2" style={{ color: isDark ? '#8696a0' : '#667781' }} />
                  <input
                    className="w-full bg-transparent border-0 text-[14px] outline-none placeholder:text-[var(--wa-text-secondary)]"
                    style={{ color: isDark ? '#e9edef' : '#111b21' }}
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
                      className="rounded-full px-3.5 py-1 text-[13px] font-medium border transition-colors shadow-sm"
                      style={
                        contactFilter === id
                          ? { backgroundColor: '#008069', color: '#ffffff', borderColor: '#008069' }
                          : {
                              backgroundColor: isDark ? '#202c33' : '#ffffff',
                              color: isDark ? '#8696a0' : '#667781',
                              borderColor: isDark ? '#2a3942' : '#e9edef',
                            }
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div
                className="flex-1 overflow-y-auto wa-scroll-y p-2 space-y-1"
                style={{ backgroundColor: isDark ? '#111b21' : '#ffffff' }}
              >
                {loadingElig && <p className="p-3 text-[14px]" style={{ color: isDark ? '#8696a0' : '#667781' }}>Loading contacts…</p>}
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
                        className="w-full text-left rounded-xl px-3 py-2.5 flex gap-3 items-center disabled:opacity-60 transition-colors"
                        style={{ backgroundColor: 'transparent' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = isDark ? '#202c33' : '#f5f6f6';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div
                          className="relative h-11 w-11 shrink-0 rounded-full flex items-center justify-center font-medium shadow-sm"
                          style={{
                            backgroundColor: isDark ? '#3d4f5c' : '#dfe5e7',
                            color: isDark ? '#e9edef' : '#111b21',
                          }}
                        >
                          {displayChatName(u).slice(0, 1).toUpperCase()}
                          {pres.online && (
                            <span
                              className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[#25d366] border-2"
                              style={{ borderColor: isDark ? '#202c33' : '#ffffff' }}
                              aria-hidden
                              title="Online"
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-[15px]" style={{ color: isDark ? '#e9edef' : '#111b21' }}>
                            {displayChatName(u)}
                          </div>
                          <div className="text-[13px] truncate" style={{ color: isDark ? '#8696a0' : '#667781' }}>
                            {roleLabel(u.role)} · {u.email}
                          </div>
                          {!pres.online && pres.label && (
                            <div className="text-[11px] truncate" style={{ color: isDark ? '#8696a0' : '#667781' }}>
                              {pres.label}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                {!loadingElig && filteredEligible.length === 0 && (
                  <p className="p-4 text-[14px]" style={{ color: isDark ? '#8696a0' : '#667781' }}>No contacts match filters or search.</p>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
