import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchMyConversations,
  schoolChatConversationsQueryKey,
  subscribeSchoolChatInboxRefresh,
} from '@/lib/schoolChatApi';

/**
 * Total unread DM count for the signed-in user (sum of `unread_count` from `school_chat_my_conversations`).
 * Shares React Query cache with `SchoolChatPage`; live-updated via Supabase Realtime.
 */
export function useSchoolChatUnreadTotal(userId: string | null | undefined): number {
  const queryClient = useQueryClient();

  const { data: unread = 0 } = useQuery({
    queryKey: userId ? schoolChatConversationsQueryKey(userId) : (['school-chat', 'conversations', '__none'] as const),
    queryFn: fetchMyConversations,
    enabled: !!userId,
    select: (rows) => rows.reduce((acc, r) => acc + Math.max(0, r.unread_count), 0),
  });

  useEffect(() => {
    if (!userId) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (t != null) clearTimeout(t);
      t = setTimeout(() => {
        t = null;
        void queryClient.invalidateQueries({ queryKey: schoolChatConversationsQueryKey(userId) });
      }, 400);
    };
    const unsub = subscribeSchoolChatInboxRefresh(userId, scheduleRefresh);
    return () => {
      if (t != null) clearTimeout(t);
      unsub();
    };
  }, [userId, queryClient]);

  return unread;
}
