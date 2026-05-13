/**
 * Visual Template Designer - Designer Page
 *
 * Full-page route that loads or creates a template, then renders TemplateDesigner.
 * Accepts a template via React Router location state for the "start from template" flow.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { TemplateDesigner } from '../components/TemplateDesigner';
import { TemplateDesignerErrorBoundary } from '../components/TemplateDesignerErrorBoundary';
import { TemplateService } from '../../application/services/TemplateService';
import type { Template } from '../../domain/types';

const templateService = new TemplateService();

interface LocationState {
  template?: Template;
}

export function TemplateDesignerPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('templateId');
  const routeTemplate = (location.state as LocationState | null)?.template ?? null;

  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Prefer template passed via router state (e.g. "start from preset" flow)
    if (routeTemplate) {
      setTemplate(routeTemplate);
      setLoading(false);
      return;
    }

    if (!templateId) {
      // Create a blank template
      const blank = templateService.createTemplate('REPORT_CARD', 'Untitled Template');
      setTemplate(blank);
      setLoading(false);
      return;
    }

    setError(`Template ${templateId} not found`);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
