/**
 * Visual Template Designer - Designer Page
 *
 * Shows a "Start" picker when no template is pre-selected, letting the user
 * choose a built-in preset or a blank page before entering the designer.
 *
 * Template can also be passed via React Router location state (from the
 * TemplateListPage "Use this template" flow) or via ?templateId= query param.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { TemplateDesigner } from '../components/TemplateDesigner';
import { TemplateDesignerErrorBoundary } from '../components/TemplateDesignerErrorBoundary';
import { TemplateService } from '../../application/services/TemplateService';
import { BUILT_IN_TEMPLATES, CATEGORY_LABELS, CATEGORY_COLORS } from '../../domain/builtInTemplates';
import type { Template } from '../../domain/types';

const templateService = new TemplateService();

interface LocationState {
  template?: Template;
}

// ─── Template Picker ──────────────────────────────────────────────────────────

interface TemplatePickerProps {
  onBlank: () => void;
  onSelectPreset: (t: Template) => void;
  onClose: () => void;
}

function TemplatePicker({ onBlank, onSelectPreset, onClose }: TemplatePickerProps) {
  const [hovered, setHovered] = useState<string | null>(null);

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
          New Template
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: 18,
            lineHeight: 1,
            padding: '4px 8px',
          }}
          title="Cancel"
        >
          ✕
        </button>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px 60px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', marginBottom: 4, marginTop: 0 }}>
          How would you like to start?
        </h1>
        <p style={{ fontSize: 14, color: '#64748b', marginBottom: 36, marginTop: 0 }}>
          Pick a ready-made template as your starting point, or build from a completely blank page.
        </p>

        {/* ── Option cards row ── */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 48 }}>
          {/* Blank page card */}
          <button
            onClick={onBlank}
            onMouseEnter={() => setHovered('blank')}
            onMouseLeave={() => setHovered(null)}
            style={{
              width: 180,
              minHeight: 220,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              background: hovered === 'blank' ? '#dbeafe' : '#fff',
              border: `2px solid ${hovered === 'blank' ? '#3b82f6' : '#e2e8f0'}`,
              borderRadius: 12,
              cursor: 'pointer',
              transition: 'all 0.12s',
              padding: 20,
            }}
          >
            <div
              style={{
                width: 80,
                height: 110,
                background: '#fff',
                border: '2px solid #cbd5e1',
                borderRadius: 4,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                color: '#94a3b8',
              }}
            >
              +
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Blank Page</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                Start from scratch
              </div>
            </div>
          </button>
        </div>

        {/* ── Built-in presets ── */}
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 4, marginTop: 0 }}>
          Start from a template
        </h2>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20, marginTop: 0 }}>
          Your own copy will be created — the originals are never changed.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(165px, 1fr))',
            gap: 16,
          }}
        >
          {BUILT_IN_TEMPLATES.map((t) => {
            const categoryLabel = CATEGORY_LABELS[t.category] ?? t.category;
            const colorClass = CATEGORY_COLORS[t.category] ?? '';
            const elementCount = t.pages.reduce((s, p) => s + p.elements.length, 0);
            const isHov = hovered === t.id;
            const EMOJI: Record<string, string> = {
              REPORT_CARD: '📋', CERTIFICATE: '🏅', ID_CARD: '🪪',
              FEE_STATEMENT: '🧾', RESULT_SLIP: '📄', ADMISSION_FORM: '📝', RECEIPT: '🧾',
            };
            return (
              <button
                key={t.id}
                onClick={() => onSelectPreset(t)}
                onMouseEnter={() => setHovered(t.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  background: isHov ? '#eff6ff' : '#fff',
                  border: `2px solid ${isHov ? '#3b82f6' : '#e2e8f0'}`,
                  borderRadius: 10,
                  cursor: 'pointer',
                  padding: 14,
                  textAlign: 'left',
                  transition: 'all 0.12s',
                }}
              >
                {/* Category badge */}
                <span
                  style={{
                    alignSelf: 'flex-start',
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 20,
                    background: colorClass ? undefined : '#f1f5f9',
                    color: colorClass ? undefined : '#475569',
                  }}
                  className={colorClass}
                >
                  {categoryLabel}
                </span>
                {/* Emoji preview */}
                <div
                  style={{
                    height: 90,
                    background: '#f8fafc',
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 36,
                  }}
                >
                  {EMOJI[t.category] ?? '📄'}
                </div>
                {/* Name + stats */}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                    {t.pages.length} page{t.pages.length !== 1 ? 's' : ''} · {elementCount} elements
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 'auto',
                    padding: '5px 0',
                    fontSize: 12,
                    fontWeight: 600,
                    color: isHov ? '#2563eb' : '#3b82f6',
                    textAlign: 'center',
                  }}
                >
                  Use this template →
                </div>
              </button>
            );
          })}
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

  // Show picker when no template was passed in
  const [showPicker, setShowPicker] = useState(() => !routeTemplate && !templateId);

  useEffect(() => {
    if (routeTemplate) {
      setTemplate(routeTemplate);
      setLoading(false);
      return;
    }
    if (!templateId) {
      // Picker is shown instead of auto-creating a blank
      setLoading(false);
      return;
    }
    setError(`Template ${templateId} not found`);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const handlePickerBlank = useCallback(() => {
    const blank = templateService.createTemplate('REPORT_CARD', 'Untitled Template');
    setTemplate(blank);
    setShowPicker(false);
  }, []);

  const handlePickerSelectPreset = useCallback((preset: Template) => {
    const copy = templateService.duplicateTemplate(preset, `My ${preset.name}`);
    setTemplate(copy);
    setShowPicker(false);
  }, []);

  const handleClose = useCallback(() => navigate(-1), [navigate]);

  const handleSave = useCallback((saved: Template) => {
    console.info('Template saved', saved.id);
  }, []);

  // ── Picker screen ───────────────────────────────────────────────────────────
  if (showPicker) {
    return (
      <TemplatePicker
        onBlank={handlePickerBlank}
        onSelectPreset={handlePickerSelectPreset}
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
