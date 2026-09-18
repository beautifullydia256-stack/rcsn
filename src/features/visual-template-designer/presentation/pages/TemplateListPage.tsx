/**
 * Visual Template Designer - Template List Page
 *
 * System templates come from local config (no network call needed).
 * School-specific templates are fetched from /api/templates and
 * gracefully fall back to an empty list if that route isn't available yet.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TemplateDesignerErrorBoundary } from '../components/TemplateDesignerErrorBoundary';
import { ErrorToast } from '../components/ErrorToast';
import { ReportTemplateThumbnail } from '../components/ReportTemplateThumbnail';
import { PRIMARY_TEMPLATES } from '@/templates/primary';
import { SECONDARY_TEMPLATES } from '@/templates/secondary';
import { registerApiUrl } from '@/lib/registerApiOrigin';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DBTemplate {
  id: string;
  name: string;
  school_id: string | null;
  is_default: boolean;
  is_primary: boolean;
  content: string | null;
  html_content?: string | null;
  css_content?: string | null;
  created_at: string;
  updated_at?: string;
}

interface SystemTpl {
  id: string;
  name: string;
  description: string;
  section?: string;
  isPrimary: boolean;
  classes?: string;
}

// ─── System template lists (built from local config — no API needed) ──────────

const SYSTEM_PRIMARY: SystemTpl[] = Object.values(PRIMARY_TEMPLATES).map((t) => ({
  id: t.id,
  name: t.name,
  description: t.description,
  section: t.section,
  isPrimary: true,
  classes:
    t.section === 'Baby Class' ? 'Baby Class · Nursery'
    : t.section === 'Nursery'  ? 'Middle Class · Top Class'
    : t.section === 'Lower'    ? 'P.1 · P.2 · P.3'
    : t.section === 'Upper'    ? 'P.4 · P.5 · P.6 · P.7'
    : 'All classes',
}));

const SYSTEM_SECONDARY: SystemTpl[] = Object.values(SECONDARY_TEMPLATES).map((t) => ({
  id: t.id,
  name: t.name,
  description: t.description,
  isPrimary: false,
  classes:
    t.id === 'secondary_template4' ? 'S.5 · S.6 (A-Level)'
    : 'S.1 · S.2 · S.3 · S.4 (O-Level)',
}));

// ─── System template card ─────────────────────────────────────────────────────

function SystemTemplateCard({ tpl, onCustomize }: { tpl: SystemTpl; onCustomize: () => void }) {
  const [hov, setHov] = useState(false);
  const accent = tpl.isPrimary ? '#10b981' : '#6366f1';

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        border: `2px solid ${hov ? accent : '#e2e8f0'}`,
        borderRadius: 12,
        overflow: 'hidden',
        background: '#fff',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: hov ? `0 6px 24px ${accent}25` : '0 1px 4px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Thumbnail preview */}
      <div style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'center' }}>
        <ReportTemplateThumbnail templateId={tpl.id} templateName={tpl.name} width={196} />
      </div>

      {/* Info + action */}
      <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', lineHeight: 1.3 }}>{tpl.name}</div>
          {tpl.classes && (
            <div style={{ fontSize: 11, color: accent, fontWeight: 600, marginTop: 3 }}>{tpl.classes}</div>
          )}
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3, lineHeight: 1.4 }}>{tpl.description}</div>
        </div>
        <button
          onClick={onCustomize}
          style={{
            marginTop: 'auto',
            padding: '7px 0',
            background: hov ? accent : '#f1f5f9',
            color: hov ? '#fff' : '#374151',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 700,
            transition: 'all 0.15s',
          }}
        >
          Customize →
        </button>
      </div>
    </div>
  );
}

// ─── School (custom) template card ────────────────────────────────────────────

