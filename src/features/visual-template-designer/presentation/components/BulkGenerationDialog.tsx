/**
 * Visual Template Designer - Bulk Generation Dialog
 *
 * Allows administrators to enter student IDs, generate PDFs for each student,
 * track progress, and download all results as a ZIP archive.
 */

import React, { useState, useCallback, useRef } from 'react';
import JSZip from 'jszip';
import type { Template } from '../../domain/types';
import { DataFetcherService } from '../../infrastructure/api/DataFetcherService';
import {
  PDFRendererService,
  type BulkGenerationProgress,
  type BulkGenerationResult,
} from '../../infrastructure/pdf/PDFRendererService';

interface BulkGenerationDialogProps {
  isOpen: boolean;
  template: Template | null;
  onClose: () => void;
}

type DialogPhase = 'input' | 'generating' | 'done';

const pdfRenderer = new PDFRendererService();
const dataFetcher = new DataFetcherService();

export function BulkGenerationDialog({
  isOpen,
  template,
  onClose,
}: BulkGenerationDialogProps): React.ReactElement | null {
  const [studentIdsText, setStudentIdsText] = useState('');
  const [phase, setPhase] = useState<DialogPhase>('input');
  const [progress, setProgress] = useState<BulkGenerationProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    currentStudentId: '',
  });
  const [results, setResults] = useState<BulkGenerationResult[]>([]);
  const abortRef = useRef(false);

  const handleClose = useCallback(() => {
    if (phase === 'generating') return; // Prevent closing while generating
    setPhase('input');
    setStudentIdsText('');
    setResults([]);
    onClose();
  }, [phase, onClose]);

  const handleGenerate = useCallback(async () => {
    if (!template) return;

    const ids = studentIdsText
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (ids.length === 0) return;

    abortRef.current = false;
    setPhase('generating');
    setProgress({ total: ids.length, completed: 0, failed: 0, currentStudentId: '' });

    const bulkResults = await pdfRenderer.renderBulk(
      template,
      ids,
      (p) => {
        setProgress(p);
      },
      dataFetcher
    );

    setResults(bulkResults);
    setPhase('done');
  }, [template, studentIdsText]);

  const handleDownloadAll = useCallback(async () => {
    const zip = new JSZip();
    const successful = results.filter((r) => r.success && r.pdfBlob);

    for (const result of successful) {
      if (result.pdfBlob) {
        const arrayBuffer = await result.pdfBlob.arrayBuffer();
        zip.file(`student-${result.studentId}.pdf`, arrayBuffer);
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `bulk-reports-${Date.now()}.zip`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [results]);

  if (!isOpen) return null;

  const successCount = results.filter((r) => r.success).length;
  const failedCount = results.filter((r) => !r.success).length;
  const progressPercent =
    progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

  return (
    // Backdrop
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
      onClick={phase !== 'generating' ? handleClose : undefined}
    >
      {/* Dialog panel */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 8,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          width: 480,
          maxWidth: '90vw',
          padding: 24,
          fontFamily: 'Arial, sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 'bold', color: '#111827' }}>
            Bulk PDF Generation
          </h2>
          {phase !== 'generating' && (
            <button
              onClick={handleClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 20,
                cursor: 'pointer',
                color: '#6b7280',
                lineHeight: 1,
                padding: '2px 6px',
              }}
              aria-label="Close dialog"
            >
              x
            </button>
          )}
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Phase: input                                                         */}
        {/* ------------------------------------------------------------------ */}
        {phase === 'input' && (
          <div>
            <label
              htmlFor="student-ids"
              style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#374151', fontWeight: 600 }}
            >
              Student IDs (one per line)
            </label>
            <textarea
              id="student-ids"
              value={studentIdsText}
              onChange={(e) => setStudentIdsText(e.target.value)}
              placeholder="STU-2024-0001&#10;STU-2024-0002&#10;STU-2024-0003"
              rows={8}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                padding: '8px 12px',
                fontSize: 13,
                fontFamily: 'monospace',
                resize: 'vertical',
                outline: 'none',
                color: '#111827',
              }}
            />
            <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
              {studentIdsText.split('\n').filter((s) => s.trim()).length} student(s) entered
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button
                onClick={handleClose}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  backgroundColor: '#f9fafb',
                  cursor: 'pointer',
                  fontSize: 14,
                  color: '#374151',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => void handleGenerate()}
                disabled={!template || studentIdsText.trim().length === 0}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor:
                    !template || studentIdsText.trim().length === 0 ? '#9ca3af' : '#1d4ed8',
                  color: '#ffffff',
                  cursor:
                    !template || studentIdsText.trim().length === 0 ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Generate PDFs
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Phase: generating                                                    */}
        {/* ------------------------------------------------------------------ */}
        {phase === 'generating' && (
          <div>
            <p style={{ fontSize: 14, color: '#374151', marginBottom: 12 }}>
              Generating {progress.completed} of {progress.total}...
            </p>
            {progress.currentStudentId && (
              <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
                Current: {progress.currentStudentId}
              </p>
            )}
            {/* Progress bar */}
            <div
              style={{
                height: 12,
                backgroundColor: '#e5e7eb',
                borderRadius: 6,
                overflow: 'hidden',
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progressPercent}%`,
                  backgroundColor: '#1d4ed8',
                  borderRadius: 6,
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
            <p style={{ fontSize: 13, color: '#6b7280', textAlign: 'right' }}>
              {progressPercent}%
            </p>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Phase: done                                                          */}
        {/* ------------------------------------------------------------------ */}
        {phase === 'done' && (
          <div>
            {/* Summary */}
            <div
              style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 6,
                padding: '12px 16px',
                marginBottom: 16,
              }}
            >
              <p style={{ margin: 0, fontSize: 14, color: '#166534', fontWeight: 600 }}>
                Generation complete
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#166534' }}>
                {successCount} successful, {failedCount} failed
              </p>
            </div>

            {/* Failed list */}
            {failedCount > 0 && (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 6,
                  padding: '10px 16px',
                  marginBottom: 16,
                  maxHeight: 120,
                  overflowY: 'auto',
                }}
              >
                <p style={{ margin: '0 0 6px', fontSize: 13, color: '#991b1b', fontWeight: 600 }}>
                  Failed students:
                </p>
                {results
                  .filter((r) => !r.success)
                  .map((r) => (
                    <p key={r.studentId} style={{ margin: '2px 0', fontSize: 12, color: '#b91c1c' }}>
                      {r.studentId}: {r.error}
                    </p>
                  ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={handleClose}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  backgroundColor: '#f9fafb',
                  cursor: 'pointer',
                  fontSize: 14,
                  color: '#374151',
                }}
              >
                Close
              </button>
              {successCount > 0 && (
                <button
                  onClick={() => void handleDownloadAll()}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: '#1d4ed8',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  Download All ({successCount})
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BulkGenerationDialog;
