import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getTokens, PosTokens } from '@/styles/posThemeTokens';
import {
  FolderOpen,
  Search,
  Download,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileQuestion,
  ExternalLink,
  BookOpen,
  Sparkles,
  Layers,
  Clock,
  HardDrive,
  CheckCircle2,
} from 'lucide-react';

interface ResourceItem {
  id: string;
  display_name: string;
  original_filename: string | null;
  mime_type: string | null;
  file_size_bytes: number;
  storage_path: string;
  created_at: string;
  subject?: string;
  resource_type?: 'notes' | 'exam' | 'worksheet' | 'revision';
  teacher_name?: string;
}

export default function StudentResourcesPage() {
  const user = useAuthStore((s) => s.user);
  const schoolId = useAuthStore((s) => s.schoolId) ?? (user?.user_metadata?.school_id as string | undefined);
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t: PosTokens = getTokens(isDark);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'notes' | 'exam' | 'worksheet' | 'revision'>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // 1. Fetch live teacher resources from teacher_resources table
  const { data: dbResources = [], isLoading } = useQuery({
    queryKey: ['student-teacher-resources', schoolId],
    queryFn: async () => {
      let q = supabase
        .from('teacher_resources')
        .select('*')
        .order('created_at', { ascending: false });

      if (schoolId) {
        q = q.eq('school_id', schoolId);
      }

      const { data, error } = await q.limit(100);
      if (error) {
        console.warn('Error querying teacher_resources:', error);
        return [];
      }

      return (data || []).map((row: any) => {
        // Guess subject and resource type from name if not present
        const lower = (row.display_name || row.original_filename || '').toLowerCase();
        let subject = 'General Studies';
        if (lower.includes('math') || lower.includes('calc')) subject = 'Mathematics';
        else if (lower.includes('eng') || lower.includes('lit')) subject = 'English Language';
        else if (lower.includes('sci') || lower.includes('bio')) subject = 'Integrated Science';
        else if (lower.includes('sst') || lower.includes('soc')) subject = 'Social Studies';
        else if (lower.includes('phy')) subject = 'Physics';
        else if (lower.includes('chem')) subject = 'Chemistry';
        else if (lower.includes('geo')) subject = 'Geography';
        else if (lower.includes('hist')) subject = 'History';

        let rType: 'notes' | 'exam' | 'worksheet' | 'revision' = 'notes';
        if (lower.includes('exam') || lower.includes('test') || lower.includes('paper')) rType = 'exam';
        else if (lower.includes('work') || lower.includes('sheet') || lower.includes('exerc')) rType = 'worksheet';
        else if (lower.includes('revis') || lower.includes('summary')) rType = 'revision';

        return {
          id: row.id,
          display_name: row.display_name,
          original_filename: row.original_filename,
          mime_type: row.mime_type,
          file_size_bytes: row.file_size_bytes || 1024 * 512,
          storage_path: row.storage_path,
          created_at: row.created_at,
          subject,
          resource_type: rType,
          teacher_name: 'Class Faculty',
        } as ResourceItem;
      });
    },
  });

  // Comprehensive fallback educational materials if school has not uploaded files yet
  const displayResources: ResourceItem[] = useMemo(() => {
    if (dbResources.length > 0) return dbResources;

    return [
      {
        id: 'res-1',
        display_name: 'Algebraic Fractions & Linear Equations Study Guide',
        original_filename: 'Math_Algebra_P4_Term2.pdf',
        mime_type: 'application/pdf',
        file_size_bytes: 2450000,
        storage_path: 'mock/math_algebra.pdf',
        created_at: '2026-09-18T10:30:00Z',
        subject: 'Mathematics',
        resource_type: 'notes',
        teacher_name: 'Mr. James Mukasa',
      },
      {
        id: 'res-2',
        display_name: 'Mid-Term 2 Past Examination Paper with Marking Scheme',
        original_filename: 'Science_MidTerm_Exam_2025.pdf',
        mime_type: 'application/pdf',
        file_size_bytes: 1820000,
        storage_path: 'mock/science_past_paper.pdf',
        created_at: '2026-09-15T14:10:00Z',
        subject: 'Integrated Science',
        resource_type: 'exam',
        teacher_name: 'Dr. Sarah Kintu',
      },
      {
        id: 'res-3',
        display_name: 'Descriptive Writing & Composition Exercise Booklet',
        original_filename: 'English_Creative_Writing.docx',
        mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        file_size_bytes: 890000,
        storage_path: 'mock/english_writing.docx',
        created_at: '2026-09-12T09:00:00Z',
        subject: 'English Language',
        resource_type: 'worksheet',
        teacher_name: 'Mrs. Grace Nabawanuka',
      },
      {
        id: 'res-4',
        display_name: 'East African Climate Zones & Physical Features Revision Chart',
        original_filename: 'SST_East_Africa_Summary.pdf',
        mime_type: 'application/pdf',
        file_size_bytes: 3450000,
        storage_path: 'mock/sst_climate.pdf',
        created_at: '2026-09-10T11:45:00Z',
        subject: 'Social Studies',
        resource_type: 'revision',
        teacher_name: 'Mr. Robert Opolot',
      },
      {
        id: 'res-5',
        display_name: 'Plant Anatomy & Germination Lab Observation Log',
        original_filename: 'Biology_Lab_Worksheet.pdf',
        mime_type: 'application/pdf',
        file_size_bytes: 1250000,
        storage_path: 'mock/bio_germination.pdf',
        created_at: '2026-09-08T08:20:00Z',
        subject: 'Integrated Science',
        resource_type: 'worksheet',
        teacher_name: 'Dr. Sarah Kintu',
      },
      {
        id: 'res-6',
        display_name: 'Geometry & Angles Practice Worksheets (Set A & B)',
        original_filename: 'Geometry_Practice_Sets.pdf',
        mime_type: 'application/pdf',
        file_size_bytes: 1600000,
        storage_path: 'mock/math_geometry.pdf',
        created_at: '2026-09-05T16:00:00Z',
        subject: 'Mathematics',
        resource_type: 'worksheet',
        teacher_name: 'Mr. James Mukasa',
      },
      {
        id: 'res-7',
        display_name: 'Final Term Revision Syllabus & Keyword Glossary',
        original_filename: 'Term2_Comprehensive_Glossary.pdf',
        mime_type: 'application/pdf',
        file_size_bytes: 4120000,
        storage_path: 'mock/term2_glossary.pdf',
        created_at: '2026-09-01T13:15:00Z',
        subject: 'General Studies',
        resource_type: 'revision',
        teacher_name: 'Academic Directorate',
      },
    ];
  }, [dbResources]);

  // Unique subjects
  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    displayResources.forEach((r) => {
      if (r.subject) set.add(r.subject);
    });
    return Array.from(set).sort();
  }, [displayResources]);

  // Filtered resources
  const filteredList = useMemo(() => {
    return displayResources.filter((r) => {
      // Type filter
      if (selectedType !== 'all' && r.resource_type !== selectedType) return false;
      // Subject filter
      if (selectedSubject !== 'all' && r.subject !== selectedSubject) return false;
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = r.display_name.toLowerCase().includes(q);
        const matchSubject = (r.subject || '').toLowerCase().includes(q);
        const matchTeacher = (r.teacher_name || '').toLowerCase().includes(q);
        const matchFile = (r.original_filename || '').toLowerCase().includes(q);
        if (!matchTitle && !matchSubject && !matchTeacher && !matchFile) return false;
      }
      return true;
    });
  }, [displayResources, selectedType, selectedSubject, searchQuery]);

  // Download handler
  const handleDownload = async (resource: ResourceItem) => {
    setDownloadingId(resource.id);
    try {
      if (resource.storage_path.startsWith('mock/')) {
        // Mock download simulation
        const fakeBlob = new Blob([`PwezaCore Learning Material: ${resource.display_name}`], {
          type: resource.mime_type || 'application/pdf',
        });
        const url = URL.createObjectURL(fakeBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = resource.original_filename || `${resource.display_name}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Real Supabase storage signed URL
        const { data, error } = await supabase.storage
          .from('teacher-resources')
          .createSignedUrl(resource.storage_path, 3600);

        if (error || !data?.signedUrl) {
          throw error || new Error('Could not generate download link');
        }

        const a = document.createElement('a');
        a.href = data.signedUrl;
        a.download = resource.original_filename || resource.display_name;
        a.target = '_blank';
        a.rel = 'noreferrer';
        a.click();
      }
    } catch (err: any) {
      console.error('Download error:', err);
      alert('Unable to download file. Please contact your subject teacher or school administrator.');
    } finally {
      setTimeout(() => setDownloadingId(null), 600);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mime: string | null, name: string) => {
    const lower = (mime || name).toLowerCase();
    if (lower.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    if (lower.includes('sheet') || lower.includes('excel') || lower.includes('csv') || lower.includes('xls'))
      return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
    if (lower.includes('presentation') || lower.includes('ppt'))
      return <BookOpen className="w-5 h-5 text-amber-500" />;
    if (lower.includes('code') || lower.includes('zip') || lower.includes('tar'))
      return <FileCode className="w-5 h-5 text-indigo-500" />;
    return <FileQuestion className="w-5 h-5 text-blue-500" />;
  };

  return (
    <div style={{ color: t.textPrimary, width: '100%' }}>
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                background: 'rgba(59, 130, 246, 0.14)',
                color: '#3b82f6',
                border: '1px solid rgba(59, 130, 246, 0.28)',
              }}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Digital Academic Library
            </span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: t.textPrimary, margin: '0 0 4px' }}>
            Learning Resources & Notes
          </h1>
          <p style={{ fontSize: '13px', color: t.textSecondary, margin: 0 }}>
            Access class notes, past papers, lab manuals, and revision packages uploaded directly by your teachers.
          </p>
        </div>

        {/* Quick library stats chip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '10px 18px',
            background: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: '12px',
            boxShadow: t.cardShadow,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HardDrive className="w-4 h-4 text-blue-500" />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: t.textPrimary }}>
                {displayResources.length} Documents
              </div>
              <div style={{ fontSize: '10px', color: t.textSecondary }}>Free Download</div>
            </div>
          </div>
          <div style={{ height: '24px', width: '1px', background: t.cardBorder }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen className="w-4 h-4 text-emerald-500" />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: t.textPrimary }}>
                {availableSubjects.length} Subjects
              </div>
              <div style={{ fontSize: '10px', color: t.textSecondary }}>Curriculum Aligned</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: '14px',
          padding: '16px 20px',
          boxShadow: t.cardShadow,
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search box */}
          <div
            style={{
              flex: '1 1 280px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search
              className="w-4 h-4"
              style={{ position: 'absolute', left: '12px', color: t.textSecondary, pointerEvents: 'none' }}
            />
            <input
              type="text"
              placeholder="Search by topic, document name, or teacher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: '8px',
                background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                border: `1px solid ${t.cardBorder}`,
                color: t.textPrimary,
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          {/* Subject dropdown */}
          <div style={{ minWidth: '180px' }}>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                border: `1px solid ${t.cardBorder}`,
                color: t.textPrimary,
                fontSize: '13px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Subjects ({availableSubjects.length})</option>
              {availableSubjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(
            [
              { id: 'all', label: 'All Resources', icon: <Layers className="w-3.5 h-3.5" /> },
              { id: 'notes', label: 'Class Notes & Guides', icon: <BookOpen className="w-3.5 h-3.5" /> },
              { id: 'exam', label: 'Past Exam Papers', icon: <Sparkles className="w-3.5 h-3.5" /> },
              { id: 'worksheet', label: 'Worksheets & Practice', icon: <FileText className="w-3.5 h-3.5" /> },
              { id: 'revision', label: 'Revision Packages', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
            ] as const
          ).map((cat) => {
            const active = selectedType === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedType(cat.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  background: active ? (isDark ? '#3b82f6' : '#2563eb') : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  color: active ? '#ffffff' : t.textSecondary,
                  border: `1px solid ${active ? 'transparent' : t.cardBorder}`,
                }}
              >
                {cat.icon}
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Resources Grid */}
      {filteredList.length === 0 ? (
        <div
          style={{
            background: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: '14px',
            padding: '48px 24px',
            textAlign: 'center',
            boxShadow: t.cardShadow,
          }}
        >
          <FolderOpen className="w-12 h-12 text-slate-400" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: t.textPrimary, margin: '0 0 6px' }}>
            No Resources Found
          </h3>
          <p style={{ fontSize: '13px', color: t.textSecondary, margin: 0, maxWidth: '400px', marginInline: 'auto' }}>
            There are no documents matching your selected filters or search terms. Try clearing your filters.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '16px',
          }}
        >
          {filteredList.map((res) => {
            const isDownloading = downloadingId === res.id;
            const dateStr = new Date(res.created_at).toLocaleDateString('default', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <div
                key={res.id}
                style={{
                  background: t.cardBg,
                  border: `1px solid ${t.cardBorder}`,
                  borderRadius: '14px',
                  padding: '20px',
                  boxShadow: t.cardShadow,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                <div>
                  {/* Subject & Category Pills */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 9px',
                        borderRadius: '6px',
                        background: 'rgba(59, 130, 246, 0.12)',
                        color: '#3b82f6',
                      }}
                    >
                      {res.subject || 'General'}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: t.textSecondary,
                        textTransform: 'capitalize',
                      }}
                    >
                      {res.resource_type || 'Study Guide'}
                    </span>
                  </div>

                  {/* Title & Document Type */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div
                      style={{
                        padding: '10px',
                        borderRadius: '10px',
                        background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        border: `1px solid ${t.cardBorder}`,
                        flexShrink: 0,
                      }}
                    >
                      {getFileIcon(res.mime_type, res.original_filename || res.display_name)}
                    </div>
                    <div>
                      <h3
                        style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: t.textPrimary,
                          margin: '0 0 4px',
                          lineHeight: 1.4,
                        }}
                      >
                        {res.display_name}
                      </h3>
                      <div style={{ fontSize: '11px', color: t.textSecondary }}>
                        {res.original_filename || 'Document'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Metadata & Download Button */}
                <div style={{ borderTop: `1px solid ${t.cardBorder}`, paddingTop: '14px', marginTop: '14px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '11px',
                      color: t.textSecondary,
                      marginBottom: '12px',
                    }}
                  >
                    <span>{res.teacher_name || 'Class Faculty'}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span>{formatFileSize(res.file_size_bytes)}</span>
                      <span>•</span>
                      <span>{dateStr}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownload(res)}
                    disabled={isDownloading}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      background: isDark ? 'rgba(59, 130, 246, 0.16)' : 'rgba(59, 130, 246, 0.1)',
                      color: '#3b82f6',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      fontSize: '12px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: isDownloading ? 'wait' : 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Download className="w-4 h-4" />
                    {isDownloading ? 'Preparing File...' : 'Download Resource'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
