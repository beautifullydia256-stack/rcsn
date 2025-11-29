"use client";

import { useEffect, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";

// Lazy load heavy report generator components - these are 4000+ lines each
const PrimaryReportGenerator = dynamic(
  () => import("./components/PrimaryReportGenerator").then(mod => ({ default: mod.PrimaryReportGenerator })),
  { 
    loading: () => <ReportLoadingSkeleton />,
    ssr: false // Disable SSR for faster client-side load
  }
);

const SecondaryReportGenerator = dynamic(
  () => import("./components/SecondaryReportGenerator").then(mod => ({ default: mod.SecondaryReportGenerator })),
  { 
    loading: () => <ReportLoadingSkeleton />,
    ssr: false
  }
);

// Loading skeleton that matches report generator UI
function ReportLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-64 bg-white/10 rounded mb-2" />
          <div className="h-4 w-48 bg-white/10 rounded" />
        </div>
        <div className="h-10 w-32 bg-white/10 rounded" />
      </div>
      
      {/* Form card skeleton */}
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <div className="h-4 w-20 bg-white/10 rounded mb-2" />
            <div className="h-10 w-full bg-white/10 rounded" />
          </div>
          <div>
            <div className="h-4 w-24 bg-white/10 rounded mb-2" />
            <div className="h-10 w-full bg-white/10 rounded" />
          </div>
          <div>
            <div className="h-4 w-16 bg-white/10 rounded mb-2" />
            <div className="h-10 w-full bg-white/10 rounded" />
          </div>
        </div>
        <div className="h-12 w-full bg-purple-600/30 rounded-lg" />
      </div>
      
      {/* Results area skeleton */}
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
        <div className="h-5 w-32 bg-white/10 rounded mb-4" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
              <div className="w-10 h-10 bg-white/10 rounded-full" />
              <div className="flex-1">
                <div className="h-4 w-32 bg-white/10 rounded mb-1" />
                <div className="h-3 w-24 bg-white/10 rounded" />
              </div>
              <div className="h-8 w-20 bg-white/10 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Quick loading state for initial auth check
function QuickLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-white/20 border-t-purple-500 rounded-full animate-spin" />
        <p className="text-white/70 text-sm">Loading reports...</p>
      </div>
    </div>
  );
}

export default function GenerateReportsPage() {
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

        const { data: userRow } = await supabase
          .from('users')
          .select('school_id')
          .eq('user_id', user.id)
          .single();

        if (!userRow?.school_id) {
          console.error('No school_id found for user');
          setLoading(false);
          return;
        }

        const { data: schoolData } = await supabase
          .from('schools')
          .select('type')
          .eq('school_id', userRow.school_id)
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

  // Show quick loader during auth check
  if (loading) {
    return <QuickLoader />;
  }

  if (!schoolType) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-white/70 text-lg mb-2">Unable to determine school type</div>
          <p className="text-white/50 text-sm">Please contact support if this persists.</p>
        </div>
      </div>
    );
  }

  // Lazy load the appropriate report generator with Suspense
  return (
    <Suspense fallback={<ReportLoadingSkeleton />}>
      {schoolType === 'Nursery/Primary' ? <PrimaryReportGenerator /> : <SecondaryReportGenerator />}
    </Suspense>
  );
}
