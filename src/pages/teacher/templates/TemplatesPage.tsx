import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileCode2, Eye, Printer, Sparkles, CheckCircle2,
  BookOpen, Layers, Award, School, X, Stethoscope, FileText, Table, GraduationCap
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';

interface TertiaryTemplateInfo {
  key: string;
  name: string;
  description: string;
  category: string;
  badgeColor: string;
  icon: typeof FileText;
}

const templates: TertiaryTemplateInfo[] = [
  {
    key: 'unmeb-result-slip',
    name: 'UNMEB Semester Result Slip',
    description: 'Official single-trainee semester examination and continuous assessment slip with course units, grades, GPA, and UNMEB seal.',
    category: 'Examinations',
    badgeColor: '#3b82f6',
    icon: Award,
  },
  {
    key: 'academic-transcript',
    name: 'Official Academic Transcript',
    description: 'Comprehensive multi-semester cumulative academic transcript displaying all completed units, credit units, CGPA, and award classification.',
    category: 'Graduation & Records',
    badgeColor: '#10b981',
    icon: GraduationCap,
  },
  {
    key: 'noticeboard-broadsheet',
    name: 'Class Broadsheet & Audit Sheet',
    description: 'Full-cohort master results sheet formatted for departmental review, faculty boards, and physical noticeboard display.',
    category: 'Faculty Audit',
    badgeColor: '#8b5cf6',
    icon: Table,
  },
  {
    key: 'clinical-assessment',
    name: 'Clinical Log & OSCE Assessment Form',
    description: 'Standardized hospital ward rotation rubric, objective structured clinical examination (OSCE) scoring, and practical evaluation.',
    category: 'Clinical Practicum',
    badgeColor: '#f59e0b',
    icon: Stethoscope,
  },
];

function GraduationCapIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/>
      <path d="M22 10v6"/>
      <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>
    </svg>
  );
}

export default function TemplatesPage() {
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);
  const [selectedTemplate, setSelectedTemplate] = useState<TertiaryTemplateInfo | null>(null);

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
              style={{ background: 'rgba(59, 130, 246, 0.15)', color: t.brandBlue }}
            >
              <FileCode2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: t.textPrimary }}>
                Tertiary & UNMEB Document Templates
              </h1>
              <p className="text-sm font-medium mt-0.5" style={{ color: t.textMuted }}>
                Curriculum document standards, semester result slips, broadsheets, and transcripts for Rakai Community School of Nursing.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map((tpl) => {
          const Icon = tpl.icon;
          return (
            <motion.div
              key={tpl.key}
              whileHover={{ y: -2 }}
              className="rounded-2xl p-6 border flex flex-col justify-between"
              style={{ background: t.card, borderColor: t.border }}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${tpl.badgeColor}20`, color: tpl.badgeColor }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-semibold"
                    style={{ background: `${tpl.badgeColor}15`, color: tpl.badgeColor }}
                  >
                    {tpl.category}
                  </span>
                </div>
                <h3 className="text-lg font-bold mb-1" style={{ color: t.textPrimary }}>
                  {tpl.name}
                </h3>
                <p className="text-sm font-normal leading-relaxed" style={{ color: t.textMuted }}>
                  {tpl.description}
                </p>
              </div>

              <div className="pt-6 mt-6 border-t flex items-center justify-between" style={{ borderColor: t.border }}>
                <span className="text-xs font-medium" style={{ color: t.textSub }}>
                  Standard Template
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedTemplate(tpl)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: t.brandBlue, color: '#fff' }}
                >
                  <Eye className="w-3.5 h-3.5" />
                  View Details
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Modal Details */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-lg rounded-2xl p-6 border shadow-2xl relative"
            style={{ background: t.card, borderColor: t.border }}
          >
            <button
              type="button"
              onClick={() => setSelectedTemplate(null)}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors"
              style={{ color: t.textMuted }}
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${selectedTemplate.badgeColor}20`, color: selectedTemplate.badgeColor }}
              >
                <selectedTemplate.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold" style={{ color: t.textPrimary }}>
                  {selectedTemplate.name}
                </h3>
                <span className="text-xs font-semibold" style={{ color: selectedTemplate.badgeColor }}>
                  {selectedTemplate.category}
                </span>
              </div>
            </div>
            <p className="text-sm leading-relaxed mb-6" style={{ color: t.textMuted }}>
              {selectedTemplate.description}
            </p>
            <div className="rounded-xl p-4 border text-xs space-y-2 mb-6" style={{ background: t.card, borderColor: t.border }}>
              <div className="flex justify-between">
                <span style={{ color: t.textSub }}>Issuing Authority:</span>
                <span className="font-semibold" style={{ color: t.textPrimary }}>RCSN / UNMEB Center U028</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: t.textSub }}>Security:</span>
                <span className="font-semibold text-emerald-500">QR-Code Cryptographic Signature</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: t.textSub }}>Status:</span>
                <span className="font-semibold" style={{ color: t.brandBlue }}>Active Production Template</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedTemplate(null)}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg"
              style={{ background: t.brandBlue }}
            >
              Close
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
