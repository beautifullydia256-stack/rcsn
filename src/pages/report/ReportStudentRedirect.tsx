import { Navigate, useParams } from 'react-router-dom';

/**
 * Stable URL for print/Puppeteer: `/report/student/:studentId` → student profile (requires auth).
 */
export default function ReportStudentRedirect() {
  const { studentId } = useParams<{ studentId: string }>();
  if (!studentId) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to={`/dashboard/admin/students/${encodeURIComponent(studentId)}`} replace />;
}
