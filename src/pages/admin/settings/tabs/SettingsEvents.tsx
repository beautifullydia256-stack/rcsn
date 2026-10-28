import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, X, Calendar, AlertTriangle } from 'lucide-react';
import '@/styles/government-system.css';

type SchoolEvent = {
  event_id: string;
  title: string;
  event_date: string;
  event_type: 'exam' | 'holiday' | 'meeting' | 'sports' | 'other';
  description: string | null;
};

const EVENT_TYPE_LABELS: Record<SchoolEvent['event_type'], string> = {
  exam: 'EXAMINATION',
  holiday: 'HOLIDAY',
  meeting: 'MEETING / COMMITTEE',
  sports: 'SPORTS / EXTRA',
  other: 'GENERAL EVENT',
};

const EVENT_TYPE_TAG_CLASS: Record<SchoolEvent['event_type'], string> = {
  exam: 'gov-tag gov-tag-approved',
  holiday: 'gov-tag gov-tag-warned',
  meeting: 'gov-tag',
  sports: 'gov-tag',
  other: 'gov-tag',
};

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function SettingsEvents({
  schoolId,
  embedded,
}: {
  schoolId: string | null;
  embedded?: boolean;
}) {
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventType, setEventType] = useState<SchoolEvent['event_type']>('other');
  const [description, setDescription] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    fetchEvents();
  }, [schoolId]);

  async function fetchEvents() {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('school_events')
      .select('event_id, title, event_date, event_type, description')
      .eq('school_id', schoolId!)
      .order('event_date', { ascending: true });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setEvents((data ?? []) as SchoolEvent[]);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !eventDate) { setError('Title and date are required.'); return; }
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from('school_events').insert({
      school_id: schoolId!,
      title: title.trim(),
      event_date: eventDate,
      event_type: eventType,
      description: description.trim() || null,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    setTitle(''); setEventDate(''); setEventType('other'); setDescription('');
    setShowForm(false);
    fetchEvents();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await supabase.from('school_events').delete().eq('event_id', id);
    setDeletingId(null);
    setEvents((prev) => prev.filter((ev) => ev.event_id !== id));
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((ev) => ev.event_date >= today);
  const past = events.filter((ev) => ev.event_date < today);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 border-b border-[#CCCCCC] pb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-[15px] font-bold tracking-tight text-[#111111] uppercase font-sans">
            INSTITUTIONAL CALENDAR EVENTS
          </h2>
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-bold bg-[#EAEAEA] text-[#222222] border border-[#CCCCCC]">
            {events.length} LOGGED
          </span>
        </div>
        <button
          type="button"
          className="gov-btn gov-btn-sm gov-btn-primary"
          onClick={() => { setShowForm((v) => !v); setError(null); }}
        >
          {showForm ? (
            <>
              <X className="w-3.5 h-3.5 mr-1" />
              CANCEL
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5 mr-1" />
              SCHEDULE EVENT
            </>
          )}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="gov-card rounded-lg border border-[#CCCCCC] bg-white p-4 space-y-4">
          <div className="text-[12px] font-mono font-bold uppercase text-[#111111]">
            NEW CALENDAR ENTRY
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase text-[#555555] mb-1">
                EVENT TITLE *
              </label>
              <input
                className="gov-input w-full text-xs"
                placeholder="e.g. UNMEB State Final Examinations"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase text-[#555555] mb-1">
                EVENT DATE *
              </label>
              <input
                type="date"
                className="gov-input w-full text-xs font-mono"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase text-[#555555] mb-1">
                CLASSIFICATION
              </label>
              <select
                className="gov-select w-full text-xs"
                value={eventType}
                onChange={(e) => setEventType(e.target.value as SchoolEvent['event_type'])}
              >
                {(Object.keys(EVENT_TYPE_LABELS) as SchoolEvent['event_type'][]).map((k) => (
                  <option key={k} value={k}>{EVENT_TYPE_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase text-[#555555] mb-1">
                BRIEF NOTE (OPTIONAL)
              </label>
              <input
                className="gov-input w-full text-xs"
                placeholder="Administrative directives or venue…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          {error && (
            <div className="p-2.5 rounded border border-[#EF4444] bg-[#FEF2F2] text-xs font-mono font-bold text-[#B91C1C]">
              {error}
            </div>
          )}
          <div className="flex justify-end pt-2 border-t border-[#CCCCCC]">
            <button type="submit" disabled={saving} className="gov-btn gov-btn-sm gov-btn-primary">
              {saving ? 'COMMITTING…' : 'SAVE CALENDAR EVENT'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="gov-card p-8 text-center text-xs font-mono text-[#666666] uppercase border border-[#CCCCCC]">
          LOADING CALENDAR DIRECTIVES…
        </div>
      ) : (
        <>
          {upcoming.length === 0 && past.length === 0 && (
            <div className="gov-card p-8 text-center text-xs font-mono text-[#666666] uppercase border border-[#CCCCCC]">
              NO CALENDAR EVENTS LOGGED. CLICK &quot;SCHEDULE EVENT&quot; TO CREATE AN ENTRY.
            </div>
          )}

          {upcoming.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#666666]">
                UPCOMING SCHEDULED EVENTS
              </div>
              <ul className="space-y-2">
                {upcoming.map((ev) => (
                  <EventRow key={ev.event_id} ev={ev} onDelete={handleDelete} deletingId={deletingId} />
                ))}
              </ul>
            </div>
          )}

          {past.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#888888]">
                PAST ARCHIVED EVENTS
              </div>
              <ul className="space-y-2 opacity-75">
                {past.map((ev) => (
                  <EventRow key={ev.event_id} ev={ev} onDelete={handleDelete} deletingId={deletingId} />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EventRow({
  ev,
  onDelete,
  deletingId,
}: {
  ev: SchoolEvent;
  onDelete: (id: string) => void;
  deletingId: string | null;
}) {
  return (
    <li className="gov-card flex items-center justify-between gap-3 rounded-lg border border-[#CCCCCC] bg-white px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-12 text-center border-r border-[#CCCCCC] pr-3 shrink-0">
          <div className="text-base font-bold font-mono text-[#111111]">
            {new Date(ev.event_date + 'T00:00:00').getDate().toString().padStart(2, '0')}
          </div>
          <div className="text-[10px] font-mono font-bold uppercase text-[#666666]">
            {new Date(ev.event_date + 'T00:00:00').toLocaleString('en', { month: 'short' })}
          </div>
        </div>
        <div className="min-w-0">
          <p className="font-bold text-[#111111] text-xs uppercase font-sans truncate">
            {ev.title}
          </p>
          {ev.description && (
            <p className="text-[11px] text-[#555555] font-mono truncate">{ev.description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={EVENT_TYPE_TAG_CLASS[ev.event_type]}>
          {EVENT_TYPE_LABELS[ev.event_type]}
        </span>
        <button
          className="gov-btn gov-btn-sm text-[#B91C1C] hover:bg-[#FEF2F2]"
          onClick={() => onDelete(ev.event_id)}
          disabled={deletingId === ev.event_id}
          title="Delete event"
        >
          {deletingId === ev.event_id ? '…' : 'DELETE'}
        </button>
      </div>
    </li>
  );
}
