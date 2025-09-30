-- Teacher comment rules per class and school
create table if not exists public.teacher_comment_rules (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references public.schools(school_id) on delete cascade,
  class_name text not null,
  min_avg numeric not null,
  max_avg numeric not null,
  comment text not null,
  created_at timestamptz default now()
);

create index if not exists idx_tcr_school_class on public.teacher_comment_rules(school_id, class_name);

alter table public.teacher_comment_rules enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='teacher_comment_rules' and polname='tcr_select_own_school') then
    create policy tcr_select_own_school on public.teacher_comment_rules for select to authenticated using (school_id = public.current_school_id());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='teacher_comment_rules' and polname='tcr_all_own_school') then
    create policy tcr_all_own_school on public.teacher_comment_rules for all to authenticated using (school_id = public.current_school_id()) with check (school_id = public.current_school_id());
  end if;
end $$;


