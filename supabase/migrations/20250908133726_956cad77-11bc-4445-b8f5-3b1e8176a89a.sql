-- Helper functions to safely check roles without recursive RLS
create or replace function public.is_admin(_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = _uid and p.role = 'admin'
  );
$$;

create or replace function public.is_staff(_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = _uid and p.role = 'staff'
  );
$$;

-- Allow admins and staff to view all profiles
create policy "Admins and staff can view all profiles"
on public.profiles
for select
to authenticated
using (public.is_admin(auth.uid()) or public.is_staff(auth.uid()));

-- Allow only admins to update any profile (e.g., role/status changes)
create policy "Admins can update any profile"
on public.profiles
for update
to authenticated
using (public.is_admin(auth.uid()));