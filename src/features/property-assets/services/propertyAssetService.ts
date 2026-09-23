import { supabase } from '@/lib/supabase';
import type {
  SchoolFurnitureAsset,
  AssetDamageReport,
  CreateAssetInput,
  ReportDamageInput,
  RecordRepairExpenseInput,
  PropertyKpis,
  ClassroomAllocation,
} from '../types';

const LOCAL_STORAGE_ASSETS_KEY = 'pwezacore_school_furniture_assets';
const LOCAL_STORAGE_DAMAGES_KEY = 'pwezacore_school_asset_damages';

function getLocalAssets(schoolId: string): SchoolFurnitureAsset[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ASSETS_KEY);
    if (!raw) return [];
    const list: SchoolFurnitureAsset[] = JSON.parse(raw);
    return list.filter((a) => a.school_id === schoolId);
  } catch {
    return [];
  }
}

function saveLocalAssets(assets: SchoolFurnitureAsset[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_ASSETS_KEY, JSON.stringify(assets));
  } catch (err) {
    console.warn('Failed to save assets to localStorage:', err);
  }
}

function getLocalDamages(schoolId: string): AssetDamageReport[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DAMAGES_KEY);
    if (!raw) return [];
    const list: AssetDamageReport[] = JSON.parse(raw);
    return list.filter((d) => d.school_id === schoolId);
  } catch {
    return [];
  }
}

function saveLocalDamages(damages: AssetDamageReport[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_DAMAGES_KEY, JSON.stringify(damages));
  } catch (err) {
    console.warn('Failed to save damages to localStorage:', err);
  }
}

/**
 * Helper to identify lower/secondary school rooms that must not leak into tertiary institutions
 */
function isSecondaryRoom(roomName?: string): boolean {
  if (!roomName) return false;
  const r = roomName.toLowerCase();
  return (
    r.includes('senior') ||
    r.includes('s.1') ||
    r.includes('s.2') ||
    r.includes('s.3') ||
    r.includes('s.4') ||
    r.includes('s.5') ||
    r.includes('s.6') ||
    r.includes('nile house') ||
    r.includes('victoria house') ||
    r.includes('albert house')
  );
}

/**
 * Seed realistic default school furniture if school has zero assets
 */
