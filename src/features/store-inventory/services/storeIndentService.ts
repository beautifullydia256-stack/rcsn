import { supabase } from '@/lib/supabase';
import type { StoreItem } from '../types';

export interface DailyIndentItemInput {
  storeItemId: string;
  itemName: string;
  quantityRequested: number;
  unitOfMeasure: string;
}

export interface CreateDailyIndentInput {
  departmentId?: string;
  requestedForDate: string; // YYYY-MM-DD
  targetHeadcount?: number;
  requestedBy: string; // user ID
  requesterName?: string;
  notes?: string;
  items: DailyIndentItemInput[];
}

export interface StoreDailyIndent {
  id: string;
  school_id: string;
  department_id?: string | null;
  requisition_number: string;
  requested_for_date: string;
  target_headcount: number | null;
  requested_by: string;
  requester_name?: string;
  issued_by?: string | null;
  issuer_name?: string;
  status: 'pending' | 'issued' | 'partially_issued' | 'rejected';
  notes?: string | null;
  created_at: string;
  issued_at?: string | null;
  items: {
    id: string;
    store_item_id: string;
    item_name?: string;
    quantity_requested: number;
    quantity_issued: number;
    unit_of_measure: string;
    status: 'pending' | 'issued' | 'rejected';
  }[];
}

const LOCAL_STORAGE_INDENTS_KEY = 'pwezacore_daily_indents';

function getLocalIndents(schoolId: string): StoreDailyIndent[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_INDENTS_KEY}_${schoolId}`);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Error reading local daily indents:', err);
  }
  return [];
}

function saveLocalIndents(schoolId: string, list: StoreDailyIndent[]) {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_INDENTS_KEY}_${schoolId}`, JSON.stringify(list));
  } catch (err) {
    console.warn('Error saving local daily indents:', err);
  }
}

/**
 * Creates a new daily store indent / kitchen requisition.
 */
