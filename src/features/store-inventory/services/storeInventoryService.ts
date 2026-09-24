import { supabase } from '@/lib/supabase';
import { resolveCurrentSchoolTerm } from '@/lib/adminFinanceTerm';
import { broadcastFinanceUpdate } from '@/lib/realtimeFinanceSync';
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

const LOCAL_STORAGE_STORE_ITEMS_KEY = 'pwezacore_store_items';
const LOCAL_STORAGE_STORE_TXNS_KEY = 'pwezacore_store_transactions';

/**
 * Local cache helpers for resilient offline/fallback support
 */
function getLocalStoreItems(schoolId: string): StoreItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_STORE_ITEMS_KEY);
    if (!raw) return [];
    const list: StoreItem[] = JSON.parse(raw);
    return list.filter((item) => item.school_id === schoolId);
  } catch {
    return [];
  }
}

function saveLocalStoreItems(items: StoreItem[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_STORE_ITEMS_KEY, JSON.stringify(items));
  } catch (err) {
    console.warn('Failed to save store items to localStorage:', err);
  }
}

function getLocalStoreTxns(schoolId: string): StoreTransaction[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_STORE_TXNS_KEY);
    if (!raw) return [];
    const list: StoreTransaction[] = JSON.parse(raw);
    return list.filter((t) => t.school_id === schoolId);
  } catch {
    return [];
  }
}

function saveLocalStoreTxns(txns: StoreTransaction[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_STORE_TXNS_KEY, JSON.stringify(txns));
  } catch (err) {
    console.warn('Failed to save store txns to localStorage:', err);
  }
}

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
  try {
    const { data, error } = await supabase
      .from('store_items')
      .select('*')
      .eq('school_id', schoolId)
      .order('name');

    if (!error && data) {
      const items = (data || []).map((row) => {
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

      // Synchronize to local storage
      const otherSchools = (JSON.parse(localStorage.getItem(LOCAL_STORAGE_STORE_ITEMS_KEY) || '[]') as StoreItem[]).filter(
        (i) => i.school_id !== schoolId
      );
      saveLocalStoreItems([...otherSchools, ...items]);
      return items;
    }
  } catch (e) {
    console.warn('Supabase store_items not reachable, falling back to local store:', e);
  }

  // Graceful fallback to local storage
  const localItems = getLocalStoreItems(schoolId);
  return localItems.map((item) => {
    const currentStock = Number(item.current_stock) || 0;
    const minReorder = Number(item.min_reorder_level) || 0;
    const plannedUsage = Number(item.planned_daily_usage) || 0;
    const unitCost = Number(item.unit_cost) || 0;
    const { days_runway, stock_status } = computeStockStatus(currentStock, minReorder, plannedUsage);
    return {
      ...item,
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
  const minReorder = Number(input.min_reorder_level) || 0;
  const plannedUsage = Number(input.planned_daily_usage) || 0;
  const now = new Date().toISOString();

  let createdItem: StoreItem | null = null;

  try {
    const { data, error } = await supabase
      .from('store_items')
      .insert({
        school_id: schoolId,
        name: input.name.trim(),
        category: input.category,
        unit_of_measure: input.unit_of_measure.trim(),
        current_stock: currentStock,
        min_reorder_level: minReorder,
        planned_daily_usage: plannedUsage,
        unit_cost: unitCost,
        storage_location: input.storage_location?.trim() || null,
        notes: input.notes?.trim() || null,
      })
      .select()
      .single();

    if (!error && data) {
      createdItem = data as StoreItem;
      if (currentStock > 0 && data.id) {
        try {
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
            transaction_date: now.slice(0, 10),
          });
        } catch {
          // Non-blocking
        }
      }
    }
  } catch (e) {
    console.warn('Supabase store_items insert failed, saving locally:', e);
  }

  // If Supabase failed or table is not present, persist locally
  if (!createdItem) {
    const localId = `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    createdItem = {
      id: localId,
      school_id: schoolId,
      name: input.name.trim(),
      category: input.category,
      unit_of_measure: input.unit_of_measure.trim(),
      current_stock: currentStock,
      min_reorder_level: minReorder,
      planned_daily_usage: plannedUsage,
      unit_cost: unitCost,
      storage_location: input.storage_location?.trim() || null,
      notes: input.notes?.trim() || null,
      created_at: now,
      updated_at: now,
    };

    if (currentStock > 0) {
      const initialTxn: StoreTransaction = {
        id: `txn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        school_id: schoolId,
        item_id: localId,
        item_name: input.name.trim(),
        unit_of_measure: input.unit_of_measure.trim(),
        transaction_type: 'purchase_in',
        quantity: currentStock,
        unit_cost: unitCost,
        total_cost: currentStock * unitCost,
        recipient_or_supplier: 'Initial Store Opening Stock',
        notes: 'Initial opening balance recorded at item creation',
        recorded_by: userId || null,
        transaction_date: now.slice(0, 10),
        created_at: now,
      };
      const allTxns = JSON.parse(localStorage.getItem(LOCAL_STORAGE_STORE_TXNS_KEY) || '[]');
      saveLocalStoreTxns([initialTxn, ...allTxns]);
    }
  }

  const { days_runway, stock_status } = computeStockStatus(currentStock, minReorder, plannedUsage);
  const finalItem: StoreItem = {
    ...createdItem,
    current_stock: currentStock,
    min_reorder_level: minReorder,
    planned_daily_usage: plannedUsage,
    unit_cost: unitCost,
    total_value: currentStock * unitCost,
    days_runway,
    stock_status,
  };

  const allItems = JSON.parse(localStorage.getItem(LOCAL_STORAGE_STORE_ITEMS_KEY) || '[]') as StoreItem[];
  saveLocalStoreItems([...allItems.filter((i) => i.id !== finalItem.id), finalItem]);

  return finalItem;
}

