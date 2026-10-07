/**
 * Visual Template Designer - Bulk Generation Dialog
 *
 * Allows administrators to enter student IDs, generate PDFs for each student,
 * track progress, and download all results as a ZIP archive.
 * Upgraded to Apple Liquid Glass modal design standard.
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
import NativeModal from '@/components/NativeModal';
import { FileArchive, CheckCircle2, AlertCircle, Loader2, Download, FileText } from 'lucide-react';

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
    if (phase === 'generating') return;
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
  const enteredIdsCount = studentIdsText.split('\n').filter((s) => s.trim()).length;

  return (
    <NativeModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Bulk PDF Generation"
      subtitle={template ? `Template: ${template.name}` : 'Render multiple trainee documents in batch'}
      icon={FileArchive}
      size="md"
      closeOnOverlayClick={phase !== 'generating'}
    >
      <div className="space-y-5">
        {/* Phase: input */}
        {phase === 'input' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label
                htmlFor="student-ids"
                className="text-[11px] font-bold text-white/70 uppercase tracking-wider block"
              >
                Trainee IDs (one per line)
              </label>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/10">
                {enteredIdsCount} trainee{enteredIdsCount === 1 ? '' : 's'} queued
              </span>
            </div>

            <textarea
              id="student-ids"
              value={studentIdsText}
              onChange={(e) => setStudentIdsText(e.target.value)}
              placeholder={"STU-2024-0001\nSTU-2024-0002\nSTU-2024-0003"}
              rows={7}
              className="w-full bg-black/30 border border-white/20 rounded-2xl p-3.5 text-xs font-mono text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/40 focus:ring-1 focus:ring-emerald-400/40 focus:outline-none transition-all resize-y"
            />

            <div className="rounded-2xl p-3.5 bg-white/[0.04] border border-white/10 text-xs text-white/60 space-y-1">
              <p className="font-medium text-white/80">Batch Processing Instructions</p>
              <p className="text-[11px] leading-relaxed text-white/50">
                Enter or paste institutional Trainee IDs above. The system will compile each individual record and prepare a downloadable ZIP archive containing all rendered PDF slips.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white/80 bg-white/10 hover:bg-white/15 border border-white/15 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={!template || enteredIdsCount === 0}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-950/40 border border-emerald-400/30 transition-all flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Generate PDFs ({enteredIdsCount})
              </button>
            </div>
          </div>
        )}

        {/* Phase: generating */}
        {phase === 'generating' && (
          <div className="space-y-5 py-4">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-white/90 font-medium">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Processing batch queue...</span>
              </div>
              <span className="text-emerald-400 font-mono font-bold">{progressPercent}%</span>
            </div>

            {/* Progress bar container */}
            <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden border border-white/10 p-[1px]">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-white/60">
              <span>
                Completed: {progress.completed} of {progress.total}
              </span>
              {progress.currentStudentId && (
                <span className="font-mono text-white/80">
                  Current: {progress.currentStudentId}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Phase: done */}
        {phase === 'done' && (
          <div className="space-y-4">
            {/* Status card */}
            <div className="rounded-2xl p-4 bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-emerald-300">Batch Processing Completed</p>
                <p className="text-xs text-white/70 mt-1">
                  Successfully rendered {successCount} document{successCount === 1 ? '' : 's'}
                  {failedCount > 0 ? `, with ${failedCount} failure(s)` : ''}.
                </p>
              </div>
            </div>

            {/* Failed items notice if any */}
            {failedCount > 0 && (
              <div className="rounded-2xl p-4 bg-red-500/10 border border-red-500/25 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-red-300">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>Failed Trainee Records ({failedCount})</span>
                </div>
                <div className="max-h-28 overflow-y-auto no-scrollbar space-y-1.5 text-xs text-red-200/80 font-mono">
                  {results
                    .filter((r) => !r.success)
                    .map((r) => (
                      <div key={r.studentId} className="flex justify-between border-b border-red-500/10 pb-1">
                        <span>{r.studentId}</span>
                        <span className="text-red-300/70 truncate ml-2">{r.error}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white/80 bg-white/10 hover:bg-white/15 border border-white/15 transition-all"
              >
                Close
              </button>
              {successCount > 0 && (
                <button
                  type="button"
                  onClick={() => void handleDownloadAll()}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-950/40 border border-emerald-400/30 transition-all flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download ZIP Archive ({successCount})
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </NativeModal>
  );
}

export default BulkGenerationDialog;
