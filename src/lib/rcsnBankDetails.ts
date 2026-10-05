/**
 * Official Banking Details & Standard Functional Fees for Rakai Community School of Nursing (RCSN)
 * Sourced directly from the official institution fees circular.
 */

export interface SchoolBankAccount {
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch: string;
  firstPaymentMinAmount: number;
  minimumFirstPayment: string;
  bankCharge: number;
  bankChargeFormatted: string;
  policyNotes: string[];
}

export const RCSN_OFFICIAL_BANK_ACCOUNT: SchoolBankAccount = {
  bankName: 'Centenary Bank',
  accountName: 'RAKAI COMMUNITY SCHOOL OF NURSING',
  accountNumber: '3100035767',
  branch: 'Any branch across Uganda',
  firstPaymentMinAmount: 1000000,
  minimumFirstPayment: 'Shs. 1,000,000/=',
  bankCharge: 2300,
  bankChargeFormatted: 'Shs. 2,300/=',
  policyNotes: [
    'FIRST PAYMENT SHOULD BE SHS. 1,000,000 PLUS BANK CHARGE 2,300/=',
    'ALL FINANCIAL PAYMENTS / TRANSACTIONS SHOULD BE DONE OR DEPOSITED ON THE SCHOOL A/C.',
    'PAYMENTS MADE IN ANY OTHER FORM OTHER THAN THE ACCOUNT WILL NOT BE HONOURED.',
  ],
};

/**
 * Standard default functional fee items pre-populated across all semesters.
 * The institution administration can edit amounts, delete items not applicable
 * for a semester, or add new custom functional fees.
 */
export const RCSN_DEFAULT_FUNCTIONAL_ITEMS: string[] = [
  'Development fees',
  'Clinical placement',
  'Convocational fee',
  'E-Library',
  'Log book',
  'Medical insurance (non-refundable)',
  'UNASNM + Guild fee',
  'UHPAB HTIN fee',
  'Midwifery handbook',
  'Exam fees (Internal / External)',
  'T-shirt (2)',
  'School Uniforms (2)',
  'Identity card/tag',
  'Hymn book',
  'Sports',
  'Jik',
  'Hostel Accommodation',
  'Facilitation Fee',
];
