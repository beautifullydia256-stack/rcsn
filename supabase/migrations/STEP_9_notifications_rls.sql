-- STEP 9: Add RLS Policies for Notifications (FINAL STEP)
-- Run this after Step 8 succeeds

-- Drop existing policies if they exist (safe to re-run)
DROP POLICY IF EXISTS "notifications_user_view" ON notifications;
DROP POLICY IF EXISTS "notifications_system_create" ON notifications;
DROP POLICY IF EXISTS "notifications_user_update" ON notifications;

-- RLS Policy: Users can view their own notifications
-- Simple: user_id in notifications matches users.user_id (auth.uid())
CREATE POLICY "notifications_user_view" ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policy: System can create notifications (handled by service role)
-- This allows authenticated users to create notifications, but should be restricted in app code
CREATE POLICY "notifications_system_create" ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Will be restricted by service role in application code

-- RLS Policy: Users can mark their own notifications as read
CREATE POLICY "notifications_user_update" ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

