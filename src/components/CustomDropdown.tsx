'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

export type Option = {
  value: string;
  label: string;
};

type CustomDropdownProps = {
  options: Option[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  name?: string;
  id?: string;
  required?: boolean;
};

export default function CustomDropdown({
  options,
  value,
  defaultValue,
  onChange,
  placeholder = 'Select...',
  className = '',
  disabled = false,
  name,
  id,
  required = false
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(value ?? defaultValue ?? '');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync external value with internal value
  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (val: string) => {
    setInternalValue(val);
    setIsOpen(false);
    if (onChange) {
      onChange(val);
    }
  };

  const selectedOption = options.find(opt => opt.value === internalValue);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  return (
    <div className={`relative inline-block w-full ${className}`} ref={dropdownRef}>
      {/* Hidden input for form submission compatibility */}
      {name && (
        <input 
          type="hidden" 
          name={name} 
          id={id} 
          value={internalValue} 
          required={required} 
        />
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-tycoon-red transition-all ${
          disabled ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'cursor-pointer hover:bg-gray-50'
        }`}
      >
        <span className={`block truncate ${!selectedOption && !value ? 'text-gray-400' : 'text-gray-800'}`}>
          {displayLabel}
        </span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {placeholder && (
            <button
              type="button"
              className="w-full text-left px-4 py-2 text-sm text-gray-400 hover:bg-gray-50 transition-colors"
              onClick={() => handleSelect('')}
            >
              {placeholder}
            </button>
          )}
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                internalValue === option.value 
                  ? 'bg-gray-50 text-tycoon-charcoal font-semibold' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
