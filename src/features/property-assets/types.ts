export type AssetCategory =
  | 'furniture_seating'      // Chairs, benches, plastic chairs, armchairs, stools
  | 'furniture_tables'       // Student desks, dining tables, teacher tables, lab benches
  | 'dormitory_bedding'      // Double-decker bunk beds, single beds, mattresses, lockers
  | 'classroom_fixtures'     // Whiteboards, blackboards, teacher podiums, bookshelves
  | 'lab_electronics'        // Computers, projectors, lab apparatus, science equipment
  | 'sports_recreation'      // Goalposts, table tennis, sports gear
  | 'general_property';      // Water tanks, generators, lawnmowers, security gates

export type DamageSeverity = 'minor' | 'moderate' | 'severe' | 'condemned';

export type DamageStatus = 'reported' | 'repair_approved' | 'in_repair' | 'repaired' | 'written_off';

export interface ClassroomAllocation {
  room_id: string; // e.g. "class:S.1 A" or "dorm:Nile Boys" or "room:Staff Room"
  room_name: string; // e.g. "S.1 A", "Dormitory Nile (Boys)", "Main Library"
  room_type: 'classroom' | 'dormitory' | 'office' | 'lab' | 'store' | 'general';
  quantity_allocated: number;
}

export interface SchoolFurnitureAsset {
  id: string;
  school_id: string;
  name: string; // e.g. "Student Double Wooden Desk", "Metal Double-Decker Bunk Bed"
  asset_code?: string | null; // e.g. "FURN-DESK-01"
  category: AssetCategory;
  total_quantity: number;
  active_quantity: number;
  broken_quantity: number;
  in_repair_quantity: number;
  unit_purchase_cost?: number | null;
  estimated_unit_repair_cost?: number | null;
  allocations: ClassroomAllocation[];
  supplier?: string | null;
  purchase_date?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface AssetDamageReport {
  id: string;
  school_id: string;
  asset_id: string;
  asset_name: string;
  room_name: string; // e.g. "Class S.3 Blue" or "Dormitory Nile"
  quantity_damaged: number;
  damage_type: 'broken' | 'cracked' | 'bent_metal' | 'missing_parts' | 'vandalized' | 'wear_and_tear';
  severity: DamageSeverity;
  description: string;
  reported_by?: string | null;
  reported_date: string;
  status: DamageStatus;
  estimated_repair_cost: number;
  actual_repair_cost?: number | null;
  linked_expense_id?: string | null;
  repaired_date?: string | null;
  repaired_by?: string | null;
  notes?: string | null;
}

export interface CreateAssetInput {
  name: string;
  asset_code?: string;
  category: AssetCategory;
  total_quantity: number;
  unit_purchase_cost?: number;
  estimated_unit_repair_cost?: number;
  initial_room_name?: string;
  supplier?: string;
  purchase_date?: string;
  notes?: string;
  record_as_expense?: boolean;
  payment_method?: string;
}

export interface ReportDamageInput {
  asset_id: string;
  room_name: string;
  quantity_damaged: number;
  damage_type: 'broken' | 'cracked' | 'bent_metal' | 'missing_parts' | 'vandalized' | 'wear_and_tear';
  severity?: DamageSeverity;
  description: string;
  reported_by?: string;
  estimated_repair_cost?: number;
}

export interface RecordRepairExpenseInput {
  damage_report_id: string;
  actual_cost: number;
  payment_method: string;
  technician_name?: string;
  notes?: string;
}

export interface PropertyKpis {
  total_assets: number;
  active_assets: number;
  broken_assets: number;
  in_repair_assets: number;
  total_valuation: number;
  estimated_repair_cost_total: number;
  total_classes_tracked: number;
}
