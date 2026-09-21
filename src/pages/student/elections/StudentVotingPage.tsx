import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useGuild } from '@/context/GuildContext';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';
import {
  Vote,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Lock,
  Award,
  AlertCircle,
  RefreshCw,
  Flame,
  Check
} from 'lucide-react';
import type { Election, ElectionCandidate } from '@/types/guild';

export default function StudentVotingPage() {
  const { studentId, schoolId } = useGuild();
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);

  const [election, setElection] = useState<Election | null>(null);
  const [candidates, setCandidates] = useState<ElectionCandidate[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [castingBallot, setCastingBallot] = useState(false);

  // Selected ballot choices: map from portfolio_id -> candidate_id
  const [selectedChoices, setSelectedChoices] = useState<Record<string, string>>({});

  // Countdown clock state
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

  const fetchElectionData = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      // 1. Fetch current active or latest scheduled election
      const { data: elecData, error: elecErr } = await supabase
        .from('elections')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (elecErr) throw elecErr;
      if (!elecData) {
        setElection(null);
        setLoading(false);
        return;
      }

      setElection(elecData as Election);

      // 2. Fetch candidates grouped by portfolio
      const { data: candData, error: candErr } = await supabase
        .from('election_candidates')
        .select(`
          *,
          portfolio:guild_portfolios(id, title),
          student:students(name, current_class, admission_number)
        `)
        .eq('election_id', elecData.id)
        .order('portfolio_id');

      if (candErr) throw candErr;
      setCandidates((candData as ElectionCandidate[]) || []);

      // 3. Check if student has already voted
      if (studentId) {
        const { data: logData } = await supabase
          .from('election_voter_logs')
          .select('has_voted')
          .eq('election_id', elecData.id)
          .eq('student_id', studentId)
          .maybeSingle();

        setHasVoted(Boolean(logData?.has_voted));
      }
    } catch (err) {
      console.error('[StudentVotingPage] Error fetching election data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchElectionData();
  }, [schoolId, studentId]);

  // Group candidates by portfolio
  const portfolioGroups = useMemo(() => {
    const map = new Map<string, { title: string; candidates: ElectionCandidate[] }>();
    candidates.forEach((c) => {
      const portId = c.portfolio_id;
      const portTitle = c.portfolio?.title || 'Contested Portfolio';
      if (!map.has(portId)) {
        map.set(portId, { title: portTitle, candidates: [] });
      }
      map.get(portId)!.candidates.push(c);
    });
    return Array.from(map.entries()).map(([portfolioId, data]) => ({
      portfolioId,
      title: data.title,
      candidates: data.candidates,
    }));
  }, [candidates]);

  // Time Gate Evaluation
  const now = new Date();
  const votingStarts = election?.voting_starts_at ? new Date(election.voting_starts_at) : null;
  const votingEnds = election?.voting_ends_at ? new Date(election.voting_ends_at) : null;

  const isBeforeStart = votingStarts ? now < votingStarts : false;
  const isDuringVoting = votingStarts && votingEnds ? now >= votingStarts && now <= votingEnds && election?.status === 'ACTIVE' : false;
  const isPostVoting = votingEnds ? now > votingEnds || election?.status === 'COMPLETED' || election?.status === 'CERTIFIED' : false;
  const isCertified = election?.status === 'CERTIFIED';

  // Live countdown timer
  useEffect(() => {
    if (!election) return;

    const interval = setInterval(() => {
      const currentTime = new Date();
      const targetTime = isBeforeStart ? votingStarts : votingEnds;
      if (!targetTime) return;

      const diff = targetTime.getTime() - currentTime.getTime();
      if (diff <= 0) {
        setTimeLeft(null);
        fetchElectionData();
        clearInterval(interval);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [election, isBeforeStart, votingStarts, votingEnds]);

  const handleSelectCandidate = (portfolioId: string, candidateId: string) => {
    if (hasVoted || !isDuringVoting) return;
    setSelectedChoices((prev) => ({
      ...prev,
      [portfolioId]: candidateId,
    }));
  };

  const handleCastBallot = async () => {
    if (!election || !studentId || !schoolId || hasVoted) return;

    const candidateIds = Object.values(selectedChoices);
    if (candidateIds.length === 0) {
      alert('Please select at least one candidate on your ballot.');
      return;
    }

    const confirm = window.confirm(
      'Ready to cast your official democratic ballot?\n\n' +
      '• Your ballot is completely ANONYMOUS and decoupled from your student identity.\n' +
      '• You can only cast your vote once.'
    );
    if (!confirm) return;

    setCastingBallot(true);
    try {
      const { data, error } = await supabase.rpc('cast_guild_ballot', {
        p_election_id: election.id,
        p_student_id: studentId,
        p_school_id: schoolId,
        p_candidate_ids: candidateIds,
      });

      if (error) throw error;

      setHasVoted(true);
      alert('Your ballot has been securely cast and verified with zero-knowledge anonymity!');
      fetchElectionData();
    } catch (err: any) {
      alert(`Ballot submission failed: ${err.message || 'Unknown error'}`);
    } finally {
      setCastingBallot(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Banner */}
      <div
        className="rounded-2xl p-6 border relative overflow-hidden"
        style={{
          backgroundColor: t.panel,
          borderColor: t.stroke,
        }}
      >
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
                Zero-Knowledge Electoral Engine
              </span>
              <span className="text-xs" style={{ color: t.textMid }}>
                Single-Vote Verified Franchise
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold mt-1 tracking-tight" style={{ color: t.textHi }}>
              {election?.title || 'Campus Guild Elections'}
            </h1>
            <p className="text-xs mt-1 max-w-2xl" style={{ color: t.textMid }}>
              Exercise your democratic rights. All ballots are atomically encrypted and decoupled from student identities to ensure zero voter linkability.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchElectionData}
            className="p-2 rounded-lg border hover:opacity-80"
            style={{
              borderColor: t.stroke,
              color: t.textHi,
              backgroundColor: t.fieldBg,
            }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Temporal Window & Countdown Banner */}
        {election && (
          <div
            className="mt-5 p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            style={{
              backgroundColor: t.surfaceSubtle,
              borderColor: t.stroke,
            }}
          >
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5" style={{ color: t.mint }} />
              <div>
                <div className="text-xs font-bold" style={{ color: t.textHi }}>
                  {isBeforeStart
                    ? 'Polls Open In:'
                    : isDuringVoting
                    ? 'Voting Window Currently Active'
                    : 'Voting Window Closed'}
                </div>
                <div className="text-[11px]" style={{ color: t.textMid }}>
                  {votingStarts?.toLocaleDateString()} ({votingStarts?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}) to {votingEnds?.toLocaleDateString()} ({votingEnds?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                </div>
              </div>
            </div>

            {timeLeft && (
              <div className="flex items-center gap-2">
                <div className="text-center px-2 py-1 rounded border font-mono font-bold text-sm" style={{ backgroundColor: t.fieldBg, borderColor: t.stroke, color: t.mint }}>
                  {String(timeLeft.hours).padStart(2, '0')}h
                </div>
                <span>:</span>
                <div className="text-center px-2 py-1 rounded border font-mono font-bold text-sm" style={{ backgroundColor: t.fieldBg, borderColor: t.stroke, color: t.mint }}>
                  {String(timeLeft.minutes).padStart(2, '0')}m
                </div>
                <span>:</span>
                <div className="text-center px-2 py-1 rounded border font-mono font-bold text-sm" style={{ backgroundColor: t.fieldBg, borderColor: t.stroke, color: t.mint }}>
                  {String(timeLeft.seconds).padStart(2, '0')}s
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Has Voted Confirmation Box */}
      {hasVoted && (
        <div
          className="p-5 rounded-xl border flex items-center gap-3"
          style={{
            backgroundColor: `${t.mintDim}`,
            borderColor: t.mintRing,
            color: t.mint,
          }}
        >
          <CheckCircle2 className="w-6 h-6 shrink-0" />
          <div>
            <h3 className="text-sm font-bold">Your Democratic Ballot Has Been Cast</h3>
            <p className="text-xs mt-0.5 text-slate-300">
              Your franchise has been marked on the student voter registry, and your vote has been securely recorded with complete zero-knowledge anonymity.
            </p>
          </div>
        </div>
      )}

      {/* Post-Voting Window / Certified Winners Display */}
      {isPostVoting && isCertified && (
        <div
          className="p-6 rounded-2xl border space-y-4"
          style={{
            backgroundColor: t.panel,
            borderColor: t.mintRing,
          }}
        >
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold" style={{ color: t.textHi }}>
              Official Certified Election Results & Winners
            </h2>
          </div>
          <p className="text-xs" style={{ color: t.textMid }}>
            The Electoral Commission has verified and certified the democratic tally. Winning candidates have assumed their respective cabinet portfolios.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {candidates
              .filter((c) => c.is_winner)
              .map((winner) => (
                <div
                  key={winner.id}
                  className="p-4 rounded-xl border space-y-2 relative"
                  style={{
                    backgroundColor: t.surfaceSubtle,
                    borderColor: t.mint,
                  }}
                >
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: t.mintDim,
                      color: t.mint,
                    }}
                  >
                    {winner.portfolio?.title}
                  </span>

                  <h4 className="text-base font-bold mt-1" style={{ color: t.textHi }}>
                    {winner.student?.name}
                  </h4>
                  <div className="text-[11px]" style={{ color: t.textLow }}>
                    {winner.student?.current_class}
                  </div>

                  <div className="pt-2 border-t flex items-center justify-between font-bold text-xs" style={{ borderColor: t.divider }}>
                    <span style={{ color: t.textMid }}>Certified Votes:</span>
                    <span style={{ color: t.mint }}>{winner.vote_count} votes</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Interactive Ballot Form */}
      {portfolioGroups.length === 0 ? (
        <div
          className="p-16 text-center rounded-2xl border text-xs"
          style={{
            backgroundColor: t.panel,
            borderColor: t.stroke,
            color: t.textLow,
          }}
        >
          No contested seats or candidate nominations scheduled for this session.
        </div>
      ) : (
        <div className="space-y-6">
          {portfolioGroups.map((group) => {
            const currentSelection = selectedChoices[group.portfolioId];

            return (
              <div
                key={group.portfolioId}
                className="p-6 rounded-2xl border space-y-4"
                style={{
                  backgroundColor: t.panel,
                  borderColor: t.stroke,
                }}
              >
                <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: t.divider }}>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.mint }}>
                      Contested Office
                    </span>
                    <h3 className="text-lg font-bold" style={{ color: t.textHi }}>
                      {group.title}
                    </h3>
                  </div>

                  {isDuringVoting && !hasVoted && (
                    <span className="text-xs font-semibold" style={{ color: currentSelection ? t.mint : t.textLow }}>
                      {currentSelection ? 'Candidate Selected' : 'Choose 1 candidate'}
                    </span>
                  )}
                </div>

                {/* Candidate Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.candidates.map((cand) => {
                    const isSelected = currentSelection === cand.id;

                    return (
                      <div
                        key={cand.id}
                        onClick={() => handleSelectCandidate(group.portfolioId, cand.id)}
                        className={`p-4 rounded-xl border transition-all ${
                          isDuringVoting && !hasVoted ? 'cursor-pointer hover:border-emerald-500' : ''
                        }`}
                        style={{
                          backgroundColor: isSelected ? `${t.mintDim}` : t.surfaceSubtle,
                          borderColor: isSelected ? t.mint : t.stroke,
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h4 className="text-base font-bold" style={{ color: t.textHi }}>
                              {cand.student?.name}
                            </h4>
                            <div className="text-[11px]" style={{ color: t.textLow }}>
                              {cand.student?.current_class}
                            </div>
                          </div>

                          {isDuringVoting && !hasVoted && (
                            <div
                              className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                                isSelected ? 'bg-emerald-500 border-emerald-400 text-black' : 'border-slate-500'
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-2 text-[11px]" style={{ color: t.textMid }}>
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Standing: {cand.gpa_or_grade_standing || 'Clear'}</span>
                        </div>

                        {cand.manifesto_summary && (
                          <p className="text-xs mt-2 line-clamp-3 leading-relaxed" style={{ color: t.textMid }}>
                            &quot;{cand.manifesto_summary}&quot;
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Cast Ballot Action Bar (Active during voting window and student has not yet voted) */}
          {isDuringVoting && !hasVoted && (
            <div
              className="sticky bottom-4 z-30 p-4 rounded-2xl border shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md"
              style={{
                backgroundColor: `${t.panel}F5`,
                borderColor: t.strokeHi,
              }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{ backgroundColor: t.mintDim, color: t.mint }}>
                  <Vote className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold" style={{ color: t.textHi }}>
                    Ready to Cast Your Ballot
                  </div>
                  <div className="text-[11px]" style={{ color: t.textMid }}>
                    {Object.keys(selectedChoices).length} of {portfolioGroups.length} offices selected.
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={castingBallot || Object.keys(selectedChoices).length === 0}
                onClick={handleCastBallot}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg disabled:opacity-50 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                style={{
                  background: `linear-gradient(135deg, ${t.ctaGradA}, ${t.ctaGradB})`,
                  color: t.ctaText,
                }}
              >
                <Vote className="w-4 h-4" />
                <span>{castingBallot ? 'Submitting Ballot...' : 'Confirm & Cast Ballot'}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
