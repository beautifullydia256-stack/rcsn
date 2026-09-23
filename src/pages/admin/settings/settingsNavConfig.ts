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

export function getSettingsSections(isTertiary = false) {
  return SETTINGS_SECTIONS.map((sec) => {
    switch (sec.id) {
      case 'subjects':
        return {
          ...sec,
          title: isTertiary ? 'Course Units per Programme' : 'Subjects per Class',
          description: isTertiary
            ? 'Curriculum course units and credit units (CU)'
            : 'Class subjects and UCE/UACE options',
        };
      case 'assignments':
        return {
          ...sec,
          title: isTertiary ? 'Tutor ↔ Course Unit ↔ Programme' : 'Teacher ↔ Subject ↔ Class',
          description: isTertiary ? 'Assign tutors to course units' : 'Assign teachers to classes',
        };
      case 'timetable':
        return {
          ...sec,
          title: isTertiary ? 'Timetable & Clinical Schedule' : 'Timetable Designer',
          description: isTertiary
            ? 'Build lecture periods and ward rotation schedules'
            : 'Build periods and schedules',
        };
      case 'terms':
        return {
          ...sec,
          title: isTertiary ? 'Semester Settings' : 'Term Settings',
          description: isTertiary ? 'Semesters and academic calendar' : 'Terms and academic calendar',
        };
      case 'exams':
        return {
          ...sec,
          title: isTertiary ? 'Assessment & Examination Types' : 'Exam Sets',
          description: isTertiary
            ? 'Continuous assessment (CAT), internal semester, OSCE & UNMEB sets'
            : 'Exam seasons and sets',
        };
      case 'streams':
        return {
          ...sec,
          title: isTertiary ? 'Intakes & Sets' : 'Class Streams',
          description: isTertiary
            ? 'Manage student cohorts (e.g. Set 22, Set 23, March/Sept Intakes)'
            : 'Split a class into streams (e.g. P7 West / East)',
        };
      default:
        return sec;
    }
  });
}

export type SettingsExtraNavItem = {
  kind: 'route';
  to: string;
  title: string;
  description: string;
  icon: LucideIcon;
  iconBg: string;
  group: string;
};

export function getSettingsExtraNav(isTertiary = false): SettingsExtraNavItem[] {
  return [
    {
      kind: 'route',
      to: '/dashboard/admin/settings/location',
      title: 'Location',
      description: 'Campus address and map',
      icon: MapPin,
      iconBg: 'bg-red-500/90 dark:bg-red-600/90',
      group: 'More',
    },
    {
      kind: 'route',
      to: '/dashboard/admin/settings/classes',
      title: isTertiary ? 'Courses & Sets' : 'Classes',
      description: isTertiary ? 'Browse and edit course and cohort details' : 'Browse and edit class details',
      icon: Bus,
      iconBg: 'bg-blue-500/90 dark:bg-blue-600/90',
      group: 'More',
    },
    {
      kind: 'route',
      to: '/dashboard/admin/exam-sets',
      title: isTertiary ? 'Assessment Hub' : 'Exam Sets (hub)',
      description: isTertiary ? 'Continuous assessment & board exams workspace' : 'Full exam sets workspace',
      icon: Sparkles,
      iconBg: 'bg-fuchsia-500/90 dark:bg-fuchsia-600/90',
      group: 'Shortcuts',
    },
    {
      kind: 'route',
      to: '/dashboard/admin/attendance',
      title: 'Attendance Records',
      description: isTertiary ? 'View trainee & clinical attendance' : 'View attendance',
      icon: Receipt,
      iconBg: 'bg-teal-500/90 dark:bg-teal-600/90',
      group: 'Shortcuts',
    },
    {
      kind: 'route',
      to: '/dashboard/admin/finance/outstanding',
      title: 'Finance Records',
      description: isTertiary ? 'Outstanding tuition & intake fees' : 'Outstanding fees',
      icon: Wallet,
      iconBg: 'bg-lime-500/90 dark:bg-lime-600/90',
      group: 'Shortcuts',
    },
    {
      kind: 'route',
      to: '/dashboard/admin/reports',
      title: isTertiary ? 'Academic Records & Slips' : 'Report Records',
      description: isTertiary ? 'Result slips and provisional transcripts' : 'Reports overview',
      icon: FileText,
      iconBg: 'bg-slate-500/90 dark:bg-slate-600/90',
      group: 'Shortcuts',
    },
  ];
}

export const SETTINGS_EXTRA_NAV: SettingsExtraNavItem[] = getSettingsExtraNav(false);

export const SETTINGS_LAST_SECTION_KEY = 'admin-settings-section';

