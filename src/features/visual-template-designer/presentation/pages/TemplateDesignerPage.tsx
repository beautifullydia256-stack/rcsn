/**
 * Visual Template Designer - Designer Page
 *
 * Shows a "Start" picker when no template is pre-selected.
 * The picker lists the REAL system templates from src/templates/primary and
 * src/templates/secondary (the same ones used to generate report cards) so
 * teachers can immediately recognise which template they are editing.
 *
 * Selecting a system template opens the visual designer pre-named after that
 * template, starting from the built-in REPORT_CARD layout.  Users can then
 * add, move and style every component to match how they want the card to look.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { TemplateDesigner } from '../components/TemplateDesigner';
import { TemplateDesignerErrorBoundary } from '../components/TemplateDesignerErrorBoundary';
import { TemplateService } from '../../application/services/TemplateService';
import { BUILT_IN_TEMPLATES } from '../../domain/builtInTemplates';
import { PRIMARY_TEMPLATES } from '@/templates/primary';
import { SECONDARY_TEMPLATES } from '@/templates/secondary';
import { ReportTemplateThumbnail } from '../components/ReportTemplateThumbnail';
import type { Template } from '../../domain/types';

const templateService = new TemplateService();

// The BUILT_IN report-card layout — used as the visual starting point for all
// system templates (the user sees an A4 page with components already placed).
const BASE_REPORT_CARD = BUILT_IN_TEMPLATES.find((t) => t.category === 'REPORT_CARD')!;

interface LocationState {
  template?: Template;
}

// ─── Section + card config ────────────────────────────────────────────────────

interface SystemTemplate {
  id: string;
  name: string;
  description: string;
  section?: string;
  schoolType: string;
  classes?: string;
}

const PRIMARY_SECTION: SystemTemplate[] = Object.values(PRIMARY_TEMPLATES).map((t) => ({
  id: t.id,
  name: t.name,
  description: t.description,
  section: t.section,
  schoolType: 'Nursery / Primary',
  classes:
    t.section === 'Baby Class' ? 'Baby Class, Nursery'
    : t.section === 'Nursery'  ? 'Middle Class, Top Class'
    : t.section === 'Lower'    ? 'P.1 · P.2 · P.3'
    : t.section === 'Upper'    ? 'P.4 · P.5 · P.6 · P.7'
    : 'All classes',
}));

const SECONDARY_SECTION: SystemTemplate[] = Object.values(SECONDARY_TEMPLATES).map((t) => ({
  id: t.id,
  name: t.name,
  description: t.description,
  schoolType: 'Secondary',
  classes:
    t.id === 'secondary_template4' ? 'S.5 · S.6 (A-Level)'
    : 'S.1 · S.2 · S.3 · S.4 (O-Level)',
}));

// ─── TemplatePicker ───────────────────────────────────────────────────────────

interface TemplatePickerProps {
  onBlank: () => void;
  onSelectSystem: (t: SystemTemplate) => void;
  onClose: () => void;
}

function TemplatePicker({ onBlank, onSelectSystem, onClose }: TemplatePickerProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const renderCard = (t: SystemTemplate) => {
    const isHov = hovered === t.id;
    const accent = t.schoolType === 'Secondary' ? '#6366f1' : '#10b981';

    return (
      <button
        key={t.id}
        onClick={() => onSelectSystem(t)}
        onMouseEnter={() => setHovered(t.id)}
        onMouseLeave={() => setHovered(null)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
          background: '#fff',
          border: `2px solid ${isHov ? accent : '#e2e8f0'}`,
          borderRadius: 10,
          cursor: 'pointer',
          padding: 0,
          textAlign: 'left',
          transition: 'all 0.12s',
          overflow: 'hidden',
          boxShadow: isHov ? `0 4px 16px ${accent}22` : '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        {/* Template preview thumbnail */}
        <div style={{ background: '#f8fafc', display: 'flex', justifyContent: 'center', borderBottom: '1px solid #f1f5f9' }}>
          <ReportTemplateThumbnail templateId={t.id} templateName={t.name} width={158} />
        </div>

        {/* Card info */}
        <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: '#0f172a', lineHeight: 1.3 }}>
            {t.name}
          </div>
          {t.classes && (
            <div style={{ fontSize: 10, color: accent, fontWeight: 700 }}>
              {t.classes}
            </div>
          )}
          <div
            style={{
              marginTop: 6,
              fontSize: 11,
              fontWeight: 700,
              color: isHov ? accent : '#64748b',
              transition: 'color 0.12s',
            }}
          >
            Start with this →
          </div>
        </div>
      </button>
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 600,
        background: '#f1f5f9',
        overflowY: 'auto',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          height: 52,
          background: '#1e293b',
          borderBottom: '1px solid #334155',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <span style={{ color: '#f8fafc', fontWeight: 700, fontSize: 15 }}>
          New Template — Choose a starting point
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: 18,
            padding: '4px 8px',
          }}
          title="Cancel"
        >
          ✕
        </button>
      </div>

      <div style={{ maxWidth: 1020, margin: '0 auto', padding: '36px 24px 60px' }}>
        <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 32px 0' }}>
          Each template below matches the report card format already used for that school section.
          Your copy opens in the visual editor where you can move, resize, and style every element.
        </p>

        {/* ── Blank page ── */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 12px 0', borderLeft: '3px solid #64748b', paddingLeft: 10 }}>
            Start from scratch
          </h2>
          <button
            onClick={onBlank}
            onMouseEnter={() => setHovered('blank')}
            onMouseLeave={() => setHovered(null)}
            style={{
              width: 180,
              minHeight: 200,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              background: hovered === 'blank' ? '#dbeafe' : '#fff',
              border: `2px solid ${hovered === 'blank' ? '#3b82f6' : '#e2e8f0'}`,
              borderRadius: 10,
              cursor: 'pointer',
              transition: 'all 0.12s',
              padding: 20,
            }}
          >
            <div
              style={{
                width: 72,
                height: 96,
                background: '#fff',
                border: '2px solid #cbd5e1',
                borderRadius: 4,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
                color: '#94a3b8',
              }}
            >
              +
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Blank Page</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                Drag and place every element yourself
              </div>
            </div>
          </button>
        </div>

        {/* ── Primary / Nursery templates ── */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0', borderLeft: '3px solid #10b981', paddingLeft: 10 }}>
            Nursery &amp; Primary School Templates
          </h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 14px 10px' }}>
            Pre-configured for each section — Baby Class through P.7
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(186px, 1fr))',
              gap: 14,
            }}
          >
            {PRIMARY_SECTION.map(renderCard)}
          </div>
        </div>

        {/* ── Secondary templates ── */}
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0', borderLeft: '3px solid #6366f1', paddingLeft: 10 }}>
            Secondary School Templates
          </h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 14px 10px' }}>
            O-Level (S.1–S.4) and A-Level (S.5–S.6) layouts
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(186px, 1fr))',
              gap: 14,
            }}
          >
            {SECONDARY_SECTION.map(renderCard)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TemplateDesignerPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('templateId');
  const routeTemplate = (location.state as LocationState | null)?.template ?? null;

  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(() => !routeTemplate && !templateId);

  useEffect(() => {
    if (routeTemplate) {
      setTemplate(routeTemplate);
      setLoading(false);
      return;
    }
    if (!templateId) {
      setLoading(false);
      return;
    }
    setError(`Template ${templateId} not found`);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  // Blank page — empty canvas, no pre-placed components
  const handlePickerBlank = useCallback(() => {
    const blank = templateService.createTemplate('REPORT_CARD', 'Untitled Template');
    setTemplate(blank);
    setShowPicker(false);
  }, []);

  // System template selected — duplicate the report-card base layout and rename it
  const handlePickerSelectSystem = useCallback((sys: SystemTemplate) => {
    const copy = templateService.duplicateTemplate(BASE_REPORT_CARD, sys.name);
    setTemplate(copy);
    setShowPicker(false);
  }, []);

  const handleClose = useCallback(() => navigate(-1), [navigate]);
  const handleSave = useCallback((saved: Template) => {
    console.info('Template saved', saved.id);
  }, []);

  if (showPicker) {
    return (
      <TemplatePicker
        onBlank={handlePickerBlank}
        onSelectSystem={handlePickerSelectSystem}
        onClose={handleClose}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-500">Loading template…</div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-red-600">{error ?? 'Template not found'}</div>
      </div>
    );
  }

  return (
    <TemplateDesignerErrorBoundary>
      <TemplateDesigner
        template={template}
        onSave={handleSave}
        onClose={handleClose}
      />
    </TemplateDesignerErrorBoundary>
  );
}

export default TemplateDesignerPage;