function createInitialSeedAssets(schoolId: string, isTertiary = false): { assets: SchoolFurnitureAsset[]; damages: AssetDamageReport[] } {
  const assets: SchoolFurnitureAsset[] = [
    {
      id: `seed-ast-1-${schoolId}`,
      school_id: schoolId,
      name: isTertiary ? 'Student Double Lecture Desk (2-Seater)' : 'Student Double Wooden Desk (2-Seater)',
      asset_code: 'FURN-DSK-01',
      category: 'furniture_tables',
      total_quantity: 120,
      active_quantity: 114,
      broken_quantity: 4,
      in_repair_quantity: 2,
      unit_purchase_cost: 95000,
      estimated_unit_repair_cost: 18000,
      supplier: 'Kampala Timber Works & Joinery',
      purchase_date: '2025-01-10',
      notes: isTertiary ? 'Standard lecture hall twin desks with book compartments' : 'Standard secondary classroom twin desks with book compartments',
      created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
      allocations: isTertiary
        ? []
        : [
            { room_id: 'c1', room_name: 'Senior 1 A', room_type: 'classroom', quantity_allocated: 35 },
            { room_id: 'c2', room_name: 'Senior 1 B', room_type: 'classroom', quantity_allocated: 35 },
            { room_id: 'c3', room_name: 'Senior 2 A', room_type: 'classroom', quantity_allocated: 30 },
            { room_id: 's1', room_name: 'Central Furniture Store', room_type: 'store', quantity_allocated: 20 },
          ],
    },
    {
      id: `seed-ast-2-${schoolId}`,
      school_id: schoolId,
      name: isTertiary ? 'Steel-Frame Lecture Chair' : 'Steel-Frame Student Classroom Chair',
      asset_code: 'FURN-CHR-02',
      category: 'furniture_seating',
      total_quantity: 260,
      active_quantity: 248,
      broken_quantity: 8,
      in_repair_quantity: 4,
      unit_purchase_cost: 38000,
      estimated_unit_repair_cost: 9000,
      supplier: 'Apex Metal Fabricators',
      purchase_date: '2025-01-12',
      notes: 'Reinforced tubular steel legs with varnished plywood backrest',
      created_at: new Date(Date.now() - 55 * 86400000).toISOString(),
      allocations: isTertiary
        ? []
        : [
            { room_id: 'c1', room_name: 'Senior 1 A', room_type: 'classroom', quantity_allocated: 70 },
            { room_id: 'c2', room_name: 'Senior 1 B', room_type: 'classroom', quantity_allocated: 70 },
            { room_id: 'c3', room_name: 'Senior 2 A', room_type: 'classroom', quantity_allocated: 60 },
            { room_id: 'r1', room_name: 'Staff Room', room_type: 'office', quantity_allocated: 25 },
            { room_id: 's1', room_name: 'Central Furniture Store', room_type: 'store', quantity_allocated: 35 },
          ],
    },
    {
      id: `seed-ast-3-${schoolId}`,
      school_id: schoolId,
      name: isTertiary ? 'Trainee Hostel Metal Double-Decker Bunk Bed' : 'Heavy-Duty Metal Double-Decker Bunk Bed',
      asset_code: 'DORM-BED-01',
      category: 'dormitory_bedding',
      total_quantity: 80,
      active_quantity: 76,
      broken_quantity: 3,
      in_repair_quantity: 1,
      unit_purchase_cost: 280000,
      estimated_unit_repair_cost: 45000,
      supplier: 'Uganda Steel & Dormitory Works',
      purchase_date: '2024-11-20',
      notes: 'Angle-iron bunk bed frame (6x3ft) with safety rails and ladder',
      created_at: new Date(Date.now() - 70 * 86400000).toISOString(),
      allocations: isTertiary
        ? []
        : [
            { room_id: 'd1', room_name: 'Nile House (Boys)', room_type: 'dormitory', quantity_allocated: 40 },
            { room_id: 'd2', room_name: 'Victoria House (Girls)', room_type: 'dormitory', quantity_allocated: 35 },
            { room_id: 's1', room_name: 'Central Furniture Store', room_type: 'store', quantity_allocated: 5 },
          ],
    },
    {
      id: `seed-ast-4-${schoolId}`,
      school_id: schoolId,
      name: isTertiary ? 'Tutor Executive Pedestal Desk (3-Drawer)' : 'Teacher Executive Pedestal Desk (3-Drawer)',
      asset_code: 'FURN-TCH-03',
      category: 'furniture_tables',
      total_quantity: 24,
      active_quantity: 23,
      broken_quantity: 1,
      in_repair_quantity: 0,
      unit_purchase_cost: 320000,
      estimated_unit_repair_cost: 25000,
      supplier: 'Kampala Timber Works',
      purchase_date: '2024-09-15',
      notes: 'Lockable drawer tutor workstations',
      created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
      allocations: isTertiary
        ? []
        : [
            { room_id: 'r1', room_name: 'Staff Room', room_type: 'office', quantity_allocated: 16 },
            { room_id: 'c1', room_name: 'Senior 1 A', room_type: 'classroom', quantity_allocated: 1 },
            { room_id: 'c2', room_name: 'Senior 1 B', room_type: 'classroom', quantity_allocated: 1 },
            { room_id: 'c3', room_name: 'Senior 2 A', room_type: 'classroom', quantity_allocated: 1 },
            { room_id: 's1', room_name: 'Central Furniture Store', room_type: 'store', quantity_allocated: 5 },
          ],
    },
    {
      id: `seed-ast-5-${schoolId}`,
      school_id: schoolId,
      name: 'Magnetic Wall-Mount Whiteboard (120x240cm)',
      asset_code: 'FIXT-WBD-01',
      category: 'classroom_fixtures',
      total_quantity: 18,
      active_quantity: 18,
      broken_quantity: 0,
      in_repair_quantity: 0,
      unit_purchase_cost: 185000,
      estimated_unit_repair_cost: 30000,
      supplier: 'Elite School Supplies',
      purchase_date: '2025-01-05',
      notes: 'Anodized aluminium frame with marker tray',
      created_at: new Date(Date.now() - 65 * 86400000).toISOString(),
      allocations: isTertiary
        ? []
        : [
            { room_id: 'c1', room_name: 'Senior 1 A', room_type: 'classroom', quantity_allocated: 2 },
            { room_id: 'c2', room_name: 'Senior 1 B', room_type: 'classroom', quantity_allocated: 2 },
            { room_id: 'c3', room_name: 'Senior 2 A', room_type: 'classroom', quantity_allocated: 2 },
            { room_id: 'l1', room_name: 'Main Science Lab', room_type: 'lab', quantity_allocated: 2 },
            { room_id: 's1', room_name: 'Central Furniture Store', room_type: 'store', quantity_allocated: 10 },
          ],
    },
    {
      id: `seed-ast-6-${schoolId}`,
      school_id: schoolId,
      name: isTertiary ? 'Skills Lab Demonstration Wooden Stool' : 'Heavy Science Lab Wooden Stool',
      asset_code: 'LAB-STL-01',
      category: 'furniture_seating',
      total_quantity: 45,
      active_quantity: 43,
      broken_quantity: 2,
      in_repair_quantity: 0,
      unit_purchase_cost: 42000,
      estimated_unit_repair_cost: 10000,
      supplier: 'Kampala Timber Works',
      purchase_date: '2024-10-02',
      notes: isTertiary ? 'Hardwood demonstration and laboratory stools' : 'Hardwood 4-legged laboratory stools',
      created_at: new Date(Date.now() - 80 * 86400000).toISOString(),
      allocations: isTertiary
        ? []
        : [
            { room_id: 'l1', room_name: 'Main Science Lab', room_type: 'lab', quantity_allocated: 40 },
            { room_id: 's1', room_name: 'Central Furniture Store', room_type: 'store', quantity_allocated: 5 },
          ],
    },
  ];

  const damages: AssetDamageReport[] = [
    {
      id: `seed-dmg-1-${schoolId}`,
      school_id: schoolId,
      asset_id: assets[0].id,
      asset_name: assets[0].name,
      room_name: isTertiary ? 'Central Institutional Store' : 'Senior 1 B',
      quantity_damaged: 2,
      damage_type: 'cracked',
      severity: 'moderate',
      description: 'Wood desktop cracked down the middle and front book board detached',
      reported_by: isTertiary ? 'Campus Property Officer' : 'Class Teacher S.1 B',
      reported_date: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10),
      status: 'reported',
      estimated_repair_cost: 36000,
    },
    {
      id: `seed-dmg-2-${schoolId}`,
      school_id: schoolId,
      asset_id: assets[1].id,
      asset_name: assets[1].name,
      room_name: isTertiary ? 'Central Institutional Store' : 'Senior 2 A',
      quantity_damaged: 5,
      damage_type: 'bent_metal',
      severity: 'moderate',
      description: 'Back legs bent inward and bottom rubber studs missing',
      reported_by: isTertiary ? 'Tutor in Charge of Facilities' : 'Prefect in charge of Furniture',
      reported_date: new Date(Date.now() - 8 * 86400000).toISOString().slice(0, 10),
      status: 'repair_approved',
      estimated_repair_cost: 45000,
    },
    {
      id: `seed-dmg-3-${schoolId}`,
      school_id: schoolId,
      asset_id: assets[2].id,
      asset_name: assets[2].name,
      room_name: isTertiary ? 'Trainee Hostel Block' : 'Nile House (Boys)',
      quantity_damaged: 2,
      damage_type: 'broken',
      severity: 'severe',
      description: 'Upper bunk side ladder weld snapped and mattress mesh wire sagging',
      reported_by: isTertiary ? 'Hostel Warden' : 'House Master Nile',
      reported_date: new Date(Date.now() - 12 * 86400000).toISOString().slice(0, 10),
      status: 'in_repair',
      estimated_repair_cost: 90000,
      actual_repair_cost: 90000,
      repaired_by: 'Master Welder Mukasa',
    },
  ];

  return { assets, damages };
}

