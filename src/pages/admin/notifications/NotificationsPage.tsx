import React, { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Briefcase,
  MessageSquare,
  GraduationCap,
  Clock,
  ArrowRight,
  Check,
  CheckCheck,
  History,
  Inbox,
  Megaphone,
  RefreshCw,
  Send,
  CreditCard,
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  ExternalLink,
  Mail,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { registerApiUrl } from '../../../lib/registerApiOrigin';
import { useAuthStore } from '../../../store/authStore';
import { useUIStore } from '../../../store/uiStore';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';
import { fetchMyConversations, schoolChatConversationsQueryKey } from '@/lib/schoolChatApi';
import '@/assets/pwezacore-students-scoped.css';
import '@/styles/government-system.css';
import './notificationsCenter.css';

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap';

export async function fetchNotificationsPage(userId: string): Promise<{ schoolId: string }> {
  const { data } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  return { schoolId: data?.school_id || '' };
}

export type InAppNotificationRow = {
  id: string;
  title: string;
  body: string | null;
  category: string | null;
  read_at: string | null;
  created_at: string;
  metadata?: Record<string, unknown>;
};

export async function fetchInAppNotificationsInbox(userId: string): Promise<InAppNotificationRow[]> {
  const { data, error } = await supabase
    .from('user_in_app_notifications')
    .select('id, title, body, category, read_at, created_at, metadata')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data || []) as InAppNotificationRow[];
}

export type UnifiedNotification = {
  id: string;
  source: 'job' | 'admission' | 'chat' | 'leave' | 'system' | 'email';
  title: string;
  body: string | null;
  category: string;
  isRead: boolean;
  createdAt: string;
  targetUrl: string;
  badge?: string;
  referenceNo?: string | null;
  metadata?: Record<string, unknown>;
};

export type NotificationHistoryRow = {
  log_id: string;
  recipient: string;
  recipient_name: string | null;
  recipient_role: string | null;
  notification_type: string;
  category: string | null;
  status: 'pending' | 'sent' | 'failed';
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
};

type HistoryFilter = 'failed' | 'all' | 'sent' | 'pending';

