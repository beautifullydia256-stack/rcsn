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
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { registerApiUrl } from '../../../lib/registerApiOrigin';
import { useAuthStore } from '../../../store/authStore';
import { useUIStore } from '../../../store/uiStore';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';
import { fetchMyConversations, schoolChatConversationsQueryKey } from '@/lib/schoolChatApi';
import '@/assets/pwezacore-students-scoped.css';
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
  source: 'job' | 'admission' | 'chat' | 'leave' | 'system';
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
type AlertCategoryFilter = 'all' | 'unread' | 'job' | 'chat' | 'admission' | 'approval' | 'system';
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

function getNotificationStyle(source: UnifiedNotification['source']) {
  switch (source) {
    case 'job':
      return {
        Icon: Briefcase,
        bgLight: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        bgDark: 'dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
        actionLabel: 'Review Candidate Dossier',
      };
    case 'chat':
      return {
        Icon: MessageSquare,
        bgLight: 'bg-sky-100 text-sky-800 border-sky-300',
        bgDark: 'dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30',
        actionLabel: 'Open Conversation',
      };
    case 'admission':
      return {
        Icon: GraduationCap,
        bgLight: 'bg-purple-100 text-purple-800 border-purple-300',
        bgDark: 'dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30',
        actionLabel: 'Review Student Admission',
      };
    case 'leave':
      return {
        Icon: Clock,
        bgLight: 'bg-amber-100 text-amber-900 border-amber-300',
        bgDark: 'dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30',
        actionLabel: 'Process Leave Request',
      };
    default:
      return {
        Icon: Bell,
        bgLight: 'bg-slate-100 text-slate-800 border-slate-300',
        bgDark: 'dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
        actionLabel: 'View Alert Details',
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
  const [hideSeen, setHideSeen] = useState(false);
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

      const [inAppRes, jobsRes, admissionsRes, leavesRes, chatConv] = await Promise.all([
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
      ]);

      const items: UnifiedNotification[] = [];

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
      // Category filter
      if (categoryFilter === 'unread' && n.isRead) return false;
      if (categoryFilter === 'job' && n.source !== 'job') return false;
      if (categoryFilter === 'chat' && n.source !== 'chat') return false;
      if (categoryFilter === 'admission' && n.source !== 'admission') return false;
      if (categoryFilter === 'approval' && n.source !== 'leave') return false;
      if (categoryFilter === 'system' && n.source !== 'system') return false;

      // Hide seen toggle
      if (hideSeen && n.isRead) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = n.title.toLowerCase().includes(q);
        const matchBody = (n.body || '').toLowerCase().includes(q);
        const matchCategory = n.category.toLowerCase().includes(q);
        const matchRef = (n.referenceNo || '').toLowerCase().includes(q);
        return matchTitle || matchBody || matchCategory || matchRef;
      }

      return true;
    });
  }, [unifiedNotifications, categoryFilter, hideSeen, searchQuery]);

  const counts = useMemo(() => {
    const total = unifiedNotifications.length;
    const unread = unifiedNotifications.filter((n) => !n.isRead).length;
    const job = unifiedNotifications.filter((n) => n.source === 'job').length;
    const chat = unifiedNotifications.filter((n) => n.source === 'chat').length;
    const admission = unifiedNotifications.filter((n) => n.source === 'admission').length;
    const approval = unifiedNotifications.filter((n) => n.source === 'leave').length;
    const system = unifiedNotifications.filter((n) => n.source === 'system').length;
    return { total, unread, job, chat, admission, approval, system };
  }, [unifiedNotifications]);

  // Click Handler: Immediately Mark as Read/Reviewed & Navigate to Destination
  const handleNotificationClick = async (notif: UnifiedNotification) => {
    try {
      // If unread, mark read in database
      if (!notif.isRead) {
        if (notif.source === 'job' && notif.metadata?.applicant_id) {
          await supabase
            .from('hr_job_applications')
            .update({ status: 'reviewed' })
            .eq('id', notif.metadata.applicant_id as string);
        } else if (notif.source === 'system') {
          await supabase
            .from('user_in_app_notifications')
            .update({ read_at: new Date().toISOString() })
            .eq('id', notif.id);
        }

        // Optimistically update React Query cache
        queryClient.setQueryData<UnifiedNotification[]>(
          ['admin_unified_alerts_feed', user?.id, schoolId],
          (prev) => (prev || []).map((item) => (item.id === notif.id ? { ...item, isRead: true } : item))
        );
        void queryClient.invalidateQueries({ queryKey: ['system-alerts-count'] });
      }

      // Navigate directly to target page
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

      await refetchNotifications();
      void queryClient.invalidateQueries({ queryKey: ['system-alerts-count'] });
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
      <div
        className={`pw-students pw-notif-center print:bg-[#07090f] ${isDark ? 'dark' : 'light'}`}
        data-theme={isDark ? 'dark' : 'light'}
      >
        <div className="page space-y-5">
          {/* Header Row */}
          <div className="page-header fade-up">
            <div className="page-title-block">
              <div className="page-eyebrow">Institutional Alert Registry</div>
              <h1 className="page-title text-slate-900 dark:text-white">Alerts &amp; Notifications</h1>
              <p className="page-sub text-slate-600 dark:text-slate-400">
                Track candidate job submissions, student admissions, school direct messages, and pending staff approvals.
              </p>
            </div>

            <div className="page-actions print:hidden !flex-wrap gap-2 sm:gap-3">
              {/* Live Count Pill */}
              <div
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs"
              >
                <Bell className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                <span className="text-xs sm:text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                  {counts.unread === 0 ? 'All alerts caught up' : `${counts.unread} pending alerts`}
                </span>
              </div>

              <button
                type="button"
                onClick={() => void refetchNotifications()}
                disabled={fetchingNotifications}
                className="btn btn-ghost !px-3 !min-w-[42px] min-h-[42px] justify-center rounded-xl border border-slate-200 dark:border-slate-800"
                title="Refresh alerts"
              >
                <RefreshCw className={`h-4 w-4 text-slate-700 dark:text-slate-300 ${fetchingNotifications ? 'animate-spin' : ''}`} />
              </button>

              {/* Segmented Top Tabs */}
              <div className="pw-notif-segment w-full basis-full min-[900px]:basis-auto min-[900px]:w-[min(100%,24rem)] sm:max-w-lg">
                {tabSegmentBtn('inbox', 'Alerts Inbox', <Inbox className="h-4 w-4 shrink-0 opacity-90" />, 'Alerts Feed')}
                {tabSegmentBtn('tools', 'Broadcast', <Send className="h-4 w-4 shrink-0 opacity-90" />, 'Send Broadcast')}
                {tabSegmentBtn('history', 'History', <History className="h-4 w-4 shrink-0 opacity-90" />, 'Delivery History')}
              </div>
            </div>
          </div>

          {/* TAB 1: Unified Alerts Inbox */}
          {tab === 'inbox' && (
            <div className="flex flex-col gap-5 lg:grid lg:grid-cols-12 lg:gap-6 items-start">
              {/* Sidebar Filters on Desktop / Top Controls on Mobile */}
              <aside className="w-full lg:col-span-4 xl:col-span-3 space-y-3.5 lg:sticky lg:top-4">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Filter Alerts
                    </h2>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {filteredNotifications.length} shown
                    </span>
                  </div>

                  {/* Search input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search alerts, candidate names, ref..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/70 pl-8.5 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Category Pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'all' as const, label: 'All Alerts', count: counts.total },
                      { id: 'unread' as const, label: 'Pending Only', count: counts.unread },
                      { id: 'job' as const, label: 'Job Applications', count: counts.job },
                      { id: 'chat' as const, label: 'Chat Messages', count: counts.chat },
                      { id: 'admission' as const, label: 'Admissions', count: counts.admission },
                      { id: 'approval' as const, label: 'Staff Leaves', count: counts.approval },
                      { id: 'system' as const, label: 'System', count: counts.system },
                    ].map((pill) => {
                      const isActive = categoryFilter === pill.id;
                      return (
                        <button
                          key={pill.id}
                          type="button"
                          onClick={() => setCategoryFilter(pill.id)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all flex items-center gap-1.5 ${
                            isActive
                              ? 'bg-emerald-600 text-white shadow-xs dark:bg-emerald-500/25 dark:text-emerald-300 dark:border dark:border-emerald-500/40'
                              : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:text-white'
                          }`}
                        >
                          <span>{pill.label}</span>
                          <span className={`text-[10.5px] tabular-nums font-bold ${isActive ? 'text-emerald-100' : 'text-slate-500'}`}>
                            ({pill.count})
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Actions & Hide Seen Toggle */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={hideSeen}
                        onChange={(e) => setHideSeen(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span>Hide seen / reviewed alerts</span>
                    </label>

                    {counts.unread > 0 && (
                      <button
                        type="button"
                        onClick={() => void markAllRead()}
                        disabled={markingAll}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25 border border-emerald-300 dark:border-emerald-500/30 px-3.5 py-2 text-xs font-bold transition-all disabled:opacity-50"
                      >
                        <CheckCheck className="h-4 w-4" />
                        <span>{markingAll ? 'Updating...' : 'Mark all as seen / reviewed'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </aside>

              {/* Main Notification Stream */}
              <div className="w-full lg:col-span-8 xl:col-span-9 min-w-0 space-y-3">
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
                      All Caught Up!
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                      {hideSeen || categoryFilter === 'unread'
                        ? 'There are no pending alerts in this category.'
                        : 'No alerts match your filter. When new job applications, chat messages, or admissions arrive, they will appear right here.'}
                    </p>
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
                            className={`w-full text-left rounded-2xl p-3.5 sm:p-4.5 transition-all flex items-start gap-3 sm:gap-4 shadow-xs border ${
                              !notif.isRead
                                ? 'bg-white dark:bg-slate-900 border-emerald-400/60 dark:border-emerald-500/40 hover:border-emerald-500 hover:shadow-md'
                                : 'bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 hover:bg-white dark:hover:bg-slate-900 hover:border-slate-300'
                            }`}
                          >
                            {/* Color-coded Category Icon */}
                            <div
                              className={`h-9 w-9 sm:h-10 sm:w-10 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${style.bgLight} ${style.bgDark}`}
                            >
                              <IconComponent className="h-4 w-4 sm:h-5 sm:w-5" />
                            </div>

                            {/* Content Block */}
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex flex-wrap items-center justify-between gap-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight">
                                    {notif.title}
                                  </span>

                                  {/* Reference Number Badge if present */}
                                  {notif.referenceNo && (
                                    <span className="font-mono text-[10.5px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                                      REF: {notif.referenceNo}
                                    </span>
                                  )}

                                  {/* Category Tag */}
                                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 dark:bg-white/10 dark:text-slate-300 dark:border-white/10">
                                    {notif.category}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[11px] tabular-nums font-medium text-slate-500 dark:text-slate-400">
                                    {formatTimeAgo(notif.createdAt)}
                                  </span>
                                  {!notif.isRead && (
                                    <span
                                      className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] shrink-0"
                                      title="Pending / Unread"
                                    />
                                  )}
                                </div>
                              </div>

                              {/* Notification Body Preview */}
                              {notif.body && (
                                <p className="text-xs sm:text-[13px] text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
                                  {notif.body}
                                </p>
                              )}

                              {/* Direct Navigation Action Prompt */}
                              <div className="pt-1 flex items-center justify-between text-xs">
                                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400 group-hover:underline">
                                  <span>{style.actionLabel}</span>
                                  <ArrowRight className="h-3 w-3" />
                                </span>

                                {!notif.isRead && (
                                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                                    Clicking directly opens record &amp; marks as seen
                                  </span>
                                )}
                              </div>
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
            <div className="max-w-2xl space-y-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                <div className="flex items-center gap-3 px-4 py-4 sm:px-5 border-b border-slate-200 dark:border-slate-800">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <Megaphone className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Broadcast Announcement</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Send SMS or WhatsApp communications to parents, tutors, and students.</p>
                  </div>
                </div>

                <div className="space-y-4 px-4 pb-6 pt-5 sm:px-5">
                  {/* Type selection */}
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">Campaign Type</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {[
                        {
                          id: 'finance' as BroadcastType,
                          title: 'Outstanding Balance Reminder',
                          desc: 'Notify sponsors/parents whose students have pending tuition fees.',
                        },
                        {
                          id: 'general' as BroadcastType,
                          title: 'General School Notice',
                          desc: 'Send customized institutional memos and announcements.',
                        },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setBroadcastType(opt.id)}
                          className={`rounded-xl border p-3 text-left transition-colors ${
                            broadcastType === opt.id
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
                              : 'border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/50'
                          }`}
                        >
                          <span className="flex items-center gap-2 mb-1">
                            <span
                              className={`h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                                broadcastType === opt.id ? 'border-emerald-600' : 'border-slate-300'
                              }`}
                            >
                              {broadcastType === opt.id && <span className="h-2 w-2 rounded-full bg-emerald-600" />}
                            </span>
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{opt.title}</span>
                          </span>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 pl-6">{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* General broadcast recipient selection */}
                  {broadcastType === 'general' && (
                    <>
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">Target Audience</p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={toggleAll}
                            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                              sendToAll
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950'
                            }`}
                          >
                            <span className={`h-3.5 w-3.5 rounded border flex items-center justify-center ${sendToAll ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300'}`}>
                              {sendToAll && <Check className="h-2.5 w-2.5 text-white" />}
                            </span>
                            All Audiences
                          </button>

                          {AUDIENCE_OPTIONS.map((opt) => {
                            const on = selectedGroups.has(opt.id);
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => toggleGroup(opt.id)}
                                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                                  on
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950'
                                }`}
                              >
                                <span className={`h-3.5 w-3.5 rounded border flex items-center justify-center ${on ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300'}`}>
                                  {on && <Check className="h-2.5 w-2.5 text-white" />}
                                </span>
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                          Message Body
                        </label>
                        <textarea
                          className={inputClass + ' min-h-[100px] resize-y'}
                          placeholder="Type your official announcement here..."
                          value={broadcastMessage}
                          onChange={(e) => setBroadcastMessage(e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  {/* Channel selection */}
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">Dispatch Channels</p>
                    <div className="flex flex-wrap gap-2.5">
                      {(['sms', 'whatsapp'] as Channel[]).map((ch) => (
                        <button
                          key={ch}
                          type="button"
                          onClick={() => toggleChannel(ch)}
                          className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors ${
                            channels.has(ch)
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950'
                          }`}
                        >
                          <span className={`h-3.5 w-3.5 rounded border flex items-center justify-center ${channels.has(ch) ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300'}`}>
                            {channels.has(ch) && <Check className="h-2.5 w-2.5 text-white" />}
                          </span>
                          {ch === 'sms' ? 'SMS Messages' : 'WhatsApp Messages'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={broadcasting}
                      onClick={() => void sendBroadcast()}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00873E] hover:bg-[#007033] text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{broadcasting ? 'Dispatching...' : 'Dispatch Broadcast'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Delivery History */}
          {tab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {(['all', 'sent', 'pending', 'failed'] as HistoryFilter[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setHistoryFilter(f)}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold capitalize ${
                      historyFilter === f
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {historyLoading ? (
                <div className="p-8 text-center text-xs text-slate-500">Loading delivery logs...</div>
              ) : historyLogs.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                  No delivery logs recorded for this filter.
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                        <tr>
                          <th className="p-3">Recipient</th>
                          <th className="p-3">Channel</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                        {historyLogs.map((log) => (
                          <tr key={log.log_id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                            <td className="p-3 font-medium text-slate-900 dark:text-white">
                              {log.recipient_name || log.recipient}
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-400 uppercase font-semibold">
                              {log.notification_type}
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  log.status === 'sent'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300'
                                    : log.status === 'failed'
                                    ? 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300'
                                }`}
                              >
                                {log.status}
                              </span>
                            </td>
                            <td className="p-3 tabular-nums text-slate-500 dark:text-slate-400">
                              {new Date(log.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminPageWrapper>
  );
}