/**
 * Fetch all furniture and property assets for a school
 */
export async function fetchSchoolAssets(schoolId: string, isTertiary = false): Promise<SchoolFurnitureAsset[]> {
  // Check local cache
  let localList = getLocalAssets(schoolId);

  // If local list is completely empty, initialize with seed assets
  if (localList.length === 0) {
    const { assets: seedAssets, damages: seedDamages } = createInitialSeedAssets(schoolId, isTertiary);
    saveLocalAssets(seedAssets);
    saveLocalDamages(seedDamages);
    localList = seedAssets;
  } else if (isTertiary) {
    // Sanitize any existing cached seed assets for tertiary institutions to remove secondary school allocations
    let modified = false;
    localList = localList.map((a) => {
      if (a.allocations && a.allocations.some((alloc) => isSecondaryRoom(alloc.room_name))) {
        modified = true;
        return {
          ...a,
          allocations: a.allocations.filter((alloc) => !isSecondaryRoom(alloc.room_name)),
        };
      }
      return a;
    });

    if (modified) {
      const otherSchools = (JSON.parse(localStorage.getItem(LOCAL_STORAGE_ASSETS_KEY) || '[]') as SchoolFurnitureAsset[]).filter(
        (a) => a.school_id !== schoolId
      );
      saveLocalAssets([...otherSchools, ...localList]);
    }
  }

  // Attempt Supabase fetch (graceful fallback if table not migrated yet)
  try {
    const { data, error } = await supabase
      .from('school_furniture_assets')
      .select('*')
      .eq('school_id', schoolId)
      .order('name');

    if (!error && data && data.length > 0) {
      const serverAssets: SchoolFurnitureAsset[] = data.map((row) => ({
        id: row.id,
        school_id: row.school_id,
        name: row.name,
        asset_code: row.asset_code,
        category: row.category,
        total_quantity: Number(row.total_quantity) || 0,
        active_quantity: Number(row.active_quantity) || 0,
        broken_quantity: Number(row.broken_quantity) || 0,
        in_repair_quantity: Number(row.in_repair_quantity) || 0,
        unit_purchase_cost: row.unit_purchase_cost ? Number(row.unit_purchase_cost) : null,
        estimated_unit_repair_cost: row.estimated_unit_repair_cost ? Number(row.estimated_unit_repair_cost) : null,
        allocations: Array.isArray(row.allocations) ? row.allocations : [],
        supplier: row.supplier,
        purchase_date: row.purchase_date,
        notes: row.notes,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));

      // Cache server results locally
      const otherSchools = (JSON.parse(localStorage.getItem(LOCAL_STORAGE_ASSETS_KEY) || '[]') as SchoolFurnitureAsset[]).filter(
        (a) => a.school_id !== schoolId
      );
      saveLocalAssets([...otherSchools, ...serverAssets]);
      return serverAssets;
    }
  } catch {
    // Supabase table not available; use local resilient store
  }

  return localList;
}

/**
 * Fetch all damage and breakage reports
 */
export async function fetchAssetDamages(schoolId: string, isTertiary = false): Promise<AssetDamageReport[]> {
  let localDamages = getLocalDamages(schoolId);

  if (isTertiary && localDamages.length > 0) {
    let modified = false;
    localDamages = localDamages.map((d) => {
      if (isSecondaryRoom(d.room_name) || (d.reported_by && d.reported_by.toLowerCase().includes('senior'))) {
        modified = true;
        return {
          ...d,
          room_name: 'Central Institutional Store',
          reported_by: 'Campus Property Officer',
        };
      }
      return d;
    });

    if (modified) {
      const otherSchools = (JSON.parse(localStorage.getItem(LOCAL_STORAGE_DAMAGES_KEY) || '[]') as AssetDamageReport[]).filter(
        (d) => d.school_id !== schoolId
      );
      saveLocalDamages([...otherSchools, ...localDamages]);
    }
  }

  try {
    const { data, error } = await supabase
      .from('school_asset_damages')
      .select('*')
      .eq('school_id', schoolId)
      .order('reported_date', { ascending: false });

    if (!error && data && data.length > 0) {
      const serverDamages: AssetDamageReport[] = data.map((r) => ({
        id: r.id,
        school_id: r.school_id,
        asset_id: r.asset_id,
        asset_name: r.asset_name,
        room_name: r.room_name,
        quantity_damaged: Number(r.quantity_damaged) || 1,
        damage_type: r.damage_type,
        severity: r.severity || 'moderate',
        description: r.description,
        reported_by: r.reported_by,
        reported_date: r.reported_date,
        status: r.status,
        estimated_repair_cost: Number(r.estimated_repair_cost) || 0,
        actual_repair_cost: r.actual_repair_cost ? Number(r.actual_repair_cost) : null,
        linked_expense_id: r.linked_expense_id,
        repaired_date: r.repaired_date,
        repaired_by: r.repaired_by,
        notes: r.notes,
      }));

      const otherSchools = (JSON.parse(localStorage.getItem(LOCAL_STORAGE_DAMAGES_KEY) || '[]') as AssetDamageReport[]).filter(
        (d) => d.school_id !== schoolId
      );
      saveLocalDamages([...otherSchools, ...serverDamages]);
      return serverDamages;
    }
  } catch {
    // fallback to local
  }

  return localDamages;
}

/**
 * Record a new asset purchase
 */
export async function createSchoolAsset(
  schoolId: string,
  input: CreateAssetInput,
  recordedBy?: string
): Promise<SchoolFurnitureAsset> {
  const assetId = `ast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const allocations: ClassroomAllocation[] = input.initial_room_name
    ? [
        {
          room_id: `room-${Date.now()}`,
          room_name: input.initial_room_name,
          room_type: 'classroom',
          quantity_allocated: input.total_quantity,
        },
      ]
    : [
        {
          room_id: 'store-general',
          room_name: 'Central Furniture Store',
          room_type: 'store',
          quantity_allocated: input.total_quantity,
        },
      ];

  const newAsset: SchoolFurnitureAsset = {
    id: assetId,
    school_id: schoolId,
    name: input.name.trim(),
    asset_code: input.asset_code?.trim() || `AST-${Math.floor(1000 + Math.random() * 9000)}`,
    category: input.category,
    total_quantity: input.total_quantity,
    active_quantity: input.total_quantity,
    broken_quantity: 0,
    in_repair_quantity: 0,
    unit_purchase_cost: input.unit_purchase_cost || null,
    estimated_unit_repair_cost: input.estimated_unit_repair_cost || null,
    allocations,
    supplier: input.supplier || null,
    purchase_date: input.purchase_date || now.slice(0, 10),
    notes: input.notes || null,
    created_at: now,
  };

  // 1. Optionally post directly to school_expenses
  if (input.record_as_expense && input.unit_purchase_cost && input.total_quantity > 0) {
    const totalCost = input.unit_purchase_cost * input.total_quantity;
    try {
      await supabase.from('school_expenses').insert({
        school_id: schoolId,
        description: `Procurement: ${input.total_quantity}x ${input.name} (${newAsset.asset_code})`,
        amount: totalCost,
        expense_date: input.purchase_date || now.slice(0, 10),
        category_name: 'Furniture & Property Purchases',
        status: 'approved',
        payment_method: input.payment_method || 'Bank Transfer',
        recorded_by: recordedBy || 'System Inventory',
      });
    } catch (expErr) {
      console.warn('Failed to insert purchase into school_expenses:', expErr);
    }
  }

  // 2. Try Supabase insert
  try {
    await supabase.from('school_furniture_assets').insert({
      id: newAsset.id,
      school_id: schoolId,
      name: newAsset.name,
      asset_code: newAsset.asset_code,
      category: newAsset.category,
      total_quantity: newAsset.total_quantity,
      active_quantity: newAsset.active_quantity,
      broken_quantity: newAsset.broken_quantity,
      in_repair_quantity: newAsset.in_repair_quantity,
      unit_purchase_cost: newAsset.unit_purchase_cost,
      estimated_unit_repair_cost: newAsset.estimated_unit_repair_cost,
      allocations: newAsset.allocations,
      supplier: newAsset.supplier,
      purchase_date: newAsset.purchase_date,
      notes: newAsset.notes,
      created_at: newAsset.created_at,
    });
  } catch {
    // fallback
  }

  // 3. Save to local storage
  const all = JSON.parse(localStorage.getItem(LOCAL_STORAGE_ASSETS_KEY) || '[]') as SchoolFurnitureAsset[];
  saveLocalAssets([newAsset, ...all]);

  return newAsset;
}

/**
 * Report a broken / damaged asset
 */
export async function reportAssetDamage(
  schoolId: string,
  input: ReportDamageInput
): Promise<AssetDamageReport> {
  const assets = await fetchSchoolAssets(schoolId);
  const asset = assets.find((a) => a.id === input.asset_id);
  if (!asset) {
    throw new Error('Asset not found');
  }

  const damageQty = Math.min(input.quantity_damaged, asset.active_quantity);
  const now = new Date().toISOString();
  const unitEst = input.estimated_repair_cost ?? (asset.estimated_unit_repair_cost || 15000);
  const totalEstCost = unitEst * damageQty;

  const damageReport: AssetDamageReport = {
    id: `dmg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    school_id: schoolId,
    asset_id: asset.id,
    asset_name: asset.name,
    room_name: input.room_name,
    quantity_damaged: damageQty,
    damage_type: input.damage_type,
    severity: input.severity || 'moderate',
    description: input.description,
    reported_by: input.reported_by || 'Staff Member',
    reported_date: now.slice(0, 10),
    status: 'reported',
    estimated_repair_cost: totalEstCost,
  };

  // Update asset quantities
  const updatedAsset: SchoolFurnitureAsset = {
    ...asset,
    active_quantity: Math.max(0, asset.active_quantity - damageQty),
    broken_quantity: asset.broken_quantity + damageQty,
    updated_at: now,
  };

  // Try Supabase updates
  try {
    await supabase.from('school_asset_damages').insert({
      id: damageReport.id,
      school_id: schoolId,
      asset_id: damageReport.asset_id,
      asset_name: damageReport.asset_name,
      room_name: damageReport.room_name,
      quantity_damaged: damageReport.quantity_damaged,
      damage_type: damageReport.damage_type,
      severity: damageReport.severity,
      description: damageReport.description,
      reported_by: damageReport.reported_by,
      reported_date: damageReport.reported_date,
      status: damageReport.status,
      estimated_repair_cost: damageReport.estimated_repair_cost,
    });

    await supabase
      .from('school_furniture_assets')
      .update({
        active_quantity: updatedAsset.active_quantity,
        broken_quantity: updatedAsset.broken_quantity,
        updated_at: updatedAsset.updated_at,
      })
      .eq('id', asset.id);
  } catch {
    // fallback
  }

  // Update local storage
  const allAssets = JSON.parse(localStorage.getItem(LOCAL_STORAGE_ASSETS_KEY) || '[]') as SchoolFurnitureAsset[];
  const nextAssets = allAssets.map((a) => (a.id === asset.id ? updatedAsset : a));
  saveLocalAssets(nextAssets);

  const allDamages = JSON.parse(localStorage.getItem(LOCAL_STORAGE_DAMAGES_KEY) || '[]') as AssetDamageReport[];
  saveLocalDamages([damageReport, ...allDamages]);

  return damageReport;
}

