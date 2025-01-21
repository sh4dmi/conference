import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { logoList } from '../utils/logoList';

interface LogoSelectorProps {
  selectedLogo?: string;
  onSelect: (logo: string | undefined) => void;
}

function LogoSelector({ selectedLogo, onSelect }: LogoSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogos = logoList.filter(logo => 
    logo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="חפש לוגו..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg bg-black/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          dir="rtl"
        />
      </div>

      {/* Logo Grid */}
      <div className="grid grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto p-2">
        {/* No Logo Option */}
        <button
          onClick={() => onSelect(undefined)}
          className={`p-4 rounded-lg transition-all flex flex-col items-center justify-center ${
            !selectedLogo 
              ? 'bg-blue-500/30 ring-2 ring-blue-500' 
              : 'bg-black/20 hover:bg-black/30'
          }`}
        >
          <div className="w-24 h-24 flex items-center justify-center border-2 border-dashed border-gray-500 rounded-lg">
            <X size={32} className="text-gray-500" />
          </div>
          <p className="mt-2 text-sm text-center text-gray-300">ללא לוגו</p>
        </button>

        {filteredLogos.map(logo => (
          <button
            key={logo}
            onClick={() => onSelect(logo)}
            className={`p-4 rounded-lg transition-all ${
              selectedLogo === logo 
                ? 'bg-blue-500/30 ring-2 ring-blue-500' 
                : 'bg-black/20 hover:bg-black/30'
            }`}
          >
            <img
              src={`/logos/${logo}`}
              alt={logo}
              className="w-24 h-24 object-contain mx-auto"
            />
            <p className="mt-2 text-sm text-center text-gray-300" dir="rtl">
              {logo.replace('.png', '')}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

export default LogoSelector; 