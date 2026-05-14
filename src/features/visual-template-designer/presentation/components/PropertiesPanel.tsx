/**
 * Visual Template Designer - Properties Panel
 *
 * Right-side sidebar showing editable layout/style properties for the
 * currently selected template component.  Reads state from the
 * useTemplateStore and dispatches store actions on every change.
 */

import React, { useState, useCallback } from 'react';
import { useTemplateStore } from '../../application/state/store';
import type { TemplateComponent, ResultsTableStyle } from '../../domain/types/component';
import type { TextAlignment, ImageFit, FontWeight, FontStyle, BorderStyle } from '../../domain/types/enums';
import { preserveAspectRatio } from '../../domain/models/aspectRatio';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEXT_BASED_TYPES = new Set([
  'SCHOOL_NAME', 'SCHOOL_MOTTO', 'SCHOOL_ADDRESS', 'SCHOOL_CONTACT',
  'STUDENT_NAME', 'STUDENT_CLASS', 'STUDENT_STREAM', 'STUDENT_NUMBER',
  'STUDENT_ATTENDANCE', 'SUBJECT_SCORES', 'GRADE_DISPLAY', 'AGGREGATE_DISPLAY',
  'DIVISION_DISPLAY', 'TEACHER_REMARKS', 'HEAD_TEACHER_COMMENTS', 'FEES_BALANCE',
  'TEXT_LABEL', 'WATERMARK',
]);

const IMAGE_TYPES = new Set([
  'SCHOOL_LOGO', 'STUDENT_PHOTO', 'BACKGROUND_IMAGE',
]);

const FONT_FAMILIES = ['Arial', 'Times New Roman', 'Georgia', 'Courier New', 'Helvetica'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isTextComponent(type: string): boolean {
  return TEXT_BASED_TYPES.has(type);
}

function isImageComponent(type: string): boolean {
  return IMAGE_TYPES.has(type);
}

// ---------------------------------------------------------------------------
// Collapsible section wrapper
// ---------------------------------------------------------------------------

interface SectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {title}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && <div className="px-4 pb-3 space-y-2">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field components
// ---------------------------------------------------------------------------

interface NumberFieldProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
}

function NumberField({ label, value, min, max, step = 1, onChange }: NumberFieldProps) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span className="text-xs text-gray-600 flex-shrink-0">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
      />
    </label>
  );
}

interface RangeFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}

function RangeField({ label, value, min, max, onChange }: RangeFieldProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-600">{label}</span>
        <span className="text-xs text-gray-500">{value}px</span>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-600"
      />
    </div>
  );
}

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

function ColorField({ label, value, onChange }: ColorFieldProps) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span className="text-xs text-gray-600 flex-shrink-0">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-6 h-6 rounded border border-gray-300 cursor-pointer p-0"
        />
        <span className="text-xs text-gray-500 font-mono">{value || '#000000'}</span>
      </div>
    </label>
  );
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}

function SelectField<T extends string>({ label, value, options, onChange }: SelectFieldProps<T>) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span className="text-xs text-gray-600 flex-shrink-0">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

