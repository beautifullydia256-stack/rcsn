/**
 * Visual Template Designer - Template List
 *
 * Displays all templates organised by category with search, import, create,
 * edit, duplicate, export, delete, and default-setting capabilities.
 *
 * Requirements:
 * - 13.1: Create template
 * - 13.2: Duplicate template
 * - 13.3: Export template
 * - 13.4: Import template
 * - 13.5: Search templates
 */

import React, { useState, useRef } from 'react';
import type { Template } from '../../domain/types';
import type { TemplateCategory } from '../../domain/types/enums';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TemplateListProps {
  templates: Template[];
  onEdit: (template: Template) => void;
  onCreate: () => void;
  onDelete: (templateId: string) => void;
  onDuplicate: (template: Template) => void;
  onExport: (template: Template) => void;
  onImport: (file: File) => void;
  defaultTemplateIds: Record<string, string>;
  onSetDefault: (category: string, templateId: string) => void;
}

// ---------------------------------------------------------------------------
// Category display config
// ---------------------------------------------------------------------------

const CATEGORIES: TemplateCategory[] = [
  'REPORT_CARD',
  'CERTIFICATE',
  'ID_CARD',
  'RECEIPT',
  'FEE_STATEMENT',
  'ADMISSION_FORM',
  'RESULT_SLIP',
];

function formatCategory(category: TemplateCategory): string {
  return category.replace(/_/g, ' ');
}

// ---------------------------------------------------------------------------
// ConfirmDialog (simple inline confirmation modal)
// ---------------------------------------------------------------------------

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Confirm delete"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 8,
          padding: 24,
          minWidth: 320,
          boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
        }}
      >
        <p style={{ marginBottom: 20, fontSize: 15 }}>{message}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '6px 16px' }}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{ padding: '6px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4 }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TemplateCard
// ---------------------------------------------------------------------------

interface TemplateCardProps {
  template: Template;
  isDefault: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}

function TemplateCard({
  template,
  isDefault,
  onEdit,
  onDuplicate,
  onExport,
  onDelete,
  onSetDefault,
}: TemplateCardProps) {
  return (
    <div
      style={{
        border: isDefault ? '2px solid #2563eb' : '1px solid #e5e7eb',
        borderRadius: 8,
        padding: 16,
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{template.name}</h3>
          <span
            style={{
              display: 'inline-block',
              marginTop: 4,
              padding: '2px 8px',
              borderRadius: 12,
              background: '#e0f2fe',
              color: '#0369a1',
              fontSize: 11,
              fontWeight: 500,
            }}
          >
            {formatCategory(template.category)}
          </span>
          {isDefault && (
            <span
              style={{
                display: 'inline-block',
                marginTop: 4,
                marginLeft: 6,
                padding: '2px 8px',
                borderRadius: 12,
                background: '#dcfce7',
                color: '#166534',
                fontSize: 11,
                fontWeight: 500,
              }}
            >
              Default
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={onEdit}
          style={{ padding: '4px 12px', fontSize: 12, borderRadius: 4, cursor: 'pointer' }}
        >
          Edit
        </button>
        <button
          onClick={onDuplicate}
          style={{ padding: '4px 12px', fontSize: 12, borderRadius: 4, cursor: 'pointer' }}
        >
          Duplicate
        </button>
        <button
          onClick={onExport}
          style={{ padding: '4px 12px', fontSize: 12, borderRadius: 4, cursor: 'pointer' }}
        >
          Export
        </button>
        {!isDefault && (
          <button
            onClick={onSetDefault}
            style={{ padding: '4px 12px', fontSize: 12, borderRadius: 4, cursor: 'pointer' }}
          >
            Set Default
          </button>
        )}
        <button
          onClick={onDelete}
          style={{
            padding: '4px 12px',
            fontSize: 12,
            borderRadius: 4,
            cursor: 'pointer',
            background: '#fee2e2',
            color: '#991b1b',
            border: '1px solid #fca5a5',
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TemplateList (main component)
// ---------------------------------------------------------------------------

export function TemplateList({
  templates,
  onEdit,
  onCreate,
  onDelete,
  onDuplicate,
  onExport,
  onImport,
  defaultTemplateIds,
  onSetDefault,
}: TemplateListProps) {
  const [search, setSearch] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Template | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredTemplates = search.trim()
    ? templates.filter((t) => t.name.toLowerCase().includes(search.trim().toLowerCase()))
    : templates;

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      // Reset input so same file can be re-imported
      e.target.value = '';
    }
  };

  const handleDeleteConfirm = () => {
    if (pendingDelete) {
      onDelete(pendingDelete.id);
      setPendingDelete(null);
    }
  };

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid #d1d5db',
            fontSize: 14,
          }}
          aria-label="Search templates"
        />
        <button
          onClick={handleImportClick}
          style={{ padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}
        >
          Import
        </button>
        <button
          onClick={onCreate}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
            background: '#2563eb',
            color: '#fff',
            border: 'none',
          }}
        >
          New Template
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
          aria-label="Import template file"
        />
      </div>

      {/* Templates grouped by category */}
      {CATEGORIES.map((category) => {
        const categoryTemplates = filteredTemplates.filter((t) => t.category === category);
        if (categoryTemplates.length === 0) return null;

        return (
          <div key={category} style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: '#374151' }}>
              {formatCategory(category)}
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 16,
              }}
            >
              {categoryTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isDefault={defaultTemplateIds[category] === template.id}
                  onEdit={() => onEdit(template)}
                  onDuplicate={() => onDuplicate(template)}
                  onExport={() => onExport(template)}
                  onDelete={() => setPendingDelete(template)}
                  onSetDefault={() => onSetDefault(category, template.id)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {filteredTemplates.length === 0 && (
        <p style={{ color: '#6b7280', textAlign: 'center', marginTop: 40 }}>
          {search ? 'No templates match your search.' : 'No templates yet. Create your first template!'}
        </p>
      )}

      {/* Delete confirmation dialog */}
      {pendingDelete && (
        <ConfirmDialog
          message={`Are you sure you want to delete "${pendingDelete.name}"? This action cannot be undone.`}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

export default TemplateList;