/**
 * Record a repair expense directly into school_expenses and mark damage as in_repair
 */
export async function recordRepairExpense(
  schoolId: string,
  input: RecordRepairExpenseInput,
  recordedBy?: string
): Promise<AssetDamageReport> {
  const damages = await fetchAssetDamages(schoolId);
  const report = damages.find((d) => d.id === input.damage_report_id);
  if (!report) throw new Error('Damage report not found');

  const assets = await fetchSchoolAssets(schoolId);
  const asset = assets.find((a) => a.id === report.asset_id);

  let expenseId: string | null = null;
  const now = new Date().toISOString();

  // 1. Post expense to school_expenses
  try {
    const { data: expData, error: expErr } = await supabase
      .from('school_expenses')
      .insert({
        school_id: schoolId,
        description: `Repair: ${report.quantity_damaged}x ${report.asset_name} in ${report.room_name} (${report.description})`,
        amount: input.actual_cost,
        expense_date: now.slice(0, 10),
        category_name: 'Maintenance & Repairs',
        status: 'approved',
        payment_method: input.payment_method,
        recorded_by: recordedBy || 'Finance Accounts',
      })
      .select('expense_id')
      .maybeSingle();

    if (!expErr && expData) {
      expenseId = expData.expense_id;
    }
  } catch (err) {
    console.warn('Failed to insert repair into school_expenses:', err);
  }

  // 2. Update report status to in_repair
  const updatedReport: AssetDamageReport = {
    ...report,
    status: 'in_repair',
    actual_repair_cost: input.actual_cost,
    linked_expense_id: expenseId,
    repaired_by: input.technician_name || null,
    notes: input.notes || report.notes,
  };

  // 3. Move quantity from broken to in_repair on asset if found
  if (asset) {
    const qty = report.quantity_damaged;
    const updatedAsset: SchoolFurnitureAsset = {
      ...asset,
      broken_quantity: Math.max(0, asset.broken_quantity - qty),
      in_repair_quantity: asset.in_repair_quantity + qty,
      updated_at: now,
    };

    const allAssets = JSON.parse(localStorage.getItem(LOCAL_STORAGE_ASSETS_KEY) || '[]') as SchoolFurnitureAsset[];
    saveLocalAssets(allAssets.map((a) => (a.id === asset.id ? updatedAsset : a)));

    try {
      await supabase
        .from('school_furniture_assets')
        .update({
          broken_quantity: updatedAsset.broken_quantity,
          in_repair_quantity: updatedAsset.in_repair_quantity,
          updated_at: updatedAsset.updated_at,
        })
        .eq('id', asset.id);
    } catch {
      // fallback
    }
  }

  // Try Supabase damage update
  try {
    await supabase
      .from('school_asset_damages')
      .update({
        status: updatedReport.status,
        actual_repair_cost: updatedReport.actual_repair_cost,
        linked_expense_id: updatedReport.linked_expense_id,
        repaired_by: updatedReport.repaired_by,
        notes: updatedReport.notes,
      })
      .eq('id', report.id);
  } catch {
    // fallback
  }

  const allDamages = JSON.parse(localStorage.getItem(LOCAL_STORAGE_DAMAGES_KEY) || '[]') as AssetDamageReport[];
  saveLocalDamages(allDamages.map((d) => (d.id === report.id ? updatedReport : d)));

  return updatedReport;
}

