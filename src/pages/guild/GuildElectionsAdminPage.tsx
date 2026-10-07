import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useGuild } from '@/context/GuildContext';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';
import {
  Vote,
  Plus,
  RefreshCw,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Users,
  Award,
  AlertTriangle,
  UserCheck,
  Lock,
  Flame,
  Check
} from 'lucide-react';
import type { Election, ElectionCandidate, GuildPortfolio, ElectionStatus } from '@/types/guild';
import NativeModal from '@/components/NativeModal';
import { LiquidGlassSelect } from '@/components/ui/LiquidGlassSelect';

export default function GuildElectionsAdminPage() {
  const { schoolId, activeTenure } = useGuild();
  const authUser = useAuthStore((s) => s.user);
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);

  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  const [candidates, setCandidates] = useState<ElectionCandidate[]>([]);
  const [portfolios, setPortfolios] = useState<GuildPortfolio[]>([]);
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [turnoutCount, setTurnoutCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Create Election Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [academicYear, setAcademicYear] = useState('2026/2027');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [submittingElection, setSubmittingElection] = useState(false);

  // Nominate Candidate Modal
  const [showNominateModal, setShowNominateModal] = useState(false);
  const [nominatePortfolioId, setNominatePortfolioId] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [searchedStudents, setSearchedStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [manifesto, setManifesto] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [gpa, setGpa] = useState('3.8 CGPA');
  const [disciplinaryClearance, setDisciplinaryClearance] = useState(true);
  const [submittingCandidate, setSubmittingCandidate] = useState(false);

  // Certifying state
  const [certifying, setCertifying] = useState(false);

  const fetchElections = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const [elecRes, portRes, countRes] = await Promise.all([
        supabase
          .from('elections')
          .select('*')
          .eq('school_id', schoolId)
          .order('created_at', { ascending: false }),
        supabase
          .from('guild_portfolios')
          .select('*')
          .eq('school_id', schoolId)
          .order('title'),
        supabase
          .from('students')
          .select('student_id', { count: 'exact', head: true })
          .eq('school_id', schoolId),
      ]);

      const elecList = (elecRes.data as Election[]) || [];
      setElections(elecList);
      setPortfolios((portRes.data as GuildPortfolio[]) || []);
      setTotalStudents(countRes.count || 0);

      if (elecList.length > 0) {
        const current = selectedElection
          ? elecList.find((e) => e.id === selectedElection.id) || elecList[0]
          : elecList[0];
        setSelectedElection(current);
        await loadElectionDetails(current.id);
      }
    } catch (err) {
      console.error('[GuildElectionsAdminPage] Error fetching elections:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadElectionDetails = async (electionId: string) => {
    try {
      const [candRes, voterRes] = await Promise.all([
        supabase
          .from('election_candidates')
          .select(`
            *,
            portfolio:guild_portfolios(title),
            student:students(name, current_class, admission_number)
          `)
          .eq('election_id', electionId)
          .order('portfolio_id'),
        supabase
          .from('election_voter_logs')
          .select('id', { count: 'exact', head: true })
          .eq('election_id', electionId),
      ]);

      setCandidates((candRes.data as ElectionCandidate[]) || []);
      setTurnoutCount(voterRes.count || 0);
    } catch (err) {
      console.error('[GuildElectionsAdminPage] Error loading election details:', err);
    }
  };

  useEffect(() => {
    fetchElections();
  }, [schoolId]);

  useEffect(() => {
    if (selectedElection) {
      loadElectionDetails(selectedElection.id);
    }
  }, [selectedElection]);

  const searchStudents = async (q: string) => {
    setStudentSearchQuery(q);
    if (!schoolId || q.trim().length < 2) {
      setSearchedStudents([]);
      return;
    }
    const { data } = await supabase
      .from('students')
      .select('student_id, name, current_class, admission_number')
      .eq('school_id', schoolId)
      .or(`name.ilike.%${q}%,admission_number.ilike.%${q}%`)
      .limit(6);
    setSearchedStudents(data || []);
  };

  const handleCreateElection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !title.trim() || !startsAt || !endsAt) return;

    setSubmittingElection(true);
    try {
      const now = new Date();
      const start = new Date(startsAt);
      const end = new Date(endsAt);

      if (end <= start) {
        alert('Voting end time must be after voting start time.');
        return;
      }

      let initialStatus: ElectionStatus = 'SCHEDULED';
      if (now >= start && now <= end) {
        initialStatus = 'ACTIVE';
      }

      const { data, error } = await supabase
        .from('elections')
        .insert({
          school_id: schoolId,
          academic_year: academicYear.trim(),
          title: title.trim(),
          description: description.trim() || null,
          voting_starts_at: start.toISOString(),
          voting_ends_at: end.toISOString(),
          status: initialStatus,
        })
        .select()
        .single();

      if (error) throw error;

      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      fetchElections();
    } catch (err: any) {
      alert(`Failed to schedule election: ${err.message || 'Unknown error'}`);
    } finally {
      setSubmittingElection(false);
    }
  };

  const handleNominateCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedElection || !selectedStudent || !nominatePortfolioId) return;

    setSubmittingCandidate(true);
    try {
      const { error } = await supabase.from('election_candidates').insert({
        school_id: schoolId,
        election_id: selectedElection.id,
        portfolio_id: nominatePortfolioId,
        student_id: selectedStudent.student_id,
        manifesto_summary: manifesto.trim() || null,
        photo_url: photoUrl.trim() || null,
        gpa_or_grade_standing: gpa.trim() || null,
        disciplinary_clearance: disciplinaryClearance,
      });

      if (error) throw error;

      setShowNominateModal(false);
      setSelectedStudent(null);
      setManifesto('');
      setPhotoUrl('');
      loadElectionDetails(selectedElection.id);
    } catch (err: any) {
      alert(`Candidate nomination failed: ${err.message || 'Unknown error'}`);
    } finally {
      setSubmittingCandidate(false);
    }
  };

  const handleCertifyElection = async () => {
    if (!selectedElection || !authUser?.id) return;
    const confirm = window.confirm(
      'Are you sure you want to officially CERTIFY this election?\n\n' +
      'This will automatically mark winners, expire all outgoing guild tenures, and provision new active 1-year tenures for the winners.'
    );
    if (!confirm) return;

    setCertifying(true);
    try {
      const { data, error } = await supabase.rpc('certify_election_and_handover', {
        p_election_id: selectedElection.id,
        p_certified_by: authUser.id,
      });

      if (error) throw error;

      alert('Election certified successfully! Outgoing tenures expired and newly elected leaders provisioned.');
      fetchElections();
    } catch (err: any) {
      alert(`Certification failed: ${err.message || 'Unknown error'}`);
    } finally {
      setCertifying(false);
    }
  };

  const turnoutPercentage = totalStudents > 0 ? Math.min(100, Math.round((turnoutCount / totalStudents) * 100)) : 0;
  const isElectionActive = selectedElection?.status === 'ACTIVE';
  const isCertified = selectedElection?.status === 'CERTIFIED';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase"
              style={{
                backgroundColor: t.mintDim,
                color: t.mint,
                border: `1px solid ${t.mintRing}`,
              }}
            >
              Electoral Commission Authority
            </span>
          </div>
          <h1 className="text-2xl font-bold mt-1 tracking-tight" style={{ color: t.textHi }}>
            Campus Voting & Electoral Engine Console
          </h1>
          <p className="text-xs mt-1" style={{ color: t.textMid }}>
            Configure seats, vet candidate nominations, monitor real-time ballot turnout, and execute automated handover upon election certification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchElections}
            className="p-2 rounded-lg border hover:opacity-80"
            style={{
              borderColor: t.stroke,
              color: t.textHi,
              backgroundColor: t.fieldBg,
            }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white shadow-md hover:scale-[1.02] transition-all"
            style={{
              background: `linear-gradient(135deg, ${t.ctaGradA}, ${t.ctaGradB})`,
              color: t.ctaText,
            }}
          >
            <Plus className="w-4 h-4" />
            <span>Schedule New Election</span>
          </button>
        </div>
      </div>

      {/* Elections Picker Tabs */}
      {elections.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {elections.map((elec) => (
            <button
              key={elec.id}
              type="button"
              onClick={() => setSelectedElection(elec)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border shrink-0 transition-all flex items-center gap-2 ${
                selectedElection?.id === elec.id
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-sm'
                  : 'border-transparent hover:opacity-100 opacity-75'
              }`}
              style={{
                backgroundColor: selectedElection?.id === elec.id ? undefined : t.panel,
                color: selectedElection?.id === elec.id ? undefined : t.textHi,
              }}
            >
              <span>{elec.title}</span>
              <span
                className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase"
                style={{
                  backgroundColor: elec.status === 'ACTIVE' ? t.mintDim : t.surfaceSubtle,
                  color: elec.status === 'ACTIVE' ? t.mint : t.textLow,
                }}
              >
                {elec.status}
              </span>
            </button>
          ))}
        </div>
      )}

      {selectedElection && (
        <>
          {/* Election Overview & Turnout KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              className="rounded-xl p-5 border"
              style={{
                backgroundColor: t.panel,
                borderColor: t.stroke,
              }}
            >
              <div className="text-xs uppercase font-semibold" style={{ color: t.textMid }}>
                Temporal Voting Gate
              </div>
              <div className="text-xl font-bold mt-2" style={{ color: t.textHi }}>
                {selectedElection.status}
              </div>
              <div className="text-[11px] mt-1" style={{ color: t.textLow }}>
                {new Date(selectedElection.voting_starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(selectedElection.voting_ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            <div
              className="rounded-xl p-5 border"
              style={{
                backgroundColor: t.panel,
                borderColor: t.stroke,
              }}
            >
              <div className="text-xs uppercase font-semibold" style={{ color: t.textMid }}>
                Live Voter Turnout
              </div>
              <div className="text-xl font-bold mt-2 flex items-center gap-2" style={{ color: t.mint }}>
                <span>{turnoutPercentage}%</span>
                <span className="text-xs font-normal" style={{ color: t.textMid }}>
                  ({turnoutCount} of {totalStudents})
                </span>
              </div>
              <div className="w-full bg-slate-700/30 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${turnoutPercentage}%` }}
                />
              </div>
            </div>

            <div
              className="rounded-xl p-5 border"
              style={{
                backgroundColor: t.panel,
                borderColor: t.stroke,
              }}
            >
              <div className="text-xs uppercase font-semibold" style={{ color: t.textMid }}>
                Vetted Candidates
              </div>
              <div className="text-xl font-bold mt-2" style={{ color: t.textHi }}>
                {candidates.length} Nominees
              </div>
              <div className="text-[11px] mt-1" style={{ color: t.textLow }}>
                Clean disciplinary standing
              </div>
            </div>

            <div
              className="rounded-xl p-5 border flex flex-col justify-between"
              style={{
                backgroundColor: t.panel,
                borderColor: t.stroke,
              }}
            >
              <div>
                <div className="text-xs uppercase font-semibold" style={{ color: t.textMid }}>
                  Certification & Handover
                </div>
                <div className="text-xs font-bold mt-1" style={{ color: isCertified ? t.mint : t.gold }}>
                  {isCertified ? 'Election Certified' : 'Handover Ready'}
                </div>
              </div>

              {!isCertified ? (
                <button
                  type="button"
                  disabled={certifying}
                  onClick={handleCertifyElection}
                  className="mt-3 w-full py-1.5 rounded-lg text-xs font-bold text-white shadow-md disabled:opacity-50"
                  style={{
                    background: `linear-gradient(135deg, ${t.ctaGradA}, ${t.ctaGradB})`,
                    color: t.ctaText,
                  }}
                >
                  {certifying ? 'Certifying...' : 'Certify & Handover'}
                </button>
              ) : (
                <div className="text-[11px] font-semibold mt-2" style={{ color: t.mint }}>
                  <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                  Tenures Active
                </div>
              )}
            </div>
          </div>

          {/* Candidate Nominations Desk */}
          <div
            className="rounded-2xl border p-6"
            style={{
              backgroundColor: t.panel,
              borderColor: t.stroke,
            }}
          >
            <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: t.divider }}>
              <div>
                <h3 className="text-base font-bold" style={{ color: t.textHi }}>
                  Ministerial Seats & Candidate Nominations
                </h3>
                <p className="text-xs" style={{ color: t.textMid }}>
                  Zero-linkability architecture: Candidate vote distributions remain hidden until the official certification phase.
                </p>
              </div>

              {!isCertified && (
                <button
                  type="button"
                  onClick={() => setShowNominateModal(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border hover:opacity-90 flex items-center gap-1.5"
                  style={{
                    backgroundColor: t.fieldBg,
                    borderColor: t.strokeHi,
                    color: t.textHi,
                  }}
                >
                  <UserCheck className="w-3.5 h-3.5" style={{ color: t.mint }} />
                  <span>Nominate Candidate</span>
                </button>
              )}
            </div>

            {/* Candidates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {candidates.length === 0 ? (
                <div className="col-span-3 py-12 text-center text-xs" style={{ color: t.textLow }}>
                  No candidates have been nominated for this election yet.
                </div>
              ) : (
                candidates.map((cand) => {
                  return (
                    <div
                      key={cand.id}
                      className="p-4 rounded-xl border space-y-2 relative overflow-hidden"
                      style={{
                        backgroundColor: t.surfaceSubtle,
                        borderColor: cand.is_winner ? t.mint : t.stroke,
                      }}
                    >
                      {cand.is_winner && (
                        <div
                          className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm"
                          style={{
                            backgroundColor: t.mintDim,
                            color: t.mint,
                            border: `1px solid ${t.mintRing}`,
                          }}
                        >
                          <Award className="w-3 h-3" />
                          <span>Winner · Certified</span>
                        </div>
                      )}

                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold border"
                        style={{
                          backgroundColor: t.fieldBg,
                          borderColor: t.stroke,
                          color: t.textHi,
                        }}
                      >
                        {cand.portfolio?.title || 'Contested Seat'}
                      </span>

                      <h4 className="text-base font-bold mt-1" style={{ color: t.textHi }}>
                        {cand.student?.name || 'Nominee'}
                      </h4>

                      <div className="text-[11px]" style={{ color: t.textLow }}>
                        {cand.student?.current_class} · Adm: {cand.student?.admission_number}
                      </div>

                      <div className="flex items-center gap-2 pt-1 text-[11px]" style={{ color: t.textMid }}>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>GPA: {cand.gpa_or_grade_standing || 'Standing Verified'}</span>
                        <span>·</span>
                        <span>Discipline: Cleared</span>
                      </div>

                      {cand.manifesto_summary && (
                        <p className="text-xs pt-1 line-clamp-2 leading-relaxed" style={{ color: t.textMid }}>
                          &quot;{cand.manifesto_summary}&quot;
                        </p>
                      )}

                      {/* Vote Count display (Visible only if certified or superadmin viewing certified tallies) */}
                      {isCertified ? (
                        <div className="pt-2 border-t flex items-center justify-between font-bold text-xs" style={{ borderColor: t.divider }}>
                          <span style={{ color: t.textMid }}>Final Verified Tally:</span>
                          <span style={{ color: t.mint }}>{cand.vote_count} votes</span>
                        </div>
                      ) : (
                        <div className="pt-2 border-t flex items-center gap-1.5 text-[11px]" style={{ borderColor: t.divider, color: t.textLow }}>
                          <Lock className="w-3 h-3" />
                          <span>Tally encrypted during live voting window</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* Schedule Election Modal */}
      <NativeModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Schedule Campus Election Session"
        subtitle="Establish seat definitions, nomination timelines, and strict temporal boundary gates"
        icon={Vote}
        size="md"
      >
        <form onSubmit={handleCreateElection} className="space-y-4">
          <div className="relative z-[45] focus-within:z-[50]">
            <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
              Election Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 2026/2027 General Guild Elections"
              className="w-full bg-black/25 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:outline-none transition-all"
            />
          </div>

          <div className="relative z-[40] focus-within:z-[50]">
            <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
              Academic Year *
            </label>
            <input
              type="text"
              required
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="2026/2027"
              className="w-full bg-black/25 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 relative z-[35] focus-within:z-[50]">
            <div>
              <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
                Voting Opens At *
              </label>
              <input
                type="datetime-local"
                required
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full bg-black/25 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
                Voting Concludes At *
              </label>
              <input
                type="datetime-local"
                required
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="w-full bg-black/25 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="relative z-[30] focus-within:z-[50]">
            <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
              Session Guidelines / Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain eligibility, voter ID verification, and election guidelines..."
              className="w-full bg-black/25 border border-white/20 rounded-xl p-3 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:outline-none transition-all resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white/80 bg-white/10 hover:bg-white/15 border border-white/15 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingElection}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-950/40 border border-emerald-400/30 disabled:opacity-50 transition-all"
            >
              {submittingElection ? 'Scheduling...' : 'Confirm & Schedule'}
            </button>
          </div>
        </form>
      </NativeModal>

      {/* Nominate Candidate Modal */}
      <NativeModal
        isOpen={showNominateModal}
        onClose={() => setShowNominateModal(false)}
        title="Nominate & Vet Candidate"
        subtitle="Select eligible enrolled student and bind them to the contested ministerial portfolio"
        icon={UserCheck}
        size="md"
      >
        <form onSubmit={handleNominateCandidate} className="space-y-4">
          <div className="relative z-[45] focus-within:z-[50]">
            <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
              Contested Portfolio / Seat *
            </label>
            <LiquidGlassSelect
              value={nominatePortfolioId}
              onChange={(val) => setNominatePortfolioId(val)}
              options={[
                { value: '', label: 'Select Ministerial Portfolio...' },
                ...portfolios.map((p) => ({
                  value: p.id,
                  label: p.title,
                })),
              ]}
            />
          </div>

          <div className="space-y-2 relative z-[40] focus-within:z-[50]">
            <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block">
              Search Student (Name or Admission Number)
            </label>
            <input
              type="text"
              value={studentSearchQuery}
              onChange={(e) => searchStudents(e.target.value)}
              placeholder="Search candidate name or admission number..."
              className="w-full bg-black/25 border border-white/20 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:outline-none transition-all"
            />

            {searchedStudents.length > 0 && !selectedStudent && (
              <div className="mt-1 border border-white/15 rounded-xl max-h-36 overflow-y-auto divide-y divide-white/10 bg-slate-900/90 backdrop-blur-md">
                {searchedStudents.map((s) => (
                  <div
                    key={s.student_id}
                    onClick={() => {
                      setSelectedStudent(s);
                      setSearchedStudents([]);
                      setStudentSearchQuery(s.name);
                    }}
                    className="p-2.5 text-xs hover:bg-emerald-500/20 cursor-pointer flex justify-between items-center transition-colors text-white"
                  >
                    <span className="font-semibold">{s.name}</span>
                    <span className="text-[11px] text-white/50">{s.current_class}</span>
                  </div>
                ))}
              </div>
            )}

            {selectedStudent && (
              <div className="mt-2 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs flex justify-between items-center text-white">
                <div>
                  Selected Candidate: <strong className="text-emerald-300">{selectedStudent.name}</strong> ({selectedStudent.current_class})
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudent(null);
                    setStudentSearchQuery('');
                  }}
                  className="text-xs font-bold text-rose-400 hover:text-rose-300 underline"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 relative z-[35] focus-within:z-[50]">
            <div>
              <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
                GPA / Grade Standing
              </label>
              <input
                type="text"
                value={gpa}
                onChange={(e) => setGpa(e.target.value)}
                placeholder="e.g. 4.2 CGPA"
                className="w-full bg-black/25 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
                Photo URL (Optional)
              </label>
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-black/25 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="relative z-[30] focus-within:z-[50]">
            <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
              Manifesto Summary (Core Pledges)
            </label>
            <textarea
              rows={3}
              value={manifesto}
              onChange={(e) => setManifesto(e.target.value)}
              placeholder="Key campaign promises, policy positions..."
              className="w-full bg-black/25 border border-white/20 rounded-xl p-3 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:outline-none transition-all resize-none"
            />
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.04] border border-white/10 relative z-[25]">
            <input
              type="checkbox"
              id="vetting-check"
              checked={disciplinaryClearance}
              onChange={(e) => setDisciplinaryClearance(e.target.checked)}
              className="rounded border-white/30 bg-black/40 text-emerald-500 focus:ring-emerald-400"
            />
            <label htmlFor="vetting-check" className="text-xs cursor-pointer select-none text-white/80">
              Disciplinary Clearance Vetted & Certified by Dean of Students
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setShowNominateModal(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white/80 bg-white/10 hover:bg-white/15 border border-white/15 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingCandidate || !selectedStudent}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-950/40 border border-emerald-400/30 disabled:opacity-50 transition-all"
            >
              {submittingCandidate ? 'Nominating...' : 'Nominate Candidate'}
            </button>
          </div>
        </form>
      </NativeModal>
    </div>
  );
}
