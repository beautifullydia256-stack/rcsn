import { supabase } from '@/lib/supabase';

export type NightRollCallStatus = 'present' | 'hospital_duty' | 'gate_pass' | 'absent';
export type FacilityType = 'ict_lab' | 'library';
export type FacilityRequestStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type LiabilityDepartment = 'ict_lab' | 'science_lab' | 'library' | 'hostel' | 'general';
export type LiabilityStatus = 'pending' | 'cleared' | 'waived';

export interface HostelBlock {
  id: string;
  school_id: string;
  name: string;
  gender: 'female' | 'male' | 'mixed';
  total_rooms: number;
}

export interface HostelRoom {
  id: string;
  block_id: string;
  room_number: string;
  bed_capacity: number;
}

export interface HostelAllocation {
  id: string;
  school_id: string;
  student_id: string;
  room_id: string;
  block_name?: string;
  room_number?: string;
  bed_number: number;
  academic_year: number;
  status: 'active' | 'vacated' | 'suspended';
}

export interface NightRollCallRecord {
  id: string;
  school_id: string;
  roll_call_date: string; // YYYY-MM-DD
  student_id: string;
  student_name?: string;
  admission_number?: string;
  current_class?: string;
  block_name?: string;
  room_number?: string;
  bed_number?: number;
  status: NightRollCallStatus;
  notes?: string;
  recorded_by?: string;
  recorded_at: string;
}

