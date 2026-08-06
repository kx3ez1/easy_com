'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface AutocompleteOption {
  id: string;
  label: string;
  sublabel?: string;
  data?: any;
}

interface AutocompleteProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string, selectedOption?: AutocompleteOption) => void;
  options: AutocompleteOption[];
  onSearch?: (query: string) => void;
  className?: string;
  required?: boolean;
}

export default function Autocomplete({
  label,
  placeholder = 'Type to search...',
  value,
  onChange,
  options,
  onSearch,
  className = '',
  required = false
}: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(
    opt =>
      opt.label.toLowerCase().includes(query.toLowerCase()) ||
      opt.id.toLowerCase().includes(query.toLowerCase()) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(query.toLowerCase()))
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    onChange(newQuery);
    if (onSearch) onSearch(newQuery);
    setIsOpen(true);
  };

  const handleSelect = (option: AutocompleteOption) => {
    setQuery(option.id);
    onChange(option.id, option);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              onChange('');
              setIsOpen(false);
            }}
            className="absolute right-2 top-2.5 text-xs text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="p-3 text-xs text-slate-400 text-center">No matching results found</div>
          ) : (
            filteredOptions.map((opt) => (
              <div
                key={opt.id}
                onClick={() => handleSelect(opt)}
                className="p-2.5 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors"
              >
                <div className="text-sm font-medium text-slate-800 flex justify-between items-center">
                  <span>{opt.label}</span>
                  <span className="text-xs text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">{opt.id}</span>
                </div>
                {opt.sublabel && <div className="text-xs text-slate-500 mt-0.5">{opt.sublabel}</div>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
