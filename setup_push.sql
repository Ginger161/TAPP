-- 1. Create push_subscriptions table
CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Enable RLS and add policies
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own subscriptions" 
    ON push_subscriptions FOR ALL 
    TO authenticated 
    USING (user_id = auth.uid()) 
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can read all subscriptions" 
    ON push_subscriptions FOR SELECT 
    TO authenticated 
    USING (is_admin());

-- 3. Enable Realtime Broadcasting
ALTER PUBLICATION supabase_realtime ADD TABLE supply_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