/**
 * Mark a damaged item as repaired and restore active stock count
 */
export async function markAssetAsRepaired(
  schoolId: string,
  damageReportId: string,
  notes?: string
): Promise<AssetDamageReport> {
  const damages = await fetchAssetDamages(schoolId);
  const report = damages.find((d) => d.id === damageReportId);
  if (!report) throw new Error('Damage report not found');

  const assets = await fetchSchoolAssets(schoolId);
  const asset = assets.find((a) => a.id === report.asset_id);
  const now = new Date().toISOString();

  const updatedReport: AssetDamageReport = {
    ...report,
    status: 'repaired',
    repaired_date: now.slice(0, 10),
    notes: notes || report.notes,
  };

  // Restore quantities on asset: move back into active_quantity
  if (asset) {
    const qty = report.quantity_damaged;
    const fromInRepair = Math.min(qty, asset.in_repair_quantity);
    const fromBroken = Math.max(0, qty - fromInRepair);

    const updatedAsset: SchoolFurnitureAsset = {
      ...asset,
      active_quantity: asset.active_quantity + qty,
      in_repair_quantity: Math.max(0, asset.in_repair_quantity - fromInRepair),
      broken_quantity: Math.max(0, asset.broken_quantity - fromBroken),
      updated_at: now,
    };

    const allAssets = JSON.parse(localStorage.getItem(LOCAL_STORAGE_ASSETS_KEY) || '[]') as SchoolFurnitureAsset[];
    saveLocalAssets(allAssets.map((a) => (a.id === asset.id ? updatedAsset : a)));

    try {
      await supabase
        .from('school_furniture_assets')
        .update({
          active_quantity: updatedAsset.active_quantity,
          in_repair_quantity: updatedAsset.in_repair_quantity,
          broken_quantity: updatedAsset.broken_quantity,
          updated_at: updatedAsset.updated_at,
        })
        .eq('id', asset.id);
    } catch {
      // fallback
    }
  }

  try {
    await supabase
      .from('school_asset_damages')
      .update({
        status: updatedReport.status,
        repaired_date: updatedReport.repaired_date,
        notes: updatedReport.notes,
      })
      .eq('id', report.id);
  } catch {
    // fallback
  }

  const allDamages = JSON.parse(localStorage.getItem(LOCAL_STORAGE_DAMAGES_KEY) || '[]') as AssetDamageReport[];
  saveLocalDamages(allDamages.map((d) => (d.id === report.id ? updatedReport : d)));

  return updatedReport;
}

