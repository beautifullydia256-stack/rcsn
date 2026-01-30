import { describe, it, expect } from 'vitest';
import { formatCurrency, calculateGrade } from './reportUtils';

describe('reportUtils', () => {
  describe('formatCurrency', () => {
    it('formats amount as UGX currency', () => {
      const result = formatCurrency(100000);
      expect(result).toMatch(/100[,.]?000/);
      expect(result).toMatch(/UGX|Shs|sh/);
    });
  });

  describe('calculateGrade', () => {
    it('returns A for 80%+', () => {
      const { grade } = calculateGrade(80, 100);
      expect(grade).toBe('A');
    });
    it('returns F for below 40%', () => {
      const { grade } = calculateGrade(30, 100);
      expect(grade).toBe('F');
    });
  });
});
