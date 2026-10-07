import { useEffect, useState } from 'react';
import {
  Building2,
  Bed,
  Users,
  Plus,
  DoorOpen,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';
import { useToast } from '@/components/Toast';
import {
  facilityAndLiabilityService,
  HostelBlock,
  HostelRoom,
  HostelAllocation,
} from '@/services/facilityAndLiabilityService';
import NativeModal from '@/components/NativeModal';
import { LiquidGlassSelect } from '@/components/ui/LiquidGlassSelect';

export default function MatronRoomsPage() {
  const { schoolId } = useAuthStore();
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);
  const toast = useToast();

  const activeSchoolId = schoolId || 'e1b10000-0000-4000-a000-000000000001';

  const [blocks, setBlocks] = useState<HostelBlock[]>([]);
  const [rooms, setRooms] = useState<HostelRoom[]>([]);
  const [allocations, setAllocations] = useState<HostelAllocation[]>([]);
  const [residents, setResidents] = useState<{ student_id: string; name: string; current_class?: string; admission_number?: string }[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string>('');
  const [allocatingRoom, setAllocatingRoom] = useState<HostelRoom | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedBedNumber, setSelectedBedNumber] = useState<number>(1);
  const [studentSearch, setStudentSearch] = useState('');

  const loadData = async () => {
    const b = facilityAndLiabilityService.getHostelBlocks(activeSchoolId);
    setBlocks(b);
    if (b.length > 0 && !selectedBlockId) {
      setSelectedBlockId(b[0].id);
    }
    const r = facilityAndLiabilityService.getHostelRooms();
    setRooms(r);
    const a = facilityAndLiabilityService.getAllocations(activeSchoolId);
    setAllocations(a);

    const res = await facilityAndLiabilityService.getResidentStudents(activeSchoolId);
    setResidents(res);
  };

  useEffect(() => {
    void loadData();
  }, [activeSchoolId]);

  const currentRooms = rooms.filter((r) => r.block_id === selectedBlockId);

  const handleAssignBed = () => {
    if (!allocatingRoom || !selectedStudentId) {
      toast.error('Please select a student to allocate.');
      return;
    }

    facilityAndLiabilityService.saveAllocation({
      school_id: activeSchoolId,
      student_id: selectedStudentId,
      room_id: allocatingRoom.id,
      bed_number: selectedBedNumber,
      academic_year: new Date().getFullYear(),
      status: 'active',
    });

    toast.success('Bed allocated successfully.');
    setAllocatingRoom(null);
    setSelectedStudentId('');
    void loadData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: tk.textHi }}>
            Hostel Blocks &amp; Bed Capacity
          </h1>
          <p className="text-xs sm:text-sm mt-0.5" style={{ color: tk.textLow }}>
            Room allocations and bed inventory for resident nursing trainees.
          </p>
        </div>
      </div>

      {/* Block Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {blocks.map((b) => {
          const isSelected = b.id === selectedBlockId;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => setSelectedBlockId(b.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border shrink-0 ${
                isSelected
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25 border-rose-500'
                  : 'text-slate-300 border-slate-700/60 hover:bg-white/5'
              }`}
              style={{ backgroundColor: isSelected ? undefined : tk.panel }}
            >
              <Building2 className="w-4 h-4" />
              <span>{b.name}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-300'}`}>
                {b.gender === 'female' ? 'Female' : 'Male'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentRooms.map((room) => {
          const roomAllocs = allocations.filter((a) => a.room_id === room.id && a.status === 'active');
          const occupiedCount = roomAllocs.length;
          const isFull = occupiedCount >= room.bed_capacity;

          return (
            <div
              key={room.id}
              className="p-5 rounded-2xl border transition-all hover:border-slate-600"
              style={{ backgroundColor: tk.panel, borderColor: tk.stroke }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
                    <DoorOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-100">{room.room_number}</h3>
                    <p className="text-[11px] text-slate-400">
                      Capacity: {room.bed_capacity} Beds
                    </p>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                    isFull
                      ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                      : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  {occupiedCount} / {room.bed_capacity} Occupied
                </span>
              </div>

              {/* Beds Visualization */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                {Array.from({ length: room.bed_capacity }).map((_, i) => {
                  const bedNum = i + 1;
                  const occupantAlloc = roomAllocs.find((a) => a.bed_number === bedNum);
                  const occupant = occupantAlloc
                    ? residents.find((r) => r.student_id === occupantAlloc.student_id)
                    : null;

                  return (
                    <div
                      key={bedNum}
                      className={`p-2.5 rounded-xl border text-xs flex flex-col justify-between ${
                        occupant
                          ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-200'
                          : 'bg-slate-800/30 border-dashed border-slate-700 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-semibold">
                        <span className="flex items-center gap-1">
                          <Bed className="w-3 h-3" /> Bed #{bedNum}
                        </span>
                        {occupant ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                        )}
                      </div>
                      <p className="font-bold text-xs truncate mt-1 text-slate-100">
                        {occupant ? occupant.name : 'Vacant'}
                      </p>
                      {occupant?.admission_number && (
                        <p className="text-[10px] text-slate-400 font-mono">
                          #{occupant.admission_number}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {!isFull && (
                <button
                  type="button"
                  onClick={() => {
                    setAllocatingRoom(room);
                    setSelectedBedNumber(occupiedCount + 1);
                  }}
                  className="w-full mt-4 py-2 px-3 rounded-xl text-xs font-bold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Assign Resident Bed
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Allocation Modal */}
      <NativeModal
        isOpen={!!allocatingRoom}
        onClose={() => setAllocatingRoom(null)}
        title={allocatingRoom ? `Assign Bed in Room ${allocatingRoom.room_number}` : 'Hostel Bed Allocation'}
        subtitle="Select resident trainee and assign bed number in hostel dormitory"
        icon={Bed}
        size="md"
      >
        {allocatingRoom && (
          <div className="space-y-4">
            <div className="relative z-[45] focus-within:z-[50]">
              <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
                Bed Number in Room {allocatingRoom.room_number}
              </label>
              <LiquidGlassSelect
                value={String(selectedBedNumber)}
                onChange={(val) => setSelectedBedNumber(Number(val))}
                options={Array.from({ length: allocatingRoom.bed_capacity }).map((_, i) => ({
                  value: String(i + 1),
                  label: `Dormitory Bed #${i + 1}`,
                }))}
              />
            </div>

            <div className="space-y-2 relative z-[40] focus-within:z-[50]">
              <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block">
                Resident Trainee (Search by Name or Admission No)
              </label>
              <input
                type="text"
                placeholder="Search trainee name or admission number..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full bg-black/25 border border-white/20 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:outline-none transition-all"
              />
              <LiquidGlassSelect
                value={selectedStudentId}
                onChange={(val) => setSelectedStudentId(val)}
                options={[
                  { value: '', label: '— Select Resident Trainee —' },
                  ...residents
                    .filter((r) =>
                      !studentSearch ||
                      r.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                      (r.admission_number && r.admission_number.toLowerCase().includes(studentSearch.toLowerCase()))
                    )
                    .map((s) => ({
                      value: s.student_id,
                      label: `${s.name} (${s.admission_number || 'NO ADM'}) • ${s.current_class || 'Class'}`,
                    })),
                ]}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setAllocatingRoom(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white/80 bg-white/10 hover:bg-white/15 border border-white/15 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignBed}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-950/40 border border-emerald-400/30 transition-all"
              >
                Confirm Allocation
              </button>
            </div>
          </div>
        )}
      </NativeModal>
    </div>
  );
}
