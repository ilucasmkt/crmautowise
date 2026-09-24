import { describe, it, expect } from 'vitest';
import { parseFipePrice, mapFipeFuel, splitFipeModel } from './fipe';

describe('parseFipePrice', () => {
  it('parses a standard FIPE price string', () => {
    expect(parseFipePrice('R$ 10.000,00')).toBe(10000);
  });

  it('parses a price with a single thousands group', () => {
    expect(parseFipePrice('R$ 4.842,00')).toBe(4842);
  });

  it('parses a large price with multiple thousand separators', () => {
    expect(parseFipePrice('R$ 189.450,50')).toBe(189450.5);
  });

  it('returns 0 for an unparseable string', () => {
    expect(parseFipePrice('indisponível')).toBe(0);
  });
});

describe('mapFipeFuel', () => {
  it('maps Gasolina', () => {
    expect(mapFipeFuel('Gasolina')).toBe('Gasolina');
  });

  it('maps Diesel', () => {
    expect(mapFipeFuel('Diesel')).toBe('Diesel');
  });

  it('maps Híbrido', () => {
    expect(mapFipeFuel('Híbrido')).toBe('Híbrido');
  });

  it('maps Elétrico', () => {
    expect(mapFipeFuel('Elétrico')).toBe('Elétrico');
  });

  it('falls back to Flex for Álcool', () => {
    expect(mapFipeFuel('Álcool')).toBe('Flex');
  });

  it('falls back to Flex for an unknown fuel string', () => {
    expect(mapFipeFuel('Gás Natural')).toBe('Flex');
  });
});

describe('splitFipeModel', () => {
  it('splits a model with engine displacement into model and full version', () => {
    const result = splitFipeModel('COROLLA XEI 2.0 Flex 16V Aut.');
    expect(result.model).toBe('COROLLA XEI');
    expect(result.version).toBe('COROLLA XEI 2.0 Flex 16V Aut.');
  });

  it('falls back to the first word when the string starts with a number', () => {
    const result = splitFipeModel('147 C/ CL');
    expect(result.model).toBe('147');
    expect(result.version).toBe('147 C/ CL');
  });

  it('keeps a single-word model as-is', () => {
    const result = splitFipeModel('Uno');
    expect(result.model).toBe('Uno');
    expect(result.version).toBe('Uno');
  });
});
