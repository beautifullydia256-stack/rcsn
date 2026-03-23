import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSION_KEYS } from '@/lib/permissions';
import { AddStudentForm } from './AddStudentForm';

export default function AddStudentPage() {
  const navigate = useNavigate();
  const canEnrol = usePermission(PERMISSION_KEYS.studentsManage);

  useEffect(() => {
    if (!canEnrol) {
      navigate('/dashboard', { replace: true });
    }
  }, [canEnrol, navigate]);

  return (
    <AddStudentForm
      mode="page"
      onCompleted={() => navigate('/dashboard/admin/students')}
      onCancel={() => navigate('/dashboard/admin/students')}
    />
  );
}
