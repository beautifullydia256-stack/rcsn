import { Routes, Route } from 'react-router-dom';
import AllSchoolsPage from './schools/AllSchoolsPage';
import AddSchoolPage from './schools/AddSchoolPage';
import SchoolRequestsPage from './schools/SchoolRequestsPage';
import SuspendedSchoolsPage from './schools/SuspendedSchoolsPage';
import SchoolDetailPage from './schools/SchoolDetailPage';

export default function SchoolsManagement() {
  return (
    <Routes>
      <Route index element={<AllSchoolsPage />} />
      <Route path="add" element={<AddSchoolPage />} />
      <Route path="requests" element={<SchoolRequestsPage />} />
      <Route path="suspended" element={<SuspendedSchoolsPage />} />
      <Route path=":schoolId" element={<SchoolDetailPage />} />
    </Routes>
  );
}