function SchoolTemplateCard({
  template, onEdit, onDelete,
}: { template: DBTemplate; onEdit: () => void; onDelete: () => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (confirmDelete) {
    return (
      <div style={{ border: '1px solid #fca5a5', borderRadius: 10, padding: 20, background: '#fff1f2', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ fontSize: 13, color: '#991b1b', margin: 0 }}>
          Delete <strong>"{template.name}"</strong>? This cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onDelete}
            style={{ padding: '6px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
          >
            Yes, Delete
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            style={{ padding: '6px 16px', border: '1px solid #d1d5db', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const accent = template.is_primary ? '#10b981' : '#6366f1';
  const typeLabel = template.is_primary ? 'Primary' : 'Secondary';
  const dateStr = template.updated_at
    ? new Date(template.updated_at).toLocaleDateString()
    : new Date(template.created_at).toLocaleDateString();

  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: 10,
      padding: 16,
      background: '#fff',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 8, flexShrink: 0,
          background: `${accent}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
        }}>
          {template.is_primary ? '📋' : '📄'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {template.name}
          </div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
            <span style={{ color: accent, fontWeight: 600 }}>{typeLabel}</span>
            {' · '}Last edited {dateStr}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onEdit}
          style={{ flex: 1, padding: '7px 0', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
        >
          Edit
        </button>
        <button
          onClick={() => setConfirmDelete(true)}
          style={{ padding: '7px 14px', background: '#fff', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeading({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <div style={{ width: 4, height: 18, background: color, borderRadius: 2 }} />
      <span style={{ fontSize: 12, fontWeight: 700, color, textTransform: 'uppercase' as const, letterSpacing: 0.7 }}>
        {label}
      </span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TemplateListPage() {
  const navigate = useNavigate();
  const [schoolTemplates, setSchoolTemplates] = useState<DBTemplate[]>([]);
  const [loadingSchool, setLoadingSchool] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch school-specific templates — gracefully handles 404 / network errors
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(registerApiUrl('/api/templates'));
        if (res.ok) {
          const data = (await res.json()) as { templates: DBTemplate[] };
          setSchoolTemplates((data.templates ?? []).filter((t) => !!t.school_id));
        }
      } catch {
        // silently ignore — show empty
      } finally {
        setLoadingSchool(false);
      }
    }
    void load();
  }, []);

  const goToPicker = useCallback(
    () => navigate('/dashboard/admin/templates/designer'),
    [navigate],
  );
  const handleEdit = useCallback(
    (t: DBTemplate) => navigate(`/dashboard/admin/templates/designer?templateId=${t.id}`),
    [navigate],
  );
  const handleDelete = useCallback((id: string) => {
    setSchoolTemplates((prev) => prev.filter((t) => t.id !== id));
    // TODO: DELETE /api/templates/:id when that endpoint exists
  }, []);

  return (
    <TemplateDesignerErrorBoundary>
      <div style={{ padding: '36px 32px 72px', fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 1180, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 44, gap: 20 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: -0.5 }}>
              Report Templates
            </h1>
            <p style={{ fontSize: 14, color: '#64748b', margin: '6px 0 0', maxWidth: 500, lineHeight: 1.6 }}>
              Browse the built-in system templates and customise them for your school,
              or design your own from scratch.
            </p>
          </div>
          <button
            onClick={goToPicker}
            style={{
              flexShrink: 0,
              padding: '10px 22px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 700,
              boxShadow: '0 2px 8px rgba(37,99,235,0.28)',
              whiteSpace: 'nowrap',
            }}
          >
            + New Template
          </button>
        </div>

        {/* ── Your school's templates ── */}
        <section style={{ marginBottom: 60 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Your Templates
            </h2>
            {schoolTemplates.length > 0 && (
              <span style={{ fontSize: 11, background: '#eff6ff', color: '#2563eb', fontWeight: 700, padding: '2px 9px', borderRadius: 20 }}>
                {schoolTemplates.length}
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px 0' }}>
            Templates created or customised by your school.
          </p>

          {loadingSchool ? (
            <div style={{ display: 'flex', gap: 14 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ height: 110, width: 220, borderRadius: 10, background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%' }} />
              ))}
            </div>
          ) : schoolTemplates.length === 0 ? (
            <div style={{
              background: '#f8fafc',
              border: '2px dashed #e2e8f0',
              borderRadius: 12,
              padding: '40px 28px',
              textAlign: 'center' as const,
              maxWidth: 420,
            }}>
              <div style={{ fontSize: 40, marginBottom: 14 }}>✏️</div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: '0 0 6px' }}>
                No custom templates yet
              </p>
              <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px', lineHeight: 1.5 }}>
                Customise a system template below, or start from a blank page.
              </p>
              <button
                onClick={goToPicker}
                style={{
                  padding: '9px 22px',
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 7,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13,
                  boxShadow: '0 1px 4px rgba(37,99,235,0.25)',
                }}
              >
                Create your first template →
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              {schoolTemplates.map((t) => (
                <SchoolTemplateCard
                  key={t.id}
                  template={t}
                  onEdit={() => handleEdit(t)}
                  onDelete={() => handleDelete(t.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── System templates ── */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              System Templates
            </h2>
            <span style={{ fontSize: 11, background: '#f0fdf4', color: '#059669', fontWeight: 700, padding: '2px 9px', borderRadius: 20 }}>
              Built-in
            </span>
          </div>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 28px 0', lineHeight: 1.5 }}>
            Default templates available to all schools. Click <strong>Customize</strong> on any to open the designer and make it your own.
          </p>

          {/* Primary / Nursery */}
          <div style={{ marginBottom: 40 }}>
            <SectionHeading color="#10b981" label="Nursery & Primary" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              {SYSTEM_PRIMARY.map((tpl) => (
                <SystemTemplateCard key={tpl.id} tpl={tpl} onCustomize={goToPicker} />
              ))}
            </div>
          </div>

          {/* Secondary */}
          <div>
            <SectionHeading color="#6366f1" label="Secondary" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              {SYSTEM_SECONDARY.map((tpl) => (
                <SystemTemplateCard key={tpl.id} tpl={tpl} onCustomize={goToPicker} />
              ))}
            </div>
          </div>
        </section>

      </div>

      {toastMessage && (
        <ErrorToast
          message={toastMessage}
          type="error"
          onDismiss={() => setToastMessage(null)}
          autoHide
        />
      )}
    </TemplateDesignerErrorBoundary>
  );
}

export default TemplateListPage;