export async function createDailyStoreIndent(
  schoolId: string,
  input: CreateDailyIndentInput
): Promise<StoreDailyIndent> {
  const reqNumber = `IND-${input.requestedForDate.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;

  const newIndent: StoreDailyIndent = {
    id: crypto.randomUUID ? crypto.randomUUID() : `indent-${Date.now()}`,
    school_id: schoolId,
    department_id: input.departmentId || null,
    requisition_number: reqNumber,
    requested_for_date: input.requestedForDate,
    target_headcount: input.targetHeadcount ?? null,
    requested_by: input.requestedBy,
    requester_name: input.requesterName || 'Kitchen Staff',
    status: 'pending',
    notes: input.notes?.trim() || null,
    created_at: new Date().toISOString(),
    items: input.items.map((it, idx) => ({
      id: `it-${Date.now()}-${idx}`,
      store_item_id: it.storeItemId,
      item_name: it.itemName,
      quantity_requested: it.quantityRequested,
      quantity_issued: 0,
      unit_of_measure: it.unitOfMeasure,
      status: 'pending',
    })),
  };

  try {
    const { data, error } = await supabase
      .from('store_daily_indents')
      .insert({
        school_id: schoolId,
        department_id: newIndent.department_id,
        requisition_number: newIndent.requisition_number,
        requested_for_date: newIndent.requested_for_date,
        target_headcount: newIndent.target_headcount,
        requested_by: newIndent.requested_by,
        status: 'pending',
        notes: newIndent.notes,
      })
      .select()
      .single();

    if (!error && data) {
      // Insert items
      if (input.items.length > 0) {
        await supabase.from('store_daily_indent_items').insert(
          input.items.map((it) => ({
            indent_id: data.id,
            store_item_id: it.storeItemId,
            quantity_requested: it.quantityRequested,
            quantity_issued: 0,
            unit_of_measure: it.unitOfMeasure,
            status: 'pending',
          }))
        );
      }
    }
  } catch (err) {
    console.warn('Supabase createDailyStoreIndent fallback to local:', err);
  }

  const current = getLocalIndents(schoolId);
  saveLocalIndents(schoolId, [newIndent, ...current]);
  return newIndent;
}

/**
 * Fetches all store indents for a school.
 */
export async function fetchDailyStoreIndents(
  schoolId: string,
  filterDate?: string
): Promise<StoreDailyIndent[]> {
  try {
    let query = supabase
      .from('store_daily_indents')
      .select('*, items:store_daily_indent_items(*, item:store_items(name))')
      .eq('school_id', schoolId)
      .order('requested_for_date', { ascending: false });

    if (filterDate) {
      query = query.eq('requested_for_date', filterDate);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      const parsed: StoreDailyIndent[] = data.map((d: any) => ({
        id: d.id,
        school_id: d.school_id,
        department_id: d.department_id,
        requisition_number: d.requisition_number,
        requested_for_date: d.requested_for_date,
        target_headcount: d.target_headcount,
        requested_by: d.requested_by,
        requester_name: d.requester_name || 'Kitchen Lead',
        issued_by: d.issued_by,
        issuer_name: d.issuer_name,
        status: d.status,
        notes: d.notes,
        created_at: d.created_at,
        issued_at: d.issued_at,
        items: (d.items || []).map((it: any) => ({
          id: it.id,
          store_item_id: it.store_item_id,
          item_name: it.item?.name || 'Supply Item',
          quantity_requested: Number(it.quantity_requested) || 0,
          quantity_issued: Number(it.quantity_issued) || 0,
          unit_of_measure: it.unit_of_measure,
          status: it.status,
        })),
      }));

      saveLocalIndents(schoolId, parsed);
      return parsed;
    }
  } catch (err) {
    console.warn('Supabase fetchDailyStoreIndents fallback:', err);
  }

  const local = getLocalIndents(schoolId);
  if (filterDate) {
    return local.filter((d) => d.requested_for_date === filterDate);
  }
  return local;
}

/**
 * Storekeeper confirms physical goods issuance:
 * 1. Updates indent status to 'issued'.
 * 2. Physically deducts issued quantity from store inventory stock!
 * 3. Logs issuance audit timestamp.
 */
export async function confirmIndentDispatch(
  schoolId: string,
  indentId: string,
  storekeeperId: string,
  storekeeperName: string,
  dispatchedItems: { storeItemId: string; quantityIssued: number }[]
): Promise<void> {
  const now = new Date().toISOString();

  try {
    // Update DB Indent
    await supabase
      .from('store_daily_indents')
      .update({
        status: 'issued',
        issued_by: storekeeperId,
        issued_at: now,
      })
      .eq('id', indentId);

    // Update item quantities
    for (const disp of dispatchedItems) {
      await supabase
        .from('store_daily_indent_items')
        .update({
          quantity_issued: disp.quantityIssued,
          status: 'issued',
        })
        .eq('indent_id', indentId)
        .eq('store_item_id', disp.storeItemId);

      // Decrement stock in store_items
      const { data: itemData } = await supabase
        .from('store_items')
        .select('current_stock')
        .eq('id', disp.storeItemId)
        .single();

      if (itemData) {
        const nextStock = Math.max(0, (Number(itemData.current_stock) || 0) - disp.quantityIssued);
        await supabase
          .from('store_items')
          .update({ current_stock: nextStock, updated_at: now })
          .eq('id', disp.storeItemId);
      }
    }
  } catch (err) {
    console.warn('Supabase confirmIndentDispatch error:', err);
  }

  // Update local cache
  const local = getLocalIndents(schoolId);
  const updated = local.map((ind) => {
    if (ind.id === indentId) {
      return {
        ...ind,
        status: 'issued' as const,
        issued_by: storekeeperId,
        issuer_name: storekeeperName,
        issued_at: now,
        items: ind.items.map((it) => {
          const match = dispatchedItems.find((d) => d.storeItemId === it.store_item_id);
          return match
            ? { ...it, quantity_issued: match.quantityIssued, status: 'issued' as const }
            : it;
        }),
      };
    }
    return ind;
  });
  saveLocalIndents(schoolId, updated);
}
