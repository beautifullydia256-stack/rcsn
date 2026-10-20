import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wifi,
  Server,
  ShieldCheck,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
  MapPin,
  Clock,
  Radio,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';
import NativeModal from '@/components/NativeModal';

interface NetworkNode {
  id: string;
  name: string;
  device_type: string; // 'access_point', 'router', 'switch', 'cctv_camera', 'nvr_server'
  location: string;
  ip_address: string | null;
  mac_address: string | null;
  status: string; // 'online', 'offline', 'maintenance'
  last_ping_at: string;
  notes: string | null;
}

export default function IctNetworkPage() {
  const queryClient = useQueryClient();
  const schoolId = useAuthStore((s) => s.schoolId) || 'e1b10000-0000-4000-a000-000000000001';

  const [activeTab, setActiveTab] = useState<'network' | 'cctv'>('network');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Node Form
  const [name, setName] = useState('');
  const [deviceType, setDeviceType] = useState('access_point');
  const [location, setLocation] = useState('');
  const [ipAddress, setIpAddress] = useState('192.168.1.');

const NETWORK_LOCAL_KEY = 'rcsn_ict_network_nodes';

function getInitialLocalNetworkNodes(): NetworkNode[] {
  try {
    const raw = localStorage.getItem(NETWORK_LOCAL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  const sample: NetworkNode[] = [
    { id: 'local-net-1', name: 'Main Gateway Router (Fiber)', device_type: 'router', location: 'Server Room', ip_address: '192.168.1.1', mac_address: 'E4:8D:8C:11:22:33', status: 'online', last_ping_at: new Date().toISOString(), notes: 'Primary fiber ISP backbone' },
    { id: 'local-net-2', name: 'Core 24-Port Switch A', device_type: 'switch', location: 'Server Room', ip_address: '192.168.1.2', mac_address: 'E4:8D:8C:11:22:34', status: 'online', last_ping_at: new Date().toISOString(), notes: 'Gigabit PoE switch for labs' },
    { id: 'local-net-3', name: 'Admin Block Wi-Fi AP', device_type: 'access_point', location: 'Admin Block Corridor', ip_address: '192.168.1.10', mac_address: 'E4:8D:8C:11:22:35', status: 'online', last_ping_at: new Date().toISOString(), notes: 'Dual-band Wi-Fi 6 AP' },
    { id: 'local-net-4', name: 'Computer Lab High-Density AP', device_type: 'access_point', location: 'Computer Lab', ip_address: '192.168.1.11', mac_address: 'E4:8D:8C:11:22:36', status: 'online', last_ping_at: new Date().toISOString(), notes: 'Supports 100+ concurrent clients' },
    { id: 'local-net-5', name: 'Library Wi-Fi AP', device_type: 'access_point', location: 'Library Reading Hall', ip_address: '192.168.1.12', mac_address: 'E4:8D:8C:11:22:37', status: 'online', last_ping_at: new Date().toISOString(), notes: 'Coverage across e-library hall' },
    { id: 'local-net-6', name: 'Lecture Hall 1 Wi-Fi AP', device_type: 'access_point', location: 'Lecture Block A', ip_address: '192.168.1.13', mac_address: 'E4:8D:8C:11:22:38', status: 'online', last_ping_at: new Date().toISOString(), notes: 'Nursing lecture hall coverage' },
    { id: 'local-net-7', name: 'CCTV 01 - Campus Main Gate', device_type: 'cctv_camera', location: 'Security Gatehouse', ip_address: '192.168.1.51', mac_address: 'A0:B1:C2:01:02:03', status: 'online', last_ping_at: new Date().toISOString(), notes: '4K License plate recognition' },
    { id: 'local-net-8', name: 'CCTV 02 - Admin Reception', device_type: 'cctv_camera', location: 'Admin Foyer', ip_address: '192.168.1.52', mac_address: 'A0:B1:C2:01:02:04', status: 'online', last_ping_at: new Date().toISOString(), notes: 'Wide-angle dome camera' },
    { id: 'local-net-9', name: 'CCTV 03 - Computer Laboratory', device_type: 'cctv_camera', location: 'Computer Lab Interior', ip_address: '192.168.1.53', mac_address: 'A0:B1:C2:01:02:05', status: 'online', last_ping_at: new Date().toISOString(), notes: 'Full lab coverage 30 workstations' },
    { id: 'local-net-10', name: 'CCTV 04 - Skills Laboratory', device_type: 'cctv_camera', location: 'Skills Lab Entrance', ip_address: '192.168.1.54', mac_address: 'A0:B1:C2:01:02:06', status: 'online', last_ping_at: new Date().toISOString(), notes: 'Hospital ward & mannequins view' },
  ];
  try { localStorage.setItem(NETWORK_LOCAL_KEY, JSON.stringify(sample)); } catch {}
  return sample;
}

  const { data: nodes = [], isLoading, refetch } = useQuery({
    queryKey: ['ict-network-nodes', schoolId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('ict_network_nodes')
          .select('*')
          .eq('school_id', schoolId)
          .order('name', { ascending: true });
        if (!error && Array.isArray(data) && data.length > 0) return data as NetworkNode[];
      } catch {}
      return getInitialLocalNetworkNodes();
    },
  });

  const addNodeMutation = useMutation({
    mutationFn: async () => {
      const newNode: NetworkNode = {
        id: `local-net-${Date.now()}`,
        name,
        device_type: deviceType,
        location,
        ip_address: ipAddress,
        mac_address: null,
        status: 'online',
        last_ping_at: new Date().toISOString(),
        notes: null,
      };
      try {
        await supabase.from('ict_network_nodes').insert({
          school_id: schoolId,
          name: newNode.name,
          device_type: newNode.device_type,
          location: newNode.location,
          ip_address: newNode.ip_address,
          status: 'online',
        });
      } catch {}
      const current = getInitialLocalNetworkNodes();
      current.push(newNode);
      try { localStorage.setItem(NETWORK_LOCAL_KEY, JSON.stringify(current)); } catch {}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ict-network-nodes', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['ict-network-kpi', schoolId] });
      setIsModalOpen(false);
      setName('');
      setLocation('');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      try {
        await supabase
          .from('ict_network_nodes')
          .update({ status: newStatus, last_ping_at: new Date().toISOString() })
          .eq('id', id);
      } catch {}
      const current = getInitialLocalNetworkNodes();
      const next = current.map((n) => (n.id === id ? { ...n, status: newStatus, last_ping_at: new Date().toISOString() } : n));
      try { localStorage.setItem(NETWORK_LOCAL_KEY, JSON.stringify(next)); } catch {}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ict-network-nodes', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['ict-network-kpi', schoolId] });
    },
  });

  const networkNodes = nodes.filter((n) => n.device_type !== 'cctv_camera' && n.device_type !== 'nvr_server');
  const cctvNodes = nodes.filter((n) => n.device_type === 'cctv_camera' || n.device_type === 'nvr_server');

  return (
    <AdminPageWrapper
      eyebrow="CONNECTIVITY & SURVEILLANCE"
      title="Campus Wi-Fi, Network & CCTV"
      subtitle="Monitor access point health, core network infrastructure, and campus security camera feeds."
    >
      {/* Tab Switcher & Action Bar */}
      <div className={`${adminCardClass} flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3`}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('network')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold ${
              activeTab === 'network'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'border border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Wifi className="h-4 w-4" /> Campus Network & APs ({networkNodes.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cctv')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold ${
              activeTab === 'cctv'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'border border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="h-4 w-4" /> CCTV Surveillance ({cctvNodes.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white"
            title="Ping Nodes"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm"
          >
            <Plus className="h-4 w-4" /> Add Node
          </button>
        </div>
      </div>

      {/* Nodes Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(activeTab === 'network' ? networkNodes : cctvNodes).map((node) => {
          const isOnline = node.status === 'online';
          return (
            <div
              key={node.id}
              className={`rounded-2xl border p-4 space-y-3 transition-all ${
                isOnline
                  ? 'border-white/10 bg-slate-900/40 hover:border-emerald-500/30'
                  : 'border-rose-500/30 bg-rose-950/10 hover:border-rose-500/50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                      isOnline
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                    }`}
                  >
                    {node.device_type === 'access_point' ? (
                      <Wifi className="h-5 w-5" />
                    ) : node.device_type === 'cctv_camera' ? (
                      <Eye className="h-5 w-5" />
                    ) : (
                      <Server className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">{node.name}</h3>
                    <p className="text-[11px] text-slate-400 uppercase tracking-wider">{node.device_type.replace(/_/g, ' ')}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    toggleStatusMutation.mutate({
                      id: node.id,
                      newStatus: isOnline ? 'offline' : 'online',
                    })
                  }
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                    isOnline
                      ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-300'
                      : 'border-rose-500/30 bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {node.status}
                </button>
              </div>

              <div className="space-y-1.5 border-t border-white/5 pt-2 text-xs text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Campus Location:</span>
                  <span className="text-white font-medium">{node.location}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">IP Address:</span>
                  <span className="font-mono text-emerald-400">{node.ip_address || 'DHCP'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Device Modal */}
      {isModalOpen && (
        <NativeModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Register Network or Surveillance Node"
          size="md"
        >
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold text-slate-300">Node Name</label>
              <input
                type="text"
                placeholder="e.g. Hostels Wi-Fi AP 1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-900 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300">Device Type</label>
                <select
                  value={deviceType}
                  onChange={(e) => setDeviceType(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-900 text-xs text-white"
                >
                  <option value="access_point">Wi-Fi Access Point</option>
                  <option value="router">Gateway Router</option>
                  <option value="switch">Ethernet Switch</option>
                  <option value="cctv_camera">CCTV Security Camera</option>
                  <option value="nvr_server">NVR Storage Server</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300">Static / Reserved IP</label>
                <input
                  type="text"
                  placeholder="192.168.1.X"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-900 text-xs font-mono text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Campus Location</label>
              <input
                type="text"
                placeholder="e.g. Block B, First Floor Corridor"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-900 text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-white/10 text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!name.trim() || !location.trim()}
                onClick={() => addNodeMutation.mutate()}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs"
              >
                Register Node
              </button>
            </div>
          </div>
        </NativeModal>
      )}
    </AdminPageWrapper>
  );
}
