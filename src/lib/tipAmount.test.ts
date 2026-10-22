import { describe, expect, it } from "vitest";
import { isValidPlainDecimal, isWithinTipCeiling, isLargeTip } from "./tipAmount";

describe('Tip Amount Helpers (#205)', () => {
  describe('isValidPlainDecimal', () => {
    it('should accept plain non-negative decimal strings', () => {
      expect(isValidPlainDecimal('0')).toBe(true);
      expect(isValidPlainDecimal('50')).toBe(true);
      expect(isValidPlainDecimal('100.50')).toBe(true);
      expect(isValidPlainDecimal('0.99')).toBe(true);
    });

    it('should reject invalid or malformed inputs', () => {
      expect(isValidPlainDecimal('')).toBe(false);
      expect(isValidPlainDecimal('   ')).toBe(false);
      expect(isValidPlainDecimal('-5')).toBe(false);
      expect(isValidPlainDecimal('0x10')).toBe(false);
      expect(isValidPlainDecimal('1e2')).toBe(false);
      expect(isValidPlainDecimal('10.20.30')).toBe(false);
      expect(isValidPlainDecimal('abc')).toBe(false);
      expect(isValidPlainDecimal(null)).toBe(false);
      expect(isValidPlainDecimal(undefined)).toBe(false);
    });
  });

  describe('isWithinTipCeiling & isLargeTip boundaries', () => {
    it('should correctly handle 100 and 1000 boundaries', () => {
      expect(isWithinTipCeiling('1000')).toBe(true);
      expect(isWithinTipCeiling('1000.01')).toBe(false);
      expect(isWithinTipCeiling('-1')).toBe(false);

      expect(isLargeTip('100')).toBe(true);
      expect(isLargeTip('99.99')).toBe(false);
      expect(isLargeTip('1e2')).toBe(false); // exponential rejected
    });

    it.each(['abc', '100usd', 'NaN', 'Infinity', '-Infinity', '', '   ', null, undefined, NaN])(
      'rejects non-numeric input %s in both amount guards',
      (amount) => {
        expect(isWithinTipCeiling(amount)).toBe(false);
        expect(isLargeTip(amount)).toBe(false);
      },
    );
  });
});
