'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import GlassButton from './GlassButton';
import { MapPin, Navigation } from 'lucide-react';

export default function LocationSettingsWidget() {
  const [schoolLocation, setSchoolLocation] = useState<{
    name: string;
    latitude: number;
    longitude: number;
    radius: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadSchoolLocation = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data: u } = await supabase.from("users").select("school_id").eq("user_id", user.id).single();
        if (!u?.school_id) return;

        const { data: schoolData } = await supabase
          .from("schools")
          .select("location_name, location_latitude, location_longitude, location_radius")
          .eq("school_id", u.school_id)
          .single();
        
        if (schoolData) {
          setSchoolLocation({
            name: schoolData.location_name || "School Location",
            latitude: schoolData.location_latitude || 0,
            longitude: schoolData.location_longitude || 0,
            radius: schoolData.location_radius || 100
          });
        }
      } catch (error) {
        console.error("Error loading school location:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadSchoolLocation();
  }, []);

  return (
    <GlassCard className="p-6 mb-6 relative overflow-hidden" hover>
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20 blur-3xl"
        style={{ background: '#06b6d4' }}
      />
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl" style={{ background: 'rgba(6, 182, 212, 0.2)' }}>
            <MapPin className="w-6 h-6" style={{ color: '#06b6d4' }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">School Location Settings</h2>
            <p className="text-sm text-white/85">GPS coordinates for teacher attendance</p>
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-white/20 rounded w-3/4"></div>
            <div className="h-4 bg-white/20 rounded w-1/2"></div>
          </div>
        ) : schoolLocation ? (
          <div className="space-y-3">
            <div className="p-4 rounded-xl" style={{ background: 'rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Navigation className="w-4 h-4" style={{ color: '#06b6d4' }} />
                <span className="text-sm font-medium text-white">{schoolLocation.name}</span>
              </div>
              <div className="text-sm text-white/85 space-y-1">
                <div>📍 {schoolLocation.latitude.toFixed(6)}, {schoolLocation.longitude.toFixed(6)}</div>
                <div>📏 Radius: {schoolLocation.radius}m</div>
                <div className="text-xs text-white/70 mt-2">
                  ✅ Teachers must be within this radius to punch in/out
                </div>
              </div>
            </div>
            <GlassButton
              variant="primary"
              onClick={() => router.push('/dashboard/admin/settings/location')}
              className="w-full flex items-center justify-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              Update Location
            </GlassButton>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(255, 255, 255, 0.08)' }}>
              <p className="text-sm text-white/85 mb-3">No location configured</p>
              <GlassButton
                variant="primary"
                onClick={() => router.push('/dashboard/admin/settings/location')}
                className="w-full flex items-center justify-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                Configure Location
              </GlassButton>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

