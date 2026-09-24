import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';
import {
  Compass,
  LayoutDashboard,
  GraduationCap,
  Users,
  BookOpen,
  UserCheck,
  CircleDollarSign,
  ClipboardList,
  Building2,
  TestTube,
  HeartPulse,
  Landmark,
  Settings,
  ArrowUpRight,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Filter,
  Check,
  AlertTriangle
} from 'lucide-react';

interface SubPageItem {
  name: string;
  path: string;
  description: string;
  tag?: string;
}

interface PortalRole {
  id: string;
  name: string;
  secondaryTitle?: string;
  category: 'Academic' | 'Leadership' | 'Student & Parent' | 'Finance' | 'Administrative' | 'Specialized' | 'Platform';
  path: string;
  icon: any;
  color: string;
  description: string;
  subpages: SubPageItem[];
}

export const SYSTEM_PORTALS: PortalRole[] = [
  {
    id: 'admin',
    name: 'School Administrator',
    secondaryTitle: 'Central School Command',
    category: 'Leadership',
    path: '/dashboard/admin',
    icon: LayoutDashboard,
    color: '#3DE8A0',
    description: 'Full institutional management for students, staff, academics, classes, exams, timetable, and school settings.',
    subpages: [
      { name: 'Admin Overview', path: '/dashboard/admin', description: 'Real-time KPIs, attendance gauge, fees ratio, streams' },
      { name: 'Students Directory', path: '/dashboard/admin/students', description: 'All, active, warned, suspended, deactivated records' },
      { name: 'Fee Sync Engine', path: '/dashboard/admin/students/fee-sync', description: 'Sync fee requirements with enrolled student cohort' },
      { name: 'Stream Allocation', path: '/dashboard/admin/students/stream-allocation', description: 'Allocate students to streams or programmes' },
      { name: 'Teachers Directory', path: '/dashboard/admin/teachers', description: 'Teacher directory, profiles, qualifications' },
      { name: 'Parents Management', path: '/dashboard/admin/parents', description: 'Guardians, contacts, outstanding balances' },
      { name: 'Staff & Employees', path: '/dashboard/admin/staff', description: 'Non-teaching staff, security, maintenance roster' },
      { name: 'User Accounts & Roles', path: '/dashboard/admin/accounts', description: 'Manage login credentials and invitations' },
      { name: 'Access Permissions', path: '/dashboard/admin/permissions', description: 'Delegated module permissions and controls' },
      { name: 'Classes & Streams', path: '/dashboard/admin/settings/classes', description: 'Class structures, streams, programmes' },
      { name: 'Workforce / HR Hub', path: '/dashboard/admin/workforce', description: 'Staff leave, recruitment, onboarding, payroll' },
      { name: 'Job Vacancies', path: '/dashboard/admin/jobs', description: 'Post openings and review staff applicants' },
      { name: 'Attendance Oversight', path: '/dashboard/admin/attendance', description: 'Student attendance records and trends' },
      { name: 'Attendance Code Generator', path: '/dashboard/admin/attendance-code', description: 'Daily attendance verification codes' },
      { name: 'Biometric Enrollment', path: '/dashboard/admin/biometric', description: 'Fingerprint capture and device sync' },
      { name: 'Lesson Monitor', path: '/dashboard/admin/lesson-monitor', description: 'Classroom teaching verification' },
      { name: 'Exam Sets', path: '/dashboard/admin/exam-sets', description: 'Assessment definitions and timetable' },
      { name: 'Exam Results Hub', path: '/dashboard/admin/exam-set-results', description: 'Published marks and terminal analytics' },
      { name: 'Reports & Result Slips', path: '/dashboard/admin/reports', description: 'Terminal report generation and templates' },
      { name: 'ID Card Studio', path: '/dashboard/admin/identity', description: 'Generate student and staff identity cards' },
      { name: 'Headed Paper Designer', path: '/dashboard/admin/headed-paper', description: 'Official institution letterheads and stamps' },
      { name: 'School Messages', path: '/dashboard/admin/messages', description: 'Direct staff and community chat' },
      { name: 'System Settings', path: '/dashboard/admin/settings', description: 'Branding, term calendar, grading schemes' },
    ],
  },
  {
    id: 'dos',
    name: 'Director of Studies (DOS)',
    secondaryTitle: 'Academic Registrar',
    category: 'Leadership',
    path: '/dashboard/dos',
    icon: Compass,
    color: '#78AAFF',
    description: 'Academic oversight, curriculum scheduling, examinations, lecturer attendance, and report cards.',
    subpages: [
      { name: 'DOS Central Dashboard', path: '/dashboard/dos', description: 'Academic KPIs, ongoing streams, attendance' },
      { name: 'DOS Student Roster', path: '/dashboard/dos/students', description: 'Academic standing and cohort records' },
      { name: 'DOS Teachers Management', path: '/dashboard/dos/teachers', description: 'Subject allocations and teacher profiles' },
      { name: 'Assessment & Exam Sets', path: '/dashboard/dos/exam-sets', description: 'Exam configurations, weighting, schedules' },
      { name: 'Exam Results Moderation', path: '/dashboard/dos/exam-set-results', description: 'Verify submitted marks and grades' },
      { name: 'Class Attendance Records', path: '/dashboard/dos/attendance', description: 'Daily student attendance audit' },
      { name: 'Teacher Clock-In Audit', path: '/dashboard/dos/attendance/teachers', description: 'Staff presence and timetable compliance' },
      { name: 'Clinical Ward Postings', path: '/dashboard/dos/ward-postings', description: 'Hospital clinical rotations (Tertiary)' },
      { name: 'Grading Comments Settings', path: '/dashboard/dos/headteacher-comments-settings', description: 'Automated comment criteria' },
      { name: 'Report Records Hub', path: '/dashboard/dos/report-records', description: 'Terminal performance archives' },
      { name: 'Academic Settings', path: '/dashboard/dos/settings', description: 'Class structures, curricula, terms' },
      { name: 'DOS Chat & Messages', path: '/dashboard/dos/messages', description: 'Staff and student queries' },
    ],
  },
  {
    id: 'head-teacher',
    name: 'Head Teacher / Principal',
    secondaryTitle: 'Executive Head of School',
    category: 'Leadership',
    path: '/dashboard/head-teacher',
    icon: UserCheck,
    color: '#F5C044',
    description: 'Executive supervision over staff workforce, academic reports, discipline, school finance summaries, and institutional operations.',
    subpages: [
      { name: 'Principal Overview', path: '/dashboard/head-teacher', description: 'Executive summary of attendance, fees, staff' },
      { name: 'Principal Profile', path: '/dashboard/head-teacher/profile', description: 'Office of the Principal details' },
      { name: 'Academic Oversight', path: '/dashboard/head-teacher/students', description: 'Student body health and discipline' },
      { name: 'Staff Workforce', path: '/dashboard/head-teacher/workforce', description: 'Appraisals, leaves, and staff attendance' },
      { name: 'Finance Summary', path: '/dashboard/head-teacher/finance', description: 'Term revenue, budget status, expenditures' },
      { name: 'Exam Results Approval', path: '/dashboard/head-teacher/exam-set-results', description: 'Review terminal grades before release' },
      { name: 'Report Cards Sign-off', path: '/dashboard/head-teacher/reports', description: 'Official remarks and stamp approvals' },
      { name: 'Principal Messages', path: '/dashboard/head-teacher/messages', description: 'Parent and teacher communication' },
    ],
  },
  {
    id: 'teacher',
    name: 'Teacher / Instructor',
    secondaryTitle: 'Classroom & Academic Tutor',
    category: 'Academic',
    path: '/dashboard/teacher',
    icon: BookOpen,
    color: '#10D9A8',
    description: 'Lesson planning, digital lesson logs, AI lesson notes, student homework/assignments, exam grading, and attendance.',
    subpages: [
      { name: 'Teacher Home', path: '/dashboard/teacher', description: 'Today classes, timetable, quick actions' },
      { name: 'My Students', path: '/dashboard/teacher/students', description: 'Class roster, academic performance' },
      { name: 'My Classes', path: '/dashboard/teacher/classes', description: 'Assigned subject streams and cohorts' },
      { name: 'AI Lesson Planner', path: '/dashboard/teacher/ai-planner', description: 'AI-assisted lesson planning generator' },
      { name: 'Daily Lesson Log', path: '/dashboard/teacher/lesson-log', description: 'Log topics taught with photo evidence' },
      { name: 'Lesson Notes Repository', path: '/dashboard/teacher/lesson-notes', description: 'Curated teaching notes and handouts' },
      { name: 'Lesson Plans', path: '/dashboard/teacher/lesson-plan', description: 'Structured instructional timelines' },
      { name: 'Schemes of Work', path: '/dashboard/teacher/scheme-of-work', description: 'Term syllabus breakdowns and milestones' },
      { name: 'Curriculum Guide', path: '/dashboard/teacher/curriculum', description: 'National or institution curriculum map' },
      { name: 'Assignments & Homework', path: '/dashboard/teacher/assignments', description: 'Create tasks and set submission deadlines' },
      { name: 'Student Submissions', path: '/dashboard/teacher/assignments', description: 'Grade student homework submissions' },
      { name: 'Exam Marks Entry', path: '/dashboard/teacher/exam-results', description: 'Input continuous assessment and exam scores' },
      { name: 'Daily Attendance', path: '/dashboard/teacher/attendance', description: 'Mark present, absent, excused' },
      { name: 'Teaching Timetable', path: '/dashboard/teacher/timetable', description: 'Weekly teaching schedule' },
      { name: 'Educational Resources', path: '/dashboard/teacher/resources', description: 'Digital books, past papers, syllabus' },
      { name: 'Teacher Chat', path: '/dashboard/teacher/messages', description: 'Communicate with students and parents' },
    ],
  },
  {
    id: 'student',
    name: 'Student / Trainee Portal',
    secondaryTitle: 'Student Body Experience',
    category: 'Student & Parent',
    path: '/dashboard/student',
    icon: GraduationCap,
    color: '#A855F7',
    description: 'Personal academic portal: fees balance and receipts, digital assignments, teacher messaging, grievance lodging, and democratic campus voting.',
    subpages: [
      { name: 'Student Dashboard', path: '/dashboard/student', description: 'Current grades, attendance, next class' },
      { name: 'My Fees & Payments', path: '/dashboard/student/fees', description: 'Invoice balance, payment history, receipts' },
      { name: 'Online Assignments', path: '/dashboard/student/assignment/demo', description: 'Take quizzes and submit homework' },
      { name: 'Student Messaging', path: '/dashboard/student/messages', description: 'Chat with subject teachers' },
      { name: 'Campus Elections & Balloting', path: '/dashboard/student/voting', description: 'Secret-ballot democratic voting interface' },
      { name: 'Student Grievances Desk', path: '/dashboard/student/grievances', description: 'Lodge petitions with optional anonymity' },
    ],
  },
  {
    id: 'parent',
    name: 'Parent / Guardian Portal',
    secondaryTitle: 'Guardian Engagement Hub',
    category: 'Student & Parent',
    path: '/dashboard/parent',
    icon: Users,
    color: '#8B5CF6',
    description: 'Dedicated portal for guardians to track child terminal results, attendance records, school fee statements, notices, and timetables.',
    subpages: [
      { name: 'Parent Dashboard', path: '/dashboard/parent', description: 'Child summary, upcoming exams, fee balance' },
      { name: 'Child Academic Performance', path: '/dashboard/parent/performance', description: 'Term exam marks and grade analytics' },
      { name: 'Attendance Records', path: '/dashboard/parent/attendance', description: 'Daily attendance calendar and clock-ins' },
      { name: 'Class Timetable', path: '/dashboard/parent/timetable', description: 'Subject periods and teacher schedule' },
      { name: 'Terminal Report Cards', path: '/dashboard/parent/reports', description: 'Download official terminal reports' },
      { name: 'School Fees Ledger', path: '/dashboard/parent/fees', description: 'Invoiced fees, concessions, amount paid' },
      { name: 'Digital Receipts', path: '/dashboard/parent/receipts', description: 'Verified payment vouchers' },
      { name: 'School Notices & Circulars', path: '/dashboard/parent/notices', description: 'Official newsletters and announcements' },
      { name: 'Direct School Chat', path: '/dashboard/parent/messages', description: 'Message class teacher and administration' },
    ],
  },
  {
    id: 'accountant',
    name: 'Bursar / Accountant',
    secondaryTitle: 'Finance & Accounts Department',
    category: 'Finance',
    path: '/dashboard/accountant',
    icon: CircleDollarSign,
    color: '#34D399',
    description: 'School financial ledger: fee billing, payment receipts, student statements, expenditure requisitions, bank reconciliations, and financial analytics.',
    subpages: [
      { name: 'Accountant Overview', path: '/dashboard/accountant', description: 'Revenue collected, bank balances, outstanding fees' },
      { name: 'Financial Analytics', path: '/dashboard/accountant/financial-analytics', description: 'Cashflow graphs, projected collection' },
      { name: 'Fee Structure Setup', path: '/dashboard/accountant/fee-structure', description: 'Configure tuition, boarding, uniform vote heads' },
      { name: 'Student Fee Sync', path: '/dashboard/accountant/fee-sync', description: 'Generate invoices across enrolled students' },
      { name: 'Student Invoicing & Billing', path: '/dashboard/accountant/billing', description: 'Itemized invoices and credit notes' },
      { name: 'Record Fee Payments', path: '/dashboard/accountant/payments', description: 'Cash, bank slip, mobile money entries' },
      { name: 'Student Ledger History', path: '/dashboard/accountant/student-ledger', description: 'Individual student payment statements' },
      { name: 'Payment Receipts', path: '/dashboard/accountant/receipts', description: 'Printable official receipts with barcode' },
      { name: 'Outstanding Defaulters', path: '/dashboard/accountant/outstanding', description: 'Fee arrears list and reminders' },
      { name: 'School Expenses', path: '/dashboard/accountant/expenses', description: 'Operational requisitions and vendor payments' },
      { name: 'Bank Accounts Reconciliation', path: '/dashboard/accountant/bank', description: 'Bank balances and statement matching' },
      { name: 'Financial Audit Reports', path: '/dashboard/accountant/reports', description: 'Income & expenditure reports' },
      { name: 'Fee Adjustments & Waivers', path: '/dashboard/accountant/adjustments', description: 'Bursaries, discounts, ledger adjustments' },
      { name: 'Finance Notifications', path: '/dashboard/accountant/notifications', description: 'Payment alerts and pending approvals' },
    ],
  },
  {
    id: 'secretary',
    name: 'School Secretary',
    secondaryTitle: 'Front Desk & Admissions',
    category: 'Administrative',
    path: '/dashboard/secretary',
    icon: ClipboardList,
    color: '#FB923C',
    description: 'Front desk reception: visitor logs, student registration, admission forms, official headed paper, and parent inquiries.',
    subpages: [
      { name: 'Secretary Home', path: '/dashboard/secretary', description: 'Daily front desk operations' },
      { name: 'Student Admission Form', path: '/dashboard/secretary/admission-form', description: 'Register new enrollment applicants' },
      { name: 'Visitor Log & Check-In', path: '/dashboard/secretary/visitors', description: 'Log guests, visiting parents, contractors' },
      { name: 'Staff Directory', path: '/dashboard/secretary/staff', description: 'Contact details and staff room locations' },
      { name: 'Attendance Records', path: '/dashboard/secretary/attendance', description: 'Daily attendance registry' },
      { name: 'Attendance Code Verification', path: '/dashboard/secretary/attendance-code', description: 'Issue morning verification pins' },
      { name: 'Headed Paper Generator', path: '/dashboard/secretary/headed-paper', description: 'Print official stamped correspondence' },
      { name: 'Outstanding Balances Lookup', path: '/dashboard/secretary/finance/outstanding', description: 'Quick verification of clearance' },
    ],
  },
  {
    id: 'guild',
    name: 'Guild Council Executive Suite',
    secondaryTitle: 'Democratic Student Governance',
    category: 'Student & Parent',
    path: '/dashboard/guild',
    icon: Landmark,
    color: '#FBBF24',
    description: 'Elected student leadership: Presidential command center, grievance mediation desk, guild fee account, welfare monitoring, and electoral commission console.',
    subpages: [
      { name: 'President Central Overview', path: '/dashboard/guild', description: 'Executive KPIs, treasury, grievance metrics' },
      { name: 'Grievance Resolution Desk', path: '/dashboard/guild/grievances', description: 'Mediate student welfare petitions or escalate to Admin' },
      { name: 'Guild Fee Treasury', path: '/dashboard/guild/finance', description: 'Requisitions, receipts, school finance sync' },
      { name: 'Campus Welfare Monitor', path: '/dashboard/guild/welfare', description: 'Sickbay, cafeteria hygiene, hostel facility logs' },
      { name: 'Senate Broadcasts', path: '/dashboard/guild/broadcasts', description: 'Dispatches targeted to faculties or whole campus' },
      { name: 'Electoral Commission Console', path: '/dashboard/guild/elections', description: 'Configure voting seats, vet nominees, certify winners' },
    ],
  },
  {
    id: 'librarian',
    name: 'School Librarian',
    secondaryTitle: 'Library Resource Center',
    category: 'Specialized',
    path: '/dashboard/librarian',
    icon: BookOpen,
    color: '#06B6D4',
    description: 'Library book lending, cataloging, barcode scanning, overdue tracking, and student reading records.',
    subpages: [
      { name: 'Librarian Dashboard', path: '/dashboard/librarian', description: 'Book lending, returns, student reading history' },
    ],
  },
  {
    id: 'lab-technician',
    name: 'Science Lab Technician',
    secondaryTitle: 'Laboratories & Practicum',
    category: 'Specialized',
    path: '/dashboard/lab-technician',
    icon: TestTube,
    color: '#14B8A6',
    description: 'Laboratory equipment inventory, reagent stock tracking, science experiment schedules, and safety incident logs.',
    subpages: [
      { name: 'Lab Technician Dashboard', path: '/dashboard/lab-technician', description: 'Science lab inventory and apparatus maintenance' },
    ],
  },
  {
    id: 'clinician',
    name: 'Clinician / Sickbay',
    secondaryTitle: 'Student Health Services',
    category: 'Specialized',
    path: '/dashboard/clinician',
    icon: HeartPulse,
    color: '#F43F5E',
    description: 'Student medical records, sickbay bed occupancy, dispensary medicine logs, student allergy alerts, and emergency hospital referrals.',
    subpages: [
      { name: 'Clinician Dashboard', path: '/dashboard/clinician', description: 'Clinic consultations, patient queue, medical inventory' },
    ],
  },
  {
    id: 'tertiary',
    name: 'Tertiary & Nursing Institute',
    secondaryTitle: 'Vocational & Health Science',
    category: 'Academic',
    path: '/dashboard/tertiary',
    icon: Building2,
    color: '#6366F1',
    description: 'Tertiary programmes, semester assessments, UHPAB clinical examinations, hospital ward postings, and transcripts.',
    subpages: [
      { name: 'Tertiary Central Hub', path: '/dashboard/tertiary', description: 'Institutes, programmes, UHPAB grades' },
      { name: 'Clinical Ward Postings', path: '/dashboard/admin/ward-postings', description: 'Hospital practicum scheduling' },
      { name: 'Tertiary Report Cards', path: '/dashboard/admin/reports', description: 'Transcript and semester grade slips' },
    ],
  },
  {
    id: 'owner',
    name: 'Platform Super-Admin / Owner',
    secondaryTitle: 'Multi-Tenant Platform Control',
    category: 'Platform',
    path: '/dashboard/owner',
    icon: Settings,
    color: '#EAB308',
    description: 'Multi-school platform management: school tenant provisioning, subscription billing, system health, Prometheus metrics, and global settings.',
    subpages: [
      { name: 'Owner Dashboard Home', path: '/dashboard/owner', description: 'Total schools, active users, platform revenue, DB size' },
      { name: 'Schools Tenant Management', path: '/dashboard/owner/schools', description: 'Provision schools, suspend, upgrade plans' },
      { name: 'Platform Users', path: '/dashboard/owner/users', description: 'Global user database across all schools' },
      { name: 'Subscription Finance', path: '/dashboard/owner/finance', description: 'Invoices, payment gateways, platform revenue' },
      { name: 'System Health & Metrics', path: '/dashboard/owner/system', description: 'Cache hit rate, DB connections, API calls' },
      { name: 'Platform Settings', path: '/dashboard/owner/settings', description: 'Global flags, features, backup status' },
    ],
  },
];