/**
 * Update classroom allocations for an asset
 */
export async function updateAssetAllocations(
  schoolId: string,
  assetId: string,
  allocations: ClassroomAllocation[]
): Promise<SchoolFurnitureAsset> {
  const assets = await fetchSchoolAssets(schoolId);
  const asset = assets.find((a) => a.id === assetId);
  if (!asset) throw new Error('Asset not found');

  const now = new Date().toISOString();
  const updatedAsset: SchoolFurnitureAsset = {
    ...asset,
    allocations,
    updated_at: now,
  };

  const allAssets = JSON.parse(localStorage.getItem(LOCAL_STORAGE_ASSETS_KEY) || '[]') as SchoolFurnitureAsset[];
  saveLocalAssets(allAssets.map((a) => (a.id === asset.id ? updatedAsset : a)));

  try {
    await supabase
      .from('school_furniture_assets')
      .update({ allocations, updated_at: now })
      .eq('id', assetId);
  } catch {
    // fallback
  }

  return updatedAsset;
}

/**
 * Delete an asset
 */
export async function deleteSchoolAsset(schoolId: string, assetId: string): Promise<void> {
  const allAssets = JSON.parse(localStorage.getItem(LOCAL_STORAGE_ASSETS_KEY) || '[]') as SchoolFurnitureAsset[];
  saveLocalAssets(allAssets.filter((a) => a.id !== assetId));

  try {
    await supabase.from('school_furniture_assets').delete().eq('id', assetId);
  } catch {
    // fallback
  }
}

