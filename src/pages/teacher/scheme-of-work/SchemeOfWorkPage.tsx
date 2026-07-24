import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutList, Plus, Trash2, Save, Download, Loader2, Check, AlertCircle, RefreshCw, Sparkles, Wand2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { aiPlannerApiUrl } from '@/lib/aiPlannerApiOrigin';
import { useTeacherContext } from '../useTeacherContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Types ───────────────────────────────────────────────────────────────────

type EntryRow = {
  id: string;
  week_number: number;
  period_number: number;
  theme: string;
  sub_theme: string;
  content: string;
  competences: string;
  methods: string;
  activity: string;
  life_skills: string;
  materials: string;
  reference: string;
  remarks: string;
  sort_order: number;
  _isNew?: boolean;
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const TERMS = ['1', '2', '3'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

// ─── Template helpers ─────────────────────────────────────────────────────────

function makeId(): string {
  return `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function blankEntry(wk: number, pd: number, order: number): EntryRow {
  return {
    id: makeId(), week_number: wk, period_number: pd,
    theme: '', sub_theme: '', content: '', competences: '',
    methods: '', activity: '', life_skills: '', materials: '',
    reference: '', remarks: '', sort_order: order, _isNew: true,
  };
}

function blankTemplate(): EntryRow[] {
  return Array.from({ length: 13 }, (_, i) => blankEntry(i + 1, 1, i));
}

function p1EnglishGrammarT3(): EntryRow[] {
  const rows: [number, number, string, string, string, string, string, string, string, string, string][] = [
    [1, 1, 'Our Transport', 'Types & means of transport', 'Plurals with (s): car–cars, road–roads, bicycle–bicycles, boat–boats, train–trains, ship–ships, pencil–pencils, pen–pens', 'Reading words correctly; Spelling and writing the words correctly', 'Question and answer', 'Reading; Spelling; Writing; Answering', 'Effective communication; Critical thinking', 'A chart showing plurals (s)', ''],
    [1, 2, 'Our Transport', 'Types & means of transport', 'Plurals with (es): bus–buses, mango–mangoes, bench–benches, church–churches', 'Reading words correctly; Spelling and writing the words correctly', 'Question and answer', 'Reading; Spelling; Writing', 'Effective communication; Critical thinking', 'A chart showing plurals (es)', ''],
    [2, 1, 'Our Transport', 'Types & means of transport', 'Plurals with (ies): lorry–lorries, baby–babies, lady–ladies, body–bodies', 'Reading and writing correctly', 'Look and say; Q&A', 'Reading; Spelling; Writing', 'Critical thinking; Effective communication', 'A chart showing plurals (ies)', ''],
    [2, 2, 'Our Transport', 'Types & means of transport', 'Plurals with (ves): knife–knives, leaf–leaves; Vowel change: man–men, woman–women, tooth–teeth, foot–feet, goose–geese', 'Reading, spelling and writing; Differentiating nouns that change completely', 'Look, say and use; Q&A', 'Reading; Spelling; Writing; Answering', 'Creative thinking; Effective communication', 'A chart showing nouns (ves) and those which change completely', ''],
    [3, 1, 'Our Community', 'People in our community', 'Common nouns vs proper nouns: book, pen, dog vs John, Kampala, Uganda', 'Reading and writing nouns; Differentiating common from proper nouns', 'Discussion; Q&A', 'Reading; Writing; Identifying nouns', 'Effective communication', 'Chart with nouns', ''],
    [4, 1, 'Our Community', 'People in our community', 'Pronouns: I, you, he, she, it, we, they; Using pronouns in sentences', 'Using pronouns correctly in sentences', 'Q&A; Discussion', 'Reading; Writing sentences', 'Effective communication', 'Chart with pronouns', ''],
    [5, 1, 'Our Community', 'Activities in community', 'Verbs (doing words): run, jump, eat, sleep, read, write; Writing sentences with verbs', 'Identifying and using verbs in sentences', 'Q&A; Demonstration', 'Writing; Reading', 'Critical thinking', 'Chart with action words', ''],
    [6, 1, 'Our Environment', 'The environment', 'Adjectives (describing words): big, small, hot, cold, tall, short; Describing objects', 'Describing objects using adjectives correctly', 'Q&A; Discussion', 'Reading; Writing; Describing', 'Creative thinking; Self expression', 'Charts with describing words; class objects', ''],
    [7, 1, 'Our Environment', 'Things in the environment', 'Prepositions: in, on, under, over, near, next to, behind, in front of; Constructing sentences', 'Constructing sentences with prepositions; Reading and drawing', 'Imitation; Demonstration; Discussion', 'Constructing sentences; Reading; Drawing', 'Logical thinking; Self expression; Creative thinking', 'Chart showing prepositions; class objects', ''],
    [8, 1, 'Food and Nutrition', 'Types of food', 'Composition: My Family (guided writing, 5–8 sentences)', 'Writing a short composition about family', 'Guided writing; Discussion', 'Writing; Reading aloud', 'Self expression; Creative thinking', 'Writing guide chart; Exercise books', ''],
    [9, 1, 'Food and Nutrition', 'Our food', 'Comprehension: Reading a passage and answering questions', 'Reading and understanding a passage; Answering comprehension questions', 'Guided reading; Q&A', 'Reading; Answering questions', 'Effective communication; Critical thinking', 'Comprehension cards; Textbooks', ''],
    [10, 1, 'Our Health', 'Keeping healthy', 'Punctuation: capital letters, full stop, question mark, comma', 'Using punctuation marks correctly in sentences', 'Discussion; Q&A', 'Writing; Correcting sentences', 'Effective communication; Critical thinking', 'Chart with punctuation examples; Exercise books', ''],
    [11, 1, 'Our Health', 'Health practices', 'Sentence construction: simple sentences; compound sentences using "and" and "but"', 'Constructing and writing correct sentences', 'Guided writing; Q&A', 'Writing; Reading', 'Effective communication', 'Chalkboard examples; Exercise books', ''],
    [12, 1, 'Revision', 'All topics covered', 'Revision of all topics: plurals, pronouns, verbs, adjectives, prepositions, composition, comprehension, punctuation', 'Answering revision questions correctly; Self-assessment', 'Q&A; Group work', 'Answering; Reviewing; Correcting', 'Critical thinking; Self evaluation', 'Past exercises; Textbooks', ''],
    [13, 1, 'End of Term', '', 'End of term test; Holiday work; Closing activities', 'Demonstrating mastery of term work', 'Test', 'Writing test; Collecting holiday work', 'Responsibility; Diligence', 'Test papers', ''],
  ];
  return rows.map(([wk, pd, th, sth, ct, cp, mt, ac, ls, ml, rf], i) => ({
    id: makeId(),
    week_number: wk as number, period_number: pd as number,
    theme: th as string, sub_theme: sth as string, content: ct as string,
    competences: cp as string, methods: mt as string, activity: ac as string,
    life_skills: ls as string, materials: ml as string,
    reference: rf as string, remarks: '', sort_order: i, _isNew: true,
  }));
}

function topClassWritingTemplate(term: string): EntryRow[] {
  const allLetters = ['Aa','Bb','Cc','Dd','Ee','Ff','Gg','Hh','Ii','Jj','Kk','Ll','Mm','Nn','Oo','Pp','Qq','Rr','Ss','Tt','Uu','Vv','Ww','Xx','Yy','Zz'];
  const offset = term === '2' ? 9 : term === '3' ? 18 : 0;
  const letters = allLetters.slice(offset, offset + 12);
  const rows: EntryRow[] = [];
  if (term === '1') {
    rows.push({ ...blankEntry(1, 1, 0), theme: 'Orientation', content: 'Orientation activities; Introduction of pupils; Drawing patterns', methods: 'Story telling; Q&A', activity: 'Introductions; Drawing patterns; Listing names', life_skills: 'Listening; Speaking', materials: 'Chalkboard; Paperwork', _isNew: true });
  }
  letters.forEach((letter, i) => {
    const wk = term === '1' ? i + 2 : i + 1;
    if (wk > 13) return;
    const name = letter[0];
    const words = { A:'apple, ant, arm', B:'ball, book, bat', C:'cat, cow, cup', D:'dog, doll, duck', E:'egg, egg plant', F:'fish, frog, flag', G:'girl, goat, gate', H:'hen, hat, house', I:'ink, insect', J:'jik, joke, jam', K:'kite, key, king', L:'lion, leaf, lamp', M:'mango, moon, map', N:'nose, net, nail', O:'orange, ox, oil', P:'pen, pot, pig', Q:'queen, quill', R:'rat, rope, ring', S:'sun, sock, sand', T:'tree, table, toy', U:'umbrella, uniform', V:'van, vest, vine', W:'water, wind, wall', X:'box, fox, wax', Y:'yam, yellow, yell', Z:'zero, zoo, zip' };
    const ex = (words as Record<string, string>)[name] || `${name.toLowerCase()}...`;
    rows.push({
      id: makeId(), week_number: wk, period_number: 1,
      theme: 'Developing and using my language appropriately',
      sub_theme: `Letter ${letter}`,
      content: `Writing capital and small letter ${letter}; Words with sound "${name}": ${ex}; Writing a sentence; Shading the pattern`,
      competences: 'Use hands and eyes to perform different activities as instructed; Write capital and small letters correctly',
      methods: 'Demonstration; Imitation; Guided practice',
      activity: `Writing capital & small letters ${letter}; Writing words; Shading patterns`,
      life_skills: 'Listening; Speaking; Writing and shading',
      materials: 'Chalkboard; Paperwork; Books; Pencils; Colours',
      reference: "Teacher's collection",
      remarks: '', sort_order: rows.length, _isNew: true,
    });
  });
  return rows;
}

/** Same fuzzy-matching style already used below for template lookup — no stricter/global
 *  education-level helper exists in this codebase yet worth reusing. */
function detectEducationLevel(className: string): 'primary' | 'secondary' {
  const c = className.toLowerCase().trim();
  if (/^s[1-6]\b/.test(c) || c.includes('senior')) return 'secondary';
  return 'primary';
}

type AiSchemeEntry = {
  week_number: number; period_number: number; theme: string; sub_theme: string; content: string;
  competences: string; methods: string; activity: string; life_skills: string; materials: string;
  reference: string; remarks: string;
};

function aiEntryToRow(e: AiSchemeEntry, order: number): EntryRow {
  return {
    id: makeId(),
    week_number: e.week_number || 1, period_number: e.period_number || 1,
    theme: e.theme ?? '', sub_theme: e.sub_theme ?? '', content: e.content ?? '',
    competences: e.competences ?? '', methods: e.methods ?? '', activity: e.activity ?? '',
    life_skills: e.life_skills ?? '', materials: e.materials ?? '',
    reference: e.reference ?? '', remarks: e.remarks ?? '',
    sort_order: order, _isNew: true,
  };
}

function getTemplate(className: string, subject: string, term: string): EntryRow[] | null {
  const c = className.toLowerCase();
  const s = subject.toLowerCase();
  if ((c.includes('p1') || c === 'primary 1' || c === 'primary one') && s.includes('english') && (s.includes('grammar') || s.includes('composition')) && term === '3') {
    return p1EnglishGrammarT3();
  }
  if ((c.includes('top') && c.includes('class')) || c === 'nursery' || c === 'pre-k' || c === 'pre-primary') {
    if (s.includes('writ')) return topClassWritingTemplate(term);
  }
  return null;
}

// ─── Auto-growing textarea ────────────────────────────────────────────────────

function AutoCell({
  value, onChange, placeholder,
}: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  }, [value]);
  return (
    <textarea
      ref={ref}
      className="w-full bg-transparent text-xs ac-text-primary resize-none outline-none leading-snug min-h-[2.5rem]"
      rows={1}
      value={value}
      placeholder={placeholder}
      onChange={e => { onChange(e.target.value); if (ref.current) { ref.current.style.height = 'auto'; ref.current.style.height = ref.current.scrollHeight + 'px'; } }}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SchemeOfWorkPage() {
  const { schoolId, teacherId, classesWithSubjects, isLoading: ctxLoading } = useTeacherContext();

  // Selector state
  const [selectedClass, setSelectedClass] = useState('');
  const [customClass, setCustomClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('1');
  const [selectedYear, setSelectedYear] = useState(String(CURRENT_YEAR));

  // Scheme state
  const [schemeId, setSchemeId] = useState<string | null>(null);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [schoolName, setSchoolName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // AI generation / edit state
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGrounded, setAiGrounded] = useState<boolean | null>(null);
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiEditing, setAiEditing] = useState(false);
  const [aiMsg, setAiMsg] = useState('');

  // Derived subject options
  const subjectOptions = useMemo(() => {
    const cls = selectedClass === '__custom__' ? customClass : selectedClass;
    const found = classesWithSubjects.find(c => c.class_name === cls);
    return found ? found.subjects : [];
  }, [selectedClass, customClass, classesWithSubjects]);

  const effectiveClass = selectedClass === '__custom__' ? customClass : selectedClass;
  const effectiveSubject = selectedSubject === '__custom__' ? customSubject : selectedSubject;

  // Fetch school name on mount
  useEffect(() => {
    if (!schoolId) return;
    supabase.from('schools').select('name').eq('school_id', schoolId).maybeSingle().then(({ data }) => {
      if (data) setSchoolName((data as { name?: string }).name ?? '');
    });
  }, [schoolId]);

  // Load scheme from DB
  const loadScheme = useCallback(async () => {
    if (!schoolId || !teacherId || !effectiveClass || !effectiveSubject) return;
    setIsLoading(true);
    setErrorMsg('');
    setIsLoaded(false);

    try {
      // Check for existing scheme
      const { data: existing } = await supabase
        .from('scheme_of_work')
        .select('id')
        .eq('school_id', schoolId)
        .eq('teacher_id', teacherId)
        .eq('class_name', effectiveClass)
        .eq('subject', effectiveSubject)
        .eq('term', selectedTerm)
        .eq('year', parseInt(selectedYear))
        .maybeSingle();

      const existingId = (existing as { id?: string } | null)?.id ?? null;

      if (existingId) {
        // Load existing entries
        const { data: rows, error } = await supabase
          .from('scheme_of_work_entries')
          .select('*')
          .eq('scheme_id', existingId)
          .order('sort_order');
        if (error) throw error;
        setSchemeId(existingId);
        setEntries((rows ?? []) as EntryRow[]);
      } else {
        // New scheme: try template then blank
        const template = getTemplate(effectiveClass, effectiveSubject, selectedTerm);
        setSchemeId(null);
        setEntries(template ?? blankTemplate());
      }
      setDeletedIds([]);
      setIsLoaded(true);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Failed to load scheme');
    } finally {
      setIsLoading(false);
    }
  }, [schoolId, teacherId, effectiveClass, effectiveSubject, selectedTerm, selectedYear]);

  // Generate a full scheme with AI, grounded in curated Uganda NCDC curriculum where available
  const generateWithAI = useCallback(async () => {
    if (!effectiveClass || !effectiveSubject) return;
    setAiGenerating(true);
    setErrorMsg('');
    setAiMsg('');
    try {
      const res = await fetch(aiPlannerApiUrl('/api/ai/scheme-of-work'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_name: effectiveClass,
          subject: effectiveSubject,
          term: selectedTerm,
          education_level: detectEducationLevel(effectiveClass),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(
          data.error === 'AI_JSON_PARSE_FAILED'
            ? 'The AI returned an unexpected format. Please try again.'
            : (data.error || 'Failed to generate scheme with AI')
        );
      }
      const rows = (data.entries as AiSchemeEntry[]).map((e, i) => aiEntryToRow(e, i));
      setEntries(rows);
      setDeletedIds([]);
      setIsLoaded(true);
      setAiGrounded(Boolean(data.grounded));
      setAiMsg(
        data.grounded
          ? 'Generated using curated Uganda NCDC curriculum data.'
          : 'AI-generated — no curated curriculum reference available yet for this class/subject/term, review carefully.'
      );
    } catch (e: unknown) {
      // Same fallback role as a failed load — canned templates already work well here
      setErrorMsg(e instanceof Error ? e.message : 'Failed to generate scheme with AI');
    } finally {
      setAiGenerating(false);
    }
  }, [effectiveClass, effectiveSubject, selectedTerm]);

  // Ask AI to modify the current draft via a plain-English instruction — only rows that
  // actually changed are applied, everything else keeps its exact current values.
  const askAiToModify = useCallback(async () => {
    const instruction = aiInstruction.trim();
    if (!instruction || entries.length === 0) return;
    setAiEditing(true);
    setErrorMsg('');
    setAiMsg('');
    try {
      const wireEntries = entries.map(({ week_number, period_number, theme, sub_theme, content, competences, methods, activity, life_skills, materials, reference, remarks }) => (
        { week_number, period_number, theme, sub_theme, content, competences, methods, activity, life_skills, materials, reference, remarks }
      ));
      const res = await fetch(aiPlannerApiUrl('/api/ai/scheme-of-work-edit'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_entries: wireEntries, instruction, class_name: effectiveClass, subject: effectiveSubject, term: selectedTerm }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(
          data.error === 'AI_JSON_PARSE_FAILED'
            ? 'The AI returned an unexpected format. Please try again.'
            : (data.error || 'Failed to apply AI edit')
        );
      }
      const updated = data.entries as AiSchemeEntry[];
      let changedCount = 0;
      setEntries(prev => {
        const byKey = new Map(prev.map(row => [`${row.week_number}-${row.period_number}`, row]));
        const merged = updated.map((u, i) => {
          const key = `${u.week_number}-${u.period_number}`;
          const existing = byKey.get(key);
          const sameContent = existing && (
            existing.theme === u.theme && existing.sub_theme === u.sub_theme && existing.content === u.content &&
            existing.competences === u.competences && existing.methods === u.methods && existing.activity === u.activity &&
            existing.life_skills === u.life_skills && existing.materials === u.materials &&
            existing.reference === u.reference && existing.remarks === u.remarks
          );
          if (existing && sameContent) return existing;
          changedCount += 1;
          // Preserve the DB id when a row already existed (so save() updates it instead of re-inserting)
          if (existing) return { ...aiEntryToRow(u, i), id: existing.id, _isNew: existing._isNew };
          return aiEntryToRow(u, i);
        });
        return merged;
      });
      setAiInstruction('');
      setAiMsg(changedCount > 0 ? `Updated ${changedCount} row${changedCount === 1 ? '' : 's'}.` : 'No changes were needed.');
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Failed to apply AI edit');
    } finally {
      setAiEditing(false);
    }
  }, [aiInstruction, entries, effectiveClass, effectiveSubject, selectedTerm]);

  // Update a cell
  const updateEntry = useCallback((id: string, field: keyof EntryRow, value: string | number) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  }, []);

  // Add a new row
  const addRow = useCallback(() => {
    setEntries(prev => {
      const maxWk = Math.max(1, ...prev.map(e => e.week_number));
      const maxPd = Math.max(0, ...prev.filter(e => e.week_number === maxWk).map(e => e.period_number));
      const order = prev.length;
      return [...prev, blankEntry(maxWk, maxPd + 1, order)];
    });
  }, []);

  // Delete a row
  const deleteRow = useCallback((id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    // If it's a DB row (not a temp new), mark for deletion
    if (!id.startsWith('new-')) {
      setDeletedIds(prev => [...prev, id]);
    }
  }, []);

  // Save scheme to DB
  const saveScheme = useCallback(async () => {
    if (!schoolId || !teacherId || !effectiveClass || !effectiveSubject) return;
    setSaveStatus('saving');
    setErrorMsg('');

    try {
      let sid = schemeId;

      // Upsert header
      if (!sid) {
        const { data: hdr, error: hdrErr } = await supabase
          .from('scheme_of_work')
          .insert({
            school_id: schoolId,
            teacher_id: teacherId,
            class_name: effectiveClass,
            subject: effectiveSubject,
            term: selectedTerm,
            year: parseInt(selectedYear),
            updated_at: new Date().toISOString(),
          })
          .select('id')
          .single();
        if (hdrErr) throw hdrErr;
        sid = (hdr as { id: string }).id;
        setSchemeId(sid);
      } else {
        await supabase
          .from('scheme_of_work')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', sid);
      }

      // Delete removed rows
      if (deletedIds.length > 0) {
        await supabase.from('scheme_of_work_entries').delete().in('id', deletedIds);
        setDeletedIds([]);
      }

      // Upsert all entries
      const toUpsert = entries.map((e, i) => ({
        ...('_isNew' in e && e._isNew ? {} : { id: e.id }),
        scheme_id: sid,
        week_number: e.week_number,
        period_number: e.period_number,
        theme: e.theme,
        sub_theme: e.sub_theme,
        content: e.content,
        competences: e.competences,
        methods: e.methods,
        activity: e.activity,
        life_skills: e.life_skills,
        materials: e.materials,
        reference: e.reference,
        remarks: e.remarks,
        sort_order: i,
      }));

      // Split new vs existing
      const newRows = toUpsert.filter(r => !('id' in r) || r.id === undefined);
      const existingRows = toUpsert.filter(r => 'id' in r && r.id);

      if (newRows.length > 0) {
        const { data: inserted, error: insErr } = await supabase
          .from('scheme_of_work_entries')
          .insert(newRows)
          .select('id, sort_order');
        if (insErr) throw insErr;
        // Update local IDs
        if (inserted) {
          const sortToId = new Map((inserted as { id: string; sort_order: number }[]).map(r => [r.sort_order, r.id]));
          setEntries(prev => prev.map((e, i) => {
            if (e._isNew && sortToId.has(i)) {
              const { _isNew: _removed, ...rest } = e;
              return { ...rest, id: sortToId.get(i)! };
            }
            return e;
          }));
        }
      }

      if (existingRows.length > 0) {
        await Promise.all(existingRows.map(r =>
          supabase.from('scheme_of_work_entries').update(r).eq('id', (r as { id: string }).id)
        ));
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Save failed');
      setSaveStatus('error');
    }
  }, [schoolId, teacherId, effectiveClass, effectiveSubject, selectedTerm, selectedYear, schemeId, entries, deletedIds]);

  // Download PDF
  const downloadPdf = useCallback(() => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 10;

    // Header
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text((schoolName || 'School').toUpperCase(), pageW / 2, 14, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`SCHEME OF WORK FOR ${effectiveSubject.toUpperCase()} — ${effectiveClass.toUpperCase()}`, pageW / 2, 20, { align: 'center' });
    doc.text(`TERM ${selectedTerm}   ·   YEAR ${selectedYear}   ·   Printed: ${new Date().toLocaleDateString('en-UG')}`, pageW / 2, 25, { align: 'center' });

    const headers = ['Wk', 'Pd', 'Theme', 'Sub-Theme', 'Content', 'Competences', 'Methods', 'Activity', 'Life Skills', 'Materials', 'Ref', 'Remarks'];
    const colWidths = [8, 8, 22, 22, 35, 28, 18, 25, 20, 22, 20, 15];

    const body = entries.map(e => [
      String(e.week_number),
      String(e.period_number),
      e.theme, e.sub_theme, e.content, e.competences,
      e.methods, e.activity, e.life_skills, e.materials, e.reference, e.remarks,
    ]);

    autoTable(doc, {
      startY: 29,
      margin: { left: margin, right: margin },
      head: [headers],
      body,
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak', valign: 'top' },
      headStyles: { fillColor: [34, 139, 34], textColor: 255, fontStyle: 'bold', fontSize: 7 },
      columnStyles: Object.fromEntries(colWidths.map((w, i) => [i, { cellWidth: w }])),
      didParseCell: (data) => {
        if (data.section === 'body' && (data.column.index === 0 || data.column.index === 1)) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.halign = 'center';
        }
      },
    });

    doc.save(`scheme-${effectiveClass}-${effectiveSubject}-T${selectedTerm}-${selectedYear}.pdf`.replace(/\s+/g, '_'));
  }, [entries, schoolName, effectiveClass, effectiveSubject, selectedTerm, selectedYear]);

  // ─── Render ──────────────────────────────────────────────────────────────────

  const canLoad = !!schoolId && !!teacherId && !!effectiveClass && !!effectiveSubject;
  const classOptions = classesWithSubjects.map(c => c.class_name);

  return (
    <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 pb-10">

      {/* Page header */}
      <div className="flex items-center gap-3">
        <LayoutList className="w-7 h-7 text-emerald-400 shrink-0" />
        <div>
          <h1 className="text-2xl font-bold ac-text-primary">Scheme of Work</h1>
          <p className="text-sm ac-text-muted">Plan and organise your teaching per subject, class and term.</p>
        </div>
      </div>

      {/* Selector card */}
      <div className="ac-glass-card rounded-xl border border-[var(--ac-border)] p-5">
        <h2 className="text-sm font-semibold ac-text-primary mb-4">Select Scheme</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {/* Class */}
          <div>
            <label className="text-xs ac-text-muted block mb-1">Class</label>
            {ctxLoading ? (
              <div className="h-9 ac-glass-card rounded-lg animate-pulse" />
            ) : (
              <select
                className="w-full h-9 rounded-lg border border-[var(--ac-border)] bg-transparent ac-text-primary text-sm px-2"
                value={selectedClass}
                onChange={e => { setSelectedClass(e.target.value); setSelectedSubject(''); }}
              >
                <option value="">— select —</option>
                {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
                <option value="__custom__">Other (type below)</option>
              </select>
            )}
            {selectedClass === '__custom__' && (
              <input
                className="mt-1 w-full h-9 rounded-lg border border-[var(--ac-border)] bg-transparent ac-text-primary text-sm px-2"
                placeholder="e.g. P3"
                value={customClass}
                onChange={e => setCustomClass(e.target.value)}
              />
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="text-xs ac-text-muted block mb-1">Subject</label>
            <select
              className="w-full h-9 rounded-lg border border-[var(--ac-border)] bg-transparent ac-text-primary text-sm px-2"
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
            >
              <option value="">— select —</option>
              {subjectOptions.map(s => <option key={s} value={s}>{s}</option>)}
              <option value="__custom__">Other (type below)</option>
            </select>
            {selectedSubject === '__custom__' && (
              <input
                className="mt-1 w-full h-9 rounded-lg border border-[var(--ac-border)] bg-transparent ac-text-primary text-sm px-2"
                placeholder="e.g. Mathematics"
                value={customSubject}
                onChange={e => setCustomSubject(e.target.value)}
              />
            )}
          </div>

          {/* Term */}
          <div>
            <label className="text-xs ac-text-muted block mb-1">Term</label>
            <select
              className="w-full h-9 rounded-lg border border-[var(--ac-border)] bg-transparent ac-text-primary text-sm px-2"
              value={selectedTerm}
              onChange={e => setSelectedTerm(e.target.value)}
            >
              {TERMS.map(t => <option key={t} value={t}>Term {t}</option>)}
            </select>
          </div>

          {/* Year */}
          <div>
            <label className="text-xs ac-text-muted block mb-1">Year</label>
            <select
              className="w-full h-9 rounded-lg border border-[var(--ac-border)] bg-transparent ac-text-primary text-sm px-2"
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
            >
              {YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
            onClick={loadScheme}
            disabled={!canLoad || isLoading}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {isLoaded ? 'Reload' : 'Load Scheme'}
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
            onClick={generateWithAI}
            disabled={!canLoad || aiGenerating}
            title="Generate a full draft scheme with AI, grounded in Uganda's NCDC curriculum where available"
          >
            {aiGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {aiGenerating ? 'Generating…' : 'Generate with AI'}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* AI status message */}
      {aiMsg && (
        <div className={`flex items-center gap-2 p-3 rounded-lg border text-sm ${aiGrounded === false ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' : 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300'}`}>
          <Sparkles className="w-4 h-4 shrink-0" />
          {aiMsg}
        </div>
      )}

      {/* Scheme table */}
      {isLoaded && (
        <div className="ac-glass-card rounded-xl border border-[var(--ac-border)] overflow-hidden">
          {/* Table header bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--ac-border)] bg-white/[0.02]">
            <span className="text-sm font-semibold ac-text-primary">
              {effectiveSubject} · {effectiveClass} · Term {selectedTerm} · {selectedYear}
              <span className="ml-2 text-xs ac-text-muted font-normal">({entries.length} rows)</span>
            </span>
            <div className="flex items-center gap-2">
              {/* Save button */}
              <button
                onClick={saveScheme}
                disabled={saveStatus === 'saving'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors disabled:opacity-60"
              >
                {saveStatus === 'saving' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                  saveStatus === 'saved' ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved!' : 'Save'}
              </button>

              {/* PDF button */}
              <button
                onClick={downloadPdf}
                disabled={entries.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF
              </button>
            </div>
          </div>

          {/* Ask AI to modify */}
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-[var(--ac-border)] bg-white/[0.015]">
            <Wand2 className="w-4 h-4 text-indigo-400 shrink-0" />
            <input
              className="flex-1 min-w-[220px] h-8 rounded-lg border border-[var(--ac-border)] bg-transparent ac-text-primary text-xs px-2"
              placeholder="Tell the AI what to change, e.g. &quot;Make week 3 more activity-based&quot;"
              value={aiInstruction}
              onChange={e => setAiInstruction(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !aiEditing && aiInstruction.trim()) void askAiToModify(); }}
              disabled={aiEditing}
            />
            <button
              onClick={askAiToModify}
              disabled={aiEditing || !aiInstruction.trim() || entries.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
            >
              {aiEditing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
              {aiEditing ? 'Applying…' : 'Ask AI to modify'}
            </button>
          </div>

          {/* Horizontally scrollable table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse" style={{ minWidth: '1100px' }}>
              <thead>
                <tr className="bg-emerald-900/30 text-emerald-300">
                  {['Wk','Pd','Theme','Sub-Theme','Content','Competences','Methods','Activity','Life Skills','Materials','Reference','Remarks',''].map((h, i) => (
                    <th key={i} className={`px-2 py-2 font-semibold text-left border-b border-[var(--ac-border)] whitespace-nowrap ${i === 12 ? 'w-8' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ac-border)]">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Wk */}
                    <td className="px-1 py-1 align-top w-10">
                      <input
                        type="number"
                        className="w-full bg-transparent text-xs ac-text-primary outline-none text-center font-bold"
                        value={entry.week_number}
                        min={1} max={20}
                        onChange={e => updateEntry(entry.id, 'week_number', parseInt(e.target.value) || 1)}
                      />
                    </td>
                    {/* Pd */}
                    <td className="px-1 py-1 align-top w-10">
                      <input
                        type="number"
                        className="w-full bg-transparent text-xs ac-text-primary outline-none text-center"
                        value={entry.period_number}
                        min={1} max={10}
                        onChange={e => updateEntry(entry.id, 'period_number', parseInt(e.target.value) || 1)}
                      />
                    </td>
                    {/* Text columns */}
                    {(
                      ['theme','sub_theme','content','competences','methods','activity','life_skills','materials','reference','remarks'] as (keyof EntryRow)[]
                    ).map(field => (
                      <td key={field} className="px-2 py-1 align-top">
                        <AutoCell
                          value={entry[field] as string}
                          onChange={v => updateEntry(entry.id, field, v)}
                          placeholder={field.replace(/_/g, ' ')}
                        />
                      </td>
                    ))}
                    {/* Delete */}
                    <td className="px-1 py-1 align-top w-8">
                      <button
                        onClick={() => deleteRow(entry.id)}
                        className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors opacity-60 hover:opacity-100"
                        title="Delete row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add row */}
          <div className="px-4 py-3 border-t border-[var(--ac-border)]">
            <button
              onClick={addRow}
              className="flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              Add row
            </button>
          </div>
        </div>
      )}

      {/* Empty state when nothing loaded yet */}
      {!isLoaded && !isLoading && (
        <div className="ac-glass-card rounded-xl border border-[var(--ac-border)] p-10 flex flex-col items-center gap-3 text-center">
          <LayoutList className="w-10 h-10 text-emerald-400/40" />
          <p className="text-sm ac-text-muted">
            Select a class, subject, term and year above then click <strong className="ac-text-primary">Load Scheme</strong> to start.
          </p>
          <p className="text-xs ac-text-muted">
            If a scheme already exists for your selection it will be loaded. Otherwise a blank 13-week template is created.
          </p>
        </div>
      )}
    </motion.div>
  );
}
