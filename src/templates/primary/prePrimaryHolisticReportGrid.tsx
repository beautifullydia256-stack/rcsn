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

const N_COLS = 3;
const ROW_HEIGHT_PX = 130;
const ROW_HEIGHT_COMPACT_PX = 120;
const GRID_GAP_PX = 10;

const LABEL_TEXT_SHADOW =
  '0 0 4px #fff, 0 0 10px #fff, 0 1px 2px rgba(255,255,255,0.95), 0 0 1px #fff';

type Props = {
  holisticStrands: HolisticStrandForReport[];
  results: Array<{ subject?: string; nursery_skill_performance?: unknown }> | undefined;
  ratingLevels: PrePrimaryRatingLevelRow[] | null;
  fontFamily: string;
  observationItemsByKey?: Record<string, NurseryDetailedObservationRow> | null;
  teacherSkillRemarksByStrandSkill?: Record<string, Partial<Record<PrePrimaryHolisticGradeEnum, string>>> | null;
  /** PDF / print: inlined raster data URLs per skill (object present even if empty). */
  prePrimarySkillImageDataUrlsByKey?: Record<string, string> | null;
  /** Slightly shorter fixed rows for single-page print (e.g. Heritage PDF). */
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

  const isPdfContext = prePrimarySkillImageDataUrlsByKey != null;
  const rowHeight = pdfCompact ? ROW_HEIGHT_COMPACT_PX : ROW_HEIGHT_PX;
  const titleFontPx = isPdfContext ? 11 : 12;
  const indicatorSize = pdfCompact ? 13 : 15;

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${N_COLS}, minmax(0, 1fr))`,
    gridAutoRows: `${rowHeight}px`,
    gap: `${GRID_GAP_PX}px`,
    width: '100%',
    backgroundColor: 'transparent',
    WebkitPrintColorAdjust: 'exact',
    printColorAdjust: 'exact',
  };

  return (
    <div style={gridStyle}>
      {cells.map(({ strandSubject, skill, isFirstInStrand }) => {
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
        const remark = teacherConfigured ?? catalogueComment ?? codeFallback;
        const fillColor = gradeEnum
          ? prePrimaryGradeEnumToColorHex(gradeEnum, ratingLevels) ?? '#e2e8f0'
          : null;
        const subtitle = strandSubtitleFromSubject(strandSubject);

        const titleLines: string[] = [];
        if (isFirstInStrand) titleLines.push(strandSubject);
        titleLines.push(skill.label);
        if (subtitle && !isFirstInStrand) titleLines.push(`(${subtitle})`);
        const titleText = titleLines.join(' · ');
        /** Shown beside the indicator circle (not in the title block) so long titles do not hide remarks. */
        const labelBesideCircle = remark;

        const tooltip = [ratingLabel, remark].filter(Boolean).join(' — ') || undefined;

        return (
          <div
            key={`${strandSubject}-${skill.key}`}
            title={tooltip}
            style={{
              minWidth: 0,
              height: '100%',
              minHeight: 0,
              maxHeight: `${rowHeight}px`,
              boxSizing: 'border-box',
              padding: '5px 6px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'center',
              overflow: 'hidden',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid rgba(148,163,184,0.5)',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            }}
          >
            <div
              style={{
                flexShrink: 0,
                width: '100%',
                fontFamily,
                fontSize: `${titleFontPx}px`,
                fontWeight: 800,
                lineHeight: 1.15,
                textAlign: 'center',
                color: '#020617',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                wordBreak: 'break-word',
                textOverflow: 'ellipsis',
                WebkitFontSmoothing: 'antialiased',
                textShadow: LABEL_TEXT_SHADOW,
              }}
            >
              {titleText}
            </div>

            <div
              style={{
                flex: '1 1 0',
                minHeight: 0,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <PrePrimarySkillIllustration
                skillKey={skill.key}
                rasterOnly
                checklistLayout
                pdfEmbedSrc={
                  prePrimarySkillImageDataUrlsByKey != null
                    ? (prePrimarySkillImageDataUrlsByKey[skill.key] ?? '')
                    : undefined
                }
              />
            </div>

            <div
              style={{
                flexShrink: 0,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: pdfCompact ? '6px' : '8px',
                minHeight: 0,
                marginTop: '2px',
                paddingLeft: '1px',
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  width: `${indicatorSize}px`,
                  height: `${indicatorSize}px`,
                  borderRadius: '50%',
                  border: '2px solid #0f172a',
                  backgroundColor: fillColor || '#f1f5f9',
                  flexShrink: 0,
                  boxShadow: fillColor
                    ? `0 0 0 1px rgba(15,23,42,0.12), 0 0 4px #fff`
                    : '0 0 4px #fff',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                }}
              />
              <span
                style={{
                  fontFamily,
                  fontSize: pdfCompact ? '7.2pt' : '7.8pt',
                  fontWeight: 700,
                  color: labelBesideCircle ? '#020617' : '#94a3b8',
                  lineHeight: 1.15,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: pdfCompact ? 3 : 4,
                  WebkitBoxOrient: 'vertical',
                  wordBreak: 'break-word',
                  minWidth: 0,
                  flex: '1 1 0',
                  textAlign: 'left',
                }}
              >
                {labelBesideCircle || '—'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
