"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { PrimaryExamResults } from "./components/PrimaryExamResults";
import { SecondaryExamResults } from "./components/SecondaryExamResults";

export default function TeacherExamResultsPage() {
  const router = useRouter();
  const [schoolType, setSchoolType] = useState<'Nursery/Primary' | 'Secondary' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const detectSchoolType = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        // Get school_id from user metadata instead of users table to avoid 406 errors
        const userMetadata = (user as any).user_metadata || (user as any).raw_user_meta_data || {};
        const schoolId = userMetadata.school_id;
        
        if (!schoolId) {
          console.error('No school_id found in user metadata');
          setLoading(false);
          return;
        }

        const { data: schoolData } = await supabase
          .from('schools')
          .select('type')
          .eq('school_id', schoolId)
          .single();

        if (schoolData) {
          setSchoolType(schoolData.type as 'Nursery/Primary' | 'Secondary');
        }
      } catch (error) {
        console.error('Error detecting school type:', error);
      } finally {
        setLoading(false);
      }
    };

    detectSchoolType();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
        <div className="relative flex items-center justify-center min-h-screen">
          <div className="text-white text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  if (!schoolType) {
    return (
      <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
        <div className="relative flex items-center justify-center min-h-screen">
          <div className="text-white text-lg">Unable to determine school type</div>
        </div>
      </div>
    );
  }

  // Route to appropriate component based on school type
  return schoolType === 'Nursery/Primary' ? <PrimaryExamResults /> : <SecondaryExamResults />;
}
