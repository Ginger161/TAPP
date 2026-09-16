-- Phase 1: Database Schema and RLS for TAPP

-- 1. Create Enums
CREATE TYPE user_role AS ENUM ('manager', 'admin', 'viewer');
CREATE TYPE supply_status AS ENUM ('pending', 'accepted', 'rejected');

-- 2. Create Tables

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'viewer',
    can_supply BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE station_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, station_id)
);

CREATE TABLE supply_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    cost_price NUMERIC NOT NULL CHECK (cost_price >= 0),
    supplier TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    initiator_id UUID NOT NULL REFERENCES users(id),
    status supply_status NOT NULL DEFAULT 'pending',
    accepted_by_id UUID REFERENCES users(id),
    accepted_at TIMESTAMPTZ,
    actual_volume_received NUMERIC CHECK (actual_volume_received >= 0),
    admin_resolved_discrepancy BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sales_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    quantity_sold NUMERIC NOT NULL CHECK (quantity_sold > 0),
    selling_price NUMERIC NOT NULL CHECK (selling_price >= 0),
    submitted_by_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    expense_type TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    photo_url TEXT,
    submitted_by_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    original_value JSONB NOT NULL,
    new_value JSONB NOT NULL,
    corrected_by_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE urgency_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    green_threshold NUMERIC NOT NULL DEFAULT 7,
    yellow_threshold NUMERIC NOT NULL DEFAULT 3,
    red_threshold NUMERIC NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pnl_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INT NOT NULL,
    gross_profit NUMERIC NOT NULL,
    net_profit NUMERIC NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Stock Ledger View (Recursive CTE for Weighted Average Cost)
CREATE OR REPLACE VIEW stock_ledger AS
WITH RECURSIVE txns AS (
    SELECT 
        'supply' as type,
        station_id,
        product_id,
        COALESCE(actual_volume_received, quantity) as quantity,
        cost_price,
        accepted_at as txn_time
    FROM supply_transactions
    WHERE status = 'accepted'
    UNION ALL
    SELECT 
        'sale' as type,
        station_id,
        product_id,
        -quantity_sold as quantity,
        0 as cost_price,
        created_at as txn_time
    FROM sales_transactions
),
ordered_txns AS (
    SELECT *,
           ROW_NUMBER() OVER (PARTITION BY station_id, product_id ORDER BY txn_time ASC) as rn
    FROM txns
),
running_calc AS (
    -- Base case: first transaction
    SELECT 
        rn,
        station_id,
        product_id,
        type,
        quantity as change_qty,
        cost_price as change_cost,
        quantity as current_qty,
        cost_price as current_avg_cost
    FROM ordered_txns
    WHERE rn = 1

    UNION ALL

    -- Recursive step
    SELECT 
        ot.rn,
        ot.station_id,
        ot.product_id,
        ot.type,
        ot.quantity as change_qty,
        ot.cost_price as change_cost,
        -- New quantity
        rc.current_qty + ot.quantity as current_qty,
        -- New average cost
        CASE 
            WHEN ot.type = 'supply' THEN
                CASE WHEN (rc.current_qty + ot.quantity) > 0 THEN
                    ((rc.current_qty * rc.current_avg_cost) + (ot.quantity * ot.cost_price)) / (rc.current_qty + ot.quantity)
                ELSE 0 END
            ELSE
                rc.current_avg_cost
        END as current_avg_cost
    FROM ordered_txns ot
    JOIN running_calc rc ON ot.station_id = rc.station_id 
                         AND ot.product_id = rc.product_id 
                         AND ot.rn = rc.rn + 1
),
latest_calc AS (
    SELECT 
        station_id,
        product_id,
        current_qty,
        current_avg_cost,
        ROW_NUMBER() OVER (PARTITION BY station_id, product_id ORDER BY rn DESC) as rev_rn
    FROM running_calc
)
SELECT 
    s.id as station_id,
    p.id as product_id,
    COALESCE(lc.current_qty, 0) as quantity,
    COALESCE(lc.current_avg_cost, 0) as average_cost
FROM stations s
CROSS JOIN products p
LEFT JOIN latest_calc lc ON lc.station_id = s.id AND lc.product_id = p.id AND lc.rev_rn = 1;


-- 4. RLS Helper Functions
CREATE OR REPLACE FUNCTION current_user_role() RETURNS text AS $$
  SELECT role::text FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_user_can_supply() RETURNS boolean AS $$
  SELECT can_supply FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_user_assigned_stations() RETURNS SETOF uuid AS $$
  SELECT station_id FROM public.station_assignments WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean AS $$
  SELECT current_user_role() = 'admin';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_viewer() RETURNS boolean AS $$
  SELECT current_user_role() = 'viewer';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_manager() RETURNS boolean AS $$
  SELECT current_user_role() = 'manager';
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- 5. Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE urgency_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE pnl_snapshots ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies

