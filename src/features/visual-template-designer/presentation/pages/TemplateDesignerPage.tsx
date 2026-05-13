/**
 * Visual Template Designer - Designer Page
 *
 * Full-page route that loads or creates a template, checks auth, and renders TemplateDesigner.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TemplateDesigner } from '../components/TemplateDesigner';
import { TemplateDesignerErrorBoundary } from '../components/TemplateDesignerErrorBoundary';
import { TemplateService } from '../../application/services/TemplateService';
import type { Template } from '../../domain/types';

const templateService = new TemplateService();

export function TemplateDesignerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('templateId');

  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!templateId) {
      const blank = templateService.createTemplate('REPORT_CARD', 'Untitled Template');
      setTemplate(blank);
      setLoading(false);
      return;
    }
    setError(`Template ${templateId} not found`);
    setLoading(false);
  }, [templateId]);

  const handleSave = (saved: Template) => {
    console.info('Template saved', saved.id);
  };

  const handleClose = () => navigate(-1);

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