interface ToggleButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function ToggleButton({ label, active, onClick }: ToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 text-xs rounded border transition-colors ${
        active
          ? 'bg-blue-600 text-white border-blue-600'
          : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
      }`}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// PropertiesPanel
// ---------------------------------------------------------------------------

export function PropertiesPanel() {
  const selectedComponentId = useTemplateStore((s) => s.selectedComponentId);
  const current = useTemplateStore((s) => s.current);
  const updateComponent = useTemplateStore((s) => s.updateComponent);
  const moveComponent = useTemplateStore((s) => s.moveComponent);
  const resizeComponent = useTemplateStore((s) => s.resizeComponent);
  const rotateComponent = useTemplateStore((s) => s.rotateComponent);

  // Aspect ratio lock state (local UI state, not stored)
  const [aspectRatioLocked, setAspectRatioLocked] = useState(false);

  // Find selected component across all pages
  const selectedComponent: TemplateComponent | undefined = (() => {
    if (!current || !selectedComponentId) return undefined;
    for (const page of current.pages) {
      const found = page.elements.find((el) => el.id === selectedComponentId);
      if (found) return found;
    }
    return undefined;
  })();

  // -------------------------------------------------------------------------
  // Event handlers
  // -------------------------------------------------------------------------

  const handleXChange = useCallback(
    (x: number) => {
      if (!selectedComponentId) return;
      moveComponent(selectedComponentId, x, selectedComponent?.layout.position.y ?? 0);
    },
    [selectedComponentId, selectedComponent, moveComponent]
  );

  const handleYChange = useCallback(
    (y: number) => {
      if (!selectedComponentId) return;
      moveComponent(selectedComponentId, selectedComponent?.layout.position.x ?? 0, y);
    },
    [selectedComponentId, selectedComponent, moveComponent]
  );

  const handleWidthChange = useCallback(
    (newWidth: number) => {
      if (!selectedComponentId || !selectedComponent) return;
      const origW = selectedComponent.layout.size.width;
      const origH = selectedComponent.layout.size.height;
      const { width, height } = preserveAspectRatio(origW, origH, newWidth, origH, aspectRatioLocked);
      resizeComponent(selectedComponentId, width, height);
    },
    [selectedComponentId, selectedComponent, aspectRatioLocked, resizeComponent]
  );

  const handleHeightChange = useCallback(
    (newHeight: number) => {
      if (!selectedComponentId || !selectedComponent) return;
      const origW = selectedComponent.layout.size.width;
      const origH = selectedComponent.layout.size.height;
      const { width, height } = preserveAspectRatio(origW, origH, origW, newHeight, aspectRatioLocked);
      resizeComponent(selectedComponentId, width, height);
    },
    [selectedComponentId, selectedComponent, aspectRatioLocked, resizeComponent]
  );

  const handleRotationChange = useCallback(
    (rotation: number) => {
      if (!selectedComponentId) return;
      rotateComponent(selectedComponentId, rotation);
    },
    [selectedComponentId, rotateComponent]
  );

  /** Merge a partial layout update into the component. */
  const patchLayout = useCallback(
    (patch: Partial<TemplateComponent['layout']>) => {
      if (!selectedComponentId || !selectedComponent) return;
      updateComponent(selectedComponentId, {
        layout: { ...selectedComponent.layout, ...patch },
      });
    },
    [selectedComponentId, selectedComponent, updateComponent]
  );

  /** Merge a partial font update. */
  const patchFont = useCallback(
    (patch: Partial<NonNullable<TemplateComponent['layout']['font']>>) => {
      if (!selectedComponent) return;
      const currentFont = selectedComponent.layout.font ?? {
        family: 'Arial',
        size: 12,
        weight: 'normal' as FontWeight,
        style: 'normal' as FontStyle,
      };
      patchLayout({ font: { ...currentFont, ...patch } });
    },
    [selectedComponent, patchLayout]
  );

  /** Merge a partial color update. */
  const patchColor = useCallback(
    (patch: Partial<NonNullable<TemplateComponent['layout']['color']>>) => {
      if (!selectedComponent) return;
      const currentColor = selectedComponent.layout.color ?? {};
      patchLayout({ color: { ...currentColor, ...patch } });
    },
    [selectedComponent, patchLayout]
  );

  /** Merge a partial border update. */
  const patchBorder = useCallback(
    (patch: Partial<NonNullable<TemplateComponent['layout']['border']>>) => {
      if (!selectedComponent) return;
      const currentBorder = selectedComponent.layout.border ?? {
        width: 0,
        color: '#000000',
        style: 'solid' as BorderStyle,
      };
      patchLayout({ border: { ...currentBorder, ...patch } });
    },
    [selectedComponent, patchLayout]
  );

  /** Merge a partial spacing update. */
  const patchSpacing = useCallback(
    (patch: Partial<NonNullable<TemplateComponent['layout']['spacing']>>) => {
      if (!selectedComponent) return;
      const currentSpacing = selectedComponent.layout.spacing ?? { padding: 0, margin: 0 };
      patchLayout({ spacing: { ...currentSpacing, ...patch } });
    },
    [selectedComponent, patchLayout]
  );

  /** Update a results table style field. */
  const patchTableStyle = useCallback(
    (patch: Partial<ResultsTableStyle>) => {
      if (!selectedComponentId || !selectedComponent) return;
      // ResultsTableComponent extends TemplateComponent with tableStyle
      const asTable = selectedComponent as TemplateComponent & { tableStyle?: ResultsTableStyle };
      const currentStyle: ResultsTableStyle = asTable.tableStyle ?? {
        borderWidth: 1,
        borderColor: '#000000',
        headerBackgroundColor: '#F3F4F6',
        headerTextColor: '#000000',
        rowBackgroundColor: '#FFFFFF',
        alternatingRowBackgroundColor: '#F9FAFB',
        cellPadding: 4,
        fontSize: 12,
      };
      updateComponent(selectedComponentId, {
        tableStyle: { ...currentStyle, ...patch },
      } as Partial<TemplateComponent>);
    },
    [selectedComponentId, selectedComponent, updateComponent]
  );

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------

  if (!selectedComponent) {
    return (
      <aside
        style={{ width: 260 }}
        className="h-full flex flex-col bg-white border-l border-gray-200 overflow-hidden"
      >
        <div className="px-4 pt-4 pb-3 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-sm font-semibold text-gray-700">Properties</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-xs text-gray-400 text-center leading-relaxed">
            Select a component to edit its properties
          </p>
        </div>
      </aside>
    );
  }

  const layout = selectedComponent.layout;
  const font = layout.font;
  const color = layout.color ?? {};
  const border = layout.border ?? { width: 0, color: '#000000', style: 'solid' as BorderStyle };
  const spacing = layout.spacing ?? { padding: 0, margin: 0 };
  const isText = isTextComponent(selectedComponent.type);
  const isImage = isImageComponent(selectedComponent.type);
  const isResultsTable = selectedComponent.type === 'RESULTS_TABLE';
  const asTable = selectedComponent as TemplateComponent & { tableStyle?: ResultsTableStyle };
  const tableStyle: ResultsTableStyle = asTable.tableStyle ?? {
    borderWidth: 1,
    borderColor: '#000000',
    headerBackgroundColor: '#F3F4F6',
    headerTextColor: '#000000',
    rowBackgroundColor: '#FFFFFF',
    alternatingRowBackgroundColor: '#F9FAFB',
    cellPadding: 4,
    fontSize: 12,
  };

  return (
    <aside
      style={{ width: 260 }}
      className="h-full flex flex-col bg-white border-l border-gray-200 overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-200 flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-700">Properties</h2>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{selectedComponent.type}</p>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto">

        {/* Text Content — TEXT_LABEL only */}
        {selectedComponent.type === 'TEXT_LABEL' && (
          <Section title="Text Content">
            <textarea
              value={selectedComponent.content ?? ''}
              onChange={(e) => {
                if (!selectedComponentId) return;
                updateComponent(selectedComponentId, { content: e.target.value });
              }}
              placeholder="Type label text…"
              rows={3}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none text-gray-800 placeholder-gray-400"
            />
            <p className="text-xs text-gray-400 leading-relaxed">
              This text appears on every printed report. Use it for fixed labels like "Name:", "Class:", "Term:", etc.
            </p>
          </Section>
        )}

        {/* Position & Size */}
        <Section title="Position & Size">
          <NumberField
            label="X"
            value={layout.position.x}
            onChange={handleXChange}
          />
          <NumberField
            label="Y"
            value={layout.position.y}
            onChange={handleYChange}
          />
          <NumberField
            label="Width"
            value={layout.size.width}
            min={1}
            onChange={handleWidthChange}
          />
          <NumberField
            label="Height"
            value={layout.size.height}
            min={1}
            onChange={handleHeightChange}
          />
          <NumberField
            label="Rotation"
            value={layout.rotation}
            min={0}
            max={360}
            onChange={handleRotationChange}
          />
          {(isImage) && (
            <label className="flex items-center justify-between gap-2 pt-1">
              <span className="text-xs text-gray-600">Lock aspect ratio</span>
              <button
                type="button"
                onClick={() => setAspectRatioLocked((v) => !v)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  aspectRatioLocked ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                    aspectRatioLocked ? 'translate-x-4' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
          )}
        </Section>

        {/* Font */}
        {isText && (
          <Section title="Font">
            <SelectField<string>
              label="Family"
              value={font?.family ?? 'Arial'}
              options={FONT_FAMILIES.map((f) => ({ value: f, label: f }))}
              onChange={(v) => patchFont({ family: v })}
            />
            <NumberField
              label="Size"
              value={font?.size ?? 12}
              min={6}
              max={72}
              onChange={(v) => patchFont({ size: v })}
            />
            <div className="flex items-center gap-2 pt-1">
              <ToggleButton
                label="B"
                active={font?.weight === 'bold'}
                onClick={() => patchFont({ weight: font?.weight === 'bold' ? 'normal' : 'bold' })}
              />
              <ToggleButton
                label="I"
                active={font?.style === 'italic'}
                onClick={() => patchFont({ style: font?.style === 'italic' ? 'normal' : 'italic' })}
              />
            </div>
          </Section>
        )}

        {/* Color */}
        <Section title="Color">
          <ColorField
            label="Text color"
            value={color.text ?? '#000000'}
            onChange={(v) => patchColor({ text: v })}
          />
          <ColorField
            label="Background"
            value={color.background ?? '#ffffff'}
            onChange={(v) => patchColor({ background: v })}
          />
        </Section>

        {/* Border */}
        <Section title="Border">
          <RangeField
            label="Width"
            value={border.width}
            min={0}
            max={20}
            onChange={(v) => patchBorder({ width: v })}
          />
          <ColorField
            label="Color"
            value={border.color}
            onChange={(v) => patchBorder({ color: v })}
          />
          <SelectField<BorderStyle>
            label="Style"
            value={border.style}
            options={[
              { value: 'solid', label: 'Solid' },
              { value: 'dashed', label: 'Dashed' },
              { value: 'dotted', label: 'Dotted' },
            ]}
            onChange={(v) => patchBorder({ style: v })}
          />
        </Section>

        {/* Spacing */}
        <Section title="Spacing">
          <RangeField
            label="Padding"
            value={spacing.padding}
            min={0}
            max={50}
            onChange={(v) => patchSpacing({ padding: v })}
          />
          <RangeField
            label="Margin"
            value={spacing.margin}
            min={0}
            max={50}
            onChange={(v) => patchSpacing({ margin: v })}
          />
        </Section>

        {/* Text Alignment */}
        {isText && (
          <Section title="Text Alignment">
            <div className="flex items-center gap-1">
              {(['left', 'center', 'right', 'justify'] as TextAlignment[]).map((align) => (
                <button
                  key={align}
                  type="button"
                  onClick={() => patchLayout({ alignment: align })}
                  title={align.charAt(0).toUpperCase() + align.slice(1)}
                  className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
                    layout.alignment === align
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {align === 'left' && '⬅'}
                  {align === 'center' && '↔'}
                  {align === 'right' && '➡'}
                  {align === 'justify' && '☰'}
                </button>
              ))}
            </div>
          </Section>
        )}

        {/* Image Fit */}
        {isImage && (
          <Section title="Image Fit">
            <div className="grid grid-cols-2 gap-1">
              {(['contain', 'cover', 'fill', 'scale-down'] as ImageFit[]).map((fit) => (
                <button
                  key={fit}
                  type="button"
                  onClick={() => patchLayout({ imagefit: fit })}
                  className={`py-1.5 text-xs rounded border transition-colors ${
                    layout.imagefit === fit
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {fit.charAt(0).toUpperCase() + fit.slice(1)}
                </button>
              ))}
            </div>
          </Section>
        )}

        {/* Results Table Style */}
        {isResultsTable && (
          <Section title="Results Table Style">
            <NumberField
              label="Border width"
              value={tableStyle.borderWidth}
              min={0}
              max={20}
              onChange={(v) => patchTableStyle({ borderWidth: v })}
            />
            <ColorField
              label="Border color"
              value={tableStyle.borderColor}
              onChange={(v) => patchTableStyle({ borderColor: v })}
            />
            <ColorField
              label="Header background"
              value={tableStyle.headerBackgroundColor}
              onChange={(v) => patchTableStyle({ headerBackgroundColor: v })}
            />
            <ColorField
              label="Header text color"
              value={tableStyle.headerTextColor}
              onChange={(v) => patchTableStyle({ headerTextColor: v })}
            />
            <ColorField
              label="Row background"
              value={tableStyle.rowBackgroundColor}
              onChange={(v) => patchTableStyle({ rowBackgroundColor: v })}
            />
            <ColorField
              label="Alternating row"
              value={tableStyle.alternatingRowBackgroundColor}
              onChange={(v) => patchTableStyle({ alternatingRowBackgroundColor: v })}
            />
            <NumberField
              label="Cell padding"
              value={tableStyle.cellPadding}
              min={0}
              onChange={(v) => patchTableStyle({ cellPadding: v })}
            />
            <NumberField
              label="Font size"
              value={tableStyle.fontSize}
              min={6}
              max={72}
              onChange={(v) => patchTableStyle({ fontSize: v })}
            />
          </Section>
        )}
      </div>
    </aside>
  );
}

export default PropertiesPanel;
