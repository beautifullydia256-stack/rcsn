import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useSchoolChatUnreadTotal } from '@/hooks/useSchoolChatUnreadTotal';

export interface SystemAlertCounts {
  total: number;
  jobApps: number;
  admissions: number;
  leaves: number;
  inAppNotifs: number;
  chatUnread: number;
  emailsUnread: number;
  refetch: () => void;
}

/**
 * Live hook that aggregates pending alerts and unread counts across all school modules:
 * 1. New candidate job applications (hr_job_applications where status = 'new')
 * 2. Pending student admissions (admission_applications where status = 'pending' | 'new')
 * 3. Pending staff leave requests (hr_leave_requests where status = 'pending')
 * 4. Unread system in-app notifications (user_in_app_notifications where read_at is null)
 * 5. Unread school direct messages (school_chat_messages)
 * 6. Unread inbound institutional emails (institutional_emails where direction = 'inbound' and is_read = false)
 */
export function useSystemAlertsCount(
  userId: string | null | undefined,
  schoolId: string | null | undefined
): SystemAlertCounts {
  const chatUnread = useSchoolChatUnreadTotal(userId);

  const { data: dbCounts, refetch } = useQuery({
    queryKey: ['system-alerts-count', userId, schoolId],
    queryFn: async () => {
      if (!schoolId) return { jobApps: 0, admissions: 0, leaves: 0, inAppNotifs: 0, emailsUnread: 0 };

      const [jobsRes, admRes, leaveRes, inAppRes, emailsRes] = await Promise.all([
        supabase
          .from('hr_job_applications')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .eq('status', 'new'),
        supabase
          .from('admission_applications')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .in('status', ['pending', 'new', 'submitted']),
        supabase
          .from('hr_leave_requests')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .eq('status', 'pending'),
        userId
          ? supabase
              .from('user_in_app_notifications')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', userId)
              .is('read_at', null)
          : Promise.resolve({ count: 0, error: null }),
        supabase
          .from('institutional_emails')
          .select('id', { count: 'exact', head: true })
          .eq('direction', 'inbound')
          .eq('is_read', false),
      ]);

      return {
        jobApps: jobsRes.count || 0,
        admissions: admRes.count || 0,
        leaves: leaveRes.count || 0,
        inAppNotifs: inAppRes.count || 0,
        emailsUnread: emailsRes.count || 0,
      };
    },
    enabled: !!schoolId,
    refetchInterval: 30_000,
  });

  const jobApps = dbCounts?.jobApps || 0;
  const admissions = dbCounts?.admissions || 0;
  const leaves = dbCounts?.leaves || 0;
  const inAppNotifs = dbCounts?.inAppNotifs || 0;
  const emailsUnread = dbCounts?.emailsUnread || 0;

  const total = jobApps + admissions + leaves + inAppNotifs + chatUnread + emailsUnread;

  return {
    total,
    jobApps,
    admissions,
    leaves,
    inAppNotifs,
    chatUnread,
    emailsUnread,
    refetch,
  };
}
