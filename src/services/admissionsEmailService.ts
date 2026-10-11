/**
 * RCSN Admissions Email Service
 * Handles transactional email dispatch for applicants across the entire lifecycle via Resend.
 */

import { registerApiUrl } from '@/lib/registerApiOrigin';
import type { AdmissionApplicationRecord } from './admissionsService';

export interface EmailDispatchResult {
  success: boolean;
  id?: string;
  error?: string;
  recipientUsed?: string;
  isSandboxFallback?: boolean;
}

const DEFAULT_PORTAL_URL = 'https://www.rcsn.ac.ug';

function getSiteOrigin(): string {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin;
  }
  return import.meta.env.VITE_APP_URL || DEFAULT_PORTAL_URL;
}

const RCSN_BADGE_URL = 'https://www.rcsn.ac.ug/images/rcsn/logo.png';

/**
 * Base email layout wrapper with prestigious RCSN institutional styling.
 */
function wrapInstitutionalEmail(title: string, bodyContent: string): string {
  const origin = getSiteOrigin();
  const trackingUrl = `${origin}/admissions/track`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; }
    table { border-collapse: collapse; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #f1f5f9; padding: 30px 10px; }
    .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #0f2b48 0%, #1e40af 100%); padding: 34px 24px 26px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0 0 6px 0; font-size: 21px; font-weight: 700; letter-spacing: -0.01em; }
    .header p { margin: 0; font-size: 13px; color: #93c5fd; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
    .content { padding: 32px 28px; }
    .badge { display: inline-block; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 20px; }
    .badge-primary { background-color: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
    .badge-success { background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
    .badge-amber { background-color: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
    .h2 { font-size: 19px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; }
    .card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0; }
    .card-title { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
    .card-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; }
    .card-row:last-child { border-bottom: none; }
    .card-label { color: #64748b; font-weight: 500; }
    .card-value { color: #0f172a; font-weight: 600; text-align: right; }
    .btn { display: inline-block; background-color: #1e40af; color: #ffffff !important; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 8px 4px 8px 0; }
    .btn:hover { background-color: #1e3a8a; }
    .btn-secondary { background-color: #0f766e; }
    .btn-secondary:hover { background-color: #115e59; }
    .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 28px; font-size: 12px; color: #64748b; text-align: center; }
    .footer p { margin: 4px 0; }
    .footer a { color: #1e40af; text-decoration: none; font-weight: 500; }
    .checklist { margin: 16px 0; padding-left: 20px; }
    .checklist li { margin-bottom: 8px; font-size: 14px; color: #334155; }
  </style>
</head>
<body>
  <div class="wrapper">
    <table role="presentation" class="main" align="center" width="100%">
      <tr>
        <td class="header" align="center">
          <!-- Real School Badge / Crest Icon -->
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 16px auto;">
            <tr>
              <td align="center" style="background-color: #ffffff; width: 88px; height: 88px; border-radius: 50%; padding: 4px; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25); text-align: center; vertical-align: middle;">
                <img src="${RCSN_BADGE_URL}" alt="RCSN School Badge" width="80" height="88" style="display: block; margin: 0 auto; width: 80px; height: auto; max-height: 88px; border: 0; outline: none; text-decoration: none;" />
              </td>
            </tr>
          </table>
          <h1>Rakai Community School of Nursing</h1>
          <p>Office of the Academic Registrar &amp; Admissions</p>
        </td>
      </tr>
      <tr>
        <td class="content">
          ${bodyContent}
        </td>
      </tr>
      <tr>
        <td class="footer" align="center">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 12px auto;">
            <tr>
              <td align="center">
                <img src="${RCSN_BADGE_URL}" alt="RCSN Crest" width="38" height="42" style="display: block; margin: 0 auto 4px auto; width: 38px; height: auto; border: 0; opacity: 0.95;" />
              </td>
            </tr>
          </table>
          <p><strong>Rakai Community School of Nursing (RCSN)</strong></p>
          <p>P.O. Box 12, Rakai — Uganda | Rakai–Byakabanda Road</p>
          <p>Tel: +256 701 884 192 / +256 772 846 174 | Email: admissions@rcsn.ac.ug</p>
          <p style="margin-top: 12px;">
            <a href="${origin}">School Website</a> &bull;
            <a href="${trackingUrl}">Track Application</a> &bull;
            <a href="${origin}/admissions">Admissions Portal</a>
          </p>
          <p style="color: #94a3b8; font-size: 11px; margin-top: 12px;">
            This is an official automated institutional notification. Please do not reply directly to this email address.
          </p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}

/**
 * Core dispatch function.
 * Sends email via serverless proxy or fallback endpoint.
 */
export async function dispatchAdmissionsEmail(params: {
  to: string;
  subject: string;
  html: string;
  applicantName?: string;
  applicationNumber?: string;
}): Promise<EmailDispatchResult> {
  const { to, subject, html, applicantName, applicationNumber } = params;

  if (!to || !to.includes('@')) {
    console.warn('[AdmissionsEmail] Invalid recipient email address:', to);
    return { success: false, error: 'Invalid applicant email address provided.' };
  }

  try {
    const endpoint = registerApiUrl('/api/admissions/send-email');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        subject,
        html,
        applicantName,
        applicationNumber,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok && data.success) {
      console.log(`[AdmissionsEmail] Successfully sent email to ${to} (ID: ${data.id})`);
      return {
        success: true,
        id: data.id,
        recipientUsed: to,
      };
    }

    // Handle Resend sandbox restriction fallback gracefully:
    if (data.isSandboxFallback || (data.error && data.error.includes('testing emails'))) {
      console.warn('[AdmissionsEmail] Resend Sandbox mode active: Email routed to test account.', data);
      return {
        success: true,
        id: data.id || 'sandbox-test',
        recipientUsed: data.fallbackRecipient || 'beautifullydia256@gmail.com',
        isSandboxFallback: true,
      };
    }

    console.error('[AdmissionsEmail] Dispatch failed with response:', data);
    return {
      success: false,
      error: data.error || `Server returned ${response.status}`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[AdmissionsEmail] Network or server error during dispatch:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * 1. Application Submission Confirmation Email
 */
export async function sendApplicationSubmittedEmail(
  app: AdmissionApplicationRecord
): Promise<EmailDispatchResult> {
  if (!app.email) return { success: false, error: 'Applicant has no email address.' };

  const origin = getSiteOrigin();
  const trackUrl = `${origin}/admissions/track?id=${encodeURIComponent(app.application_number)}`;
  const programNames = app.programs && app.programs.length > 0 ? app.programs.join(', ') : 'Nursing & Midwifery';

  const bodyContent = `
    <span class="badge badge-primary">Application Received</span>
    <h2 class="h2">Thank You for Applying, ${app.first_name || app.full_name}!</h2>
    
    <p>We are delighted to confirm that your application for admission to <strong>Rakai Community School of Nursing</strong> has been successfully received by our Directorate of Academic Registrar.</p>
    
    <div class="card">
      <div class="card-title">Official Application Summary</div>
      <table width="100%">
        <tr>
          <td style="padding: 4px 0; color: #64748b; font-size: 14px;"><strong>Application ID:</strong></td>
          <td style="padding: 4px 0; color: #1e40af; font-size: 15px; font-weight: 700; text-align: right;">${app.application_number}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b; font-size: 14px;"><strong>Applicant Name:</strong></td>
          <td style="padding: 4px 0; color: #0f172a; font-size: 14px; text-align: right;">${app.full_name}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b; font-size: 14px;"><strong>Program(s) Selected:</strong></td>
          <td style="padding: 4px 0; color: #0f172a; font-size: 14px; text-align: right;">${programNames}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b; font-size: 14px;"><strong>Target Intake:</strong></td>
          <td style="padding: 4px 0; color: #0f172a; font-size: 14px; text-align: right;">${app.intake || 'August/September 2026'}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b; font-size: 14px;"><strong>Application Fee:</strong></td>
          <td style="padding: 4px 0; color: #047857; font-size: 14px; font-weight: 600; text-align: right;">UGX ${(app.application_fee || 50000).toLocaleString()} (Verified)</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b; font-size: 14px;"><strong>Status:</strong></td>
          <td style="padding: 4px 0; color: #b45309; font-size: 14px; font-weight: 600; text-align: right;">Pending Document Verification</td>
        </tr>
      </table>
    </div>

    <h3 style="font-size: 16px; margin: 24px 0 8px 0; color: #0f172a;">What Happens Next?</h3>
    <ul class="checklist">
      <li><strong>Document Vetting:</strong> Our admissions board will verify your submitted UNEB index number, academic grades, and attached passlip.</li>
      <li><strong>Interview Shortlisting:</strong> Qualified candidates will receive an official invitation detailing oral and practical interview dates and venue.</li>
      <li><strong>Live Tracking:</strong> You can monitor your application status in real-time anytime through our public tracking portal.</li>
    </ul>

    <div style="margin: 28px 0; text-align: center;">
      <a href="${trackUrl}" class="btn">Track Application Status &rarr;</a>
    </div>

    <p style="font-size: 13px; color: #64748b; margin-top: 20px;">
      <strong>Please Note:</strong> Save your Application ID <strong>${app.application_number}</strong> for all inquiries with our admissions officers.
    </p>
  `;

  const html = wrapInstitutionalEmail('Application Received — Rakai Community School of Nursing', bodyContent);

  return dispatchAdmissionsEmail({
    to: app.email,
    subject: `Application Received: Rakai Community School of Nursing [Ref: ${app.application_number}]`,
    html,
    applicantName: app.full_name,
    applicationNumber: app.application_number,
  });
}

/**
 * 2. Interview Invitation Email
 */
export async function sendInterviewScheduledEmail(
  app: AdmissionApplicationRecord
): Promise<EmailDispatchResult> {
  if (!app.email) return { success: false, error: 'Applicant has no email address.' };

  const origin = getSiteOrigin();
  const trackUrl = `${origin}/admissions/track?id=${encodeURIComponent(app.application_number)}`;

  const bodyContent = `
    <span class="badge badge-amber">Interview Scheduled</span>
    <h2 class="h2">Official Selection Interview Invitation</h2>
    
    <p>Dear <strong>${app.first_name || app.full_name}</strong>,</p>
    
    <p>The Board of Admissions of <strong>Rakai Community School of Nursing</strong> has reviewed your academic qualifications and is pleased to invite you for an oral and practical admission interview.</p>
    
    <div class="card" style="border-left: 4px solid #b45309;">
      <div class="card-title" style="color: #b45309;">Interview Schedule Details</div>
      <table width="100%">
        <tr>
          <td style="padding: 4px 0; color: #64748b; font-size: 14px;"><strong>Interview Date:</strong></td>
          <td style="padding: 4px 0; color: #0f172a; font-size: 15px; font-weight: 700; text-align: right;">${app.interview_date || 'To be communicated'}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b; font-size: 14px;"><strong>Reporting Time:</strong></td>
          <td style="padding: 4px 0; color: #0f172a; font-size: 14px; font-weight: 600; text-align: right;">${app.interview_time || '08:30 AM EAT'}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b; font-size: 14px;"><strong>Campus Venue:</strong></td>
          <td style="padding: 4px 0; color: #0f172a; font-size: 14px; text-align: right;">${app.interview_venue || 'RCSN Main Campus, Rakai Town'}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b; font-size: 14px;"><strong>Interviewing Panel:</strong></td>
          <td style="padding: 4px 0; color: #0f172a; font-size: 14px; text-align: right;">${app.interview_panel || 'Senior Nursing Faculty Panel'}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b; font-size: 14px;"><strong>Applicant ID:</strong></td>
          <td style="padding: 4px 0; color: #1e40af; font-size: 14px; font-weight: 700; text-align: right;">${app.application_number}</td>
        </tr>
      </table>
    </div>

    <h3 style="font-size: 16px; margin: 24px 0 8px 0; color: #0f172a;">Mandatory Items to Bring to the Interview:</h3>
    <ul class="checklist">
      <li><strong>Original UNEB Result Slips:</strong> O-Level (UCE) / A-Level (UACE) certificates or certified copies.</li>
      <li><strong>Identification:</strong> Original National Identity Card (NIN), Valid Passport, or Former School Identity Card.</li>
      <li><strong>Photographs:</strong> Two (2) recent colored passport-size photographs.</li>
      <li><strong>Official Interview Slip:</strong> Download and print your personalized Interview Verification Slip from the link below.</li>
      <li><strong>Writing Materials:</strong> Blue/Black pens for the aptitude section.</li>
    </ul>

    <div style="margin: 28px 0; text-align: center;">
      <a href="${trackUrl}" class="btn btn-secondary">Download Interview Slip &rarr;</a>
      <a href="${trackUrl}" class="btn">View Live Status</a>
    </div>

    <p style="font-size: 13px; color: #64748b;">
      Please report punctually. Late arrival may lead to forfeiture of your interview session. If you have any scheduling conflicts, contact the admissions desk at <strong>+256 701 884 192</strong> immediately.
    </p>
  `;

  const html = wrapInstitutionalEmail('Interview Invitation — Rakai Community School of Nursing', bodyContent);

  return dispatchAdmissionsEmail({
    to: app.email,
    subject: `Interview Invitation: Rakai Community School of Nursing [Ref: ${app.application_number}]`,
    html,
    applicantName: app.full_name,
    applicationNumber: app.application_number,
  });
}

/**
 * 3. Provisional Admission Offer Email
 */
export async function sendAdmissionOfferEmail(
  app: AdmissionApplicationRecord
): Promise<EmailDispatchResult> {
  if (!app.email) return { success: false, error: 'Applicant has no email address.' };

  const origin = getSiteOrigin();
  const trackUrl = `${origin}/admissions/track?id=${encodeURIComponent(app.application_number)}`;
  const admittedProgram = app.admitted_program || (app.programs && app.programs[0]) || 'Certificate in Nursing';

  const bodyContent = `
    <span class="badge badge-success">Offer of Admission</span>
    <h2 class="h2">Congratulations! Provisional Admission Offer</h2>
    
    <p>Dear <strong>${app.first_name || app.full_name}</strong>,</p>
    
    <p>On behalf of the Governing Council and Academic Board of <strong>Rakai Community School of Nursing</strong>, we are pleased to inform you that you have been offered <strong>Provisional Admission</strong> for the upcoming academic year.</p>
    
    <div class="card" style="border-left: 4px solid #047857;">
      <div class="card-title" style="color: #047857;">Offer & Enrollment Specifics</div>
      <table width="100%">
        <tr>
          <td style="padding: 4px 0; color: #64748b; font-size: 14px;"><strong>Admitted Program:</strong></td>
          <td style="padding: 4px 0; color: #047857; font-size: 15px; font-weight: 700; text-align: right;">${admittedProgram}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b; font-size: 14px;"><strong>Admission Letter No:</strong></td>
          <td style="padding: 4px 0; color: #1e40af; font-size: 14px; font-weight: 700; text-align: right;">${app.admission_letter_number || `RCSN/ADM/${new Date().getFullYear()}/${app.application_number.slice(-4)}`}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b; font-size: 14px;"><strong>Reporting Intake:</strong></td>
          <td style="padding: 4px 0; color: #0f172a; font-size: 14px; text-align: right;">${app.intake || 'August/September 2026 Intake'}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b; font-size: 14px;"><strong>Residency Category:</strong></td>
          <td style="padding: 4px 0; color: #0f172a; font-size: 14px; text-align: right;">${app.residential_preference || 'Resident (Boarding)'}</td>
        </tr>
      </table>
    </div>

    <h3 style="font-size: 16px; margin: 24px 0 8px 0; color: #0f172a;">How to Secure Your Place:</h3>
    <ol class="checklist">
      <li><strong>Accept Your Offer Online:</strong> Click the button below to formally confirm your acceptance of the admission offer.</li>
      <li><strong>Download Your Admission Package:</strong> Print your official Provisional Admission Letter PDF, Fee Structure, and medical examination forms.</li>
      <li><strong>Complete Reporting Requirements:</strong> Prepare your medical clearance and report on the scheduled orientation date.</li>
    </ol>

    <div style="margin: 28px 0; text-align: center;">
      <a href="${trackUrl}" class="btn">Accept Offer Online &rarr;</a>
      <a href="${trackUrl}" class="btn btn-secondary">Download Admission Letter (PDF)</a>
    </div>

    <p style="font-size: 13px; color: #64748b;">
      We look forward to welcoming you to the RCSN family as you begin your honorable journey in professional healthcare and nursing!
    </p>
  `;

  const html = wrapInstitutionalEmail('Offer of Admission — Rakai Community School of Nursing', bodyContent);

  return dispatchAdmissionsEmail({
    to: app.email,
    subject: `OFFICIAL ADMISSION OFFER: Rakai Community School of Nursing [Ref: ${app.application_number}]`,
    html,
    applicantName: app.full_name,
    applicationNumber: app.application_number,
  });
}

/**
 * 4. Application Status Update / Waitlist Email
 */
export async function sendApplicationStatusEmail(
  app: AdmissionApplicationRecord,
  customMessage?: string
): Promise<EmailDispatchResult> {
  if (!app.email) return { success: false, error: 'Applicant has no email address.' };

  const origin = getSiteOrigin();
  const trackUrl = `${origin}/admissions/track?id=${encodeURIComponent(app.application_number)}`;

  const bodyContent = `
    <span class="badge badge-amber">Admissions Update</span>
    <h2 class="h2">Update on Your Application (${app.application_number})</h2>
    
    <p>Dear <strong>${app.first_name || app.full_name}</strong>,</p>
    
    <p>${customMessage || 'We are writing to provide you with an update regarding your admission application to Rakai Community School of Nursing.'}</p>
    
    <div class="card">
      <div class="card-title">Current Application Status</div>
      <p style="font-size: 15px; font-weight: 600; color: #b45309; margin: 0;">
        ${app.status.replace(/_/g, ' ').toUpperCase()}
      </p>
    </div>

    <p>You can check complete details, feedback notes, and any required action items by visiting our applicant portal.</p>

    <div style="margin: 28px 0; text-align: center;">
      <a href="${trackUrl}" class="btn">Check Application Status &rarr;</a>
    </div>
  `;

  const html = wrapInstitutionalEmail('Application Status Update — Rakai Community School of Nursing', bodyContent);

  return dispatchAdmissionsEmail({
    to: app.email,
    subject: `Admissions Update: Rakai Community School of Nursing [Ref: ${app.application_number}]`,
    html,
    applicantName: app.full_name,
    applicationNumber: app.application_number,
  });
}

/**
 * 5. Application Regret / Decision Email
 */
export async function sendApplicationRejectedEmail(
  app: AdmissionApplicationRecord,
  reason?: string
): Promise<EmailDispatchResult> {
  if (!app.email) return { success: false, error: 'Applicant has no email address.' };

  const bodyContent = `
    <h2 class="h2">Admissions Decision Notice</h2>
    
    <p>Dear <strong>${app.first_name || app.full_name}</strong>,</p>
    
    <p>Thank you for your interest in <strong>Rakai Community School of Nursing</strong> and for taking the time to submit your application for the ${app.intake || 'upcoming'} intake.</p>
    
    <p>After thorough review of all received applications against this cycle's entry quota and competitive requirements, we regret to inform you that we are unable to offer you admission at this time.</p>
    
    ${reason ? `<div class="card"><div class="card-title">Admissions Panel Note</div><p style="margin:0; font-size:14px; color:#334155;">${reason}</p></div>` : ''}

    <p>Admission to our health training programs is highly competitive due to laboratory and clinical ward capacity limits set by the Uganda Nurses and Midwives Examination Board (UNMEB).</p>
    
    <p>We encourage you to strengthen your academic profile and consider reapplying in our subsequent admission window. We wish you every success in your academic and professional endeavors.</p>
  `;

  const html = wrapInstitutionalEmail('Admissions Decision — Rakai Community School of Nursing', bodyContent);

  return dispatchAdmissionsEmail({
    to: app.email,
    subject: `Admissions Decision: Rakai Community School of Nursing [Ref: ${app.application_number}]`,
    html,
    applicantName: app.full_name,
    applicationNumber: app.application_number,
  });
}
