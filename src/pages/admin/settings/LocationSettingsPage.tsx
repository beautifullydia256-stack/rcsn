import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import AdminPageWrapper from '@/components/layout/AdminPageWrapper';
import { ArrowLeft, MapPin, Navigation, Save, CheckCircle2, AlertTriangle } from 'lucide-react';
import { GovRollingBox } from '@/components/ui/GovLoadingIndicator';
import '@/styles/government-system.css';

const STALE_TIME_MS = 5 * 60 * 1000;

interface SchoolLocation {
  latitude: number;
  longitude: number;
  radius: number;
  name: string;
}

async function fetchLocationSettings(schoolId: string): Promise<SchoolLocation> {
  const { data } = await supabase
    .from('schools')
    .select('location_latitude, location_longitude, location_radius, location_name')
    .eq('school_id', schoolId)
    .single();
  return data
    ? {
        latitude: data.location_latitude ?? 0.3476,
        longitude: data.location_longitude ?? 32.5825,
        radius: data.location_radius ?? 200,
        name: data.location_name || 'School Location',
      }
    : { latitude: 0.3476, longitude: 32.5825, radius: 200, name: 'School Location' };
}

export default function LocationSettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const schoolId = useAuthStore((s) => s.schoolId);
  const [saving, setSaving] = useState(false);
  const [location, setLocation] = useState<SchoolLocation>({
    latitude: 0.3476,
    longitude: 32.5825,
    radius: 200,
    name: 'School Location',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'locationSettings', schoolId ?? ''],
    queryFn: () => fetchLocationSettings(schoolId!),
    enabled: !!schoolId,
    staleTime: STALE_TIME_MS,
  });

  useEffect(() => {
    if (data) setLocation(data);
  }, [data]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('GEOLOCATION IS NOT SUPPORTED BY THIS BROWSER ENVIRONMENT');
      return;
    }
    setError(null);
    setSuccess('DETECTING HARDWARE GPS COORDINATES…');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation((prev) => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        setSuccess(
          `COORDINATES CAPTURED: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`
        );
      },
      (err) => {
        setError(err.message ? err.message.toUpperCase() : 'UNABLE TO RETRIEVE HARDWARE GEOLOCATION');
        setSuccess(null);
      },
      { enableHighAccuracy: false, timeout: 30000, maximumAge: 60000 }
    );
  };

  const handleSave = async () => {
    if (!schoolId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const { error: err } = await supabase
        .from('schools')
        .update({
          location_latitude: location.latitude,
          location_longitude: location.longitude,
          location_radius: location.radius,
          location_name: location.name,
        })
        .eq('school_id', schoolId);
      if (err) throw err;
      setSuccess('INSTITUTIONAL GEOFENCE BOUNDARIES SYNCHRONIZED SUCCESSFULLY');
      setTimeout(() => setSuccess(null), 3000);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'locationSettings', schoolId] });
    } catch (err) {
      console.error('Error saving school location:', err);
      setError('FAILED TO COMMIT GEOFENCE COORDINATES TO REGISTRY');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AdminPageWrapper>
        <div className="gov-card p-16 flex items-center justify-center border border-[#CCCCCC]">
          <GovRollingBox size="lg" />
        </div>
      </AdminPageWrapper>
    );
  }

  return (
    <AdminPageWrapper>
      {/* INSTITUTIONAL GOVERNMENT HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#CCCCCC] pb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-[17px] font-bold tracking-tight text-[#111111] uppercase font-sans">
            CAMPUS GEOLOCATION & GEOFENCE REGISTRY
          </h1>
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-bold bg-[#EAEAEA] text-[#222222] border border-[#CCCCCC]">
            GPS VALIDATION
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/settings')}
            className="gov-btn gov-btn-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            BACK TO SETTINGS
          </button>
        </div>
      </div>

      {/* METRIC STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="gov-card p-3 rounded-lg text-center border border-[#CCCCCC]">
          <div className="text-[10px] font-mono uppercase text-[#666666] tracking-wider">LATITUDE</div>
          <div className="text-sm font-bold font-mono text-[#111111] mt-0.5">
            {location.latitude.toFixed(6)}
          </div>
        </div>
        <div className="gov-card p-3 rounded-lg text-center border border-[#CCCCCC]">
          <div className="text-[10px] font-mono uppercase text-[#666666] tracking-wider">LONGITUDE</div>
          <div className="text-sm font-bold font-mono text-[#111111] mt-0.5">
            {location.longitude.toFixed(6)}
          </div>
        </div>
        <div className="gov-card p-3 rounded-lg text-center border border-[#CCCCCC]">
          <div className="text-[10px] font-mono uppercase text-[#666666] tracking-wider">GEOFENCE RADIUS</div>
          <div className="text-sm font-bold font-mono text-[#111111] mt-0.5">
            {location.radius} METERS
          </div>
        </div>
        <div className="gov-card p-3 rounded-lg text-center border border-[#CCCCCC]">
          <div className="text-[10px] font-mono uppercase text-[#666666] tracking-wider">HARDWARE DISPATCH</div>
          <div className="text-sm font-bold font-mono text-[#15803D] mt-0.5">
            ACTIVE
          </div>
        </div>
      </div>

      {/* GEOFENCE CONFIGURATION DESK */}
      <div className="max-w-2xl">
        <div className="gov-card p-6 rounded-lg border border-[#CCCCCC] bg-white space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-[#FEF2F2] border border-[#EF4444] text-xs font-mono font-bold text-[#B91C1C] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="p-3 rounded-md bg-[#F0FDF4] border border-[#22C55E] text-xs font-mono font-bold text-[#15803D] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-mono font-bold uppercase text-[#555555] mb-1">
              DESIGNATED CAMPUS SITE NAME
            </label>
            <input
              type="text"
              value={location.name}
              onChange={(e) => setLocation((prev) => ({ ...prev, name: e.target.value }))}
              className="gov-input w-full text-xs"
              placeholder="e.g. Main Health Sciences Complex"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase text-[#555555] mb-1">
                LATITUDE (DECIMAL DEGREES)
              </label>
              <input
                type="number"
                step="any"
                value={location.latitude}
                onChange={(e) =>
                  setLocation((prev) => ({ ...prev, latitude: parseFloat(e.target.value) || 0 }))
                }
                className="gov-input w-full text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase text-[#555555] mb-1">
                LONGITUDE (DECIMAL DEGREES)
              </label>
              <input
                type="number"
                step="any"
                value={location.longitude}
                onChange={(e) =>
                  setLocation((prev) => ({ ...prev, longitude: parseFloat(e.target.value) || 0 }))
                }
                className="gov-input w-full text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono font-bold uppercase text-[#555555] mb-1">
              PERMISSIBLE GEOFENCE RADIUS (METERS)
            </label>
            <input
              type="number"
              min={50}
              max={2000}
              value={location.radius}
              onChange={(e) =>
                setLocation((prev) => ({ ...prev, radius: parseInt(e.target.value, 10) || 100 }))
              }
              className="gov-input w-full text-xs font-mono"
            />
            <p className="mt-1 text-[11px] font-mono text-[#777777]">
              Clinical instructors and faculty must be situated within this perimeter for biometric punch verification.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#CCCCCC]">
            <button
              type="button"
              onClick={getCurrentLocation}
              className="gov-btn gov-btn-sm"
            >
              <Navigation className="w-3.5 h-3.5 mr-1 text-[#555555]" />
              DETECT HARDWARE GPS
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="gov-btn gov-btn-sm gov-btn-primary"
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              {saving ? 'COMMITTING…' : 'SAVE GEOFENCE PROFILE'}
            </button>
          </div>
        </div>
      </div>
    </AdminPageWrapper>
  );
}
