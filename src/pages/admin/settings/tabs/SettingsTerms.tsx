import { useEffect, useState } from 'react';
import { Calendar, Info } from 'lucide-react';
import { useSchoolType } from '@/hooks/useSchoolType';
import { supabase } from '@/lib/supabase';
import { resolveCurrentSchoolTerm } from '@/lib/adminFinanceTerm';
import SectionHeader from './SectionHeader';
import { settingsInsetSurface, settingsPrimaryActionClass } from './settingsTabStyles';
import '@/styles/government-system.css';

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
  const periodNoun = isTertiary ? 'Academic Period' : 'Term';
  const periodNounPlural = isTertiary ? 'Academic Periods' : 'Terms';

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
        ? month <= 7 ? 1 : 2
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
  const displayRows = rows.length > 0 ? rows : ([currentTermRow].filter(Boolean) as TermRow[]);

  return (
    <div>
      <SectionHeader
        embedded={embedded}
        title={isTertiary ? 'Institutional Academic Periods & Calendar Sessions' : 'Term Settings'}
        desc={
          isTertiary
            ? 'Configure the college teaching calendar dates for Academic Period 1 and Academic Period 2. During each period, all enrolled cohorts attend their respective stage classes concurrently.'
            : 'Configure the current school term. Three terms per year (1, 2, 3).'
        }
      />

      <div className="mb-4 gov-card rounded-lg border border-[#CCCCCC] bg-white p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h4 className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-[#111111]">
            <Calendar className="h-4 w-4 text-[#555555]" />
            {isTertiary ? 'ACADEMIC PERIODS & CALENDAR SESSIONS' : 'ACADEMIC CALENDAR'}
          </h4>
          <button
            type="button"
            onClick={() => setShowTermInfo(!showTermInfo)}
            className="gov-btn gov-btn-sm"
          >
            {showTermInfo ? 'HIDE DETAILS' : 'VIEW DETAILS'}
          </button>
        </div>
        {showTermInfo && (
          <div className="mt-3 space-y-2 text-xs text-[#555555] font-mono">
            {isTertiary ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded border border-[#CCCCCC] bg-[#F8F9FA] p-3">
                  <div className="mb-1 font-bold text-[#111111] uppercase">ACADEMIC PERIOD 1 (FIRST SESSION)</div>
                  <div className="text-[11px] text-[#555555]">FEBRUARY / MARCH – JUNE / JULY</div>
                  <div className="text-[10px] text-[#777777] mt-1">Classroom instruction, continuous assessments, and hospital ward clinical rotations.</div>
                </div>
                <div className="rounded border border-[#CCCCCC] bg-[#F8F9FA] p-3">
                  <div className="mb-1 font-bold text-[#111111] uppercase">ACADEMIC PERIOD 2 (SECOND SESSION)</div>
                  <div className="text-[11px] text-[#555555]">AUGUST / SEPTEMBER – DECEMBER / JANUARY</div>
                  <div className="text-[10px] text-[#777777] mt-1">Curriculum lectures, hospital ward rotations, and UNMEB national examination series.</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded border border-[#CCCCCC] bg-[#F8F9FA] p-2.5">
                  <div className="mb-1 font-bold text-[#111111]">TERM I</div>
                  <div className="text-[11px]">February - May (~3 months)</div>
                </div>
                <div className="rounded border border-[#CCCCCC] bg-[#F8F9FA] p-2.5">
                  <div className="mb-1 font-bold text-[#111111]">TERM II</div>
                  <div className="text-[11px]">June - August (~2.5 months)</div>
                </div>
                <div className="rounded border border-[#CCCCCC] bg-[#F8F9FA] p-2.5">
                  <div className="mb-1 font-bold text-[#111111]">TERM III</div>
                  <div className="text-[11px]">September - December (~3 months)</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="gov-card rounded-lg border border-[#CCCCCC] bg-white mb-4 space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-mono font-bold text-[#222222]">
            <input
              type="radio"
              className="accent-[#111111]"
              checked={mode === 'current'}
              onChange={() => setMode('current')}
            />
            EDIT CURRENT {periodNoun.toUpperCase()}
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-xs font-mono font-bold text-[#222222]">
            <input
              type="radio"
              className="accent-[#111111]"
              checked={mode === 'next'}
              onChange={() => setMode('next')}
            />
            EDIT NEXT {periodNoun.toUpperCase()}
          </label>
          {currentTerm && (
            <span className="text-xs font-mono text-[#666666]">
              ACTIVE: {periodNoun.toUpperCase()} {currentTerm.term}, {currentTerm.year} (
              {currentTerm.start_date
                ? new Date(currentTerm.start_date).toLocaleDateString()
                : 'START TBD'}{' '}
              - {new Date(currentTerm.end_date).toLocaleDateString()})
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <input
            type="number"
            min={2020}
            max={2099}
            className="gov-input w-full text-xs font-mono"
            value={year}
            onChange={(e) =>
              setYear(parseInt((e.target.value || '').slice(0, 4) || String(new Date().getFullYear()), 10))
            }
          />
          <select
            className="gov-select w-full text-xs"
            value={term}
            onChange={(e) => setTerm(parseInt(e.target.value, 10))}
          >
            <option value={1}>{isTertiary ? 'Period 1 (First Session)' : 'Term 1'}</option>
            <option value={2}>{isTertiary ? 'Period 2 (Second Session)' : 'Term 2'}</option>
            {!isTertiary && <option value={3}>Term 3</option>}
          </select>
          <input
            type="date"
            className="gov-input w-full text-xs font-mono"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
          <input
            type="date"
            className="gov-input w-full text-xs font-mono"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
          <button
            type="button"
            disabled={!schoolId || saving}
            onClick={save}
            className="gov-btn gov-btn-sm gov-btn-primary"
          >
            {saving ? 'SAVING…' : `SAVE ${periodNoun.toUpperCase()}`}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded border border-[#EF4444] bg-[#FEF2F2] px-3 py-2 text-xs font-mono font-bold text-[#B91C1C]">
          {error}
        </div>
      )}

      <div className="mt-4 text-xs font-mono font-bold uppercase text-[#555555]">
        CONFIGURED {periodNounPlural.toUpperCase()}
      </div>
      <div className="mt-2 gov-table-container">
        <table className="gov-table w-full text-xs">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left font-mono uppercase text-[10px] text-[#555555] border-r border-[#CCCCCC]">YEAR</th>
              <th className="px-3 py-2 text-left font-mono uppercase text-[10px] text-[#555555] border-r border-[#CCCCCC]">{periodNoun.toUpperCase()}</th>
              <th className="px-3 py-2 text-left font-mono uppercase text-[10px] text-[#555555] border-r border-[#CCCCCC]">START DATE</th>
              <th className="px-3 py-2 text-left font-mono uppercase text-[10px] text-[#555555]">END DATE</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-3 text-center text-xs font-mono text-[#666666]">
                  NO {periodNounPlural.toUpperCase()} CONFIGURED YET.
                </td>
              </tr>
            ) : (
              displayRows.map((r) => {
                const isCurrent = r === currentTermRow;
                return (
                  <tr key={`${r.year}-${r.term}`} className="border-b border-[#E5E5E5] hover:bg-[#F9FAFB]">
                    <td className="px-3 py-2 font-mono text-[#111111] border-r border-[#CCCCCC]">{r.year}</td>
                    <td className="px-3 py-2 font-bold text-[#111111] border-r border-[#CCCCCC]">
                      {isTertiary
                        ? (isCurrent ? (
                            <span className="flex items-center gap-2">
                              <span>Academic Period {r.term}</span>
                              <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-bold bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC] rounded">
                                ACTIVE
                              </span>
                            </span>
                          ) : (
                            `Academic Period ${r.term}`
                          ))
                        : (isCurrent ? (
                            <span className="flex items-center gap-2">
                              <span>Term {r.term}</span>
                              <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-bold bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC] rounded">
                                ACTIVE
                              </span>
                            </span>
                          ) : (
                            `Term ${r.term}`
                          ))}
                    </td>
                    <td className="px-3 py-2 font-mono text-[#444444] border-r border-[#CCCCCC]">
                      {r.start_date ? new Date(r.start_date).toLocaleDateString() : 'TBD'}
                    </td>
                    <td className="px-3 py-2 font-mono text-[#444444]">
                      {new Date(r.end_date).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 gov-card rounded-lg border border-[#CCCCCC] bg-white p-4 space-y-3">
        <h3 className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-[#111111]">
          <Calendar className="h-4 w-4 text-[#555555]" />
          {isTertiary ? 'NEXT ACADEMIC PERIOD COMMENCEMENT DATE' : 'NEXT TERM COMMENCEMENT DATE'}
        </h3>
        <p className="text-xs text-[#555555] font-mono">
          {isTertiary
            ? 'Set the commencement date for the upcoming academic period. This timestamp is printed onto official student academic result slips.'
            : 'Set the date when the next term begins. This will appear on student report cards.'}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="date"
            value={nextTermBeginsDate}
            onChange={(e) => setNextTermBeginsDate(e.target.value)}
            className="gov-input w-full sm:w-auto text-xs font-mono"
          />
          <button
            type="button"
            onClick={saveNextTermBeginsDate}
            disabled={!schoolId || !nextTermBeginsDate || savingNextTermDate}
            className="gov-btn gov-btn-sm gov-btn-primary"
          >
            {savingNextTermDate ? 'SAVING…' : 'SAVE COMMENCEMENT DATE'}
          </button>
        </div>
        {nextTermDateSuccess && (
          <div className="mt-3 rounded border border-[#22C55E] bg-[#F0FDF4] px-3 py-2 text-xs font-mono font-bold text-[#15803D]">
            {nextTermDateSuccess}
          </div>
        )}
      </div>
    </div>
  );
}
