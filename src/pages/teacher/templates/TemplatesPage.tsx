import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileCode2, Eye, Printer, Sparkles, CheckCircle2,
  BookOpen, Layers, Award, School, X, Stethoscope, FileText, Table, GraduationCap
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';
import NativeModal from '@/components/NativeModal';

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
      <NativeModal
        isOpen={!!selectedTemplate}
        onClose={() => setSelectedTemplate(null)}
        title={selectedTemplate?.name || 'Template Details'}
        subtitle={selectedTemplate?.category || 'Institutional Academic Document'}
        icon={selectedTemplate?.icon || FileCode2}
        size="md"
      >
        {selectedTemplate && (
          <div className="space-y-5">
            <p className="text-xs text-white/70 leading-relaxed">
              {selectedTemplate.description}
            </p>

            <div className="rounded-2xl p-4 bg-white/[0.04] border border-white/10 text-xs space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-white/50">Issuing Authority:</span>
                <span className="font-semibold text-white/90">RCSN / UNMEB Center U028</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/50">Security:</span>
                <span className="font-semibold text-emerald-400">QR-Code Cryptographic Signature</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/50">Category:</span>
                <span className="font-semibold text-teal-400">{selectedTemplate.category}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/50">Status:</span>
                <span className="font-semibold text-emerald-400">Active Production Template</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedTemplate(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/15 border border-white/15 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </NativeModal>
    </div>
  );
}
