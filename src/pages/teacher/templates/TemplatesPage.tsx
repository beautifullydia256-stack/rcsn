import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileCode2, Eye, Printer, Sparkles, CheckCircle2,
  BookOpen, Layers, Award, School, X, Loader2
} from 'lucide-react';
import { NURSERY_TEMPLATES } from '@/templates/nursery';
import {
  getSampleTemplate7Data,
  getSampleTemplate8Data,
  getSampleTemplate9Data,
  getSampleTemplate10Data,
  getSampleTemplate11Data,
  getSampleTemplate12Data
} from '@/templates/nursery/sampleData';
import { GlassModal } from '@/components/Glass/GlassModal';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';

type TemplateKey = 'template7' | 'template8' | 'template9' | 'template10' | 'template11' | 'template12';

interface TemplateInfo {
  key: TemplateKey;
  name: string;
  description: string;
  section: string;
  badgeColor: string;
}

const templates: TemplateInfo[] = [
  {
    key: 'template7',
    name: NURSERY_TEMPLATES.template7.name,
    description: NURSERY_TEMPLATES.template7.description,
    section: NURSERY_TEMPLATES.template7.section,
    badgeColor: '#3b82f6',
  },
  {
    key: 'template8',
    name: NURSERY_TEMPLATES.template8.name,
    description: NURSERY_TEMPLATES.template8.description,
    section: NURSERY_TEMPLATES.template8.section,
    badgeColor: '#10b981',
  },
  {
    key: 'template9',
    name: NURSERY_TEMPLATES.template9.name,
    description: NURSERY_TEMPLATES.template9.description,
    section: NURSERY_TEMPLATES.template9.section,
    badgeColor: '#8b5cf6',
  },
  {
    key: 'template10',
    name: NURSERY_TEMPLATES.template10.name,
    description: NURSERY_TEMPLATES.template10.description,
    section: NURSERY_TEMPLATES.template10.section,
    badgeColor: '#ec4899',
  },
  {
    key: 'template11',
    name: NURSERY_TEMPLATES.template11.name,
    description: NURSERY_TEMPLATES.template11.description,
    section: NURSERY_TEMPLATES.template11.section,
    badgeColor: '#f59e0b',
  },
  {
    key: 'template12',
    name: NURSERY_TEMPLATES.template12.name,
    description: NURSERY_TEMPLATES.template12.description,
    section: NURSERY_TEMPLATES.template12.section,
    badgeColor: '#06b6d4',
  }
];

