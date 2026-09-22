import { supabase } from '@/lib/supabase';
import { resolveCurrentSchoolTerm } from '@/lib/adminFinanceTerm';
import type {
  StoreItem,
  StoreTransaction,
  CreateStoreItemInput,
  RestockItemInput,
  DailyDispatchInput,
  StockAdjustmentInput,
  StoreKpis,
  StockHealthStatus,
} from '../types';

export function computeStockStatus(
  currentStock: number,
  minReorderLevel: number,
  plannedDailyUsage: number
): { days_runway: number | null; stock_status: StockHealthStatus } {
  if (currentStock <= 0) {
    return { days_runway: 0, stock_status: 'out_of_stock' };
  }

  const days_runway =
    plannedDailyUsage > 0 ? Math.floor(currentStock / plannedDailyUsage) : null;

  if (days_runway !== null) {
    if (days_runway <= 2 || currentStock <= minReorderLevel) {
      return { days_runway, stock_status: 'critical' };
    }
    if (days_runway <= 5 || currentStock <= minReorderLevel * 1.5) {
      return { days_runway, stock_status: 'low' };
    }
    return { days_runway, stock_status: 'healthy' };
  }

  if (currentStock <= minReorderLevel) {
    return { days_runway: null, stock_status: 'critical' };
  }
  if (currentStock <= minReorderLevel * 1.5) {
    return { days_runway: null, stock_status: 'low' };
  }
  return { days_runway: null, stock_status: 'healthy' };
}

export async function fetchStoreItems(schoolId: string): Promise<StoreItem[]> {
  const { data, error } = await supabase
    .from('store_items')
    .select('*')
    .eq('school_id', schoolId)
    .order('name');

  if (error) {
    console.error('Error fetching store items:', error);
    throw error;
  }

  return (data || []).map((row) => {
    const currentStock = Number(row.current_stock) || 0;
    const minReorder = Number(row.min_reorder_level) || 0;
    const plannedUsage = Number(row.planned_daily_usage) || 0;
    const unitCost = Number(row.unit_cost) || 0;
    const { days_runway, stock_status } = computeStockStatus(currentStock, minReorder, plannedUsage);

    return {
      ...row,
      current_stock: currentStock,
      min_reorder_level: minReorder,
      planned_daily_usage: plannedUsage,
      unit_cost: unitCost,
      total_value: currentStock * unitCost,
      days_runway,
      stock_status,
    };
  });
}

export async function createStoreItem(
  schoolId: string,
  input: CreateStoreItemInput,
  userId?: string
): Promise<StoreItem> {
  const currentStock = Number(input.current_stock) || 0;
  const unitCost = Number(input.unit_cost) || 0;

  const { data, error } = await supabase
    .from('store_items')
    .insert({
      school_id: schoolId,
      name: input.name.trim(),
      category: input.category,
      unit_of_measure: input.unit_of_measure.trim(),
      current_stock: currentStock,
      min_reorder_level: Number(input.min_reorder_level) || 0,
      planned_daily_usage: Number(input.planned_daily_usage) || 0,
      unit_cost: unitCost,
      storage_location: input.storage_location?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) throw error;

  // If opening stock was registered, log an initial stock transaction
  if (currentStock > 0 && data?.id) {
    await supabase.from('store_transactions').insert({
      school_id: schoolId,
      item_id: data.id,
      transaction_type: 'purchase_in',
      quantity: currentStock,
      unit_cost: unitCost,
      total_cost: currentStock * unitCost,
      recipient_or_supplier: 'Initial Store Opening Stock',
      notes: 'Initial opening balance recorded at item creation',
      recorded_by: userId || null,
      transaction_date: new Date().toISOString().slice(0, 10),
    });
  }

  const { days_runway, stock_status } = computeStockStatus(
    currentStock,
    data.min_reorder_level,
    data.planned_daily_usage
  );

  return {
    ...data,
    days_runway,
    stock_status,
    total_value: currentStock * unitCost,
  };
}

export async function updateStoreItem(
  itemId: string,
  updates: Partial<CreateStoreItemInput>
): Promise<void> {
  const { error } = await supabase
    .from('store_items')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId);

  if (error) throw error;
}

