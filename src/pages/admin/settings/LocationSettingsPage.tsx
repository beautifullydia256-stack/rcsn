import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';

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
      setError('Geolocation is not supported by this browser');
      return;
    }
    setError(null);
    setSuccess('Getting your current location...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation((prev) => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        setSuccess(
          `✅ Current location: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`
        );
      },
      (err) => {
        setError(err.message || 'Unable to get current location.');
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
      setSuccess('School location updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'locationSettings', schoolId] });
    } catch (err) {
      console.error('Error saving school location:', err);
      setError('Failed to save school location');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AdminPageWrapper title="School Location Settings">
        <div className="ac-text-muted">Loading...</div>
      </AdminPageWrapper>
    );
  }

  return (
    <AdminPageWrapper title="School Location Settings" subtitle="GPS coordinates for teacher attendance">
      <div className="mb-4 flex items-center justify-end">
        <button
          type="button"
          onClick={() => navigate('/dashboard/admin/settings')}
          className="ac-glass-btn-secondary min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium ac-text-primary"
        >
          Back to Settings
        </button>
      </div>

      <div className={`${adminCardClass} space-y-4`}>
        {error && (
          <div className="rounded-lg border border-red-400/40 bg-red-950/50 px-3 py-2 text-sm text-red-100">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-emerald-400/35 bg-emerald-950/45 px-3 py-2 text-sm text-emerald-100">
            {success}
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium ac-text-secondary">Location Name</label>
          <input
            type="text"
            value={location.name}
            onChange={(e) => setLocation((prev) => ({ ...prev, name: e.target.value }))}
            className="ac-input min-h-[44px] w-full"
            placeholder="School Location"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium ac-text-secondary">Latitude</label>
            <input
              type="number"
              step="any"
              value={location.latitude}
              onChange={(e) =>
                setLocation((prev) => ({ ...prev, latitude: parseFloat(e.target.value) || 0 }))
              }
              className="ac-input min-h-[44px] w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium ac-text-secondary">Longitude</label>
            <input
              type="number"
              step="any"
              value={location.longitude}
              onChange={(e) =>
                setLocation((prev) => ({ ...prev, longitude: parseFloat(e.target.value) || 0 }))
              }
              className="ac-input min-h-[44px] w-full"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium ac-text-secondary">Radius (meters)</label>
          <input
            type="number"
            min={50}
            max={2000}
            value={location.radius}
            onChange={(e) =>
              setLocation((prev) => ({ ...prev, radius: parseInt(e.target.value, 10) || 100 }))
            }
            className="ac-input min-h-[44px] w-full"
          />
          <p className="mt-1 text-xs ac-text-muted">
            Teachers must be within this radius to punch in/out.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={getCurrentLocation}
            className="ac-glass-btn-secondary min-h-[44px] rounded-lg px-4 py-2 text-sm font-medium ac-text-primary"
          >
            Use Current Location
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="min-h-[44px] rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Location'}
          </button>
        </div>
      </div>
    </AdminPageWrapper>
  );
}