-- organizations
CREATE POLICY "organizations_select" ON organizations FOR SELECT TO authenticated USING (true);
CREATE POLICY "organizations_all_admin" ON organizations FOR ALL TO authenticated USING (is_admin());

-- stations
CREATE POLICY "stations_select" ON stations FOR SELECT TO authenticated USING (true);
CREATE POLICY "stations_all_admin" ON stations FOR ALL TO authenticated USING (is_admin());

-- products
CREATE POLICY "products_select" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products_all_admin" ON products FOR ALL TO authenticated USING (is_admin());

-- users
CREATE POLICY "users_select" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_all_admin" ON users FOR ALL TO authenticated USING (is_admin());

-- station_assignments
CREATE POLICY "station_assignments_select" ON station_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "station_assignments_all_admin" ON station_assignments FOR ALL TO authenticated USING (is_admin());

-- supply_transactions
CREATE POLICY "supply_select" ON supply_transactions FOR SELECT TO authenticated USING (
    is_admin() OR is_viewer() OR (is_manager() AND station_id IN (SELECT current_user_assigned_stations()))
);
CREATE POLICY "supply_insert" ON supply_transactions FOR INSERT TO authenticated WITH CHECK (
    is_admin() OR 
    (is_viewer() AND current_user_can_supply()) OR 
    (is_manager() AND station_id IN (SELECT current_user_assigned_stations()))
);
CREATE POLICY "supply_update" ON supply_transactions FOR UPDATE TO authenticated USING (
    is_admin() OR (is_manager() AND station_id IN (SELECT current_user_assigned_stations()))
);
CREATE POLICY "supply_delete" ON supply_transactions FOR DELETE TO authenticated USING (is_admin());

-- sales_transactions
CREATE POLICY "sales_select" ON sales_transactions FOR SELECT TO authenticated USING (
    is_admin() OR is_viewer() OR (is_manager() AND station_id IN (SELECT current_user_assigned_stations()))
);
CREATE POLICY "sales_insert" ON sales_transactions FOR INSERT TO authenticated WITH CHECK (
    is_admin() OR (is_manager() AND station_id IN (SELECT current_user_assigned_stations()))
);
CREATE POLICY "sales_update" ON sales_transactions FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "sales_delete" ON sales_transactions FOR DELETE TO authenticated USING (is_admin());

-- expenses
CREATE POLICY "expenses_select" ON expenses FOR SELECT TO authenticated USING (
    is_admin() OR is_viewer() OR (is_manager() AND station_id IN (SELECT current_user_assigned_stations()))
);
CREATE POLICY "expenses_insert" ON expenses FOR INSERT TO authenticated WITH CHECK (
    is_admin() OR (is_manager() AND station_id IN (SELECT current_user_assigned_stations()))
);
CREATE POLICY "expenses_update" ON expenses FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "expenses_delete" ON expenses FOR DELETE TO authenticated USING (is_admin());

-- corrections
CREATE POLICY "corrections_select" ON corrections FOR SELECT TO authenticated USING (is_admin() OR is_viewer());
CREATE POLICY "corrections_insert" ON corrections FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "corrections_update" ON corrections FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "corrections_delete" ON corrections FOR DELETE TO authenticated USING (is_admin());

-- urgency_config
CREATE POLICY "urgency_config_select" ON urgency_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "urgency_config_all_admin" ON urgency_config FOR ALL TO authenticated USING (is_admin());

-- notifications
CREATE POLICY "notifications_select" ON notifications FOR SELECT TO authenticated USING (
    recipient_id = auth.uid() OR is_admin() OR 
    (is_manager() AND station_id IN (SELECT current_user_assigned_stations()))
);
CREATE POLICY "notifications_all_admin" ON notifications FOR ALL TO authenticated USING (is_admin());

-- audit_log
CREATE POLICY "audit_log_select" ON audit_log FOR SELECT TO authenticated USING (is_admin() OR is_viewer());
CREATE POLICY "audit_log_insert" ON audit_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "audit_log_update" ON audit_log FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "audit_log_delete" ON audit_log FOR DELETE TO authenticated USING (is_admin());

-- pnl_snapshots
CREATE POLICY "pnl_snapshots_select" ON pnl_snapshots FOR SELECT TO authenticated USING (
    is_admin() OR is_viewer() OR (is_manager() AND station_id IN (SELECT current_user_assigned_stations()))
);
CREATE POLICY "pnl_snapshots_all_admin" ON pnl_snapshots FOR ALL TO authenticated USING (is_admin());
