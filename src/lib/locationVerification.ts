/**
 * Location Verification System for Teacher Attendance
 * Uses GPS coordinates and IP geolocation to verify teachers are at school
 */

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  radius?: number; // in meters, default 100m
}

export interface LocationVerificationResult {
  isAtSchool: boolean;
  method: 'gps' | 'ip' | 'none';
  distance?: number; // in meters
  coordinates?: LocationCoordinates;
  error?: string;
}

export interface SchoolLocation {
  latitude: number;
  longitude: number;
  radius: number; // in meters
  name: string;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in meters
}

/**
 * Get current GPS coordinates using browser geolocation API
 */
export async function getCurrentGPSLocation(): Promise<LocationCoordinates | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5 minutes
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          radius: 50 // 50m accuracy radius
        });
      },
      (error) => {
        console.warn('GPS location error:', error.message);
        resolve(null);
      },
      options
    );
  });
}

/**
 * Get approximate location using IP geolocation
 */
export async function getIPLocation(): Promise<LocationCoordinates | null> {
  try {
    // Using a free IP geolocation service
    const response = await fetch('https://ipapi.co/json/', {
      timeout: 5000
    } as any);
    
    if (!response.ok) {
      throw new Error('IP geolocation failed');
    }
    
    const data = await response.json();
    
    if (data.latitude && data.longitude) {
      return {
        latitude: data.latitude,
        longitude: data.longitude,
        radius: 1000 // IP geolocation is less accurate, ~1km radius
      };
    }
    
    return null;
  } catch (error) {
    console.warn('IP geolocation error:', error);
    return null;
  }
}

/**
 * Verify if current location is within school boundaries
 */
export async function verifyLocationAtSchool(
  schoolLocation: SchoolLocation
): Promise<LocationVerificationResult> {
  try {
    // Try GPS first (more accurate)
    let currentLocation = await getCurrentGPSLocation();
    let method: 'gps' | 'ip' | 'none' = 'gps';
    
    // Fallback to IP geolocation if GPS fails
    if (!currentLocation) {
      currentLocation = await getIPLocation();
      method = 'ip';
    }
    
    // If both fail
    if (!currentLocation) {
      return {
        isAtSchool: false,
        method: 'none',
        error: 'Unable to determine location'
      };
    }
    
    // Calculate distance to school
    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      schoolLocation.latitude,
      schoolLocation.longitude
    );
    
    // Check if within school radius
    const isAtSchool = distance <= schoolLocation.radius;
    
    return {
      isAtSchool,
      method,
      distance,
      coordinates: currentLocation
    };
    
  } catch (error) {
    return {
      isAtSchool: false,
      method: 'none',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Format distance for display
 */
export function formatDistance(distance: number): string {
  if (distance < 1000) {
    return `${Math.round(distance)}m`;
  } else {
    return `${(distance / 1000).toFixed(1)}km`;
  }
}

/**
 * Get location status message
 */
export function getLocationStatusMessage(result: LocationVerificationResult, schoolName: string): string {
  if (result.error) {
    return `Location verification failed: ${result.error}`;
  }
  
  if (result.isAtSchool) {
    const distance = result.distance ? formatDistance(result.distance) : '';
    const method = result.method === 'gps' ? 'GPS' : 'IP';
    return `✅ At ${schoolName} (${method}${distance ? `, ${distance} away` : ''})`;
  } else {
    const distance = result.distance ? formatDistance(result.distance) : '';
    const method = result.method === 'gps' ? 'GPS' : 'IP';
    return `❌ Not at ${schoolName} (${method}${distance ? `, ${distance} away` : ''})`;
  }
}