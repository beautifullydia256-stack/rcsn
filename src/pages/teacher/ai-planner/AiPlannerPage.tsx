import { useState, Suspense, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { aiPlannerApiUrl } from '@/lib/aiPlannerApiOrigin';
import { useTeacherContext } from '../useTeacherContext';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';
import {
  Sparkles,
  BookOpen,
  FileText,
  Loader2,
  Download,
  Copy,
  Check,
  X,
  Printer,
  Clock,
  Target,
  Users,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Bot,
  Zap,
  Layers,
} from 'lucide-react';

type ActionType = 'lesson-plan' | 'exam' | null;

const API_NOT_CONFIGURED_MSG =
  'AI service is not configured. Use "Use demo content" below to preview and download a sample document.';

const SAMPLE_LESSON_PLAN = `# Introduction to Algebra

## Learning Objectives
- Understand variables and constants
- Write simple algebraic expressions
- Solve one-step equations

## Duration & Materials
- **Duration:** 40 minutes
- **Materials:** Whiteboard, worksheets, algebra tiles (if available)

## Teaching Procedure
1. **Starter (5 mins):** Quick recap of number operations.
2. **Main (25 mins):** Introduce letters as unknowns; practice writing expressions.
3. **Plenary (10 mins):** Class discussion and exit ticket.

## Assessment
- Observe during practice; mark exit tickets to check understanding.

## Notes
- Differentiate by providing more support for struggling learners; extend with word problems for others.`;

const SAMPLE_EXAM = `# Mathematics – Algebra and Equations

## Instructions
- Answer all questions.
- Show your working where required.
- Time allowed: 60 minutes.

## Section A – Multiple Choice (10 marks)
1. If \`x + 5 = 12\`, then \`x\` is:
   - A) 5   B) 7   C) 17   D) 60

2. Which of the following is an expression?
   - A) 2x + 3 = 9   B) 4y - 1   C) x = 5   D) 3 + 2 = 5

## Section B – Short Answer (20 marks)
3. Solve for \`y\`: \`3y = 21\`.
4. A rectangle has length \`2x\` and width \`5\`. Write an expression for its perimeter.

## Section C – Problem Solving (20 marks)
5. A shopkeeper sells pens for 500 shillings each. If a customer buys \`p\` pens and pays with a 5,000 shilling note, write an expression for their change.`;

// Markdown parse helper
function parseMarkdownToHTML(markdown: string): string {
  let html = markdown
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-gray-900 border-b-2 border-purple-600 pb-2 mb-4 mt-6 first:mt-0">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-gray-800 mt-6 mb-3 border-b border-gray-200 pb-1">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-gray-700 mt-4 mb-2">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic text-gray-800">$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-purple-700">$1</code>')
    .replace(/^\s*[-*]\s+(.*$)/gim, '<li class="ml-4 list-disc text-gray-700 my-1">$1</li>')
    .replace(/^\s*\d+\.\s+(.*$)/gim, '<li class="ml-4 list-decimal text-gray-700 my-1">$1</li>')
    .replace(/\n\n/g, '</p><p class="my-3 text-gray-700 leading-relaxed">')
    .replace(/\n/g, '<br />');

  html = html.replace(/(<li.*<\/li>)/s, '<ul class="my-3 space-y-1">$1</ul>');
  return `<div class="prose max-w-none text-gray-800 font-serif leading-relaxed">${html}</div>`;
}

function ProfessionalDocument({
  content,
  type,
  formData,
}: {
  content: string;
  type: ActionType;
  formData: Record<string, unknown>;
}) {
  const parsedHTML = useMemo(() => parseMarkdownToHTML(content), [content]);

  return (
    <div className="bg-white text-gray-900 shadow-2xl rounded-xl overflow-hidden mx-auto my-6 border border-gray-200 print:shadow-none print:border-none print:m-0 print:rounded-none max-w-4xl">
      <div id="professional-document" className="min-h-[1050px] p-10 sm:p-14 flex flex-col justify-between bg-white text-gray-900">
        <div>
          {/* Header Banner */}
          <div className="border-b-4 border-purple-600 pb-6 mb-8 flex items-start justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-purple-600 block mb-1">
                PwezaCore Instructional Studio
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold font-serif text-gray-900">
                {(formData.topic as string) || (type === 'exam' ? 'Examination Paper' : 'Lesson Plan')}
              </h1>
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
                {Boolean(formData.class_name) && (
                  <span className="flex items-center gap-1 font-medium">
                    <Users className="w-4 h-4 text-purple-600" />
                    Class: {String(formData.class_name)}
                  </span>
                )}
                {Boolean(formData.subject) && (
                  <span className="flex items-center gap-1 font-medium">
                    <BookOpen className="w-4 h-4 text-purple-600" />
                    Subject: {String(formData.subject)}
                  </span>
                )}
                {Boolean(formData.duration) && (
                  <span className="flex items-center gap-1 font-medium">
                    <Clock className="w-4 h-4 text-purple-600" />
                    Duration: {String(formData.duration)} mins
                  </span>
                )}
                {Boolean(formData.time_limit) && (
                  <span className="flex items-center gap-1 font-medium">
                    <Clock className="w-4 h-4 text-purple-600" />
                    Time Limit: {String(formData.time_limit)} mins
                  </span>
                )}
              </div>
            </div>
            <div className="hidden sm:block text-right">
              <div className="inline-block px-3 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded uppercase tracking-wider border border-purple-200">
                {type === 'exam' ? 'Official Examination' : 'Approved Scheme Plan'}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Date: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Main Document Content */}
          <div
            className="document-body text-gray-800 leading-relaxed text-sm sm:text-base font-serif"
            dangerouslySetInnerHTML={{ __html: parsedHTML }}
          />
        </div>

        {/* Footer */}
        <div className="mt-12 pt-4 border-t-2 border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Generated with PwezaCore AI Curriculum Assistant</span>
          </div>
          <div>Page 1 of 1</div>
        </div>
      </div>
    </div>
  );
}

function AIPlannerContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);

  const actionParam = searchParams.get('action');
  const [action, setAction] = useState<ActionType>(actionParam === 'exam' ? 'exam' : 'lesson-plan');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const { classesWithSubjects, isLoading: ctxLoading } = useTeacherContext();

  const [lessonForm, setLessonForm] = useState({
    subject: '',
    class_name: '',
    topic: '',
    duration: '40',
    objectives: '',
    previous_knowledge: '',
  });

  const [examForm, setExamForm] = useState({
    subject: '',
    class_name: '',
    topic: '',
    exam_type: 'mixed',
    number_of_questions: '10',
    difficulty: 'medium',
    time_limit: '60',
  });

  const lessonSubjects = classesWithSubjects.find((c) => c.class_name === lessonForm.class_name)?.subjects ?? [];
  const examSubjects = classesWithSubjects.find((c) => c.class_name === examForm.class_name)?.subjects ?? [];

  const handleLessonPlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch(aiPlannerApiUrl('/api/ai/lesson-plan'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lessonForm),
      });
      const text = await response.text();
      let data: { success?: boolean; lessonPlan?: string; error?: string } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        // Non-JSON response
      }
      if (!response.ok || !data.success) {
        const msg =
          response.status === 404 || response.status === 502
            ? API_NOT_CONFIGURED_MSG
            : data.error || 'Failed to generate lesson plan';
        throw new Error(msg);
      }
      setResult(data.lessonPlan ?? null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      const isNetworkOrNotFound =
        message.includes('Failed to fetch') ||
        message.includes('NetworkError') ||
        message.includes('404') ||
        message.includes('load');
      setError(isNetworkOrNotFound ? API_NOT_CONFIGURED_MSG : message);
    } finally {
      setLoading(false);
    }
  };

  const handleExamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch(aiPlannerApiUrl('/api/ai/exam'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...examForm,
          number_of_questions: parseInt(examForm.number_of_questions, 10) || 10,
        }),
      });
      const text = await response.text();
      let data: { success?: boolean; examPaper?: string; error?: string } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        // Non-JSON response
      }
      if (!response.ok || !data.success) {
        const msg =
          response.status === 404 || response.status === 502
            ? API_NOT_CONFIGURED_MSG
            : data.error || 'Failed to generate exam paper';
        throw new Error(msg);
      }
      setResult(data.examPaper ?? null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      const isNetworkOrNotFound =
        message.includes('Failed to fetch') ||
        message.includes('NetworkError') ||
        message.includes('404') ||
        message.includes('load');
      setError(isNetworkOrNotFound ? API_NOT_CONFIGURED_MSG : message);
    } finally {
      setLoading(false);
    }
  };

  const useDemoContent = () => {
    setError(null);
    setResult(action === 'exam' ? SAMPLE_EXAM : SAMPLE_LESSON_PLAN);
  };

  const handleCopy = async () => {
    if (result) {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = async () => {
    if (!result) return;
    const docElement = document.getElementById('professional-document');
    if (!docElement) return;
    const formData = action === 'exam' ? examForm : lessonForm;
    const filename = `${action === 'exam' ? 'Exam' : 'Lesson-Plan'}-${formData.subject || 'Document'}-${formData.class_name || ''}-${new Date().toISOString().split('T')[0]}.pdf`;

    setDownloading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(docElement, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const mmPerPx = pageW / canvas.width;
      const pageHeightPx = Math.round(pageH / mmPerPx);

      let offsetPx = 0;
      let pageIndex = 0;
      while (offsetPx < canvas.height) {
        const slicePx = Math.min(pageHeightPx, canvas.height - offsetPx);
        const slice = document.createElement('canvas');
        slice.width = canvas.width;
        slice.height = slicePx;
        slice.getContext('2d')?.drawImage(canvas, 0, offsetPx, canvas.width, slicePx, 0, 0, canvas.width, slicePx);
        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(slice.toDataURL('image/png'), 'PNG', 0, 0, pageW, slicePx * mmPerPx);
        offsetPx += slicePx;
        pageIndex++;
      }
      pdf.save(filename);
    } catch {
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('professional-document');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html><html><head><title>${action === 'exam' ? 'Exam Paper' : 'Lesson Plan'}</title>
          <style>@page { size: A4; margin: 0; } body { font-family: Georgia, serif; padding: 20mm; }</style></head>
          <body>${printContent.outerHTML}</body></html>`);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      }
    }
  };

  // Dual-mode input style
  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    border: `1px solid ${t.border}`,
    background: t.surface,
    color: t.textPrimary,
    fontSize: '13px',
    outline: 'none',
  };

  return (
    <div
      style={{
        background: t.bg,
        color: t.textPrimary,
        minHeight: '100vh',
        padding: '24px',
      }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Header Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <button
                type="button"
                onClick={() => navigate('/dashboard/teacher')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: t.textMuted,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <ArrowLeft size={14} />
                Dashboard
              </button>
              <span style={{ fontSize: '12px', color: t.textSub }}>/</span>
              <span style={{ fontSize: '12px', color: '#A855F7', fontWeight: 600 }}>AI Studio</span>
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', color: t.textPrimary, margin: 0 }}>
              AI Lesson & Assessment Studio
            </h1>
            <p style={{ fontSize: '13px', color: t.textMuted, margin: '4px 0 0 0' }}>
              Generate comprehensive structured lesson plans, schemes, and exam papers aligned with national curricula.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={useDemoContent}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: t.surface,
                border: `1px solid ${t.border}`,
                color: t.textPrimary,
                borderRadius: '10px',
                padding: '9px 15px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Sparkles size={14} style={{ color: t.brandGold }} />
              Sample Document
            </button>
          </div>
        </div>

        {/* 4 Summary POS KPI Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
          }}
        >
          {/* Card 1: AI Model Engine */}
          <div
            style={{
              background: t.card,
              border: `1px solid ${t.border}`,
              borderRadius: '16px',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                AI Engine
              </span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#A855F7', marginTop: '4px' }}>
                PwezaCore AI
              </div>
              <span style={{ fontSize: '12px', color: t.textMuted, fontWeight: 500 }}>
                Curriculum tailored model
              </span>
            </div>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: isDark ? 'rgba(168, 85, 247, 0.12)' : '#F3E8FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#A855F7',
              }}
            >
              <Bot size={24} />
            </div>
          </div>

          {/* Card 2: Standards Alignment */}
          <div
            style={{
              background: t.card,
              border: `1px solid ${t.border}`,
              borderRadius: '16px',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Standards
              </span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: t.brandBlue, marginTop: '4px' }}>
                NCDC & UNEB
              </div>
              <span style={{ fontSize: '12px', color: t.textMuted, fontWeight: 500 }}>
                Competency aligned
              </span>
            </div>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: isDark ? 'rgba(120, 170, 255, 0.12)' : '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: t.brandBlue,
              }}
            >
              <CheckCircle2 size={24} />
            </div>
          </div>

          {/* Card 3: Speed & Export */}
          <div
            style={{
              background: t.card,
              border: `1px solid ${t.border}`,
              borderRadius: '16px',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Generation Time
              </span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: t.brandMint, marginTop: '4px' }}>
                ~3 Seconds
              </div>
              <span style={{ fontSize: '12px', color: t.textMuted, fontWeight: 500 }}>
                Instant structured draft
              </span>
            </div>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: isDark ? 'rgba(61, 232, 160, 0.12)' : '#ECFDF5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: t.brandMint,
              }}
            >
              <Zap size={24} />
            </div>
          </div>

          {/* Card 4: Export Formats */}
          <div
            style={{
              background: t.card,
              border: `1px solid ${t.border}`,
              borderRadius: '16px',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Export
              </span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: t.brandGold, marginTop: '4px' }}>
                PDF & Print
              </div>
              <span style={{ fontSize: '12px', color: t.textMuted, fontWeight: 500 }}>
                A4 professional layout
              </span>
            </div>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: isDark ? 'rgba(245, 192, 68, 0.12)' : '#FEF3C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: t.brandGold,
              }}
            >
              <Download size={24} />
            </div>
          </div>
        </div>

        {/* Dual Mode Switcher: Lesson Plan vs Exam Paper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => {
              setAction('lesson-plan');
              setResult(null);
              setError(null);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: action === 'lesson-plan' ? '#9333EA' : t.card,
              color: action === 'lesson-plan' ? '#FFFFFF' : t.textMuted,
              boxShadow: action === 'lesson-plan' ? '0 4px 15px rgba(147, 51, 234, 0.3)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <BookOpen size={16} />
            Lesson Plan Generator
          </button>
          <button
            type="button"
            onClick={() => {
              setAction('exam');
              setResult(null);
              setError(null);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: action === 'exam' ? '#9333EA' : t.card,
              color: action === 'exam' ? '#FFFFFF' : t.textMuted,
              boxShadow: action === 'exam' ? '0 4px 15px rgba(147, 51, 234, 0.3)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <FileText size={16} />
            Exam Paper Generator
          </button>
        </div>

        {/* Form & Generation Workspace */}
        <div
          style={{
            background: t.card,
            border: `1px solid ${t.border}`,
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
          }}
        >
          {/* Error / Offline Note */}
          {error && (
            <div
              style={{
                marginBottom: '20px',
                padding: '16px',
                borderRadius: '12px',
                background: isDark ? 'rgba(245, 192, 68, 0.12)' : '#FEF3C7',
                border: `1px solid ${isDark ? 'rgba(245, 192, 68, 0.3)' : '#FCD34D'}`,
                color: isDark ? t.brandGold : '#92400E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{error}</span>
              </div>
              <button
                type="button"
                onClick={useDemoContent}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  background: t.brandGold,
                  color: '#78350F',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Load Demo Content
              </button>
            </div>
          )}

          {action === 'lesson-plan' && (
            <form onSubmit={handleLessonPlanSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: t.textSub, marginBottom: '6px' }}>
                    Class *
                  </label>
                  <select
                    required
                    value={lessonForm.class_name}
                    onChange={(e) => setLessonForm({ ...lessonForm, class_name: e.target.value, subject: '' })}
                    style={inputStyle}
                    disabled={ctxLoading}
                  >
                    <option value="">
                      {ctxLoading ? 'Loading classes...' : classesWithSubjects.length === 0 ? 'No classes assigned' : 'Select class'}
                    </option>
                    {classesWithSubjects.map((c) => (
                      <option key={c.class_name} value={c.class_name} style={{ background: t.card, color: t.textPrimary }}>
                        {c.class_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: t.textSub, marginBottom: '6px' }}>
                    Subject *
                  </label>
                  <select
                    required
                    value={lessonForm.subject}
                    onChange={(e) => setLessonForm({ ...lessonForm, subject: e.target.value })}
                    style={inputStyle}
                    disabled={!lessonForm.class_name || ctxLoading}
                  >
                    <option value="">
                      {!lessonForm.class_name ? 'Select class first' : lessonSubjects.length === 0 ? 'No subjects assigned' : 'Select subject'}
                    </option>
                    {lessonSubjects.map((s) => (
                      <option key={s} value={s} style={{ background: t.card, color: t.textPrimary }}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: t.textSub, marginBottom: '6px' }}>
                    Lesson Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    value={lessonForm.duration}
                    onChange={(e) => setLessonForm({ ...lessonForm, duration: e.target.value })}
                    style={inputStyle}
                    placeholder="e.g. 40"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: t.textSub, marginBottom: '6px' }}>
                  Topic / Sub-topic *
                </label>
                <input
                  type="text"
                  required
                  value={lessonForm.topic}
                  onChange={(e) => setLessonForm({ ...lessonForm, topic: e.target.value })}
                  style={inputStyle}
                  placeholder="e.g., Photosynthesis and Plant Nutrition"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: t.textSub, marginBottom: '6px' }}>
                  Specific Learning Objectives (Optional)
                </label>
                <input
                  type="text"
                  value={lessonForm.objectives}
                  onChange={(e) => setLessonForm({ ...lessonForm, objectives: e.target.value })}
                  style={inputStyle}
                  placeholder="e.g., Define photosynthesis, identify requirements, describe experiment"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: t.textSub, marginBottom: '6px' }}>
                  Previous Knowledge / Context
                </label>
                <textarea
                  rows={3}
                  value={lessonForm.previous_knowledge}
                  onChange={(e) => setLessonForm({ ...lessonForm, previous_knowledge: e.target.value })}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  placeholder="What learners have already covered in previous lessons..."
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '13px 24px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #9333EA 0%, #7E22CE 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  boxShadow: '0 4px 15px rgba(147, 51, 234, 0.3)',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating Structured Lesson Plan...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Generate Lesson Plan
                  </>
                )}
              </button>
            </form>
          )}

          {action === 'exam' && (
            <form onSubmit={handleExamSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: t.textSub, marginBottom: '6px' }}>
                    Class *
                  </label>
                  <select
                    required
                    value={examForm.class_name}
                    onChange={(e) => setExamForm({ ...examForm, class_name: e.target.value, subject: '' })}
                    style={inputStyle}
                    disabled={ctxLoading}
                  >
                    <option value="">
                      {ctxLoading ? 'Loading classes...' : classesWithSubjects.length === 0 ? 'No classes assigned' : 'Select class'}
                    </option>
                    {classesWithSubjects.map((c) => (
                      <option key={c.class_name} value={c.class_name} style={{ background: t.card, color: t.textPrimary }}>
                        {c.class_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: t.textSub, marginBottom: '6px' }}>
                    Subject *
                  </label>
                  <select
                    required
                    value={examForm.subject}
                    onChange={(e) => setExamForm({ ...examForm, subject: e.target.value })}
                    style={inputStyle}
                    disabled={!examForm.class_name || ctxLoading}
                  >
                    <option value="">
                      {!examForm.class_name ? 'Select class first' : examSubjects.length === 0 ? 'No subjects assigned' : 'Select subject'}
                    </option>
                    {examSubjects.map((s) => (
                      <option key={s} value={s} style={{ background: t.card, color: t.textPrimary }}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: t.textSub, marginBottom: '6px' }}>
                    Paper Type
                  </label>
                  <select
                    value={examForm.exam_type}
                    onChange={(e) => setExamForm({ ...examForm, exam_type: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="mixed" style={{ background: t.card, color: t.textPrimary }}>Mixed Questions (Section A & B)</option>
                    <option value="multiple_choice" style={{ background: t.card, color: t.textPrimary }}>Multiple Choice Only</option>
                    <option value="short_answer" style={{ background: t.card, color: t.textPrimary }}>Short Answer Comprehension</option>
                    <option value="essay" style={{ background: t.card, color: t.textPrimary }}>Essay & Problem Solving</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: t.textSub, marginBottom: '6px' }}>
                  Exam Topic / Scope *
                </label>
                <input
                  type="text"
                  required
                  value={examForm.topic}
                  onChange={(e) => setExamForm({ ...examForm, topic: e.target.value })}
                  style={inputStyle}
                  placeholder="e.g., End of Term 1 Algebra and Arithmetic Assessment"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: t.textSub, marginBottom: '6px' }}>
                    Number of Questions
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={examForm.number_of_questions}
                    onChange={(e) => setExamForm({ ...examForm, number_of_questions: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: t.textSub, marginBottom: '6px' }}>
                    Difficulty Level
                  </label>
                  <select
                    value={examForm.difficulty}
                    onChange={(e) => setExamForm({ ...examForm, difficulty: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="easy" style={{ background: t.card, color: t.textPrimary }}>Introductory / Basic</option>
                    <option value="medium" style={{ background: t.card, color: t.textPrimary }}>Standard UNEB Benchmark</option>
                    <option value="hard" style={{ background: t.card, color: t.textPrimary }}>Advanced Analytical</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: t.textSub, marginBottom: '6px' }}>
                    Time Limit (Minutes)
                  </label>
                  <input
                    type="number"
                    value={examForm.time_limit}
                    onChange={(e) => setExamForm({ ...examForm, time_limit: e.target.value })}
                    style={inputStyle}
                    placeholder="e.g., 60"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '13px 24px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #9333EA 0%, #7E22CE 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  boxShadow: '0 4px 15px rgba(147, 51, 234, 0.3)',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Drafting Assessment Paper...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Generate Examination Paper
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Rendered Document Preview & Actions */}
        {result && (
          <div
            style={{
              background: t.card,
              border: `1px solid ${t.border}`,
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 4px 25px rgba(0,0,0,0.08)',
            }}
          >
            {/* Action Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '16px 24px',
                borderBottom: `1px solid ${t.border}`,
                background: t.surface,
              }}
            >
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: t.textPrimary, margin: 0 }}>
                  Generated {action === 'exam' ? 'Examination Paper' : 'Lesson Plan'}
                </h3>
                <p style={{ fontSize: '12px', color: t.textMuted, margin: '2px 0 0 0' }}>
                  Publication-ready A4 formatting with institutional header
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleCopy}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: t.card,
                    border: `1px solid ${t.border}`,
                    color: t.textPrimary,
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {copied ? <><Check size={14} style={{ color: t.brandMint }} /> Copied!</> : <><Copy size={14} /> Copy Markdown</>}
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: t.card,
                    border: `1px solid ${t.border}`,
                    color: t.textPrimary,
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Printer size={14} />
                  Print Document
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: '#9333EA',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: downloading ? 'not-allowed' : 'pointer',
                    opacity: downloading ? 0.6 : 1,
                  }}
                >
                  {downloading ? (
                    <><Loader2 size={14} className="animate-spin" /> Rendering PDF...</>
                  ) : (
                    <><Download size={14} /> Download PDF</>
                  )}
                </button>
              </div>
            </div>

            {/* Document Body */}
            <div style={{ padding: '24px', background: isDark ? '#111827' : '#F9FAFB', overflowX: 'auto' }}>
              <ProfessionalDocument
                content={result}
                type={action || 'lesson-plan'}
                formData={action === 'exam' ? examForm : lessonForm}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AiPlannerPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #A855F7', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      }
    >
      <AIPlannerContent />
    </Suspense>
  );
}
