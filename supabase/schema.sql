-- ============================================================
-- BHISHI MANAGEMENT SYSTEM — SUPABASE SCHEMA
-- Run this whole file in Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- 1. ROLE ENUM (3 portals = 3 roles)
create type user_role as enum ('master_admin', 'admin', 'viewer');

-- 2. PROFILES table — every login user (master-admin / admin) gets a row here.
--    Public viewers do NOT need an account — the viewer website is public read-only.
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  role user_role not null default 'admin',
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default now()
);

-- 3. MEMBERS (144 log)
create table members (
  id serial primary key,
  sr_no int,
  district text,
  member_name text not null,
  dob date,
  whatsapp_no text,
  mobile_no text,
  alot_number int unique not null,
  photo_url text,
  created_at timestamp with time zone default now()
);

-- 4. ATTENDANCE (Phase 1)
create table attendance (
  id serial primary key,
  member_id int references members(id) on delete cascade,
  month text not null, -- format 'YYYY-MM' e.g. '2026-08'
  status text not null check (status in ('present','absent')),
  marked_at timestamp with time zone default now(),
  unique(member_id, month)
);

-- 5. EVENTS / TOPICS (Phase 2)
create table events (
  id serial primary key,
  month text not null,
  place text,
  topic text,
  description text,
  created_at timestamp with time zone default now()
);

-- 6. GALLERY (Phase 3)
create table gallery (
  id serial primary key,
  month text,
  type text check (type in ('photo','video')),
  url text not null, -- cloudinary secure_url
  public_id text,     -- cloudinary public_id (needed to delete later)
  caption text,
  uploaded_at timestamp with time zone default now()
);

-- 7. PAYMENTS (Phase 4) — 12 months x 144 members
create table payments (
  id serial primary key,
  member_id int references members(id) on delete cascade,
  month text not null,
  status text not null default 'unpaid' check (status in ('paid','unpaid')),
  amount int not null default 10000,
  updated_at timestamp with time zone default now(),
  unique(member_id, month)
);

-- 8. WINNERS (Phase 5 + 6) — member_id is UNIQUE so nobody wins twice, ever.
create table winners (
  id serial primary key,
  member_id int references members(id) on delete cascade unique,
  month text not null,
  business_designation text,
  won_at timestamp with time zone default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table profiles enable row level security;
alter table members enable row level security;
alter table attendance enable row level security;
alter table events enable row level security;
alter table gallery enable row level security;
alter table payments enable row level security;
alter table winners enable row level security;

-- Helper function: get current logged-in user's role
create or replace function current_role_name()
returns user_role
language sql stable
as $$
  select role from profiles where id = auth.uid();
$$;

-- ---- PROFILES policies ----
-- Master-admin can see/manage all profiles. Admins can see only their own.
create policy "master_admin_full_profiles" on profiles
  for all using (current_role_name() = 'master_admin');

create policy "own_profile_read" on profiles
  for select using (id = auth.uid());

-- ---- DATA TABLES (members, attendance, events, gallery, payments, winners) ----
-- Rule: PUBLIC (anon, no login) can only SELECT (read) -> powers the public viewer website.
-- Rule: logged-in 'admin' or 'master_admin' can INSERT/UPDATE/DELETE.

-- MEMBERS
create policy "public_read_members" on members for select using (true);
create policy "staff_write_members" on members for insert
  with check (current_role_name() in ('admin','master_admin'));
create policy "staff_update_members" on members for update
  using (current_role_name() in ('admin','master_admin'));
create policy "staff_delete_members" on members for delete
  using (current_role_name() in ('admin','master_admin'));

-- ATTENDANCE
create policy "public_read_attendance" on attendance for select using (true);
create policy "staff_write_attendance" on attendance for insert
  with check (current_role_name() in ('admin','master_admin'));
create policy "staff_update_attendance" on attendance for update
  using (current_role_name() in ('admin','master_admin'));
create policy "staff_delete_attendance" on attendance for delete
  using (current_role_name() in ('admin','master_admin'));

-- EVENTS
create policy "public_read_events" on events for select using (true);
create policy "staff_write_events" on events for insert
  with check (current_role_name() in ('admin','master_admin'));
create policy "staff_update_events" on events for update
  using (current_role_name() in ('admin','master_admin'));
create policy "staff_delete_events" on events for delete
  using (current_role_name() in ('admin','master_admin'));

-- GALLERY
create policy "public_read_gallery" on gallery for select using (true);
create policy "staff_write_gallery" on gallery for insert
  with check (current_role_name() in ('admin','master_admin'));
create policy "staff_update_gallery" on gallery for update
  using (current_role_name() in ('admin','master_admin'));
create policy "staff_delete_gallery" on gallery for delete
  using (current_role_name() in ('admin','master_admin'));

-- PAYMENTS
create policy "public_read_payments" on payments for select using (true);
create policy "staff_write_payments" on payments for insert
  with check (current_role_name() in ('admin','master_admin'));
create policy "staff_update_payments" on payments for update
  using (current_role_name() in ('admin','master_admin'));
create policy "staff_delete_payments" on payments for delete
  using (current_role_name() in ('admin','master_admin'));

-- WINNERS
create policy "public_read_winners" on winners for select using (true);
create policy "staff_write_winners" on winners for insert
  with check (current_role_name() in ('admin','master_admin'));
create policy "staff_update_winners" on winners for update
  using (current_role_name() in ('admin','master_admin'));
create policy "staff_delete_winners" on winners for delete
  using (current_role_name() in ('admin','master_admin'));

-- ============================================================
-- FIRST MASTER ADMIN — run this AFTER you sign up your first user
-- via Supabase Dashboard > Authentication > Add User (see README step 5).
-- Replace the UUID below with that user's UUID from the Auth dashboard.
-- ============================================================
-- insert into profiles (id, full_name, role)
-- values ('PASTE-USER-UUID-HERE', 'Master Admin Name', 'master_admin');