export default function TemplatesPage() {
  const isDark    = useUIStore((s) => s.theme === 'dark');
  const t         = getTokens(isDark);

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey | null>(null);
  const [previewHTML, setPreviewHTML]           = useState<string>('');
  const [loadingPreview, setLoadingPreview]     = useState(false);
  const [schoolLogo, setSchoolLogo]             = useState<string | null>(null);
  const [schoolName, setSchoolName]             = useState<string>('');

  const user     = useAuthStore((s) => s.user);
  const schoolId = useAuthStore((s) => s.schoolId) ?? user?.user_metadata?.school_id;

  useEffect(() => {
    async function fetchSchoolData() {
      if (!schoolId) return;
      const { data: schoolData } = await supabase
        .from('schools')
        .select('name, logo_url')
        .eq('school_id', schoolId)
        .single();

      if (schoolData) {
        setSchoolName(schoolData.name || '');
        setSchoolLogo(schoolData.logo_url || null);
      }
    }
    fetchSchoolData();
  }, [schoolId]);

  const convertImageToBase64 = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const handlePreview = async (templateKey: TemplateKey) => {
    setLoadingPreview(true);
    setSelectedTemplate(templateKey);
    try {
      const { generateTemplate7HTML, generateTemplate8HTML, generateTemplate9HTML,
              generateTemplate10HTML, generateTemplate11HTML, generateTemplate12HTML } =
        await import('@/templates/nursery/generators');

      let schoolLogoBase64: string | null = null;
      if (schoolLogo) {
        schoolLogoBase64 = await convertImageToBase64(schoolLogo);
      }

      let sampleData: any;
      let html = '';

      switch (templateKey) {
        case 'template7':
          sampleData = getSampleTemplate7Data();
          sampleData.school.name = schoolName || sampleData.school.name;
          html = generateTemplate7HTML(sampleData, schoolLogoBase64, null);
          break;
        case 'template8':
          sampleData = getSampleTemplate8Data();
          sampleData.school.name = schoolName || sampleData.school.name;
          html = generateTemplate8HTML(sampleData, schoolLogoBase64);
          break;
        case 'template9':
          sampleData = getSampleTemplate9Data();
          sampleData.school.name = schoolName || sampleData.school.name;
          html = generateTemplate9HTML(sampleData, schoolLogoBase64, null);
          break;
        case 'template10':
          sampleData = getSampleTemplate10Data();
          sampleData.school.name = schoolName || sampleData.school.name;
          html = generateTemplate10HTML(sampleData, schoolLogoBase64, null);
          break;
        case 'template11':
          sampleData = getSampleTemplate11Data();
          sampleData.school.name = schoolName || sampleData.school.name;
          html = generateTemplate11HTML(sampleData, schoolLogoBase64, null);
          break;
        case 'template12':
          sampleData = getSampleTemplate12Data();
          sampleData.school.name = schoolName || sampleData.school.name;
          html = generateTemplate12HTML(sampleData, schoolLogoBase64, null);
          break;
      }
      setPreviewHTML(html);
    } catch (err) {
      console.error('Preview failed:', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleClosePreview = () => {
    setSelectedTemplate(null);
    setPreviewHTML('');
  };

  const selectedTemplateInfo = selectedTemplate
    ? templates.find(t => t.key === selectedTemplate)
    : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12" style={{ color: t.textPrimary }}>
      {/* Header Banner */}
      <div
        className="rounded-2xl p-6 border transition-all"
        style={{ background: t.card, borderColor: t.border }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}
            >
              <FileCode2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: t.textPrimary }}>
                Report Card Template Gallery
              </h1>
              <p className="text-sm font-medium mt-0.5" style={{ color: t.textMuted }}>
                Preview and inspect early childhood, nursery, and pre-primary academic report card layouts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="text-xs font-semibold px-3 py-1.5 rounded-full border flex items-center gap-1.5"
              style={{
                background: 'rgba(59, 130, 246, 0.1)',
                borderColor: 'rgba(59, 130, 246, 0.2)',
                color: t.brandBlue,
              }}
            >
              <School className="w-3.5 h-3.5" />
              {schoolName || 'Ugandan Academic Standard'}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className="rounded-xl p-5 border flex items-center justify-between"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              Curated Layouts
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: t.textPrimary }}>
              6 Templates
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              Pre-Primary & Nursery
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}
          >
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div
          className="rounded-xl p-5 border flex items-center justify-between"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              Frameworks
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: t.brandMint }}>
              Competency
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              Learning area milestones
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(16, 185, 129, 0.12)', color: t.brandMint }}
          >
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div
          className="rounded-xl p-5 border flex items-center justify-between"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              A4 Print Ready
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: t.brandGold }}>
              100% Vector
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              High-dpi PDF export
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(245, 158, 11, 0.12)', color: t.brandGold }}
          >
            <Printer className="w-5 h-5" />
          </div>
        </div>

        <div
          className="rounded-xl p-5 border flex items-center justify-between"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              Branding Sync
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: t.brandBlue }}>
              Active
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              School crest & badges
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(59, 130, 246, 0.12)', color: t.brandBlue }}
          >
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Template Cards Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((template, idx) => (
          <motion.div
            key={template.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="rounded-2xl p-5 border flex flex-col justify-between transition-all hover:border-blue-500/50 hover:shadow-lg"
            style={{ background: t.card, borderColor: t.border }}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span
                  className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider"
                  style={{
                    background: `${template.badgeColor}15`,
                    borderColor: `${template.badgeColor}30`,
                    color: template.badgeColor,
                  }}
                >
                  {template.section}
                </span>
                <span className="text-xs font-semibold" style={{ color: t.textSub }}>
                  #{template.key.replace('template', 'Layout ')}
                </span>
              </div>

              <h3 className="text-base font-bold mb-1.5" style={{ color: t.textPrimary }}>
                {template.name}
              </h3>

              <p className="text-xs leading-relaxed line-clamp-3" style={{ color: t.textMuted }}>
                {template.description}
              </p>
            </div>

            <button
              type="button"
              onClick={() => handlePreview(template.key)}
              className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-white transition-all shadow-sm active:scale-95"
              style={{ background: t.brandBlue }}
            >
              <Eye className="w-4 h-4" />
              <span>Preview Live Template</span>
            </button>
          </motion.div>
        ))}
      </div>

      {/* Preview Modal */}
      <GlassModal
        isOpen={selectedTemplate !== null}
        onClose={handleClosePreview}
        title={selectedTemplateInfo ? `${selectedTemplateInfo.name} — Interactive Preview` : 'Template Preview'}
        size="xl"
      >
        <div className="space-y-4" style={{ color: t.textPrimary }}>
          {selectedTemplateInfo && (
            <div className="text-xs font-medium" style={{ color: t.textMuted }}>
              {selectedTemplateInfo.description}
            </div>
          )}

          <div
            className="rounded-xl border overflow-auto"
            style={{
              maxHeight: '75vh',
              background: '#ffffff',
              borderColor: t.border,
            }}
          >
            {loadingPreview && (
              <div className="flex flex-col items-center justify-center p-16 gap-3 text-slate-600">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="text-sm font-semibold">Rendering high-resolution report preview…</span>
              </div>
            )}
            {!loadingPreview && previewHTML && (
              <iframe
                srcDoc={previewHTML}
                title="Template Preview"
                className="w-full h-full min-h-[650px] border-0"
                sandbox="allow-same-origin"
              />
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClosePreview}
              className="px-4 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95"
              style={{
                background: t.surface,
                borderColor: t.border,
                color: t.textPrimary,
              }}
            >
              Close Preview
            </button>
          </div>
        </div>
      </GlassModal>
    </div>
  );
}
