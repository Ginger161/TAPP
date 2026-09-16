-- Allow users to update their own notifications (to mark as read)
CREATE POLICY "notifications_update" ON notifications FOR UPDATE TO authenticated USING (
    recipient_id = auth.uid() OR is_admin()
);
