-- Per-school, per-subject Teacher's Remarks Settings (min/max % -> comment)
create table if not exists public.teacher_remarks_settings (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references public.schools(school_id) on delete cascade,
  subject text not null,
  min_percent integer not null check (min_percent >= 0 and min_percent <= 100),
  max_percent integer not null check (max_percent >= 0 and max_percent <= 100),
  comment_text text not null,
  created_by uuid not null references public.users(user_id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (school_id, subject, min_percent, max_percent)
);

comment on table public.teacher_remarks_settings is 'Per-subject remark ranges (min/max %) used to auto-generate Teacher\'s Remarks per subject.';

create index if not exists idx_trs_school_subject on public.teacher_remarks_settings(school_id, subject);

alter table public.teacher_remarks_settings enable row level security;

-- Basic RLS: scoped to school; teachers can manage their subjects; admins can manage all subjects
drop policy if exists trs_select_own_school on public.teacher_remarks_settings;
drop policy if exists trs_all_own_school on public.teacher_remarks_settings;

create policy trs_select_own_school on public.teacher_remarks_settings
  for select to authenticated
  using (school_id = public.current_school_id());

create policy trs_all_own_school on public.teacher_remarks_settings
  for all to authenticated
  using (
    school_id = public.current_school_id() and (
      exists (
        select 1 from public.users u
        where u.user_id = auth.uid()
          and u.school_id = public.current_school_id()
          and (
            u.role in ('admin','owner','head_teacher','accountant','librarian')
            or u.role = 'teacher'
          )
      )
    )
  )
  with check (school_id = public.current_school_id());

create or replace function public.update_trs_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_trs_updated_at on public.teacher_remarks_settings;
create trigger trg_trs_updated_at
  before update on public.teacher_remarks_settings
  for each row execute function public.update_trs_updated_at();