/**
 * Compute summary KPIs for property dashboard
 */
export function computePropertyKpis(
  assets: SchoolFurnitureAsset[],
  damages: AssetDamageReport[]
): PropertyKpis {
  let total_assets = 0;
  let active_assets = 0;
  let broken_assets = 0;
  let in_repair_assets = 0;
  let total_valuation = 0;

  const uniqueClasses = new Set<string>();

  for (const a of assets) {
    total_assets += a.total_quantity;
    active_assets += a.active_quantity;
    broken_assets += a.broken_quantity;
    in_repair_assets += a.in_repair_quantity;
    if (a.unit_purchase_cost) {
      total_valuation += a.unit_purchase_cost * a.total_quantity;
    }
    for (const alloc of a.allocations || []) {
      if (alloc.room_name) uniqueClasses.add(alloc.room_name);
    }
  }

  // Calculate pending repair liability from reported/approved breakages
  const pendingDamages = damages.filter((d) => d.status === 'reported' || d.status === 'repair_approved');
  const estimated_repair_cost_total = pendingDamages.reduce(
    (acc, d) => acc + (d.estimated_repair_cost || 0),
    0
  );

  return {
    total_assets,
    active_assets,
    broken_assets,
    in_repair_assets,
    total_valuation,
    estimated_repair_cost_total,
    total_classes_tracked: uniqueClasses.size,
  };
}
