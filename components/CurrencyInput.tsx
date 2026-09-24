import React, { useEffect, useState } from 'react';
import { formatCurrency, parseCurrencyDigits } from '../lib/format';

interface CurrencyInputProps {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  className?: string;
  required?: boolean;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({ id, value, onChange, className, required }) => {
  const [display, setDisplay] = useState(() => formatCurrency(value));

  useEffect(() => {
    setDisplay(formatCurrency(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseCurrencyDigits(e.target.value);
    setDisplay(formatCurrency(parsed));
    onChange(parsed);
  };

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      required={required}
      value={display}
      onChange={handleChange}
      className={className}
    />
  );
};
