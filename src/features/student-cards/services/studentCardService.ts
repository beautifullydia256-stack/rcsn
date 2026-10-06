import { supabase } from '@/lib/supabase';
import type {
  CardType,
  CardStatus,
  StudentServiceCard,
  StudentEligibilityItem,
  BatchCardIssueParams,
  CardVerificationResult,
  CardScanLog,
} from '../types';

const LOCAL_STORAGE_CARDS_KEY = 'pwezacore_student_service_cards';
const LOCAL_STORAGE_SCANS_KEY = 'pwezacore_student_card_scans';

/**
 * Generates an official, human-readable serial card number.
 * e.g., ENT-2026-0042, EXM-2026-0189, MEL-2026-0512, LIB-2026-0089
 */
export function generateCardNumber(type: CardType, sequence: number, year: number): string {
  const prefixMap: Record<CardType, string> = {
    entrance: 'ENT',
    examination: 'EXM',
    meal: 'MEL',
    library: 'LIB',
    general: 'SVC',
  };
  const prefix = prefixMap[type] || 'CRD';
  const padded = String(sequence).padStart(4, '0');
  return `${prefix}-${year}-${padded}`;
}

/**
 * Local cache helpers for resilient offline/fallback support
 */
function getCachedCards(): StudentServiceCard[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CARDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCachedCards(cards: StudentServiceCard[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_CARDS_KEY, JSON.stringify(cards));
  } catch (err) {
    console.warn('Failed to cache student service cards locally', err);
  }
}

