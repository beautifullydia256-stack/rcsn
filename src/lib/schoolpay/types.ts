/** Webhook envelope from SchoolPay (see https://www.schoolpay.co.ug/apidocumentation). */
export type SchoolPayWebhookPayload = {
  signature?: string;
  type?: string;
  payment?: SchoolPayPaymentRecord;
};

export type SchoolPayPaymentRecord = {
  amount?: string | number;
  paymentDateAndTime?: string;
  schoolpayReceiptNumber?: string;
  settlementBankCode?: string;
  sourceChannelTransDetail?: string;
  sourceChannelTransactionId?: string;
  sourcePaymentChannel?: string;
  studentName?: string;
  studentPaymentCode?: string;
  studentRegistrationNumber?: string;
  transactionCompletionStatus?: string;
  /** Supplementary / other fees */
  studentClass?: string;
  supplementaryFeeDescription?: string;
  supplementaryFeeId?: string;
  transactionCompletionDateAndTime?: string;
};

/** Sync API JSON response */
export type SchoolPaySyncResponse = {
  returnCode?: number;
  returnMessage?: string;
  transactions?: SchoolPayPaymentRecord[];
  supplementaryFeePayments?: SchoolPayPaymentRecord[];
};

export type SchoolPayIngestKind = 'SCHOOL_FEES' | 'OTHER_FEES';
