// Supabase Edge Function for bulk report generation
// This runs server-side and generates reports in bulk from snapshot data

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

interface GenerateReportsRequest {
  snapshotId: string;
  templateId?: string;
  classNames?: string[];
  studentIds?: string[];
}

serve(async (req) => {
  // CORS preflight: MUST be first, return 204 with headers (Supabase/browser expectation)
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request
    const { snapshotId, templateId, classNames, studentIds }: GenerateReportsRequest = await req.json();

    if (!snapshotId) {
      return new Response(
        JSON.stringify({ error: 'snapshotId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Verify snapshot exists and is locked
    const { data: snapshot, error: snapshotError } = await supabase
      .from('report_snapshots')
      .select('*')
      .eq('id', snapshotId)
      .single();

    if (snapshotError || !snapshot) {
      return new Response(
        JSON.stringify({ error: 'Snapshot not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (snapshot.status !== 'locked' && snapshot.status !== 'generated') {
      return new Response(
        JSON.stringify({ error: 'Snapshot must be locked before generation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Get snapshot data
    let snapshotDataQuery = supabase
      .from('report_snapshot_data')
      .select('*')
      .eq('snapshot_id', snapshotId);

    if (classNames && classNames.length > 0) {
      snapshotDataQuery = snapshotDataQuery.in('class_name', classNames);
    }

    const { data: allSnapshotData, error: dataError } = await snapshotDataQuery;

    if (dataError) throw dataError;

    // 3. Get unique student IDs
    let uniqueStudentIds = [...new Set(allSnapshotData?.map((d: any) => d.student_id) || [])];
    
    if (studentIds && studentIds.length > 0) {
      uniqueStudentIds = uniqueStudentIds.filter((id) => studentIds.includes(id));
    }

    // 4. Get school and exam set info
    const { data: school } = await supabase
      .from('schools')
      .select('*')
      .eq('school_id', snapshot.school_id)
      .single();

    const { data: examSet } = await supabase
      .from('exam_sets')
      .select('*')
      .eq('id', snapshot.exam_set_id)
      .single();

    // 5. Update snapshot status
    await supabase
      .from('report_snapshots')
      .update({
        status: 'generated',
        generation_started_at: new Date().toISOString(),
      })
      .eq('id', snapshotId);

    // 6. Process students in batches
    const batchSize = 50;
    const generatedReportIds: string[] = [];
    const startTime = Date.now();

    for (let i = 0; i < uniqueStudentIds.length; i += batchSize) {
      const batch = uniqueStudentIds.slice(i, i + batchSize);

      // Generate reports for batch
      const batchPromises = batch.map(async (studentId) => {
        try {
          // Get student's snapshot data
          const studentData = allSnapshotData?.filter((d: any) => d.student_id === studentId) || [];
          
          if (studentData.length === 0) {
            return null;
          }

          // Group by subject
          const results = studentData.map((d: any) => ({
            subject: d.subject,
            marks_obtained: d.marks_obtained,
            total_marks: d.total_marks,
            grade: d.grade,
            remarks: d.remarks,
            teacher_initials: d.teacher_initials,
            teacher_comment: d.teacher_comment,
          }));

          // Get first record for summary data
          const firstRecord = studentData[0];
          const frozenData = firstRecord.frozen_data || {};

          // Build report data (exact format from old system)
          const reportData = {
            school: {
              ...school,
              name: frozenData.school_name || school?.name || '',
              address: frozenData.school_address || school?.address || '',
              phone: frozenData.school_phone || school?.phone || '',
              email: frozenData.school_email || school?.email || '',
              motto: frozenData.school_motto || school?.motto || '',
              logo_url: firstRecord.school_logo_url || school?.logo_url || null,
            },
            examSet: {
              id: snapshot.exam_set_id,
              name: firstRecord.exam_set_name || examSet?.name || '',
              term: firstRecord.exam_set_term || snapshot.term,
              year: firstRecord.exam_set_year || snapshot.year,
            },
            students: [
              {
                student_id: studentId,
                name: frozenData.student_name || '',
                current_class: firstRecord.class_name,
                admission_number: frozenData.admission_number || '',
                profile_photo: firstRecord.student_photo_url || null,
                results: results,
                attendance: [],
                fees: {
                  expected: firstRecord.fees_expected || 0,
                  paid: firstRecord.fees_paid || 0,
                  balance: firstRecord.fees_balance || 0,
                },
                comments: {
                  class_teacher_text: firstRecord.class_teacher_comment || '',
                  headteacher_text: firstRecord.headteacher_comment || '',
                },
                summary: {
                  totalMarks: studentData.reduce((sum: number, d: any) => sum + (d.marks_obtained || 0), 0),
                  totalPossibleMarks: studentData.reduce((sum: number, d: any) => sum + (d.total_marks || 100), 0),
                  average: (() => {
                    const v = firstRecord.average_percentage;
                    if (v === null || v === undefined || v === '') return null;
                    const n = Number(v);
                    return Number.isNaN(n) ? null : Math.round(n);
                  })(),
                  aggregate: firstRecord.aggregate || null,
                  division: firstRecord.division || null,
                  attendancePercentage: firstRecord.attendance_percentage || null,
                  classPosition: firstRecord.position || null,
                  totalStudents: frozenData.total_students_in_class || null,
                  performanceRemark: firstRecord.division || 'N/A',
                },
              },
            ],
          };

          // Save to generated_reports cache
          const { data, error } = await supabase
            .from('generated_reports')
            .insert({
              snapshot_id: snapshotId,
              student_id: studentId,
              template_id: templateId,
              report_data: reportData,
              template_version: '1.0',
            })
            .select()
            .single();

          if (error) throw error;
          return data?.id;
        } catch (error) {
          console.error(`Failed to generate report for student ${studentId}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      generatedReportIds.push(...batchResults.filter((id) => id !== null));

      // Log progress
      console.log(`Processed ${Math.min(i + batchSize, uniqueStudentIds.length)}/${uniqueStudentIds.length} students`);
    }

    // 7. Update snapshot with completion info
    const duration = Math.floor((Date.now() - startTime) / 1000);
    await supabase
      .from('report_snapshots')
      .update({
        generation_completed_at: new Date().toISOString(),
        generation_duration_seconds: duration,
      })
      .eq('id', snapshotId);

    // 8. Return success
    return new Response(
      JSON.stringify({
        success: true,
        snapshotId,
        generatedCount: generatedReportIds.length,
        totalStudents: uniqueStudentIds.length,
        durationSeconds: duration,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Bulk generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Generation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});




