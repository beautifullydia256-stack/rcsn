'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/src/lib/supabase';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import IDCard from '@/src/pages/admin/identity/components/IDCard';

export default function AdminStudentIdCardPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = typeof params?.student_id === 'string' ? params.student_id : Array.isArray(params?.student_id) ? params?.student_id[0] : '';
  const cardRef = useRef<HTMLDivElement>(null);
  const [student, setStudent] = useState<Record<string, unknown> | null>(null);
  const [school, setSchool] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!studentId) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { data: urow } = await supabase.from('users').select('school_id').eq('user_id', user.id).single();
      if (!urow?.school_id) {
        setLoading(false);
        return;
      }
      const { data: schoolData } = await supabase.from('schools').select('*').eq('school_id', urow.school_id).single();
      setSchool(schoolData as Record<string, unknown>);
      const { data: studentData } = await supabase.from('students').select('*').eq('student_id', studentId).single();
      setStudent(studentData as Record<string, unknown>);
      setLoading(false);
    };
    run();
  }, [studentId, router]);

  const handleDownloadPNG = async () => {
    if (!cardRef.current || !student) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, { scale: 2, backgroundColor: '#ffffff' });
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${String(student.name || 'student')}_ID_Card.png`;
        a.click();
        window.URL.revokeObjectURL(url);
      });
    } catch {
      alert('Failed to download PNG.');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading…</div>;
  }

  if (!student || !school) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-8 text-center">
        <p className="mb-4 text-white/70">Student not found</p>
        <Link href="/dashboard/admin/identity" className="text-emerald-400 underline">
          Back to list
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6 print:bg-white">
      <div className="max-w-4xl mx-auto space-y-4 print:hidden">
        <div className="flex flex-wrap gap-3 justify-between items-center bg-white rounded-xl border p-4 shadow-sm">
          <Link
            href="/dashboard/admin/identity"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-800 hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDownloadPNG}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-800 hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
              PNG
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>
      </div>
      <div className="flex justify-center py-6">
        <div ref={cardRef} className="inline-block">
          <IDCard student={student} school={school} />
        </div>
      </div>
    </div>
  );
}
