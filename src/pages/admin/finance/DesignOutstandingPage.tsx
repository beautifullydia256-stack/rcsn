import AccountantOutstandingPage from '@/pages/accountant/OutstandingPage';
import { supabase } from '@/lib/supabase';
import { fetchDebtors, type OutstandingRow } from '@/pages/accountant/api/outstanding';

export type FetchOutstandingResult = {
  schoolId: string;
  rows: OutstandingRow[];
  clearedCount: number;
};

export async function fetchOutstandingData(userId: string): Promise<FetchOutstandingResult | null> {
  const { data: user } = await supabase.from('users').select('school_id').eq('user_id', userId).maybeSingle();
  const schoolId = user?.school_id;
  if (!schoolId) return null;
  const rows = await fetchDebtors(schoolId);
  return {
    schoolId,
    rows,
    clearedCount: 0,
  };
}

export default function DesignOutstandingPage() {
  return <AccountantOutstandingPage />;
}
