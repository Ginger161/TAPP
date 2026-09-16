-- Fix RLS Infinite Recursion
-- 
-- The previous RLS policies caused an infinite recursion error because querying the `users`
-- table from within the `users` table's own RLS policy creates a loop. Postgres does not 
-- guarantee short-circuiting on OR conditions, so it gets stuck.
-- 
-- This script creates a SECURITY DEFINER function to bypass RLS when looking up a user's role,
-- and then updates ALL policies across the database to use this function safely.

-- 1. Create a secure function to fetch the user's role bypassing RLS
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.users WHERE id = auth.uid();
$$;

-- 2. Drop the broken policies on the users table
DROP POLICY IF EXISTS "admin_all_users" ON public.users;
DROP POLICY IF EXISTS "viewer_select_users" ON public.users;
DROP POLICY IF EXISTS "manager_select_users" ON public.users;

-- 3. Recreate the users table policies using the secure function
CREATE POLICY "admin_all_users" ON public.users
  FOR ALL TO authenticated
  USING (
    id = auth.uid() OR 
    public.get_auth_role() = 'admin'
  );

CREATE POLICY "viewer_select_users" ON public.users
  FOR SELECT TO authenticated
  USING (
    id = auth.uid() OR
    public.get_auth_role() = 'viewer'
  );

CREATE POLICY "manager_select_users" ON public.users
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
  );

-- 4. Update ALL other tables to use the secure function instead of the raw subquery

-- stations
DROP POLICY IF EXISTS "admin_all_stations" ON public.stations;
DROP POLICY IF EXISTS "viewer_select_stations" ON public.stations;
DROP POLICY IF EXISTS "manager_select_stations" ON public.stations;

CREATE POLICY "admin_all_stations" ON public.stations FOR ALL TO authenticated USING (public.get_auth_role() = 'admin');
CREATE POLICY "viewer_select_stations" ON public.stations FOR SELECT TO authenticated USING (public.get_auth_role() = 'viewer');
CREATE POLICY "manager_select_stations" ON public.stations FOR SELECT TO authenticated USING (
  id IN (SELECT station_id FROM public.station_assignments WHERE user_id = auth.uid())
);

-- products
DROP POLICY IF EXISTS "admin_all_products" ON public.products;
DROP POLICY IF EXISTS "viewer_select_products" ON public.products;
DROP POLICY IF EXISTS "manager_select_products" ON public.products;

CREATE POLICY "admin_all_products" ON public.products FOR ALL TO authenticated USING (public.get_auth_role() = 'admin');
CREATE POLICY "viewer_select_products" ON public.products FOR SELECT TO authenticated USING (public.get_auth_role() = 'viewer');
CREATE POLICY "manager_select_products" ON public.products FOR SELECT TO authenticated USING (true);

-- station_assignments
DROP POLICY IF EXISTS "admin_all_assignments" ON public.station_assignments;
DROP POLICY IF EXISTS "viewer_select_assignments" ON public.station_assignments;
DROP POLICY IF EXISTS "manager_select_assignments" ON public.station_assignments;

CREATE POLICY "admin_all_assignments" ON public.station_assignments FOR ALL TO authenticated USING (public.get_auth_role() = 'admin');
CREATE POLICY "viewer_select_assignments" ON public.station_assignments FOR SELECT TO authenticated USING (public.get_auth_role() = 'viewer');
CREATE POLICY "manager_select_assignments" ON public.station_assignments FOR SELECT TO authenticated USING (user_id = auth.uid());

-- supply_transactions
DROP POLICY IF EXISTS "admin_all_supply" ON public.supply_transactions;
DROP POLICY IF EXISTS "viewer_select_supply" ON public.supply_transactions;
DROP POLICY IF EXISTS "manager_select_supply" ON public.supply_transactions;

CREATE POLICY "admin_all_supply" ON public.supply_transactions FOR ALL TO authenticated USING (public.get_auth_role() = 'admin');
CREATE POLICY "viewer_select_supply" ON public.supply_transactions FOR SELECT TO authenticated USING (public.get_auth_role() = 'viewer');
CREATE POLICY "manager_select_supply" ON public.supply_transactions FOR SELECT TO authenticated USING (
  station_id IN (SELECT station_id FROM public.station_assignments WHERE user_id = auth.uid())
);

-- sales_transactions
DROP POLICY IF EXISTS "admin_all_sales" ON public.sales_transactions;
DROP POLICY IF EXISTS "viewer_select_sales" ON public.sales_transactions;
DROP POLICY IF EXISTS "manager_all_sales" ON public.sales_transactions;

CREATE POLICY "admin_all_sales" ON public.sales_transactions FOR ALL TO authenticated USING (public.get_auth_role() = 'admin');
CREATE POLICY "viewer_select_sales" ON public.sales_transactions FOR SELECT TO authenticated USING (public.get_auth_role() = 'viewer');
CREATE POLICY "manager_all_sales" ON public.sales_transactions FOR ALL TO authenticated USING (
  station_id IN (SELECT station_id FROM public.station_assignments WHERE user_id = auth.uid())
);

-- expenses
DROP POLICY IF EXISTS "admin_all_expenses" ON public.expenses;
DROP POLICY IF EXISTS "viewer_select_expenses" ON public.expenses;
DROP POLICY IF EXISTS "manager_all_expenses" ON public.expenses;

CREATE POLICY "admin_all_expenses" ON public.expenses FOR ALL TO authenticated USING (public.get_auth_role() = 'admin');
CREATE POLICY "viewer_select_expenses" ON public.expenses FOR SELECT TO authenticated USING (public.get_auth_role() = 'viewer');
CREATE POLICY "manager_all_expenses" ON public.expenses FOR ALL TO authenticated USING (
  station_id IN (SELECT station_id FROM public.station_assignments WHERE user_id = auth.uid())
);



-- corrections
DROP POLICY IF EXISTS "admin_all_corrections" ON public.corrections;
DROP POLICY IF EXISTS "viewer_select_corrections" ON public.corrections;

CREATE POLICY "admin_all_corrections" ON public.corrections FOR ALL TO authenticated USING (public.get_auth_role() = 'admin');
CREATE POLICY "viewer_select_corrections" ON public.corrections FOR SELECT TO authenticated USING (public.get_auth_role() = 'viewer');

-- notifications
DROP POLICY IF EXISTS "all_select_notifications" ON public.notifications;
DROP POLICY IF EXISTS "all_update_notifications" ON public.notifications;

CREATE POLICY "all_select_notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "all_update_notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- audit_log
DROP POLICY IF EXISTS "admin_all_audit" ON public.audit_log;
DROP POLICY IF EXISTS "viewer_select_audit" ON public.audit_log;

CREATE POLICY "admin_all_audit" ON public.audit_log FOR ALL TO authenticated USING (public.get_auth_role() = 'admin');
CREATE POLICY "viewer_select_audit" ON public.audit_log FOR SELECT TO authenticated USING (public.get_auth_role() = 'viewer');
