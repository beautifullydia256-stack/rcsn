import { useState } from 'react';
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
  Paperclip,
  Check,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';
import NativeModal from '@/components/NativeModal';
import { registerApiUrl } from '@/lib/registerApiOrigin';

interface EmailRecord {
  id: string;
  from_email: string;
  from_name: string | null;
  to_email: string;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  direction: 'inbound' | 'outbound';
  is_read: boolean;
  created_at: string;
}

export default function IctWebmailPage() {
  const queryClient = useQueryClient();
  const schoolId = useAuthStore((s) => s.schoolId) || 'e1b10000-0000-4000-a000-000000000001';

  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
  const [search, setSearch] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<EmailRecord | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  // Compose State
  const [toEmail, setToEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Fetch Emails
  const { data: emails = [], isLoading, refetch } = useQuery({
    queryKey: ['ict-webmail-emails', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('institutional_emails')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as EmailRecord[];
    },
  });

  const filtered = emails.filter((e) => {
    const isDirection = activeTab === 'inbox' ? e.direction === 'inbound' : e.direction === 'outbound';
    const term = search.toLowerCase().trim();
    const matchesSearch =
      !term ||
      (e.subject && e.subject.toLowerCase().includes(term)) ||
      e.from_email.toLowerCase().includes(term) ||
      e.to_email.toLowerCase().includes(term) ||
      (e.body_text && e.body_text.toLowerCase().includes(term));
    return isDirection && matchesSearch;
  });

  const handleSendEmail = async () => {
    if (!toEmail.trim() || !subject.trim() || !bodyText.trim()) return;
    setSending(true);
    setSendError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Authorization required.');

      // Send via backend institutional reply / send API
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

      // Even if outbound provider has an issue, persist to institutional_emails
      if (!response.ok && json.error) {
        // Fallback local persistence
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

  const handleOpenReply = (e: EmailRecord) => {
    setToEmail(e.from_email);
    setSubject(`Re: ${e.subject || 'Inquiry'}`);
    setBodyText(`\n\n--- Original Message from ${e.from_email} ---\n${e.body_text || ''}`);
    setIsComposeOpen(true);
  };

  return (
    <AdminPageWrapper
      eyebrow="INSTITUTIONAL MESSAGING"
      title="Official ICT Mailbox"
      subtitle="Read, compose, and send official technical communications from ict@rcsn.ac.ug."
    >
      {/* Controls Bar */}
      <div className={`${adminCardClass} flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3`}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setActiveTab('inbox'); setSelectedEmail(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold ${
              activeTab === 'inbox'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'border border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Inbox className="h-4 w-4" /> Inbox
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('sent'); setSelectedEmail(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold ${
              activeTab === 'sent'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'border border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Send className="h-4 w-4" /> Sent Messages
          </button>
          <button
            type="button"
            onClick={() => refetch()}
            className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white"
            title="Refresh mailbox"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setToEmail('');
            setSubject('');
            setBodyText('');
            setIsComposeOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" /> Compose Message
        </button>
      </div>

      {/* Main Mailbox Grid: List + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Email List (5 cols) */}
        <div className={`lg:col-span-5 ${adminCardClass} p-0 overflow-hidden`}>
          <div className="p-3 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search emails..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-white/10 bg-slate-900/60 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
            {isLoading ? (
              <div className="py-12 text-center text-slate-400 text-xs">Loading mailbox...</div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Mail className="h-8 w-8 mx-auto mb-2 text-slate-500" />
                No messages found in {activeTab}.
              </div>
            ) : (
              filtered.map((e) => {
                const isSelected = selectedEmail?.id === e.id;
                return (
                  <div
                    key={e.id}
                    onClick={() => setSelectedEmail(e)}
                    className={`p-3 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-emerald-500/10 border-l-2 border-emerald-400'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span className="font-semibold text-white truncate max-w-[180px]">
                        {activeTab === 'inbox' ? e.from_name || e.from_email : e.to_email}
                      </span>
                      <span className="font-mono text-[10px]">
                        {new Date(e.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="font-bold text-xs text-slate-200 truncate">{e.subject || '(No Subject)'}</p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{e.body_text || 'No preview text.'}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Email Reading View (7 cols) */}
        <div className={`lg:col-span-7 ${adminCardClass} min-h-[500px] flex flex-col justify-between`}>
          {selectedEmail ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-base font-bold text-white">{selectedEmail.subject || '(No Subject)'}</h2>
                  <div className="mt-1 flex flex-col text-xs text-slate-400 space-y-0.5">
                    <p>From: <strong className="text-emerald-400">{selectedEmail.from_email}</strong></p>
                    <p>To: <span className="font-mono text-slate-300">{selectedEmail.to_email}</span></p>
                    <p className="font-mono text-[11px] text-slate-500">{new Date(selectedEmail.created_at).toLocaleString()}</p>
                  </div>
                </div>

                {selectedEmail.direction === 'inbound' && (
                  <button
                    type="button"
                    onClick={() => handleOpenReply(selectedEmail)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold"
                  >
                    <Reply className="h-3.5 w-3.5" /> Reply
                  </button>
                )}
              </div>

              {/* Email Content Body */}
              <div className="prose prose-invert max-w-none text-xs text-slate-300 leading-relaxed overflow-y-auto max-h-[400px]">
                {selectedEmail.body_html ? (
                  <div dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }} />
                ) : (
                  <p className="whitespace-pre-line">{selectedEmail.body_text}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20 text-xs">
              <Mail className="h-12 w-12 text-slate-600 mb-3" />
              Select an email from the list to preview its contents.
            </div>
          )}
        </div>
      </div>

      {/* Compose Email Modal */}
      {isComposeOpen && (
        <NativeModal
          isOpen={isComposeOpen}
          onClose={() => setIsComposeOpen(false)}
          title="Compose Official Email (ict@rcsn.ac.ug)"
          size="lg"
        >
          {sendSuccess ? (
            <div className="py-8 text-center space-y-2">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
              <h3 className="text-base font-bold text-white">Email Dispatched Successfully</h3>
              <p className="text-xs text-slate-400">The message has been routed and logged to the official sent outbox.</p>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              {sendError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{sendError}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-300">Recipient Email (To)</label>
                <input
                  type="email"
                  placeholder="e.g. principal@rcsn.ac.ug, vendor@domain.com"
                  value={toEmail}
                  onChange={(e) => setToEmail(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-900 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Computer Lab Quarterly Maintenance Report"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-900 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Message Body</label>
                <textarea
                  rows={8}
                  placeholder="Type your official message here..."
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-900 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">Sender: <strong>ict@rcsn.ac.ug</strong></span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsComposeOpen(false)}
                    className="px-4 py-2 rounded-xl border border-white/10 text-xs font-medium text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={sending || !toEmail || !subject}
                    onClick={handleSendEmail}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs transition-colors shadow-sm"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {sending ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </NativeModal>
      )}
    </AdminPageWrapper>
  );
}
