import { useState, useMemo } from 'react';
import {
  Search,
  BookOpen,
  Plus,
  Layers,
  Filter,
  CheckCircle2,
  Building2,
  X,
  BookMarked,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { getTokens, cardGrad, SORA, INTER } from '../../styles/posThemeTokens';
import NativeModal from '@/components/NativeModal';

interface BookRecord {
  id: string;
  title: string;
  author: string;
  isbn: string;
  deweyCode: string;
  categoryName: string;
  totalCopies: number;
  availableCopies: number;
  shelfLocation: string;
  publisher: string;
  edition: string;
}

const INITIAL_BOOKS: BookRecord[] = [
  {
    id: 'b-1',
    title: 'Things Fall Apart',
    author: 'Chinua Achebe',
    isbn: '978-0385474542',
    deweyCode: '823.914',
    categoryName: '800 Literature',
    totalCopies: 45,
    availableCopies: 12,
    shelfLocation: 'Rack LIT-A2',
    publisher: 'Heinemann African Writers Series',
    edition: 'Classic Edition',
  },
  {
    id: 'b-2',
    title: 'Song of Lawino & Song of Ocol',
    author: 'Okot p’Bitek',
    isbn: '978-1478604723',
    deweyCode: '896.39',
    categoryName: '800 Literature',
    totalCopies: 38,
    availableCopies: 8,
    shelfLocation: 'Rack LIT-A4',
    publisher: 'East African Educational Publishers',
    edition: 'Combined Edition',
  },
  {
    id: 'b-3',
    title: 'Comprehensive Mathematics for Secondary 4',
    author: 'J.B. Channon & A. McLeish Smith',
    isbn: '978-0582607149',
    deweyCode: '510.71',
    categoryName: '500 Natural Sciences & Mathematics',
    totalCopies: 60,
    availableCopies: 22,
    shelfLocation: 'Rack SCI-M1',
    publisher: 'Longman Uganda',
    edition: '4th Edition',
  },
  {
    id: 'b-4',
    title: 'Principles of Physics for East Africa',
    author: 'M. Nelkon & P. Parker',
    isbn: '978-0435674038',
    deweyCode: '530.07',
    categoryName: '500 Natural Sciences & Mathematics',
    totalCopies: 50,
    availableCopies: 19,
    shelfLocation: 'Rack SCI-P3',
    publisher: 'Heinemann Educational Books',
    edition: 'Revised Metric',
  },
  {
    id: 'b-5',
    title: 'Certificate Chemistry for O-Level',
    author: 'Arthur Atkinson',
    isbn: '978-0199140411',
    deweyCode: '540.7',
    categoryName: '500 Natural Sciences & Mathematics',
    totalCopies: 40,
    availableCopies: 14,
    shelfLocation: 'Rack SCI-C2',
    publisher: 'Oxford University Press',
    edition: '3rd Edition',
  },
  {
    id: 'b-6',
    title: 'East African History: From 1000 AD to Independence',
    author: 'G.S. Were & D.A. Wilson',
    isbn: '978-0237501396',
    deweyCode: '967.6',
    categoryName: '900 History & Geography',
    totalCopies: 35,
    availableCopies: 18,
    shelfLocation: 'Rack HIST-E1',
    publisher: 'Evans Brothers Africa',
    edition: '2nd Edition',
  },
  {
    id: 'b-7',
    title: 'Oxford Advanced Learner’s Dictionary (10th Ed)',
    author: 'A.S. Hornby',
    isbn: '978-0194798488',
    deweyCode: '423.02',
    categoryName: '400 Languages',
    totalCopies: 25,
    availableCopies: 5,
    shelfLocation: 'Reference Desk R-1',
    publisher: 'Oxford University Press',
    edition: '10th Edition',
  },
];

export default function LibraryCatalogPage() {
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  const [books, setBooks] = useState<BookRecord[]>(INITIAL_BOOKS);
  const [search, setSearch] = useState('');
  const [deweyFilter, setDeweyFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newIsbn, setNewIsbn] = useState('');
  const [newDewey, setNewDewey] = useState('800 Literature');
  const [newDeweyCode, setNewDeweyCode] = useState('823');
  const [newCopies, setNewCopies] = useState('10');
  const [newRack, setNewRack] = useState('Rack A1');
  const [newPub, setNewPub] = useState('');

  const filtered = useMemo(() => {
    return books.filter((b) => {
      const matchSearch =
        b.title.toLowerCase().includes(search.toLowerCase()) ||
        b.author.toLowerCase().includes(search.toLowerCase()) ||
        b.isbn.includes(search) ||
        b.deweyCode.includes(search);
      const matchDewey = deweyFilter === 'All' || b.categoryName.startsWith(deweyFilter);
      return matchSearch && matchDewey;
    });
  }, [books, search, deweyFilter]);

  function handleAddBook(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !newAuthor.trim()) return;

    const record: BookRecord = {
      id: `b-${Date.now()}`,
      title: newTitle.trim(),
      author: newAuthor.trim(),
      isbn: newIsbn.trim() || 'ISBN-TBD',
      deweyCode: newDeweyCode.trim() || '000',
      categoryName: newDewey,
      totalCopies: parseInt(newCopies, 10) || 5,
      availableCopies: parseInt(newCopies, 10) || 5,
      shelfLocation: newRack.trim() || 'General Rack',
      publisher: newPub.trim() || 'Academic Press',
      edition: '1st Edition',
    };

    setBooks([record, ...books]);
    setShowAddModal(false);
    setNewTitle('');
    setNewAuthor('');
    setNewIsbn('');
    setNewPub('');
  }

  return (
    <div style={{ width: '100%', maxWidth: 'none', padding: '24px 32px', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.1)', padding: '2px 8px', borderRadius: 4 }}>
              Dewey Decimal Classification
            </span>
            <span style={{ fontSize: 12, color: tk.subText }}>Institutional Accession Catalog</span>
          </div>
          <h1 style={{ fontFamily: SORA, fontSize: 24, fontWeight: 700, color: tk.text, margin: 0 }}>
            Library Book Catalog
          </h1>
          <p style={{ fontFamily: INTER, fontSize: 13, color: tk.subText, margin: '4px 0 0' }}>
            Browse and manage all physical textbooks, reference dictionaries, and African literature titles.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#8b5cf6',
            color: '#ffffff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Plus className="w-4 h-4" />
          <span>Add New Title</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
          background: cardGrad(isDark),
          border: `1px solid ${tk.cardBorder}`,
          borderRadius: 12,
          padding: '12px 16px',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 260 }}>
          <Search className="w-4 h-4" style={{ color: tk.subText }} />
          <input
            type="text"
            placeholder="Search title, author, ISBN, or Dewey code (e.g. 510)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: tk.text,
              fontSize: 13,
              width: '100%',
              fontFamily: INTER,
            }}
          />
        </div>

        <select
          value={deweyFilter}
          onChange={(e) => setDeweyFilter(e.target.value)}
          style={{
            background: isDark ? '#1e293b' : '#ffffff',
            color: tk.text,
            border: `1px solid ${tk.cardBorder}`,
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 12,
            fontFamily: INTER,
          }}
        >
          <option value="All">All Dewey Classes</option>
          <option value="800">800 Literature & Poetry</option>
          <option value="500">500 Natural Sciences & Math</option>
          <option value="900">900 History & Geography</option>
          <option value="400">400 Languages & Linguistics</option>
          <option value="300">300 Social Sciences & Commerce</option>
          <option value="600">600 Technology & Agriculture</option>
        </select>
      </div>

      {/* Catalog Table */}
      <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${tk.cardBorder}`, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Book Title</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Author & Publisher</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Dewey Class</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Location Rack</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Availability</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} style={{ borderBottom: `1px solid ${tk.cardBorder}` }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: tk.text }}>{b.title}</div>
                    <div style={{ fontSize: 11, fontFamily: 'monospace', color: tk.subText }}>
                      ISBN: {b.isbn} • {b.edition}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ color: tk.text }}>{b.author}</div>
                    <div style={{ fontSize: 11, color: tk.subText }}>{b.publisher}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, color: '#8b5cf6', fontFamily: 'monospace' }}>
                      {b.deweyCode}
                    </div>
                    <div style={{ fontSize: 11, color: tk.subText }}>{b.categoryName}</div>
                  </td>
                  <td style={{ padding: '14px 16px', color: tk.text, fontSize: 12 }}>
                    {b.shelfLocation}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: b.availableCopies > 5 ? '#10b981' : '#f59e0b',
                      }}
                    >
                      {b.availableCopies} available
                    </span>
                    <span style={{ fontSize: 11, color: tk.subText }}> / {b.totalCopies} total</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Title Modal */}
      <NativeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Catalog New Book"
        subtitle="Register book titles, Dewey decimal codes and copy inventory"
        icon={BookOpen}
        size="lg"
      >
        <form onSubmit={handleAddBook} className="flex flex-col gap-3 text-white">
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1">
              Book Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Animal Farm"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 hover:border-white/35 focus:border-white/70 focus:bg-black/40 backdrop-blur-sm text-white placeholder-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1">
                Author *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. George Orwell"
                value={newAuthor}
                onChange={(e) => setNewAuthor(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 hover:border-white/35 focus:border-white/70 focus:bg-black/40 backdrop-blur-sm text-white placeholder-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1">
                ISBN
              </label>
              <input
                type="text"
                placeholder="e.g. 978-0451526342"
                value={newIsbn}
                onChange={(e) => setNewIsbn(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 hover:border-white/35 focus:border-white/70 focus:bg-black/40 backdrop-blur-sm text-white placeholder-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1">
                Dewey Code
              </label>
              <input
                type="text"
                placeholder="e.g. 823.912"
                value={newDeweyCode}
                onChange={(e) => setNewDeweyCode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 hover:border-white/35 focus:border-white/70 focus:bg-black/40 backdrop-blur-sm text-white placeholder-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1">
                Dewey Class
              </label>
              <select
                value={newDewey}
                onChange={(e) => setNewDewey(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-slate-900/90 dark:bg-black/90 hover:border-white/35 focus:border-white/70 backdrop-blur-sm text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition"
              >
                <option value="800 Literature" className="bg-slate-900 text-white">800 Literature</option>
                <option value="500 Natural Sciences & Mathematics" className="bg-slate-900 text-white">500 Natural Sciences & Math</option>
                <option value="900 History & Geography" className="bg-slate-900 text-white">900 History & Geography</option>
                <option value="400 Languages" className="bg-slate-900 text-white">400 Languages</option>
                <option value="300 Social Sciences" className="bg-slate-900 text-white">300 Social Sciences</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1">
                Total Copies
              </label>
              <input
                type="number"
                value={newCopies}
                onChange={(e) => setNewCopies(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 hover:border-white/35 focus:border-white/70 focus:bg-black/40 backdrop-blur-sm text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1">
                Shelf Rack Location
              </label>
              <input
                type="text"
                placeholder="e.g. Rack LIT-B3"
                value={newRack}
                onChange={(e) => setNewRack(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 hover:border-white/35 focus:border-white/70 focus:bg-black/40 backdrop-blur-sm text-white placeholder-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/15">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs shadow-[0_4px_16px_rgba(16,185,129,0.3)] transition active:scale-95"
            >
              Save Title
            </button>
          </div>
        </form>
      </NativeModal>
    </div>
  );
}
