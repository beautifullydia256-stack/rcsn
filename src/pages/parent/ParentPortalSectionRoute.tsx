import { useLocation } from 'react-router-dom';
import ParentPortalSection from './ParentPortalSection';

const SECTION_TITLES: Record<string, string> = {
  notices: 'School Notices',
  performance: 'Performance',
  attendance: 'Attendance',
  timetable: 'Timetable',
  exams: 'Exams & Results',
  reports: 'Report Cards',
  fees: 'Fees & Payments',
  receipts: 'Receipts',
  profile: 'My Profile',
  settings: 'Settings',
};

/** Resolves the current path to a parent portal section title and renders the standard section shell. */
export default function ParentPortalSectionRoute() {
  const seg = useLocation()
    .pathname.split('/')
    .filter(Boolean)
    .pop();
  const title = (seg && SECTION_TITLES[seg]) || 'Parent portal';
  return <ParentPortalSection title={title} />;
}
