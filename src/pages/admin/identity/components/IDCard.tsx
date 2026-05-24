import { useEffect, useRef } from 'react';

export interface IDCardStudent {
  student_id: string;
  name?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  current_class?: string | null;
  admission_number?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  blood_group?: string | null;
  medical_condition?: string | null;
  address?: string | null;
  photoUrl?: string | null;
}

export interface IDCardSchool {
  name?: string | null;
  logo_url?: string | null;
  address?: string | null;
  location?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  motto?: string | null;
  pobox?: string | null;
}

interface IDCardProps {
  student: IDCardStudent;
  school: IDCardSchool;
  face?: 'front' | 'back';
  academicYear?: string;
}

// CR80 card at 96 dpi → ~338 × 213px; use 340×214 for screen
export const CARD_W = 340;
export const CARD_H = 214;

const NAVY = '#0f2d5c';
const GOLD = '#e8a020';
const WHITE = '#ffffff';
const LIGHT_BG = '#eef3fb';
const BODY_BG = '#f7faff';
const STRIPE_BLUE = '#1a4a8a';

function resolveFullName(s: IDCardStudent): string {
  const parts = [s.first_name, s.middle_name, s.last_name]
    .filter((x) => x != null && String(x).trim())
    .map((x) => String(x).trim());
  return parts.length ? parts.join(' ') : (s.name || '—').trim();
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function fmtDob(d: string | null | undefined): string {
  if (!d) return '—';
  const x = new Date(d);
  return Number.isNaN(x.getTime())
    ? '—'
    : x.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function currentAcademicYear(): string {
  const y = new Date().getFullYear();
  const m = new Date().getMonth(); // 0-based
  return m >= 1 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

// ─── FRONT ───────────────────────────────────────────────────────────────────

export function IDCardFront({ student, school, academicYear }: IDCardProps) {
  const barcodeRef = useRef<HTMLDivElement>(null);
  const cardId = student.admission_number || student.student_id;
  const fullName = resolveFullName(student);
  const year = academicYear || currentAcademicYear();
  const schoolName = (school.name || 'SCHOOL NAME').toUpperCase();
  const address = [school.location || school.address, school.pobox && `P.O.Box ${school.pobox}`]
    .filter(Boolean)
    .join('  ·  ');

  useEffect(() => {
    const el = barcodeRef.current;
    if (!el || !cardId) return;
    import('jsbarcode')
      .then(({ default: JsBarcode }) => {
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, cardId, {
          format: 'CODE128',
          width: 1.4,
          height: 28,
          displayValue: false,
          margin: 0,
          background: 'transparent',
        });
        el.innerHTML = '';
        el.appendChild(canvas);
      })
      .catch(() => {
        if (el) el.innerHTML = `<span style="font-family:monospace;font-size:9px;letter-spacing:0.1em">${cardId}</span>`;
      });
  }, [cardId]);

  return (
    <div
      style={{
        width: CARD_W,
        height: CARD_H,
        borderRadius: 10,
        overflow: 'hidden',
        fontFamily: "'Geist','Inter','Segoe UI',system-ui,sans-serif",
        position: 'relative',
        background: WHITE,
        boxShadow: '0 4px 20px rgba(15,45,92,0.18)',
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          background: `linear-gradient(135deg, ${NAVY} 0%, ${STRIPE_BLUE} 100%)`,
          height: 60,
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          gap: 10,
          position: 'relative',
        }}
      >
        {/* Gold accent stripe */}
        <div style={{ position: 'absolute', top: 0, right: 0, width: 6, height: 60, background: GOLD }} />

        {/* School logo */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: `2px solid ${GOLD}`,
            overflow: 'hidden',
            background: WHITE,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {school.logo_url ? (
            <img src={school.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} crossOrigin="anonymous" />
          ) : (
            <div style={{ width: '100%', height: '100%', background: STRIPE_BLUE }} />
          )}
        </div>

        {/* School name + ID card label */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: WHITE, letterSpacing: '0.05em', lineHeight: 1.2, textTransform: 'uppercase' }}>
            {schoolName}
          </div>
          {address && (
            <div style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.7)', marginTop: 2, letterSpacing: '0.02em' }}>
              {address}
            </div>
          )}
          <div
            style={{
              marginTop: 4,
              display: 'inline-block',
              background: GOLD,
              color: NAVY,
              fontSize: 7,
              fontWeight: 800,
              letterSpacing: '0.12em',
              padding: '1px 6px',
              borderRadius: 3,
              textTransform: 'uppercase',
            }}
          >
            Student Identity Card
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', padding: '10px 12px 0', gap: 10, alignItems: 'flex-start' }}>
        {/* Photo */}
        <div
          style={{
            width: 70,
            height: 84,
            borderRadius: 6,
            overflow: 'hidden',
            flexShrink: 0,
            border: `2px solid ${GOLD}`,
            background: LIGHT_BG,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {student.photoUrl ? (
            <img src={student.photoUrl} alt={fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                background: `linear-gradient(145deg, ${NAVY} 0%, ${STRIPE_BLUE} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: WHITE,
                fontSize: 26,
                fontWeight: 800,
              }}
            >
              {initials(fullName)}
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: NAVY, lineHeight: 1.15, letterSpacing: '-0.01em' }}>
            {fullName}
          </div>
          <div style={{ fontSize: 8, fontWeight: 600, color: GOLD, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>
            Student
          </div>

          <div style={{ marginTop: 7, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px' }}>
            {[
              ['CLASS', student.current_class],
              ['ADM NO.', cardId],
              ['D.O.B', fmtDob(student.date_of_birth)],
              ['YEAR', year],
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: 6.5, fontWeight: 700, color: '#8a9bb5', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
                <div style={{ fontSize: 8.5, fontWeight: 700, color: NAVY, letterSpacing: '0.01em', marginTop: 1 }}>{value || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer with barcode */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 42,
          background: BODY_BG,
          borderTop: `1px solid rgba(15,45,92,0.12)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          padding: '0 12px',
        }}
      >
        <div ref={barcodeRef} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 28 }} />
        <div style={{ fontSize: 7.5, fontFamily: 'monospace', fontWeight: 700, color: NAVY, letterSpacing: '0.12em' }}>
          {cardId}
        </div>
      </div>
    </div>
  );
}

// ─── BACK ────────────────────────────────────────────────────────────────────

export function IDCardBack({ student, school }: IDCardProps) {
  const cardId = student.admission_number || student.student_id;
  const fullName = resolveFullName(student);
  const schoolName = (school.name || 'School Name').toUpperCase();
  const returnAddress = [school.address || school.location, school.contact_phone].filter(Boolean).join('  ·  ');

  return (
    <div
      style={{
        width: CARD_W,
        height: CARD_H,
        borderRadius: 10,
        overflow: 'hidden',
        fontFamily: "'Geist','Inter','Segoe UI',system-ui,sans-serif",
        position: 'relative',
        background: LIGHT_BG,
        boxShadow: '0 4px 20px rgba(15,45,92,0.18)',
        flexShrink: 0,
      }}
    >
      {/* Top strip */}
      <div
        style={{
          background: `linear-gradient(135deg, ${NAVY} 0%, ${STRIPE_BLUE} 100%)`,
          height: 38,
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          gap: 8,
          position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', top: 0, right: 0, width: 6, height: 38, background: GOLD }} />
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            border: `1.5px solid ${GOLD}`,
            overflow: 'hidden',
            background: WHITE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {school.logo_url ? (
            <img src={school.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} crossOrigin="anonymous" />
          ) : (
            <div style={{ width: '100%', height: '100%', background: STRIPE_BLUE }} />
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: WHITE, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{schoolName}</div>
          <div style={{ fontSize: 7, color: GOLD, fontWeight: 600 }}>Student ID Back</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 6.5, color: 'rgba(255,255,255,0.6)' }}>HOLDER</div>
          <div style={{ fontSize: 8, fontWeight: 700, color: WHITE }}>{fullName.split(' ')[0]}</div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '10px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {/* Emergency contact */}
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={{ fontSize: 7, fontWeight: 700, color: '#8a9bb5', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>
            Emergency Contact
          </div>
          <div style={{ fontSize: 9, fontWeight: 700, color: NAVY }}>{student.guardian_name || '—'}</div>
          <div style={{ fontSize: 8, color: '#4a6080', marginTop: 1 }}>{student.guardian_phone || '—'}</div>
        </div>

        {/* Blood group */}
        <div>
          <div style={{ fontSize: 7, fontWeight: 700, color: '#8a9bb5', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
            Blood Group
          </div>
          <div
            style={{
              display: 'inline-block',
              background: student.blood_group ? '#fee2e2' : LIGHT_BG,
              color: student.blood_group ? '#b91c1c' : '#94a3b8',
              fontSize: 10,
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 4,
              letterSpacing: '0.05em',
            }}
          >
            {student.blood_group || 'UNKNOWN'}
          </div>
        </div>

        {/* Medical */}
        <div>
          <div style={{ fontSize: 7, fontWeight: 700, color: '#8a9bb5', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
            Medical Notes
          </div>
          <div style={{ fontSize: 8, color: '#4a6080' }}>{student.medical_condition || 'None'}</div>
        </div>

        {/* Address */}
        {(student.address || school.address) && (
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 7, fontWeight: 700, color: '#8a9bb5', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
              Address
            </div>
            <div style={{ fontSize: 8, color: '#4a6080' }}>{student.address || school.address}</div>
          </div>
        )}
      </div>

      {/* Return bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: `linear-gradient(135deg, ${NAVY} 0%, ${STRIPE_BLUE} 100%)`,
          padding: '5px 12px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 7, color: GOLD, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          If found, please return to:
        </div>
        <div style={{ fontSize: 7.5, color: WHITE, marginTop: 1 }}>
          {returnAddress || schoolName}
        </div>
        <div style={{ fontSize: 6.5, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', marginTop: 2, letterSpacing: '0.1em' }}>
          {cardId}
        </div>
      </div>
    </div>
  );
}

// ─── Default export: both faces side by side ─────────────────────────────────

export default function IDCard({ student, school }: { student: IDCardStudent; school: IDCardSchool }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, textAlign: 'center' }}>Front</div>
        <IDCardFront student={student} school={school} />
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, textAlign: 'center' }}>Back</div>
        <IDCardBack student={student} school={school} />
      </div>
    </div>
  );
}
