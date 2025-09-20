-- School terms configuration per school
CREATE TABLE IF NOT EXISTS school_terms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
  year INTEGER NOT NULL CHECK (year >= 2020),
  term INTEGER NOT NULL CHECK (term IN (1,2,3)),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (school_id, year, term)
);

ALTER TABLE school_terms ENABLE ROW LEVEL SECURITY;

-- Admin manage; owner all
DROP POLICY IF EXISTS "terms admin manage" ON school_terms;
CREATE POLICY "terms admin manage" ON school_terms
FOR ALL TO authenticated
USING (
  school_id IN (SELECT school_id FROM schools WHERE admin_id = auth.uid())
)
WITH CHECK (
  school_id IN (SELECT school_id FROM schools WHERE admin_id = auth.uid())
);

DROP POLICY IF EXISTS "terms owner all" ON school_terms;
CREATE POLICY "terms owner all" ON school_terms
FOR ALL TO authenticated
USING ((SELECT role FROM users WHERE user_id = auth.uid()) = 'owner')
WITH CHECK ((SELECT role FROM users WHERE user_id = auth.uid()) = 'owner');

CREATE INDEX IF NOT EXISTS idx_terms_school_year_term ON school_terms(school_id, year, term);


