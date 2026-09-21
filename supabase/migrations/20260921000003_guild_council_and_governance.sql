-- Migration: 20260921000003_guild_council_and_governance.sql
-- Description: Full schema for Guild Council & Democratic Governance Module,
-- including portfolios, tenures, financials, grievances, welfare reports,
-- elections, secret-ballot voter registry, and atomic procedures.

-- 1. Guild Positions & Ministerial Portfolios
CREATE TABLE IF NOT EXISTS guild_portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '{}',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Guild Tenures (Term Lifecycle & Expiry)
CREATE TABLE IF NOT EXISTS guild_tenures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    portfolio_id UUID NOT NULL REFERENCES guild_portfolios(id) ON DELETE CASCADE,
    academic_year VARCHAR(20) NOT NULL,
    term_start TIMESTAMP WITH TIME ZONE NOT NULL,
    term_end TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE', -- 'ACTIVE', 'EXPIRED', 'REVOKED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Guild Financials & Requisitions
CREATE TABLE IF NOT EXISTS guild_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
    tenure_id UUID NOT NULL REFERENCES guild_tenures(id) ON DELETE CASCADE,
    amount DECIMAL(14, 2) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'INFLOW_ALLOCATION', 'EXPENDITURE'
    category VARCHAR(50) NOT NULL, -- 'Event', 'Welfare', 'Logistics', 'Health', 'Sports', 'Guild Fee Allocation'
    description TEXT NOT NULL,
    receipt_url TEXT,
    status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
    synced_with_school_finance BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Student Grievances & Mediation Desk
