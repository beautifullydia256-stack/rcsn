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

async function fetchLocationSettings(userId: string): Promise<{ schoolId: string; location: SchoolLocation } | null> {
  const { data: userData } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (!userData?.school_id) return null;
  const { data: schoolData } = await supabase
    .from('schools')
    .select('location_latitude, location_longitude, location_radius, location_name')
    .eq('school_id', userData.school_id)
    .single();
  const location: SchoolLocation = schoolData
    ? {
        latitude: schoolData.location_latitude ?? 0.3476,
        longitude: schoolData.location_longitude ?? 32.5825,
        radius: schoolData.location_radius ?? 200,
        name: schoolData.location_name || 'School Location',
      }
    : { latitude: 0.3476, longitude: 32.5825, radius: 200, name: 'School Location' };
  return { schoolId: userData.school_id, location };
}

export default function LocationSettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
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
    queryKey: ['admin', 'locationSettings', user?.id ?? ''],
    queryFn: () => fetchLocationSettings(user!.id),
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
  });

  const schoolId = data?.schoolId ?? null;
  useEffect(() => {
    if (data?.location) setLocation(data.location);
  }, [data?.location]);
  const loading = isLoading;

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
      await queryClient.invalidateQueries({ queryKey: ['admin', 'locationSettings', user?.id] });
    } catch (err) {
      console.error('Error saving school location:', err);
      setError('Failed to save school location');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminPageWrapper title="School Location Settings">
        <div className="text-gray-500">Loading...</div>
      </AdminPageWrapper>
    );
  }

  return (
    <AdminPageWrapper title="School Location Settings" subtitle="GPS coordinates for teacher attendance">
      <div className="mb-4 flex items-center justify-end">
        <button
          type="button"
          onClick={() => navigate('/dashboard/admin/settings')}
          className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to Settings
        </button>
      </div>

      <div className={`${adminCardClass} space-y-4`}>
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-200">
            {success}
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Location Name</label>
          <input
            type="text"
            value={location.name}
            onChange={(e) => setLocation((prev) => ({ ...prev, name: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-white placeholder-gray-400"
            placeholder="School Location"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Latitude</label>
            <input
              type="number"
              step="any"
              value={location.latitude}
              onChange={(e) =>
                setLocation((prev) => ({ ...prev, latitude: parseFloat(e.target.value) || 0 }))
              }
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Longitude</label>
            <input
              type="number"
              step="any"
              value={location.longitude}
              onChange={(e) =>
                setLocation((prev) => ({ ...prev, longitude: parseFloat(e.target.value) || 0 }))
              }
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-white"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Radius (meters)</label>
          <input
            type="number"
            min={50}
            max={2000}
            value={location.radius}
            onChange={(e) =>
              setLocation((prev) => ({ ...prev, radius: parseInt(e.target.value, 10) || 100 }))
            }
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-white"
          />
          <p className="mt-1 text-xs text-white/60">
            Teachers must be within this radius to punch in/out.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={getCurrentLocation}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
          >
            Use Current Location
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Location'}
          </button>
        </div>
      </div>
    </AdminPageWrapper>
  );
}
