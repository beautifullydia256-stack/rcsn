-- ============================================================================
-- SCHOOL FEE STRUCTURE
-- Manage tuition fees per class and admission fees
-- ============================================================================

-- Create school_fee_structure table
CREATE TABLE IF NOT EXISTS school_fee_structure (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(school_id) ON DELETE CASCADE NOT NULL,
  class_name TEXT NOT NULL,
  tuition_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(school_id, class_name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_school_fee_structure_school ON school_fee_structure(school_id);
CREATE INDEX IF NOT EXISTS idx_school_fee_structure_class ON school_fee_structure(class_name);

-- Enable Row Level Security
ALTER TABLE school_fee_structure ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admin can manage their school's fee structure
CREATE POLICY "school_fee_structure_admin_all" ON school_fee_structure
FOR ALL TO authenticated
USING (
  school_id IN (SELECT school_id FROM schools WHERE admin_id = auth.uid())
)
WITH CHECK (
  school_id IN (SELECT school_id FROM schools WHERE admin_id = auth.uid())
);

-- School users can view their school's fee structure
CREATE POLICY "school_fee_structure_users_select" ON school_fee_structure
FOR SELECT TO authenticated
USING (
  school_id IN (SELECT u.school_id FROM users u WHERE u.user_id = auth.uid())
);

-- Owner can see all
CREATE POLICY "school_fee_structure_owner_all" ON school_fee_structure
FOR ALL TO authenticated
USING ((SELECT role FROM users WHERE user_id = auth.uid()) = 'owner');

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_fee_structure_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_fee_structure_timestamp ON school_fee_structure;
CREATE TRIGGER trigger_update_fee_structure_timestamp
  BEFORE UPDATE ON school_fee_structure
  FOR EACH ROW
  EXECUTE FUNCTION update_fee_structure_timestamp();

-- Add comment
COMMENT ON TABLE school_fee_structure IS 'Tuition fees per class and admission fees for each school';
COMMENT ON COLUMN school_fee_structure.class_name IS 'Class name or ADMISSION for admission fee';
COMMENT ON COLUMN school_fee_structure.tuition_amount IS 'Annual tuition amount or one-time admission fee in UGX';

-- ============================================================================
-- COMPLETE
-- ============================================================================

