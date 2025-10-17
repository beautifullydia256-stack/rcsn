-- Allow multiple class teachers per class
create table if not exists public.class_teachers (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references public.schools(school_id) on delete cascade,
  class_name text not null,
  teacher_id uuid not null references public.teachers(teacher_id) on delete cascade,
  created_at timestamptz default now(),
  unique (school_id, class_name, teacher_id)
);

create index if not exists idx_class_teachers_school_class on public.class_teachers(school_id, class_name);

alter table public.class_teachers enable row level security;

-- Policies: teachers and admins in the same school can view; admins/head_teacher can manage; teachers can insert themselves only if authorized (relies on app logic)
drop policy if exists ct_select_school on public.class_teachers;
drop policy if exists ct_manage_school on public.class_teachers;

create policy ct_select_school on public.class_teachers
  for select to authenticated
  using (school_id = public.current_school_id());

create policy ct_manage_school on public.class_teachers
  for all to authenticated
  using (
    school_id = public.current_school_id() and exists (
      select 1 from public.users u
      where u.user_id = auth.uid()
        and u.school_id = public.current_school_id()
        and u.role in ('admin','owner','head_teacher')
    )
  )
  with check (school_id = public.current_school_id());


