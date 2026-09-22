import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  ShieldCheck,
  Award,
  Utensils,
  BookOpen,
  Calendar,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import type { StudentServiceCard, CardType } from '../types';

interface StudentCardBadgeProps {
  card: StudentServiceCard;
  schoolName?: string;
  schoolLogo?: string;
  isPrintMode?: boolean;
}

const TYPE_CONFIG: Record<
  CardType,
  {
    label: string;
    sublabel: string;
    color: string;
    border: string;
    bgGrad: string;
    badgeBg: string;
    icon: React.ReactNode;
  }
> = {
  entrance: {
    label: 'SCHOOL ENTRANCE PASS',
    sublabel: 'Campus Gate & Perimeter Access',
    color: '#059669',
    border: '#10b981',
    bgGrad: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)',
    badgeBg: 'rgba(16, 185, 129, 0.2)',
    icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
  },
  examination: {
    label: 'EXAMINATION ACCESS CARD',
    sublabel: 'Official Exam Room Admission',
    color: '#6366f1',
    border: '#818cf8',
    bgGrad: 'linear-gradient(135deg, #312e81 0%, #1e1b4b 100%)',
    badgeBg: 'rgba(99, 102, 241, 0.25)',
    icon: <Award className="w-4 h-4 text-indigo-300" />,
  },
  meal: {
    label: 'STUDENT MEAL CARD',
    sublabel: 'Dining Hall & Canteen Access',
    color: '#d97706',
    border: '#f59e0b',
    bgGrad: 'linear-gradient(135deg, #78350f 0%, #451a03 100%)',
    badgeBg: 'rgba(245, 158, 11, 0.25)',
    icon: <Utensils className="w-4 h-4 text-amber-300" />,
  },
  library: {
    label: 'LIBRARY PASS',
    sublabel: 'Study Room & Borrowing Access',
    color: '#0284c7',
    border: '#38bdf8',
    bgGrad: 'linear-gradient(135deg, #0c4a6e 0%, #082f49 100%)',
    badgeBg: 'rgba(56, 189, 248, 0.25)',
    icon: <BookOpen className="w-4 h-4 text-sky-300" />,
  },
  general: {
    label: 'STUDENT SERVICE PASS',
    sublabel: 'Campus Facilities Access',
    color: '#4f46e5',
    border: '#6366f1',
    bgGrad: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
    badgeBg: 'rgba(99, 102, 241, 0.2)',
    icon: <ShieldCheck className="w-4 h-4 text-violet-300" />,
  },
};

