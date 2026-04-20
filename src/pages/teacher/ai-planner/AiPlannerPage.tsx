import { useState, Suspense, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { aiPlannerApiUrl } from '@/lib/aiPlannerApiOrigin';
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
2. The expression \`3n + 2\` when \`n = 4\` equals:
   - A) 9   B) 14   C) 12   D) 18

## Section B – Short Answer (20 marks)
3. Solve: \`2x - 3 = 11\`
4. Write an expression for: "Twice a number plus 5"

## Section C – Structured (20 marks)
5. A rectangle has length \`(2x + 1)\` cm and width \`x\` cm. Write an expression for its perimeter. Find the perimeter when \`x = 3\`.`;

function ProfessionalDocument({
  content,
  type,
  formData,
}: {
  content: string;
  type: 'lesson-plan' | 'exam';
  formData: Record<string, unknown>;
}) {
  const sections = useMemo(() => {
    const lines = content.split('\n');
    const parsed: { title: string; content: string[]; level: number }[] = [];
    let currentSection: { title: string; content: string[]; level: number } | null = null;

    lines.forEach((line) => {
      const h1Match = line.match(/^#\s+(.+)/);
      const h2Match = line.match(/^##\s+(.+)/);
      const h3Match = line.match(/^###\s+(.+)/);

      if (h1Match || h2Match || h3Match) {
        if (currentSection) parsed.push(currentSection);
        currentSection = {
          title: (h1Match?.[1] || h2Match?.[1] || h3Match?.[1] || '').replace(/\*\*/g, ''),
          content: [],
          level: h1Match ? 1 : h2Match ? 2 : 3,
        };
      } else if (currentSection && line.trim()) {
        currentSection.content.push(line);
      } else if (!currentSection && line.trim()) {
        if (!parsed.length || parsed[parsed.length - 1].title !== 'Introduction') {
          parsed.push({ title: 'Introduction', content: [line], level: 1 });
        } else {
          parsed[parsed.length - 1].content.push(line);
        }
      }
    });
    if (currentSection) parsed.push(currentSection);
    return parsed;
  }, [content]);

  const currentDate = new Date().toLocaleDateString('en-UG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const renderContent = (line: string) => {
    let formatted = line
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1 rounded text-sm dark:bg-gray-800">$1</code>');

    const numberedMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (numberedMatch) {
      return (
        <div className="flex gap-3 mb-2">
          <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 rounded-full flex items-center justify-center text-sm font-semibold">
            {numberedMatch[1]}
          </span>
          <span dangerouslySetInnerHTML={{ __html: formatted.replace(/^\d+\.\s+/, '') }} />
        </div>
      );
    }

    const bulletMatch = line.match(/^[-•]\s+(.+)/);
    if (bulletMatch) {
      return (
        <div className="flex gap-3 mb-2 ml-2">
          <span className="flex-shrink-0 w-2 h-2 bg-purple-500 rounded-full mt-2" />
          <span dangerouslySetInnerHTML={{ __html: formatted.replace(/^[-•]\s+/, '') }} />
        </div>
      );
    }

    return <p className="mb-2" dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  const getSectionIcon = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes('objective') || lower.includes('outcome')) return <Target className="w-5 h-5" />;
    if (lower.includes('material') || lower.includes('resource')) return <BookOpen className="w-5 h-5" />;
    if (lower.includes('time') || lower.includes('duration') || lower.includes('schedule')) return <Clock className="w-5 h-5" />;
    if (lower.includes('activit') || lower.includes('procedure')) return <Users className="w-5 h-5" />;
    if (lower.includes('assessment') || lower.includes('evaluation')) return <CheckCircle2 className="w-5 h-5" />;
    if (lower.includes('note') || lower.includes('tip')) return <Lightbulb className="w-5 h-5" />;
    if (lower.includes('question') || lower.includes('instruction')) return <AlertCircle className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  return (
    <div className="bg-gray-200 dark:bg-gray-950 p-4 sm:p-8 rounded-xl">
      <div
        id="professional-document"
        className="bg-white dark:bg-gray-900 mx-auto shadow-2xl text-gray-900 dark:text-gray-100"
        style={{
          width: '210mm',
          minHeight: '297mm',
          fontFamily: 'Georgia, "Times New Roman", serif',
          maxWidth: '100%',
        }}
      >
        <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-600 text-white p-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg">
                  {type === 'exam' ? <FileText className="w-8 h-8" /> : <BookOpen className="w-8 h-8" />}
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-wide">
                    {type === 'exam' ? 'EXAMINATION PAPER' : 'LESSON PLAN'}
                  </h1>
                  <p className="text-purple-200 text-sm">PwezaCore Generated Professional Document</p>
                </div>
              </div>
            </div>
            <div className="text-right text-sm">
              <div className="text-purple-200">Generated on</div>
              <div className="font-medium">{currentDate}</div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-purple-200 text-xs uppercase tracking-wide">Subject</div>
              <div className="font-semibold">{(formData.subject as string) || 'N/A'}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-purple-200 text-xs uppercase tracking-wide">Class</div>
              <div className="font-semibold">{(formData.class_name as string) || 'N/A'}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-purple-200 text-xs uppercase tracking-wide">Topic</div>
              <div className="font-semibold truncate">{(formData.topic as string) || 'N/A'}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-purple-200 text-xs uppercase tracking-wide">
                {type === 'exam' ? 'Difficulty' : 'Duration'}
              </div>
              <div className="font-semibold">
                {type === 'exam'
                  ? ((formData.difficulty as string) || 'Medium')
                  : (formData.duration ? `${formData.duration} mins` : 'N/A')}
              </div>
            </div>
          </div>
        </div>
        <div className="p-8 text-gray-800 dark:text-gray-200">
          {sections.map((section, index) => (
            <div key={index} className={index > 0 ? 'mt-8' : ''}>
              {section.title && section.title !== 'Introduction' && (
                <div className="flex items-center gap-3 mb-4 pb-2 border-b-2 border-purple-200 dark:border-purple-800">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-lg">
                    {getSectionIcon(section.title)}
                  </div>
                  <h2
                    className={`font-bold ${section.level === 1 ? 'text-xl' : section.level === 2 ? 'text-lg' : 'text-base'} text-gray-900 dark:text-gray-100`}
                  >
                    {section.title}
                  </h2>
                </div>
              )}
              <div className="text-gray-700 dark:text-gray-300 leading-relaxed pl-2">
                {section.content.map((line, lineIndex) => (
                  <div key={lineIndex}>{renderContent(line)}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-auto px-8 pb-6">
          <div className="border-t-2 border-purple-200 dark:border-purple-800 pt-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span>Generated by PwezaCore AI</span>
            </div>
            <div>
              {type === 'exam' ? 'Examination Paper' : 'Lesson Plan'} • {(formData.subject as string) || ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AIPlannerContent() {
  const [searchParams] = useSearchParams();
  const actionParam = searchParams.get('action');
  const [action, setAction] = useState<ActionType>(actionParam === 'exam' ? 'exam' : 'lesson-plan');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [lessonForm, setLessonForm] = useState({
    subject: '',
    class_name: '',
    topic: '',
    duration: '',
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
    time_limit: '',
  });

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
        // Server returned non-JSON (e.g. 404 HTML)
      }
      if (!response.ok || !data.success) {
        const msg = response.status === 404 || response.status === 502
          ? API_NOT_CONFIGURED_MSG
          : (data.error || 'Failed to generate lesson plan');
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
        // Server returned non-JSON (e.g. 404 HTML)
      }
      if (!response.ok || !data.success) {
        const msg = response.status === 404 || response.status === 502
          ? API_NOT_CONFIGURED_MSG
          : (data.error || 'Failed to generate exam paper');
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
      const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Georgia, "Times New Roman", serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      </style></head><body>${docElement.outerHTML}</body></html>`;

      const response = await fetch(aiPlannerApiUrl('/api/ai/generate-pdf'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ htmlContent, filename: filename.replace(/\.pdf$/, '') }),
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }
      throw new Error('API unavailable');
    } catch {
      // Fallback: client-side PDF using html2canvas + jspdf
      try {
        const html2canvas = (await import('html2canvas')).default;
        const { jsPDF } = await import('jspdf');
        const canvas = await html2canvas(docElement, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false,
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const ratio = Math.min(pageW / canvas.width, pageH / canvas.height) * (1 / 2);
        const w = canvas.width * ratio;
        const h = canvas.height * ratio;
        pdf.addImage(imgData, 'PNG', 0, 0, w, h);
        pdf.save(filename);
      } catch (fallbackErr: unknown) {
        console.error('Download error:', fallbackErr);
        alert('Failed to download PDF. Try Print then "Save as PDF".');
      }
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
          <style>@page { size: A4; margin: 0; } body { font-family: Georgia, serif; }</style></head>
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

  const formInputClass =
    'w-full px-4 py-2 rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/60 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:border-white/20 dark:bg-white/5';
  const cardClass =
    'rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white';

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-8 h-8 text-purple-400" />
          <h1 className="text-2xl font-bold ac-text-primary">AI-Powered Lesson Planner</h1>
        </div>
        <p className="ac-text-muted">Generate comprehensive lesson plans and exam papers using AI</p>
      </div>

      <div className="mb-6 flex gap-4">
        <button
          type="button"
          onClick={() => {
            setAction('lesson-plan');
            setResult(null);
            setError(null);
          }}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
            action === 'lesson-plan'
              ? 'bg-purple-600/80 hover:bg-purple-600 text-white shadow-lg'
              : 'border border-white/10 bg-white/10 ac-text-primary hover:bg-white/20 dark:border-white/20 dark:bg-white/5'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          Lesson Plan
        </button>
        <button
          type="button"
          onClick={() => {
            setAction('exam');
            setResult(null);
            setError(null);
          }}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
            action === 'exam'
              ? 'bg-purple-600/80 hover:bg-purple-600 text-white shadow-lg'
              : 'border border-white/10 bg-white/10 ac-text-primary hover:bg-white/20 dark:border-white/20 dark:bg-white/5'
          }`}
        >
          <FileText className="w-5 h-5" />
          Exam Paper
        </button>
      </div>

      {action === 'lesson-plan' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`${cardClass} mb-6`}>
          <h2 className="text-lg font-semibold text-white mb-4">Generate Lesson Plan</h2>
          <form onSubmit={handleLessonPlanSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  value={lessonForm.subject}
                  onChange={(e) => setLessonForm({ ...lessonForm, subject: e.target.value })}
                  className={formInputClass}
                  placeholder="e.g., Mathematics"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-1">Class *</label>
                <input
                  type="text"
                  required
                  value={lessonForm.class_name}
                  onChange={(e) => setLessonForm({ ...lessonForm, class_name: e.target.value })}
                  className={formInputClass}
                  placeholder="e.g., S.1 West"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/90 mb-1">Topic *</label>
              <input
                type="text"
                required
                value={lessonForm.topic}
                onChange={(e) => setLessonForm({ ...lessonForm, topic: e.target.value })}
                className={formInputClass}
                placeholder="e.g., Introduction to Algebra"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  value={lessonForm.duration}
                  onChange={(e) => setLessonForm({ ...lessonForm, duration: e.target.value })}
                  className={formInputClass}
                  placeholder="e.g., 40"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-1">Learning Objectives</label>
                <input
                  type="text"
                  value={lessonForm.objectives}
                  onChange={(e) => setLessonForm({ ...lessonForm, objectives: e.target.value })}
                  className={formInputClass}
                  placeholder="e.g., Understand basic algebra concepts"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/90 mb-1">Previous Knowledge</label>
              <textarea
                value={lessonForm.previous_knowledge}
                onChange={(e) => setLessonForm({ ...lessonForm, previous_knowledge: e.target.value })}
                rows={3}
                className={formInputClass}
                placeholder="What students should already know..."
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600/80 hover:bg-purple-600 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Lesson Plan
                </>
              )}
            </button>
          </form>
        </motion.div>
      )}

      {action === 'exam' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`${cardClass} mb-6`}>
          <h2 className="text-lg font-semibold text-white mb-4">Generate Exam Paper</h2>
          <form onSubmit={handleExamSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  value={examForm.subject}
                  onChange={(e) => setExamForm({ ...examForm, subject: e.target.value })}
                  className={formInputClass}
                  placeholder="e.g., Mathematics"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-1">Class *</label>
                <input
                  type="text"
                  required
                  value={examForm.class_name}
                  onChange={(e) => setExamForm({ ...examForm, class_name: e.target.value })}
                  className={formInputClass}
                  placeholder="e.g., S.1 West"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/90 mb-1">Topic *</label>
              <input
                type="text"
                required
                value={examForm.topic}
                onChange={(e) => setExamForm({ ...examForm, topic: e.target.value })}
                className={formInputClass}
                placeholder="e.g., Algebra and Equations"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-1">Exam Type</label>
                <select
                  value={examForm.exam_type}
                  onChange={(e) => setExamForm({ ...examForm, exam_type: e.target.value })}
                  className={`${formInputClass} [&>option]:bg-slate-800`}
                >
                  <option value="mixed">Mixed</option>
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="short_answer">Short Answer</option>
                  <option value="essay">Essay</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-1">Number of Questions</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={examForm.number_of_questions}
                  onChange={(e) => setExamForm({ ...examForm, number_of_questions: e.target.value })}
                  className={formInputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-1">Difficulty</label>
                <select
                  value={examForm.difficulty}
                  onChange={(e) => setExamForm({ ...examForm, difficulty: e.target.value })}
                  className={`${formInputClass} [&>option]:bg-slate-800`}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/90 mb-1">Time Limit (minutes)</label>
              <input
                type="number"
                value={examForm.time_limit}
                onChange={(e) => setExamForm({ ...examForm, time_limit: e.target.value })}
                className={formInputClass}
                placeholder="e.g., 60"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600/80 hover:bg-purple-600 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Exam Paper
                </>
              )}
            </button>
          </form>
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 mb-6 text-white"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <X className="w-5 h-5 flex-shrink-0 text-amber-300 mt-0.5" />
              <span className="font-medium text-amber-100">{error}</span>
            </div>
            <button
              type="button"
              onClick={useDemoContent}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600/80 hover:bg-amber-600 text-white rounded-lg transition-colors whitespace-nowrap"
            >
              <BookOpen className="w-4 h-4" />
              Use demo content
            </button>
          </div>
        </motion.div>
      )}

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 overflow-hidden"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-6 border-b border-white/10">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Generated {action === 'exam' ? 'Exam Paper' : 'Lesson Plan'}
              </h3>
              <p className="text-sm text-white/70 mt-1">Professional document ready for printing or download</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 border border-white/10 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
              >
                {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy</>}
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 border border-white/10 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600/80 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating PDF...</>
                ) : (
                  <><Download className="w-4 h-4" /> Download PDF</>
                )}
              </button>
            </div>
          </div>
          <div className="overflow-auto max-h-[80vh]">
            <ProfessionalDocument
              content={result}
              type={action || 'lesson-plan'}
              formData={action === 'exam' ? examForm : lessonForm}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function AiPlannerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 border-t-transparent" />
        </div>
      }
    >
      <AIPlannerContent />
    </Suspense>
  );
}
