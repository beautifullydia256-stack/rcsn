-- STEP 8: Add RLS Policies for Messages
-- Run this after Step 7 succeeds

-- Drop existing policies if they exist (safe to re-run)
DROP POLICY IF EXISTS "messages_user_view" ON messages;
DROP POLICY IF EXISTS "messages_user_send" ON messages;
DROP POLICY IF EXISTS "messages_user_update" ON messages;

-- RLS Policy: Users can view messages sent to or from them
CREATE POLICY "messages_user_view" ON messages
  FOR SELECT
  TO authenticated
  USING (
    recipient_id = auth.uid() 
    OR sender_id = auth.uid()
    OR (
      recipient_type = 'teacher' AND recipient_id IN (
        SELECT teacher_id FROM teachers 
        WHERE school_id IN (
          SELECT school_id FROM users WHERE user_id = auth.uid()
        )
      )
    )
  );

-- RLS Policy: Users can send messages
CREATE POLICY "messages_user_send" ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    OR (
      sender_type = 'admin' AND sender_id IN (
        SELECT user_id FROM users 
        WHERE role = 'admin' 
        AND school_id IN (
          SELECT school_id FROM users WHERE user_id = auth.uid()
        )
      )
    )
  );

-- RLS Policy: Users can mark their messages as read
CREATE POLICY "messages_user_update" ON messages
  FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

