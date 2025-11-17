"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { PrimaryExamResults } from "./components/PrimaryExamResults";
import { SecondaryExamResults } from "./components/SecondaryExamResults";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

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
      <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
        <Sidebar />
        <div className="flex-1 flex flex-col lg:ml-72">
          <Navbar onSearch={() => {}} />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-gray-600 dark:text-gray-400">Loading...</div>
          </main>
        </div>
      </div>
    );
  }

  if (!schoolType) {
    return (
      <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
        <Sidebar />
        <div className="flex-1 flex flex-col lg:ml-72">
          <Navbar onSearch={() => {}} />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-gray-600 dark:text-gray-400">Unable to determine school type</div>
          </main>
        </div>
      </div>
    );
  }

  // Route to appropriate component based on school type
  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col lg:ml-72">
        <Navbar onSearch={() => {}} />
        <main className="flex-1">
          {schoolType === 'Nursery/Primary' ? <PrimaryExamResults /> : <SecondaryExamResults />}
        </main>
      </div>
    </div>
  );
}
