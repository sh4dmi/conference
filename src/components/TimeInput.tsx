import React, { useState } from 'react';

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function TimeInput({ value, onChange, className = '' }: TimeInputProps) {
  const [hours, minutes] = value.split(':').map(Number);
  const [isEditing, setIsEditing] = useState(false);

  const handleHoursChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newHours = e.target.value.padStart(2, '0');
    onChange(`${newHours}:${minutes.toString().padStart(2, '0')}`);
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMinutes = e.target.value.padStart(2, '0');
    onChange(`${hours.toString().padStart(2, '0')}:${newMinutes}`);
  };

  if (!isEditing) {
    return (
      <button
        className={`${className} text-left hover:bg-white/20 transition-colors`}
        onClick={() => setIsEditing(true)}
      >
        {value}
      </button>
    );
  }

  const selectClassName = `
    bg-white/10 text-white rounded px-2 py-1 
    appearance-none cursor-pointer hover:bg-white/20 
    transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
    [&::-webkit-inner-spin-button]:appearance-none
    [&::-webkit-calendar-picker-indicator]:hidden
    [&::-webkit-outer-spin-button]:appearance-none
    [-webkit-appearance:none]
    [-moz-appearance:textfield]
    [&::-ms-expand]:hidden
    w-[4ch]
    text-center
  `;
  
  const optionClassName = "bg-gray-800 text-white";

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <select
        value={hours}
        onChange={handleHoursChange}
        className={selectClassName}
        onBlur={() => setIsEditing(false)}
      >
        {Array.from({ length: 24 }, (_, i) => (
          <option key={i} value={i} className={optionClassName}>
            {i.toString().padStart(2, '0')}
          </option>
        ))}
      </select>
      <span>:</span>
      <select
        value={minutes}
        onChange={handleMinutesChange}
        className={selectClassName}
        onBlur={() => setIsEditing(false)}
      >
        {Array.from({ length: 60 }, (_, i) => (
          <option key={i} value={i} className={optionClassName}>
            {i.toString().padStart(2, '0')}
          </option>
        ))}
      </select>
    </div>
  );
} 