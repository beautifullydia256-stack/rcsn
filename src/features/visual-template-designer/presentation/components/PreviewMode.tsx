/**
 * Visual Template Designer - PreviewMode Component
 *
 * Renders the template with sample data at actual canvas size (794×1123 px),
 * scaled to fit the viewport. Dynamic components display sample values;
 * static components display as designed.
 */

import React from 'react';
import type { Template, TemplateComponent, ComponentType } from '../../domain/types';
import type { SampleStudentData } from '../../infrastructure/api/DataFetcherService';

// Standard A4 canvas dimensions in pixels (96 dpi)
const CANVAS_WIDTH = 794;
const CANVAS_HEIGHT = 1123;

interface PreviewModeProps {
  template: Template;
  currentPageId: string;
  sampleData: SampleStudentData;
  isLoading: boolean;
}

// ---------------------------------------------------------------------------
// Data resolution helpers
// ---------------------------------------------------------------------------

function resolveComponentText(
  component: TemplateComponent,
  sampleData: SampleStudentData
): string {
  const { type, dataBinding } = component;

  // If the component has an explicit data binding use the bound field
  if (dataBinding?.field) {
    const value = resolveBoundField(dataBinding.field, sampleData);
    if (value !== null) return value;
    if (dataBinding.fallback) return dataBinding.fallback;
  }

  // Otherwise resolve by component type
  return resolveByType(type, sampleData);
}

function resolveBoundField(
  field: string,
  data: SampleStudentData
): string | null {
  const map: Record<string, string> = {
    studentName: data.studentName,
    studentClass: data.studentClass,
    studentStream: data.studentStream,
    studentNumber: data.studentNumber,
    attendancePercentage: data.attendancePercentage,
    schoolName: data.schoolName,
    schoolMotto: data.schoolMotto,
    schoolAddress: data.schoolAddress,
    schoolContact: data.schoolContact,
    aggregate: String(data.aggregate),
    division: data.division,
    teacherRemarks: data.teacherRemarks,
    headTeacherComments: data.headTeacherComments,
    feesBalance: `UGX ${data.feesBalance.toLocaleString()}`,
    totalFees: `UGX ${data.totalFees.toLocaleString()}`,
    amountPaid: `UGX ${data.amountPaid.toLocaleString()}`,
  };
  return map[field] ?? null;
}

