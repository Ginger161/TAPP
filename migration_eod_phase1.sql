-- Phase 1 EOD Database Migration

-- 1. Create pump_logs table
CREATE TABLE IF NOT EXISTS pump_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    pump_id TEXT NOT NULL,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    opening_meter NUMERIC NOT NULL,
    closing_meter NUMERIC NOT NULL,
    rtt NUMERIC NOT NULL DEFAULT 0,
    override_reason TEXT,
    net_volume NUMERIC NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS policies for pump_logs
ALTER TABLE pump_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pump_logs_select" ON pump_logs FOR SELECT TO authenticated USING (
    is_admin() OR is_viewer() OR (is_manager() AND station_id IN (SELECT current_user_assigned_stations()))
);
CREATE POLICY "pump_logs_insert" ON pump_logs FOR INSERT TO authenticated WITH CHECK (
    is_admin() OR (is_manager() AND station_id IN (SELECT current_user_assigned_stations()))
);
CREATE POLICY "pump_logs_update" ON pump_logs FOR UPDATE TO authenticated USING (
    is_admin() OR (is_manager() AND station_id IN (SELECT current_user_assigned_stations()))
);

-- 2. Alter sales_transactions table to add price_tiers
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS price_tiers JSONB;

-- 3. Create tank_dippings table
CREATE TABLE IF NOT EXISTS tank_dippings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    tank_id TEXT NOT NULL,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    dipped_volume NUMERIC NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS policies for tank_dippings
ALTER TABLE tank_dippings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tank_dippings_select" ON tank_dippings FOR SELECT TO authenticated USING (
    is_admin() OR is_viewer() OR (is_manager() AND station_id IN (SELECT current_user_assigned_stations()))
);
CREATE POLICY "tank_dippings_insert" ON tank_dippings FOR INSERT TO authenticated WITH CHECK (
    is_admin() OR (is_manager() AND station_id IN (SELECT current_user_assigned_stations()))
);
CREATE POLICY "tank_dippings_update" ON tank_dippings FOR UPDATE TO authenticated USING (
    is_admin() OR (is_manager() AND station_id IN (SELECT current_user_assigned_stations()))
);

-- 4. Create daily_remittance table
CREATE TABLE IF NOT EXISTS daily_remittance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gross_revenue NUMERIC NOT NULL,
    total_expenses NUMERIC NOT NULL,
    pos_to_account NUMERIC NOT NULL,
    cash_to_bank NUMERIC NOT NULL,
    balance_due NUMERIC NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS policies for daily_remittance
ALTER TABLE daily_remittance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_remittance_select" ON daily_remittance FOR SELECT TO authenticated USING (
    is_admin() OR is_viewer() OR (is_manager() AND station_id IN (SELECT current_user_assigned_stations()))
);
CREATE POLICY "daily_remittance_insert" ON daily_remittance FOR INSERT TO authenticated WITH CHECK (
    is_admin() OR (is_manager() AND station_id IN (SELECT current_user_assigned_stations()))
);
CREATE POLICY "daily_remittance_update" ON daily_remittance FOR UPDATE TO authenticated USING (
    is_admin() OR (is_manager() AND station_id IN (SELECT current_user_assigned_stations()))
);
