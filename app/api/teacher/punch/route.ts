import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/src/lib/supabase';

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

export async function POST(req: NextRequest) {
  try {
    const { action, schoolId, teacherId, latitude, longitude } = await req.json();

    if (!action || !schoolId || !teacherId) {
      return NextResponse.json({ error: 'action, schoolId, and teacherId are required' }, { status: 400 });
    }
    if (action !== 'in' && action !== 'out') {
      return NextResponse.json({ error: 'action must be "in" or "out"' }, { status: 400 });
    }

    // Verify GPS against school location
    const { data: school, error: schoolErr } = await supabaseAdmin
      .from('schools')
      .select('location_latitude, location_longitude, location_radius, school_name')
      .eq('school_id', schoolId)
      .single();

    if (schoolErr || !school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    if (!school.location_latitude || !school.location_longitude) {
      return NextResponse.json({ error: 'School location not configured. Ask your administrator to set the school GPS coordinates in Settings.' }, { status: 422 });
    }

    const radius = school.location_radius ?? 100;
    let isAtSchool = false;
    let distance: number | null = null;

    if (latitude != null && longitude != null) {
      distance = haversineMeters(school.location_latitude, school.location_longitude, latitude, longitude);
      isAtSchool = distance <= radius;
    }

    if (!isAtSchool) {
      const distanceText = distance != null ? ` (you are ${Math.round(distance)}m away, limit is ${radius}m)` : '';
      return NextResponse.json({
        error: `You must be at school to punch ${action}${distanceText}. Please ensure location access is enabled.`,
        distance,
        radius,
        isAtSchool: false,
      }, { status: 403 });
    }

    const today = new Date().toISOString().split('T')[0];
    const nowTs = new Date().toISOString();

    // Load today's log row
    const { data: existing } = await supabaseAdmin
      .from('teacher_attendance_log')
      .select('id, punch_in_time, punch_out_time')
      .eq('teacher_id', teacherId)
      .eq('date', today)
      .maybeSingle();

    if (action === 'in') {
      if (existing?.punch_in_time) {
        return NextResponse.json({
          error: 'You have already punched in today.',
          punchInTime: existing.punch_in_time,
        }, { status: 409 });
      }

      // Determine late status — school day starts at 7:30 AM by convention
      const hour = new Date().getHours();
      const minute = new Date().getMinutes();
      const isLate = hour > 7 || (hour === 7 && minute > 30);
      const status = isLate ? 'late' : 'present';

      if (existing) {
        await supabaseAdmin
          .from('teacher_attendance_log')
          .update({ punch_in_time: nowTs, punch_in_lat: latitude, punch_in_lng: longitude, status, updated_at: nowTs })
          .eq('id', existing.id);
      } else {
        await supabaseAdmin
          .from('teacher_attendance_log')
          .insert({ school_id: schoolId, teacher_id: teacherId, date: today, punch_in_time: nowTs, punch_in_lat: latitude, punch_in_lng: longitude, status });
      }

      return NextResponse.json({ success: true, action: 'in', punchTime: nowTs, status, distance: Math.round(distance ?? 0) });
    }

    // action === 'out'
    if (!existing?.punch_in_time) {
      return NextResponse.json({ error: 'You must punch in before you can punch out.' }, { status: 409 });
    }
    if (existing?.punch_out_time) {
      return NextResponse.json({ error: 'You have already punched out today.', punchOutTime: existing.punch_out_time }, { status: 409 });
    }

    await supabaseAdmin
      .from('teacher_attendance_log')
      .update({ punch_out_time: nowTs, punch_out_lat: latitude, punch_out_lng: longitude, updated_at: nowTs })
      .eq('id', existing.id);

    return NextResponse.json({ success: true, action: 'out', punchTime: nowTs, distance: Math.round(distance ?? 0) });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get('teacherId');
    const schoolId = searchParams.get('schoolId');

    if (!teacherId || !schoolId) {
      return NextResponse.json({ error: 'teacherId and schoolId required' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];

    const { data } = await supabaseAdmin
      .from('teacher_attendance_log')
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
