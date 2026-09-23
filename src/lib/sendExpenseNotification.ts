import { supabase } from './supabase';

export async function sendExpenseNotification(
  expenseId: string,
  action: 'approve' | 'decline',
  schoolId: string
) {
  try {
    // Get expense details
    const { data: expense, error: fetchErr } = await supabase
      .from('school_expenses')
      .select('expense_id, description, amount, category_name, reference_number, recorded_by')
      .eq('expense_id', expenseId)
      .maybeSingle();

    if (fetchErr || !expense) {
      console.warn('Expense not found for notification:', expenseId, fetchErr);
      return;
    }

    if (!expense.recorded_by) {
      console.log('No recorded_by user on expense, skipping in-app notification:', expenseId);
      return;
    }

    const isApproved = action === 'approve';
    const title = isApproved 
      ? 'Expense Approved' 
      : 'Expense Rejected';
    
    const formattedAmount = Number(expense.amount || 0).toLocaleString();
    const refText = expense.reference_number ? ` (${expense.reference_number})` : '';
    const body = isApproved
      ? `Your expense "${expense.description || 'Expense'}"${refText} for UGX ${formattedAmount} has been approved.`
      : `Your expense "${expense.description || 'Expense'}"${refText} for UGX ${formattedAmount} has been rejected.`;

    // Send notification matching user_in_app_notifications schema
    const { error } = await supabase
      .from('user_in_app_notifications')
      .insert({
        school_id: schoolId,
        user_id: expense.recorded_by,
        title,
        body,
        category: 'finance',
        read_at: null,
        metadata: {
          action_url: '/dashboard/accountant/expenses',
          expense_id: expenseId,
          action,
          category: expense.category_name,
          amount: expense.amount,
          type: isApproved ? 'success' : 'error',
        },
      });

    if (error) {
      console.warn('Could not insert in-app notification:', error);
    } else {
      console.log(`Expense notification sent to user ${expense.recorded_by} for expense ${expenseId}`);
    }
  } catch (error) {
    console.error('Error sending expense notification:', error);
  }
}