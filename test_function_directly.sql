-- Test the function directly to see the exact error
SELECT public.register_school_admin_with_referral(
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,  -- test user_id
  'test@example.com',                              -- email
  'Test Admin',                                    -- name
  '+1234567890',                                   -- phone
  'Test School',                                   -- school_name
  'Test Location',                                 -- school_location
  'Nursery/Primary',                              -- school_type
  'df927d20-9891-4e43-837a-53cefbd5d31c'::uuid   -- your referral_code_id
);