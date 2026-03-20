
# PwezaCore Web App – Phase 1 Implementation Plan

## 1. Public Marketing Pages
- **Home page** (`/`): Hero section with CTA, features grid (multi-tenant, automated, mobile-responsive, analytics, secure, fast), testimonials carousel, pricing cards (Free/Pro/Enterprise), FAQ accordion, newsletter signup, security badges, floating "Become an Affiliate" CTA
- **Login page** (`/login`): Email/password form, "Remember me" checkbox, "Forgot password" link, disabled Google sign-in button
- **Register page** (`/register`): School registration form (school name, admin details)
- **Other public pages**: `/contact`, `/library`, `/jobs`, `/affiliate`, `/affiliate-terms`, `/privacy-policy`, `/security-letter`, `/auth/forgot`, `/auth/callback`

## 2. Authentication & Role System
- Supabase Auth with email/password sign-in and sign-up
- `users` table linked to `auth.users` with fields: `role`, `school_id`, `is_active`, display name, etc.
- Separate `user_roles` table for role management (admin, teacher, student, parent, accountant, librarian, head_teacher, owner)
- `ProtectedRoute` component: checks session, role, `is_active`; redirects inactive users to login
- `DashboardEntry` component: routes users to the correct dashboard based on role
- Forgot password flow with `/auth/forgot` and reset page
- Per-tab session handling

## 3. Database Schema (Supabase)
- **Core tables**: `schools`, `users`, `students`, `teachers`, `parents`, `classes`, `school_terms`, `exam_sets`, `class_teachers`, `teacher_class_subjects`
- **Finance tables**: `student_balances`, `student_payments`, `school_expenses`, `student_discounts`
- **Reports tables**: `report_snapshots`, `report_snapshot_data`, `generated_reports`, `report_templates`
- **Other**: `library`, `jobs`, `attendance`
- RLS policies scoped by `school_id` using security definer functions

## 4. Admin Dashboard (`/dashboard/admin`)
- **Layout**: Sidebar navigation with glassmorphism styling, collapsible, dark/light theme toggle
- **Dashboard home**: KPI cards (total students, staff, revenue, outstanding fees), quick action buttons, charts (enrollment trends, payment collection), recent notifications, upcoming reminders
- **Students**: List view with search/filter, "Add Student" form
- **Teachers & Parents**: List and basic management
- **Staff / Accounts**: Staff list and "Create Staff" form
- **Settings**: School settings page with Classes, Location, Exam sets sub-sections
- **Notifications**: In-app notification list

## 5. Placeholder Dashboards (Other Roles)
- **Teacher** (`/dashboard/teacher`): Sidebar with links to Classes, Students, Exam Results, Attendance, Timetable, AI Planner, Settings; dashboard shows class/student counts
- **Student** (`/dashboard/student`): "My Results" and "My Fees" cards (placeholder data)
- **Parent** (`/dashboard/parent`): "My Children" linked students list (placeholder)
- **Accountant** (`/dashboard/accountant`): Financial overview with KPI cards (placeholder)
- **Librarian** (`/dashboard/librarian`): "Library – Books and loans" placeholder
- **Head Teacher** (`/dashboard/head-teacher`): "School summary" placeholder
- **Owner** (`/dashboard/owner`): "Ownership and billing" placeholder

## 6. UI & Theming
- Glassmorphism design system: frosted glass cards, blur effects, gradient accents, custom CSS variables (`--ac-*`)
- Light/dark theme toggle with theme provider
- Reusable components: `GlassCard`, `GlassPanel`, `GlassModal`, `GlassBackground`
- Responsive layout (mobile-friendly sidebar, adaptive grids)
- Page transitions and error boundaries
- Toast notifications via Sonner
