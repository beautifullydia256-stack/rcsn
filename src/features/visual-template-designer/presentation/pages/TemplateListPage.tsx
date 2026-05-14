/**
 * Visual Template Designer - Template List Page
 *
 * Shows:
 *  1. "System Templates" — the default templates available to every school
 *     (school_id = null in report_templates). Clicking one opens the picker so
 *     the user can choose blank page or start from one of the real templates.
 *  2. "Your Templates" — school-specific templates already saved.
 *
 * All new-template creation flows through the picker in TemplateDesignerPage.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TemplateDesignerErrorBoundary } from '../components/TemplateDesignerErrorBoundary';
import { ErrorToast } from '../components/ErrorToast';

// ─── DB template shape (what the API returns) ────────────────────────────────

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

// ─── System template card ─────────────────────────────────────────────────────

interface SystemCardProps {
  template: DBTemplate;
  onCustomize: () => void;
}

function SystemCard({ template, onCustomize }: SystemCardProps) {
  const [hovered, setHovered] = useState(false);

  const schoolType = template.is_primary ? 'Nursery / Primary' : 'Secondary';
  const accent = template.is_primary ? '#10b981' : '#6366f1';
  const bgColor = hovered ? (template.is_primary ? '#f0fdf4' : '#eef2ff') : '#fff';
  const borderColor = hovered ? accent : '#e2e8f0';

  const ICON_MAP: Record<string, string> = {
    'Report For Baby Class': '👶',
    'Pre-primary Standard Report': '🌱',
    'Report for Lower Section': '📗',
    'Report for Upper Section': '📘',
    'Clean Report Card': '📋',
    'Baby Class Heritage Report': '🎠',
    'Standard': '📄',
    'Basic': '📋',
    'Progressive': '📈',
    'Alevel': '🎓',
  };
  const icon = ICON_MAP[template.name] ?? (template.is_primary ? '📋' : '📄');

  return (
    <div
      style={{
        border: `2px solid ${borderColor}`,
        borderRadius: 10,
        padding: 16,
        background: bgColor,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        transition: 'all 0.12s',
        cursor: 'default',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Icon + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 8,
          background: hovered ? accent + '22' : '#f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, flexShrink: 0,
        }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', lineHeight: 1.3 }}>{template.name}</div>
          <div style={{ fontSize: 11, color: accent, fontWeight: 600, marginTop: 2 }}>{schoolType}</div>
        </div>
      </div>

      {/* Action */}
      <button
        onClick={onCustomize}
        style={{
          marginTop: 'auto',
          padding: '6px 0',
          background: hovered ? accent : '#f1f5f9',
          color: hovered ? '#fff' : '#374151',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 600,
          transition: 'all 0.12s',
        }}
      >
        Customize →
      </button>
    </div>
  );
}

// ─── School template card ─────────────────────────────────────────────────────

interface SchoolCardProps {
  template: DBTemplate;
  onEdit: () => void;
  onDelete: () => void;
}

function SchoolCard({ template, onEdit, onDelete }: SchoolCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (confirmDelete) {
    return (
      <div style={{ border: '1px solid #fca5a5', borderRadius: 8, padding: 16, background: '#fff1f2' }}>
        <p style={{ fontSize: 13, color: '#991b1b', marginBottom: 12 }}>
          Delete "{template.name}"? This cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onDelete}
            style={{ padding: '4px 14px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
          >
            Delete
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            style={{ padding: '4px 14px', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, background: '#fff', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{template.name}</div>
        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
          {template.is_primary ? 'Primary' : 'Secondary'} ·{' '}
          {template.updated_at
            ? new Date(template.updated_at).toLocaleDateString()
            : new Date(template.created_at).toLocaleDateString()}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onEdit}
          style={{ padding: '5px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
        >
          Edit
        </button>
        <button
          onClick={() => setConfirmDelete(true)}
          style={{ padding: '5px 14px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TemplateListPage() {
  const navigate = useNavigate();
  const [dbTemplates, setDbTemplates] = useState<DBTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load templates from API on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/templates');
        if (res.ok) {
          const data = (await res.json()) as { templates: DBTemplate[] };
          setDbTemplates(data.templates ?? []);
        }
      } catch {
        // silently fall back to empty list
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const systemTemplates = dbTemplates.filter((t) => !t.school_id);
  const schoolTemplates = dbTemplates.filter((t) => !!t.school_id);

  // Always go through the picker — no template pre-selected
  const goToPicker = useCallback(
    () => navigate('/dashboard/admin/templates/designer'),
    [navigate],
  );

  const handleEdit = useCallback(
    (t: DBTemplate) => navigate(`/dashboard/admin/templates/designer?templateId=${t.id}`),
    [navigate],
  );

  const handleDelete = useCallback((id: string) => {
    setDbTemplates((prev) => prev.filter((t) => t.id !== id));
    // TODO: DELETE /api/templates/:id when that endpoint exists
  }, []);

  return (
    <TemplateDesignerErrorBoundary>
      <div style={{ padding: '32px 28px', fontFamily: 'system-ui, sans-serif', maxWidth: 1100, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>Report Templates</h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
              Customise how your report cards look for each section of the school.
            </p>
          </div>
          <button
            onClick={goToPicker}
            style={{
              padding: '9px 20px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 700,
              boxShadow: '0 1px 4px rgba(37,99,235,0.25)',
            }}
          >
            + New Template
          </button>
        </div>

        {/* ── Your school's templates ── */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0', borderLeft: '3px solid #2563eb', paddingLeft: 10 }}>
            Your Templates
          </h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px 10px' }}>
            Templates your school has created or customised.
          </p>

          {loading ? (
            <p style={{ fontSize: 13, color: '#94a3b8' }}>Loading…</p>
          ) : schoolTemplates.length === 0 ? (
            <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 10, padding: '32px 24px', textAlign: 'center' as const }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
              <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
                No custom templates yet.{' '}
                <button onClick={goToPicker} style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                  Create your first one →
                </button>
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {schoolTemplates.map((t) => (
                <SchoolCard
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
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0', borderLeft: '3px solid #10b981', paddingLeft: 10 }}>
            System Templates
          </h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px 10px' }}>
            Default templates available to all schools. Click <strong>Customize</strong> on any of these to open the designer and make it your own.
          </p>

          {loading ? (
            <p style={{ fontSize: 13, color: '#94a3b8' }}>Loading…</p>
          ) : systemTemplates.length === 0 ? (
            <p style={{ fontSize: 13, color: '#94a3b8' }}>No system templates found.</p>
          ) : (
            <>
              {/* Primary */}
              {systemTemplates.filter((t) => t.is_primary).length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#10b981', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 12 }}>
                    Nursery &amp; Primary
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                    {systemTemplates.filter((t) => t.is_primary).map((t) => (
                      <SystemCard key={t.id} template={t} onCustomize={goToPicker} />
                    ))}
                  </div>
                </div>
              )}

              {/* Secondary */}
              {systemTemplates.filter((t) => !t.is_primary).length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#6366f1', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 12 }}>
                    Secondary
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                    {systemTemplates.filter((t) => !t.is_primary).map((t) => (
                      <SystemCard key={t.id} template={t} onCustomize={goToPicker} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
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
