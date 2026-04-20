import React, { useMemo } from 'react';
import type { PrePrimaryRatingLevelRow } from '@/lib/prePrimaryHolisticDb';
import {
  parsePrePrimaryGradeFromPerformanceJson,
  prePrimaryGradeEnumToColorHex,
  prePrimaryGradeEnumToDisplayLabel,
  type PrePrimaryHolisticGradeEnum,
} from './prePrimaryHolisticRatings';
import {
  getItemKeyForSkillKey,
  getResponseTextForGrade,
  type NurseryDetailedObservationRow,
} from './prePrimaryDetailedCommentMapping';
import { PrePrimarySkillIllustration } from './prePrimarySkillIllustrations';
import {
  findNurseryResultRowForStrand,
  lookupPrePrimaryTeacherRemarkLine,
} from './prePrimaryHolisticRemarkLookup';
import { defaultTeacherRemarkForSkill } from './prePrimarySkillRemarkDefaults';

export type HolisticStrandForReport = {
  subject: string;
  skills: Array<{ key: string; label: string }>;
};

/** Subtitle under the skill title, e.g. "Social development" from "Relating with others (Social development)". */
export function strandSubtitleFromSubject(subject: string): string | null {
  const m = String(subject || '').match(/\(([^)]+)\)\s*$/);
  return m ? m[1].trim() : null;
}

const CELL_BORDER = '2px solid rgba(148,163,184,0.45)';

type Props = {
  holisticStrands: HolisticStrandForReport[];
  results: Array<{ subject?: string; nursery_skill_performance?: unknown }> | undefined;
  ratingLevels: PrePrimaryRatingLevelRow[] | null;
  /** Match Template2 nursery cards (Baloo / Comic stack). */
  fontFamily: string;
  /** When set, text beside each circle shows catalogue comment for the chosen grade; colour still from grade. */
  observationItemsByKey?: Record<string, NurseryDetailedObservationRow> | null;
  /**
   * Optional: teacher-configured lines from Teacher's Remarks Settings.
   * Key `${strandSubject}::${skillKey}` → grade enum → comment (overrides catalogue when non-empty).
   */
  teacherSkillRemarksByStrandSkill?: Record<string, Partial<Record<PrePrimaryHolisticGradeEnum, string>>> | null;
  /**
   * When set (PDF export), skill cells use inlined raster data URLs only — no SVG.
   * Omit for interactive preview.
   */
  prePrimarySkillImageDataUrlsByKey?: Record<string, string> | null;
  /** Tighter cell geometry for single-page nursery PDF (preview uses default false). */
  pdfCompact?: boolean;
};

