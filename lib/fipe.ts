import { Vehicle } from '../types';

export interface FipeOption {
  code: string;
  name: string;
}

export interface FipeDetail {
  brand: string;
  model: string;
  modelYear: number;
  fuel: string;
  fuelAcronym: string;
  codeFipe: string;
  price: string;
  referenceMonth: string;
  vehicleType: number;
}

export function parseFipePrice(raw: string): number {
  const normalized = raw.replace(/[^\d,]/g, '').replace(',', '.');
  const value = Number(normalized);
  return Number.isFinite(value) ? value : 0;
}

export function mapFipeFuel(raw: string): Vehicle['fuel'] {
  const normalized = raw.trim().toLowerCase();
  if (normalized.includes('diesel')) return 'Diesel';
  if (normalized.includes('híbrido') || normalized.includes('hibrido')) return 'Híbrido';
  if (normalized.includes('elétrico') || normalized.includes('eletrico')) return 'Elétrico';
  if (normalized.includes('gasolina')) return 'Gasolina';
  return 'Flex';
}

export function splitFipeModel(raw: string): { model: string; version: string } {
  const trimmed = raw.trim();
  const tokens = trimmed.split(/\s+/);
  const displacementIndex = tokens.findIndex((token) => /^\d+[.,]\d+$/.test(token));
  const model = displacementIndex > 0 ? tokens.slice(0, displacementIndex).join(' ') : (tokens[0] ?? trimmed);
  return { model, version: trimmed };
}
