import { AddTeacherForm } from './AddTeacherForm';

/** Full-page entry (e.g. teacher route); list view uses the modal on DesignTeachersPage with ?add=1. */
export default function AddTeacherPage() {
  return <AddTeacherForm mode="page" />;
}