function resolveByType(type: ComponentType, data: SampleStudentData): string {
  switch (type) {
    case 'SCHOOL_NAME': return data.schoolName;
    case 'SCHOOL_MOTTO': return data.schoolMotto;
    case 'SCHOOL_ADDRESS': return data.schoolAddress;
    case 'SCHOOL_CONTACT': return data.schoolContact;
    case 'STUDENT_NAME': return data.studentName;
    case 'STUDENT_CLASS': return data.studentClass;
    case 'STUDENT_STREAM': return data.studentStream;
    case 'STUDENT_NUMBER': return data.studentNumber;
    case 'STUDENT_ATTENDANCE': return data.attendancePercentage;
    case 'AGGREGATE_DISPLAY': return `Aggregate: ${data.aggregate}`;
    case 'DIVISION_DISPLAY': return data.division;
    case 'TEACHER_REMARKS': return data.teacherRemarks;
    case 'HEAD_TEACHER_COMMENTS': return data.headTeacherComments;
    case 'FEES_BALANCE': return `Balance: UGX ${data.feesBalance.toLocaleString()}`;
    case 'PAYMENT_SUMMARY':
      return `Paid: UGX ${data.amountPaid.toLocaleString()} / Total: UGX ${data.totalFees.toLocaleString()}`;
    case 'GRADE_DISPLAY': {
      const best = data.results[0];
      return best ? `${best.subject}: ${best.grade}` : 'N/A';
    }
    case 'SUBJECT_SCORES':
      return data.results.map((r) => `${r.subject}: ${r.score}`).join(', ');
    default: return '';
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function isStaticShape(type: ComponentType): boolean {
  return ['LINE', 'BORDER', 'RECTANGLE', 'CIRCLE', 'BACKGROUND_IMAGE', 'WATERMARK'].includes(type);
}

function isTextComponent(type: ComponentType): boolean {
  return [
    'SCHOOL_NAME', 'SCHOOL_MOTTO', 'SCHOOL_ADDRESS', 'SCHOOL_CONTACT',
    'STUDENT_NAME', 'STUDENT_CLASS', 'STUDENT_STREAM', 'STUDENT_NUMBER', 'STUDENT_ATTENDANCE',
    'AGGREGATE_DISPLAY', 'DIVISION_DISPLAY', 'TEACHER_REMARKS', 'HEAD_TEACHER_COMMENTS',
    'FEES_BALANCE', 'PAYMENT_SUMMARY', 'GRADE_DISPLAY', 'SUBJECT_SCORES',
    'TEXT_LABEL', 'SIGNATURE_FIELD', 'FEE_STRUCTURE',
  ].includes(type);
}

function isImagePlaceholder(type: ComponentType): boolean {
  return type === 'SCHOOL_LOGO' || type === 'STUDENT_PHOTO';
}

// ---------------------------------------------------------------------------
// Component renderer
// ---------------------------------------------------------------------------

function RenderComponent({
  component,
  sampleData,
}: {
  component: TemplateComponent;
  sampleData: SampleStudentData;
}): React.ReactElement {
  const { layout, type } = component;
  const { position, size, rotation, font, color, border } = layout;

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    width: size.width,
    height: size.height,
    transform: rotation ? `rotate(${rotation}deg)` : undefined,
    boxSizing: 'border-box',
    overflow: 'hidden',
  };

  if (color?.background) {
    baseStyle.backgroundColor = color.background;
  }

  if (border) {
    baseStyle.border = `${border.width}px ${border.style} ${border.color}`;
  }

  // RESULTS_TABLE
  if (type === 'RESULTS_TABLE') {
    return (
      <div style={{ ...baseStyle, overflow: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: font?.size ?? 10,
            fontFamily: font?.family ?? 'Arial',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#1e40af', color: '#ffffff' }}>
              <th style={{ border: '1px solid #ccc', padding: 4 }}>Subject</th>
              <th style={{ border: '1px solid #ccc', padding: 4 }}>Score</th>
              <th style={{ border: '1px solid #ccc', padding: 4 }}>Grade</th>
              <th style={{ border: '1px solid #ccc', padding: 4 }}>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {sampleData.results.map((row, idx) => (
              <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#f9fafb' : '#ffffff' }}>
                <td style={{ border: '1px solid #ccc', padding: 4 }}>{row.subject}</td>
                <td style={{ border: '1px solid #ccc', padding: 4, textAlign: 'center' }}>{row.score}</td>
                <td style={{ border: '1px solid #ccc', padding: 4, textAlign: 'center' }}>{row.grade}</td>
                <td style={{ border: '1px solid #ccc', padding: 4 }}>{row.remarks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // LINE
  if (type === 'LINE') {
    const lineColor = border?.color ?? color?.text ?? '#000000';
    const lineWidth = border?.width ?? 1;
    return (
      <div
        style={{
          ...baseStyle,
          borderTop: `${lineWidth}px ${border?.style ?? 'solid'} ${lineColor}`,
          height: lineWidth,
        }}
      />
    );
  }

  // CIRCLE
  if (type === 'CIRCLE') {
    return (
      <div
        style={{
          ...baseStyle,
          borderRadius: '50%',
          backgroundColor: color?.background ?? 'transparent',
        }}
      />
    );
  }

  // Image placeholders
  if (isImagePlaceholder(type)) {
    const label = type === 'SCHOOL_LOGO' ? 'School Logo' : 'Student Photo';
    return (
      <div
        style={{
          ...baseStyle,
          backgroundColor: '#e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          color: '#6b7280',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        {label}
      </div>
    );
  }

  // Static shapes (RECTANGLE, BORDER, BACKGROUND_IMAGE, WATERMARK)
  if (isStaticShape(type)) {
    return <div style={baseStyle} />;
  }

  // Text components
  if (isTextComponent(type)) {
    const text = resolveComponentText(component, sampleData);
    return (
      <div
        style={{
          ...baseStyle,
          fontSize: font?.size ?? 12,
          fontFamily: font?.family ?? 'Arial',
          fontWeight: font?.weight ?? 'normal',
          fontStyle: font?.style ?? 'normal',
          color: color?.text ?? '#000000',
          textAlign: layout.alignment ?? 'left',
          display: 'flex',
          alignItems: 'center',
          padding: layout.spacing?.padding ?? 2,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {text}
      </div>
    );
  }

  // Fallback for unknown types
  return <div style={baseStyle} />;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PreviewMode({
  template,
  currentPageId,
  sampleData,
  isLoading,
}: PreviewModeProps): React.ReactElement {
  const currentPage =
    template.pages.find((p) => p.id === currentPageId) ?? template.pages[0];

  const pageWidth = currentPage?.width ?? CANVAS_WIDTH;
  const pageHeight = currentPage?.height ?? CANVAS_HEIGHT;

  // Sort components by zIndex so higher values render on top
  const sortedComponents = currentPage
    ? [...currentPage.elements].sort((a, b) => a.zIndex - b.zIndex)
    : [];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        overflow: 'auto',
        backgroundColor: '#d1d5db',
        padding: 24,
        boxSizing: 'border-box',
      }}
    >
      {/* Page wrapper — scales to fit viewport */}
      <div
        style={{
          position: 'relative',
          width: pageWidth,
          height: pageHeight,
          backgroundColor: '#ffffff',
          boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
          flexShrink: 0,
        }}
      >
        {sortedComponents.map((component) => (
          <RenderComponent
            key={component.id}
            component={component}
            sampleData={sampleData}
          />
        ))}

        {/* Loading overlay */}
        {isLoading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(255,255,255,0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              fontSize: 16,
              fontFamily: 'Arial, sans-serif',
              color: '#374151',
            }}
          >
            Loading preview...
          </div>
        )}
      </div>
    </div>
  );
}

export default PreviewMode;
