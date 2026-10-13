import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Clock,
  ArrowLeft,
  X,
  Plus,
  Trash2,
  Edit3,
  Save,
  Paperclip,
  Download,
  FileText,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
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

const OFFICIAL_MAILBOXES = [
  'info@rcsn.ac.ug',
  'admissions@rcsn.ac.ug',
  'admin@rcsn.ac.ug',
  'principal@rcsn.ac.ug',
];

const AVATAR_COLORS = [
  'bg-emerald-600',
  'bg-teal-600',
  'bg-blue-600',
  'bg-indigo-600',
  'bg-purple-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-cyan-600',
];

function getAvatarColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function getInitial(nameOrEmail: string): string {
  const clean = nameOrEmail.replace(/^["']/, '').trim();
  return clean ? clean.charAt(0).toUpperCase() : '?';
}

function formatEmailDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  const isSameYear = d.getFullYear() === now.getFullYear();
  if (isSameYear) {
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
}

export interface ExtractedDocumentLink {
  url: string;
  filename: string;
  provider: string;
  type: 'pdf' | 'doc' | 'image' | 'generic';
}

export function parseDocumentLinks(
  text: string | null | undefined,
  html: string | null | undefined,
  subject: string | null | undefined
): ExtractedDocumentLink[] {
  const docs: ExtractedDocumentLink[] = [];
  const combined = (text || '') + '\n' + (html || '');

  const urlRegex = /https?:\/\/[^\s<>"')]+/gi;
  const matches = combined.match(urlRegex) || [];
  const uniqueUrls = Array.from(new Set(matches));

  uniqueUrls.forEach((url) => {
    const lowerUrl = url.toLowerCase();
    const isAdobe = lowerUrl.includes('acrobat.adobe.com') || lowerUrl.includes('adobe.com');
    const isDrive = lowerUrl.includes('drive.google.com') || lowerUrl.includes('docs.google.com');
    const isOneDrive =
      lowerUrl.includes('1drv.ms') ||
      lowerUrl.includes('onedrive.live.com') ||
      lowerUrl.includes('sharepoint.com');
    const isDropbox = lowerUrl.includes('dropbox.com');
    const isDocFile = /\.(pdf|docx?|xlsx?|pptx?|zip|rar|png|jpe?g)($|\?)/i.test(url);
    const subjectIsFile = subject && /\.(pdf|docx?|xlsx?|pptx?|zip|rar|png|jpe?g)$/i.test(subject.trim());

    if (isAdobe || isDrive || isOneDrive || isDropbox || isDocFile || subjectIsFile) {
      let filename = '';
      if (subjectIsFile && subject) {
        filename = subject.trim();
      }

      if (text) {
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.includes(url)) {
            const beforeUrl = line.split(url)[0].trim().replace(/[:\s]+$/, '');
            if (beforeUrl && beforeUrl.length < 100 && !beforeUrl.startsWith('http')) {
              filename = beforeUrl;
              break;
            }
          }
        }
      }

      if (!filename) {
        if (isAdobe) filename = subject || 'Adobe Scan Document.pdf';
        else if (isDrive) filename = 'Google Drive Document';
        else if (isOneDrive) filename = 'OneDrive Document';
        else if (isDropbox) filename = 'Dropbox Document';
        else filename = 'Shared Document';
      }

      let provider = 'Cloud Shared Document';
      if (isAdobe) provider = 'Adobe Acrobat Cloud Document';
      else if (isDrive) provider = 'Google Drive Cloud File';
      else if (isOneDrive) provider = 'OneDrive Cloud Document';
      else if (isDropbox) provider = 'Dropbox Cloud File';
      else if (isDocFile) provider = 'External Document Link';

      let type: 'pdf' | 'doc' | 'image' | 'generic' = 'generic';
      const testName = (filename + ' ' + url).toLowerCase();
      if (testName.includes('.pdf') || isAdobe) type = 'pdf';
      else if (testName.includes('.doc') || testName.includes('.docx')) type = 'doc';
      else if (testName.includes('.png') || testName.includes('.jpg') || testName.includes('.jpeg')) type = 'image';

      docs.push({ url, filename, provider, type });
    }
  });

  return docs;
}

export function cleanBodyContent(
  text: string | null | undefined,
  html: string | null | undefined,
  docs: ExtractedDocumentLink[]
) {
  if (docs.length === 0) {
    return { cleanedText: text || '', cleanedHtml: html || '' };
  }

  let cleanedText = text || '';
  let cleanedHtml = html || '';

  docs.forEach((doc) => {
    // In plain text, strip out lines containing the raw document URL
    const textLines = cleanedText.split('\n').filter((l) => {
      const trimmed = l.trim();
      if (trimmed.includes(doc.url)) return false;
      if (
        doc.filename &&
        trimmed.toLowerCase().startsWith(doc.filename.toLowerCase()) &&
        trimmed.endsWith(':')
      ) {
        return false;
      }
      return true;
    });
    cleanedText = textLines.join('\n').trim();

    // In HTML, remove the anchor tag and redundant label
    if (cleanedHtml) {
      const urlEscaped = doc.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const linkTagRegex = new RegExp(`(<a[^>]*href=["']${urlEscaped}["'][^>]*>.*?<\\/a>)`, 'gi');
      cleanedHtml = cleanedHtml.replace(linkTagRegex, '');
      if (doc.filename) {
        const fnEscaped = doc.filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        cleanedHtml = cleanedHtml.replace(new RegExp(`${fnEscaped}:?\\s*`, 'gi'), '');
      }
      cleanedHtml = cleanedHtml.replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '<br/>').trim();
    }
  });

  return { cleanedText, cleanedHtml };
}

