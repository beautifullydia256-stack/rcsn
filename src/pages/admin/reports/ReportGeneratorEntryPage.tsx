import { Navigate } from 'react-router-dom';

/**
 * Report Generator Entry for Rakai Community School of Nursing (Tertiary Institution)
 * Directly routes to Tertiary Report Generator.
 */
export default function ReportGeneratorEntryPage() {
  return <Navigate to="/dashboard/admin/reports/generate-tertiary" replace />;
}
