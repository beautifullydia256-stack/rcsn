import { Navigate, useParams, useSearchParams } from 'react-router-dom';

/**
 * Deep link for class-level print: `/print/class/:classId?…` → report generator with query preserved.
 * Add term/year/exam context as query params from the caller.
 */
export default function PrintClassRedirect() {
  const { classId } = useParams<{ classId: string }>();
  const [searchParams] = useSearchParams();
  if (!classId) {
    return <Navigate to="/dashboard/admin/reports/generate" replace />;
  }
  const q = searchParams.toString();
  const suffix = q ? `?${q}&classHint=${encodeURIComponent(classId)}` : `?classHint=${encodeURIComponent(classId)}`;
  return <Navigate to={`/dashboard/admin/reports/generate${suffix}`} replace />;
}
