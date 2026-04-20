import { createHash } from 'crypto';

/** SHA256(apiPassword + schoolpayReceiptNumber) hex — webhook signature per SchoolPay docs. */
export function verifySchoolPayWebhookSignature(
  apiPassword: string,
  schoolpayReceiptNumber: string,
  signatureHex: string
): boolean {
  const expected = createHash('sha256')
    .update(apiPassword + schoolpayReceiptNumber, 'utf8')
    .digest('hex');
  const got = signatureHex.trim().toLowerCase();
  return got.length > 0 && expected === got;
}