function getCachedScans(): CardScanLog[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SCANS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function appendCachedScan(scan: CardScanLog): void {
  try {
    const list = getCachedScans();
    list.unshift(scan);
    localStorage.setItem(LOCAL_STORAGE_SCANS_KEY, JSON.stringify(list.slice(0, 500)));
  } catch (err) {
    console.warn('Failed to cache scan log', err);
  }
}

/**
 * Fetches students and computes their fee status to determine eligibility for card issuance.
 * Particularly used for entrance cards (e.g. requiring >= 50% fees paid).
 */
export async function fetchEligibleStudentsForCards(
  schoolId: string,
  classFilter?: string,
  minFeePercent: number = 0
): Promise<StudentEligibilityItem[]> {
  try {
    // 1. Fetch active students
    let query = supabase
      .from('students')
      .select('student_id, name, first_name, middle_name, last_name, current_class, stream, admission_number, status, payment_status, expected_fee_amount, enrollment_fee')
      .eq('school_id', schoolId)
      .is('deleted_at', null);

    if (classFilter && classFilter !== 'all') {
      query = query.eq('current_class', classFilter);
    }

    const { data: students, error: studentErr } = await query;
    if (studentErr) throw studentErr;

    if (!students || students.length === 0) return [];

    const studentIds = students.map((s) => s.student_id);

    // 2. Fetch balances from student_balances if available
    const { data: balances } = await supabase
      .from('student_balances')
      .select('student_id, total_fees, total_paid, balance')
      .eq('school_id', schoolId)
      .in('student_id', studentIds);

    // 3. Fetch primary student photos
    const { data: photos } = await supabase
      .from('student_photos')
      .select('student_id, photo_url')
      .eq('school_id', schoolId)
      .eq('is_primary', true)
      .in('student_id', studentIds);

    const balanceMap = new Map<string, { total_fees: number; total_paid: number; balance: number }>();
    (balances || []).forEach((b) => {
      const cur = balanceMap.get(b.student_id) || { total_fees: 0, total_paid: 0, balance: 0 };
      cur.total_fees += Number(b.total_fees || 0);
      cur.total_paid += Number(b.total_paid || 0);
      cur.balance += Number(b.balance || 0);
      balanceMap.set(b.student_id, cur);
    });

    const photoMap = new Map<string, string>();
    (photos || []).forEach((p) => {
      if (p.photo_url) photoMap.set(p.student_id, p.photo_url);
    });

    // 4. Map eligibility
    return students.map((s) => {
      const parts = [s.first_name, s.middle_name, s.last_name].filter(Boolean);
      const studentName = parts.length > 0 ? parts.join(' ') : (s.name || 'Student');

      const bal = balanceMap.get(s.student_id);
      let expected = bal ? bal.total_fees : (Number(s.expected_fee_amount) || Number(s.enrollment_fee) || 0);
      let paid = bal ? bal.total_paid : 0;

      // Handle payment status shortcuts
      if (!bal && s.payment_status?.toLowerCase() === 'full') {
        paid = expected > 0 ? expected : 100;
        expected = expected > 0 ? expected : 100;
      }

      let feePct = 100;
      if (expected > 0) {
        feePct = Math.min(100, Math.max(0, Math.round((paid / expected) * 100)));
      } else if (bal && bal.balance > 0) {
        feePct = 0;
      }

      const isEligible = feePct >= minFeePercent;
      let disqualificationReason: string | undefined;
      if (!isEligible) {
        disqualificationReason = `Only ${feePct}% paid (requires ≥${minFeePercent}%). Outstanding fees.`;
      }

      return {
        student_id: s.student_id,
        name: studentName,
        admission_number: s.admission_number,
        current_class: s.current_class,
        stream: s.stream,
        photo_url: photoMap.get(s.student_id) || null,
        expected_fee: expected,
        total_paid: paid,
        fee_percentage: feePct,
        is_eligible: isEligible,
        disqualification_reason: disqualificationReason,
      };
    });
  } catch (err) {
    console.error('Error fetching eligible students for cards:', err);
    return [];
  }
}

/**
 * Issues service access cards in batch for selected students
 */
export async function issueBatchCards(
  params: BatchCardIssueParams,
  studentItems: StudentEligibilityItem[],
  userId?: string
): Promise<{ success: boolean; createdCards: StudentServiceCard[]; message?: string }> {
  try {
    const year = params.academic_year || new Date().getFullYear();
    const baseOffset = Math.floor(1000 + Math.random() * 8000);

    const cardsToInsert: Array<Omit<StudentServiceCard, 'id'>> = studentItems.map((st, idx) => {
      const serial = generateCardNumber(params.card_type, baseOffset + idx, year);
      const qrPayload = JSON.stringify({
        card_number: serial,
        type: params.card_type,
        student_id: st.student_id,
        school_id: params.school_id,
        valid_until: params.expiry_date,
      });

      return {
        card_number: serial,
        school_id: params.school_id,
        student_id: st.student_id,
        card_type: params.card_type,
        title: params.title,
        academic_year: year,
        academic_term: params.academic_term,
        exam_set_id: params.exam_set_id || null,
        min_fee_percent_required: params.min_fee_percent_required,
        fee_percentage_at_issuance: st.fee_percentage,
        issue_date: new Date().toISOString().slice(0, 10),
        expiry_date: params.expiry_date,
        status: 'active',
        qr_payload: qrPayload,
        issued_by: userId || null,
        notes: params.notes || null,
        student: {
          name: st.name,
          admission_number: st.admission_number,
          current_class: st.current_class,
          stream: st.stream,
          photo_url: st.photo_url,
        },
      };
    });

    // Try Supabase insert
    const { data: inserted, error: insertErr } = await supabase
      .from('student_service_cards')
      .insert(cardsToInsert.map((c) => {
        // Strip joined student property for table insert
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { student, ...row } = c;
        return row;
      }))
      .select('*');

    if (insertErr) {
      console.warn('Supabase insert failed, saving to local cache fallback:', insertErr.message);
      // Fallback to local storage
      const fallbackList: StudentServiceCard[] = cardsToInsert.map((c) => ({
        ...c,
        id: `local-card-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      const existing = getCachedCards();
      saveCachedCards([...fallbackList, ...existing]);
      return { success: true, createdCards: fallbackList };
    }

    // Attach student info to created cards
    const createdWithStudent: StudentServiceCard[] = (inserted || []).map((row) => {
      const match = studentItems.find((s) => s.student_id === row.student_id);
      return {
        ...row,
        student: match ? {
          name: match.name,
          admission_number: match.admission_number,
          current_class: match.current_class,
          stream: match.stream,
          photo_url: match.photo_url,
        } : undefined,
      };
    });

    // Also mirror to cache
    const existing = getCachedCards();
    saveCachedCards([...createdWithStudent, ...existing]);

    return { success: true, createdCards: createdWithStudent };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, createdCards: [], message: msg };
  }
}

let remoteCardsTableAvailable: boolean | null = null;

export async function fetchServiceCards(
  schoolId: string,
  filters: { cardType?: string; status?: string; search?: string } = {}
): Promise<StudentServiceCard[]> {
  try {
    if (remoteCardsTableAvailable === false) {
      let cached = getCachedCards().filter((c) => c.school_id === schoolId);
      if (filters.cardType && filters.cardType !== 'all') {
        cached = cached.filter((c) => c.card_type === filters.cardType);
      }
      if (filters.status && filters.status !== 'all') {
        cached = cached.filter((c) => c.status === filters.status);
      }
      return cached;
    }

    let query = supabase
      .from('student_service_cards')
      .select('*, students(student_id, name, first_name, middle_name, last_name, current_class, stream, admission_number, status, payment_status)')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    if (filters.cardType && filters.cardType !== 'all') {
      query = query.eq('card_type', filters.cardType);
    }
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) {
      const isMissingTable =
        error.code === '42P01' ||
        error.message?.includes('schema cache') ||
        error.message?.includes('does not exist') ||
        (error as { status?: number }).status === 404;

      if (isMissingTable) {
        remoteCardsTableAvailable = false;
      } else {
        console.warn('Error fetching service cards from Supabase, reading cached cards:', error.message);
      }

      let cached = getCachedCards().filter((c) => c.school_id === schoolId);
      if (filters.cardType && filters.cardType !== 'all') {
        cached = cached.filter((c) => c.card_type === filters.cardType);
      }
      if (filters.status && filters.status !== 'all') {
        cached = cached.filter((c) => c.status === filters.status);
      }
      return cached;
    }

    remoteCardsTableAvailable = true;

    // Also fetch photos
    const studentIds = (data || []).map((d) => d.student_id);
    const { data: photos } = await supabase
      .from('student_photos')
      .select('student_id, photo_url')
      .eq('school_id', schoolId)
      .eq('is_primary', true)
      .in('student_id', studentIds);

    const photoMap = new Map<string, string>();
    (photos || []).forEach((p) => {
      if (p.photo_url) photoMap.set(p.student_id, p.photo_url);
    });

    return (data || []).map((row) => {
      const s = row.students;
      let studentName = 'Student';
      if (s) {
        const parts = [s.first_name, s.middle_name, s.last_name].filter(Boolean);
        studentName = parts.length > 0 ? parts.join(' ') : (s.name || 'Student');
      }

      // Check client-side expiry
      let effectiveStatus = row.status as CardStatus;
      if (effectiveStatus === 'active' && new Date(row.expiry_date) < new Date()) {
        effectiveStatus = 'expired';
      }

      return {
        ...row,
        status: effectiveStatus,
        student: s ? {
          name: studentName,
          admission_number: s.admission_number,
          current_class: s.current_class,
          stream: s.stream,
          payment_status: s.payment_status,
          photo_url: photoMap.get(row.student_id) || null,
        } : undefined,
      };
    });
  } catch (err) {
    console.error('fetchServiceCards error:', err);
    return getCachedCards();
  }
}

/**
 * Universal Verification Function:
 * Works with QR Code scanner, camera input, barcode reader, or manual code entry.
 * Checks validity, expiration time, student status, and records a scan event.
 */
export async function verifyCardCode(
  rawInput: string,
  location: string = 'Gatehouse',
  notes?: string
): Promise<CardVerificationResult> {
  const clean = rawInput.trim();
  if (!clean) {
    return {
      found: false,
      valid: false,
      status: 'invalid',
      message: 'Please provide or scan a card serial code or QR code.',
    };
  }

  // 1. Try calling verify_student_service_card RPC
  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('verify_student_service_card', {
      p_code: clean,
      p_location: location,
      p_scanner_notes: notes || null,
    });

    if (!rpcErr && rpcRes && typeof rpcRes === 'object') {
      const res = rpcRes as CardVerificationResult;
      // Record in local cache log as well
      if (res.card) {
        appendCachedScan({
          id: `scan-${Date.now()}`,
          card_id: res.card.id,
          school_id: res.school?.school_id || '',
          location,
          scan_result: res.valid ? 'valid' : (res.status as CardScanLog['scan_result']) || 'invalid',
          notes: res.message,
          scanned_at: new Date().toISOString(),
        });
      }
      return res;
    }
  } catch (err) {
    console.warn('verify_student_service_card RPC error, trying direct query fallback:', err);
  }

  // 2. Direct fallback query if RPC failed
  try {
    let parsedCode = clean;
    if (clean.startsWith('{')) {
      try {
        const parsed = JSON.parse(clean);
        parsedCode = parsed.card_number || clean;
      } catch {
        parsedCode = clean;
      }
    }

    const { data: card, error: cardErr } = await supabase
      .from('student_service_cards')
      .select('*, students(*), schools(*)')
      .or(`card_number.ilike.${parsedCode},qr_payload.eq.${clean}`)
      .maybeSingle();

    if (cardErr || !card) {
      // Check local cache
      const cached = getCachedCards().find(
        (c) => c.card_number.toUpperCase() === parsedCode.toUpperCase() || c.qr_payload === clean
      );
      if (cached) {
        const isExp = new Date(cached.expiry_date) < new Date();
        const effectiveStatus: CardStatus = cached.status === 'revoked' ? 'revoked' : isExp ? 'expired' : 'active';
        return {
          found: true,
          valid: effectiveStatus === 'active',
          status: effectiveStatus,
          message: effectiveStatus === 'active'
            ? 'ACCESS GRANTED: Verified active card (cached).'
            : effectiveStatus === 'expired'
            ? `CARD EXPIRED: Expired on ${new Date(cached.expiry_date).toLocaleString()}.`
            : 'CARD REVOKED: This card was cancelled by administration.',
          card: {
            id: cached.id,
            card_number: cached.card_number,
            card_type: cached.card_type,
            title: cached.title,
            academic_year: cached.academic_year,
            academic_term: cached.academic_term,
            min_fee_percent_required: cached.min_fee_percent_required,
            fee_percentage_at_issuance: cached.fee_percentage_at_issuance,
            issue_date: cached.issue_date,
            expiry_date: cached.expiry_date,
            notes: cached.notes,
          },
          student: cached.student ? {
            student_id: cached.student_id,
            name: cached.student.name,
            admission_number: cached.student.admission_number,
            current_class: cached.student.current_class,
            stream: cached.student.stream,
            photo_url: cached.student.photo_url,
          } : undefined,
          verified_at: new Date().toISOString(),
        };
      }

      return {
        found: false,
        valid: false,
        status: 'invalid',
        message: 'No service card found matching this code. Please verify code or contact administration.',
      };
    }

    const isExpired = new Date(card.expiry_date) < new Date();
    let status: CardStatus = card.status;
    let valid = false;
    let message = '';

    if (card.status === 'revoked') {
      status = 'revoked';
      valid = false;
      message = 'CARD REVOKED: This card was invalidated by administration.';
    } else if (isExpired || card.status === 'expired') {
      status = 'expired';
      valid = false;
      message = `CARD EXPIRED: Expired on ${new Date(card.expiry_date).toLocaleDateString()} at ${new Date(card.expiry_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
    } else {
      status = 'active';
      valid = true;
      message = 'ACCESS GRANTED: Official verified active card.';
    }

    const s = card.students;
    const parts = [s?.first_name, s?.middle_name, s?.last_name].filter(Boolean);
    const studentName = parts.length > 0 ? parts.join(' ') : (s?.name || 'Student');

    return {
      found: true,
      valid,
      status,
      message,
      card: {
        id: card.id,
        card_number: card.card_number,
        card_type: card.card_type,
        title: card.title,
        academic_year: card.academic_year,
        academic_term: card.academic_term,
        min_fee_percent_required: card.min_fee_percent_required,
        fee_percentage_at_issuance: card.fee_percentage_at_issuance,
        issue_date: card.issue_date,
        expiry_date: card.expiry_date,
        notes: card.notes,
      },
      student: s ? {
        student_id: s.student_id,
        name: studentName,
        admission_number: s.admission_number,
        current_class: s.current_class,
        stream: s.stream,
        status: s.status,
        payment_status: s.payment_status,
        guardian_name: s.guardian_name,
        guardian_phone: s.guardian_phone,
      } : undefined,
      school: card.schools ? {
        school_id: card.schools.school_id,
        name: card.schools.name,
        type: card.schools.type,
        badge_url: card.schools.badge_url,
      } : undefined,
      verified_at: new Date().toISOString(),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Verification failed';
    return {
      found: false,
      valid: false,
      status: 'invalid',
      message: `Verification error: ${msg}`,
    };
  }
}

/**
 * Revokes a card
 */
export async function revokeCard(cardId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('student_service_cards')
      .update({ status: 'revoked', updated_at: new Date().toISOString() })
      .eq('id', cardId);

    if (error) {
      console.warn('Supabase revoke failed, updating cache:', error.message);
    }
    const cached = getCachedCards().map((c) => (c.id === cardId ? { ...c, status: 'revoked' as CardStatus } : c));
    saveCachedCards(cached);
    return true;
  } catch (err) {
    console.error('Error revoking card:', err);
    return false;
  }
}

/**
 * Extends card expiry date
 */
export async function extendCardExpiry(cardId: string, newExpiryIso: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('student_service_cards')
      .update({ expiry_date: newExpiryIso, status: 'active', updated_at: new Date().toISOString() })
      .eq('id', cardId);

    if (error) {
      console.warn('Supabase extend expiry failed, updating cache:', error.message);
    }
    const cached = getCachedCards().map((c) =>
      c.id === cardId ? { ...c, expiry_date: newExpiryIso, status: 'active' as CardStatus } : c
    );
    saveCachedCards(cached);
    return true;
  } catch (err) {
    console.error('Error extending card expiry:', err);
    return false;
  }
}
