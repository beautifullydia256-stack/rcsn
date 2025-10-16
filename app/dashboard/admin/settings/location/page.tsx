"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface SchoolLocation {
  latitude: number;
  longitude: number;
  radius: number;
  name: string;
}

export default function SchoolLocationSettings() {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [location, setLocation] = useState<SchoolLocation>({
    latitude: 0.3476, // Default to Kampala
    longitude: 32.5825,
    radius: 200,
    name: "School Location"
  });
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return router.push('/login');
        
        const { data: userData } = await supabase
          .from('users')
          .select('school_id')
          .eq('user_id', user.id)
          .single();
        
        if (!userData?.school_id) return router.push('/login');
        
        setSchoolId(userData.school_id);
        
        // Load current school location
        const { data: schoolData } = await supabase
          .from('schools')
          .select('location_latitude, location_longitude, location_radius, location_name')
          .eq('school_id', userData.school_id)
          .single();
        
        if (schoolData) {
          setLocation({
            latitude: schoolData.location_latitude || 0.3476,
            longitude: schoolData.location_longitude || 32.5825,
            radius: schoolData.location_radius || 200,
            name: schoolData.location_name || "School Location"
          });
        }
        
        // Try to get current location
        getCurrentLocation();
        
      } catch (error) {
        console.error('Error loading school location:', error);
        setError('Failed to load school location settings');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [router]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        console.warn('Geolocation error:', error.message);
        setError('Unable to get current location. Please enter coordinates manually.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  };

  const handleSave = async () => {
    if (!schoolId) return;
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const { error } = await supabase
        .from('schools')
        .update({
          location_latitude: location.latitude,
          location_longitude: location.longitude,
          location_radius: location.radius,
          location_name: location.name
        })
        .eq('school_id', schoolId);
      
      if (error) throw error;
      
      setSuccess('School location updated successfully!');
      
      // Test the location verification
      setTimeout(() => {
        testLocationVerification();
      }, 1000);
      
    } catch (error) {
      console.error('Error saving school location:', error);
      setError('Failed to save school location');
    } finally {
      setSaving(false);
    }
  };

  const testLocationVerification = async () => {
    try {
      const response = await fetch('/api/location/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.isAtSchool) {
          setSuccess('✅ Location verification test passed! Teachers can now punch in/out from this location.');
        } else {
          setError(`❌ Location verification test failed. You are ${result.distance ? Math.round(result.distance) + 'm' : 'unknown distance'} away from the school location.`);
        }
      }
    } catch (error) {
      console.error('Error testing location verification:', error);
    }
  };

  const useCurrentLocation = () => {
    if (currentLocation) {
      setLocation(prev => ({
        ...prev,
        latitude: currentLocation.lat,
        longitude: currentLocation.lng
      }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">School Location Settings</h1>
              <p className="text-white/70 mt-1">Configure GPS coordinates for teacher attendance verification</p>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              Back
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-lg bg-green-500/20 border border-green-500/30 text-green-300">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Location Input */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Location Name
                </label>
                <input
                  type="text"
                  value={location.name}
                  onChange={(e) => setLocation(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Main Campus, School Building"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={location.latitude}
                  onChange={(e) => setLocation(prev => ({ ...prev, latitude: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.3476"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={location.longitude}
                  onChange={(e) => setLocation(prev => ({ ...prev, longitude: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="32.5825"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Radius (meters)
                </label>
                <input
                  type="number"
                  value={location.radius}
                  onChange={(e) => setLocation(prev => ({ ...prev, radius: parseInt(e.target.value) || 100 }))}
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="200"
                />
                <p className="text-xs text-white/60 mt-1">
                  Teachers must be within this distance to punch in/out
                </p>
              </div>

              {currentLocation && (
                <div className="p-3 rounded-lg bg-blue-500/20 border border-blue-500/30">
                  <p className="text-sm text-blue-300 mb-2">Current Location Detected:</p>
                  <p className="text-xs text-blue-200">
                    Lat: {currentLocation.lat.toFixed(6)}, Lng: {currentLocation.lng.toFixed(6)}
                  </p>
                  <button
                    onClick={useCurrentLocation}
                    className="mt-2 px-3 py-1 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors"
                  >
                    Use Current Location
                  </button>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
                <h3 className="text-yellow-300 font-medium mb-2">📍 How to Get Coordinates</h3>
                <ol className="text-sm text-yellow-200 space-y-1 list-decimal list-inside">
                  <li>Go to <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="underline">Google Maps</a></li>
                  <li>Search for your school location</li>
                  <li>Right-click on the school building</li>
                  <li>Copy the coordinates from the popup</li>
                  <li>Paste them here</li>
                </ol>
              </div>

              <div className="p-4 rounded-lg bg-green-500/20 border border-green-500/30">
                <h3 className="text-green-300 font-medium mb-2">✅ Recommended Settings</h3>
                <ul className="text-sm text-green-200 space-y-1">
                  <li>• <strong>Radius:</strong> 100-300 meters</li>
                  <li>• <strong>Small school:</strong> 100m radius</li>
                  <li>• <strong>Large campus:</strong> 300m radius</li>
                  <li>• <strong>Multiple buildings:</strong> 500m radius</li>
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-blue-500/20 border border-blue-500/30">
                <h3 className="text-blue-300 font-medium mb-2">🔒 Security Features</h3>
                <ul className="text-sm text-blue-200 space-y-1">
                  <li>• GPS verification (most accurate)</li>
                  <li>• IP geolocation fallback</li>
                  <li>• Prevents remote attendance</li>
                  <li>• Configurable radius per school</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Save Location'}
            </button>
            
            <button
              onClick={getCurrentLocation}
              className="px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
            >
              Detect Current Location
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
