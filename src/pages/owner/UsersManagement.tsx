import { Routes, Route } from 'react-router-dom';
import AllUsersPage from './AllUsersPage';
import AdminsPage from './AdminsPage';
import UserRolesPage from './UserRolesPage';
import LoginActivityPage from './LoginActivityPage';

export default function UsersManagement() {
  return (
    <Routes>
      <Route index element={<AllUsersPage />} />
      <Route path="admins" element={<AdminsPage />} />
      <Route path="roles" element={<UserRolesPage />} />
      <Route path="activity" element={<LoginActivityPage />} />
    </Routes>
  );
}