export const StudentCardBadge: React.FC<StudentCardBadgeProps> = ({
  card,
  schoolName = 'Pweza High School',
  schoolLogo,
  isPrintMode = false,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const cfg = TYPE_CONFIG[card.card_type] || TYPE_CONFIG.general;

  useEffect(() => {
    let isMounted = true;
    const qrText = card.qr_payload || card.card_number;

    QRCode.toDataURL(qrText, {
      width: 140,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url: string) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err: unknown) => {
        console.error('Failed to generate QR code:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [card.qr_payload, card.card_number]);

  const studentName = card.student?.name || 'Student Name';
  const admNo = card.student?.admission_number || 'N/A';
  const className = card.student?.current_class || 'Class';
  const stream = card.student?.stream ? ` • ${card.student.stream}` : '';
  const photoUrl = card.student?.photo_url;

  const isExpired = new Date(card.expiry_date) < new Date();
  const expiryFormatted = new Date(card.expiry_date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const expiryTimeFormatted = new Date(card.expiry_date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className="student-card-badge"
      style={{
        width: '350px',
        height: '220px',
        borderRadius: '12px',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
        background: '#ffffff',
        border: `2px solid ${cfg.border}`,
        boxShadow: isPrintMode ? 'none' : '0 10px 25px -5px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        color: '#0f172a',
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
      }}
    >
      {/* Top Header Banner */}
      <div
        style={{
          background: cfg.color,
          color: '#ffffff',
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `2px solid ${cfg.border}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          {schoolLogo ? (
            <img
              src={schoolLogo}
              alt="Logo"
              style={{ width: 20, height: 20, objectFit: 'contain', borderRadius: 4 }}
            />
          ) : (
            <div
              style={{
                width: 20,
                height: 20,
                background: 'rgba(255,255,255,0.2)',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 800,
              }}
            >
              P
            </div>
          )}
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              letterSpacing: 0.3,
            }}
          >
            {schoolName}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {cfg.icon}
          <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Main Body */}
      <div
        style={{
          flex: 1,
          padding: '10px 12px 6px',
          display: 'flex',
          gap: 10,
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          position: 'relative',
        }}
      >
        {/* Student Photo */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 72,
              height: 82,
              borderRadius: 6,
              overflow: 'hidden',
              border: `2px solid ${cfg.border}`,
              background: '#e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
            }}
          >
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={studentName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(135deg, #0284c7, #6366f1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: 22,
                  fontWeight: 700,
                }}
              >
                {studentName.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: 9,
              fontWeight: 700,
              color: '#334155',
            }}
          >
            {admNo}
          </span>
        </div>

        {/* Student Info Details */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <h3
            style={{
              margin: '0 0 2px',
              fontSize: 13,
              fontWeight: 800,
              color: '#0f172a',
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {studentName}
          </h3>

          <div
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              color: '#475569',
              marginBottom: 4,
            }}
          >
            {className}
            {stream}
          </div>

          {/* Fee / Clearance Pill */}
          <div style={{ marginTop: 'auto', marginBottom: 2 }}>
            {card.card_type === 'entrance' ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontSize: 9,
                  fontWeight: 700,
                  background: card.fee_percentage_at_issuance >= 100 ? '#dcfce7' : '#fef3c7',
                  color: card.fee_percentage_at_issuance >= 100 ? '#166534' : '#92400e',
                  border: `1px solid ${card.fee_percentage_at_issuance >= 100 ? '#86efac' : '#fde68a'}`,
                }}
              >
                <CheckCircle className="w-3 h-3" />
                <span>Fees Paid: {card.fee_percentage_at_issuance}% (≥{card.min_fee_percent_required}% Threshold)</span>
              </div>
            ) : card.card_type === 'examination' ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontSize: 9,
                  fontWeight: 700,
                  background: '#e0e7ff',
                  color: '#3730a3',
                  border: '1px solid #c7d2fe',
                }}
              >
                <Award className="w-3 h-3" />
                <span>Admit to Exam Hall</span>
              </div>
            ) : (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontSize: 9,
                  fontWeight: 700,
                  background: '#fef3c7',
                  color: '#92400e',
                  border: '1px solid #fde68a',
                }}
              >
                <Utensils className="w-3 h-3" />
                <span>Dining Hall Authorized</span>
              </div>
            )}
          </div>
        </div>

        {/* QR Code and Serial */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              padding: 2,
              background: '#ffffff',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR Code"
                style={{ width: 72, height: 72, display: 'block' }}
              />
            ) : (
              <div style={{ width: 72, height: 72, background: '#f1f5f9' }} />
            )}
          </div>
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: 9,
              fontWeight: 800,
              color: cfg.color,
              marginTop: 2,
            }}
          >
            {card.card_number}
          </span>
        </div>
      </div>

      {/* Expiry & Validity Footer Bar */}
      <div
        style={{
          background: isExpired ? '#fef2f2' : '#f1f5f9',
          borderTop: `1px solid ${isExpired ? '#fecaca' : '#e2e8f0'}`,
          padding: '4px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 9.5,
          color: isExpired ? '#b91c1c' : '#334155',
          fontWeight: 600,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Calendar className="w-3 h-3" />
          <span>Issue: {new Date(card.issue_date).toLocaleDateString()}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {isExpired ? (
            <>
              <AlertCircle className="w-3 h-3 text-red-600" />
              <span style={{ fontWeight: 800, color: '#dc2626' }}>
                EXPIRED: {expiryFormatted}
              </span>
            </>
          ) : (
            <>
              <span style={{ color: '#64748b' }}>Valid Until:</span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>
                {expiryFormatted}, {expiryTimeFormatted}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * 8-Up Printable Sheet Component for Batch Printing
 */
interface BatchPrintSheetProps {
  cards: StudentServiceCard[];
  schoolName?: string;
  schoolLogo?: string;
}

export const BatchPrintSheet: React.FC<BatchPrintSheetProps> = ({
  cards,
  schoolName,
  schoolLogo,
}) => {
  return (
    <div
      className="pweza-batch-card-print"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 350px)',
        gap: '16px',
        justifyContent: 'center',
        padding: '20px',
        background: '#ffffff',
      }}
    >
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .pweza-batch-card-print, .pweza-batch-card-print * {
            visibility: visible;
          }
          .pweza-batch-card-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 10mm;
            display: grid !important;
            grid-template-columns: repeat(2, 86mm) !important;
            grid-gap: 6mm !important;
            background: #ffffff !important;
          }
          .student-card-badge {
            width: 86mm !important;
            height: 54mm !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
      {cards.map((card) => (
        <StudentCardBadge
          key={card.id || card.card_number}
          card={card}
          schoolName={schoolName}
          schoolLogo={schoolLogo}
          isPrintMode={true}
        />
      ))}
    </div>
  );
};
