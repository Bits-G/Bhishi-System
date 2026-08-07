-- ============================================================
-- FIX: "stack depth limit exceeded" error on Attendance/Payments updates
-- Run this in Supabase Dashboard > SQL Editor > New Query > Run
-- Safe to run anytime — it only replaces one function, no data is touched.
-- ============================================================

create or replace function current_role_name()
returns user_role
language sql stable security definer set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;
