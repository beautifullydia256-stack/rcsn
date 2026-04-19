import React, { useMemo } from 'react';
import type { PrePrimaryRatingLevelRow } from '@/lib/prePrimaryHolisticDb';
import {
  parsePrePrimaryGradeFromPerformanceJson,
  prePrimaryGradeEnumToColorHex,
  prePrimaryGradeEnumToDisplayLabel,
} from './prePrimaryHolisticRatings';
import { PrePrimarySkillIllustration } from './prePrimarySkillIllustrations';

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
};

export function PrePrimaryHolisticColourGrid({ holisticStrands, results, ratingLevels, fontFamily }: Props) {
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
        const resultRow = results?.find((r) => (r.subject || '').trim() === strandSubject.trim());
        const gradeEnum = parsePrePrimaryGradeFromPerformanceJson(
          resultRow?.nursery_skill_performance,
          skill.key,
          ratingLevels
        );
        const label = gradeEnum ? prePrimaryGradeEnumToDisplayLabel(gradeEnum, ratingLevels) : null;
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
              padding: '8px 6px 6px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
              minHeight: isFirstInStrand ? '182px' : '168px',
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
                  fontSize: '7.4pt',
                  fontWeight: 700,
                  textAlign: 'center',
                  color: '#0f172a',
                  lineHeight: 1.2,
                  marginBottom: '4px',
                }}
              >
                {strandSubject}
              </div>
            ) : null}
            <div
              style={{
                fontFamily,
                fontSize: '7.6pt',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                lineHeight: 1.15,
                textAlign: 'center',
                color: '#0f172a',
              }}
            >
              {skill.label}
            </div>
            {showSubtitleLine ? (
              <div
                style={{
                  fontFamily,
                  fontSize: '6.8pt',
                  fontStyle: 'italic',
                  fontWeight: 600,
                  textAlign: 'center',
                  marginTop: '3px',
                  color: '#475569',
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
                minHeight: '96px',
                marginTop: '4px',
              }}
            >
              <PrePrimarySkillIllustration skillKey={skill.key} size={92} />
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
                title={label || 'Not recorded'}
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
                  fontSize: '7.2pt',
                  fontWeight: 600,
                  color: label ? '#0f172a' : '#94a3b8',
                  lineHeight: 1.1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
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
