import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/src/lib/supabase';
import { haversineDistance, getIpGeolocation } from '@/src/lib/locationVerification';

export async function POST(req: NextRequest) {
  try {
    const { schoolId, latitude, longitude } = await req.json();

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
    }

    console.log('Location verification request for school_id:', schoolId);

    // Get school location data - use admin client to bypass RLS
    const { data: schoolData, error: schoolError } = await supabaseAdmin
      .from('schools')
      .select('location_latitude, location_longitude, location_radius, location_name')
      .eq('school_id', schoolId)
      .single();

    if (schoolError) {
      console.error('School location query error:', schoolError);
      return NextResponse.json({ 
        error: `Database error: ${schoolError.message}`,
        details: schoolError 
      }, { status: 500 });
    }

    if (!schoolData) {
      console.log('School not found for school_id:', schoolId);
      return NextResponse.json({ 
        error: 'School not found',
        schoolId 
      }, { status: 404 });
    }

    if (!schoolData.location_latitude || !schoolData.location_longitude) {
      return NextResponse.json({ 
        error: 'School location not configured',
        schoolId,
        schoolData 
      }, { status: 404 });
    }

    const schoolLat = schoolData.location_latitude;
    const schoolLon = schoolData.location_longitude;
    const schoolRadius = schoolData.location_radius || 100;

    let isAtSchool = false;
    let distance = null;
    let method = 'none';
    let verificationError = null;

    if (latitude && longitude) {
      // Use GPS coordinates if provided
      distance = haversineDistance(schoolLat, schoolLon, latitude, longitude);
      isAtSchool = distance <= schoolRadius;
      method = 'gps';
    } else {
      // Fallback to IP geolocation
      const ipGeo = await getIpGeolocation();
      if (ipGeo && ipGeo.latitude && ipGeo.longitude) {
        distance = haversineDistance(schoolLat, schoolLon, ipGeo.latitude, ipGeo.longitude);
        isAtSchool = distance <= schoolRadius;
        method = 'ip';
      } else {
        verificationError = ipGeo?.error || 'Unable to get location from IP';
      }
    }

    return NextResponse.json({
      isAtSchool,
      distance,
      method,
      error: verificationError
    });

  } catch (error: any) {
    console.error('Location verification API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}