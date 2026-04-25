-- Test migration syntax validation
-- This file tests the key parts of the migration without actually running it

-- Test 1: Check if all referenced tables exist
DO $$
BEGIN
  -- Check if required tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schools' AND table_schema = 'public') THEN
    RAISE NOTICE 'schools table does not exist';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
    RAISE NOTICE 'users table does not exist';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments' AND table_schema = 'public') THEN
    RAISE NOTICE 'payments table does not exist';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'students' AND table_schema = 'public') THEN
    RAISE NOTICE 'students table does not exist';
  END IF;
  
  RAISE NOTICE 'Table existence check completed';
END;
$$;

-- Test 2: Check if required columns exist
DO $$
BEGIN
  -- Check users table columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_active' AND table_schema = 'public') THEN
    RAISE NOTICE 'users.is_active column does not exist';
  END IF;
  
  -- Check payments table columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'amount' AND table_schema = 'public') THEN
    RAISE NOTICE 'payments.amount column does not exist';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'created_at' AND table_schema = 'public') THEN
    RAISE NOTICE 'payments.created_at column does not exist';
  END IF;
  
  RAISE NOTICE 'Column existence check completed';
END;
$$;