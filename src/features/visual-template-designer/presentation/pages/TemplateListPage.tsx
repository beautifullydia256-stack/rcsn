/**
 * Visual Template Designer - Template List Page
 *
 * Admin page showing all templates with create, edit, duplicate,
 * import, export, and delete actions.
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TemplateList } from '../components/TemplateList';
import { TemplateDesignerErrorBoundary } from '../components/TemplateDesignerErrorBoundary';
import { ErrorToast } from '../components/ErrorToast';
import { TemplateService } from '../../application/services/TemplateService';
import type { Template } from '../../domain/types';

const templateService = new TemplateService();

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

  return (
    <TemplateDesignerErrorBoundary>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Report Templates</h1>
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

        {toastMessage && (
          <ErrorToast
            message={toastMessage}
            type="error"
            onDismiss={() => setToastMessage(null)}
            autoHide
          />
        )}
      </div>
    </TemplateDesignerErrorBoundary>
  );
}

export default TemplateListPage;
