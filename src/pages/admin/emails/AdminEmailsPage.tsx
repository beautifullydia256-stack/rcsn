import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Mail,
  Send,
  Inbox,
  Search,
  RefreshCw,
  Reply,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Clock,
  User,
  Archive,
  ChevronRight,
  Filter,
  Sparkles,
  Paperclip,
  Check,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import AdminPageWrapper from '@/components/layout/AdminPageWrapper';
import { registerApiUrl } from '@/lib/registerApiOrigin';

export interface InstitutionalEmail {
  id: string;
  school_id: string | null;
  resend_id: string | null;
  direction: 'inbound' | 'outbound';
  from_email: string;
  from_name: string | null;
  to_email: string;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  is_read: boolean;
  is_archived: boolean;
  in_reply_to_id: string | null;
  metadata: any;
  created_at: string;
}

const RESEND_WEBHOOK_URL = 'https://www.rcsn.ac.ug/api/webhooks/resend-inbound';
const OFFICIAL_MAILBOXES = [
  'info@rcsn.ac.ug',
  'admissions@rcsn.ac.ug',
  'admin@rcsn.ac.ug',
  'principal@rcsn.ac.ug',
];

export default function AdminEmailsPage() {
  const { theme } = useUIStore();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'all'>('inbox');
  const [selectedMailbox, setSelectedMailbox] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  // Reply Composer State
  const [replyText, setReplyText] = useState('');
  const [replyFrom, setReplyFrom] = useState('info@rcsn.ac.ug');
  const [replyStatus, setReplyStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [replyError, setReplyError] = useState<string | null>(null);

  // New Compose Modal State
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeFrom, setComposeFrom] = useState('info@rcsn.ac.ug');

  // Webhook info banner
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [showWebhookGuide, setShowWebhookGuide] = useState(false);

  // 1. Fetch Emails
  const { data: emails = [], isLoading, isFetching, refetch } = useQuery<InstitutionalEmail[]>({
    queryKey: ['institutional-emails'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('institutional_emails')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching institutional emails:', error);
        return [];
      }
      return (data || []) as InstitutionalEmail[];
    },
    refetchInterval: 15_000, // Poll every 15s for real-time inbox feeling
  });

  // Filter Emails
  const filteredEmails = useMemo(() => {
    return emails.filter((item) => {
      // Tab filter
      if (activeTab === 'inbox' && item.direction !== 'inbound') return false;
      if (activeTab === 'sent' && item.direction !== 'outbound') return false;

      // Mailbox filter
      if (selectedMailbox !== 'all') {
        const itemMailbox = item.direction === 'inbound' ? item.to_email : item.from_email;
        if (!itemMailbox.toLowerCase().includes(selectedMailbox.toLowerCase())) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSubject = (item.subject || '').toLowerCase().includes(q);
        const matchesFrom = item.from_email.toLowerCase().includes(q) || (item.from_name || '').toLowerCase().includes(q);
        const matchesTo = item.to_email.toLowerCase().includes(q);
        const matchesBody = (item.body_text || '').toLowerCase().includes(q);
        if (!matchesSubject && !matchesFrom && !matchesTo && !matchesBody) return false;
      }

      return true;
    });
  }, [emails, activeTab, selectedMailbox, searchQuery]);

  // Selected Email
  const activeEmail = useMemo(() => {
    if (!selectedEmailId && filteredEmails.length > 0) {
      return filteredEmails[0];
    }
    return emails.find((e) => e.id === selectedEmailId) || filteredEmails[0] || null;
  }, [emails, filteredEmails, selectedEmailId]);

  // Thread replies if any
  const threadReplies = useMemo(() => {
    if (!activeEmail) return [];
    return emails
      .filter((e) => e.in_reply_to_id === activeEmail.id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [emails, activeEmail]);

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (emailId: string) => {
      await supabase
        .from('institutional_emails')
        .update({ is_read: true })
        .eq('id', emailId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institutional-emails'] });
    },
  });

  const handleSelectEmail = (item: InstitutionalEmail) => {
    setSelectedEmailId(item.id);
    if (!item.is_read && item.direction === 'inbound') {
      markAsReadMutation.mutate(item.id);
    }
    setReplyText('');
    setReplyStatus('idle');
    setReplyError(null);
    if (item.direction === 'inbound') {
      setReplyFrom(item.to_email || 'info@rcsn.ac.ug');
    }
  };

  // Reply Dispatch Handler
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEmail || !replyText.trim()) return;

    setReplyStatus('sending');
    setReplyError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Session expired. Please sign in again.');

      const subject = activeEmail.subject?.startsWith('Re:')
        ? activeEmail.subject
        : `Re: ${activeEmail.subject || 'Inquiry'}`;

      const res = await fetch(registerApiUrl('/api/misc?action=institutional-send-reply'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          inReplyToId: activeEmail.id,
          toEmail: activeEmail.from_email,
          subject,
          textBody: replyText.trim(),
          fromAddress: replyFrom,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || 'Failed to dispatch reply via Resend');
      }

      setReplyStatus('success');
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['institutional-emails'] });
      setTimeout(() => setReplyStatus('idle'), 3000);
    } catch (err: any) {
      console.error('Send reply error:', err);
      setReplyStatus('error');
      setReplyError(err.message || 'Failed to send reply');
    }
  };

  // Compose Outbound Email Handler
  const handleSendCompose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) return;

    setReplyStatus('sending');
    setReplyError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Session expired. Please sign in again.');

      const res = await fetch(registerApiUrl('/api/misc?action=institutional-send-reply'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          toEmail: composeTo.trim(),
          subject: composeSubject.trim(),
          textBody: composeBody.trim(),
          fromAddress: composeFrom,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || 'Failed to dispatch email');
      }

      setComposeOpen(false);
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      setReplyStatus('idle');
      queryClient.invalidateQueries({ queryKey: ['institutional-emails'] });
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
      setReplyStatus('idle');
    }
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(RESEND_WEBHOOK_URL);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  const unreadCount = useMemo(() => {
    return emails.filter((e) => e.direction === 'inbound' && !e.is_read).length;
  }, [emails]);

  const isLight = theme === 'light';

  return (
    <AdminPageWrapper
      eyebrow="Official Communications Desk"
      title="Institutional Emails"
      subtitle="Read all incoming correspondence sent to @rcsn.ac.ug domain addresses and reply directly from the administrative dashboard."
    >
      <div className="space-y-4">
        {/* Top Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 dark:bg-slate-900/80 border border-slate-800 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            {/* Tabs */}
            <div className="inline-flex rounded-xl p-1 bg-slate-800/80 border border-slate-700/60 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('inbox')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'inbox'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Inbox className="w-3.5 h-3.5" />
                <span>Inbox</span>
                {unreadCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('sent')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'sent'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Sent Replies</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'all'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>All Mail ({emails.length})</span>
              </button>
            </div>

            {/* Mailbox Filter */}
            <select
              value={selectedMailbox}
              onChange={(e) => setSelectedMailbox(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">All School Mailboxes (*@rcsn.ac.ug)</option>
              {OFFICIAL_MAILBOXES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowWebhookGuide(!showWebhookGuide)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 text-xs font-semibold transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>Resend Webhook Config</span>
            </button>

            <button
              type="button"
              onClick={() => setComposeOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Compose Email</span>
            </button>

            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 transition disabled:opacity-50"
              title="Refresh inbox"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Resend Webhook Integration Guide Drawer */}
        {showWebhookGuide && (
          <div className="p-4 rounded-2xl bg-teal-950/40 border border-teal-500/30 text-teal-100 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase tracking-wider text-teal-300">
                Resend Inbound Webhook Configuration Instructions
              </span>
              <button
                type="button"
                onClick={() => setShowWebhookGuide(false)}
                className="text-teal-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="text-teal-200/90 leading-relaxed">
              To have incoming emails sent to <strong>@rcsn.ac.ug</strong> appear instantly in this inbox:
              <br />
              1. Open your <strong>Resend Dashboard → Webhooks</strong>.
              <br />
              2. Click <strong>Add Webhook</strong>, select event: <code>email.received</code>.
              <br />
              3. Paste the following URL into the Webhook Endpoint:
            </p>
            <div className="flex items-center gap-2 bg-slate-950/80 p-2.5 rounded-xl border border-teal-500/40 max-w-2xl font-mono text-emerald-400 select-all">
              <span className="flex-1 truncate">{RESEND_WEBHOOK_URL}</span>
              <button
                type="button"
                onClick={handleCopyWebhook}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-sans text-xs font-semibold cursor-pointer"
              >
                {copiedWebhook ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedWebhook ? 'Copied' : 'Copy URL'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Main Inbox & Reader Master-Detail Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[600px]">
          {/* Left Column: Email Roster (5 cols) */}
          <div className="lg:col-span-5 flex flex-col rounded-2xl bg-slate-900/50 border border-slate-800 overflow-hidden">
            {/* Search Bar */}
            <div className="p-3 border-b border-slate-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search sender, recipient, or subject..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Email List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 max-h-[650px]">
              {isLoading ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
                  <span>Loading communications...</span>
                </div>
              ) : filteredEmails.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <Inbox className="w-8 h-8 mx-auto text-slate-500 mb-2 opacity-50" />
                  <p className="font-semibold text-slate-300">No emails in this mailbox</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Incoming emails sent to verified @rcsn.ac.ug addresses will appear here.
                  </p>
                </div>
              ) : (
                filteredEmails.map((item) => {
                  const isSelected = activeEmail?.id === item.id;
                  const isInbound = item.direction === 'inbound';
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectEmail(item)}
                      className={`p-3.5 cursor-pointer transition relative ${
                        isSelected
                          ? 'bg-emerald-950/30 border-l-4 border-l-emerald-500'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {!item.is_read && isInbound && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                          )}
                          <span className={`text-xs truncate ${!item.is_read ? 'font-black text-white' : 'font-medium text-slate-300'}`}>
                            {isInbound ? item.from_name || item.from_email : `To: ${item.to_email}`}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(item.created_at).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>

                      <p className={`text-xs truncate ${!item.is_read ? 'font-bold text-slate-200' : 'text-slate-400'}`}>
                        {item.subject || '(No Subject)'}
                      </p>

                      <p className="text-[11px] text-slate-400 truncate mt-0.5 line-clamp-1">
                        {item.body_text || item.body_html?.replace(/<[^>]+>/g, '') || '...'}
                      </p>

                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/50">
                          {isInbound ? `To: ${item.to_email}` : `From: ${item.from_email}`}
                        </span>
                        {isInbound ? (
                          <span className="text-emerald-400">Received</span>
                        ) : (
                          <span className="text-blue-400">Sent Reply</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Reading Pane & Reply Composer (7 cols) */}
          <div className="lg:col-span-7 flex flex-col rounded-2xl bg-slate-900/50 border border-slate-800 overflow-hidden">
            {activeEmail ? (
              <div className="flex flex-col h-full">
                {/* Header Info */}
                <div className="p-4 border-b border-slate-800 bg-slate-900/80">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h2 className="text-base font-bold text-white leading-snug">
                      {activeEmail.subject || '(No Subject)'}
                    </h2>
                    <span className="text-xs text-slate-400 shrink-0">
                      {new Date(activeEmail.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="text-slate-300">
                        <span className="text-slate-400">From: </span>
                        <strong>{activeEmail.from_name || activeEmail.from_email}</strong>{' '}
                        <span className="text-slate-400">&lt;{activeEmail.from_email}&gt;</span>
                      </div>
                      <div className="text-slate-300 mt-0.5">
                        <span className="text-slate-400">To: </span>
                        <strong>{activeEmail.to_email}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        activeEmail.direction === 'inbound'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}>
                        {activeEmail.direction === 'inbound' ? 'Inbound Official Mail' : 'Outbound Reply'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Email Body Content */}
                <div className="p-5 flex-1 overflow-y-auto space-y-4">
                  {activeEmail.body_html ? (
                    <div
                      className="text-xs text-slate-200 leading-relaxed prose prose-invert max-w-none break-words"
                      dangerouslySetInnerHTML={{ __html: activeEmail.body_html }}
                    />
                  ) : (
                    <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                      {activeEmail.body_text || '(Empty Message Body)'}
                    </p>
                  )}

                  {/* Previous Thread Replies */}
                  {threadReplies.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-slate-800 space-y-3">
                      <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                        Responses Sent to this Thread ({threadReplies.length})
                      </h4>
                      {threadReplies.map((reply) => (
                        <div
                          key={reply.id}
                          className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span>From: {reply.from_email}</span>
                            <span>{new Date(reply.created_at).toLocaleString()}</span>
                          </div>
                          <p className="text-slate-200 whitespace-pre-wrap">{reply.body_text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reply Composer Bar */}
                {activeEmail.direction === 'inbound' && (
                  <form onSubmit={handleSendReply} className="p-4 border-t border-slate-800 bg-slate-900/90 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs">
                        <Reply className="w-4 h-4 text-emerald-400" />
                        <span className="font-bold text-slate-200">Reply to {activeEmail.from_email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-400">Send From:</span>
                        <select
                          value={replyFrom}
                          onChange={(e) => setReplyFrom(e.target.value)}
                          className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-emerald-300 font-semibold focus:outline-none"
                        >
                          {OFFICIAL_MAILBOXES.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <textarea
                      rows={4}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Write your response to ${activeEmail.from_name || activeEmail.from_email}...`}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                      required
                    />

                    {replyError && (
                      <div className="p-2 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{replyError}</span>
                      </div>
                    )}

                    {replyStatus === 'success' && (
                      <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Reply delivered successfully via Resend verified school domain!</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        Will be dispatched from <strong>{replyFrom}</strong> via Resend
                      </span>
                      <button
                        type="submit"
                        disabled={replyStatus === 'sending' || !replyText.trim()}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md disabled:opacity-50 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{replyStatus === 'sending' ? 'Sending Reply...' : 'Send Reply via Resend'}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
                <Mail className="w-12 h-12 text-slate-600 mb-3" />
                <h3 className="text-sm font-bold text-slate-300">Select an email to view</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Click on any incoming message from the left to read its full body and reply directly from the verified domain.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Compose Outbound Modal */}
        {composeOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">Compose Official School Email</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setComposeOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSendCompose} className="p-5 space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    From (Official Mailbox)
                  </label>
                  <select
                    value={composeFrom}
                    onChange={(e) => setComposeFrom(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                  >
                    {OFFICIAL_MAILBOXES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    To Recipient
                  </label>
                  <input
                    type="email"
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                    placeholder="e.g. applicant@gmail.com, doctor@hospital.org"
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    placeholder="e.g. Official Update from Rakai Community School of Nursing"
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Message Body
                  </label>
                  <textarea
                    rows={6}
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    placeholder="Write message..."
                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setComposeOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send via Resend</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminPageWrapper>
  );
}
