import { useNavigate } from 'react-router-dom';
import { AddParentForm } from './AddParentForm';

export default function AddParentPage() {
  const navigate = useNavigate();

  return (
    <AddParentForm
      mode="page"
      onCompleted={() => navigate('/dashboard/admin/parents')}
      onCancel={() => navigate('/dashboard/admin/parents')}
    />
  );
}
