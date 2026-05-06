import { useState } from 'react';
import { NURSERY_TEMPLATES } from '@/templates/nursery';
import {
  getSampleTemplate7Data,
  getSampleTemplate8Data,
  getSampleTemplate9Data,
  getSampleTemplate10Data,
  getSampleTemplate11Data,
  getSampleTemplate12Data
} from '@/templates/nursery/sampleData';
import { GlassModal } from '@/components/Glass/GlassModal';

type TemplateKey = 'template7' | 'template8' | 'template9' | 'template10' | 'template11' | 'template12';

interface TemplateInfo {
  key: TemplateKey;
  name: string;
  description: string;
  section: string;
}

const templates: TemplateInfo[] = [
  {
    key: 'template7',
    name: NURSERY_TEMPLATES.template7.name,
    description: NURSERY_TEMPLATES.template7.description,
    section: NURSERY_TEMPLATES.template7.section
  },
  {
    key: 'template8',
    name: NURSERY_TEMPLATES.template8.name,
    description: NURSERY_TEMPLATES.template8.description,
    section: NURSERY_TEMPLATES.template8.section
  },
  {
    key: 'template9',
    name: NURSERY_TEMPLATES.template9.name,
    description: NURSERY_TEMPLATES.template9.description,
    section: NURSERY_TEMPLATES.template9.section
  },
  {
    key: 'template10',
    name: NURSERY_TEMPLATES.template10.name,
    description: NURSERY_TEMPLATES.template10.description,
    section: NURSERY_TEMPLATES.template10.section
  },
  {
    key: 'template11',
    name: NURSERY_TEMPLATES.template11.name,
    description: NURSERY_TEMPLATES.template11.description,
    section: NURSERY_TEMPLATES.template11.section
  },
  {
    key: 'template12',
    name: NURSERY_TEMPLATES.template12.name,
    description: NURSERY_TEMPLATES.template12.description,
    section: NURSERY_TEMPLATES.template12.section
  }
];

export default function TemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey | null>(null);
  const [previewHTML, setPreviewHTML] = useState<string>('');

  const handlePreview = async (templateKey: TemplateKey) => {
    // Dynamically import the generator function
    const { generateTemplate7HTML, generateTemplate8HTML, generateTemplate9HTML, 
            generateTemplate10HTML, generateTemplate11HTML, generateTemplate12HTML } = 
      await import('@/templates/nursery/generators');

    let html = '';
    
    switch (templateKey) {
      case 'template7':
        html = generateTemplate7HTML(getSampleTemplate7Data());
        break;
      case 'template8':
        html = generateTemplate8HTML(getSampleTemplate8Data());
        break;
      case 'template9':
        html = generateTemplate9HTML(getSampleTemplate9Data());
        break;
      case 'template10':
        html = generateTemplate10HTML(getSampleTemplate10Data());
        break;
      case 'template11':
        html = generateTemplate11HTML(getSampleTemplate11Data());
        break;
      case 'template12':
        html = generateTemplate12HTML(getSampleTemplate12Data());
        break;
    }

    setPreviewHTML(html);
    setSelectedTemplate(templateKey);
  };

  const handleClosePreview = () => {
    setSelectedTemplate(null);
    setPreviewHTML('');
  };

  const selectedTemplateInfo = selectedTemplate 
    ? templates.find(t => t.key === selectedTemplate)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold ac-text-primary">Report Templates</h1>
          <p className="text-sm ac-text-muted mt-1">
            Preview nursery report card templates
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <div
            key={template.key}
            className="ac-glass-card p-5 border border-[var(--ac-border)] flex flex-col"
          >
            <div className="flex-1">
              <h3 className="font-semibold ac-text-primary text-lg mb-2">
                {template.name}
              </h3>
              <p className="text-sm ac-text-muted mb-3">
                {template.description}
              </p>
              <div className="inline-block rounded bg-[var(--ac-bg-muted)] px-2 py-1 text-xs ac-text-muted">
                {template.section}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handlePreview(template.key)}
              className="mt-4 w-full ac-glass-btn-primary rounded-xl px-4 py-2 text-sm font-medium ac-text-primary hover:opacity-90 transition-opacity"
            >
              Preview Template
            </button>
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      <GlassModal
        isOpen={selectedTemplate !== null}
        onClose={handleClosePreview}
        title={selectedTemplateInfo?.name}
        size="xl"
      >
        <div className="space-y-4">
          {selectedTemplateInfo && (
            <div className="text-sm ac-text-muted">
              {selectedTemplateInfo.description}
            </div>
          )}
          
          <div 
            className="border border-[var(--ac-border)] rounded-lg overflow-auto"
            style={{ maxHeight: '70vh' }}
          >
            {previewHTML && (
              <iframe
                srcDoc={previewHTML}
                title="Template Preview"
                className="w-full h-full"
                style={{ minHeight: '600px' }}
                sandbox="allow-same-origin"
              />
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClosePreview}
              className="ac-glass-btn-secondary rounded-xl px-4 py-2 text-sm font-medium ac-text-primary"
            >
              Close
            </button>
          </div>
        </div>
      </GlassModal>
    </div>
  );
}
