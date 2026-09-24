import { describe, it, expect } from 'vitest';
import { formatCurrency, parseCurrencyDigits } from './format';

describe('formatCurrency', () => {
  it('formats a whole number with cents', () => {
    expect(formatCurrency(129900)).toBe('R$ 129.900,00');
  });

  it('formats a value with cents', () => {
    expect(formatCurrency(4842.5)).toBe('R$ 4.842,50');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('R$ 0,00');
  });
});

describe('parseCurrencyDigits', () => {
  it('parses a typed digit string into a decimal value (cents from the right)', () => {
    expect(parseCurrencyDigits('12990000')).toBe(129900);
  });

  it('parses a short digit string as cents', () => {
    expect(parseCurrencyDigits('50')).toBe(0.5);
  });

  it('ignores non-digit characters already in a formatted string', () => {
    expect(parseCurrencyDigits('R$ 129.900,00')).toBe(129900);
  });

  it('returns 0 for an empty string', () => {
    expect(parseCurrencyDigits('')).toBe(0);
  });
});
