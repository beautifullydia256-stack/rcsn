import { useState } from 'react';
import {
  Download,
  Search,
  FileText,
  BookOpen,
  Filter,
  ExternalLink,
  GraduationCap,
  Building2,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { getTokens, cardGrad, SORA, INTER } from '../../styles/posThemeTokens';

interface DigitalResource {
  id: string;
  title: string;
  subject: string;
  level: 'UCE (O-Level)' | 'UACE (A-Level)' | 'PLE (Primary)';
  year: string;
  fileFormat: string;
  fileSize: string;
  downloadsCount: number;
}

const INITIAL_RESOURCES: DigitalResource[] = [
  {
    id: 'res-1',
    title: 'UNEB UCE Mathematics Paper 1 & Paper 2 (Past Paper with Marking Guide)',
    subject: 'Mathematics',
    level: 'UCE (O-Level)',
    year: '2024',
    fileFormat: 'PDF Document',
    fileSize: '3.4 MB',
    downloadsCount: 384,
  },
  {
    id: 'res-2',
    title: 'UNEB UCE Physics Paper 1 (Theory) & Paper 2 (Practical Guide)',
    subject: 'Physics',
    level: 'UCE (O-Level)',
    year: '2024',
    fileFormat: 'PDF Document',
    fileSize: '4.1 MB',
    downloadsCount: 290,
  },
  {
    id: 'res-3',
    title: 'UNEB UACE Chemistry Paper 1 (Physical/Inorganic) & Paper 2 (Organic)',
    subject: 'Chemistry',
    level: 'UACE (A-Level)',
    year: '2023',
    fileFormat: 'PDF Document',
    fileSize: '5.2 MB',
    downloadsCount: 215,
  },
  {
    id: 'res-4',
    title: 'UNEB UCE English Language Paper 1 & Paper 2 Comprehension',
    subject: 'English',
    level: 'UCE (O-Level)',
    year: '2024',
    fileFormat: 'PDF Document',
    fileSize: '2.8 MB',
    downloadsCount: 420,
  },
  {
    id: 'res-5',
    title: 'UNEB UACE Economics Paper 1 & Paper 2 Analytical Essay Guide',
    subject: 'Economics',
    level: 'UACE (A-Level)',
    year: '2023',
    fileFormat: 'PDF Document',
    fileSize: '3.9 MB',
    downloadsCount: 175,
  },
  {
    id: 'res-6',
    title: 'Ministry of Education Lower Secondary Competency-Based Curriculum Framework',
    subject: 'Curriculum & Syllabi',
    level: 'UCE (O-Level)',
    year: '2025',
    fileFormat: 'PDF Document',
    fileSize: '8.6 MB',
    downloadsCount: 512,
  },
];

export default function LibraryDigitalPage() {
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  const [resources, setResources] = useState<DigitalResource[]>(INITIAL_RESOURCES);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('All');

  const filtered = resources.filter((r) => {
    const matchSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.subject.toLowerCase().includes(search.toLowerCase()) ||
      r.year.includes(search);
    const matchLevel = levelFilter === 'All' || r.level.startsWith(levelFilter);
    return matchSearch && matchLevel;
  });

  return (
    <div style={{ width: '100%', maxWidth: 'none', padding: '24px 32px', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: SORA, fontSize: 24, fontWeight: 700, color: tk.text, margin: 0 }}>
            E-Library
          </h1>
          <p style={{ fontFamily: INTER, fontSize: 13, color: tk.subText, margin: '4px 0 0' }}>
            National examination papers, syllabus guides, and digital learning resources.
          </p>
        </div>
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
            placeholder="Search subject, past paper year (e.g. 2024), topic..."
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
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
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
          <option value="All">All Academic Levels</option>
          <option value="UCE">UCE (O-Level)</option>
          <option value="UACE">UACE (A-Level)</option>
          <option value="PLE">PLE (Primary)</option>
        </select>
      </div>

      {/* Resource Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
        {filtered.map((r) => (
          <div
            key={r.id}
            style={{
              background: cardGrad(isDark),
              border: `1px solid ${tk.cardBorder}`,
              borderRadius: 14,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: 'rgba(14, 165, 233, 0.12)',
                    color: '#0ea5e9',
                  }}
                >
                  {r.level}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: tk.subText }}>{r.year}</span>
              </div>

              <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: tk.text, fontFamily: SORA, lineHeight: 1.4 }}>
                {r.title}
              </h3>

              <div style={{ fontSize: 12, color: tk.subText, marginBottom: 12 }}>
                Subject: <span style={{ color: tk.text, fontWeight: 600 }}>{r.subject}</span> • {r.fileSize}
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${tk.cardBorder}`, paddingTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: tk.subText }}>
                {r.downloadsCount} downloads
              </span>

              <button
                type="button"
                onClick={() => alert(`Downloading: ${r.title}`)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(14, 165, 233, 0.15)',
                  border: '1px solid rgba(14, 165, 233, 0.3)',
                  color: '#0ea5e9',
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
