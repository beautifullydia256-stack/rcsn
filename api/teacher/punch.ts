import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default async function handler(request: NextRequest) {
  if (request.method === 'GET') {
    try {
      const supabase = getSupabase();
      const { searchParams } = new URL(request.url);
      const teacherId = searchParams.get('teacherId');
      const schoolId = searchParams.get('schoolId');

      if (!teacherId || !schoolId) {
        return NextResponse.json({ error: 'teacherId and schoolId required' }, { status: 400 });
      }

      const today = new Date().toISOString().split('T')[0];

      const { data } = await supabase
        .from('teacher_attendance_logs')
        .select('punch_in_time, punch_out_time, status')
        .eq('teacher_id', teacherId)
        .eq('date', today)
        .maybeSingle();

      return NextResponse.json({ today: data ?? null });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Internal server error';
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  if (request.method === 'POST') {
    try {
      const supabase = getSupabase();
      const { action, schoolId, teacherId, latitude, longitude } = await request.json();

      if (!action || !schoolId || !teacherId) {
        return NextResponse.json({ error: 'action, schoolId, and teacherId are required' }, { status: 400 });
      }
      if (action !== 'in' && action !== 'out') {
        return NextResponse.json({ error: 'action must be "in" or "out"' }, { status: 400 });
      }

      // Fetch school boundary from Settings → Location
      const { data: school, error: schoolErr } = await supabase
        .from('schools')
        .select('location_latitude, location_longitude, location_radius, school_name')
        .eq('school_id', schoolId)
        .single();

      if (schoolErr || !school) {
        return NextResponse.json({ error: 'School not found' }, { status: 404 });
      }

      if (!school.location_latitude || !school.location_longitude) {
        return NextResponse.json(
          { error: 'School location not configured. Ask your administrator to set the GPS coordinates in Settings → Location.' },
          { status: 422 }
        );
      }

      const radius = school.location_radius ?? 100;
      let isAtSchool = false;
      let distance: number | null = null;

      if (latitude != null && longitude != null) {
        distance = haversineMeters(
          school.location_latitude,
          school.location_longitude,
          latitude,
          longitude
        );
        isAtSchool = distance <= radius;
      }

      if (!isAtSchool) {
        const distanceText =
          distance != null
            ? ` (you are ${Math.round(distance)}m away, limit is ${radius}m)`
            : '';
        return NextResponse.json(
          {
            error: `You must be at school to punch ${action}${distanceText}. Please ensure location access is enabled.`,
            distance,
            radius,
            isAtSchool: false,
          },
          { status: 403 }
        );
      }

      const today = new Date().toISOString().split('T')[0];
      const nowTs = new Date().toISOString();

      const { data: existing } = await supabase
        .from('teacher_attendance_logs')
        .select('id, punch_in_time, punch_out_time')
        .eq('teacher_id', teacherId)
        .eq('date', today)
        .maybeSingle();

      if (action === 'in') {
        if (existing?.punch_in_time) {
          return NextResponse.json(
            { error: 'You have already punched in today.', punchInTime: existing.punch_in_time },
            { status: 409 }
          );
        }

        const hour = new Date().getHours();
        const minute = new Date().getMinutes();
        const isLate = hour > 7 || (hour === 7 && minute > 30);
        const status = isLate ? 'late' : 'present';

        if (existing) {
          const { error: updErr } = await supabase
            .from('teacher_attendance_logs')
            .update({ punch_in_time: nowTs, punch_in_lat: latitude, punch_in_lng: longitude, status, updated_at: nowTs })
            .eq('id', existing.id);
          if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });
        } else {
          const { error: insErr } = await supabase
            .from('teacher_attendance_logs')
            .insert({ school_id: schoolId, teacher_id: teacherId, date: today, punch_in_time: nowTs, punch_in_lat: latitude, punch_in_lng: longitude, status });
          if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          action: 'in',
          punchTime: nowTs,
          status,
          distance: Math.round(distance ?? 0),
        });
      }

      // action === 'out'
      if (!existing?.punch_in_time) {
        return NextResponse.json({ error: 'You must punch in before you can punch out.' }, { status: 409 });
      }
      if (existing?.punch_out_time) {
        return NextResponse.json(
          { error: 'You have already punched out today.', punchOutTime: existing.punch_out_time },
          { status: 409 }
        );
      }

      const { error: outErr } = await supabase
        .from('teacher_attendance_logs')
        .update({ punch_out_time: nowTs, punch_out_lat: latitude, punch_out_lng: longitude, updated_at: nowTs })
        .eq('id', existing.id);
      if (outErr) return NextResponse.json({ error: outErr.message }, { status: 400 });

      return NextResponse.json({
        success: true,
        action: 'out',
        punchTime: nowTs,
        distance: Math.round(distance ?? 0),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Internal server error';
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
