import { useEffect, useState } from 'react';
import { Calendar, Info } from 'lucide-react';
import { useSchoolType } from '@/hooks/useSchoolType';
import { supabase } from '@/lib/supabase';
import { resolveCurrentSchoolTerm } from '@/lib/adminFinanceTerm';
import SectionHeader from './SectionHeader';
import { settingsInsetSurface, settingsPrimaryActionClass } from './settingsTabStyles';

type TermRow = {
  id?: string;
  year: number;
  term: number;
  start_date: string | null;
  end_date: string;
};

export default function SettingsTerms({
  schoolId,
  embedded,
}: {
  schoolId: string | null;
  embedded?: boolean;
}) {
  const { isTertiary } = useSchoolType();
  const periodNoun = isTertiary ? 'Semester' : 'Term';
  const periodNounPlural = isTertiary ? 'Semesters' : 'Terms';

  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [term, setTerm] = useState<number>(1);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [rows, setRows] = useState<TermRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'current' | 'next'>('current');
  const [currentTerm, setCurrentTerm] = useState<{
    year: number;
    term: number;
    start_date: string;
    end_date: string;
  } | null>(null);
  const [showTermInfo, setShowTermInfo] = useState(false);
  const [nextTermBeginsDate, setNextTermBeginsDate] = useState('');
  const [savingNextTermDate, setSavingNextTermDate] = useState(false);
  const [nextTermDateSuccess, setNextTermDateSuccess] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!schoolId) return;
      const { data } = await supabase
        .from('school_terms')
        .select('*')
        .eq('school_id', schoolId)
        .order('year', { ascending: false })
        .order('term', { ascending: true });
      setRows(data || []);
      const todayStr = new Date().toISOString().slice(0, 10);
      const engine = await resolveCurrentSchoolTerm(supabase, schoolId, todayStr);
      if (engine?.year != null && engine.term != null) {
        const row = (data || []).find((r) => r.year === engine.year && r.term === engine.term);
        if (row) {
          setCurrentTerm({
            year: row.year,
            term: row.term,
            start_date: row.start_date || '',
            end_date: row.end_date,
          });
        } else {
          setCurrentTerm({
            year: engine.year,
            term: engine.term,
            start_date: '',
            end_date: '',
          });
        }
      }
      const { data: schoolData } = await supabase
        .from('schools')
        .select('next_term_begins_date')
        .eq('school_id', schoolId)
        .single();
      if (schoolData?.next_term_begins_date) {
        setNextTermBeginsDate(schoolData.next_term_begins_date);
      }
    };
    load();
  }, [schoolId]);

  useEffect(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    if (mode === 'current') {
      const guessTerm = isTertiary
        ? month <= 6 ? 2 : 1
        : month <= 4 ? 1 : month <= 7 ? 2 : 3;
      setYear(now.getFullYear());
      setTerm(guessTerm);
    } else {
      if (currentTerm) {
        let nextTerm = currentTerm.term + 1;
        let nextYear = currentTerm.year;
        const maxTerms = isTertiary ? 2 : 3;
        if (nextTerm > maxTerms) {
          nextTerm = 1;
          nextYear = currentTerm.year + 1;
        }
        setYear(nextYear);
        setTerm(nextTerm);
      } else {
        const guessTerm = isTertiary
          ? month <= 6 ? 1 : 2
          : month <= 4 ? 2 : month <= 7 ? 3 : 1;
        setYear(month <= 7 ? now.getFullYear() : now.getFullYear() + 1);
        setTerm(guessTerm);
      }
    }
  }, [mode, currentTerm, isTertiary]);

  const save = async () => {
    setError(null);
    if (!schoolId || !end) return;

    if (mode === 'current' && !start) {
      if (!/^\d{4}$/.test(String(year)) || year < 2020 || year > 2099) {
        setError('Year must be a 4-digit value between 2020 and 2099.');
        return;
      }
      const e = new Date(end);
      const today = new Date();
      if (e < new Date(today.toDateString())) {
        setError(`Current ${periodNoun.toLowerCase()} cannot end in the past.`);
        return;
      }
      setSaving(true);
      const { error: upErr } = await supabase
        .from('school_terms')
        .upsert(
          { school_id: schoolId, year, term, start_date: null, end_date: end },
          { onConflict: 'school_id,year,term' }
        );
      setSaving(false);
      if (upErr) {
        setError(upErr.message);
        return;
      }
      const { data } = await supabase
        .from('school_terms')
        .select('*')
        .eq('school_id', schoolId)
        .order('year', { ascending: false })
        .order('term', { ascending: true });
      setRows(data || []);
      return;
    }

    if (!start) {
      setError(`Start date is required for next ${periodNoun.toLowerCase()} or when setting both dates.`);
      return;
    }

    const s = new Date(start);
    const e = new Date(end);
    const today = new Date();
    if (s < new Date(today.toDateString())) {
      setError(`${periodNoun} cannot start in the past.`);
      return;
    }
    const maxEnd = new Date(s);
    maxEnd.setMonth(maxEnd.getMonth() + (isTertiary ? 6 : 5));
    if (e > maxEnd) {
      setError(`${periodNoun} duration exceeds standard limits (${isTertiary ? '6' : '5'} months).`);
      return;
    }
    if (e <= s) {
      setError('End date must be after start date.');
      return;
    }
    if (!/^\d{4}$/.test(String(year)) || year < 2020 || year > 2099) {
      setError('Year must be a 4-digit value between 2020 and 2099.');
      return;
    }

    if (mode === 'next') {
      if (!currentTerm) {
        setError(`No current ${periodNoun.toLowerCase()} detected; set the current ${periodNoun.toLowerCase()} first.`);
        return;
      }
      let expectedTerm = currentTerm.term + 1;
      let expectedYear = currentTerm.year;
      const maxTerms = isTertiary ? 2 : 3;
      if (expectedTerm > maxTerms) {
        expectedTerm = 1;
        expectedYear = currentTerm.year + 1;
      }
      if (term !== expectedTerm || year !== expectedYear) {
        setError(`Next ${periodNoun.toLowerCase()} must be ${periodNoun} ${expectedTerm} of ${expectedYear}.`);
        return;
      }
      if (s <= new Date(currentTerm.end_date)) {
        setError(`Next ${periodNoun.toLowerCase()} must start after the current ${periodNoun.toLowerCase()} ends.`);
        return;
      }
    }

    setSaving(true);
    const { error: upErr } = await supabase
      .from('school_terms')
      .upsert(
        { school_id: schoolId, year, term, start_date: start, end_date: end },
        { onConflict: 'school_id,year,term' }
      );
    setSaving(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    const { data } = await supabase
      .from('school_terms')
      .select('*')
      .eq('school_id', schoolId)
      .order('year', { ascending: false })
      .order('term', { ascending: true });
    setRows(data || []);
  };

  const saveNextTermBeginsDate = async () => {
    if (!schoolId || !nextTermBeginsDate) {
      setError('Please select a date before saving.');
      return;
    }
    setSavingNextTermDate(true);
    setError(null);
    setNextTermDateSuccess(null);
    const { data, error: err } = await supabase
      .from('schools')
      .update({ next_term_begins_date: nextTermBeginsDate })
      .eq('school_id', schoolId)
      .select('next_term_begins_date')
      .single();
    setSavingNextTermDate(false);
    if (err) {
      setError(`Failed to save: ${err.message}`);
    } else {
      setNextTermDateSuccess(`Next ${periodNoun.toLowerCase()} begins date saved successfully!`);
      if (data?.next_term_begins_date) setNextTermBeginsDate(data.next_term_begins_date);
      setTimeout(() => setNextTermDateSuccess(null), 3000);
    }
  };

  const currentTermRow = currentTerm
    ? rows.find((r) => r.year === currentTerm.year && r.term === currentTerm.term) ?? null
    : null;
  let nextTermRow: TermRow | null = null;
  if (currentTermRow) {
    let nextT = currentTermRow.term + 1;
    let nextY = currentTermRow.year;
    const maxTerms = isTertiary ? 2 : 3;
    if (nextT > maxTerms) {
      nextT = 1;
      nextY = currentTermRow.year + 1;
    }
    nextTermRow = rows.find((r) => r.year === nextY && r.term === nextT) || null;
  }
  const displayRows = [currentTermRow, nextTermRow].filter(Boolean) as TermRow[];

  return (
    <div>
      <SectionHeader
        embedded={embedded}
        title={isTertiary ? 'Semester & Session Settings' : 'Term Settings'}
        desc={
          isTertiary
            ? 'Configure the active academic semester and calendar dates for programmes and clinical rotations.'
            : 'Configure the current school term. Three terms per year (1, 2, 3).'
        }
      />

      <div className={`mb-4 ${settingsInsetSurface} border border-[var(--pw-blue)]/35 p-4`}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h4 className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--pw-blue, #3d8ef8)' }}>
            <Calendar className="h-4 w-4 text-[var(--pw-blue)]" />
            {isTertiary ? 'Uganda Tertiary & Health Training Academic Calendar' : 'Uganda Academic Calendar'}
          </h4>
          <button
            type="button"
            onClick={() => setShowTermInfo(!showTermInfo)}
            className="text-xs ac-text-secondary underline decoration-[var(--pw-blue)]/50 hover:brightness-125"
          >
            {showTermInfo ? 'Hide' : 'Show'} Details
          </button>
        </div>
        {showTermInfo && (
          <div className="mt-3 space-y-2 text-xs ac-text-secondary">
            {isTertiary ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded border border-[var(--pw-border)] bg-[var(--pw-s3)] p-2">
                  <div className="mb-1 font-medium ac-text-primary">Semester I</div>
                  <div>August / Sept - January</div>
                  <div className="ac-text-muted">~17 weeks (Theory & Skills Lab)</div>
                </div>
                <div className="rounded border border-[var(--pw-border)] bg-[var(--pw-s3)] p-2">
                  <div className="mb-1 font-medium ac-text-primary">Semester II</div>
                  <div>February - June</div>
                  <div className="ac-text-muted">~17 weeks (Theory & Clinicals)</div>
                </div>
                <div className="rounded border border-[var(--pw-border)] bg-[var(--pw-s3)] p-2">
                  <div className="mb-1 font-medium ac-text-primary">Recess / Practicum</div>
                  <div>June - August</div>
                  <div className="ac-text-muted">~8-10 weeks (Hospital Placement)</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded border border-[var(--pw-border)] bg-[var(--pw-s3)] p-2">
                  <div className="mb-1 font-medium ac-text-primary">Term I</div>
                  <div>February - May</div>
                  <div className="ac-text-muted">Duration: ~3 months</div>
                </div>
                <div className="rounded border border-[var(--pw-border)] bg-[var(--pw-s3)] p-2">
                  <div className="mb-1 font-medium ac-text-primary">Term II</div>
                  <div>June - August</div>
                  <div className="ac-text-muted">Duration: ~2.5 months</div>
                </div>
                <div className="rounded border border-[var(--pw-border)] bg-[var(--pw-s3)] p-2">
                  <div className="mb-1 font-medium ac-text-primary">Term III</div>
                  <div>September - December</div>
                  <div className="ac-text-muted">Duration: ~3 months</div>
                </div>
              </div>
            )}
            <p className="mt-2 flex items-center gap-1.5 italic ac-text-muted">
              <Info className="h-3.5 w-3.5 text-[var(--pw-blue)]" />
              {isTertiary
                ? 'Standard UHPAB and health training academic sessions. You can customize dates below.'
                : 'These are standard Uganda term dates. You can customize dates below.'}
            </p>
          </div>
        )}
      </div>

      <div className={`${settingsInsetSurface} mb-4 space-y-4 p-4 sm:p-5`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm ac-text-secondary">
          <input
            type="radio"
            className="accent-blue-500"
            checked={mode === 'current'}
            onChange={() => setMode('current')}
          />
          Edit Current {periodNoun}
        </label>
        <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm ac-text-secondary">
          <input
            type="radio"
            className="accent-blue-500"
            checked={mode === 'next'}
            onChange={() => setMode('next')}
          />
          Edit Next {periodNoun}
        </label>
        {currentTerm && (
          <span className="text-sm ac-text-muted">
            Current: {periodNoun} {currentTerm.term}, {currentTerm.year} (
            {currentTerm.start_date
              ? new Date(currentTerm.start_date).toLocaleDateString()
              : 'Start TBD'}{' '}
            - {new Date(currentTerm.end_date).toLocaleDateString()})
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <input
          type="number"
          min={2020}
          max={2099}
          className="ac-input min-h-[44px] w-full"
          value={year}
          onChange={(e) =>
            setYear(parseInt((e.target.value || '').slice(0, 4) || String(new Date().getFullYear()), 10))
          }
        />
        <select
          className="ac-input min-h-[44px] w-full"
          value={term}
          onChange={(e) => setTerm(parseInt(e.target.value, 10))}
        >
          <option value={1}>{isTertiary ? 'Semester 1' : 'Term 1'}</option>
          <option value={2}>{isTertiary ? 'Semester 2' : 'Term 2'}</option>
          <option value={3}>{isTertiary ? 'Recess / Semester 3' : 'Term 3'}</option>
        </select>
        <input
          type="date"
          className="ac-input min-h-[44px] w-full"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
        <input
          type="date"
          className="ac-input min-h-[44px] w-full"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
        <button
          type="button"
          disabled={!schoolId || saving}
          onClick={save}
          className={settingsPrimaryActionClass}
        >
          {saving ? 'Saving...' : `Save ${periodNoun}`}
        </button>
      </div>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-400/40 bg-red-950/50 px-3 py-2 text-sm text-red-100">
          {error}
        </div>
      )}

      <div className="mt-4 text-sm ac-text-secondary">Configured {periodNounPlural.toLowerCase()}</div>
      <div className={`mt-2 overflow-x-auto ${settingsInsetSurface}`}>
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--pw-s3)]">
            <tr className="text-left">
              <th className="px-4 py-2 ac-text-muted">Year</th>
              <th className="px-4 py-2 ac-text-muted">{periodNoun}</th>
              <th className="px-4 py-2 ac-text-muted">Start</th>
              <th className="px-4 py-2 ac-text-muted">End</th>
            </tr>
          </thead>
          <tbody className="[&>tr:nth-child(even)]:bg-[var(--pw-s3)]/40">
            {displayRows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-3 ac-text-secondary">
                  No {periodNounPlural.toLowerCase()} set yet.
                </td>
              </tr>
            ) : (
              displayRows.map((r) => {
                const isCurrent = r === currentTermRow;
                return (
                  <tr key={`${r.year}-${r.term}`} className="border-t border-[var(--pw-border)]">
                    <td className="px-4 py-2 ac-text-primary">{r.year}</td>
                    <td className="px-4 py-2 ac-text-secondary">
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          isCurrent ? 'bg-green-600/25 text-green-200' : 'bg-blue-600/25 text-blue-200'
                        }`}
                      >
                        {isCurrent ? 'Current' : 'Next'} ({isTertiary ? (r.term === 3 ? 'Recess' : `Sem ${r.term}`) : `Term ${r.term}`})
                      </span>
                    </td>
                    <td className="px-4 py-2 ac-text-secondary">
                      {r.start_date ? new Date(r.start_date).toLocaleDateString() : 'TBD'}
                    </td>
                    <td className="px-4 py-2 ac-text-secondary">
                      {new Date(r.end_date).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className={`mt-6 ${settingsInsetSurface} border border-emerald-500/35 bg-emerald-950/20 p-4 dark:bg-emerald-950/25`}>
        <h3 className="mb-3 flex items-center gap-2 font-medium text-emerald-200">
          <Calendar className="h-4 w-4 text-emerald-300" />
          {isTertiary ? 'Next Semester Begins Date' : 'Next Term Begins Date'}
        </h3>
        <p className="mb-3 text-sm ac-text-secondary">
          {isTertiary
            ? 'Set the date when the next semester or clinical intake begins. This will appear on student result slips and transcripts.'
            : 'Set the date when the next term begins. This will appear on student report cards.'}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="date"
            value={nextTermBeginsDate}
            onChange={(e) => setNextTermBeginsDate(e.target.value)}
            className="ac-input min-h-[44px] w-full sm:w-auto"
          />
          <button
            type="button"
            onClick={saveNextTermBeginsDate}
            disabled={!schoolId || !nextTermBeginsDate || savingNextTermDate}
            className={settingsPrimaryActionClass}
          >
            {savingNextTermDate ? 'Saving...' : 'Save Date'}
          </button>
        </div>
        {nextTermDateSuccess && (
          <div className="mt-3 rounded-lg border border-emerald-400/35 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100">
            {nextTermDateSuccess}
          </div>
        )}
      </div>
    </div>
  );
}
