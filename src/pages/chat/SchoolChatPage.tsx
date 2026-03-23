import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MessageCircle, Search, Send, UserPlus, X } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import {
  fetchEligibleChatUsers,
  fetchMessages,
  fetchMyConversations,
  getOrCreateDm,
  markConversationRead,
  sendMessage,
  subscribeToConversationMessages,
  type ChatConversationRow,
  type ChatMessageRow,
  type EligibleChatUser,
} from '@/lib/schoolChatApi';

const CHAT_QK = ['school-chat'] as const;

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

export default function SchoolChatPage() {
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.role);
  const schoolId = useAuthStore((s) => s.schoolId);
  const myId = useAuthStore((s) => s.user?.id) ?? null;
  const [searchParams, setSearchParams] = useSearchParams();
  const withUserId = searchParams.get('with');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [pickQ, setPickQ] = useState('');
  const [mobileThread, setMobileThread] = useState(false);

  const home = dashboardHomeForRole(role);

  const { data: conversations = [], isLoading: loadingConv } = useQuery({
    queryKey: [...CHAT_QK, 'conversations', myId],
    queryFn: fetchMyConversations,
    enabled: !!myId,
  });

  const { data: eligible = [], isLoading: loadingElig } = useQuery({
    queryKey: [...CHAT_QK, 'eligible', myId],
    queryFn: fetchEligibleChatUsers,
    enabled: !!myId && newOpen,
  });

  const selectedConv = useMemo(
    () => conversations.find((c) => c.conversation_id === selectedId) ?? null,
    [conversations, selectedId]
  );

  const loadThread = useCallback(
    async (conversationId: string) => {
      const rows = await fetchMessages(conversationId);
      setMessages(rows);
      await markConversationRead(conversationId);
      void queryClient.invalidateQueries({ queryKey: [...CHAT_QK, 'conversations', myId] });
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
    if (!selectedId) return;
    const unsub = subscribeToConversationMessages(selectedId, (row) => {
      setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
      void markConversationRead(selectedId);
      void queryClient.invalidateQueries({ queryKey: [...CHAT_QK, 'conversations', myId] });
    });
    return unsub;
  }, [selectedId, myId, queryClient]);

  // Deep link ?with=user_id
  useEffect(() => {
    if (!withUserId || !myId) return;
    let cancelled = false;
    void (async () => {
      try {
        const cid = await getOrCreateDm(withUserId);
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
  }, [withUserId, myId, setSearchParams]);

  const filteredEligible = useMemo(() => {
    const q = pickQ.trim().toLowerCase();
    if (!q) return eligible;
    return eligible.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [eligible, pickQ]);

  const openNewConversation = async (u: EligibleChatUser) => {
    setSending(true);
    try {
      const cid = await getOrCreateDm(u.user_id);
      setNewOpen(false);
      setPickQ('');
      setSelectedId(cid);
      setMobileThread(true);
      await queryClient.invalidateQueries({ queryKey: [...CHAT_QK, 'conversations', myId] });
    } finally {
      setSending(false);
    }
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedId || !schoolId || !draft.trim()) return;
    setSending(true);
    try {
      await sendMessage(selectedId, schoolId, draft);
      setDraft('');
      await loadThread(selectedId);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-[calc(100vh-2rem)] flex flex-col bg-slate-50 text-slate-900">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <Link
          to={home}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-800 hover:text-amber-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <MessageCircle className="h-6 w-6 text-amber-600 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-lg font-bold truncate">School messages</h1>
            <p className="text-xs text-slate-500 truncate">
              You only see people you are allowed to contact (classes, family, or staff scope).
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setNewOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-amber-500"
        >
          <UserPlus className="h-4 w-4" />
          New chat
        </button>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Conversation list */}
        <aside
          className={`${
            mobileThread ? 'hidden sm:flex' : 'flex'
          } w-full sm:w-[min(100%,380px)] flex-col border-r border-slate-200 bg-white`}
        >
          <div className="p-3 border-b border-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Conversations</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingConv && <p className="p-4 text-sm text-slate-500">Loading…</p>}
            {!loadingConv && conversations.length === 0 && (
              <p className="p-4 text-sm text-slate-500">No conversations yet. Start a new chat.</p>
            )}
            {conversations.map((c: ChatConversationRow) => (
              <button
                key={c.conversation_id}
                type="button"
                onClick={() => {
                  setSelectedId(c.conversation_id);
                  setMobileThread(true);
                }}
                className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-amber-50/80 transition ${
                  selectedId === c.conversation_id ? 'bg-amber-50' : ''
                }`}
              >
                <div className="flex justify-between gap-2">
                  <span className="font-medium text-slate-900 truncate">{c.peer_name}</span>
                  {c.unread_count > 0 && (
                    <span className="shrink-0 rounded-full bg-amber-600 px-2 py-0.5 text-xs font-semibold text-white">
                      {c.unread_count}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500">{roleLabel(c.peer_role)}</div>
                <div className="text-sm text-slate-600 line-clamp-2 mt-0.5">{c.last_body || '—'}</div>
                <div className="text-[11px] text-slate-400 mt-1">{formatTime(c.last_at)}</div>
              </button>
            ))}
          </div>
        </aside>

        {/* Thread */}
        <section
          className={`${
            !mobileThread ? 'hidden sm:flex' : 'flex'
          } flex-1 flex-col min-h-0 bg-slate-50`}
        >
          <div className="sm:hidden flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
            <button
              type="button"
              className="text-sm text-amber-800 font-medium"
              onClick={() => setMobileThread(false)}
            >
              ← Chats
            </button>
          </div>

          {!selectedId && (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-slate-500">
              <div>
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium text-slate-700">Select a conversation or start a new chat</p>
              </div>
            </div>
          )}

          {selectedId && selectedConv && (
            <>
              <div className="border-b border-slate-200 bg-white px-4 py-3">
                <div className="font-semibold text-slate-900">{selectedConv.peer_name}</div>
                <div className="text-xs text-slate-500">{roleLabel(selectedConv.peer_role)}</div>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messages.map((m) => {
                  const mine = m.sender_id === myId;
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                          mine ? 'bg-amber-600 text-white rounded-br-md' : 'bg-white text-slate-900 border border-slate-200 rounded-bl-md'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                        <p className={`text-[10px] mt-1 ${mine ? 'text-amber-100' : 'text-slate-400'}`}>
                          {formatTime(m.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <form onSubmit={handleSend} className="border-t border-slate-200 bg-white p-3 flex gap-2">
                <input
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  placeholder="Type a message…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="inline-flex items-center gap-1 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  Send
                </button>
              </form>
            </>
          )}
        </section>
      </div>

      {newOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="font-semibold text-slate-900">Start a conversation</h2>
              <button type="button" className="p-1 rounded-lg hover:bg-slate-100" onClick={() => setNewOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm"
                  placeholder="Search name or email…"
                  value={pickQ}
                  onChange={(e) => setPickQ(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {loadingElig && <p className="p-3 text-sm text-slate-500">Loading contacts…</p>}
              {!loadingElig &&
                filteredEligible.map((u) => (
                  <button
                    key={u.user_id}
                    type="button"
                    disabled={sending}
                    onClick={() => void openNewConversation(u)}
                    className="w-full text-left rounded-lg px-3 py-2.5 hover:bg-amber-50 border border-transparent hover:border-amber-100"
                  >
                    <div className="font-medium text-slate-900">{u.name}</div>
                    <div className="text-xs text-slate-500">
                      {roleLabel(u.role)} · {u.email}
                    </div>
                  </button>
                ))}
              {!loadingElig && filteredEligible.length === 0 && (
                <p className="p-4 text-sm text-slate-500">No contacts match your search.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
