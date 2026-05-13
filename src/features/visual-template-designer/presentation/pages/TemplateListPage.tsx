/**
 * Visual Template Designer - Template List Page
 *
 * Shows:
 *  1. "Start from a template" gallery — built-in presets a user can copy & customise.
 *  2. "Your templates" — templates the user has already saved (managed locally for now).
 *
 * Selecting a preset duplicates it (new ID, name like "My Report Card") and opens the
 * designer with the copy.  The original preset is never changed.
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TemplateList } from '../components/TemplateList';
import { TemplateDesignerErrorBoundary } from '../components/TemplateDesignerErrorBoundary';
import { ErrorToast } from '../components/ErrorToast';
import { TemplateService } from '../../application/services/TemplateService';
import { BUILT_IN_TEMPLATES, CATEGORY_LABELS, CATEGORY_COLORS } from '../../domain/builtInTemplates';
import type { Template } from '../../domain/types';

const templateService = new TemplateService();

// ─── Built-in template card ───────────────────────────────────────────────────

interface PresetCardProps {
  template: Template;
  onUse: (t: Template) => void;
}

function PresetCard({ template, onUse }: PresetCardProps) {
  const categoryLabel = CATEGORY_LABELS[template.category] ?? template.category;
  const colorClass = CATEGORY_COLORS[template.category] ?? 'bg-gray-100 text-gray-700';

  // Count total elements across all pages as a proxy for complexity
  const elementCount = template.pages.reduce((sum, p) => sum + p.elements.length, 0);

  return (
    <div className="group relative bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-3 hover:border-blue-400 hover:shadow-sm transition-all">
      {/* Category badge */}
      <span className={`self-start text-xs font-medium px-2 py-0.5 rounded-full ${colorClass}`}>
        {categoryLabel}
      </span>

      {/* Template preview placeholder */}
      <div className="h-28 rounded bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-300 text-4xl select-none">
        {template.category === 'REPORT_CARD'  && '📋'}
        {template.category === 'CERTIFICATE'  && '🏅'}
        {template.category === 'ID_CARD'      && '🪪'}
        {template.category === 'FEE_STATEMENT'&& '🧾'}
        {template.category === 'RESULT_SLIP'  && '📄'}
        {template.category === 'ADMISSION_FORM'&&'📝'}
        {template.category === 'RECEIPT'      && '🧾'}
      </div>

      {/* Name */}
      <div>
        <h3 className="font-semibold text-gray-800 text-sm leading-tight">{template.name}</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          {template.pages.length} page{template.pages.length !== 1 ? 's' : ''} · {elementCount} elements
        </p>
      </div>

      {/* Action */}
      <button
        onClick={() => onUse(template)}
        className="mt-auto w-full py-1.5 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
      >
        Use this template
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TemplateListPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [defaultTemplateIds, setDefaultTemplateIds] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showError = (msg: string) => setToastMessage(msg);

  const handleEdit = useCallback(
    (t: Template) => navigate(`/dashboard/admin/templates/designer?templateId=${t.id}`),
    [navigate],
  );

  const handleCreate = useCallback(
    () => navigate('/dashboard/admin/templates/designer'),
    [navigate],
  );

  const handleDelete = useCallback(
    (templateId: string) => setTemplates((prev) => prev.filter((t) => t.id !== templateId)),
    [],
  );

  const handleDuplicate = useCallback((t: Template) => {
    const dup = templateService.duplicateTemplate(t, `${t.name} (Copy)`);
    setTemplates((prev) => [...prev, dup]);
  }, []);

  const handleExport = useCallback((t: Template) => {
    try {
      const json = templateService.exportTemplate(t);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${t.name.replace(/\s+/g, '_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showError('Failed to export template');
    }
  }, []);

  const handleImport = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const imported = templateService.importTemplate(json);
        setTemplates((prev) => [...prev, imported]);
      } catch {
        showError('Failed to import template — invalid file');
      }
    };
    reader.readAsText(file);
  }, []);

  const handleSetDefault = useCallback((category: string, templateId: string) => {
    setDefaultTemplateIds((prev) => ({ ...prev, [category]: templateId }));
  }, []);

  // When user clicks "Use this template" on a built-in preset:
  // duplicate it with a fresh ID and navigate to the designer passing it via state.
  const handleUsePreset = useCallback(
    (preset: Template) => {
      const copy = templateService.duplicateTemplate(preset, `My ${preset.name}`);
      navigate('/dashboard/admin/templates/designer', { state: { template: copy } });
    },
    [navigate],
  );

  return (
    <TemplateDesignerErrorBoundary>
      <div className="p-6 space-y-10">

        {/* ── Section 1: Start from a template ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Start from a template</h2>
          <p className="text-sm text-gray-500 mb-4">
            Pick a preset to edit your own copy — the originals are never changed.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {BUILT_IN_TEMPLATES.map((t) => (
              <PresetCard key={t.id} template={t} onUse={handleUsePreset} />
            ))}
          </div>
        </section>

        {/* ── Section 2: Your templates ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Your templates</h2>
          </div>

          <TemplateList
            templates={templates}
            defaultTemplateIds={defaultTemplateIds}
            onEdit={handleEdit}
            onCreate={handleCreate}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onExport={handleExport}
            onImport={handleImport}
            onSetDefault={handleSetDefault}
          />
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
