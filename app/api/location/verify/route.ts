import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase';
import { verifyLocationAtSchool, type SchoolLocation } from '@/src/lib/locationVerification';

export async function POST(req: NextRequest) {
  try {
    const { schoolId, latitude, longitude } = await req.json();
    
    if (!schoolId) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
    }

    // Get school location from database
    const { data: schoolData, error: schoolError } = await supabase
      .from('schools')
      .select('location_latitude, location_longitude, location_radius, location_name, name')
      .eq('school_id', schoolId)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    if (!schoolData.location_latitude || !schoolData.location_longitude) {
      return NextResponse.json({ 
        error: 'School location not configured. Please set GPS coordinates in admin settings.',
        isAtSchool: false 
      }, { status: 400 });
    }

    const schoolLocation: SchoolLocation = {
      latitude: schoolData.location_latitude,
      longitude: schoolData.location_longitude,
      radius: schoolData.location_radius || 200,
      name: schoolData.location_name || schoolData.name
    };

    // If coordinates are provided, use them directly
    if (latitude && longitude) {
      const distance = Math.sqrt(
        Math.pow(latitude - schoolLocation.latitude, 2) + 
        Math.pow(longitude - schoolLocation.longitude, 2)
      ) * 111000; // Rough conversion to meters

      const isAtSchool = distance <= schoolLocation.radius;
      
      return NextResponse.json({
        isAtSchool,
        method: 'gps',
        distance: Math.round(distance),
        schoolLocation,
        message: isAtSchool 
          ? `✅ You are at ${schoolLocation.name}` 
          : `❌ You are ${Math.round(distance)}m away from ${schoolLocation.name}`
      });
    }

    // Otherwise, use the location verification system
    const result = await verifyLocationAtSchool(schoolLocation);
    
    return NextResponse.json({
      ...result,
      schoolLocation,
      message: result.isAtSchool 
        ? `✅ You are at ${schoolLocation.name}` 
        : `❌ You are ${result.distance ? Math.round(result.distance) + 'm' : 'unknown distance'} away from ${schoolLocation.name}`
    });

  } catch (error) {
    console.error('Location verification error:', error);
    return NextResponse.json({ 
      error: 'Location verification failed',
      isAtSchool: false 
    }, { status: 500 });
  }
}
