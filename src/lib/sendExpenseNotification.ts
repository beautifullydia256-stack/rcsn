import { supabase } from './supabase';

export async function sendExpenseNotification(
  expenseId: string,
  action: 'approve' | 'decline',
  schoolId: string
) {
  try {
    // Get expense details and the user who recorded it
    const { data: expense } = await supabase
      .from('school_expenses')
      .select(`
        expense_id,
        description,
        amount,
        category_name,
        reference_number,
        recorded_by,
        users!inner(name, email)
      `)
      .eq('expense_id', expenseId)
      .single();

    if (!expense) {
      console.error('Expense not found for notification:', expenseId);
      return;
    }

    const isApproved = action === 'approve';
    const title = isApproved 
      ? '✅ Expense Approved' 
      : '❌ Expense Rejected';
    
    const message = isApproved
      ? `Your expense "${expense.description}" (${expense.reference_number}) for UGX ${expense.amount.toLocaleString()} has been approved.`
      : `Your expense "${expense.description}" (${expense.reference_number}) for UGX ${expense.amount.toLocaleString()} has been rejected.`;

    // Send notification to the user who recorded the expense
    const { error } = await supabase
      .from('user_in_app_notifications')
      .insert({
        user_id: expense.recorded_by,
        school_id: schoolId,
        type: isApproved ? 'success' : 'error',
        title,
        message,
        action_url: '/dashboard/accountant/expenses',
        metadata: {
          expense_id: expenseId,
          action,
          category: expense.category_name,
          amount: expense.amount,
        },
        is_read: false,
      });

    if (error) {
      console.error('Failed to send expense notification:', error);
    } else {
      console.log(`Expense notification sent to user ${expense.recorded_by} for expense ${expenseId}`);
    }
  } catch (error) {
    console.error('Error sending expense notification:', error);
  }
}