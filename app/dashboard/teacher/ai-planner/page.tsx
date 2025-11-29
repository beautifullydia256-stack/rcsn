'use client';

import { useState, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, BookOpen, FileText, Loader2, Download, Copy, Check, X, Printer, Clock, Target, Users, Lightbulb, CheckCircle2, AlertCircle } from 'lucide-react';

type ActionType = 'lesson-plan' | 'exam' | null;

// Professional Document Renderer Component
function ProfessionalDocument({ content, type, formData }: { content: string; type: 'lesson-plan' | 'exam'; formData: any }) {
  // Parse markdown content into structured sections
  const sections = useMemo(() => {
    const lines = content.split('\n');
    const parsed: { title: string; content: string[]; level: number }[] = [];
    let currentSection: { title: string; content: string[]; level: number } | null = null;

    lines.forEach(line => {
      const h1Match = line.match(/^#\s+(.+)/);
      const h2Match = line.match(/^##\s+(.+)/);
      const h3Match = line.match(/^###\s+(.+)/);

      if (h1Match || h2Match || h3Match) {
        if (currentSection) {
          parsed.push(currentSection);
        }
        currentSection = {
          title: (h1Match?.[1] || h2Match?.[1] || h3Match?.[1] || '').replace(/\*\*/g, ''),
          content: [],
          level: h1Match ? 1 : h2Match ? 2 : 3
        };
      } else if (currentSection && line.trim()) {
        currentSection.content.push(line);
      } else if (!currentSection && line.trim()) {
        // Content before any header
        if (!parsed.length || parsed[parsed.length - 1].title !== 'Introduction') {
          parsed.push({ title: 'Introduction', content: [line], level: 1 });
        } else {
          parsed[parsed.length - 1].content.push(line);
        }
      }
    });

    if (currentSection) {
      parsed.push(currentSection);
    }

    return parsed;
  }, [content]);

  // Get current date formatted
  const currentDate = new Date().toLocaleDateString('en-UG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Render content line with proper formatting
  const renderContent = (line: string) => {
    // Clean up markdown formatting
    let formatted = line
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1 rounded text-sm">$1</code>');

    // Check for numbered list items
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (numberedMatch) {
      return (
        <div className="flex gap-3 mb-2">
          <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-sm font-semibold">
            {numberedMatch[1]}
          </span>
          <span dangerouslySetInnerHTML={{ __html: formatted.replace(/^\d+\.\s+/, '') }} />
        </div>
      );
    }

    // Check for bullet points
    const bulletMatch = line.match(/^[-•]\s+(.+)/);
    if (bulletMatch) {
      return (
        <div className="flex gap-3 mb-2 ml-2">
          <span className="flex-shrink-0 w-2 h-2 bg-purple-500 rounded-full mt-2"></span>
          <span dangerouslySetInnerHTML={{ __html: formatted.replace(/^[-•]\s+/, '') }} />
        </div>
      );
    }

    return <p className="mb-2" dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  // Get section icon
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
      {/* A4 Paper Document */}
      <div 
        id="professional-document"
        className="bg-white mx-auto shadow-2xl"
        style={{ 
          width: '210mm', 
          minHeight: '297mm',
          fontFamily: 'Georgia, "Times New Roman", serif',
          maxWidth: '100%'
        }}
      >
        {/* Document Header with Purple Accent */}
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
                  <p className="text-purple-200 text-sm">AI-Generated Professional Document</p>
                </div>
              </div>
            </div>
            <div className="text-right text-sm">
              <div className="text-purple-200">Generated on</div>
              <div className="font-medium">{currentDate}</div>
            </div>
          </div>
          
          {/* Document Meta Info */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-purple-200 text-xs uppercase tracking-wide">Subject</div>
              <div className="font-semibold">{formData.subject || 'N/A'}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-purple-200 text-xs uppercase tracking-wide">Class</div>
              <div className="font-semibold">{formData.class_name || 'N/A'}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-purple-200 text-xs uppercase tracking-wide">Topic</div>
              <div className="font-semibold truncate">{formData.topic || 'N/A'}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-purple-200 text-xs uppercase tracking-wide">
                {type === 'exam' ? 'Difficulty' : 'Duration'}
              </div>
              <div className="font-semibold">
                {type === 'exam' 
                  ? (formData.difficulty || 'Medium')
                  : (formData.duration ? `${formData.duration} mins` : 'N/A')
                }
              </div>
            </div>
          </div>
        </div>

        {/* Document Body */}
        <div className="p-8 text-gray-800">
          {sections.map((section, index) => (
            <div key={index} className={`${index > 0 ? 'mt-8' : ''}`}>
              {/* Section Header */}
              {section.title && section.title !== 'Introduction' && (
                <div className="flex items-center gap-3 mb-4 pb-2 border-b-2 border-purple-200">
                  <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                    {getSectionIcon(section.title)}
                  </div>
                  <h2 className={`font-bold text-gray-900 ${section.level === 1 ? 'text-xl' : section.level === 2 ? 'text-lg' : 'text-base'}`}>
                    {section.title}
                  </h2>
                </div>
              )}
              
              {/* Section Content */}
              <div className="text-gray-700 leading-relaxed pl-2">
                {section.content.map((line, lineIndex) => (
                  <div key={lineIndex}>
                    {renderContent(line)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Document Footer */}
        <div className="mt-auto px-8 pb-6">
          <div className="border-t-2 border-purple-200 pt-4 flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span>Generated by PwezaCore AI</span>
            </div>
            <div>
              {type === 'exam' ? 'Examination Paper' : 'Lesson Plan'} • {formData.subject}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AIPlannerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const actionParam = searchParams.get('action');
  
  const [action, setAction] = useState<ActionType>(
    actionParam === 'exam' ? 'exam' : 'lesson-plan'
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Lesson Plan Form State
  const [lessonForm, setLessonForm] = useState({
    subject: '',
    class_name: '',
    topic: '',
    duration: '',
    objectives: '',
    previous_knowledge: '',
  });

  // Exam Form State
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
      const response = await fetch('/api/ai/lesson-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lessonForm),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate lesson plan');
      }

      setResult(data.lessonPlan);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
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
      const response = await fetch('/api/ai/exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...examForm,
          number_of_questions: parseInt(examForm.number_of_questions) || 10,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate exam paper');
      }

      setResult(data.examPaper);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (result) {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!result) return;
    
    setDownloading(true);
    try {
      const docElement = document.getElementById('professional-document');
      if (!docElement) {
        throw new Error('Document element not found');
      }

      // Get form data for filename
      const formData = action === 'exam' ? examForm : lessonForm;
      const filename = `${action === 'exam' ? 'Exam' : 'Lesson-Plan'}-${formData.subject || 'Document'}-${formData.class_name || ''}-${new Date().toISOString().split('T')[0]}`;

      // Create full HTML document
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            @page { size: A4; margin: 0; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
              font-family: Georgia, "Times New Roman", serif;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .bg-gradient-to-r { background: linear-gradient(to right, #7c3aed, #7c3aed, #4f46e5) !important; }
            .from-purple-700 { background: linear-gradient(to right, #7c3aed, #7c3aed, #4f46e5) !important; }
            .text-white { color: white !important; }
            .bg-white { background: white !important; }
            .p-8 { padding: 2rem; }
            .p-3 { padding: 0.75rem; }
            .p-2 { padding: 0.5rem; }
            .px-8 { padding-left: 2rem; padding-right: 2rem; }
            .pb-6 { padding-bottom: 1.5rem; }
            .pt-4 { padding-top: 1rem; }
            .mt-6 { margin-top: 1.5rem; }
            .mt-8 { margin-top: 2rem; }
            .mt-auto { margin-top: auto; }
            .mb-2 { margin-bottom: 0.5rem; }
            .mb-4 { margin-bottom: 1rem; }
            .pb-2 { padding-bottom: 0.5rem; }
            .pl-2 { padding-left: 0.5rem; }
            .ml-2 { margin-left: 0.5rem; }
            .gap-2 { gap: 0.5rem; }
            .gap-3 { gap: 0.75rem; }
            .gap-4 { gap: 1rem; }
            .flex { display: flex; }
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
            .grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
            .items-center { align-items: center; }
            .justify-between { justify-content: space-between; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .text-sm { font-size: 0.875rem; }
            .text-xs { font-size: 0.75rem; }
            .text-lg { font-size: 1.125rem; }
            .text-xl { font-size: 1.25rem; }
            .text-2xl { font-size: 1.5rem; }
            .text-base { font-size: 1rem; }
            .font-bold { font-weight: 700; }
            .font-semibold { font-weight: 600; }
            .font-medium { font-weight: 500; }
            .uppercase { text-transform: uppercase; }
            .tracking-wide { letter-spacing: 0.025em; }
            .rounded-lg { border-radius: 0.5rem; }
            .rounded-full { border-radius: 9999px; }
            .bg-white\\/10 { background: rgba(255,255,255,0.1) !important; }
            .bg-white\\/20 { background: rgba(255,255,255,0.2) !important; }
            .bg-purple-100 { background: #f3e8ff !important; }
            .bg-purple-500 { background: #a855f7 !important; }
            .text-purple-200 { color: #e9d5ff !important; }
            .text-purple-500 { color: #a855f7 !important; }
            .text-purple-700 { color: #7c3aed !important; }
            .text-gray-500 { color: #6b7280 !important; }
            .text-gray-700 { color: #374151 !important; }
            .text-gray-800 { color: #1f2937 !important; }
            .text-gray-900 { color: #111827 !important; }
            .border-b-2 { border-bottom: 2px solid; }
            .border-t-2 { border-top: 2px solid; }
            .border-purple-200 { border-color: #e9d5ff; }
            .leading-relaxed { line-height: 1.625; }
            .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .flex-shrink-0 { flex-shrink: 0; }
            .w-2 { width: 0.5rem; }
            .h-2 { height: 0.5rem; }
            .w-4 { width: 1rem; }
            .h-4 { height: 1rem; }
            .w-5 { width: 1.25rem; }
            .h-5 { height: 1.25rem; }
            .w-6 { width: 1.5rem; }
            .h-6 { height: 1.5rem; }
            .w-8 { width: 2rem; }
            .h-8 { height: 2rem; }
            .mt-2 { margin-top: 0.5rem; }
            svg { display: inline-block; vertical-align: middle; }
            strong { font-weight: 700; }
            em { font-style: italic; }
            code { background: #f3f4f6; padding: 0.125rem 0.25rem; border-radius: 0.25rem; font-size: 0.875rem; }
          </style>
        </head>
        <body>
          ${docElement.outerHTML}
        </body>
        </html>
      `;

      const response = await fetch('/api/ai/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ htmlContent, filename })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Download error:', err);
      alert('Failed to download PDF: ' + err.message);
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
          <!DOCTYPE html>
          <html>
          <head>
            <title>${action === 'exam' ? 'Exam Paper' : 'Lesson Plan'} - ${action === 'exam' ? examForm.subject : lessonForm.subject}</title>
            <style>
              @page { size: A4; margin: 0; }
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body { 
                font-family: Georgia, "Times New Roman", serif;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .bg-gradient-to-r { background: linear-gradient(to right, #7c3aed, #7c3aed, #4f46e5); }
              .text-white { color: white; }
              .p-8 { padding: 2rem; }
              .p-3 { padding: 0.75rem; }
              .p-2 { padding: 0.5rem; }
              .mt-6 { margin-top: 1.5rem; }
              .mt-8 { margin-top: 2rem; }
              .mb-2 { margin-bottom: 0.5rem; }
              .mb-4 { margin-bottom: 1rem; }
              .pb-2 { padding-bottom: 0.5rem; }
              .pl-2 { padding-left: 0.5rem; }
              .ml-2 { margin-left: 0.5rem; }
              .gap-3 { gap: 0.75rem; }
              .gap-4 { gap: 1rem; }
              .flex { display: flex; }
              .grid { display: grid; }
              .grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
              .items-center { align-items: center; }
              .justify-between { justify-content: space-between; }
              .text-right { text-align: right; }
              .text-sm { font-size: 0.875rem; }
              .text-xs { font-size: 0.75rem; }
              .text-xl { font-size: 1.25rem; }
              .text-2xl { font-size: 1.5rem; }
              .font-bold { font-weight: 700; }
              .font-semibold { font-weight: 600; }
              .font-medium { font-weight: 500; }
              .uppercase { text-transform: uppercase; }
              .tracking-wide { letter-spacing: 0.025em; }
              .rounded-lg { border-radius: 0.5rem; }
              .rounded-full { border-radius: 9999px; }
              .bg-white\\/10 { background: rgba(255,255,255,0.1); }
              .bg-white\\/20 { background: rgba(255,255,255,0.2); }
              .bg-purple-100 { background: #f3e8ff; }
              .bg-purple-500 { background: #a855f7; }
              .text-purple-200 { color: #e9d5ff; }
              .text-purple-700 { color: #7c3aed; }
              .text-gray-500 { color: #6b7280; }
              .text-gray-700 { color: #374151; }
              .text-gray-800 { color: #1f2937; }
              .text-gray-900 { color: #111827; }
              .border-b-2 { border-bottom: 2px solid; }
              .border-t-2 { border-top: 2px solid; }
              .border-purple-200 { border-color: #e9d5ff; }
              .leading-relaxed { line-height: 1.625; }
              .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
              .flex-shrink-0 { flex-shrink: 0; }
              .w-2 { width: 0.5rem; }
              .h-2 { height: 0.5rem; }
              .w-4 { width: 1rem; }
              .h-4 { height: 1rem; }
              .w-5 { width: 1.25rem; }
              .h-5 { height: 1.25rem; }
              .w-6 { width: 1.5rem; }
              .h-6 { height: 1.5rem; }
              .w-8 { width: 2rem; }
              .h-8 { height: 2rem; }
              .mt-2 { margin-top: 0.5rem; }
              svg { width: 1.25rem; height: 1.25rem; }
            </style>
          </head>
          <body>
            ${printContent.outerHTML}
          </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  AI-Powered Lesson Planner
                </h1>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Generate comprehensive lesson plans and exam papers using AI
              </p>
            </div>

            {/* Action Selector */}
            <div className="mb-6 flex gap-4">
              <button
                onClick={() => {
                  setAction('lesson-plan');
                  setResult(null);
                  setError(null);
                }}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  action === 'lesson-plan'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                }`}
              >
                <BookOpen className="w-5 h-5" />
                Lesson Plan
              </button>
              <button
                onClick={() => {
                  setAction('exam');
                  setResult(null);
                  setError(null);
                }}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  action === 'exam'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                }`}
              >
                <FileText className="w-5 h-5" />
                Exam Paper
              </button>
            </div>

            {/* Forms */}
            {action === 'lesson-plan' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6"
              >
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Generate Lesson Plan
                </h2>
                <form onSubmit={handleLessonPlanSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Subject *
                      </label>
                      <input
                        type="text"
                        required
                        value={lessonForm.subject}
                        onChange={(e) =>
                          setLessonForm({ ...lessonForm, subject: e.target.value })
                        }
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                        placeholder="e.g., Mathematics"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Class *
                      </label>
                      <input
                        type="text"
                        required
                        value={lessonForm.class_name}
                        onChange={(e) =>
                          setLessonForm({ ...lessonForm, class_name: e.target.value })
                        }
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                        placeholder="e.g., S.1 West"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Topic *
                    </label>
                    <input
                      type="text"
                      required
                      value={lessonForm.topic}
                      onChange={(e) =>
                        setLessonForm({ ...lessonForm, topic: e.target.value })
                      }
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., Introduction to Algebra"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Duration (minutes)
                      </label>
                      <input
                        type="number"
                        value={lessonForm.duration}
                        onChange={(e) =>
                          setLessonForm({ ...lessonForm, duration: e.target.value })
                        }
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                        placeholder="e.g., 40"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Learning Objectives
                      </label>
                      <input
                        type="text"
                        value={lessonForm.objectives}
                        onChange={(e) =>
                          setLessonForm({ ...lessonForm, objectives: e.target.value })
                        }
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                        placeholder="e.g., Understand basic algebra concepts"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Previous Knowledge
                    </label>
                    <textarea
                      value={lessonForm.previous_knowledge}
                      onChange={(e) =>
                        setLessonForm({ ...lessonForm, previous_knowledge: e.target.value })
                      }
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                      placeholder="What students should already know..."
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6"
              >
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Generate Exam Paper
                </h2>
                <form onSubmit={handleExamSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Subject *
                      </label>
                      <input
                        type="text"
                        required
                        value={examForm.subject}
                        onChange={(e) =>
                          setExamForm({ ...examForm, subject: e.target.value })
                        }
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                        placeholder="e.g., Mathematics"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Class *
                      </label>
                      <input
                        type="text"
                        required
                        value={examForm.class_name}
                        onChange={(e) =>
                          setExamForm({ ...examForm, class_name: e.target.value })
                        }
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                        placeholder="e.g., S.1 West"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Topic *
                    </label>
                    <input
                      type="text"
                      required
                      value={examForm.topic}
                      onChange={(e) =>
                        setExamForm({ ...examForm, topic: e.target.value })
                      }
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., Algebra and Equations"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Exam Type
                      </label>
                      <select
                        value={examForm.exam_type}
                        onChange={(e) =>
                          setExamForm({ ...examForm, exam_type: e.target.value })
                        }
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="mixed">Mixed</option>
                        <option value="multiple_choice">Multiple Choice</option>
                        <option value="short_answer">Short Answer</option>
                        <option value="essay">Essay</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Number of Questions
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={examForm.number_of_questions}
                        onChange={(e) =>
                          setExamForm({ ...examForm, number_of_questions: e.target.value })
                        }
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Difficulty
                      </label>
                      <select
                        value={examForm.difficulty}
                        onChange={(e) =>
                          setExamForm({ ...examForm, difficulty: e.target.value })
                        }
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Time Limit (minutes)
                    </label>
                    <input
                      type="number"
                      value={examForm.time_limit}
                      onChange={(e) =>
                        setExamForm({ ...examForm, time_limit: e.target.value })
                      }
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., 60"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

            {/* Results */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6"
              >
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <X className="w-5 h-5" />
                  <span className="font-medium">Error: {error}</span>
                </div>
              </motion.div>
            )}

            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden"
              >
                {/* Header with Actions */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Generated {action === 'exam' ? 'Exam Paper' : 'Lesson Plan'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Professional document ready for printing or download
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </button>
                    <button
                      onClick={handlePrint}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                      Print
                    </button>
                    <button
                      onClick={handleDownload}
                      disabled={downloading}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {downloading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating PDF...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          Download PDF
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Professional Document Preview */}
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

export default function AIPlannerPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    }>
      <AIPlannerContent />
    </Suspense>
  );
}

