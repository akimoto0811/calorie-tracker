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
  create type meal_type as enum ('breakfast', 'lunch', 'dinner', 'snacks', 'drinks');
exception when duplicate_object then null; end $$;
-- Added in a later update: makes sure older databases also have "drinks".
alter type meal_type add value if not exists 'drinks';

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
  water_goal_ml integer not null default 2000 check (water_goal_ml between 0 and 20000),
  created_at timestamptz not null default now()
);
-- Added in a later update: daily water goal for databases created before it existed.
alter table public.profiles add column if not exists water_goal_ml integer not null default 2000
  check (water_goal_ml between 0 and 20000);
-- "About you": optional, used only to suggest a calorie goal. Private like the goals.
alter table public.profiles add column if not exists sex text check (sex in ('female', 'male'));
alter table public.profiles add column if not exists birth_year integer check (birth_year between 1900 and 2100);
alter table public.profiles add column if not exists height_cm numeric check (height_cm between 50 and 300);
alter table public.profiles add column if not exists weight_kg numeric check (weight_kg between 20 and 500);
alter table public.profiles add column if not exists activity text check (activity in ('little', 'light', 'moderate', 'very'));

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
  trans_fat_g numeric check (trans_fat_g >= 0),
  cholesterol_mg numeric check (cholesterol_mg >= 0),
  sodium_mg numeric check (sodium_mg >= 0),
  added_sugar_g numeric check (added_sugar_g >= 0),
  vitamin_d_mcg numeric check (vitamin_d_mcg >= 0),
  calcium_mg numeric check (calcium_mg >= 0),
  iron_mg numeric check (iron_mg >= 0),
  potassium_mg numeric check (potassium_mg >= 0),
  mono_fat_g numeric check (mono_fat_g >= 0),
  poly_fat_g numeric check (poly_fat_g >= 0),
  omega3_g numeric check (omega3_g >= 0),
  omega6_g numeric check (omega6_g >= 0),
  soluble_fiber_g numeric check (soluble_fiber_g >= 0),
  insoluble_fiber_g numeric check (insoluble_fiber_g >= 0),
  polyols_g numeric check (polyols_g >= 0),
  starch_g numeric check (starch_g >= 0),
  chloride_mg numeric check (chloride_mg >= 0),
  vit_a_mcg numeric check (vit_a_mcg >= 0),
  vit_c_mg numeric check (vit_c_mg >= 0),
  vit_e_mg numeric check (vit_e_mg >= 0),
  vit_k_mcg numeric check (vit_k_mcg >= 0),
  thiamin_mg numeric check (thiamin_mg >= 0),
  riboflavin_mg numeric check (riboflavin_mg >= 0),
  niacin_mg numeric check (niacin_mg >= 0),
  pantothenic_mg numeric check (pantothenic_mg >= 0),
  vit_b6_mg numeric check (vit_b6_mg >= 0),
  biotin_mcg numeric check (biotin_mcg >= 0),
  folate_mcg numeric check (folate_mcg >= 0),
  vit_b12_mcg numeric check (vit_b12_mcg >= 0),
  choline_mg numeric check (choline_mg >= 0),
  magnesium_mg numeric check (magnesium_mg >= 0),
  phosphorus_mg numeric check (phosphorus_mg >= 0),
  zinc_mg numeric check (zinc_mg >= 0),
  copper_mg numeric check (copper_mg >= 0),
  manganese_mg numeric check (manganese_mg >= 0),
  selenium_mcg numeric check (selenium_mcg >= 0),
  iodine_mcg numeric check (iodine_mcg >= 0),
  chromium_mcg numeric check (chromium_mcg >= 0),
  molybdenum_mcg numeric check (molybdenum_mcg >= 0),
  fluoride_mg numeric check (fluoride_mg >= 0),
  caffeine_mg numeric check (caffeine_mg >= 0),
  alcohol_g numeric check (alcohol_g >= 0),
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
  trans_fat_g numeric,
  cholesterol_mg numeric,
  sodium_mg numeric,
  added_sugar_g numeric,
  vitamin_d_mcg numeric,
  calcium_mg numeric,
  iron_mg numeric,
  potassium_mg numeric,
  mono_fat_g numeric,
  poly_fat_g numeric,
  omega3_g numeric,
  omega6_g numeric,
  soluble_fiber_g numeric,
  insoluble_fiber_g numeric,
  polyols_g numeric,
  starch_g numeric,
  chloride_mg numeric,
  vit_a_mcg numeric,
  vit_c_mg numeric,
  vit_e_mg numeric,
  vit_k_mcg numeric,
  thiamin_mg numeric,
  riboflavin_mg numeric,
  niacin_mg numeric,
  pantothenic_mg numeric,
  vit_b6_mg numeric,
  biotin_mcg numeric,
  folate_mcg numeric,
  vit_b12_mcg numeric,
  choline_mg numeric,
  magnesium_mg numeric,
  phosphorus_mg numeric,
  zinc_mg numeric,
  copper_mg numeric,
  manganese_mg numeric,
  selenium_mcg numeric,
  iodine_mcg numeric,
  chromium_mcg numeric,
  molybdenum_mcg numeric,
  fluoride_mg numeric,
  caffeine_mg numeric,
  alcohol_g numeric,
  created_at timestamptz not null default now()
);

