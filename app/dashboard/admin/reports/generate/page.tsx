"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Report generation has moved to the SPA snapshot-based UI.
 * Redirect to the new snapshot manager.
 */
export default function GenerateReportsPage() {
  const router = useRouter();

  useEffect(() => {
    // SPA route for snapshot-based report UI
    router.replace("/dashboard/admin/reports/snapshots");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <p className="text-muted-foreground">Redirecting to report snapshots...</p>
    </div>
  );
}
