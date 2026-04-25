import { Routes, Route } from 'react-router-dom';
import DatabaseHealthPage from './DatabaseHealthPage';
import StorageUsagePage from './StorageUsagePage';
import APIUsagePage from './APIUsagePage';
import ErrorLogsPage from './ErrorLogsPage';
import AuditLogPage from './AuditLogPage';

export default function SystemHealth() {
  return (
    <Routes>
      <Route path="database" element={<DatabaseHealthPage />} />
      <Route path="storage" element={<StorageUsagePage />} />
      <Route path="api" element={<APIUsagePage />} />
      <Route path="errors" element={<ErrorLogsPage />} />
      <Route path="audit" element={<AuditLogPage />} />
      <Route index element={<DatabaseHealthPage />} />
    </Routes>
  );
}