export interface FacilityAccessRequest {
  id: string;
  school_id: string;
  student_id: string;
  student_name?: string;
  admission_number?: string;
  current_class?: string;
  facility_type: FacilityType;
  academic_year: number;
  status: FacilityRequestStatus;
  station_or_card_no?: string;
  request_notes?: string;
  rejection_reason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface StudentLiability {
  id: string;
  school_id: string;
  student_id: string;
  student_name?: string;
  admission_number?: string;
  current_class?: string;
  department: LiabilityDepartment;
  item_damaged: string;
  quantity: number;
  circumstance: string;
  fee_amount_ugx: number;
  status: LiabilityStatus;
  invoice_id?: string;
  reported_by?: string;
  cleared_by?: string;
  cleared_at?: string;
  created_at: string;
}

const STORAGE_KEYS = {
  BLOCKS: 'rcsn_hostel_blocks_v1',
  ROOMS: 'rcsn_hostel_rooms_v1',
  ALLOCATIONS: 'rcsn_hostel_allocations_v1',
  ROLL_CALLS: 'rcsn_hostel_night_roll_calls_v1',
  FACILITY_REQUESTS: 'rcsn_facility_requests_v1',
  LIABILITIES: 'rcsn_student_liabilities_v1',
};

// Default initial blocks & rooms for Rakai Community School of Nursing
const DEFAULT_BLOCKS: HostelBlock[] = [
  {
    id: 'block-fem-1',
    school_id: 'e1b10000-0000-4000-a000-000000000001',
    name: 'Florence Nightingale Hall (Girls)',
    gender: 'female',
    total_rooms: 12,
  },
  {
    id: 'block-fem-2',
    school_id: 'e1b10000-0000-4000-a000-000000000001',
    name: 'Mother Kevin Complex (Girls)',
    gender: 'female',
    total_rooms: 10,
  },
  {
    id: 'block-male-1',
    school_id: 'e1b10000-0000-4000-a000-000000000001',
    name: 'St. Luke Hostel (Boys)',
    gender: 'male',
    total_rooms: 8,
  },
];

const DEFAULT_ROOMS: HostelRoom[] = [
  { id: 'room-fn-101', block_id: 'block-fem-1', room_number: 'Room G-01', bed_capacity: 4 },
  { id: 'room-fn-102', block_id: 'block-fem-1', room_number: 'Room G-02', bed_capacity: 4 },
  { id: 'room-fn-103', block_id: 'block-fem-1', room_number: 'Room G-03', bed_capacity: 4 },
  { id: 'room-fn-104', block_id: 'block-fem-1', room_number: 'Room G-04', bed_capacity: 4 },
  { id: 'room-fn-105', block_id: 'block-fem-1', room_number: 'Room G-05', bed_capacity: 4 },
  { id: 'room-mk-201', block_id: 'block-fem-2', room_number: 'Room MK-01', bed_capacity: 6 },
  { id: 'room-mk-202', block_id: 'block-fem-2', room_number: 'Room MK-02', bed_capacity: 6 },
  { id: 'room-sl-301', block_id: 'block-male-1', room_number: 'Room SL-01', bed_capacity: 4 },
  { id: 'room-sl-302', block_id: 'block-male-1', room_number: 'Room SL-02', bed_capacity: 4 },
  { id: 'room-sl-303', block_id: 'block-male-1', room_number: 'Room SL-03', bed_capacity: 4 },
];

function getStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Failed to store key ${key}:`, err);
  }
}

export const facilityAndLiabilityService = {
  // ── Hostel Blocks & Rooms ────────────────────────────────────────────────
  getHostelBlocks(schoolId: string): HostelBlock[] {
    const blocks = getStored<HostelBlock[]>(STORAGE_KEYS.BLOCKS, DEFAULT_BLOCKS);
    return blocks.filter((b) => b.school_id === schoolId);
  },

  getHostelRooms(blockId?: string): HostelRoom[] {
    const rooms = getStored<HostelRoom[]>(STORAGE_KEYS.ROOMS, DEFAULT_ROOMS);
    if (!blockId) return rooms;
    return rooms.filter((r) => r.block_id === blockId);
  },

  // ── Hostel Resident Roster ───────────────────────────────────────────────
  /**
   * Fetches only active students who are marked as Boarding / Resident.
   * Non-residents are strictly excluded.
   */
  async getResidentStudents(schoolId: string, genderFilter?: 'female' | 'male') {
    try {
      let query = supabase
        .from('students')
        .select('student_id, name, first_name, last_name, admission_number, current_class, gender, boarding_type, student_phone')
        .eq('school_id', schoolId)
        .eq('status', 'active');

      if (genderFilter) {
        query = query.ilike('gender', `${genderFilter}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter only residents (boarding_type === 'Boarding' or contains 'board' or 'resident')
      const residents = (data || []).filter((s) => {
        const bt = String(s.boarding_type || '').toLowerCase();
        return bt.includes('board') || bt.includes('resident');
      });

      // Merge with allocations
      const allocations = this.getAllocations(schoolId);
      const blocks = this.getHostelBlocks(schoolId);
      const rooms = this.getHostelRooms();

