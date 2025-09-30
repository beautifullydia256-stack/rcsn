-- Per-class publication status for exam sets
create table if not exists public.exam_set_publications (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references public.schools(school_id) on delete cascade,
  exam_set_id uuid not null references public.exam_sets(id) on delete cascade,
  class_name text not null,
  published boolean not null default false,
  published_at timestamptz,
  published_by uuid references public.users(user_id),
  created_at timestamptz default now(),
  unique (school_id, exam_set_id, class_name)
);

create index if not exists idx_esp_school_exam_class
  on public.exam_set_publications(school_id, exam_set_id, class_name);

alter table public.exam_set_publications enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='exam_set_publications' and policyname='esp_select_own_school'
  ) then
    create policy esp_select_own_school on public.exam_set_publications
      for select to authenticated
      using (school_id = public.current_school_id());
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='exam_set_publications' and policyname='esp_all_own_school'
  ) then
    create policy esp_all_own_school on public.exam_set_publications
      for all to authenticated
      using (school_id = public.current_school_id())
      with check (school_id = public.current_school_id());
  end if;
end $$;