export async function updateStoreItem(
  itemId: string,
  updates: Partial<CreateStoreItemInput>
): Promise<void> {
  try {
    await supabase
      .from('store_items')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId);
  } catch (e) {
    console.warn('Supabase store_items update failed, updating locally:', e);
  }

  // Update in local cache
  const allItems = JSON.parse(localStorage.getItem(LOCAL_STORAGE_STORE_ITEMS_KEY) || '[]') as StoreItem[];
  const updated = allItems.map((item) =>
    item.id === itemId
      ? {
          ...item,
          ...updates,
          updated_at: new Date().toISOString(),
        }
      : item
  );
  saveLocalStoreItems(updated);
}

export async function deleteStoreItem(itemId: string): Promise<void> {
  try {
    await supabase.from('store_items').delete().eq('id', itemId);
  } catch (e) {
    console.warn('Supabase store_items delete failed, removing locally:', e);
  }

  const allItems = JSON.parse(localStorage.getItem(LOCAL_STORAGE_STORE_ITEMS_KEY) || '[]') as StoreItem[];
  saveLocalStoreItems(allItems.filter((i) => i.id !== itemId));
}

export async function recordRestock(
  schoolId: string,
  input: RestockItemInput,
  userId?: string
): Promise<{ transaction_id: string; expense_id?: string }> {
  // 1. Fetch current item details (Supabase first, local fallback)
  let item: StoreItem | null = null;
  try {
    const { data } = await supabase
      .from('store_items')
      .select('*')
      .eq('id', input.item_id)
      .maybeSingle();
    if (data) item = data as StoreItem;
  } catch {
    // Fall through to local cache
  }

  if (!item) {
    const localItems = getLocalStoreItems(schoolId);
    item = localItems.find((i) => i.id === input.item_id) || null;
  }

  if (!item) {
    throw new Error('Commodity not found in store.');
  }

  const restockQty = Number(input.quantity) || 0;
  const unitCost = Number(input.unit_cost) || Number(item.unit_cost) || 0;
  const totalCost = restockQty * unitCost;
  const newStock = Number(item.current_stock) + restockQty;
  const now = new Date().toISOString();

  let linkedExpenseId: string | undefined;

  // 2. If user opted to record as expense, automatically insert into school_expenses
  if (input.record_as_expense && totalCost > 0) {
    try {
      const currentTerm = await resolveCurrentSchoolTerm(supabase, schoolId);
      const expenseDate = now.slice(0, 10);
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
        // Fallback reference
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
          reference_number: refNum,
        })
        .select('expense_id')
        .single();

      if (!expErr && exp?.expense_id) {
        linkedExpenseId = exp.expense_id;
        try {
          broadcastFinanceUpdate({
            type: 'expense',
            schoolId,
            id: linkedExpenseId,
            amount: totalCost,
            status: 'approved',
          });
        } catch { /* ignore */ }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('pweza:expense-updated', {
              detail: { expenseId: linkedExpenseId, amount: totalCost, status: 'approved' },
            })
          );
          window.dispatchEvent(
            new CustomEvent('pweza:finance-mutated', {
              detail: { type: 'expense', schoolId },
            })
          );
        }
      }
    } catch (e) {
      console.warn('Could not auto-create school expense:', e);
    }
  }

  // 3. Update store_items current_stock and unit_cost
  try {
    await supabase
      .from('store_items')
      .update({
        current_stock: newStock,
        unit_cost: unitCost > 0 ? unitCost : item.unit_cost,
        updated_at: now,
      })
      .eq('id', input.item_id);
  } catch (e) {
    console.warn('Supabase store_items update failed, updating local stock:', e);
  }

  // Update in local cache
  const allItems = JSON.parse(localStorage.getItem(LOCAL_STORAGE_STORE_ITEMS_KEY) || '[]') as StoreItem[];
  saveLocalStoreItems(
    allItems.map((i) =>
      i.id === input.item_id
        ? {
            ...i,
            current_stock: newStock,
            unit_cost: unitCost > 0 ? unitCost : i.unit_cost,
            updated_at: now,
          }
        : i
    )
  );

  // 4. Record transaction
  let txnId = `txn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  try {
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
        transaction_date: now.slice(0, 10),
      })
      .select('id')
      .single();

    if (!txnErr && txn?.id) {
      txnId = txn.id;
    }
  } catch (e) {
    console.warn('Supabase store_transactions insert failed, saving locally:', e);
  }

  // Mirror transaction to local cache
  const newTxn: StoreTransaction = {
    id: txnId,
    school_id: schoolId,
    item_id: input.item_id,
    item_name: item.name,
    unit_of_measure: item.unit_of_measure,
    transaction_type: 'purchase_in',
    quantity: restockQty,
    unit_cost: unitCost,
    total_cost: totalCost,
    recipient_or_supplier: input.supplier?.trim() || 'Store Restock',
    linked_expense_id: linkedExpenseId || null,
    notes: input.notes?.trim() || null,
    recorded_by: userId || null,
    transaction_date: now.slice(0, 10),
    created_at: now,
  };
  const allTxns = JSON.parse(localStorage.getItem(LOCAL_STORAGE_STORE_TXNS_KEY) || '[]');
  saveLocalStoreTxns([newTxn, ...allTxns]);

  return { transaction_id: txnId, expense_id: linkedExpenseId };
}

export async function recordDailyDispatch(
  schoolId: string,
  input: DailyDispatchInput,
  userId?: string
): Promise<void> {
  const dispatchQty = Number(input.quantity) || 0;
  if (dispatchQty <= 0) return;
  const now = new Date().toISOString();

  // 1. Fetch item
  let item: StoreItem | null = null;
  try {
    const { data } = await supabase
      .from('store_items')
      .select('*')
      .eq('id', input.item_id)
      .maybeSingle();
    if (data) item = data as StoreItem;
  } catch {
    // Fallback
  }

  if (!item) {
    const localItems = getLocalStoreItems(schoolId);
    item = localItems.find((i) => i.id === input.item_id) || null;
  }

  if (!item) throw new Error('Item not found');

  const oldStock = Number(item.current_stock);
  const newStock = Math.max(0, oldStock - dispatchQty);
  const unitCost = Number(item.unit_cost) || 0;

  // 2. Update stock
  try {
    await supabase
      .from('store_items')
      .update({
        current_stock: newStock,
        updated_at: now,
      })
      .eq('id', input.item_id);
  } catch (e) {
    console.warn('Supabase store_items update failed, updating local stock:', e);
  }

  // Update in local cache
  const allItems = JSON.parse(localStorage.getItem(LOCAL_STORAGE_STORE_ITEMS_KEY) || '[]') as StoreItem[];
  saveLocalStoreItems(
    allItems.map((i) =>
      i.id === input.item_id
        ? {
            ...i,
            current_stock: newStock,
            updated_at: now,
          }
        : i
    )
  );

  // 3. Record transaction
  const txnId = `txn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    await supabase.from('store_transactions').insert({
      school_id: schoolId,
      item_id: input.item_id,
      transaction_type: 'dispatch_out',
      quantity: dispatchQty,
      unit_cost: unitCost,
      total_cost: dispatchQty * unitCost,
      recipient_or_supplier: input.recipient?.trim() || 'Main Kitchen / Daily Meal Prep',
      notes: input.notes?.trim() || 'Daily consumption dispatch',
      recorded_by: userId || null,
      transaction_date: now.slice(0, 10),
    });
  } catch (e) {
    console.warn('Supabase store_transactions insert failed, saving locally:', e);
  }

  const newTxn: StoreTransaction = {
    id: txnId,
    school_id: schoolId,
    item_id: input.item_id,
    item_name: item.name,
    unit_of_measure: item.unit_of_measure,
    transaction_type: 'dispatch_out',
    quantity: dispatchQty,
    unit_cost: unitCost,
    total_cost: dispatchQty * unitCost,
    recipient_or_supplier: input.recipient?.trim() || 'Main Kitchen / Daily Meal Prep',
    notes: input.notes?.trim() || 'Daily consumption dispatch',
    recorded_by: userId || null,
    transaction_date: now.slice(0, 10),
    created_at: now,
  };
  const allTxns = JSON.parse(localStorage.getItem(LOCAL_STORAGE_STORE_TXNS_KEY) || '[]');
  saveLocalStoreTxns([newTxn, ...allTxns]);
}

