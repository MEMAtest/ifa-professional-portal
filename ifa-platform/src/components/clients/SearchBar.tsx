'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Search, X } from 'lucide-react';
import clientLogger from '@/lib/logging/clientLogger'

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (query: string) => Promise<void> | void;
  onClear?: () => void; // Add this new prop
  suggestions?: string[];
  loading?: boolean;
  placeholder?: string;
}

export default function SearchBar({
  value,
  onChange,
  onSearch,
  onClear, // Destructure the new prop
  suggestions = [],
  loading = false,
  placeholder = "Search clients..."
}: SearchBarProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    // If the input is cleared, call the onClear handler
    if (newValue === '' && onClear) {
      onClear();
    }
    setShowSuggestions(newValue.length > 0 && suggestions.length > 0);
  };

  const handleSearch = async () => {
    if (onSearch && value.trim()) {
      setIsSearching(true);
      try {
        await onSearch(value.trim());
      } catch (error) {
        clientLogger.error('Search failed:', error);
      } finally {
        setIsSearching(false);
      }
      setShowSuggestions(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    if (onSearch) {
      onSearch(suggestion);
    }
  };

  const handleClear = () => {
    onChange('');
    setShowSuggestions(false);
    // Call the onClear handler when the button is clicked
    if (onClear) {
      onClear();
    }
  };

  useEffect(() => {
    const handleClickOutside = () => setShowSuggestions(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full sm:max-w-md">
      <div className="relative flex items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            className="pl-10 pr-10"
            disabled={loading || isSearching}
          />
          {value && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {onSearch && (
          <Button
            onClick={handleSearch}
            disabled={!value.trim() || loading || isSearching}
            className="ml-2 shrink-0"
            size="sm"
          >
            {isSearching ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Suggestions dropdown and loading indicator... */}
    </div>
  );
}
