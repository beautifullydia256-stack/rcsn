import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const config = { runtime: 'nodejs' };

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { expense_id, action, notes } = req.body;

    if (!expense_id || !action) {
      return res.status(400).json({ error: 'Missing expense_id or action' });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approve or reject' });
    }

    // Get the current expense to validate it exists and is pending
    const { data: expense, error: fetchError } = await supabase
      .from('school_expenses')
      .select('*')
      .eq('expense_id', expense_id)
      .single();

    if (fetchError || !expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    if (expense.status !== 'pending') {
      return res.status(400).json({ error: 'Expense is not pending approval' });
    }

    // Update the expense status
    const updateData: any = {
      status: action === 'approve' ? 'approved' : 'rejected',
      approved_at: new Date().toISOString(),
    };

    if (notes) {
      updateData.approval_notes = notes;
    }

    const { error: updateError } = await supabase
      .from('school_expenses')
      .update(updateData)
      .eq('expense_id', expense_id);

    if (updateError) {
      console.error('Error updating expense:', updateError);
      return res.status(500).json({ error: 'Failed to update expense' });
    }

    return res.status(200).json({
      success: true,
      message: `Expense ${action}d successfully`,
      expense_id,
      action,
    });

  } catch (error) {
    console.error('Error in approve-expense API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}