create index if not exists food_logs_user_day_idx on public.food_logs (user_id, logged_on);

-- Added later: the rest of a Nutrition Facts label. Safe to run on an existing database.
alter table public.foods add column if not exists trans_fat_g numeric check (trans_fat_g >= 0);
alter table public.foods add column if not exists cholesterol_mg numeric check (cholesterol_mg >= 0);
alter table public.foods add column if not exists sodium_mg numeric check (sodium_mg >= 0);
alter table public.foods add column if not exists added_sugar_g numeric check (added_sugar_g >= 0);
alter table public.foods add column if not exists vitamin_d_mcg numeric check (vitamin_d_mcg >= 0);
alter table public.foods add column if not exists calcium_mg numeric check (calcium_mg >= 0);
alter table public.foods add column if not exists iron_mg numeric check (iron_mg >= 0);
alter table public.foods add column if not exists potassium_mg numeric check (potassium_mg >= 0);
alter table public.food_logs add column if not exists trans_fat_g numeric;
alter table public.food_logs add column if not exists cholesterol_mg numeric;
alter table public.food_logs add column if not exists sodium_mg numeric;
alter table public.food_logs add column if not exists added_sugar_g numeric;
alter table public.food_logs add column if not exists vitamin_d_mcg numeric;
alter table public.food_logs add column if not exists calcium_mg numeric;
alter table public.food_logs add column if not exists iron_mg numeric;
alter table public.food_logs add column if not exists potassium_mg numeric;
-- Older foods stored salt; sodium is salt ÷ 2.5 (and grams → milligrams).
update public.foods set sodium_mg = round(salt_g * 400) where sodium_mg is null and salt_g is not null;
update public.food_logs set sodium_mg = round(salt_g * 400) where sodium_mg is null and salt_g is not null;

