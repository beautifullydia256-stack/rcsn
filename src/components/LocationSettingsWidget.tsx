import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import GlassCard from '@/components/ui/GlassCard';
import { MapPin, Navigation, CheckCircle2 } from 'lucide-react';

export default function LocationSettingsWidget() {
  const navigate = useNavigate();
  const [schoolLocation, setSchoolLocation] = useState<{
    name: string;
    latitude: number;
    longitude: number;
    radius: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSchoolLocation = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: u } = await supabase
          .from('users')
          .select('school_id')
          .eq('user_id', user.id)
          .single();
        if (!u?.school_id) return;

        const { data: schoolData } = await supabase
          .from('schools')
          .select('location_name, location_latitude, location_longitude, location_radius')
          .eq('school_id', u.school_id)
          .single();

        if (schoolData) {
          setSchoolLocation({
            name: schoolData.location_name || 'School Location',
            latitude: schoolData.location_latitude ?? 0,
            longitude: schoolData.location_longitude ?? 0,
            radius: schoolData.location_radius ?? 100,
          });
        }
      } catch (error) {
        console.error('Error loading school location:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSchoolLocation();
  }, []);

  return (
    <GlassCard className="relative mb-6 overflow-hidden p-6" hover>
      <div
        className="absolute top-0 right-0 h-32 w-32 rounded-full opacity-20 blur-3xl"
        style={{ background: '#06b6d4' }}
      />
      <div className="relative z-10">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl p-3" style={{ background: 'rgba(6, 182, 212, 0.2)' }}>
            <MapPin className="h-6 w-6" style={{ color: '#06b6d4' }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">School Location Settings</h2>
            <p className="text-sm text-white/85">GPS coordinates for teacher attendance</p>
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-3/4 rounded bg-white/20" />
            <div className="h-4 w-1/2 rounded bg-white/20" />
          </div>
        ) : schoolLocation ? (
          <div className="space-y-3">
            <div
              className="rounded-xl p-4"
              style={{
                background: 'rgba(6, 182, 212, 0.15)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
              }}
            >
              <div className="mb-2 flex items-center gap-2">
                <Navigation className="h-4 w-4" style={{ color: '#06b6d4' }} />
                <span className="text-sm font-medium text-white">{schoolLocation.name}</span>
              </div>
              <div className="space-y-1 text-sm text-white/85">
                <div>
                  {schoolLocation.latitude.toFixed(6)}, {schoolLocation.longitude.toFixed(6)}
                </div>
                <div>Radius: {schoolLocation.radius}m</div>
                <div className="mt-2 text-xs text-white/70">
                  Teachers must be within this radius to punch in/out
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/dashboard/admin/settings/location')}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              <MapPin className="h-4 w-4" />
              Update Location
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(255, 255, 255, 0.08)' }}>
              <p className="mb-3 text-sm text-white/85">No location configured</p>
              <button
                type="button"
                onClick={() => navigate('/dashboard/admin/settings/location')}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
              >
                <MapPin className="h-4 w-4" />
                Configure Location
              </button>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