export function PrePrimaryHolisticColourGrid({
  holisticStrands,
  results,
  ratingLevels,
  fontFamily,
  observationItemsByKey = null,
  teacherSkillRemarksByStrandSkill = null,
  prePrimarySkillImageDataUrlsByKey = null,
  pdfCompact = false,
}: Props) {
  const cells = useMemo(() => {
    const out: Array<{
      strandSubject: string;
      skill: { key: string; label: string };
      isFirstInStrand: boolean;
    }> = [];
    for (const strand of holisticStrands) {
      strand.skills.forEach((skill, i) => {
        out.push({
          strandSubject: strand.subject,
          skill,
          isFirstInStrand: i === 0,
        });
      });
    }
    return out;
  }, [holisticStrands]);

  const nCols = 3;
  const nRows = Math.max(1, Math.ceil(cells.length / nCols));
  const pad = pdfCompact ? '5px 4px 4px' : '8px 6px 6px';
  const minHFirst = pdfCompact ? '150px' : '196px';
  const minHRest = pdfCompact ? '132px' : '172px';
  const minIllusWrap = pdfCompact ? '72px' : '96px';
  const illusSize = pdfCompact ? 76 : 92;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        backgroundColor: '#ffffff',
        border: CELL_BORDER,
        borderRadius: '12px',
        overflow: 'hidden',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      {cells.map(({ strandSubject, skill, isFirstInStrand }, idx) => {
        const isLastCol = idx % nCols === nCols - 1;
        const isLastRow = idx >= (nRows - 1) * nCols;
        const resultRow = findNurseryResultRowForStrand(results, strandSubject);
        const gradeEnum = parsePrePrimaryGradeFromPerformanceJson(
          resultRow?.nursery_skill_performance,
          skill.key,
          ratingLevels
        );
        const ratingLabel = gradeEnum ? prePrimaryGradeEnumToDisplayLabel(gradeEnum, ratingLevels) : null;
        const teacherConfigured =
          gradeEnum != null
            ? lookupPrePrimaryTeacherRemarkLine(
                teacherSkillRemarksByStrandSkill,
                strandSubject,
                skill.key,
                gradeEnum,
              )
            : null;
        const catalogueComment =
          gradeEnum && observationItemsByKey && Object.keys(observationItemsByKey).length > 0
            ? (() => {
                const itemKey = getItemKeyForSkillKey(skill.key);
                const row = itemKey ? observationItemsByKey[itemKey] : undefined;
                if (!row) return null;
                const t = getResponseTextForGrade(row, gradeEnum);
                return t || null;
              })()
            : null;
        const codeFallback =
          gradeEnum != null ? defaultTeacherRemarkForSkill(skill.key, gradeEnum).trim() || null : null;
        const label = teacherConfigured ?? catalogueComment ?? codeFallback;
        const fillColor = gradeEnum
          ? prePrimaryGradeEnumToColorHex(gradeEnum, ratingLevels) ?? '#e2e8f0'
          : null;
        const subtitle = strandSubtitleFromSubject(strandSubject);
        const showSubtitleLine = Boolean(subtitle) && !isFirstInStrand;

        return (
          <div
            key={`${strandSubject}-${skill.key}`}
            style={{
              borderRight: isLastCol ? 'none' : CELL_BORDER,
              borderBottom: isLastRow ? 'none' : CELL_BORDER,
              padding: pad,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
              minHeight: isFirstInStrand ? minHFirst : minHRest,
              boxSizing: 'border-box',
              backgroundColor: '#ffffff',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            }}
          >
            {isFirstInStrand ? (
              <div
                style={{
                  fontFamily,
                  fontSize: '10pt',
                  fontWeight: 800,
                  textAlign: 'center',
                  color: '#020617',
                  lineHeight: 1.22,
                  marginBottom: '5px',
                  WebkitFontSmoothing: 'antialiased',
                }}
              >
                {strandSubject}
              </div>
            ) : null}
            <div
              style={{
                fontFamily,
                fontSize: '8.8pt',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.035em',
                lineHeight: 1.18,
                textAlign: 'center',
                color: '#020617',
                WebkitFontSmoothing: 'antialiased',
              }}
            >
              {skill.label}
            </div>
            {showSubtitleLine ? (
              <div
                style={{
                  fontFamily,
                  fontSize: '7.5pt',
                  fontStyle: 'italic',
                  fontWeight: 700,
                  textAlign: 'center',
                  marginTop: '3px',
                  color: '#334155',
                  lineHeight: 1.2,
                }}
              >
                ({subtitle})
              </div>
            ) : null}
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: minIllusWrap,
                marginTop: pdfCompact ? '2px' : '4px',
              }}
            >
              <PrePrimarySkillIllustration
                skillKey={skill.key}
                size={illusSize}
                pdfEmbedSrc={
                  prePrimarySkillImageDataUrlsByKey != null
                    ? (prePrimarySkillImageDataUrlsByKey[skill.key] ?? '')
                    : undefined
                }
              />
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '6px',
                paddingLeft: '2px',
              }}
            >
              <div
                title={label ? `${label}${ratingLabel ? ` (${ratingLabel})` : ''}` : 'Not recorded'}
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  border: '2px solid #0f172a',
                  backgroundColor: fillColor || '#f1f5f9',
                  flexShrink: 0,
                  boxShadow: fillColor ? `0 0 0 1px rgba(15,23,42,0.15)` : undefined,
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                }}
              />
              <span
                style={{
                  fontFamily,
                  fontSize: '7.8pt',
                  fontWeight: 700,
                  color: label ? '#020617' : '#94a3b8',
                  lineHeight: 1.15,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: 'vertical',
                  wordBreak: 'break-word',
                }}
              >
                {label || '—'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
