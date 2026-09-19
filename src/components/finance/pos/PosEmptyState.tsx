import React from 'react';
import { useUIStore } from '../../../store/uiStore';
import { getTokens, cardGrad, SORA } from '../../../styles/posThemeTokens';

export interface PosEmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  accentColor?: 'mint' | 'gold' | 'blue' | 'purple';
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  minHeight?: number | string;
  style?: React.CSSProperties;
}

/**
 * Signature 1:1 POS Empty State Component
 * Ported from UGbased POS (DebtReport, Receipts, Sales empty patterns).
 */
export default function PosEmptyState({
  icon,
  title,
  description,
  accentColor = 'mint',
  action,
  secondaryAction,
  minHeight = 320,
  style,
}: PosEmptyStateProps) {
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const t = getTokens(isDark);

  let bgDim = t.mintDim;
  let borderRing = t.mintRing;
  let iconColor = t.mintInk;

  if (accentColor === 'gold') {
    bgDim = t.goldDim;
    borderRing = 'rgba(245,192,68,0.28)';
    iconColor = t.gold;
  } else if (accentColor === 'blue') {
    bgDim = t.blueDim;
    borderRing = 'rgba(120,170,255,0.28)';
    iconColor = t.blue;
  } else if (accentColor === 'purple') {
    bgDim = 'rgba(139,92,246,0.15)';
    borderRing = 'rgba(139,92,246,0.30)';
    iconColor = '#a78bfa';
  }

  return (
    <div
      style={{
        background: cardGrad(t),
        border: `1px solid ${t.stroke}`,
        borderRadius: 18,
        padding: '48px 24px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        minHeight,
        boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.35)' : '0 4px 20px rgba(0,0,0,0.03)',
        ...style,
      }}
    >
      {/* Signature POS Squircle Badge */}
      <div
        style={{
          width: 78,
          height: 78,
          borderRadius: 24,
          background: bgDim,
          border: `1px solid ${borderRing}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: iconColor,
          marginBottom: 4,
          boxShadow: isDark ? `0 0 24px ${borderRing}` : 'none',
        }}
      >
        {icon}
      </div>

      {/* Sora Headline */}
      <h3
        style={{
          fontFamily: SORA,
          fontSize: 16.5,
          fontWeight: 700,
          margin: 0,
          color: t.textHi,
          letterSpacing: '-0.2px',
        }}
      >
        {title}
      </h3>

      {/* Descriptive Text */}
      <p
        style={{
          fontSize: 13,
          color: t.textLow,
          maxWidth: 440,
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        {description}
      </p>

      {/* Action Buttons */}
      {(action || secondaryAction) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
          {action && (
            <button
              onClick={action.onClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 18px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                fontFamily: SORA,
                cursor: 'pointer',
                border: 'none',
                background: `linear-gradient(135deg, ${t.ctaGradA}, ${t.ctaGradB})`,
                color: t.ctaText,
                boxShadow: '0 4px 14px rgba(61,232,160,0.25)',
                transition: 'all 0.15s ease',
              }}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          )}

          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              style={{
                padding: '9px 16px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                background: t.panel,
                color: t.textHi,
                border: `1px solid ${t.strokeHi}`,
                transition: 'all 0.15s ease',
              }}
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