export default function AdminEmailsPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'all'>('inbox');
  const [selectedMailbox, setSelectedMailbox] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  // Reply Composer State
  const [showReplyComposer, setShowReplyComposer] = useState(false);
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
  const [syncingBody, setSyncingBody] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Deletion State
  const [deletingEmailId, setDeletingEmailId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<InstitutionalEmail | null>(null);

  // Manual Body Note State (Fallback if body is missing from provider)
  const [editingBody, setEditingBody] = useState(false);
  const [manualBodyText, setManualBodyText] = useState('');
  const [savingBody, setSavingBody] = useState(false);
  const [expandedThreadIds, setExpandedThreadIds] = useState<Record<string, boolean>>({});

  const toggleThreadExpand = (id: string) => {
    setExpandedThreadIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Fetch Emails
  const { data: emails = [], isLoading, isFetching, refetch } = useQuery<InstitutionalEmail[]>({
    queryKey: ['institutional-emails'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('institutional_emails')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching emails:', error);
        return [];
      }
      return (data || []) as InstitutionalEmail[];
    },
    refetchInterval: 15_000,
  });

  // Filter Emails
  const filteredEmails = useMemo(() => {
    return emails.filter((item) => {
      if (activeTab === 'inbox' && item.direction !== 'inbound') return false;
      if (activeTab === 'sent' && item.direction !== 'outbound') return false;

      if (selectedMailbox !== 'all') {
        const itemMailbox = item.direction === 'inbound' ? item.to_email : item.from_email;
        if (!itemMailbox.toLowerCase().includes(selectedMailbox.toLowerCase())) return false;
      }

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

  // Selected active email
  const activeEmail = useMemo(() => {
    if (!selectedEmailId) return null;
    return emails.find((e) => e.id === selectedEmailId) || null;
  }, [emails, selectedEmailId]);

  // Correspondent email (external party in conversation)
  const correspondentEmail = useMemo(() => {
    if (!activeEmail) return null;
    return (activeEmail.direction === 'inbound' ? activeEmail.from_email : activeEmail.to_email).toLowerCase().trim();
  }, [activeEmail]);

  // Full conversation thread history with this correspondent (all earlier & later messages)
  const conversationThread = useMemo(() => {
    if (!activeEmail || !correspondentEmail) return [];
    return emails
      .filter((e) => {
        if (e.id === activeEmail.id) return false;
        const eFrom = e.from_email.toLowerCase().trim();
        const eTo = e.to_email.toLowerCase().trim();
        return (
          eFrom === correspondentEmail ||
          eTo === correspondentEmail ||
          e.in_reply_to_id === activeEmail.id ||
          activeEmail.in_reply_to_id === e.id
        );
      })
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [emails, activeEmail, correspondentEmail]);

  // Earlier messages sent before this one
  const priorMessages = useMemo(() => {
    if (!activeEmail) return [];
    const activeTime = new Date(activeEmail.created_at).getTime();
    return conversationThread.filter((e) => new Date(e.created_at).getTime() < activeTime);
  }, [conversationThread, activeEmail]);

  // Subsequent messages sent after this one
  const subsequentMessages = useMemo(() => {
    if (!activeEmail) return [];
    const activeTime = new Date(activeEmail.created_at).getTime();
    return conversationThread.filter((e) => new Date(e.created_at).getTime() >= activeTime);
  }, [conversationThread, activeEmail]);

  // Thread replies
  const threadReplies = useMemo(() => {
    if (!activeEmail) return [];
    return emails
      .filter((e) => e.in_reply_to_id === activeEmail.id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [emails, activeEmail]);

  // Extracted cloud / Adobe Scan / Drive document links for active email
  const activeEmailDocs = useMemo(() => {
    if (!activeEmail) return [];
    return parseDocumentLinks(activeEmail.body_text, activeEmail.body_html, activeEmail.subject);
  }, [activeEmail]);

  // Cleaned text and HTML for active email (removes ugly raw URL links)
  const { cleanedActiveText, cleanedActiveHtml } = useMemo(() => {
    if (!activeEmail) return { cleanedActiveText: '', cleanedActiveHtml: '' };
    const res = cleanBodyContent(activeEmail.body_text, activeEmail.body_html, activeEmailDocs);
    return { cleanedActiveText: res.cleanedText, cleanedActiveHtml: res.cleanedHtml };
  }, [activeEmail, activeEmailDocs]);

  // Total messages count per correspondent for Inbox listing
  const correspondentMessageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    emails.forEach((e) => {
      const party = (e.direction === 'inbound' ? e.from_email : e.to_email).toLowerCase().trim();
      counts[party] = (counts[party] || 0) + 1;
    });
    return counts;
  }, [emails]);

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
      queryClient.invalidateQueries({ queryKey: ['system-alerts-count'] });
      queryClient.invalidateQueries({ queryKey: ['admin_unified_alerts_feed'] });
    },
  });

  // Auto-sync body from Resend API if empty
  const syncEmailBody = async (emailId: string) => {
    try {
      setSyncingBody(true);
      setSyncNotice(null);
      const res = await fetch(registerApiUrl('/api/misc?action=sync-email-body'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: emailId }),
      });
      const json = await res.json().catch(() => ({}));
      if (json.restrictedKey) {
        setSyncNotice(
          json.message ||
            'Resend API key is configured with Send-Only permissions. Inbound email bodies require a Full Access key in Resend dashboard.'
        );
      } else if (!res.ok || json.error) {
        setSyncNotice(json.error || 'Unable to retrieve email body from provider');
      }
      await queryClient.invalidateQueries({ queryKey: ['institutional-emails'] });
    } catch (err: any) {
      console.warn('Sync email body failed:', err);
      setSyncNotice(err.message || 'Network error fetching email body');
    } finally {
      setSyncingBody(false);
    }
  };

  // Delete Email Handler
  const handleDeleteEmail = async (email: InstitutionalEmail) => {
    try {
      setDeletingEmailId(email.id);

      // 1. Backend API delete call
      const res = await fetch(registerApiUrl('/api/misc?action=delete-email'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: email.id }),
      });

      // 2. Direct client supabase deletion fallback
      if (!res.ok) {
        const { error: sbErr } = await supabase
          .from('institutional_emails')
          .delete()
          .eq('id', email.id);
        if (sbErr) throw sbErr;
      }

      if (selectedEmailId === email.id) {
        setSelectedEmailId(null);
      }
      setShowDeleteConfirm(null);
      await queryClient.invalidateQueries({ queryKey: ['institutional-emails'] });
      await queryClient.invalidateQueries({ queryKey: ['system-alerts-count'] });
      await queryClient.invalidateQueries({ queryKey: ['admin_unified_alerts_feed'] });
    } catch (err: any) {
      console.error('Delete email failed:', err);
      alert(err.message || 'Failed to delete email');
    } finally {
      setDeletingEmailId(null);
    }
  };

  // Save manual body / note for messages with missing body
  const [downloadingAttachId, setDownloadingAttachId] = useState<string | null>(null);

  const handleDownloadAttachment = async (email: InstitutionalEmail, attach: any) => {
    try {
      setDownloadingAttachId(attach.id || attach.filename);
      // 1. If download_url is already cached in attachment object
      if (attach.download_url) {
        window.open(attach.download_url, '_blank');
        return;
      }

      // 2. Request download link from backend API
      const res = await fetch(registerApiUrl('/api/misc?action=email-attachment'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId: email.id, attachmentId: attach.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
      } else {
        alert(
          data.error ||
            'Unable to generate download link. Note that downloading inbound attachments requires the Resend API key to have Full Access permissions.'
        );
      }
    } catch (err: any) {
      console.error('Download attachment failed:', err);
      alert(err.message || 'Failed to download attachment');
    } finally {
      setDownloadingAttachId(null);
    }
  };
  const handleSaveManualBody = async () => {
    if (!activeEmail || !manualBodyText.trim()) return;
    try {
      setSavingBody(true);
      const text = manualBodyText.trim();
      const { error } = await supabase
        .from('institutional_emails')
        .update({
          body_text: text,
          body_html: `<p>${text.replace(/\n/g, '<br/>')}</p>`,
        })
        .eq('id', activeEmail.id);

      if (error) throw error;
      setEditingBody(false);
      setManualBodyText('');
      await queryClient.invalidateQueries({ queryKey: ['institutional-emails'] });
    } catch (err: any) {
      alert(err.message || 'Failed to save email note');
    } finally {
      setSavingBody(false);
    }
  };

  const handleSelectEmail = (item: InstitutionalEmail) => {
    setSelectedEmailId(item.id);
    setShowReplyComposer(false);
    setEditingBody(false);
    setManualBodyText('');
    setSyncNotice(null);
    if (!item.is_read && item.direction === 'inbound') {
      markAsReadMutation.mutate(item.id);
    }
    setReplyText('');
    setReplyStatus('idle');
    setReplyError(null);
    if (item.direction === 'inbound') {
      setReplyFrom(item.to_email || 'info@rcsn.ac.ug');
    }

    // If body is empty and resend_id exists, fetch body from Resend
    if (!item.body_text && !item.body_html && item.resend_id) {
      syncEmailBody(item.id);
    }
  };

  // Auto-open email if specified in URL query params (e.g. from Alerts feed)
  useEffect(() => {
    const openId = searchParams.get('open');
    if (openId && emails.length > 0 && selectedEmailId !== openId) {
      const found = emails.find((e) => e.id === openId);
      if (found) {
        handleSelectEmail(found);
      }
    }
  }, [searchParams, emails, selectedEmailId]);

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
        throw new Error(json.error || 'Failed to dispatch reply');
      }

      setReplyStatus('success');
      setReplyText('');
      setShowReplyComposer(false);
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

  const unreadCount = useMemo(() => {
    return emails.filter((e) => e.direction === 'inbound' && !e.is_read).length;
  }, [emails]);

  return (
    <AdminPageWrapper title="Emails">
      <div className="space-y-3 relative pb-28 sm:pb-16 min-h-[calc(100vh-140px)]">
        {/* Top Search Bar & Controls */}
        <div className="space-y-3">
          {/* Top Row: Search Input + Professional Compose Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search in emails"
                className="w-full pl-11 pr-10 py-2.5 sm:py-3 rounded-full bg-slate-800/90 dark:bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setComposeOpen(true)}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 shrink-0"
              title="Compose New Email"
            >
              <Plus className="w-4 h-4" />
              <span>Compose</span>
            </button>
          </div>

          {/* Filter Pills & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('inbox');
                  setSelectedEmailId(null);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  activeTab === 'inbox'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300'
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
                onClick={() => {
                  setActiveTab('sent');
                  setSelectedEmailId(null);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  activeTab === 'sent'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Sent</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('all');
                  setSelectedEmailId(null);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  activeTab === 'all'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>All Mail ({emails.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedMailbox}
                onChange={(e) => setSelectedMailbox(e.target.value)}
                className="px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">All Mailboxes</option>
                {OFFICIAL_MAILBOXES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                className="p-2 rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: EMAIL READER VIEW (Shown when an email is selected)               */}
        {/* ========================================================================= */}
        {activeEmail ? (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in duration-150">
            {/* Top Toolbar with Back to Inbox button & Delete Action */}
            <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedEmailId(null)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-emerald-500 hover:text-white font-bold text-xs transition shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Inbox</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
                  {formatEmailDate(activeEmail.created_at)}
                </span>
                {(!activeEmail.body_text && !activeEmail.body_html && activeEmail.resend_id) && (
                  <button
                    type="button"
                    onClick={() => syncEmailBody(activeEmail.id)}
                    disabled={syncingBody}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-600/30 transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${syncingBody ? 'animate-spin' : ''}`} />
                    <span>{syncingBody ? 'Loading...' : 'Reload Body'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(activeEmail)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold transition border border-rose-200 dark:border-rose-800"
                  title="Delete this email"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>

            {/* Email Subject Header */}
            <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                {activeEmail.subject || '(No Subject)'}
              </h2>
              {conversationThread.length > 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/30">
                  Thread: {conversationThread.length + 1} messages with this contact
                </span>
              )}
            </div>

            {/* Earlier Messages in Conversation (Gmail style) */}
            {priorMessages.length > 0 && (
              <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-4 sm:p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Earlier messages from this sender ({priorMessages.length})
                  </span>
                  <span className="text-[11px] text-slate-400">Click to expand</span>
                </div>
                <div className="space-y-2.5">
                  {priorMessages.map((pm) => {
                    const isExpanded = !!expandedThreadIds[pm.id];
                    const pmIsInbound = pm.direction === 'inbound';
                    const pmSender = pmIsInbound ? pm.from_name || pm.from_email : `School to ${pm.to_email}`;
                    const pmDocs = parseDocumentLinks(pm.body_text, pm.body_html, pm.subject);
                    const { cleanedText: pmCleanText, cleanedHtml: pmCleanHtml } = cleanBodyContent(
                      pm.body_text,
                      pm.body_html,
                      pmDocs
                    );
                    const pmPreview =
                      pmCleanText ||
                      pm.body_text ||
                      (pm.body_html ? pm.body_html.replace(/<[^>]+>/g, '') : '') ||
                      (pmDocs.length > 0 ? 'Document attachment shared' : '(Click to view message)');
                    const pmAttachments = Array.isArray(pm.metadata?.attachments) ? pm.metadata.attachments : [];
                    const pmTotalAttachmentsCount = pmAttachments.length + pmDocs.length;

                    return (
                      <div
                        key={pm.id}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition shadow-sm"
                      >
                        {/* Header bar / collapsed view */}
                        <div
                          onClick={() => toggleThreadExpand(pm.id)}
                          className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-full ${getAvatarColor(pmSender)} text-white font-bold text-xs flex items-center justify-center shrink-0`}>
                              {getInitial(pmSender)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                  {pmSender}
                                </span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${pmIsInbound ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'}`}>
                                  {pmIsInbound ? 'Received' : 'Sent'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                <strong className="text-slate-700 dark:text-slate-300 mr-1">{pm.subject || '(No subject)'}:</strong>
                                {pmPreview}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {pmTotalAttachmentsCount > 0 && (
                              <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            <span className="text-[11px] text-slate-500 font-medium">
                              {formatEmailDate(pm.created_at)}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectEmail(pm);
                              }}
                              className="px-2 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                              title="Make this the active email"
                            >
                              Open
                            </button>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          </div>
                        </div>

                        {/* Expanded full body & attachments */}
                        {isExpanded && (
                          <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-3 bg-slate-50/40 dark:bg-slate-950/40">
                            {pmCleanHtml ? (
                              <div
                                className="text-xs sm:text-sm leading-relaxed prose dark:prose-invert max-w-none break-words"
                                dangerouslySetInnerHTML={{ __html: pmCleanHtml }}
                              />
                            ) : pmCleanText ? (
                              <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                                {pmCleanText}
                              </p>
                            ) : pmDocs.length > 0 ? (
                              <p className="text-xs text-slate-500 italic">
                                Document attachment(s) shared below.
                              </p>
                            ) : (
                              <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                                {pm.body_text || '(No body content)'}
                              </p>
                            )}

                            {pmTotalAttachmentsCount > 0 && (
                              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 space-y-2">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                  Attachments &amp; Documents ({pmTotalAttachmentsCount})
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {pmDocs.map((pdoc, idx) => (
                                    <div key={`pm-doc-${idx}`} className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <FileText className={`w-4 h-4 ${pdoc.type === 'pdf' ? 'text-rose-500' : 'text-emerald-500'} shrink-0`} />
                                        <div className="min-w-0">
                                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{pdoc.filename}</p>
                                          <p className="text-[10px] text-slate-400">{pdoc.provider}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <a
                                          href={registerApiUrl(
                                            `/api/misc?action=download-cloud-document&url=${encodeURIComponent(
                                              pdoc.url
                                            )}&filename=${encodeURIComponent(pdoc.filename)}`
                                          )}
                                          download={pdoc.filename || 'document.pdf'}
                                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shrink-0 inline-flex items-center gap-1 shadow-sm"
                                          title="Download PDF directly for offline access"
                                        >
                                          <Download className="w-3 h-3" />
                                          <span>Download</span>
                                        </a>
                                        <a
                                          href={pdoc.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-1 rounded border border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-200 text-[11px] transition"
                                          title="View in Adobe / Online"
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                        </a>
                                      </div>
                                    </div>
                                  ))}
                                  {pmAttachments.map((att: any, idx: number) => (
                                    <div key={idx} className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{att.filename || 'attachment'}</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleDownloadAttachment(pm, att)}
                                        className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shrink-0 inline-flex items-center gap-1"
                                      >
                                        <Download className="w-3 h-3" />
                                        <span>Download</span>
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sender / Recipient Information Bar */}
            <div className="p-4 sm:p-6 flex items-start gap-3.5 border-b border-slate-100 dark:border-slate-800/60">
              <div
                className={`w-11 h-11 rounded-full ${getAvatarColor(
                  activeEmail.from_name || activeEmail.from_email
                )} text-white font-bold text-base flex items-center justify-center shrink-0 shadow-md`}
              >
                {getInitial(activeEmail.from_name || activeEmail.from_email)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-1">
                  <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                    {activeEmail.from_name || activeEmail.from_email}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {new Date(activeEmail.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 space-x-1">
                  <span>&lt;{activeEmail.from_email}&gt;</span>
                  <span>•</span>
                  <span>to <strong>{activeEmail.to_email}</strong></span>
                </div>
              </div>
            </div>

            {/* Email Body Content */}
            <div className="p-5 sm:p-8 min-h-[220px] text-slate-800 dark:text-slate-100">
              {syncingBody ? (
                <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400" />
                  <p>Retrieving message content from secure email server...</p>
                </div>
              ) : cleanedActiveHtml ? (
                <div
                  className="text-sm sm:text-base leading-relaxed prose dark:prose-invert max-w-none break-words"
                  dangerouslySetInnerHTML={{ __html: cleanedActiveHtml }}
                />
              ) : cleanedActiveText ? (
                <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-sans">
                  {cleanedActiveText}
                </p>
              ) : activeEmailDocs.length > 0 ? (
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 italic">
                  This message contains shared document attachment(s) available below.
                </p>
              ) : null}

              {/* Inbound Attachments & Shared Cloud Documents Card */}
              {(() => {
                const regularAttachments = Array.isArray(activeEmail.metadata?.attachments)
                  ? activeEmail.metadata.attachments
                  : [];
                const totalCount = activeEmailDocs.length + regularAttachments.length;
                if (totalCount === 0) return null;

                return (
                  <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      <Paperclip className="w-4 h-4 text-emerald-500" />
                      <span>Attachments &amp; Documents ({totalCount})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* 1. Cloud & Adobe Scan document attachments */}
                      {activeEmailDocs.map((doc, idx) => (
                        <div
                          key={`active-doc-${idx}`}
                          className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 hover:border-emerald-500/50 transition group"
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                doc.type === 'pdf'
                                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              }`}
                            >
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p
                                className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate"
                                title={doc.filename}
                              >
                                {doc.filename}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {doc.provider}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <a
                              href={registerApiUrl(
                                `/api/misc?action=download-cloud-document&url=${encodeURIComponent(
                                  doc.url
                                )}&filename=${encodeURIComponent(doc.filename)}`
                              )}
                              download={doc.filename || 'document.pdf'}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition active:scale-95 shrink-0"
                              title="Download PDF directly to your computer/phone for offline reading"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download</span>
                            </a>
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs transition"
                              title="View online in Adobe"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      ))}

                      {/* 2. Direct binary attachments from metadata */}
                      {regularAttachments.map((attach: any, idx: number) => {
                        const filename = attach.filename || `Attachment-${idx + 1}`;
                        const sizeStr = attach.size ? `${Math.round(attach.size / 1024)} KB` : '';
                        const isDownloading = downloadingAttachId === (attach.id || attach.filename);

                        return (
                          <div
                            key={attach.id || idx}
                            className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 hover:border-emerald-500/50 transition group"
                          >
                            <div className="flex items-center gap-3 min-w-0 pr-2">
                              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate" title={filename}>
                                  {filename}
                                </p>
                                {sizeStr && (
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    {sizeStr}
                                  </p>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDownloadAttachment(activeEmail, attach)}
                              disabled={isDownloading}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition active:scale-95 shrink-0 disabled:opacity-50"
                            >
                              <Download className={`w-3.5 h-3.5 ${isDownloading ? 'animate-bounce' : ''}`} />
                              <span>{isDownloading ? 'Opening…' : 'Download'}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {!syncingBody && !activeEmail.body_html && !activeEmail.body_text && activeEmailDocs.length === 0 && (
                <div className="py-8 px-4 max-w-xl mx-auto text-center space-y-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/60 mt-4">
                  <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Message body is loading or empty.
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      This inbound email metadata was stored. Note that inbound body retrieval requires a Resend API key configured with <strong>Full Access</strong> permissions.
                    </p>
                  </div>

                  {syncNotice && (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs text-left leading-relaxed">
                      {syncNotice}
                    </div>
                  )}

                  {editingBody ? (
                    <div className="text-left space-y-2 pt-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Enter or paste email body / note:
                      </label>
                      <textarea
                        rows={4}
                        value={manualBodyText}
                        onChange={(e) => setManualBodyText(e.target.value)}
                        placeholder="Type message content or notes..."
                        className="w-full p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white font-sans focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setEditingBody(false)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveManualBody}
                          disabled={savingBody || !manualBodyText.trim()}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition disabled:opacity-50"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{savingBody ? 'Saving...' : 'Save Content'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      {activeEmail.resend_id && (
                        <button
                          type="button"
                          onClick={() => syncEmailBody(activeEmail.id)}
                          disabled={syncingBody}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${syncingBody ? 'animate-spin' : ''}`} />
                          <span>{syncingBody ? 'Fetching...' : 'Fetch Email Body'}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setManualBodyText('');
                          setEditingBody(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Add / Paste Note</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(activeEmail)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold transition border border-rose-200 dark:border-rose-800"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Email</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Thread Responses */}
            {threadReplies.length > 0 && (
              <div className="p-5 sm:p-8 border-t border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
                <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Sent Replies ({threadReplies.length})
                </h4>
                {threadReplies.map((reply) => (
                  <div
                    key={reply.id}
                    className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>From: <strong>{reply.from_email}</strong></span>
                      <span>{new Date(reply.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {reply.body_text}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom Actions / Reply Section */}
            <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
              {!showReplyComposer ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowReplyComposer(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition-all active:scale-[0.98]"
                    >
                      <Reply className="w-4 h-4" />
                      <span>Reply</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedEmailId(null)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <span>Back to Inbox</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(activeEmail)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-xs transition border border-rose-200 dark:border-rose-800"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Email</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendReply} className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                      <Reply className="w-4 h-4 text-emerald-500" />
                      <span>Reply to {activeEmail.from_email}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-slate-500 dark:text-slate-400">From:</span>
                      <select
                        value={replyFrom}
                        onChange={(e) => setReplyFrom(e.target.value)}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-emerald-600 dark:text-emerald-400 font-bold focus:outline-none"
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
                    className="w-full p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
                    required
                  />

                  {replyError && (
                    <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{replyError}</span>
                    </div>
                  )}

                  {replyStatus === 'success' && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Reply delivered successfully!</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setShowReplyComposer(false)}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={replyStatus === 'sending' || !replyText.trim()}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm transition shadow-md disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      <span>{replyStatus === 'sending' ? 'Sending...' : 'Send Reply'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* VIEW 2: GMAIL-STYLE INBOX LIST                                            */
          /* ========================================================================= */
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {isLoading ? (
                <div className="p-16 text-center text-slate-400 text-xs space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-500 mb-2" />
                  <span>Loading emails...</span>
                </div>
              ) : filteredEmails.length === 0 ? (
                <div className="p-16 text-center text-slate-400 text-xs space-y-2">
                  <Inbox className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-600 opacity-60" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No emails in this view</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Incoming emails sent to @rcsn.ac.ug will appear here.
                  </p>
                </div>
              ) : (
                filteredEmails.map((item) => {
                  const isInbound = item.direction === 'inbound';
                  const isUnread = !item.is_read && isInbound;
                  const senderDisplay = isInbound
                    ? item.from_name || item.from_email
                    : `To: ${item.to_email}`;
                  const avatarLetter = getInitial(senderDisplay);
                  const avatarColor = getAvatarColor(senderDisplay);
                  const itemDocs = parseDocumentLinks(item.body_text, item.body_html, item.subject);
                  const { cleanedText: itemCleanedText } = cleanBodyContent(
                    item.body_text,
                    item.body_html,
                    itemDocs
                  );
                  const previewText =
                    itemCleanedText ||
                    item.body_text ||
                    (item.body_html ? item.body_html.replace(/<[^>]+>/g, '') : '') ||
                    (itemDocs.length > 0 ? 'Document attachment shared' : '');
                  const hasAttachments =
                    (Array.isArray(item.metadata?.attachments) && item.metadata.attachments.length > 0) ||
                    itemDocs.length > 0;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectEmail(item)}
                      className={`p-3.5 sm:p-4 flex items-start gap-3.5 cursor-pointer transition-colors ${
                        isUnread
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/30'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Avatar Circle with Initial Letter (like Gmail) */}
                      <div
                        className={`w-10 h-10 rounded-full ${avatarColor} text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm mt-0.5`}
                      >
                        {avatarLetter}
                      </div>

                      {/* Email Row Content */}
                      <div className="flex-1 min-w-0">
                        {/* Top Row: Sender Name (left) & Date / Actions (right) */}
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-sm truncate ${
                              isUnread
                                ? 'font-black text-slate-900 dark:text-white'
                                : 'font-semibold text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {senderDisplay}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            {hasAttachments && (
                              <Paperclip className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                            )}
                            <span
                              className={`text-xs font-medium ${
                                isUnread
                                  ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                                  : 'text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              {formatEmailDate(item.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* Middle Row: Subject Line */}
                        <p
                          className={`text-xs sm:text-sm truncate mt-0.5 ${
                            isUnread
                              ? 'font-bold text-slate-900 dark:text-slate-100'
                              : 'font-normal text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {item.subject || '(No Subject)'}
                        </p>

                        {/* Bottom Row: Body Snippet Preview */}
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate line-clamp-1 mt-0.5">
                          {previewText || '(Click to open message)'}
                        </p>
                      </div>

                      {/* Unread Indicator Dot */}
                      {isUnread && (
                        <div className="shrink-0 self-center">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block shadow-sm" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Compose Email Modal */}
        {composeOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  New Message
                </span>
                <button
                  type="button"
                  onClick={() => setComposeOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSendCompose} className="p-4 sm:p-5 space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Send From:
                  </label>
                  <select
                    value={composeFrom}
                    onChange={(e) => setComposeFrom(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {OFFICIAL_MAILBOXES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    To:
                  </label>
                  <input
                    type="email"
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                    placeholder="recipient@example.com"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Subject:
                  </label>
                  <input
                    type="text"
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    placeholder="Subject"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Message:
                  </label>
                  <textarea
                    rows={6}
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    placeholder="Write your email message..."
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setComposeOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={replyStatus === 'sending'}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{replyStatus === 'sending' ? 'Sending...' : 'Send'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1.5">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Email?</h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Are you sure you want to delete this email from{' '}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {showDeleteConfirm.from_name || showDeleteConfirm.from_email}
                  </strong>{' '}
                  with subject{' '}
                  <strong className="text-slate-800 dark:text-slate-200">
                    "{showDeleteConfirm.subject || '(No Subject)'}"
                  </strong>?
                </p>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium pt-1">
                  This action will permanently remove it from the institution's mailbox.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(null)}
                  disabled={deletingEmailId !== null}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteEmail(showDeleteConfirm)}
                  disabled={deletingEmailId !== null}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 font-bold text-xs text-white shadow-lg transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {deletingEmailId ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Permanently</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminPageWrapper>
  );
}
