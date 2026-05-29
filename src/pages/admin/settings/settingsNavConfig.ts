import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Briefcase,
  Bus,
  CalendarClock,
  CalendarDays,
  FileText,
  Fingerprint,
  GraduationCap,
  LayoutGrid,
  MapPin,
  Palette,
  Receipt,
  Sparkles,
  Users,
  Wallet,
  GitBranch,
} from 'lucide-react';

export type SettingsTabKey =
  | 'subjects'
  | 'assignments'
  | 'finance'
  | 'requirements'
  | 'timetable'
  | 'terms'
  | 'exams'
  | 'branding'
  | 'biometric'
  | 'events'
  | 'streams';

export const SETTINGS_TAB_KEYS: SettingsTabKey[] = [
  'subjects',
  'assignments',
  'finance',
  'requirements',
  'timetable',
  'terms',
  'exams',
  'branding',
  'biometric',
  'events',
  'streams',
];

export function isSettingsTabKey(s: string | undefined): s is SettingsTabKey {
  return !!s && (SETTINGS_TAB_KEYS as string[]).includes(s);
}

export const SETTINGS_SECTIONS: {
  id: SettingsTabKey;
  title: string;
  description: string;
  icon: LucideIcon;
  iconBg: string;
  group: string;
}[] = [
  {
    id: 'subjects',
    title: 'Subjects per Class',
    description: 'Class subjects and UCE/UACE options',
    icon: BookOpen,
    iconBg: 'bg-sky-500/90 dark:bg-sky-600/90',
    group: 'Academic',
  },
  {
    id: 'assignments',
    title: 'Teacher ↔ Subject ↔ Class',
    description: 'Assign teachers to classes',
    icon: Users,
    iconBg: 'bg-violet-500/90 dark:bg-violet-600/90',
    group: 'Academic',
  },
  {
    id: 'timetable',
    title: 'Timetable Designer',
    description: 'Build periods and schedules',
    icon: CalendarClock,
    iconBg: 'bg-orange-500/90 dark:bg-orange-600/90',
    group: 'Academic',
  },
  {
    id: 'terms',
    title: 'Term Settings',
    description: 'Terms and academic calendar',
    icon: LayoutGrid,
    iconBg: 'bg-cyan-500/90 dark:bg-cyan-600/90',
    group: 'Academic',
  },
  {
    id: 'exams',
    title: 'Exam Sets',
    description: 'Exam seasons and sets',
    icon: GraduationCap,
    iconBg: 'bg-indigo-500/90 dark:bg-indigo-600/90',
    group: 'Academic',
  },
  {
    id: 'finance',
    title: 'Financial Settings',
    description: 'Fees and fee structure',
    icon: Wallet,
    iconBg: 'bg-emerald-500/90 dark:bg-emerald-600/90',
    group: 'School',
  },
  {
    id: 'requirements',
    title: 'School Requirements',
    description: 'Admission and school rules',
    icon: Briefcase,
    iconBg: 'bg-amber-500/90 dark:bg-amber-600/90',
    group: 'School',
  },
  {
    id: 'branding',
    title: 'School Branding',
    description: 'Logos and report appearance',
    icon: Palette,
    iconBg: 'bg-pink-500/90 dark:bg-pink-600/90',
    group: 'School',
  },
  {
    id: 'biometric',
    title: 'Biometric Attendance',
    description: 'Hikvision fingerprint terminal setup',
    icon: Fingerprint,
    iconBg: 'bg-teal-500/90 dark:bg-teal-600/90',
    group: 'School',
  },
  {
    id: 'events',
    title: 'Upcoming Events',
    description: 'Exams, holidays and school events',
    icon: CalendarDays,
    iconBg: 'bg-green-500/90 dark:bg-green-600/90',
    group: 'School',
  },
  {
    id: 'streams',
    title: 'Class Streams',
    description: 'Split a class into streams (e.g. P7 West / East)',
    icon: GitBranch,
    iconBg: 'bg-purple-500/90 dark:bg-purple-600/90',
    group: 'School',
  },
];

export type SettingsExtraNavItem = {
  kind: 'route';
  to: string;
  title: string;
  description: string;
  icon: LucideIcon;
  iconBg: string;
  group: string;
};

export const SETTINGS_EXTRA_NAV: SettingsExtraNavItem[] = [
  {
    kind: 'route',
    to: '/dashboard/admin/settings/location',
    title: 'Location',
    description: 'School address and map',
    icon: MapPin,
    iconBg: 'bg-red-500/90 dark:bg-red-600/90',
    group: 'More',
  },
  {
    kind: 'route',
    to: '/dashboard/admin/settings/classes',
    title: 'Classes',
    description: 'Browse and edit class details',
    icon: Bus,
    iconBg: 'bg-blue-500/90 dark:bg-blue-600/90',
    group: 'More',
  },
  {
    kind: 'route',
    to: '/dashboard/admin/exam-sets',
    title: 'Exam Sets (hub)',
    description: 'Full exam sets workspace',
    icon: Sparkles,
    iconBg: 'bg-fuchsia-500/90 dark:bg-fuchsia-600/90',
    group: 'Shortcuts',
  },
  {
    kind: 'route',
    to: '/dashboard/admin/attendance',
    title: 'Attendance Records',
    description: 'View attendance',
    icon: Receipt,
    iconBg: 'bg-teal-500/90 dark:bg-teal-600/90',
    group: 'Shortcuts',
  },
  {
    kind: 'route',
    to: '/dashboard/admin/finance/outstanding',
    title: 'Finance Records',
    description: 'Outstanding fees',
    icon: Wallet,
    iconBg: 'bg-lime-500/90 dark:bg-lime-600/90',
    group: 'Shortcuts',
  },
  {
    kind: 'route',
    to: '/dashboard/admin/reports',
    title: 'Report Records',
    description: 'Reports overview',
    icon: FileText,
    iconBg: 'bg-slate-500/90 dark:bg-slate-600/90',
    group: 'Shortcuts',
  },
];

export const SETTINGS_LAST_SECTION_KEY = 'admin-settings-section';
