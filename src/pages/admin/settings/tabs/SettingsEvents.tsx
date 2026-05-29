import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { settingsInsetSurface, settingsPrimaryActionClass } from './settingsTabStyles';

type SchoolEvent = {
  id: string;
  title: string;
  event_date: string;
  event_type: 'exam' | 'holiday' | 'meeting' | 'sports' | 'other';
  description: string | null;
};

const EVENT_TYPE_LABELS: Record<SchoolEvent['event_type'], string> = {
  exam: 'Exam',
  holiday: 'Holiday',
  meeting: 'Meeting',
  sports: 'Sports',
  other: 'Other',
};

const EVENT_TYPE_COLORS: Record<SchoolEvent['event_type'], string> = {
  exam: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  holiday: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  meeting: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  sports: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  other: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
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
      .select('id, title, event_date, event_type, description')
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
    await supabase.from('school_events').delete().eq('id', id);
    setDeletingId(null);
    setEvents((prev) => prev.filter((ev) => ev.id !== id));
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((ev) => ev.event_date >= today);
  const past = events.filter((ev) => ev.event_date < today);

  return (
    <div className={embedded ? 'p-4 md:p-6 space-y-6' : 'space-y-6'}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold ac-text-primary">Upcoming Events</h2>
          <p className="text-sm ac-text-muted mt-0.5">
            Add exams, holidays and other events that appear on the dashboard.
          </p>
        </div>
        <button
          className={settingsPrimaryActionClass}
          onClick={() => { setShowForm((v) => !v); setError(null); }}
        >
          {showForm ? 'Cancel' : '+ Add Event'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className={`${settingsInsetSurface} space-y-4`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium ac-text-muted mb-1">Event Title *</label>
              <input
                className="ac-input w-full"
                placeholder="e.g. End of Term Exams"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium ac-text-muted mb-1">Date *</label>
              <input
                type="date"
                className="ac-input w-full"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium ac-text-muted mb-1">Type</label>
              <select
                className="ac-input w-full"
                value={eventType}
                onChange={(e) => setEventType(e.target.value as SchoolEvent['event_type'])}
              >
                {(Object.keys(EVENT_TYPE_LABELS) as SchoolEvent['event_type'][]).map((k) => (
                  <option key={k} value={k}>{EVENT_TYPE_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium ac-text-muted mb-1">Description (optional)</label>
              <input
                className="ac-input w-full"
                placeholder="Brief note…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          {error && <p className="text-sm text-rose-500">{error}</p>}
          <button type="submit" disabled={saving} className={settingsPrimaryActionClass}>
            {saving ? 'Saving…' : 'Save Event'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm ac-text-muted">Loading…</p>
      ) : (
        <>
          {upcoming.length === 0 && past.length === 0 && (
            <p className="text-sm ac-text-muted">No events yet. Click "+ Add Event" to create one.</p>
          )}

          {upcoming.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide ac-text-muted mb-2">Upcoming</h3>
              <ul className="space-y-2">
                {upcoming.map((ev) => (
                  <EventRow key={ev.id} ev={ev} onDelete={handleDelete} deletingId={deletingId} />
                ))}
              </ul>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide ac-text-muted mb-2">Past</h3>
              <ul className="space-y-2 opacity-60">
                {past.map((ev) => (
                  <EventRow key={ev.id} ev={ev} onDelete={handleDelete} deletingId={deletingId} />
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
    <li className="flex items-start gap-3 rounded-lg border border-[var(--ac-border)] bg-[var(--ac-surface)] px-4 py-3">
      <div className="min-w-[48px] text-center">
        <div className="text-lg font-bold leading-none ac-text-primary">
          {new Date(ev.event_date + 'T00:00:00').getDate().toString().padStart(2, '0')}
        </div>
        <div className="text-[10px] font-semibold uppercase ac-text-muted">
          {new Date(ev.event_date + 'T00:00:00').toLocaleString('en', { month: 'short' })}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium ac-text-primary text-sm leading-snug">{ev.title}</p>
        {ev.description && (
          <p className="text-xs ac-text-muted mt-0.5 truncate">{ev.description}</p>
        )}
      </div>
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${EVENT_TYPE_COLORS[ev.event_type]}`}>
        {EVENT_TYPE_LABELS[ev.event_type].toUpperCase()}
      </span>
      <button
        className="text-rose-500 hover:text-rose-700 text-xs ml-1 shrink-0"
        onClick={() => onDelete(ev.id)}
        disabled={deletingId === ev.id}
        title="Delete event"
      >
        {deletingId === ev.id ? '…' : '✕'}
      </button>
    </li>
  );
}
