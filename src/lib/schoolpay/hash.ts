import { createHash } from 'crypto';

/** MD5 hex uppercase — SchoolPay Sync API request hash. */
export function schoolPayMd5Upper(input: string): string {
  return createHash('md5').update(input, 'utf8').digest('hex').toUpperCase();
}
