import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSION_KEYS } from '@/lib/permissions';
import { AddStudentForm } from '@/pages/admin/students/AddStudentForm';

export default function SecretaryAddStudentPage() {
  const navigate = useNavigate();
  const canEnrol = usePermission(PERMISSION_KEYS.studentsManage);

  useEffect(() => {
    if (!canEnrol) {
      navigate('/dashboard/secretary', { replace: true });
    }
  }, [canEnrol, navigate]);

  return (
    <AddStudentForm
      mode="page"
      onCompleted={() => navigate('/dashboard/secretary/students')}
    />
  );
}
