-- Per-school, per-class Class Teacher's Comments Settings (min/max % -> comment)
create table if not exists public.class_teacher_comments_settings (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references public.schools(school_id) on delete cascade,
  class_name text not null,
  min_percent integer not null check (min_percent >= 0 and min_percent <= 100),
  max_percent integer not null check (max_percent >= 0 and max_percent <= 100),
  comment_text text not null,
  created_by uuid not null references public.users(user_id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (school_id, class_name, min_percent, max_percent)
);

comment on table public.class_teacher_comments_settings is 'Per-class average-based comment ranges for Class Teacher\'s Comments.';

create index if not exists idx_ctcs_school_class on public.class_teacher_comments_settings(school_id, class_name);

alter table public.class_teacher_comments_settings enable row level security;

-- RLS policies: scoped to school; class teachers/admins manage their class settings
drop policy if exists ctcs_select_own_school on public.class_teacher_comments_settings;
drop policy if exists ctcs_all_own_school on public.class_teacher_comments_settings;

create policy ctcs_select_own_school on public.class_teacher_comments_settings
  for select to authenticated
  using (school_id = public.current_school_id());

create policy ctcs_all_own_school on public.class_teacher_comments_settings
  for all to authenticated
  using (
    school_id = public.current_school_id() and (
      exists (
        select 1 from public.users u
        where u.user_id = auth.uid()
          and u.school_id = public.current_school_id()
          and u.role in ('admin','owner','head_teacher','teacher')
      )
    )
  )
  with check (school_id = public.current_school_id());

create or replace function public.update_ctcs_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_ctcs_updated_at on public.class_teacher_comments_settings;
create trigger trg_ctcs_updated_at
  before update on public.class_teacher_comments_settings
  for each row execute function public.update_ctcs_updated_at();