export default function PortalExplorerPage() {
  const navigate = useNavigate();
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [expandedPortalId, setExpandedPortalId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedPortalId(expandedPortalId === id ? null : id);
  };

  const categories = ['ALL', 'Leadership', 'Academic', 'Administrative', 'Student & Parent', 'Finance', 'Specialized', 'Platform'];

  const filteredPortals = useMemo(() => {
    return SYSTEM_PORTALS.filter((portal) => {
      if (selectedCategory !== 'ALL' && portal.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = portal.name.toLowerCase().includes(q);
        const matchDesc = portal.description.toLowerCase().includes(q);
        const matchSub = portal.subpages.some((s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
        if (!matchName && !matchDesc && !matchSub) return false;
      }
      return true;
    });
  }, [selectedCategory, searchQuery]);

  const totalPagesCount = useMemo(() => {
    return SYSTEM_PORTALS.reduce((acc, p) => acc + p.subpages.length, 0);
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div
        className="rounded-2xl p-6 border relative overflow-hidden shadow-lg"
        style={{
          backgroundColor: t.panel,
          borderColor: t.stroke,
        }}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase flex items-center gap-1.5"
                style={{
                  backgroundColor: t.goldDim,
                  color: t.gold,
                  border: `1px solid ${t.gold}`,
                }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Multi-School QA & Testing Hub</span>
              </span>
              <span className="text-xs" style={{ color: t.textMid }}>
                Direct Cross-Portal Access
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold mt-1 tracking-tight" style={{ color: t.textHi }}>
              All System Dashboards & Pages Directory
            </h1>
            <p className="text-xs mt-1 max-w-3xl leading-relaxed" style={{ color: t.textMid }}>
              Explore, inspect, and test every role dashboard across PwezaCore SMS. Use this directory to review existing UI screens, audit missing features, and test multi-school configurations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="p-3 rounded-xl border text-center"
              style={{
                backgroundColor: t.surfaceSubtle,
                borderColor: t.stroke,
              }}
            >
              <div className="text-2xl font-bold font-mono" style={{ color: t.mint }}>
                {SYSTEM_PORTALS.length}
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
                Role Portals
              </div>
            </div>

            <div
              className="p-3 rounded-xl border text-center"
              style={{
                backgroundColor: t.surfaceSubtle,
                borderColor: t.stroke,
              }}
            >
              <div className="text-2xl font-bold font-mono" style={{ color: t.blue }}>
                {totalPagesCount}
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
                Registered Pages
              </div>
            </div>
          </div>
        </div>

        {/* Ambient Glow */}
        <div
          className="absolute -top-12 -right-12 w-64 h-64 rounded-full pointer-events-none blur-3xl opacity-20"
          style={{ background: t.gold }}
        />
      </div>

      {/* Search and Category Filter Bar */}
      <div
        className="p-4 rounded-xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3"
        style={{
          backgroundColor: t.panel,
          borderColor: t.stroke,
        }}
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5" style={{ color: t.textLow }} />
          <input
            type="text"
            placeholder="Search any dashboard or subpage (e.g. attendance, fees, lesson log, voting)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg text-xs border outline-none"
            style={{
              backgroundColor: t.fieldBg,
              borderColor: t.stroke,
              color: t.textHi,
            }}
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 border transition-all ${
                selectedCategory === cat
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Portals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPortals.map((portal) => {
          const Icon = portal.icon;
          const isExpanded = expandedPortalId === portal.id;

          return (
            <div
              key={portal.id}
              className="rounded-2xl border flex flex-col overflow-hidden transition-all hover:shadow-xl"
              style={{
                backgroundColor: t.panel,
                borderColor: isExpanded ? portal.color : t.stroke,
              }}
            >
              {/* Card Header */}
              <div className="p-5 flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-md shrink-0"
                      style={{
                        backgroundColor: `${portal.color}22`,
                        color: portal.color,
                        border: `1px solid ${portal.color}44`,
                      }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div>
                      <h3 className="text-base font-bold tracking-tight leading-tight" style={{ color: t.textHi }}>
                        {portal.name}
                      </h3>
                      <div className="text-[11px] font-medium" style={{ color: t.textMid }}>
                        {portal.secondaryTitle}
                      </div>
                    </div>
                  </div>

                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: t.surfaceSubtle,
                      color: t.textMid,
                      border: `1px solid ${t.stroke}`,
                    }}
                  >
                    {portal.category}
                  </span>
                </div>

                <p className="text-xs leading-relaxed" style={{ color: t.textMid }}>
                  {portal.description}
                </p>

                <div className="flex items-center justify-between pt-2 text-[11px]" style={{ color: t.textLow }}>
                  <span>Route: <code>{portal.path}</code></span>
                  <span className="font-semibold">{portal.subpages.length} Pages</span>
                </div>
              </div>

              {/* Card Actions */}
              <div
                className="p-3 border-t flex items-center justify-between gap-2"
                style={{
                  backgroundColor: t.surfaceSubtle,
                  borderColor: t.divider,
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleExpand(portal.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 flex items-center gap-1.5 transition-colors"
                  style={{
                    color: t.textHi,
                    backgroundColor: t.fieldBg,
                    border: `1px solid ${t.stroke}`,
                  }}
                >
                  <span>{isExpanded ? 'Hide Pages' : 'View Pages'}</span>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => navigate(portal.path)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm hover:scale-[1.02] transition-all flex items-center gap-1.5"
                  style={{
                    background: `linear-gradient(135deg, ${portal.color}, ${portal.color}CC)`,
                    color: '#000',
                  }}
                >
                  <span>Open Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Collapsible Subpages Inventory */}
              {isExpanded && (
                <div
                  className="p-4 border-t space-y-2 max-h-72 overflow-y-auto"
                  style={{
                    backgroundColor: t.panel,
                    borderColor: t.divider,
                  }}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: t.textLow }}>
                    Registered Subpages & Routes:
                  </div>

                  {portal.subpages.map((sub, idx) => (
                    <div
                      key={idx}
                      onClick={() => navigate(sub.path)}
                      className="p-2.5 rounded-lg border hover:border-emerald-500 cursor-pointer transition-all flex items-start justify-between gap-2 group"
                      style={{
                        backgroundColor: t.fieldBg,
                        borderColor: t.stroke,
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-xs group-hover:text-emerald-400 flex items-center gap-1.5" style={{ color: t.textHi }}>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="truncate">{sub.name}</span>
                        </div>
                        <div className="text-[11px] mt-0.5 line-clamp-1" style={{ color: t.textLow }}>
                          {sub.description}
                        </div>
                        <div className="text-[10px] font-mono mt-0.5" style={{ color: t.textLow }}>
                          {sub.path}
                        </div>
                      </div>

                      <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:text-emerald-400 shrink-0 mt-0.5" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
