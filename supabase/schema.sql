-- Calorie Tracker database setup.
-- Paste this whole file into Supabase → SQL Editor → New query, then press "Run".
-- It is safe to run again: it only creates things that don't exist yet.

-- ───────────────────────────── Types ─────────────────────────────
do $$ begin
  create type food_source as enum ('manual', 'label', 'barcode');
exception when duplicate_object then null; end $$;

do $$ begin
  -- private: only the creator sees it
  -- pending: shared, waiting for another user to review
  -- approved: live in the shared library
  -- rejected: a reviewer turned it down (creator still sees it)
  create type food_status as enum ('private', 'pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type meal_type as enum ('breakfast', 'lunch', 'dinner', 'snacks');
exception when duplicate_object then null; end $$;

-- ───────────────────────────── Invites ─────────────────────────────
-- The app is invite-only. The very first person to sign up is let in automatically;
-- after that, only emails on this list can create an account.
create table if not exists public.invites (
  email text primary key check (email = lower(email)),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ───────────────────────────── Profiles & goals ─────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  goal_mode text not null default 'maintain' check (goal_mode in ('lose', 'maintain', 'gain')),
  kcal_goal integer not null default 2000 check (kcal_goal between 0 and 20000),
  protein_goal integer not null default 120 check (protein_goal between 0 and 2000),
  carbs_goal integer not null default 220 check (carbs_goal between 0 and 2000),
  fat_goal integer not null default 70 check (fat_goal between 0 and 2000),
  created_at timestamptz not null default now()
);

-- ───────────────────────────── Foods ─────────────────────────────
-- Nutrition values are per one serving (serving_label describes it, e.g. "250 ml").
create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(name) between 1 and 200),
  brand text,
  serving_label text not null default '1 serving',
  kcal numeric not null default 0 check (kcal >= 0),
  protein_g numeric not null default 0 check (protein_g >= 0),
  carbs_g numeric not null default 0 check (carbs_g >= 0),
  fat_g numeric not null default 0 check (fat_g >= 0),
  sat_fat_g numeric check (sat_fat_g >= 0),
  sugar_g numeric check (sugar_g >= 0),
  fiber_g numeric check (fiber_g >= 0),
  salt_g numeric check (salt_g >= 0),
  barcode text,
  source food_source not null default 'manual',
  label_photo_path text,
  status food_status not null default 'private',
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);

create index if not exists foods_status_idx on public.foods (status);
create index if not exists foods_barcode_idx on public.foods (barcode);
create index if not exists foods_created_by_idx on public.foods (created_by);

-- ───────────────────────────── Food log ─────────────────────────────
-- Each entry keeps its own copy of the totals, so editing a food later never changes your history.
create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  food_id uuid references public.foods (id) on delete set null,
  logged_on date not null,
  meal meal_type not null,
  servings numeric not null default 1 check (servings > 0),
  name text not null,
  serving_label text not null default '1 serving',
  kcal numeric not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  sat_fat_g numeric,
  sugar_g numeric,
  fiber_g numeric,
  salt_g numeric,
  created_at timestamptz not null default now()
);

create index if not exists food_logs_user_day_idx on public.food_logs (user_id, logged_on);

-- ───────────────────────────── New-user trigger ─────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_count integer;
begin
  select count(*) into user_count from public.profiles;
  if user_count > 0 and not exists (
    select 1 from public.invites where email = lower(new.email)
  ) then
    raise exception 'This email has not been invited yet';
  end if;

  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────────── Row level security ─────────────────────────────
alter table public.invites enable row level security;
alter table public.profiles enable row level security;
alter table public.foods enable row level security;
alter table public.food_logs enable row level security;

-- Invites: any member can see and add invites.
drop policy if exists "members read invites" on public.invites;
create policy "members read invites" on public.invites
  for select to authenticated using (true);
drop policy if exists "members add invites" on public.invites;
create policy "members add invites" on public.invites
  for insert to authenticated with check (invited_by = auth.uid());

-- Profiles: members can see each other's names (for "by Sam" tags); only you can edit yours.
drop policy if exists "members read profiles" on public.profiles;
create policy "members read profiles" on public.profiles
  for select to authenticated using (true);
drop policy if exists "edit own profile" on public.profiles;
create policy "edit own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Table access for signed-in users (row level security above still decides which rows).
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.foods, public.food_logs to authenticated;
grant select, insert on public.invites to authenticated;
revoke all on public.foods, public.food_logs, public.invites, public.profiles from anon;

