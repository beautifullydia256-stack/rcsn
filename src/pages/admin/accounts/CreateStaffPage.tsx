import { Navigate } from 'react-router-dom';

/** Logins are created from the roster via Send invitations only. */
export default function CreateStaffPage() {
  return <Navigate to="/dashboard/admin/accounts/invite" replace />;
}
