import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wifi,
  Server,
  Eye,
  Plus,
  RefreshCw,
  Trash2,
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

  // Fetch real nodes from Supabase
  const { data: nodes = [], isLoading, refetch } = useQuery({
    queryKey: ['ict-network-nodes', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ict_network_nodes')
        .select('*')
        .eq('school_id', schoolId)
        .order('name', { ascending: true });
      if (error) {
        console.error('Error fetching network nodes:', error);
        return [];
      }
      return (data || []) as NetworkNode[];
    },
  });

  const addNodeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('ict_network_nodes').insert({
        school_id: schoolId,
        name: name.trim(),
        device_type: deviceType,
        location: location.trim(),
        ip_address: ipAddress.trim() || null,
        status: 'online',
      });
      if (error) throw error;
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
      const { error } = await supabase
        .from('ict_network_nodes')
        .update({ status: newStatus, last_ping_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ict-network-nodes', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['ict-network-kpi', schoolId] });
    },
  });

  const deleteNodeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ict_network_nodes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ict-network-nodes', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['ict-network-kpi', schoolId] });
    },
  });

  const networkNodes = nodes.filter((n) => n.device_type !== 'cctv_camera' && n.device_type !== 'nvr_server');
  const cctvNodes = nodes.filter((n) => n.device_type === 'cctv_camera' || n.device_type === 'nvr_server');
  const activeList = activeTab === 'network' ? networkNodes : cctvNodes;

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
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'network'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:text-white'
            }`}
          >
            <Wifi className="h-4 w-4" /> Campus Network &amp; APs ({networkNodes.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cctv')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'cctv'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:text-white'
            }`}
          >
            <Eye className="h-4 w-4" /> CCTV Surveillance ({cctvNodes.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="p-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100"
            title="Refresh Nodes"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setDeviceType(activeTab === 'cctv' ? 'cctv_camera' : 'access_point');
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm"
          >
            <Plus className="h-4 w-4" /> Add Node
          </button>
        </div>
      </div>

      {/* Nodes Display or Empty State */}
      {isLoading ? (
        <div className={`${adminCardClass} py-16 text-center text-slate-500 dark:text-slate-400 text-sm`}>
          Loading infrastructure nodes...
        </div>
      ) : activeList.length === 0 ? (
        <div className={`${adminCardClass} py-16 text-center text-slate-500 dark:text-slate-400`}>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-3">
            {activeTab === 'network' ? <Wifi className="h-7 w-7" /> : <Eye className="h-7 w-7" />}
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {activeTab === 'network' ? 'No Campus Network Nodes Registered' : 'No CCTV Cameras Configured'}
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {activeTab === 'network'
              ? 'Register campus Wi-Fi access points, core routers, and ethernet switches to monitor live connectivity.'
              : 'Add security cameras and NVR servers to monitor campus coverage points.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setDeviceType(activeTab === 'cctv' ? 'cctv_camera' : 'access_point');
              setIsModalOpen(true);
            }}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm"
          >
            <Plus className="h-4 w-4" /> {activeTab === 'network' ? 'Add Network Device' : 'Add Security Camera'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeList.map((node) => {
            const isOnline = node.status === 'online';
            return (
              <div
                key={node.id}
                className={`rounded-2xl border p-4 space-y-3 transition-all shadow-sm ${
                  isOnline
                    ? 'border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/40 hover:border-emerald-500/50'
                    : 'border-rose-300 dark:border-rose-500/30 bg-rose-50/60 dark:bg-rose-950/20 hover:border-rose-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                        isOnline
                          ? 'border-emerald-300 dark:border-emerald-500/30 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400'
                          : 'border-rose-300 dark:border-rose-500/30 bg-rose-100 dark:bg-rose-500/10 text-rose-800 dark:text-rose-400'
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
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">{node.name}</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                        {node.device_type.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
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
                          ? 'border-emerald-300 dark:border-emerald-500/30 bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                          : 'border-rose-300 dark:border-rose-500/30 bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300'
                      }`}
                    >
                      {node.status}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Remove node "${node.name}"?`)) {
                          deleteNodeMutation.mutate(node.id);
                        }
                      }}
                      className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors"
                      title="Delete Node"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 border-t border-slate-100 dark:border-white/5 pt-2 text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Campus Location:</span>
                    <span className="text-slate-900 dark:text-white font-medium">{node.location}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">IP Address:</span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">{node.ip_address || 'DHCP'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Node Name</label>
              <input
                type="text"
                placeholder="e.g. Hostels Wi-Fi AP 1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Device Type</label>
                <select
                  value={deviceType}
                  onChange={(e) => setDeviceType(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                >
                  <option value="access_point">Wi-Fi Access Point</option>
                  <option value="router">Gateway Router</option>
                  <option value="switch">Ethernet Switch</option>
                  <option value="cctv_camera">CCTV Security Camera</option>
                  <option value="nvr_server">NVR Storage Server</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Static / Reserved IP</label>
                <input
                  type="text"
                  placeholder="192.168.1.X"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Campus Location</label>
              <input
                type="text"
                placeholder="e.g. Block B, First Floor Corridor"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/5">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!name.trim() || !location.trim()}
                onClick={() => addNodeMutation.mutate()}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-sm"
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
