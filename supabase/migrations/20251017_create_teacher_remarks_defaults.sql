-- Class-level default Teacher's Remarks per school
create table if not exists public.teacher_remarks_defaults (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references public.schools(school_id) on delete cascade,
  class_name text not null,
  default_remark text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (school_id, class_name)
);

comment on table public.teacher_remarks_defaults is 'Default free-text Teacher\'s Remarks per school/class for report cards';

create index if not exists idx_trd_school_class on public.teacher_remarks_defaults(school_id, class_name);

alter table public.teacher_remarks_defaults enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='teacher_remarks_defaults' and polname='trd_select_own_school') then
    create policy trd_select_own_school on public.teacher_remarks_defaults
      for select to authenticated
      using (school_id = public.current_school_id());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='teacher_remarks_defaults' and polname='trd_all_own_school') then
    create policy trd_all_own_school on public.teacher_remarks_defaults
      for all to authenticated
      using (school_id = public.current_school_id())
      with check (school_id = public.current_school_id());
  end if;
end $$;

create or replace function public.update_trd_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_trd_updated_at on public.teacher_remarks_defaults;
create trigger trg_trd_updated_at
  before update on public.teacher_remarks_defaults
  for each row execute function public.update_trd_updated_at();


