import { supabase } from '@/lib/supabase';

export interface AdminActivity {
  activity_id: string;
  school_id: string;
  admin_user_id: string;
  activity_type: 'expense_approval' | 'expense_rejection' | 'payment_processing' | 'user_creation' | 'system_action';
  title: string;
  description: string;
  metadata?: Record<string, any>;
  created_at: string;
  admin_name?: string;
}

export interface ActivityLogParams {
  schoolId: string;
  adminUserId: string;
  activityType: AdminActivity['activity_type'];
  title: string;
  description: string;
  metadata?: Record<string, any>;
}

/**
 * Log an admin activity to the database
 */
export async function logAdminActivity({
  schoolId,
  adminUserId,
  activityType,
  title,
  description,
  metadata = {}
}: ActivityLogParams): Promise<void> {
  try {
    const { error } = await supabase
      .from('admin_activities')
      .insert({
        school_id: schoolId,
        admin_user_id: adminUserId,
        activity_type: activityType,
        title,
        description,
        metadata,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to log admin activity:', error);
    }
  } catch (error) {
    console.error('Error logging admin activity:', error);
  }
}

/**
 * Fetch recent admin activities for a school
 */
export async function fetchAdminActivities(schoolId: string, limit: number = 10): Promise<AdminActivity[]> {
  try {
    const { data, error } = await supabase
      .from('admin_activities')
      .select(`
        activity_id,
        school_id,
        admin_user_id,
        activity_type,
        title,
        description,
        metadata,
        created_at,
        users!admin_activities_admin_user_id_fkey(name)
      `)
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch admin activities:', error);
      return [];
    }

    return (data || []).map(activity => ({
      ...activity,
      admin_name: (activity.users as any)?.name || 'Admin'
    }));
  } catch (error) {
    console.error('Error fetching admin activities:', error);
    return [];
  }
}

/**
 * Helper functions for common activity types
 */
export const ActivityHelpers = {
  expenseApproval: (expenseAmount: number, expenseCategory: string, expenseId: string) => ({
    activityType: 'expense_approval' as const,
    title: 'Expense Approved',
    description: `Approved ${expenseCategory} expense of USh ${expenseAmount.toLocaleString('en-US')}`,
    metadata: { expenseId, amount: expenseAmount, category: expenseCategory }
  }),

  expenseRejection: (expenseAmount: number, expenseCategory: string, expenseId: string) => ({
    activityType: 'expense_rejection' as const,
    title: 'Expense Rejected',
    description: `Rejected ${expenseCategory} expense of USh ${expenseAmount.toLocaleString('en-US')}`,
    metadata: { expenseId, amount: expenseAmount, category: expenseCategory }
  }),

  bulkExpenseApproval: (count: number, totalAmount: number) => ({
    activityType: 'expense_approval' as const,
    title: 'Bulk Expense Approval',
    description: `Approved ${count} expenses totaling USh ${totalAmount.toLocaleString('en-US')}`,
    metadata: { count, totalAmount, type: 'bulk_approval' }
  }),

  bulkExpenseRejection: (count: number, totalAmount: number) => ({
    activityType: 'expense_rejection' as const,
    title: 'Bulk Expense Rejection',
    description: `Rejected ${count} expenses totaling USh ${totalAmount.toLocaleString('en-US')}`,
    metadata: { count, totalAmount, type: 'bulk_rejection' }
  }),

  paymentProcessing: (studentName: string, amount: number, paymentMethod: string) => ({
    activityType: 'payment_processing' as const,
    title: 'Payment Processed',
    description: `Processed ${paymentMethod} payment of USh ${amount.toLocaleString('en-US')} for ${studentName}`,
    metadata: { studentName, amount, paymentMethod }
  }),

  userCreation: (userType: string, userName: string) => ({
    activityType: 'user_creation' as const,
    title: 'User Account Created',
    description: `Created ${userType} account for ${userName}`,
    metadata: { userType, userName }
  }),

  systemAction: (actionTitle: string, actionDescription: string, metadata?: Record<string, any>) => ({
    activityType: 'system_action' as const,
    title: actionTitle,
    description: actionDescription,
    metadata: metadata || {}
  })
};