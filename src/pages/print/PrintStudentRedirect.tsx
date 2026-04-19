import { Navigate, useParams } from 'react-router-dom';

/** Puppeteer / deep link: `/print/student/:studentId` → student profile. */
export default function PrintStudentRedirect() {
  const { studentId } = useParams<{ studentId: string }>();
  if (!studentId) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to={`/dashboard/admin/students/${encodeURIComponent(studentId)}`} replace />;
}
