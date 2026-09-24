import React, { useState } from 'react';

export interface SearchableSelectOption {
  code: string;
  name: string;
}

interface SearchableSelectProps {
  id?: string;
  options: SearchableSelectOption[];
  value: string;
  onChange: (code: string) => void;
  placeholder: string;
  disabled?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  id,
  options,
  value,
  onChange,
  placeholder,
  disabled,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((o) => o.code === value);
  const displayValue = isOpen ? query : selectedOption?.name ?? '';
  const filteredOptions = query.trim()
    ? options.filter((o) => o.name.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        disabled={disabled}
        placeholder={placeholder}
        value={displayValue}
        onFocus={() => {
          setQuery('');
          setIsOpen(true);
        }}
        onBlur={() => setIsOpen(false)}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl disabled:bg-slate-100 disabled:text-slate-400"
      />
      {isOpen && !disabled && (
        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400">Nenhum resultado</div>
          ) : (
            filteredOptions.map((option) => (
              <button
                key={option.code}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(option.code);
                  setQuery('');
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-brand-50 hover:text-brand-700"
              >
                {option.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
