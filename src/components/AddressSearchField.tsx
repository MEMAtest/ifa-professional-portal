'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Search, MapPin } from 'lucide-react';

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  county: string;
  postcode: string;
  country: string;
}

export interface AddressSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect?: (address: Address) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  required?: boolean;
}

const AddressSearchField: React.FC<AddressSearchFieldProps> = ({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Enter postcode or address...",
  className = "",
  label,
  required = false
}) => {
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<Address[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchAddresses = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      // Use the API route for address search
      const response = await fetch(`/api/search-address?query=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error('Address search failed');
      }

      const data = await response.json();
      
      if (data.success && data.addresses) {
        setSuggestions(data.addresses);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
        if (data.error) {
          setError(data.error);
        }
      }
    } catch (error) {
      console.error('Address search error:', error);
      setError('Failed to search addresses. Please try again.');
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    // Debounce the search
    const timeoutId = setTimeout(() => {
      searchAddresses(newValue);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  const handleAddressSelect = (address: Address) => {
    const formattedAddress = `${address.line1}, ${address.city}, ${address.postcode}`;
    onChange(formattedAddress);
    onAddressSelect?.(address);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleManualSearch = () => {
    searchAddresses(value);
  };

  // Hide suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowSuggestions(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative flex items-center">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            value={value}
            onChange={handleInputChange}
            placeholder={placeholder}
            className="pl-10"
            required={required}
          />
        </div>
        
        <Button
          type="button"
          onClick={handleManualSearch}
          disabled={!value.trim() || isSearching}
          className="ml-2"
          size="sm"
        >
          {isSearching ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Loading indicator */}
      {isSearching && !error && (
        <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-white border border-gray-200 rounded-md shadow-sm">
          <div className="flex items-center space-x-2 text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
            <span className="text-sm">Searching addresses...</span>
          </div>
        </div>
      )}

      {/* Address suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
          {suggestions.map((address, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleAddressSelect(address)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {address.line1}
                  </div>
                  <div className="text-xs text-gray-500">
                    {address.city}, {address.county} {address.postcode}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {showSuggestions && suggestions.length === 0 && !isSearching && !error && value.length >= 3 && (
        <div className="absolute top-full left-0 right-0 mt-1 p-3 bg-white border border-gray-200 rounded-md shadow-sm text-center text-sm text-gray-500">
          No addresses found. Try a different search term.
        </div>
      )}
    </div>
  );
};

export default AddressSearchField;