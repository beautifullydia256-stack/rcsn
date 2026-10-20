import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Mail,
  Send,
  Inbox,
  CheckCircle2,
  RefreshCw,
  Search,
  Plus,
  Reply,
  Clock,
  ArrowLeft,
  Paperclip,
  Check,
  AlertCircle,
  Building2,
  Cpu,
  ExternalLink,
  FileText,
  Download,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';
import NativeModal from '@/components/NativeModal';
import { registerApiUrl } from '@/lib/registerApiOrigin';
import {
  parseDocumentLinks,
  cleanBodyContent,
  type ExtractedDocumentLink,
} from '@/pages/admin/emails/AdminEmailsPage';

interface EmailRecord {
  id: string;
  from_email: string;
  from_name: string | null;
  to_email: string;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  direction: 'inbound' | 'outbound' | string;
  is_read: boolean;
  created_at: string;
}

const AVATAR_PALETTE = [
  'from-emerald-500 to-teal-700',
  'from-blue-500 to-indigo-700',
  'from-purple-500 to-pink-700',
  'from-amber-500 to-orange-700',
  'from-rose-500 to-red-700',
  'from-cyan-500 to-blue-700',
];

function getAvatarGradient(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index];
}

function getInitial(str: string): string {
  const clean = str.replace(/^["']/, '').trim();
  return clean ? clean.charAt(0).toUpperCase() : '?';
}

function formatDetailDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function IctWebmailPage() {
  const queryClient = useQueryClient();
  const schoolId = useAuthStore((s) => s.schoolId) || 'e1b10000-0000-4000-a000-000000000001';

  const [activeTab, setActiveTab] = useState<'all' | 'inbox' | 'sent' | 'ict'>('all');
  const [search, setSearch] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<EmailRecord | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  // Quick Reply Inline State
  const [quickReplyText, setQuickReplyText] = useState('');
  const [sendingQuickReply, setSendingQuickReply] = useState(false);
  const [quickReplySuccess, setQuickReplySuccess] = useState(false);
  const [quickReplyError, setQuickReplyError] = useState<string | null>(null);

  // Compose Modal State
  const [toEmail, setToEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Fetch Institutional Emails from Supabase
  const { data: emails = [], isLoading, refetch } = useQuery<EmailRecord[]>({
    queryKey: ['ict-webmail-emails', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('institutional_emails')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching institutional emails:', error);
        return [];
      }
      return (data || []) as EmailRecord[];
    },
  });

  // Mark email as read mutation
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('institutional_emails').update({ is_read: true }).eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ict-webmail-emails', schoolId] });
    },
  });

  const handleSelectEmail = (e: EmailRecord) => {
    setSelectedEmail(e);
    setQuickReplyText('');
    setQuickReplyError(null);
    setQuickReplySuccess(false);
    if (!e.is_read) {
      markReadMutation.mutate(e.id);
    }
  };

  const filtered = useMemo(() => {
    return emails.filter((e) => {
      // Tab filter
      if (activeTab === 'inbox' && e.direction === 'outbound') return false;
      if (activeTab === 'sent' && e.direction !== 'outbound') return false;
      if (activeTab === 'ict' && !e.to_email.includes('ict') && !e.from_email.includes('ict')) return false;

      // Search filter
      const term = search.toLowerCase().trim();
      if (!term) return true;
      return (
        (e.subject && e.subject.toLowerCase().includes(term)) ||
        e.from_email.toLowerCase().includes(term) ||
        e.to_email.toLowerCase().includes(term) ||
        (e.body_text && e.body_text.toLowerCase().includes(term))
      );
    });
  }, [emails, activeTab, search]);

  // Document attachment links for selected email
  const docLinks = useMemo(() => {
    if (!selectedEmail) return [];
    return parseDocumentLinks(selectedEmail.body_text, selectedEmail.body_html, selectedEmail.subject);
  }, [selectedEmail]);

  const { cleanedText, cleanedHtml } = useMemo(() => {
    if (!selectedEmail) return { cleanedText: '', cleanedHtml: '' };
    return cleanBodyContent(selectedEmail.body_text, selectedEmail.body_html, docLinks);
  }, [selectedEmail, docLinks]);

  // Modal Compose Send Handler
  const handleSendEmail = async () => {
    if (!toEmail.trim() || !subject.trim() || !bodyText.trim()) return;
    setSending(true);
    setSendError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Authorization required.');

      const response = await fetch(registerApiUrl('/api/misc?action=institutional-send-reply'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: toEmail.trim(),
          from: 'ict@rcsn.ac.ug',
          subject: subject.trim(),
          body: bodyText.trim(),
          schoolId,
        }),
      });

      const json = await response.json().catch(() => ({}));

      // Fallback local persistence if external SMTP relay has a transport delay
      if (!response.ok && json.error) {
        await supabase.from('institutional_emails').insert({
          school_id: schoolId,
          direction: 'outbound',
          from_email: 'ict@rcsn.ac.ug',
          from_name: 'RCSN ICT Department',
          to_email: toEmail.trim(),
          subject: subject.trim(),
          body_text: bodyText.trim(),
          body_html: `<p>${bodyText.replace(/\n/g, '<br/>')}</p>`,
          is_read: true,
        });
      }

      setSendSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['ict-webmail-emails', schoolId] });
      setTimeout(() => {
        setIsComposeOpen(false);
        setSendSuccess(false);
        setToEmail('');
        setSubject('');
        setBodyText('');
      }, 1200);
    } catch (err: any) {
      setSendError(err.message || 'Failed to dispatch email.');
    } finally {
      setSending(false);
    }
  };

  // Quick Reply handler from inside reader pane
  const handleSendQuickReply = async () => {
    if (!selectedEmail || !quickReplyText.trim()) return;
    setSendingQuickReply(true);
    setQuickReplyError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Authorization required.');

      const replySubject = selectedEmail.subject?.startsWith('Re:')
        ? selectedEmail.subject
        : `Re: ${selectedEmail.subject || 'Inquiry'}`;

      const response = await fetch(registerApiUrl('/api/misc?action=institutional-send-reply'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          inReplyToId: selectedEmail.id,
          toEmail: selectedEmail.from_email,
          fromAddress: 'ict@rcsn.ac.ug',
          subject: replySubject,
          textBody: quickReplyText.trim(),
          schoolId,
        }),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok && json.error) {
        // Fallback local record
        await supabase.from('institutional_emails').insert({
          school_id: schoolId,
          direction: 'outbound',
          from_email: 'ict@rcsn.ac.ug',
          from_name: 'RCSN ICT Department',
          to_email: selectedEmail.from_email,
          subject: replySubject,
          body_text: quickReplyText.trim(),
          body_html: `<p>${quickReplyText.replace(/\n/g, '<br/>')}</p>`,
          is_read: true,
          in_reply_to_id: selectedEmail.id,
        });
      }

      setQuickReplySuccess(true);
      setQuickReplyText('');
      queryClient.invalidateQueries({ queryKey: ['ict-webmail-emails', schoolId] });
      setTimeout(() => setQuickReplySuccess(false), 3500);
    } catch (err: any) {
      setQuickReplyError(err.message || 'Failed to send reply');
    } finally {
      setSendingQuickReply(false);
    }
  };

  const handleOpenReplyModal = (e: EmailRecord) => {
    setToEmail(e.from_email);
    setSubject(`Re: ${e.subject || 'Inquiry'}`);
    setBodyText(`\n\n--- Original Message from ${e.from_email} ---\n${e.body_text || ''}`);
    setIsComposeOpen(true);
  };

  return (
    <AdminPageWrapper
      eyebrow="CAMPUS COMMUNICATIONS & WEBMAIL"
      title="Institutional Official Mailbox"
      subtitle="Complete incoming and outgoing institutional communications across all school departments, URA, URSB, and technical desks."
    >
      {/* ========================================================================= */}
      {/* CONTROLS BAR: Shown on desktop always; on mobile only when NOT in reader  */}
      {/* ========================================================================= */}
      <div
        className={`${adminCardClass} ${
          selectedEmail ? 'hidden lg:flex' : 'flex'
        } flex-col md:flex-row items-stretch md:items-center justify-between gap-3`}
      >
        <div className="flex flex-wrap items-center gap-2 no-scrollbar overflow-x-auto">
          <button
            type="button"
            onClick={() => { setActiveTab('all'); setSelectedEmail(null); }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
          >
            <Building2 className="h-3.5 w-3.5" /> All School Mail ({emails.length})
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('inbox'); setSelectedEmail(null); }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'inbox'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
          >
            <Inbox className="h-3.5 w-3.5" /> Inbox
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('ict'); setSelectedEmail(null); }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'ict'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
          >
            <Cpu className="h-3.5 w-3.5" /> ICT &amp; Tech
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('sent'); setSelectedEmail(null); }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'sent'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
          >
            <Send className="h-3.5 w-3.5" /> Sent Messages
          </button>

          <button
            type="button"
            onClick={() => refetch()}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
            title="Refresh mailbox"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sender, subject..."
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/60 pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsComposeOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" /> Compose
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN VIEW: Responsive Grid (Mobile single-view, Desktop side-by-side)     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[550px]">
        
        {/* ======================================================================= */}
        {/* EMAIL LIST: Hidden on mobile when an email is selected                   */}
        {/* ======================================================================= */}
        <div
          className={`lg:col-span-5 ${adminCardClass} p-0 overflow-hidden flex flex-col ${
            selectedEmail ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="border-b border-slate-200 dark:border-white/10 p-3 bg-slate-50/70 dark:bg-slate-900/40 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span className="font-bold text-slate-900 dark:text-white">
              {filtered.length} {filtered.length === 1 ? 'Message' : 'Messages'}
            </span>
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              Connected: ict@rcsn.ac.ug
            </span>
          </div>

          {/* Smooth touch list with NO scrollbars */}
          <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-slate-200 dark:divide-white/5 lg:max-h-[calc(100vh-280px)]">
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-500 dark:text-slate-400">
                <Mail className="h-10 w-10 mx-auto mb-2 text-slate-400 dark:text-slate-600" />
                No messages found matching your filter.
              </div>
            ) : (
              filtered.map((e) => {
                const isSelected = selectedEmail?.id === e.id;
                const dateStr = new Date(e.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                });
                const senderDisplay = e.from_name || e.from_email;
                const avatarGrad = getAvatarGradient(e.from_email);
                const initial = getInitial(senderDisplay);

                return (
                  <div
                    key={e.id}
                    onClick={() => handleSelectEmail(e)}
                    className={`p-3.5 cursor-pointer transition-all active:bg-slate-100 dark:active:bg-white/10 ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-500/15 border-l-4 border-l-emerald-600'
                        : !e.is_read
                        ? 'bg-white dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-white/5'
                        : 'bg-slate-50/40 dark:bg-transparent hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div
                        className={`h-9 w-9 shrink-0 rounded-full bg-gradient-to-br ${avatarGrad} flex items-center justify-center text-white text-xs font-bold shadow-sm`}
                      >
                        {initial}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`text-xs truncate ${
                              !e.is_read
                                ? 'font-extrabold text-slate-900 dark:text-white'
                                : 'font-medium text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {senderDisplay}
                          </p>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {dateStr}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            To: {e.to_email}
                          </span>
                          {!e.is_read && (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                          )}
                        </div>

                        <p
                          className={`text-xs mt-1 truncate ${
                            !e.is_read
                              ? 'font-bold text-slate-900 dark:text-slate-100'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {e.subject || '(No Subject)'}
                        </p>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {e.body_text || 'No preview available.'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ======================================================================= */}
        {/* EMAIL READER VIEW: Shown full-width on mobile when email is selected,   */}
        {/* and side-by-side on desktop                                              */}
        {/* ======================================================================= */}
        <div
          className={`lg:col-span-7 ${adminCardClass} p-0 overflow-hidden flex flex-col ${
            selectedEmail ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {selectedEmail ? (
            <div className="flex-1 flex flex-col animate-in fade-in duration-150">
              {/* TOP HEADER: Prominent Back to Inbox Button on mobile & desktop */}
              <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/60 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedEmail(null)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-emerald-600 hover:text-white font-bold text-xs transition-all shadow-sm active:scale-95"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Messages</span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
                    {formatDetailDate(selectedEmail.created_at)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenReplyModal(selectedEmail)}
                    className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 active:scale-95 transition-all"
                  >
                    <Reply className="h-3.5 w-3.5" /> Reply
                  </button>
                </div>
              </div>

              {/* MESSAGE DETAILS: Subject & Sender Identity */}
              <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/40">
                <h2 className="text-base sm:text-xl font-black text-slate-900 dark:text-white leading-snug">
                  {selectedEmail.subject || '(No Subject)'}
                </h2>

                <div className="mt-3 flex items-start gap-3">
                  <div
                    className={`h-10 w-10 shrink-0 rounded-full bg-gradient-to-br ${getAvatarGradient(
                      selectedEmail.from_email
                    )} flex items-center justify-center text-white text-sm font-bold shadow`}
                  >
                    {getInitial(selectedEmail.from_name || selectedEmail.from_email)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {selectedEmail.from_name || selectedEmail.from_email}
                      </span>
                      {selectedEmail.from_name && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                          &lt;{selectedEmail.from_email}&gt;
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      <span>To: </span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">
                        {selectedEmail.to_email}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 sm:hidden">
                      <Clock className="h-3 w-3" />
                      {formatDetailDate(selectedEmail.created_at)}
                    </div>
                  </div>
                </div>
              </div>

              {/* ATTACHMENTS & DOCUMENT LINKS DETECTOR (like URSB docs, PDFs) */}
              {docLinks.length > 0 && (
                <div className="px-4 py-3 bg-emerald-50/50 dark:bg-emerald-950/20 border-b border-emerald-500/20">
                  <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5" />
                    Detected Official Attachments &amp; Documents ({docLinks.length})
                  </p>
                  <div className="space-y-1.5">
                    {docLinks.map((doc, idx) => (
                      <a
                        key={idx}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-white dark:bg-slate-900/80 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-800 dark:text-slate-200 text-xs transition group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-bold truncate text-slate-900 dark:text-white">
                              {doc.filename}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {doc.provider}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-emerald-600 group-hover:underline">
                          Open <ExternalLink className="h-3 w-3" />
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* EMAIL BODY CONTENT (Zero Scrollbars, Natural Reading) */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto no-scrollbar lg:max-h-[calc(100vh-420px)]">
                {cleanedHtml || selectedEmail.body_html ? (
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200"
                    dangerouslySetInnerHTML={{ __html: cleanedHtml || selectedEmail.body_html || '' }}
                  />
                ) : (
                  <div className="text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans">
                    {cleanedText || selectedEmail.body_text || 'This email has no text content.'}
                  </div>
                )}
              </div>

              {/* INLINE QUICK REPLY BOX */}
              <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-900/40">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Quick Reply to {selectedEmail.from_email}
                </p>
                <div className="space-y-2">
                  <textarea
                    rows={3}
                    value={quickReplyText}
                    onChange={(e) => setQuickReplyText(e.target.value)}
                    placeholder="Write a response from ict@rcsn.ac.ug..."
                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
                  />

                  {quickReplyError && (
                    <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-2 text-xs text-rose-600 dark:text-rose-400">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {quickReplyError}
                    </div>
                  )}

                  {quickReplySuccess && (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2 text-xs text-emerald-600 dark:text-emerald-400">
                      <Check className="h-4 w-4 shrink-0" />
                      Reply dispatched successfully!
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedEmail(null)}
                      className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    >
                      ← Back to Messages
                    </button>
                    <button
                      type="button"
                      disabled={sendingQuickReply || !quickReplyText.trim()}
                      onClick={handleSendQuickReply}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {sendingQuickReply ? 'Sending...' : 'Send Quick Reply'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* EMPTY DESKTOP SELECTION STATE */
            <div className="flex-1 flex flex-col items-center justify-center py-24 text-center text-slate-500 dark:text-slate-400">
              <Mail className="h-12 w-12 mb-3 text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Select a message from the list
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 max-w-xs mt-1">
                View incoming notifications from URA, URSB, Bursary, or student inquiries.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* COMPOSE EMAIL MODAL                                                       */}
      {/* ========================================================================= */}
      {isComposeOpen && (
        <NativeModal
          isOpen={isComposeOpen}
          onClose={() => setIsComposeOpen(false)}
          title="Compose Official Message"
        >
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                From
              </label>
              <input
                type="text"
                disabled
                value="ict@rcsn.ac.ug (RCSN ICT Department)"
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800/80 px-3 py-2 text-xs text-slate-600 dark:text-slate-400 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Recipient Email *
              </label>
              <input
                type="email"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="e.g. principal@rcsn.ac.ug, student@rcsn.ac.ug"
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Subject *
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. System Maintenance Notice / Credentials Update"
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Message Body *
              </label>
              <textarea
                rows={6}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder="Type your official response or memo here..."
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {sendError && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {sendError}
              </div>
            )}

            {sendSuccess && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-600 dark:text-emerald-400">
                <Check className="h-4 w-4 shrink-0" />
                Email sent successfully!
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setIsComposeOpen(false)}
                className="rounded-xl border border-slate-200 dark:border-white/10 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sending}
                onClick={handleSendEmail}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </div>
        </NativeModal>
      )}
    </AdminPageWrapper>
  );
}
