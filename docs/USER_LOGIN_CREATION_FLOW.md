# User Login Creation Flow – Spec vs Current State

## Run in Supabase (required for new features)

Apply the migration so that **User Management** can show status and activate/deactivate, and so **one parent can link to multiple students**:

- **Migration:** `supabase/migrations/20260220140000_users_is_active_and_parents_multi_student.sql`

In Supabase Dashboard: **SQL Editor** → paste the contents of that file → **Run**.  
Or with Supabase CLI: `supabase db push` (or `supabase migration up`).

## 1. Staff Login Creation (Head Teacher, Accountant, Teacher, Librarian)

### Spec
- **Where:** Admin Dashboard → User Management → Create Staff
- **Form:** Full Name, Email (required & unique), Phone, **Role dropdown** (Head Teacher, Accountant, Teacher, Librarian), Department (optional), Password (auto-generate or manual), Status (Active)
- **On Create:** Create user, assign role, attach permissions, save credentials, show confirmation (optional: show password once / send email)

### Current State
| Item | Status | Location |
|------|--------|----------|
| Create staff (admin, librarian, accountant) | ✅ Exists | `app/dashboard/admin/accounts/add` (Next.js), API `app/api/admin/create-user-account` – **role in body** (admin/librarian/accountant). **Vite app has no route for** `accounts/add` – button goes to missing page. |
| Role dropdown (Head Teacher, Accountant, Teacher, Librarian) | ⚠️ Partial | Add page uses single role; **Head Teacher** and **Teacher** are separate flows (see below). |
| Head Teacher | ✅ Separate flow | `app/dashboard/admin/head-teacher/appoint` – select teacher, then create login with role `head_teacher`. |
| Teacher login | ✅ Separate flow | Teacher record first; then from **Teacher detail** page → "Create Login" → `app/api/admin/create-teacher-login`. |
| Librarian | ✅ Exists | `app/dashboard/admin/librarian/add` (Next.js) and central create-user-account with role librarian. |
| Permissions attached to role | ❌ Not implemented | No `permissions` table or role–permission mapping; dashboards/RLS use `role` only. |
| Status (Active/Inactive) | ❌ Not in UI | No activate/deactivate on user; only delete. |

**Gap:** One unified **Create Staff** form in the **Vite** app (User Management) with role = Head Teacher | Accountant | Teacher | Librarian, and a proper **accounts/add** route. Today staff creation is split across Next.js `accounts/add`, `librarian/add`, head-teacher appoint, and teacher create-login.

---

## 2. Student Login Creation

### Spec
- **When:** Auto-created **during student enrollment** (no separate “Create Staff” for students).
- **Rules:** Create student account, role = Student, **Username = Admission Number**, generate default password, status = Active.

### Current State
| Item | Status | Location |
|------|--------|----------|
| When created | ❌ Manual | Student login is **not** created at enrollment. After Add Student, admin must open **Student Details** and click **"Create Login"**. |
| Username | ⚠️ Partial | **Login page** supports “admission number as username”: if input has no `@`, it tries `{input}@school.local` (see `src/pages/auth/Login.tsx`). But **create-student-login** API **requires email** and creates auth with that email; it does **not** create `admission_number@school.local` by default. So student can log in with admission number only if auth was created with email = `admission_number@school.local`. |
| Default password | ⚠️ Partial | API uses `password || admission_number`; no separate “default password” rule. |

**Gap:** On **Add Student** (enrollment) completion, **automatically** call create-student-login (or equivalent): create auth with email = `{admission_number}@school.local`, default password (e.g. admission number or generated), and `public.users` + link to `student_id`. Then students log in with **Admission Number** (and optional password reset later).

---

## 3. Parent Login Creation

### Spec
- **Option A (recommended):** When a student is enrolled and parent email/phone is entered → auto-create Parent account, role = Parent, link to student_id; if same parent has more children, **do not** create duplicate – link existing parent to extra student.
- **Option B:** Admin → User Management → Create Parent; form: Full Name, Email, Phone, **Linked Student(s)** (at least one required), Password.

### Current State
| Item | Status | Location |
|------|--------|----------|
| Create parent + optional login | ✅ Exists | `app/dashboard/admin/parents/add` and `src/pages/admin/parents/ParentsPage` (list). When adding parent there is a **“Create login”** checkbox; if checked, calls `app/api/admin/create-parent-login`. |
| Auto-create on student enrollment | ❌ Not implemented | Adding a student does **not** auto-create or link parent account. |
| One parent, many students | ⚠️ Unclear | No explicit “link existing parent to another student” flow in one place; depends on data model (parents table links to student_id; may need parent_id on students or a link table). |

**Gap:** Either implement **Option A** (on student enrollment, create/link parent and optionally create login) with “same email/phone = same parent, link to new student”, or add a clear **Create Parent** flow with “Linked Student(s)” required.

---

## 4. User Management Page

### Spec
- View all users, **filter by role**, **search** by name/email, **edit** user, **reset password**, **activate/deactivate**, **change role**. Prefer deactivate over delete.

### Current State
| Item | Status | Location |
|------|--------|----------|
| View users | ✅ | `src/pages/admin/accounts/AccountsPage.tsx` – lists admin, librarian, accountant (from `users` with role in list). |
| Filter by role | ✅ | Dropdown: All / admin / librarian / accountant. **Missing:** head_teacher, teacher, parent, student. |
| Search by name/email | ✅ | Search input. |
| Edit user | ❌ | No edit form; only delete. |
| Reset password | ❌ | No “Reset password” in this page (APIs exist: `reset-teacher-password`, `reset-student-password`). |
| Activate / Deactivate | ❌ | No status field or toggle; only delete. |
| Change role | ❌ | No “Change role” action. |