export async function fetchNotificationHistory(filter: HistoryFilter): Promise<NotificationHistoryRow[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const qs = filter !== 'all' ? `&status=${filter}` : '';
  const res = await fetch(registerApiUrl(`/api/misc?action=admin-notification-history${qs}`), {
    headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to load delivery history');
  return (data.logs || []) as NotificationHistoryRow[];
}

type TabId = 'inbox' | 'tools' | 'history';
type AlertCategoryFilter = 'all' | 'unread' | 'email' | 'job' | 'chat' | 'admission' | 'approval' | 'system';
type BroadcastType = 'finance' | 'general';
type Channel = 'sms' | 'whatsapp';
type AudienceGroup = 'parents' | 'teachers' | 'students';

const AUDIENCE_OPTIONS: { id: AudienceGroup; label: string }[] = [
  { id: 'parents',  label: 'Parents'  },
  { id: 'teachers', label: 'Teachers' },
  { id: 'students', label: 'Students' },
];
const ALL_INDIVIDUAL_GROUPS: AudienceGroup[] = ['parents', 'teachers', 'students'];

function formatTimeAgo(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (Number.isNaN(diff)) return '';
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const SEEN_ALERTS_KEY = 'rcsn_admin_seen_alert_ids';

function getStoredSeenAlertIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_ALERTS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function persistSeenAlertId(id: string) {
  try {
    const set = getStoredSeenAlertIds();
    set.add(id);
    localStorage.setItem(SEEN_ALERTS_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

function persistMultipleSeenAlertIds(ids: string[]) {
  try {
    const set = getStoredSeenAlertIds();
    ids.forEach((id) => set.add(id));
    localStorage.setItem(SEEN_ALERTS_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

function getNotificationStyle(source: UnifiedNotification['source']) {
  switch (source) {
    case 'email':
      return {
        Icon: Mail,
        bgLight: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        bgDark: 'dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
      };
    case 'job':
      return {
        Icon: Briefcase,
        bgLight: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        bgDark: 'dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
      };
    case 'chat':
      return {
        Icon: MessageSquare,
        bgLight: 'bg-sky-100 text-sky-800 border-sky-300',
        bgDark: 'dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30',
      };
    case 'admission':
      return {
        Icon: GraduationCap,
        bgLight: 'bg-purple-100 text-purple-800 border-purple-300',
        bgDark: 'dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30',
      };
    case 'leave':
      return {
        Icon: Clock,
        bgLight: 'bg-amber-100 text-amber-900 border-amber-300',
        bgDark: 'dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30',
      };
    default:
      return {
        Icon: Bell,
        bgLight: 'bg-slate-100 text-slate-800 border-slate-300',
        bgDark: 'dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      };
  }
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const schoolId = useAuthStore((s) => s.schoolId);
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<TabId>('inbox');
  const [categoryFilter, setCategoryFilter] = useState<AlertCategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSeen, setShowSeen] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('failed');

  // Broadcast state
  const [broadcastType, setBroadcastType] = useState<BroadcastType>('finance');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [channels, setChannels] = useState<Set<Channel>>(new Set<Channel>(['whatsapp']));
  const [selectedGroups, setSelectedGroups] = useState<Set<AudienceGroup>>(new Set(['parents']));
  const [sendToAll, setSendToAll] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{
    queued: number; sms: number; whatsapp: number; message?: string;
  } | null>(null);
  const [waRemaining, setWaRemaining] = useState(0);
  const [processingQueue, setProcessingQueue] = useState(false);
  const [deliveryStats, setDeliveryStats] = useState<{ sent: number; failed: number } | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = 'pweza-students-fonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = FONT_HREF;
    document.head.appendChild(link);
  }, []);

  // Auto-drain queue every 30 seconds when messages are pending
  useEffect(() => {
    if (!processingQueue || waRemaining <= 0) {
      setProcessingQueue(false);
      return;
    }
    pollTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(registerApiUrl('/api/notifications/send'), { method: 'POST' });
        if (res.ok) {
          const data = (await res.json()) as {
            whatsapp_remaining?: number; hasMore?: boolean;
            whatsapp_sent?: number; whatsapp_failed?: number;
          };
          setWaRemaining(data.whatsapp_remaining ?? 0);
          setDeliveryStats((prev) => ({
            sent: (prev?.sent ?? 0) + (data.whatsapp_sent ?? 0),
            failed: (prev?.failed ?? 0) + (data.whatsapp_failed ?? 0),
          }));
          if (!data.hasMore) setProcessingQueue(false);
        } else {
          setProcessingQueue(false);
        }
      } catch {
        setProcessingQueue(false);
      }
    }, 30_000);
    return () => { if (pollTimerRef.current) clearTimeout(pollTimerRef.current); };
  }, [processingQueue, waRemaining]);

  // Aggregate Unified Notifications
  const {
    data: unifiedNotifications = [],
    isLoading: loadingNotifications,
    isFetching: fetchingNotifications,
    refetch: refetchNotifications,
  } = useQuery({
    queryKey: ['admin_unified_alerts_feed', user?.id, schoolId],
    queryFn: async (): Promise<UnifiedNotification[]> => {
      if (!user?.id) return [];

      const targetSchoolId = schoolId || '';

      const [inAppRes, jobsRes, admissionsRes, leavesRes, chatConv, emailsRes] = await Promise.all([
        supabase
          .from('user_in_app_notifications')
          .select('id, title, body, category, read_at, created_at, metadata')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100),
        targetSchoolId
          ? supabase
              .from('hr_job_applications')
              .select('id, job_id, full_name, email, phone, status, created_at, reference_no')
              .eq('school_id', targetSchoolId)
              .order('created_at', { ascending: false })
              .limit(50)
          : Promise.resolve({ data: [], error: null }),
        targetSchoolId
          ? supabase
              .from('admission_applications')
              .select('id, application_number, full_name, email, phone, status, created_at, admitted_program, intake')
              .eq('school_id', targetSchoolId)
              .order('created_at', { ascending: false })
              .limit(50)
          : Promise.resolve({ data: [], error: null }),
        targetSchoolId
          ? supabase
              .from('hr_leave_requests')
              .select('id, user_id, start_date, end_date, reason, status, created_at')
              .eq('school_id', targetSchoolId)
              .order('created_at', { ascending: false })
              .limit(50)
          : Promise.resolve({ data: [], error: null }),
        fetchMyConversations().catch(() => []),
        supabase
          .from('institutional_emails')
          .select('id, direction, from_email, from_name, to_email, subject, body_text, body_html, is_read, created_at, metadata')
          .eq('direction', 'inbound')
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      const items: UnifiedNotification[] = [];

      // 0. Inbound Official Emails
      if (emailsRes.data && Array.isArray(emailsRes.data)) {
        emailsRes.data.forEach((em) => {
          const isRead = !!em.is_read;
          let sender = (em.from_email || '').trim();
          const cleanName = (em.from_name || '')
            .replace(/<[^>]*>/g, '')
            .replace(/[()]/g, '')
            .trim();
          if (
            cleanName &&
            cleanName.toLowerCase() !== sender.toLowerCase() &&
            !cleanName.toLowerCase().includes(sender.toLowerCase())
          ) {
            sender = `${cleanName} • ${sender}`;
          }

          const attachments = Array.isArray(em.metadata?.attachments)
            ? (em.metadata.attachments as Array<{ filename?: string; name?: string }>)
            : [];
          const attachNames = attachments
            .map((a) => a.filename || a.name)
            .filter(Boolean)
            .join(', ');

          let preview = '';
          if (em.body_text && em.body_text.trim()) {
            preview = em.body_text.replace(/\s+/g, ' ').trim().slice(0, 160);
          } else if (em.body_html && em.body_html.trim()) {
            preview = em.body_html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
          } else if (attachNames) {
            preview = `Attachments: ${attachNames}`;
          }

          items.push({
            id: `email_${em.id}`,
            source: 'email',
            title: `Official Email: ${em.subject || '(No Subject)'}`,
            body: preview,
            category: 'Official Email',
            isRead,
            createdAt: em.created_at,
            targetUrl: `/dashboard/admin/emails?open=${em.id}`,
            badge: isRead ? 'Read' : 'New Inbound Email',
            referenceNo: null,
            metadata: {
              email_id: em.id,
              from_email: em.from_email,
              to_email: em.to_email,
              from_display: sender,
              preview: preview,
            },
          });
        });
      }

      // 1. Job Applications
      if (jobsRes.data && Array.isArray(jobsRes.data)) {
        jobsRes.data.forEach((app) => {
          const isNew = (app.status || '').toLowerCase() === 'new';
          items.push({
            id: app.id,
            source: 'job',
            title: `Job Application: ${app.full_name}`,
            body: `Submitted dossier for institutional vacancy. Contact: ${app.phone || app.email || 'N/A'}${
              app.reference_no ? ` | Ref: ${app.reference_no}` : ''
            }`,
            category: 'Job Application',
            isRead: !isNew,
            createdAt: app.created_at,
            targetUrl: `/dashboard/admin/jobs?openApp=${app.id}&jobId=${app.job_id}`,
            badge: isNew ? 'New Application' : 'Reviewed',
            referenceNo: app.reference_no,
            metadata: { job_id: app.job_id, applicant_id: app.id },
          });
        });
      }

      // 2. Student Admissions
      if (admissionsRes.data && Array.isArray(admissionsRes.data)) {
        admissionsRes.data.forEach((adm) => {
          const isPending =
            (adm.status || '').toLowerCase() === 'pending' ||
            (adm.status || '').toLowerCase() === 'new' ||
            (adm.status || '').toLowerCase() === 'submitted';
          items.push({
            id: adm.id,
            source: 'admission',
            title: `Student Admission: ${adm.full_name}`,
            body: `Applied for ${adm.admitted_program || 'Nursing & Midwifery'} (${adm.intake || 'Current Intake'}). App #: ${
              adm.application_number || 'Pending'
            }`,
            category: 'Student Admission',
            isRead: !isPending,
            createdAt: adm.created_at,
            targetUrl: `/dashboard/admin/admissions`,
            badge: isPending ? 'Pending Intake Review' : adm.status,
            referenceNo: adm.application_number,
            metadata: { application_id: adm.id },
          });
        });
      }

      // 3. School Chat Messages
      if (Array.isArray(chatConv)) {
        chatConv.forEach((conv) => {
          if (conv.unread_count > 0 || conv.last_body) {
            items.push({
              id: `chat_${conv.conversation_id}`,
              source: 'chat',
              title: `Direct Message: ${conv.peer_name}`,
              body: conv.last_body ? `"${conv.last_body}"` : 'Sent you a direct communication in school chat.',
              category: 'Chat Message',
              isRead: conv.unread_count === 0,
              createdAt: conv.last_at || new Date().toISOString(),
              targetUrl: `/dashboard/admin/messages?with=${conv.peer_user_id}&conversation=${conv.conversation_id}`,
              badge: conv.unread_count > 0 ? `${conv.unread_count} Unread` : 'Delivered',
              metadata: {
                conversation_id: conv.conversation_id,
                peer_user_id: conv.peer_user_id,
              },
            });
          }
        });
      }

      // 4. Staff Leave Approvals
      if (leavesRes.data && Array.isArray(leavesRes.data)) {
        leavesRes.data.forEach((l) => {
          const isPending = (l.status || '').toLowerCase() === 'pending';
          items.push({
            id: l.id,
            source: 'leave',
            title: `Staff Leave Approval Request`,
            body: `Faculty leave requested from ${l.start_date} to ${l.end_date}. Reason: ${l.reason || 'Not specified'}`,
            category: 'Staff Leave',
            isRead: !isPending,
            createdAt: l.created_at,
            targetUrl: `/dashboard/admin/workforce/leave`,
            badge: isPending ? 'Pending Approval' : l.status,
            metadata: { leave_id: l.id },
          });
        });
      }

      // 5. In-App Notifications
      if (inAppRes.data && Array.isArray(inAppRes.data)) {
        inAppRes.data.forEach((n) => {
          const isRead = !!n.read_at;
          const targetUrl =
            (n.metadata?.action_url as string) ||
            (n.metadata?.target_url as string) ||
            (n.metadata?.link as string) ||
            '';
          items.push({
            id: n.id,
            source: 'system',
            title: n.title,
            body: n.body,
            category: n.category || 'System Alert',
            isRead,
            createdAt: n.created_at,
            targetUrl,
            badge: isRead ? 'Seen' : 'Unread',
            metadata: n.metadata as Record<string, unknown>,
          });
        });
      }

      // Sync with locally seen alert IDs
      const seenSet = getStoredSeenAlertIds();
      items.forEach((item) => {
        if (seenSet.has(item.id)) {
          item.isRead = true;
        }
      });

      // Sort by newest first
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return items;
    },
    enabled: !!user?.id,
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  });

  const {
    data: historyLogs = [],
    isLoading: historyLoading,
    isFetching: historyFetching,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['admin', 'notifications', 'history', historyFilter],
    queryFn: () => fetchNotificationHistory(historyFilter),
    enabled: tab === 'history',
    staleTime: 30 * 1000,
  });

  // Filter and Search Calculations
  const filteredNotifications = useMemo(() => {
    return unifiedNotifications.filter((n) => {
      // By default, leave only those ones that have not yet been clicked in!
      if (!showSeen && n.isRead) return false;

      // Category filter
      if (categoryFilter === 'unread' && n.isRead) return false;
      if (categoryFilter === 'email' && n.source !== 'email') return false;
      if (categoryFilter === 'job' && n.source !== 'job') return false;
      if (categoryFilter === 'chat' && n.source !== 'chat') return false;
      if (categoryFilter === 'admission' && n.source !== 'admission') return false;
      if (categoryFilter === 'approval' && n.source !== 'leave') return false;
      if (categoryFilter === 'system' && n.source !== 'system') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = n.title.toLowerCase().includes(q);
        const matchBody = (n.body || '').toLowerCase().includes(q);
        const matchCategory = n.category.toLowerCase().includes(q);
        const matchRef = (n.referenceNo || '').toLowerCase().includes(q);
        const matchFrom = String(n.metadata?.from_display || n.metadata?.from_email || '').toLowerCase().includes(q);
        const matchTo = String(n.metadata?.to_email || '').toLowerCase().includes(q);
        return matchTitle || matchBody || matchCategory || matchRef || matchFrom || matchTo;
      }

      return true;
    });
  }, [unifiedNotifications, categoryFilter, showSeen, searchQuery]);

  const counts = useMemo(() => {
    const unread = unifiedNotifications.filter((n) => !n.isRead).length;
    const total = showSeen ? unifiedNotifications.length : unread;
    const email = unifiedNotifications.filter((n) => n.source === 'email' && (showSeen || !n.isRead)).length;
    const job = unifiedNotifications.filter((n) => n.source === 'job' && (showSeen || !n.isRead)).length;
    const chat = unifiedNotifications.filter((n) => n.source === 'chat' && (showSeen || !n.isRead)).length;
    const admission = unifiedNotifications.filter((n) => n.source === 'admission' && (showSeen || !n.isRead)).length;
    const approval = unifiedNotifications.filter((n) => n.source === 'leave' && (showSeen || !n.isRead)).length;
    const system = unifiedNotifications.filter((n) => n.source === 'system' && (showSeen || !n.isRead)).length;
    return { total, unread, email, job, chat, admission, approval, system };
  }, [unifiedNotifications, showSeen]);

  // Click Handler: Immediately Mark as Read/Reviewed, Persist Seen & Remove from New Alerts
  const handleNotificationClick = async (notif: UnifiedNotification) => {
    try {
      // 1. Immediately store ID in persistent storage
      persistSeenAlertId(notif.id);

      // 2. Optimistically update React Query cache so it disappears immediately from active new alerts
      queryClient.setQueryData<UnifiedNotification[]>(
        ['admin_unified_alerts_feed', user?.id, schoolId],
        (prev) => (prev || []).map((item) => (item.id === notif.id ? { ...item, isRead: true } : item))
      );

      // 3. If unread, mark read in database
      if (!notif.isRead) {
        if (notif.source === 'email') {
          const emailId = (notif.metadata?.email_id as string) || notif.id.replace('email_', '');
          await supabase
            .from('institutional_emails')
            .update({ is_read: true })
            .eq('id', emailId);
        } else if (notif.source === 'job' && notif.metadata?.applicant_id) {
          await supabase
            .from('hr_job_applications')
            .update({ status: 'reviewed' })
            .eq('id', notif.metadata.applicant_id as string);
        } else if (notif.source === 'system') {
          await supabase
            .from('user_in_app_notifications')
            .update({ read_at: new Date().toISOString() })
            .eq('id', notif.id);
        } else if (notif.source === 'admission' && notif.metadata?.application_id) {
          await supabase
            .from('admission_applications')
            .update({ status: 'under_review' })
            .eq('id', notif.metadata.application_id as string)
            .in('status', ['new', 'submitted', 'pending']);
        }

        void queryClient.invalidateQueries({ queryKey: ['system-alerts-count'] });
        void queryClient.invalidateQueries({ queryKey: ['institutional-emails'] });
      }

      // 4. Navigate directly to target page
      if (notif.targetUrl) {
        navigate(notif.targetUrl);
      }
    } catch (err) {
      console.error('Error handling notification click:', err);
      if (notif.targetUrl) navigate(notif.targetUrl);
    }
  };

  // Mark All As Read / Seen
  const markAllRead = async () => {
    if (!user?.id) return;
    setMarkingAll(true);
    try {
      const readAt = new Date().toISOString();

      // Persist all current notification IDs to local seen storage
      persistMultipleSeenAlertIds(unifiedNotifications.map((n) => n.id));

      // Mark all in-app notifications
      await supabase
        .from('user_in_app_notifications')
        .update({ read_at: readAt })
        .eq('user_id', user.id)
        .is('read_at', null);

      // Mark all pending new job applications as reviewed
      if (schoolId) {
        await supabase
          .from('hr_job_applications')
          .update({ status: 'reviewed' })
          .eq('school_id', schoolId)
          .eq('status', 'new');
      }

      // Mark all unread inbound institutional emails as read
      await supabase
        .from('institutional_emails')
        .update({ is_read: true })
        .eq('direction', 'inbound')
        .eq('is_read', false);

      // Mark pending admissions as under_review
      if (schoolId) {
        await supabase
          .from('admission_applications')
          .update({ status: 'under_review' })
          .eq('school_id', schoolId)
          .in('status', ['new', 'submitted', 'pending']);
      }

      await refetchNotifications();
      void queryClient.invalidateQueries({ queryKey: ['system-alerts-count'] });
      void queryClient.invalidateQueries({ queryKey: ['institutional-emails'] });
    } finally {
      setMarkingAll(false);
    }
  };

  const toggleChannel = (ch: Channel) => {
    setChannels((prev) => {
      const next = new Set(prev);
      next.has(ch) ? next.delete(ch) : next.add(ch);
      return next;
    });
  };

  // Audience helpers
  const toggleGroup = (group: AudienceGroup) => {
    if (sendToAll) {
      setSendToAll(false);
      setSelectedGroups(new Set(ALL_INDIVIDUAL_GROUPS.filter((g) => g !== group)));
    } else {
      setSelectedGroups((prev) => {
        const next = new Set(prev);
        next.has(group) ? next.delete(group) : next.add(group);
        return next;
      });
    }
  };

  const toggleAll = () => {
    if (sendToAll) {
      setSendToAll(false);
      setSelectedGroups(new Set(['parents']));
    } else {
      setSendToAll(true);
      setSelectedGroups(new Set(ALL_INDIVIDUAL_GROUPS));
    }
  };

  const effectiveAudience: string[] = sendToAll
    ? ['parents', 'teachers', 'students', 'admins']
    : [...selectedGroups];

  const audienceSummary = sendToAll
    ? 'Everyone (Parents, Teachers, Students & Admins)'
    : [...selectedGroups].map((g) => g.charAt(0).toUpperCase() + g.slice(1)).join(', ') || 'No one';

  const sendBroadcast = async () => {
    const selectedChannels = [...channels] as Channel[];
    if (!selectedChannels.length) { alert('Please select at least one channel (SMS or WhatsApp).'); return; }
    if (broadcastType === 'general' && !broadcastMessage.trim()) { alert('Please write a message for the announcement.'); return; }
    if (broadcastType === 'general' && effectiveAudience.length === 0) { alert('Please select at least one recipient group.'); return; }

    const channelLabel = selectedChannels.map((c) => c === 'sms' ? 'SMS' : 'WhatsApp').join(' and ');
    const typeLabel = broadcastType === 'finance' ? 'outstanding balance reminders' : 'this announcement';
    const toLabel = broadcastType === 'finance' ? 'parents with outstanding balances' : audienceSummary;
    if (!confirm(`Send ${typeLabel} via ${channelLabel} to: ${toLabel}?\n\nThis cannot be undone.`)) return;

    setBroadcasting(true);
    setBroadcastResult(null);
    setDeliveryStats(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(registerApiUrl('/api/admin/broadcast'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({
          type: broadcastType,
          channels: selectedChannels,
          message: broadcastType === 'general' ? broadcastMessage.trim() : undefined,
          audience: broadcastType === 'general' ? effectiveAudience : ['parents'],
        }),
      });
      const data = await res.json() as { success?: boolean; queued?: number; sms?: number; whatsapp?: number; message?: string; error?: string };
      if (!res.ok) { alert(data.error || 'Broadcast failed'); return; }

      setBroadcastResult({
        queued: data.queued ?? 0,
        sms: data.sms ?? 0,
        whatsapp: data.whatsapp ?? 0,
        message: data.message,
      });

      if ((data.queued ?? 0) > 0) {
        const sendRes = await fetch(registerApiUrl('/api/notifications/send'), { method: 'POST' });
        if (sendRes.ok) {
          const sendData = await sendRes.json() as {
            whatsapp_remaining?: number; hasMore?: boolean;
            whatsapp_sent?: number; whatsapp_failed?: number;
          };
          setWaRemaining(sendData.whatsapp_remaining ?? 0);
          setDeliveryStats({
            sent: sendData.whatsapp_sent ?? 0,
            failed: sendData.whatsapp_failed ?? 0,
          });
          if (sendData.hasMore) setProcessingQueue(true);
        }
      }

      if (broadcastType === 'general') setBroadcastMessage('');
    } finally {
      setBroadcasting(false);
    }
  };

  const inputClass = `ac-input w-full rounded-xl border px-3 py-2.5 text-xs sm:text-sm ac-text-primary ${
    isDark
      ? 'border-white/10 bg-white/5 placeholder:text-white/45'
      : 'border-slate-300 bg-white placeholder:text-slate-400 shadow-sm'
  } focus:outline-none focus:ring-2 focus:ring-emerald-500/50`;

  const tabSegmentBtn = (id: TabId, label: string, icon: ReactNode, desc: string) => (
    <button key={id} type="button" data-active={tab === id} onClick={() => setTab(id)} title={desc}>
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );

  return (
    <AdminPageWrapper>
      <div className="space-y-4">
        {/* ── 1. TOP HEADER (GOVERNMENT DESIGN SYSTEM STANDARD) ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
          <div className="flex items-center gap-3">
            <h1 className="text-[17px] font-bold tracking-tight text-[#111111] uppercase font-sans m-0">
              Alerts &amp; System Notifications
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-bold bg-[#EAEAEA] text-[#222222] border border-[#CCCCCC]">
              {counts.unread === 0 ? 'ALL CAUGHT UP' : `${counts.unread} UNREAD`}
            </span>
          </div>

          {/* Action Button Group */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* View Tabs */}
            <div className="inline-flex p-0.5 bg-[#EAEAEA] border border-[#CCCCCC] rounded gap-0.5">
              <button
                type="button"
                onClick={() => setTab('inbox')}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                  tab === 'inbox'
                    ? 'bg-white text-[#111111] shadow-xs'
                    : 'text-[#555555] hover:text-[#111111]'
                }`}
              >
                Alerts Inbox ({counts.total})
              </button>
              <button
                type="button"
                onClick={() => setTab('tools')}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                  tab === 'tools'
                    ? 'bg-white text-[#111111] shadow-xs'
                    : 'text-[#555555] hover:text-[#111111]'
                }`}
              >
                Broadcast
              </button>
              <button
                type="button"
                onClick={() => setTab('history')}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                  tab === 'history'
                    ? 'bg-white text-[#111111] shadow-xs'
                    : 'text-[#555555] hover:text-[#111111]'
                }`}
              >
                Delivery History
              </button>
            </div>

            {counts.unread > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                disabled={markingAll}
                className="gov-btn gov-btn-sm"
                title="Mark all alerts as read"
              >
                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{markingAll ? 'Updating...' : 'Mark All Read'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => void refetchNotifications()}
              disabled={fetchingNotifications}
              className="gov-btn gov-btn-sm"
              title="Refresh alerts"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${fetchingNotifications ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* ── 2. METRIC SUMMARY BOXES (PLAIN, HIGH-DENSITY, NO FLUFF) ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="gov-card p-3 rounded-lg text-center border border-[#CCCCCC]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#555555]">
              Active Alerts Feed
            </div>
            <div className="text-2xl font-mono font-bold text-[#111111] mt-1">
              {counts.total}
            </div>
          </div>

          <div className="gov-card p-3 rounded-lg text-center border border-[#CCCCCC]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#555555]">
              Unread Notifications
            </div>
            <div className="text-2xl font-mono font-bold text-[#111111] mt-1">
              {counts.unread}
            </div>
          </div>

          <div className="gov-card p-3 rounded-lg text-center border border-[#CCCCCC]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#555555]">
              Job Applications
            </div>
            <div className="text-2xl font-mono font-bold text-[#111111] mt-1">
              {counts.job}
            </div>
          </div>

          <div className="gov-card p-3 rounded-lg text-center border border-[#CCCCCC]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#555555]">
              Official Inbound Emails
            </div>
            <div className="text-2xl font-mono font-bold text-[#111111] mt-1">
              {counts.email}
            </div>
          </div>
        </div>

        {/* TAB 1: Unified Alerts Inbox */}
        {tab === 'inbox' && (
          <div className="space-y-4">
            {/* Control Bar */}
            <div className="gov-control-bar">
              <div className="gov-control-bar-left flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-[#555555] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search alerts by title, body, sender, or reference..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="gov-input pl-8 font-mono text-xs"
                  />
                </div>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as any)}
                  className="gov-select w-auto text-xs"
                  aria-label="Filter Category"
                >
                  <option value="all">Category: All ({counts.total})</option>
                  <option value="email">Official Emails ({counts.email})</option>
                  <option value="job">Job Applications ({counts.job})</option>
                  <option value="chat">Chat Messages ({counts.chat})</option>
                  <option value="admission">Admissions ({counts.admission})</option>
                  <option value="approval">Staff Leaves ({counts.approval})</option>
                  <option value="system">System ({counts.system})</option>
                </select>

                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-[#333333] px-2 py-1 bg-white border border-[#CCCCCC] rounded">
                  <input
                    type="checkbox"
                    checked={showSeen}
                    onChange={(e) => setShowSeen(e.target.checked)}
                    className="rounded border-[#CCCCCC] text-[#111111]"
                  />
                  <span>Show Opened Alerts</span>
                </label>
              </div>
            </div>

            {/* Main Notification Stream */}
            <div className="w-full min-w-0 space-y-3">
                {loadingNotifications ? (
                  <div className="space-y-3 animate-pulse">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-20 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10" />
                    ))}
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="rounded-2xl text-center py-14 sm:py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                      <CheckCircle2 className="h-7 w-7" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      No new alerts
                    </h3>
                    {!showSeen && unifiedNotifications.some((n) => n.isRead) && (
                      <button
                        type="button"
                        onClick={() => setShowSeen(true)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline pt-1"
                      >
                        <span>View opened alerts ({unifiedNotifications.filter((n) => n.isRead).length})</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <ul className="space-y-2.5">
                    {filteredNotifications.map((notif) => {
                      const style = getNotificationStyle(notif.source);
                      const IconComponent = style.Icon;

                      return (
                        <li key={notif.id}>
                          <button
                            type="button"
                            onClick={() => void handleNotificationClick(notif)}
                            className={`gov-card w-full text-left p-3.5 transition-colors flex items-start gap-3 border ${
                              !notif.isRead
                                ? 'border-[#111111] bg-white shadow-xs'
                                : 'border-[#CCCCCC] bg-[#F9F9FB] hover:bg-white'
                            }`}
                          >
                            {/* Category Icon */}
                            <div className="w-8 h-8 rounded border border-[#CCCCCC] bg-[#EAEAEA] flex items-center justify-center shrink-0 mt-0.5">
                              <IconComponent className="w-4 h-4 text-[#111111]" />
                            </div>

                            {/* Content Block */}
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex flex-wrap items-center justify-between gap-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={`text-xs font-bold leading-tight ${!notif.isRead ? 'text-[#111111]' : 'text-[#555555]'}`}>
                                    {notif.title}
                                  </span>

                                  {/* Reference Number Badge */}
                                  {notif.referenceNo && (
                                    <span className="gov-tag font-mono text-[10px]">
                                      REF: {notif.referenceNo}
                                    </span>
                                  )}

                                  {/* Category Tag */}
                                  <span className="gov-tag text-[10px]">
                                    {notif.category}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-mono text-[11px] text-[#777777]">
                                    {formatTimeAgo(notif.createdAt)}
                                  </span>
                                  {!notif.isRead && (
                                    <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" title="Unread" />
                                  )}
                                </div>
                              </div>

                              {/* Notification Details */}
                              {notif.source === 'email' && notif.metadata?.from_display ? (
                                <div className="text-xs text-[#555555] space-y-0.5 pt-0.5">
                                  <div>
                                    <span className="font-semibold text-[#111111]">From:</span> {String(notif.metadata.from_display)}
                                    {Boolean(notif.metadata.to_email) && (
                                      <span className="ml-2 font-mono text-[11px] text-[#555555]">
                                        To: {String(notif.metadata.to_email)}
                                      </span>
                                    )}
                                  </div>
                                  {notif.body && (
                                    <p className="line-clamp-2 text-[#333333] pt-0.5 border-t border-[#EAEAEA]">
                                      {notif.body}
                                    </p>
                                  )}
                                </div>
                              ) : notif.body ? (
                                <p className="text-xs text-[#555555] line-clamp-2">
                                  {notif.body}
                                </p>
                              ) : null}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SMS & WhatsApp Broadcast */}
          {tab === 'tools' && (
            <div className="gov-card p-5 max-w-2xl space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-[#111111] pb-2 border-b border-[#CCCCCC]">
                Multi-Channel Broadcast Dispatch
              </div>

              {/* Broadcast Type */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#555555]">
                  Campaign Type
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setBroadcastType('finance')}
                    className={`gov-btn gov-btn-sm flex-1 ${broadcastType === 'finance' ? 'gov-btn-primary' : ''}`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Outstanding Balances</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBroadcastType('general')}
                    className={`gov-btn gov-btn-sm flex-1 ${broadcastType === 'general' ? 'gov-btn-primary' : ''}`}
                  >
                    <Megaphone className="w-3.5 h-3.5" />
                    <span>General School Notice</span>
                  </button>
                </div>
              </div>

              {/* Delivery Channels */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#555555]">
                  Dispatch Channels
                </label>
                <div className="flex gap-2">
                  {(['sms', 'whatsapp'] as Channel[]).map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => toggleChannel(ch)}
                      className={`gov-btn gov-btn-sm ${channels.has(ch) ? 'gov-btn-primary' : ''}`}
                    >
                      <span>{ch === 'sms' ? 'SMS Messages' : 'WhatsApp Messages'}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* General Message */}
              {broadcastType === 'general' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#555555]">
                      Target Audience
                    </label>
                    <div className="flex gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={toggleAll}
                        className={`gov-btn gov-btn-sm ${sendToAll ? 'gov-btn-primary' : ''}`}
                      >
                        All Audiences
                      </button>
                      {AUDIENCE_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => toggleGroup(opt.id)}
                          className={`gov-btn gov-btn-sm ${!sendToAll && selectedGroups.has(opt.id) ? 'gov-btn-primary' : ''}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#555555]">
                      Message Body
                    </label>
                    <textarea
                      rows={4}
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      placeholder="Type your official announcement here..."
                      className="gov-textarea text-xs w-full"
                    />
                  </div>
                </div>
              )}

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={broadcasting}
                  onClick={() => void sendBroadcast()}
                  className="gov-btn gov-btn-sm gov-btn-primary"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{broadcasting ? 'Dispatching...' : 'Dispatch Broadcast'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Delivery History */}
          {tab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center gap-1.5">
                {(['all', 'sent', 'pending', 'failed'] as HistoryFilter[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setHistoryFilter(f)}
                    className={`gov-btn gov-btn-sm capitalize ${historyFilter === f ? 'gov-btn-primary' : ''}`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {historyLoading ? (
                <div className="gov-card p-8 text-center text-xs text-[#555555]">
                  Loading delivery logs...
                </div>
              ) : historyLogs.length === 0 ? (
                <div className="gov-card p-12 text-center text-xs text-[#555555]">
                  No delivery logs recorded for this filter.
                </div>
              ) : (
                <div className="gov-table-container">
                  <table className="gov-table">
                    <thead>
                      <tr>
                        <th>Recipient</th>
                        <th>Channel</th>
                        <th>Status</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyLogs.map((log) => (
                        <tr key={log.log_id}>
                          <td className="font-semibold">
                            {log.recipient_name || log.recipient}
                          </td>
                          <td className="font-mono uppercase text-xs">
                            {log.notification_type}
                          </td>
                          <td>
                            <span
                              className={`gov-tag ${
                                log.status === 'sent'
                                  ? 'gov-tag-approved'
                                  : log.status === 'failed'
                                  ? 'gov-tag-rejected'
                                  : 'gov-tag-warned'
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="font-mono text-xs">
                            {new Date(log.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </AdminPageWrapper>
  );
}
