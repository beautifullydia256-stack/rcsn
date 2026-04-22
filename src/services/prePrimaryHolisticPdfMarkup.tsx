/**
 * Server- and client-safe static HTML for pre-primary holistic checklist (matches preview `PrePrimaryHolisticColourGrid`).
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PrePrimaryHolisticColourGrid } from '../templates/primary/prePrimaryHolisticReportGrid';
import { runtimeStrandsToHolisticStrands } from '../lib/prePrimaryHolisticDb';
import type { PrePrimaryHolisticRuntimeConfig } from '../lib/prePrimaryHolisticDb';
import {
  FALLBACK_PRE_PRIMARY_HOLISTIC_RATINGS,
  FALLBACK_PRE_PRIMARY_HOLISTIC_STRANDS,
  type PrePrimaryHolisticGradeEnum,
} from '../templates/primary/prePrimaryHolisticRatings';
import type { NurseryDetailedObservationRow } from '../templates/primary/prePrimaryDetailedCommentMapping';
import { buildPrePrimarySkillImageDataUrlMap } from '../lib/prePrimarySkillArtForPdf';

const KIDS_FONT = "'Baloo 2', 'Comic Sans MS', 'Comic Neue', 'Poppins', 'sans-serif'";

export type PrePrimaryPdfOverlay = {
  prePrimaryHolisticRuntimeConfig?: PrePrimaryHolisticRuntimeConfig | null;
  prePrimaryReportMode?: 'colour' | 'detailed';
  teacherSkillRemarksByStrandSkill?: Record<string, Partial<Record<PrePrimaryHolisticGradeEnum, string>>> | null;
  detailedObservationItemsByKey?: Record<string, NurseryDetailedObservationRow>;
  /** Inlined skill art for PDF (filled by `injectPrePrimarySkillImageDataUrlsForPdf` before static HTML). */
  prePrimarySkillImageDataUrlsByKey?: Record<string, string>;
  /** Tighter fixed row height on holistic grid (print / legacy plain A4). */
  pdfCompactHolisticGrid?: boolean;
};

/**
 * Fetches raster files from `public/pre-primary-skill-art/` and fills `prePrimarySkillImageDataUrlsByKey`
 * on `reportData` so PDF static HTML matches preview images.
 */
export async function injectPrePrimarySkillImageDataUrlsForPdf(
  reportData: PrePrimaryPdfOverlay & { students?: unknown[] }
): Promise<void> {
  const cfg = reportData.prePrimaryHolisticRuntimeConfig ?? null;
  const holisticStrands = cfg
    ? runtimeStrandsToHolisticStrands(cfg.strands)
    : FALLBACK_PRE_PRIMARY_HOLISTIC_STRANDS;
  const keys: string[] = [];
  for (const s of holisticStrands) {
    for (const sk of s.skills) keys.push(sk.key);
  }
  const map = await buildPrePrimarySkillImageDataUrlMap(keys);
  reportData.prePrimarySkillImageDataUrlsByKey = {
    ...(reportData.prePrimarySkillImageDataUrlsByKey ?? {}),
    ...map,
  };
}

/**
 * Returns inner HTML for the developmental checklist + legend (no full document).
 */
export function prePrimaryHolisticChecklistToStaticHtml(
  reportData: PrePrimaryPdfOverlay & { students?: Array<{ results?: unknown[] }> }
): { gridHtml: string; legendHtml: string } {
  const student = reportData.students?.[0];
  const cfg = reportData.prePrimaryHolisticRuntimeConfig ?? null;
  const holisticStrands = cfg
    ? runtimeStrandsToHolisticStrands(cfg.strands)
    : FALLBACK_PRE_PRIMARY_HOLISTIC_STRANDS;
  const ratingLevels = cfg?.ratingLevels ?? null;
  const legendRatings =
    ratingLevels?.length
      ? [...ratingLevels]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((r) => ({ label: r.display_label, color: r.color_hex }))
      : FALLBACK_PRE_PRIMARY_HOLISTIC_RATINGS.map((r) => ({ label: r.label as string, color: r.color }));

  const compact = reportData.pdfCompactHolisticGrid !== false;

  const gridHtml = renderToStaticMarkup(
    <PrePrimaryHolisticColourGrid
      holisticStrands={holisticStrands}
      results={student?.results as { subject?: string; nursery_skill_performance?: unknown }[] | undefined}
      ratingLevels={ratingLevels}
      fontFamily={KIDS_FONT}
      observationItemsByKey={reportData.detailedObservationItemsByKey ?? null}
      teacherSkillRemarksByStrandSkill={reportData.teacherSkillRemarksByStrandSkill ?? null}
      prePrimarySkillImageDataUrlsByKey={reportData.prePrimarySkillImageDataUrlsByKey ?? {}}
      pdfCompact={compact}
    />
  );

  const legendHtml = renderToStaticMarkup(
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: compact ? '6px 12px' : '18px',
        alignItems: 'center',
        marginTop: compact ? '8px' : '16px',
        fontSize: compact ? '8pt' : '9.6pt',
        background: 'rgba(255,255,255,0.8)',
        borderRadius: compact ? '10px' : '16px',
        padding: compact ? '6px 10px' : '10px 14px',
        border: '2px dashed rgba(30,64,175,0.24)',
        boxShadow: compact ? '0 4px 12px rgba(30,64,175,0.1)' : '0 8px 18px rgba(30,64,175,0.12)',
        fontFamily: KIDS_FONT,
        lineHeight: 1.2,
      }}
    >
      {legendRatings.map(({ label, color }) => (
        <div
          key={label}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: compact ? '6px' : '8px',
            fontWeight: 600,
          }}
        >
          <div
            style={{
              width: compact ? 14 : 18,
              height: compact ? 14 : 18,
              border: compact ? '1.5px solid #0f172a' : '2px solid #0f172a',
              borderRadius: '50%',
              background: color,
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
              flexShrink: 0,
            }}
          />
          <span>{label}</span>
        </div>
      ))}
    </div>
  );

  return { gridHtml, legendHtml };
}