-- Added later: everything else a label can show (vitamins, minerals, fat and fibre types…).
alter table public.foods add column if not exists mono_fat_g numeric check (mono_fat_g >= 0);
alter table public.foods add column if not exists poly_fat_g numeric check (poly_fat_g >= 0);
alter table public.foods add column if not exists omega3_g numeric check (omega3_g >= 0);
alter table public.foods add column if not exists omega6_g numeric check (omega6_g >= 0);
alter table public.foods add column if not exists soluble_fiber_g numeric check (soluble_fiber_g >= 0);
alter table public.foods add column if not exists insoluble_fiber_g numeric check (insoluble_fiber_g >= 0);
alter table public.foods add column if not exists polyols_g numeric check (polyols_g >= 0);
alter table public.foods add column if not exists starch_g numeric check (starch_g >= 0);
alter table public.foods add column if not exists chloride_mg numeric check (chloride_mg >= 0);
alter table public.foods add column if not exists vit_a_mcg numeric check (vit_a_mcg >= 0);
alter table public.foods add column if not exists vit_c_mg numeric check (vit_c_mg >= 0);
alter table public.foods add column if not exists vit_e_mg numeric check (vit_e_mg >= 0);
alter table public.foods add column if not exists vit_k_mcg numeric check (vit_k_mcg >= 0);
alter table public.foods add column if not exists thiamin_mg numeric check (thiamin_mg >= 0);
alter table public.foods add column if not exists riboflavin_mg numeric check (riboflavin_mg >= 0);
alter table public.foods add column if not exists niacin_mg numeric check (niacin_mg >= 0);
alter table public.foods add column if not exists pantothenic_mg numeric check (pantothenic_mg >= 0);
alter table public.foods add column if not exists vit_b6_mg numeric check (vit_b6_mg >= 0);
alter table public.foods add column if not exists biotin_mcg numeric check (biotin_mcg >= 0);
alter table public.foods add column if not exists folate_mcg numeric check (folate_mcg >= 0);
alter table public.foods add column if not exists vit_b12_mcg numeric check (vit_b12_mcg >= 0);
alter table public.foods add column if not exists choline_mg numeric check (choline_mg >= 0);
alter table public.foods add column if not exists magnesium_mg numeric check (magnesium_mg >= 0);
alter table public.foods add column if not exists phosphorus_mg numeric check (phosphorus_mg >= 0);
alter table public.foods add column if not exists zinc_mg numeric check (zinc_mg >= 0);
alter table public.foods add column if not exists copper_mg numeric check (copper_mg >= 0);
alter table public.foods add column if not exists manganese_mg numeric check (manganese_mg >= 0);
alter table public.foods add column if not exists selenium_mcg numeric check (selenium_mcg >= 0);
alter table public.foods add column if not exists iodine_mcg numeric check (iodine_mcg >= 0);
alter table public.foods add column if not exists chromium_mcg numeric check (chromium_mcg >= 0);
alter table public.foods add column if not exists molybdenum_mcg numeric check (molybdenum_mcg >= 0);
alter table public.foods add column if not exists fluoride_mg numeric check (fluoride_mg >= 0);
alter table public.foods add column if not exists caffeine_mg numeric check (caffeine_mg >= 0);
alter table public.foods add column if not exists alcohol_g numeric check (alcohol_g >= 0);
alter table public.food_logs add column if not exists mono_fat_g numeric;
alter table public.food_logs add column if not exists poly_fat_g numeric;
alter table public.food_logs add column if not exists omega3_g numeric;
alter table public.food_logs add column if not exists omega6_g numeric;
alter table public.food_logs add column if not exists soluble_fiber_g numeric;
alter table public.food_logs add column if not exists insoluble_fiber_g numeric;
alter table public.food_logs add column if not exists polyols_g numeric;
alter table public.food_logs add column if not exists starch_g numeric;
alter table public.food_logs add column if not exists chloride_mg numeric;
alter table public.food_logs add column if not exists vit_a_mcg numeric;
alter table public.food_logs add column if not exists vit_c_mg numeric;
alter table public.food_logs add column if not exists vit_e_mg numeric;
alter table public.food_logs add column if not exists vit_k_mcg numeric;
alter table public.food_logs add column if not exists thiamin_mg numeric;
alter table public.food_logs add column if not exists riboflavin_mg numeric;
alter table public.food_logs add column if not exists niacin_mg numeric;
alter table public.food_logs add column if not exists pantothenic_mg numeric;
alter table public.food_logs add column if not exists vit_b6_mg numeric;
alter table public.food_logs add column if not exists biotin_mcg numeric;
alter table public.food_logs add column if not exists folate_mcg numeric;
alter table public.food_logs add column if not exists vit_b12_mcg numeric;
alter table public.food_logs add column if not exists choline_mg numeric;
alter table public.food_logs add column if not exists magnesium_mg numeric;
alter table public.food_logs add column if not exists phosphorus_mg numeric;
alter table public.food_logs add column if not exists zinc_mg numeric;
alter table public.food_logs add column if not exists copper_mg numeric;
alter table public.food_logs add column if not exists manganese_mg numeric;
alter table public.food_logs add column if not exists selenium_mcg numeric;
alter table public.food_logs add column if not exists iodine_mcg numeric;
alter table public.food_logs add column if not exists chromium_mcg numeric;
alter table public.food_logs add column if not exists molybdenum_mcg numeric;
alter table public.food_logs add column if not exists fluoride_mg numeric;
alter table public.food_logs add column if not exists caffeine_mg numeric;
alter table public.food_logs add column if not exists alcohol_g numeric;

-- ───────────────────────────── Water ─────────────────────────────
-- One row per glass/bottle you log. Private, like the food log.
create table if not exists public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  logged_on date not null,
  ml integer not null check (ml > 0 and ml <= 5000),
  created_at timestamptz not null default now()
);

create index if not exists water_logs_user_day_idx on public.water_logs (user_id, logged_on);

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
alter table public.water_logs enable row level security;

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
grant select, insert, update, delete on public.foods, public.food_logs, public.water_logs to authenticated;
grant select, insert on public.invites to authenticated;
revoke all on public.foods, public.food_logs, public.water_logs, public.invites, public.profiles from anon;

-- Goals are private: other members can only read your id and display name.
-- Your own goals are read through my_profile() below.
revoke select on public.profiles from authenticated;
grant select (id, display_name) on public.profiles to authenticated;
grant update (display_name, goal_mode, kcal_goal, protein_goal, carbs_goal, fat_goal, water_goal_ml,
  sex, birth_year, height_cm, weight_kg, activity) on public.profiles to authenticated;

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

-- Water log: strictly private.
drop policy if exists "own water" on public.water_logs;
create policy "own water" on public.water_logs
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
  k text;
  v text;
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
      serving_label = coalesce(nullif(fixes ->> 'serving_label', ''), serving_label)
    where id = food_id;
    -- Nutrient fixes: any numeric nutrient column (kcal, *_g, *_mg, *_mcg).
    -- Calories and macros can't be emptied; the others can.
    for k, v in select key, value from jsonb_each_text(fixes) loop
      if (k = 'kcal' or k ~ '^[a-z0-9_]+_(g|mg|mcg)$')
        and exists (
          select 1 from information_schema.columns
          where table_schema = 'public' and table_name = 'foods' and column_name = k and data_type = 'numeric'
        )
        and not (v is null and k in ('kcal', 'protein_g', 'carbs_g', 'fat_g'))
      then
        execute format('update public.foods set %I = $1 where id = $2', k) using v::numeric, food_id;
      end if;
    end loop;
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
