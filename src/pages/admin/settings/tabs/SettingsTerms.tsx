import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import SectionHeader from './SectionHeader';

type TermRow = {
  id?: string;
  year: number;
  term: number;
  start_date: string | null;
  end_date: string;
};

export default function SettingsTerms({ schoolId }: { schoolId: string | null }) {
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
      const current = (data || []).find(
        (r: TermRow) =>
          (r.start_date ? r.start_date <= todayStr && r.end_date >= todayStr : r.end_date >= todayStr)
      );
      if (current) {
        setCurrentTerm({
          year: current.year,
          term: current.term,
          start_date: current.start_date || '',
          end_date: current.end_date,
        });
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
      const guessTerm = month <= 4 ? 1 : month <= 7 ? 2 : 3;
      setYear(now.getFullYear());
      setTerm(guessTerm);
    } else {
      if (currentTerm) {
        let nextTerm = currentTerm.term + 1;
        let nextYear = currentTerm.year;
        if (nextTerm > 3) {
          nextTerm = 1;
          nextYear = currentTerm.year + 1;
        }
        setYear(nextYear);
        setTerm(nextTerm);
      } else {
        const guessTerm = month <= 4 ? 2 : month <= 7 ? 3 : 1;
        setYear(month <= 7 ? now.getFullYear() : now.getFullYear() + 1);
        setTerm(guessTerm);
      }
    }
  }, [mode, currentTerm]);

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
        setError('Current term cannot end in the past.');
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
      setError('Start date is required for next term or when setting both dates.');
      return;
    }

    const s = new Date(start);
    const e = new Date(end);
    const today = new Date();
    if (s < new Date(today.toDateString())) {
      setError('Term cannot start in the past.');
      return;
    }
    const maxEnd = new Date(s);
    maxEnd.setMonth(maxEnd.getMonth() + 5);
    if (e > maxEnd) {
      setError('Term cannot exceed 5 months.');
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
        setError('No current term detected; set the current term first.');
        return;
      }
      let expectedTerm = currentTerm.term + 1;
      let expectedYear = currentTerm.year;
      if (expectedTerm > 3) {
        expectedTerm = 1;
        expectedYear = currentTerm.year + 1;
      }
      if (term !== expectedTerm || year !== expectedYear) {
        setError(`Next term must be Term ${expectedTerm} of ${expectedYear}.`);
        return;
      }
      if (s <= new Date(currentTerm.end_date)) {
        setError('Next term must start after the current term ends.');
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
      setNextTermDateSuccess('Next term begins date saved successfully!');
      if (data?.next_term_begins_date) setNextTermBeginsDate(data.next_term_begins_date);
      setTimeout(() => setNextTermDateSuccess(null), 3000);
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const currentTermRow = rows.find((r) =>
    r.start_date
      ? r.start_date <= todayStr && r.end_date >= todayStr
      : r.end_date >= todayStr
  );
  let nextTermRow: TermRow | null = null;
  if (currentTermRow) {
    let nextT = currentTermRow.term + 1;
    let nextY = currentTermRow.year;
    if (nextT > 3) {
      nextT = 1;
      nextY = currentTermRow.year + 1;
    }
    nextTermRow = rows.find((r) => r.year === nextY && r.term === nextT) || null;
  }
  const displayRows = [currentTermRow, nextTermRow].filter(Boolean) as TermRow[];

  return (
    <div>
      <SectionHeader
        title="Term Settings"
        desc="Configure the current school term. Three terms per year (1, 2, 3)."
      />

      <div className="mb-4 rounded-lg border border-blue-500/30 bg-blue-600/10 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-medium text-blue-700">📅 Uganda Academic Calendar</h4>
          <button
            type="button"
            onClick={() => setShowTermInfo(!showTermInfo)}
            className="text-xs text-blue-700 hover:text-blue-800"
          >
            {showTermInfo ? 'Hide' : 'Show'} Details
          </button>
        </div>
        {showTermInfo && (
          <div className="mt-3 space-y-2 text-xs text-gray-700">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded bg-gray-50 p-2">
                <div className="mb-1 font-medium text-gray-900">Term I</div>
                <div>February - May</div>
                <div className="text-gray-600">Duration: ~3 months</div>
              </div>
              <div className="rounded bg-gray-50 p-2">
                <div className="mb-1 font-medium text-gray-900">Term II</div>
                <div>June - August</div>
                <div className="text-gray-600">Duration: ~2.5 months</div>
              </div>
              <div className="rounded bg-gray-50 p-2">
                <div className="mb-1 font-medium text-gray-900">Term III</div>
                <div>September - December</div>
                <div className="text-gray-600">Duration: ~3 months</div>
              </div>
            </div>
            <p className="mt-2 italic text-gray-600">
              ℹ️ These are standard Uganda term dates. You can customize dates below.
            </p>
          </div>
        )}
      </div>

      <div className="mb-3 flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="radio"
            className="accent-blue-500"
            checked={mode === 'current'}
            onChange={() => setMode('current')}
          />
          Edit Current Term
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="radio"
            className="accent-blue-500"
            checked={mode === 'next'}
            onChange={() => setMode('next')}
          />
          Edit Next Term
        </label>
        {currentTerm && (
          <span className="text-sm text-gray-500">
            Current: Term {currentTerm.term}, {currentTerm.year} (
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
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900"
          value={year}
          onChange={(e) =>
            setYear(parseInt((e.target.value || '').slice(0, 4) || String(new Date().getFullYear()), 10))
          }
        />
        <select
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900"
          value={term}
          onChange={(e) => setTerm(parseInt(e.target.value, 10))}
        >
          <option value={1} className="bg-slate-900">Term 1</option>
          <option value={2} className="bg-slate-900">Term 2</option>
          <option value={3} className="bg-slate-900">Term 3</option>
        </select>
        <input
          type="date"
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
        <input
          type="date"
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
        <button
          type="button"
          disabled={!schoolId || saving}
          onClick={save}
          className="rounded-lg bg-green-600 px-3 py-2 hover:bg-green-500 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Term'}
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="mt-4 text-sm text-gray-700">Configured terms</div>
      <div className="mt-2 overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="px-4 py-2 text-gray-700">Year</th>
              <th className="px-4 py-2 text-gray-700">Term</th>
              <th className="px-4 py-2 text-gray-700">Start</th>
              <th className="px-4 py-2 text-gray-700">End</th>
            </tr>
          </thead>
          <tbody className="[&>tr:nth-child(even)]:bg-gray-50">
            {displayRows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-3 text-gray-700">
                  No terms set yet.
                </td>
              </tr>
            ) : (
              displayRows.map((r) => {
                const isCurrent = r === currentTermRow;
                return (
                  <tr key={`${r.year}-${r.term}`} className="border-t border-gray-200">
                    <td className="px-4 py-2 text-gray-900">{r.year}</td>
                    <td className="px-4 py-2 text-gray-800">
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          isCurrent ? 'bg-green-600/20 text-green-300' : 'bg-blue-600/20 text-blue-700'
                        }`}
                      >
                        {isCurrent ? 'Current' : 'Next'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-800">
                      {r.start_date ? new Date(r.start_date).toLocaleDateString() : 'TBD'}
                    </td>
                    <td className="px-4 py-2 text-gray-800">
                      {new Date(r.end_date).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-lg border border-green-500/30 bg-green-600/10 p-4">
        <h3 className="mb-3 font-medium text-green-800">📅 Next Term Begins Date</h3>
        <p className="mb-3 text-sm text-gray-500">
          Set the date when the next term begins. This will appear on student report cards.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={nextTermBeginsDate}
            onChange={(e) => setNextTermBeginsDate(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900"
          />
          <button
            type="button"
            onClick={saveNextTermBeginsDate}
            disabled={!schoolId || !nextTermBeginsDate || savingNextTermDate}
            className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-500 disabled:opacity-50"
          >
            {savingNextTermDate ? 'Saving...' : 'Save Date'}
          </button>
        </div>
        {nextTermDateSuccess && (
          <div className="mt-3 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-200">
            {nextTermDateSuccess}
          </div>
        )}
      </div>
    </div>
  );
}
