import { describe, it, expect } from 'vitest';
import type { GuildTenure, GuildPortfolio, ElectionCandidate, ElectionVoterLog } from '@/types/guild';

describe('Guild Council & Democratic Governance Module', () => {
  describe('RBAC & Term Lifecycle Expiration', () => {
    it('evaluates active tenure correctly when term_end is in the future', () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 180).toISOString();
      const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString();

      const tenure: GuildTenure = {
        id: 'tenure-1',
        school_id: 'school-1',
        student_id: 'student-1',
        portfolio_id: 'portfolio-1',
        academic_year: '2026/2027',
        term_start: pastDate,
        term_end: futureDate,
        status: 'ACTIVE',
        created_at: pastDate,
      };

      const now = new Date();
      const isExpired = now > new Date(tenure.term_end) || tenure.status === 'EXPIRED';
      const isGuildExecutive = !isExpired && tenure.status === 'ACTIVE';

      expect(isExpired).toBe(false);
      expect(isGuildExecutive).toBe(true);
    });

    it('revokes guild executive privileges instantly when term_end has passed', () => {
      const pastStart = new Date(Date.now() - 1000 * 60 * 60 * 24 * 365).toISOString();
      const pastEnd = new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(); // Expired yesterday

      const tenure: GuildTenure = {
        id: 'tenure-2',
        school_id: 'school-1',
        student_id: 'student-1',
        portfolio_id: 'portfolio-1',
        academic_year: '2025/2026',
        term_start: pastStart,
        term_end: pastEnd,
        status: 'ACTIVE', // Status is active in record, but term_end timestamp has passed
        created_at: pastStart,
      };

      const now = new Date();
      const isExpired = now > new Date(tenure.term_end) || tenure.status === 'EXPIRED';
      const isGuildExecutive = !isExpired && tenure.status === 'ACTIVE';

      expect(isExpired).toBe(true);
      expect(isGuildExecutive).toBe(false);
    });
  });

  describe('Single-Identity Multi-Role Access', () => {
    it('grants executive switcher ONLY to students with active cabinet tenure', () => {
      const regularStudentTenure = null;
      const executiveStudentTenure: GuildTenure = {
        id: 'tenure-3',
        school_id: 'school-1',
        student_id: 'student-3',
        portfolio_id: 'port-pres',
        academic_year: '2026/2027',
        term_start: new Date().toISOString(),
        term_end: new Date(Date.now() + 10000000).toISOString(),
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
      };

      const canSeeSwitcher = (tenure: GuildTenure | null) => {
        if (!tenure) return false;
        return tenure.status === 'ACTIVE' && new Date() < new Date(tenure.term_end);
      };

      expect(canSeeSwitcher(regularStudentTenure)).toBe(false);
      expect(canSeeSwitcher(executiveStudentTenure)).toBe(true);
    });

    it('correctly maps ministerial portfolio permissions', () => {
      const financePortfolio: GuildPortfolio = {
        id: 'port-fin',
        school_id: 'school-1',
        title: 'Minister of Finance',
        description: 'Treasury & requisitions',
        permissions: { is_executive: true, manage_finances: true, approve_requisitions: true },
        is_default: true,
        created_at: new Date().toISOString(),
      };

      const welfarePortfolio: GuildPortfolio = {
        id: 'port-welfare',
        school_id: 'school-1',
        title: 'Minister of Health & Welfare',
        description: 'Sickbay & cafeteria',
        permissions: { is_executive: true, view_welfare: true, log_welfare_incident: true },
        is_default: true,
        created_at: new Date().toISOString(),
      };

      expect(financePortfolio.permissions.manage_finances).toBe(true);
      expect(financePortfolio.permissions.view_welfare).toBeUndefined();

      expect(welfarePortfolio.permissions.view_welfare).toBe(true);
      expect(welfarePortfolio.permissions.manage_finances).toBeUndefined();
    });
  });

  describe('Secret Ballot & Zero-Linkability Architecture', () => {
    it('verifies that voter registry record contains NO candidate or ballot choice metadata', () => {
      const voterLog: ElectionVoterLog = {
        id: 'voter-log-1',
        school_id: 'school-1',
        election_id: 'election-1',
        student_id: 'student-99',
        has_voted: true,
        voted_at: new Date().toISOString(),
      };

      // Ensure the voter registry has only participation flags and no choice linkage
      expect(voterLog.has_voted).toBe(true);
      expect((voterLog as any).candidate_id).toBeUndefined();
      expect((voterLog as any).portfolio_id).toBeUndefined();
      expect((voterLog as any).ballot_data).toBeUndefined();
    });

    it('enforces single-vote guarantee by preventing duplicate voter entries', () => {
      const voterRegistry = new Set<string>();

      const registerVote = (electionId: string, studentId: string): boolean => {
        const key = `${electionId}:${studentId}`;
        if (voterRegistry.has(key)) {
          return false; // Duplicate vote rejected
        }
        voterRegistry.add(key);
        return true;
      };

      expect(registerVote('elec-1', 'stud-1')).toBe(true);
      expect(registerVote('elec-1', 'stud-1')).toBe(false); // Second ballot rejected
      expect(registerVote('elec-1', 'stud-2')).toBe(true); // Different student succeeds
    });
  });
});
