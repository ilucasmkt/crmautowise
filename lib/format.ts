export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function parseCurrencyDigits(raw: string): number {
  const digitsOnly = raw.replace(/\D/g, '');
  const cents = digitsOnly ? parseInt(digitsOnly, 10) : 0;
  return cents / 100;
}