export async function deleteStoreItem(itemId: string): Promise<void> {
  const { error } = await supabase.from('store_items').delete().eq('id', itemId);
  if (error) throw error;
}

export async function recordRestock(
  schoolId: string,
  input: RestockItemInput,
  userId?: string
): Promise<{ transaction_id: string; expense_id?: string }> {
  // 1. Fetch current item details
  const { data: item, error: itemErr } = await supabase
    .from('store_items')
    .select('*')
    .eq('id', input.item_id)
    .single();

  if (itemErr || !item) throw itemErr || new Error('Item not found');

  const restockQty = Number(input.quantity) || 0;
  const unitCost = Number(input.unit_cost) || Number(item.unit_cost) || 0;
  const totalCost = restockQty * unitCost;
  const newStock = Number(item.current_stock) + restockQty;

  let linkedExpenseId: string | undefined;

  // 2. If user opted to record as expense, automatically insert into school_expenses
  if (input.record_as_expense && totalCost > 0) {
    try {
      const currentTerm = await resolveCurrentSchoolTerm(supabase, schoolId);
      const expenseDate = new Date().toISOString().slice(0, 10);
      const categoryLabel =
        item.category === 'food_kitchen'
          ? 'Feeding & Boarding — Food supplies'
          : 'Administrative — Store & Consumables';

      let refNum: string | null = null;
      try {
        const { data: ref } = await supabase.rpc('generate_expense_reference', {
          p_school_id: schoolId,
          p_expense_date: expenseDate,
          p_category_name: categoryLabel,
        });
        if (typeof ref === 'string' && ref.trim()) refNum = ref.trim();
      } catch {
        // Fallback reference handled if RPC is unavailable
      }

      const { data: exp, error: expErr } = await supabase
        .from('school_expenses')
        .insert({
          school_id: schoolId,
          term_id: currentTerm?.id || null,
          category_name: categoryLabel,
          description: `Store Restock: ${restockQty} ${item.unit_of_measure} of ${item.name}${
            input.supplier ? ` (Supplier: ${input.supplier})` : ''
          }`,
          amount: totalCost,
          expense_date: expenseDate,
          payment_method: input.payment_method || 'cash',
          status: 'approved',
          recorded_by: userId || null,
          approved_by: userId || null,
          approved_at: new Date().toISOString(),
          reference_number: refNum,
        })
        .select('expense_id')
        .single();

      if (!expErr && exp?.expense_id) {
        linkedExpenseId = exp.expense_id;
      }
    } catch (e) {
      console.warn('Could not auto-create school expense:', e);
    }
  }

  // 3. Update store_items current_stock and unit_cost
  const { error: updateErr } = await supabase
    .from('store_items')
    .update({
      current_stock: newStock,
      unit_cost: unitCost > 0 ? unitCost : item.unit_cost,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.item_id);

  if (updateErr) throw updateErr;

  // 4. Record transaction
  const { data: txn, error: txnErr } = await supabase
    .from('store_transactions')
    .insert({
      school_id: schoolId,
      item_id: input.item_id,
      transaction_type: 'purchase_in',
      quantity: restockQty,
      unit_cost: unitCost,
      total_cost: totalCost,
      recipient_or_supplier: input.supplier?.trim() || 'Store Restock',
      linked_expense_id: linkedExpenseId || null,
      notes: input.notes?.trim() || null,
      recorded_by: userId || null,
      transaction_date: new Date().toISOString().slice(0, 10),
    })
    .select('id')
    .single();

  if (txnErr) throw txnErr;

  return {
    transaction_id: txn.id,
    expense_id: linkedExpenseId,
  };
}

export async function recordDailyDispatch(
  schoolId: string,
  input: DailyDispatchInput,
  userId?: string
): Promise<void> {
  const { data: item, error: itemErr } = await supabase
    .from('store_items')
    .select('*')
    .eq('id', input.item_id)
    .single();

  if (itemErr || !item) throw itemErr || new Error('Item not found');

  const dispatchQty = Number(input.quantity) || 0;
  const newStock = Math.max(0, Number(item.current_stock) - dispatchQty);
  const unitCost = Number(item.unit_cost) || 0;

  // 1. Update stock
  const { error: updateErr } = await supabase
    .from('store_items')
    .update({
      current_stock: newStock,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.item_id);

  if (updateErr) throw updateErr;

  // 2. Record transaction
  const { error: txnErr } = await supabase.from('store_transactions').insert({
    school_id: schoolId,
    item_id: input.item_id,
    transaction_type: 'dispatch_out',
    quantity: dispatchQty,
    unit_cost: unitCost,
    total_cost: dispatchQty * unitCost,
    recipient_or_supplier: input.recipient?.trim() || 'Main Kitchen / Daily Meal Prep',
    notes: input.notes?.trim() || 'Daily consumption dispatch',
    recorded_by: userId || null,
    transaction_date: new Date().toISOString().slice(0, 10),
  });

  if (txnErr) throw txnErr;
}

export async function recordStockAdjustment(
  schoolId: string,
  input: StockAdjustmentInput,
  userId?: string
): Promise<void> {
  const { data: item, error: itemErr } = await supabase
    .from('store_items')
    .select('*')
    .eq('id', input.item_id)
    .single();

  if (itemErr || !item) throw itemErr || new Error('Item not found');

  const oldStock = Number(item.current_stock);
  const newStock = Number(input.new_quantity);
  const diff = newStock - oldStock;
  const unitCost = Number(item.unit_cost) || 0;

  const { error: updateErr } = await supabase
    .from('store_items')
    .update({
      current_stock: newStock,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.item_id);

  if (updateErr) throw updateErr;

  const { error: txnErr } = await supabase.from('store_transactions').insert({
    school_id: schoolId,
    item_id: input.item_id,
    transaction_type: 'adjustment',
    quantity: Math.abs(diff),
    unit_cost: unitCost,
    total_cost: Math.abs(diff) * unitCost,
    recipient_or_supplier: 'Stocktake Audit / Reconcile',
    notes: `Adjusted from ${oldStock} to ${newStock} (${diff >= 0 ? '+' : ''}${diff} ${item.unit_of_measure}). Reason: ${input.reason}${
      input.notes ? ` - ${input.notes}` : ''
    }`,
    recorded_by: userId || null,
    transaction_date: new Date().toISOString().slice(0, 10),
  });

  if (txnErr) throw txnErr;
}

export async function fetchStoreTransactions(
  schoolId: string,
  limit = 50
): Promise<StoreTransaction[]> {
  const { data, error } = await supabase
    .from('store_transactions')
    .select(`
      *,
      store_items (
        name,
        unit_of_measure
      )
    `)
    .eq('school_id', schoolId)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching store transactions:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    ...row,
    item_name: row.store_items?.name || 'Item',
    unit_of_measure: row.store_items?.unit_of_measure || '',
  }));
}

export function computeStoreKpis(items: StoreItem[]): StoreKpis {
  let totalStockVal = 0;
  let dailyFoodBurn = 0;
  let lowCount = 0;
  let criticalCount = 0;

  for (const item of items) {
    totalStockVal += item.total_value || 0;

    if (item.category === 'food_kitchen' && item.planned_daily_usage > 0) {
      dailyFoodBurn += item.planned_daily_usage * item.unit_cost;
    }

    if (item.stock_status === 'critical' || item.stock_status === 'out_of_stock') {
      criticalCount++;
    } else if (item.stock_status === 'low') {
      lowCount++;
    }
  }

  return {
    total_stock_value: totalStockVal,
    total_items: items.length,
    daily_food_burn_rate: dailyFoodBurn,
    low_stock_count: lowCount,
    critical_stock_count: criticalCount,
  };
}