-- Goals are private: other members can only read your id and display name.
-- Your own goals are read through my_profile() below.
revoke select on public.profiles from authenticated;
grant select (id, display_name) on public.profiles to authenticated;
grant update (display_name, goal_mode, kcal_goal, protein_goal, carbs_goal, fat_goal) on public.profiles to authenticated;

-- Your own goals, readable only by you.
create or replace function public.my_profile()
returns setof public.profiles
language sql
security definer
set search_path = public
stable
as $$
  select * from public.profiles where id = auth.uid();
$$;

-- Foods: you see your own foods (any status), plus everything approved,
-- plus anything pending so it can be reviewed.
drop policy if exists "read foods" on public.foods;
create policy "read foods" on public.foods
  for select to authenticated
  using (created_by = auth.uid() or status in ('approved', 'pending'));

drop policy if exists "add own foods" on public.foods;
create policy "add own foods" on public.foods
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and status in ('private', 'pending')
    and reviewed_by is null
  );

-- You can edit your own foods until they are approved. Editing never approves.
drop policy if exists "edit own unapproved foods" on public.foods;
create policy "edit own unapproved foods" on public.foods
  for update to authenticated
  using (created_by = auth.uid() and status <> 'approved')
  with check (created_by = auth.uid() and status in ('private', 'pending') and reviewed_by is null);

drop policy if exists "delete own unapproved foods" on public.foods;
create policy "delete own unapproved foods" on public.foods
  for delete to authenticated
  using (created_by = auth.uid() and status <> 'approved');

-- Food log: strictly private.
drop policy if exists "own log" on public.food_logs;
create policy "own log" on public.food_logs
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ───────────────────────────── Review ─────────────────────────────
-- Approve or reject a pending food. Only someone other than the creator may do this.
-- On approve, the reviewer may pass corrected numbers in `fixes`.
create or replace function public.review_food(
  food_id uuid,
  decision text,
  fixes jsonb default null,
  note text default null
)
returns public.foods
language plpgsql
security definer
set search_path = public
as $$
declare
  f public.foods;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if decision not in ('approve', 'reject') then
    raise exception 'Decision must be approve or reject';
  end if;

  select * into f from public.foods where id = food_id for update;
  if not found then
    raise exception 'Food not found';
  end if;
  if f.status <> 'pending' then
    raise exception 'This food is not waiting for review';
  end if;
  if f.created_by = auth.uid() then
    raise exception 'You cannot review your own food';
  end if;

  if decision = 'approve' and fixes is not null then
    update public.foods set
      name = coalesce(nullif(fixes ->> 'name', ''), name),
      brand = case when fixes ? 'brand' then nullif(fixes ->> 'brand', '') else brand end,
      serving_label = coalesce(nullif(fixes ->> 'serving_label', ''), serving_label),
      kcal = coalesce((fixes ->> 'kcal')::numeric, kcal),
      protein_g = coalesce((fixes ->> 'protein_g')::numeric, protein_g),
      carbs_g = coalesce((fixes ->> 'carbs_g')::numeric, carbs_g),
      fat_g = coalesce((fixes ->> 'fat_g')::numeric, fat_g),
      sat_fat_g = case when fixes ? 'sat_fat_g' then (fixes ->> 'sat_fat_g')::numeric else sat_fat_g end,
      sugar_g = case when fixes ? 'sugar_g' then (fixes ->> 'sugar_g')::numeric else sugar_g end,
      fiber_g = case when fixes ? 'fiber_g' then (fixes ->> 'fiber_g')::numeric else fiber_g end,
      salt_g = case when fixes ? 'salt_g' then (fixes ->> 'salt_g')::numeric else salt_g end
    where id = food_id;
  end if;

  update public.foods set
    status = case when decision = 'approve' then 'approved'::food_status else 'rejected'::food_status end,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    review_note = note
  where id = food_id
  returning * into f;

  return f;
end;
$$;

revoke all on function public.review_food(uuid, text, jsonb, text) from public, anon;
grant execute on function public.review_food(uuid, text, jsonb, text) to authenticated;
revoke all on function public.my_profile() from public, anon;
grant execute on function public.my_profile() to authenticated;

-- ───────────────────────────── Label photo storage ─────────────────────────────
-- Private bucket. Photos go in a folder named after the uploader's user id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('label-photos', 'label-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "upload own label photos" on storage.objects;
create policy "upload own label photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'label-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Members can view label photos (reviewers need to check them against the numbers).
drop policy if exists "members view label photos" on storage.objects;
create policy "members view label photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'label-photos');

drop policy if exists "delete own label photos" on storage.objects;
create policy "delete own label photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'label-photos' and (storage.foldername(name))[1] = auth.uid()::text);
