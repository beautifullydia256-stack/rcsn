export type StoreItemCategory =
  | 'food_kitchen'
  | 'cleaning_sanitation'
  | 'scholastic_supplies'
  | 'general_maintenance'
  | 'other';

export type StoreTransactionType =
  | 'purchase_in'
  | 'dispatch_out'
  | 'adjustment'
  | 'waste_spoilage';

export type StockHealthStatus = 'healthy' | 'low' | 'critical' | 'out_of_stock';

export interface StoreItem {
  id: string;
  school_id: string;
  name: string;
  category: StoreItemCategory;
  unit_of_measure: string;
  current_stock: number;
  min_reorder_level: number;
  planned_daily_usage: number;
  unit_cost: number;
  storage_location?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  // Computed runtime fields
  days_runway?: number | null;
  stock_status?: StockHealthStatus;
  total_value?: number;
}

export interface StoreTransaction {
  id: string;
  school_id: string;
  item_id: string;
  transaction_type: StoreTransactionType;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  recipient_or_supplier?: string | null;
  linked_expense_id?: string | null;
  notes?: string | null;
  recorded_by?: string | null;
  transaction_date: string;
  created_at?: string;
  item_name?: string;
  unit_of_measure?: string;
}

export interface CreateStoreItemInput {
  name: string;
  category: StoreItemCategory;
  unit_of_measure: string;
  current_stock: number;
  min_reorder_level: number;
  planned_daily_usage: number;
  unit_cost: number;
  storage_location?: string;
  notes?: string;
}

export interface RestockItemInput {
  item_id: string;
  quantity: number;
  unit_cost: number;
  supplier?: string;
  notes?: string;
  record_as_expense?: boolean;
  payment_method?: string;
}

export interface DailyDispatchInput {
  item_id: string;
  quantity: number;
  recipient?: string;
  notes?: string;
}

export interface StockAdjustmentInput {
  item_id: string;
  new_quantity: number;
  reason: string;
  notes?: string;
}

export interface StoreKpis {
  total_stock_value: number;
  total_items: number;
  daily_food_burn_rate: number;
  low_stock_count: number;
  critical_stock_count: number;
}