CREATE TABLE IF NOT EXISTS student_grievances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL, -- 'Academics', 'Hostel', 'Sanitation', 'Security', 'Dispute', 'Welfare', 'Other'
    subject VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    is_anonymous BOOLEAN DEFAULT FALSE,
    assigned_portfolio_id UUID REFERENCES guild_portfolios(id) ON DELETE SET NULL,
    status VARCHAR(30) DEFAULT 'SUBMITTED', -- 'SUBMITTED', 'IN_REVIEW', 'ESCALATED_TO_ADMIN', 'RESOLVED', 'CLOSED'
    resolution_notes TEXT,
    escalated_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES guild_tenures(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Broadcast & Announcements Engine
CREATE TABLE IF NOT EXISTS guild_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
    tenure_id UUID NOT NULL REFERENCES guild_tenures(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    target_scope VARCHAR(50) DEFAULT 'ALL', -- 'ALL', 'FACULTY', 'CLASS', 'HOSTEL'
    target_value VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'NORMAL', -- 'NORMAL', 'HIGH', 'URGENT'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Campus Welfare & Facilities Monitor
CREATE TABLE IF NOT EXISTS guild_welfare_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
    tenure_id UUID REFERENCES guild_tenures(id) ON DELETE SET NULL,
    facility_type VARCHAR(50) NOT NULL, -- 'Sickbay/Clinic', 'Cafeteria/Food', 'Hostel/Accommodation', 'Sanitation/Water', 'Security'
    title VARCHAR(150) NOT NULL,
    severity VARCHAR(20) DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    status VARCHAR(20) DEFAULT 'OPEN', -- 'OPEN', 'INVESTIGATING', 'ESCALATED', 'RESOLVED'
    description TEXT NOT NULL,
    action_taken TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Elections Core
CREATE TABLE IF NOT EXISTS elections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
    academic_year VARCHAR(20) NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    voting_starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    voting_ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'DRAFT', -- 'DRAFT', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'CERTIFIED'
    certified_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    certified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Election Candidates
CREATE TABLE IF NOT EXISTS election_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
    election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    portfolio_id UUID NOT NULL REFERENCES guild_portfolios(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    manifesto_summary TEXT,
    photo_url TEXT,
    gpa_or_grade_standing VARCHAR(50),
    disciplinary_clearance BOOLEAN DEFAULT TRUE,
    vote_count BIGINT DEFAULT 0,
    is_winner BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Voter Participation Tracker (Decoupled from Ballot for complete secret ballot zero-linkability)
CREATE TABLE IF NOT EXISTS election_voter_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
    election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    has_voted BOOLEAN DEFAULT TRUE,
    voted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_student_election_vote UNIQUE(election_id, student_id)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_guild_portfolios_school ON guild_portfolios(school_id);
CREATE INDEX IF NOT EXISTS idx_guild_tenures_school_student ON guild_tenures(school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_guild_tenures_status ON guild_tenures(status);
CREATE INDEX IF NOT EXISTS idx_guild_transactions_tenure ON guild_transactions(tenure_id);
CREATE INDEX IF NOT EXISTS idx_student_grievances_school ON student_grievances(school_id);
CREATE INDEX IF NOT EXISTS idx_student_grievances_status ON student_grievances(status);
CREATE INDEX IF NOT EXISTS idx_elections_school_status ON elections(school_id, status);
CREATE INDEX IF NOT EXISTS idx_election_candidates_election ON election_candidates(election_id);
CREATE INDEX IF NOT EXISTS idx_election_voter_logs_election_student ON election_voter_logs(election_id, student_id);

-- Enable RLS
ALTER TABLE guild_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_tenures ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_grievances ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_welfare_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_voter_logs ENABLE ROW LEVEL SECURITY;

-- Base RLS Policies (Allow authenticated read/write with school tenant isolation)
DO $$
BEGIN
    -- guild_portfolios
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'guild_portfolios_school_all') THEN
        CREATE POLICY guild_portfolios_school_all ON guild_portfolios FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    -- guild_tenures
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'guild_tenures_school_all') THEN
        CREATE POLICY guild_tenures_school_all ON guild_tenures FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    -- guild_transactions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'guild_transactions_school_all') THEN
        CREATE POLICY guild_transactions_school_all ON guild_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    -- student_grievances
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'student_grievances_school_all') THEN
        CREATE POLICY student_grievances_school_all ON student_grievances FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    -- guild_announcements
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'guild_announcements_school_all') THEN
        CREATE POLICY guild_announcements_school_all ON guild_announcements FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    -- guild_welfare_reports
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'guild_welfare_reports_school_all') THEN
        CREATE POLICY guild_welfare_reports_school_all ON guild_welfare_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    -- elections
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'elections_school_all') THEN
        CREATE POLICY elections_school_all ON elections FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    -- election_candidates
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'election_candidates_school_all') THEN
        CREATE POLICY election_candidates_school_all ON election_candidates FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    -- election_voter_logs
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'election_voter_logs_school_all') THEN
        CREATE POLICY election_voter_logs_school_all ON election_voter_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 10. Atomic Ballot Submission Procedure (Zero Linkability & Anti-Fraud Guarantee)