      return residents.map((st) => {
        const alloc = allocations.find((a) => a.student_id === st.student_id && a.status === 'active');
        const room = alloc ? rooms.find((r) => r.id === alloc.room_id) : undefined;
        const block = room ? blocks.find((b) => b.id === room.block_id) : undefined;

        return {
          ...st,
          allocation: alloc,
          block_name: block?.name || 'Unassigned Block',
          room_number: room?.room_number || 'Unassigned Room',
          bed_number: alloc?.bed_number || null,
        };
      });
    } catch {
      // Fallback if offline
      return [];
    }
  },

  getAllocations(schoolId: string): HostelAllocation[] {
    const allocs = getStored<HostelAllocation[]>(STORAGE_KEYS.ALLOCATIONS, []);
    return allocs.filter((a) => a.school_id === schoolId);
  },

  saveAllocation(alloc: Omit<HostelAllocation, 'id'> & { id?: string }): HostelAllocation {
    const all = getStored<HostelAllocation[]>(STORAGE_KEYS.ALLOCATIONS, []);
    const id = alloc.id || `alloc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newRecord: HostelAllocation = { ...alloc, id };

    // Remove old active allocation for this student if any
    const filtered = all.filter((a) => !(a.student_id === alloc.student_id && a.academic_year === alloc.academic_year));
    filtered.push(newRecord);
    setStored(STORAGE_KEYS.ALLOCATIONS, filtered);
    return newRecord;
  },

  // ── Night Roll Call ──────────────────────────────────────────────────────
  getNightRollCalls(schoolId: string, dateStr: string): NightRollCallRecord[] {
    const calls = getStored<NightRollCallRecord[]>(STORAGE_KEYS.ROLL_CALLS, []);
    return calls.filter((c) => c.school_id === schoolId && c.roll_call_date === dateStr);
  },

  saveNightRollCall(record: Omit<NightRollCallRecord, 'id' | 'recorded_at'>): NightRollCallRecord {
    const all = getStored<NightRollCallRecord[]>(STORAGE_KEYS.ROLL_CALLS, []);
    const id = `roll-${record.roll_call_date}-${record.student_id}`;
    const newEntry: NightRollCallRecord = {
      ...record,
      id,
      recorded_at: new Date().toISOString(),
    };

    const filtered = all.filter((c) => !(c.school_id === record.school_id && c.roll_call_date === record.roll_call_date && c.student_id === record.student_id));
    filtered.push(newEntry);
    setStored(STORAGE_KEYS.ROLL_CALLS, filtered);
    return newEntry;
  },

  batchSaveRollCalls(records: Omit<NightRollCallRecord, 'id' | 'recorded_at'>[]): void {
    const all = getStored<NightRollCallRecord[]>(STORAGE_KEYS.ROLL_CALLS, []);
    const now = new Date().toISOString();
    const newMap = new Map<string, NightRollCallRecord>();

    for (const r of all) {
      newMap.set(`${r.school_id}_${r.roll_call_date}_${r.student_id}`, r);
    }

    for (const rec of records) {
      const id = `roll-${rec.roll_call_date}-${rec.student_id}`;
      newMap.set(`${rec.school_id}_${rec.roll_call_date}_${rec.student_id}`, {
        ...rec,
        id,
        recorded_at: now,
      });
    }

    setStored(STORAGE_KEYS.ROLL_CALLS, Array.from(newMap.values()));
  },

  // ── Facility Access Requests (Computer Lab & Library) ────────────────────
  getFacilityRequests(schoolId: string, facilityType?: FacilityType, studentId?: string): FacilityAccessRequest[] {
    const reqs = getStored<FacilityAccessRequest[]>(STORAGE_KEYS.FACILITY_REQUESTS, []);
    return reqs.filter((r) => {
      if (r.school_id !== schoolId) return false;
      if (facilityType && r.facility_type !== facilityType) return false;
      if (studentId && r.student_id !== studentId) return false;
      return true;
    });
  },

  submitFacilityRequest(params: {
    schoolId: string;
    studentId: string;
    studentName?: string;
    admissionNumber?: string;
    currentClass?: string;
    facilityType: FacilityType;
    academicYear?: number;
    requestNotes?: string;
  }): FacilityAccessRequest {
    const all = getStored<FacilityAccessRequest[]>(STORAGE_KEYS.FACILITY_REQUESTS, []);
    const currentYear = params.academicYear || new Date().getFullYear();

    // Check if pending or approved exists
    const existing = all.find(
      (r) =>
        r.school_id === params.schoolId &&
        r.student_id === params.studentId &&
        r.facility_type === params.facilityType &&
        r.academic_year === currentYear &&
        (r.status === 'pending' || r.status === 'approved')
    );

    if (existing) {
      return existing;
    }

    const newReq: FacilityAccessRequest = {
      id: `freq-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      school_id: params.schoolId,
      student_id: params.studentId,
      student_name: params.studentName,
      admission_number: params.admissionNumber,
      current_class: params.currentClass,
      facility_type: params.facilityType,
      academic_year: currentYear,
      status: 'pending',
      request_notes: params.requestNotes,
      created_at: new Date().toISOString(),
    };

    all.unshift(newReq);
    setStored(STORAGE_KEYS.FACILITY_REQUESTS, all);
    return newReq;
  },

  updateFacilityRequestStatus(
    requestId: string,
    status: FacilityRequestStatus,
    stationOrCardNo?: string,
    rejectionReason?: string,
    reviewerId?: string
  ): FacilityAccessRequest | null {
    const all = getStored<FacilityAccessRequest[]>(STORAGE_KEYS.FACILITY_REQUESTS, []);
    const idx = all.findIndex((r) => r.id === requestId);
    if (idx === -1) return null;

    all[idx] = {
      ...all[idx],
      status,
      station_or_card_no: stationOrCardNo ?? all[idx].station_or_card_no,
      rejection_reason: rejectionReason ?? all[idx].rejection_reason,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    };

    setStored(STORAGE_KEYS.FACILITY_REQUESTS, all);
    return all[idx];
  },

  // ── Student Liabilities & Asset Breakages ────────────────────────────────
  getLiabilities(schoolId: string, studentId?: string, department?: LiabilityDepartment): StudentLiability[] {
    const liabs = getStored<StudentLiability[]>(STORAGE_KEYS.LIABILITIES, []);
    return liabs.filter((l) => {
      if (l.school_id !== schoolId) return false;
      if (studentId && l.student_id !== studentId) return false;
      if (department && l.department !== department) return false;
      return true;
    });
  },

  async recordLiability(params: {
    schoolId: string;
    studentId: string;
    studentName?: string;
    admissionNumber?: string;
    currentClass?: string;
    department: LiabilityDepartment;
    itemDamaged: string;
    quantity: number;
    circumstance: string;
    feeAmountUgx: number;
    reportedBy?: string;
  }): Promise<StudentLiability> {
    const all = getStored<StudentLiability[]>(STORAGE_KEYS.LIABILITIES, []);
    const newLiability: StudentLiability = {
      id: `liab-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      school_id: params.schoolId,
      student_id: params.studentId,
      student_name: params.studentName,
      admission_number: params.admissionNumber,
      current_class: params.currentClass,
      department: params.department,
      item_damaged: params.itemDamaged,
      quantity: params.quantity,
      circumstance: params.circumstance,
      fee_amount_ugx: Number(params.feeAmountUgx),
      status: 'pending',
      reported_by: params.reportedBy,
      created_at: new Date().toISOString(),
    };

    // Attach supplementary invoice directly to student_invoices in database
    try {
      const invNum = `INV-DMG-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
      const { data: invData } = await supabase.from('student_invoices').insert({
        school_id: params.schoolId,
        student_id: params.studentId,
        total_amount: params.feeAmountUgx,
        status: 'issued',
        invoice_number: invNum,
        is_supplementary: true,
        created_by: params.reportedBy,
        updated_at: new Date().toISOString(),
      }).select('invoice_id').single();

      if (invData?.invoice_id) {
        newLiability.invoice_id = invData.invoice_id;
      }
    } catch (invErr) {
      console.warn('Supplementary invoice creation skipped (offline or schema fallback):', invErr);
    }

    all.unshift(newLiability);
    setStored(STORAGE_KEYS.LIABILITIES, all);
    return newLiability;
  },

  updateLiabilityStatus(
    liabilityId: string,
    status: LiabilityStatus,
    clearedBy?: string
  ): StudentLiability | null {
    const all = getStored<StudentLiability[]>(STORAGE_KEYS.LIABILITIES, []);
    const idx = all.findIndex((l) => l.id === liabilityId);
    if (idx === -1) return null;

    all[idx] = {
      ...all[idx],
      status,
      cleared_by: clearedBy,
      cleared_at: status !== 'pending' ? new Date().toISOString() : undefined,
    };

    setStored(STORAGE_KEYS.LIABILITIES, all);
    return all[idx];
  },
};
