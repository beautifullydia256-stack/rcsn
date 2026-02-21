import AdminPageWrapper from '@/components/layout/AdminPageWrapper';
import { Users } from 'lucide-react';

/**
 * School staff – roster of staff members (teachers, head teacher, accountant, librarian, etc.).
 * Content and behaviour to be defined (e.g. list with details when selected).
 * User logins are managed under User Management, not here.
 */
export default function StaffPage() {
  return (
    <AdminPageWrapper
      title="Staff"
      subtitle="School staff members. To create or manage user logins, go to User Management."
    >
      <div className="ac-glass-card rounded-[18px] p-8 flex flex-col items-center justify-center min-h-[280px] text-center">
        <div className="rounded-full bg-white/10 p-4 mb-4">
          <Users className="h-10 w-10 ac-text-secondary" />
        </div>
        <h2 className="ac-text-primary text-lg font-semibold mb-2">Staff roster</h2>
        <p className="ac-text-secondary text-sm max-w-md">
          This page will show your school staff members. You can add the exact content and behaviour you want here.
        </p>
      </div>
    </AdminPageWrapper>
  );
}