export async function recordStockAdjustment(
  schoolId: string,
  input: StockAdjustmentInput,
  userId?: string
): Promise<void> {
  let item: StoreItem | null = null;
  try {
    const { data } = await supabase
      .from('store_items')
      .select('*')
      .eq('id', input.item_id)
      .maybeSingle();
    if (data) item = data as StoreItem;
  } catch {
    // Fallback
  }

  if (!item) {
    const localItems = getLocalStoreItems(schoolId);
    item = localItems.find((i) => i.id === input.item_id) || null;
  }

  if (!item) throw new Error('Item not found');

  const oldStock = Number(item.current_stock);
  const newStock = Number(input.new_quantity);
  const diff = newStock - oldStock;
  const unitCost = Number(item.unit_cost) || 0;
  const now = new Date().toISOString();

  try {
    await supabase
      .from('store_items')
      .update({
        current_stock: newStock,
        updated_at: now,
      })
      .eq('id', input.item_id);
  } catch (e) {
    console.warn('Supabase store_items update failed, updating local stock:', e);
  }

  const allItems = JSON.parse(localStorage.getItem(LOCAL_STORAGE_STORE_ITEMS_KEY) || '[]') as StoreItem[];
  saveLocalStoreItems(
    allItems.map((i) =>
      i.id === input.item_id
        ? {
            ...i,
            current_stock: newStock,
            updated_at: now,
          }
        : i
    )
  );

  const txnId = `txn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    await supabase.from('store_transactions').insert({
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
      transaction_date: now.slice(0, 10),
    });
  } catch (e) {
    console.warn('Supabase store_transactions insert failed, saving locally:', e);
  }

  const newTxn: StoreTransaction = {
    id: txnId,
    school_id: schoolId,
    item_id: input.item_id,
    item_name: item.name,
    unit_of_measure: item.unit_of_measure,
    transaction_type: 'adjustment',
    quantity: Math.abs(diff),
    unit_cost: unitCost,
    total_cost: Math.abs(diff) * unitCost,
    recipient_or_supplier: 'Stocktake Audit / Reconcile',
    notes: `Adjusted from ${oldStock} to ${newStock} (${diff >= 0 ? '+' : ''}${diff} ${item.unit_of_measure}). Reason: ${input.reason}${
      input.notes ? ` - ${input.notes}` : ''
    }`,
    recorded_by: userId || null,
    transaction_date: now.slice(0, 10),
    created_at: now,
  };
  const allTxns = JSON.parse(localStorage.getItem(LOCAL_STORAGE_STORE_TXNS_KEY) || '[]');
  saveLocalStoreTxns([newTxn, ...allTxns]);
}

export async function fetchStoreTransactions(
  schoolId: string,
  limit = 50
): Promise<StoreTransaction[]> {
  try {
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

    if (!error && data) {
      const txns = (data || []).map((row: any) => ({
        ...row,
        item_name: row.store_items?.name || 'Item',
        unit_of_measure: row.store_items?.unit_of_measure || '',
      }));
      const otherTxns = (JSON.parse(localStorage.getItem(LOCAL_STORAGE_STORE_TXNS_KEY) || '[]') as StoreTransaction[]).filter(
        (t) => t.school_id !== schoolId
      );
      saveLocalStoreTxns([...otherTxns, ...txns]);
      return txns;
    }
  } catch (e) {
    console.warn('Supabase store_transactions fetch failed, reading local cache:', e);
  }

  // Local storage fallback
  return getLocalStoreTxns(schoolId).slice(0, limit);
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