**Gap:** Extend **AccountsPage** (or equivalent “User Management”) to: include **all** roles (head_teacher, teacher, parent, student), add **Edit**, **Reset password**, **Activate/Deactivate** (and optional **Change role**). Use deactivate (e.g. `is_active` or `status`) instead of delete where possible.

---

## 5. Permission Logic

### Spec
- Permissions are **role-driven**; each role has a default set; creating a user with a role assigns that role’s permissions. (Optional: admin override.)

### Current State
- **No** `permissions` table or role–permission matrix in codebase. Access is determined by **role** in `public.users` and in auth metadata; dashboards and RLS use `role` only (e.g. admin, head_teacher, accountant, teacher, librarian, student, parent). So “permissions” are implicit in the app/RLS per role, not stored as assignable permissions.

**Gap:** To match spec literally, introduce a **permissions** model and **default permissions per role**; on user create, assign permissions from role. Optional: UI for admin to override. If you prefer to keep current model, “permissions” can remain “role-based access in code” and the doc updated to say that.

---

## 6. Login Identity Rules

### Spec
- **Staff:** log in with **Email**.
- **Students:** log in with **Admission Number** (username).
- **Parents:** log in with **Email** or **Phone**.
- One login field that accepts either email or username.

### Current State
| Item | Status | Location |
|------|--------|----------|
| Staff = email | ✅ | Auth uses email; staff have real emails. |
| Student = admission number | ⚠️ | **Login.tsx** supports it: if value has no `@` and looks like a code, it tries `{value}@school.local`. So **if** student auth was created with email `admission_number@school.local`, they can use admission number. **create-student-login** currently takes an **email** from the form and uses that; it does not force `admission_number@school.local`. |
| Parent = email or phone | ❌ | Login is email+password only; no “login with phone” flow. |
| Single field (email or username) | ✅ | One field; backend tries email then, for non-@ input, `@school.local`. |

**Gap:** (1) Ensure **student** auth is created with email = `{admission_number}@school.local` when auto-creating at enrollment so “Username = Admission Number” holds. (2) **Parent login by phone:** would require either a separate “login with phone” step (e.g. OTP) or storing phone in auth and resolving phone → user for login.

---

## 7. Summary – What to Implement

1. **Unified Create Staff (Vite)**
   - Add route `dashboard/admin/accounts/add` and a **Create Staff** page.
   - Form: Full Name, Email, Phone, **Role** (Head Teacher, Accountant, Teacher, Librarian), Department (optional), Password (auto or manual), Status (Active).
   - On submit: call API that creates auth user + `public.users` with chosen role (reuse or extend `create-user-account` / create-teacher-login / head-teacher logic so one endpoint or one flow handles all four roles).

2. **Student login at enrollment**
   - On successful **Add Student**, automatically create auth user with email = `{admission_number}@school.local`, default password (e.g. admission number or generated), and `public.users` with role = student and `student_id` set. Remove requirement for manual “Create Login” from Student Details (or keep as “Reset / re-send credentials”).

3. **Parent**
   - Either: **Option A** – when enrolling a student with parent email/phone, create or link parent and optionally create parent login (no duplicate parent for same email/phone). Or **Option B** – “Create Parent” form with required “Linked Student(s)” and password.

4. **User Management**
   - Extend **AccountsPage** (or equivalent) to: show **all** roles (admin, head_teacher, accountant, teacher, librarian, student, parent), add **Edit**, **Reset password**, **Activate/Deactivate** (and optionally **Change role**). Prefer deactivate over delete.

5. **Permissions (optional)**
   - Add default permissions per role and assign on user create; optionally allow admin override. If not needed, keep current “role-only” access and document it.

6. **Login**
   - Keep single login field. Ensure student auth uses `admission_number@school.local` when auto-created. Parent login by phone is a separate feature (e.g. OTP or phone-based lookup) if required.

---

## 8. File Reference (Current)

| Purpose | File(s) |
|--------|---------|
| Staff list (admin, librarian, accountant) | `src/pages/admin/accounts/AccountsPage.tsx` |
| Create staff (Next.js) | `app/dashboard/admin/accounts/add/page.tsx`, `app/api/admin/create-user-account/route.ts` |
| Create student login | `app/api/admin/create-student-login/route.ts`; UI: `app/dashboard/admin/students/[id]/page.tsx` (“Create Login”) |
| Create teacher login | `app/api/admin/create-teacher-login/route.ts`; UI: `app/dashboard/admin/teachers/[teacher_id]/create-login/page.tsx` |
| Head teacher | `app/dashboard/admin/head-teacher/appoint/page.tsx` |
| Create parent login | `app/api/admin/create-parent-login/route.ts`; parent add: `app/dashboard/admin/parents/add/page.tsx` |
| Login (email + admission number fallback) | `src/pages/auth/Login.tsx` |
| Add Student (enrollment) | `src/pages/admin/students/AddStudentPage.tsx` |

No Vite route exists for `accounts/add`; the button in `AccountsPage` navigates to `/dashboard/admin/accounts/add`, which has no matching route in `src/App.tsx`.