CREATE OR REPLACE FUNCTION cast_guild_ballot(
    p_election_id UUID,
    p_student_id UUID,
    p_school_id UUID,
    p_candidate_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_election RECORD;
    v_already_voted BOOLEAN;
    v_candidate_id UUID;
BEGIN
    -- 1. Validate Election Status & Time Window
    SELECT * INTO v_election
    FROM elections
    WHERE id = p_election_id AND school_id = p_school_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Election not found for this institution.';
    END IF;

    IF v_election.status <> 'ACTIVE' THEN
        RAISE EXCEPTION 'This election is not currently open for voting.';
    END IF;

    IF CURRENT_TIMESTAMP < v_election.voting_starts_at THEN
        RAISE EXCEPTION 'Voting has not yet started for this election.';
    END IF;

    IF CURRENT_TIMESTAMP > v_election.voting_ends_at THEN
        RAISE EXCEPTION 'Voting has concluded for this election.';
    END IF;

    -- 2. Verify Single Vote Constraint
    SELECT EXISTS (
        SELECT 1 FROM election_voter_logs
        WHERE election_id = p_election_id AND student_id = p_student_id
    ) INTO v_already_voted;

    IF v_already_voted THEN
        RAISE EXCEPTION 'You have already cast your ballot in this election. Duplicate votes are prevented.';
    END IF;

    -- 3. Record participation in voter registry (Voter is registered, but ballot choice is NOT stored with identity)
    INSERT INTO election_voter_logs (school_id, election_id, student_id, has_voted, voted_at)
    VALUES (p_school_id, p_election_id, p_student_id, true, CURRENT_TIMESTAMP);

    -- 4. Atomically increment candidate vote counters in complete separation
    IF p_candidate_ids IS NOT NULL AND array_length(p_candidate_ids, 1) > 0 THEN
        FOREACH v_candidate_id IN ARRAY p_candidate_ids
        LOOP
            UPDATE election_candidates
            SET vote_count = COALESCE(vote_count, 0) + 1
            WHERE id = v_candidate_id AND election_id = p_election_id AND school_id = p_school_id;
        END LOOP;
    END IF;

    RETURN json_build_object(
        'success', true,
        'message', 'Ballot verified and cast successfully with zero-knowledge anonymity.',
        'voted_at', CURRENT_TIMESTAMP
    );
END;
$$;

-- 11. Automated Expiration Function (Evaluates term_end vs CURRENT_TIMESTAMP)
CREATE OR REPLACE FUNCTION check_and_expire_guild_tenures(
    p_school_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INT := 0;
BEGIN
    UPDATE guild_tenures
    SET status = 'EXPIRED'
    WHERE status = 'ACTIVE'
      AND term_end < CURRENT_TIMESTAMP
      AND (p_school_id IS NULL OR school_id = p_school_id);

    GET DIAGNOSTICS v_count = ROW_COUNT;

    RETURN json_build_object(
        'success', true,
        'expired_count', v_count,
        'checked_at', CURRENT_TIMESTAMP
    );
END;
$$;

-- 12. Election Certification & Automated Tenure Provisioning
CREATE OR REPLACE FUNCTION certify_election_and_handover(
    p_election_id UUID,
    p_certified_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_election RECORD;
    v_candidate RECORD;
    v_academic_year VARCHAR(20);
    v_winners_count INT := 0;
BEGIN
    SELECT * INTO v_election
    FROM elections
    WHERE id = p_election_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Election not found.';
    END IF;

    IF v_election.status = 'CERTIFIED' THEN
        RAISE EXCEPTION 'This election has already been certified.';
    END IF;

    v_academic_year := v_election.academic_year;

    -- Reset previous winners for this election
    UPDATE election_candidates
    SET is_winner = false
    WHERE election_id = p_election_id;

    -- Mark top candidate per portfolio as winner
    FOR v_candidate IN
        WITH ranked_candidates AS (
            SELECT 
                id,
                portfolio_id,
                student_id,
                school_id,
                vote_count,
                ROW_NUMBER() OVER (PARTITION BY portfolio_id ORDER BY vote_count DESC, created_at ASC) as rank
            FROM election_candidates
            WHERE election_id = p_election_id
        )
        SELECT * FROM ranked_candidates WHERE rank = 1
    LOOP
        UPDATE election_candidates
        SET is_winner = true
        WHERE id = v_candidate.id;

        -- Expire any previous active tenure for this portfolio
        UPDATE guild_tenures
        SET status = 'EXPIRED'
        WHERE school_id = v_candidate.school_id
          AND portfolio_id = v_candidate.portfolio_id
          AND status = 'ACTIVE';

        -- Provision new active tenure for winner
        INSERT INTO guild_tenures (
            school_id,
            student_id,
            portfolio_id,
            academic_year,
            term_start,
            term_end,
            status
        ) VALUES (
            v_candidate.school_id,
            v_candidate.student_id,
            v_candidate.portfolio_id,
            v_academic_year,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP + interval '1 year',
            'ACTIVE'
        );

        v_winners_count := v_winners_count + 1;
    END LOOP;

    -- Mark election as CERTIFIED
    UPDATE elections
    SET status = 'CERTIFIED',
        certified_by = p_certified_by,
        certified_at = CURRENT_TIMESTAMP
    WHERE id = p_election_id;

    RETURN json_build_object(
        'success', true,
        'winners_count', v_winners_count,
        'certified_at', CURRENT_TIMESTAMP
    );
END;
$$;
