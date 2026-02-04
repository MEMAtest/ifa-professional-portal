// ===================================================================
// src/lib/utils.ts - PRODUCTION READY - Error Free Utilities
// ===================================================================

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import clientLogger from '@/lib/logging/clientLogger'

// ===================================================================
// CORE UTILITY FUNCTIONS
// ===================================================================

/**
 * Utility for merging Tailwind CSS classes safely
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ===================================================================
// IFA PLATFORM SPECIFIC UTILITIES - ✅ ADDED MISSING FUNCTIONS
// ===================================================================

/**
 * Get status color classes for client statuses
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'prospect': 'bg-blue-100 text-blue-800 border-blue-200',
    'active': 'bg-green-100 text-green-800 border-green-200',
    'review_due': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'inactive': 'bg-gray-100 text-gray-800 border-gray-200',
    'archived': 'bg-red-100 text-red-800 border-red-200',
    'completed': 'bg-green-100 text-green-800 border-green-200',
    'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'overdue': 'bg-red-100 text-red-800 border-red-200'
  }
  
  return colors[status.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200'
}

/**
 * Get risk level name from numeric level
 */
export function getRiskLevelName(level: number | string): string {
  const numLevel = typeof level === 'string' ? parseInt(level, 10) : level
  
  const names: Record<number, string> = {
    1: 'Conservative',
    2: 'Moderate', 
    3: 'Balanced',
    4: 'Adventurous',
    5: 'Speculative'
  }
  
  return names[numLevel] || 'Unknown'
}

/**
 * Get risk level color classes
 */
export function getRiskLevelColor(level: number | string): string {
  const numLevel = typeof level === 'string' ? parseInt(level, 10) : level
  
  const colors: Record<number, string> = {
    1: 'bg-green-100 text-green-800 border-green-200', // Conservative
    2: 'bg-blue-100 text-blue-800 border-blue-200',    // Moderate
    3: 'bg-yellow-100 text-yellow-800 border-yellow-200', // Balanced
    4: 'bg-orange-100 text-orange-800 border-orange-200', // Adventurous
    5: 'bg-red-100 text-red-800 border-red-200'        // Speculative
  }
  
  return colors[numLevel] || colors[3] // Default to balanced
}

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: string | Date | null | undefined): number {
  if (!dateOfBirth) return 0
  
  const birthDate = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth
  
  if (isNaN(birthDate.getTime())) return 0

  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  
  return Math.max(0, age) // Ensure non-negative age
}

// ===================================================================
// DATA PARSING UTILITIES - NULL SAFE
// ===================================================================

/**
 * Safely parse numeric values with comprehensive error handling
 */
export function parseNumericValue(value: any, defaultValue: number = 0): number {
  // Handle null/undefined
  if (value === null || value === undefined) return defaultValue;
  
  // Handle numbers
  if (typeof value === 'number') {
    return isNaN(value) || !isFinite(value) ? defaultValue : Math.max(0, value);
  }
  
  // Handle strings
  if (typeof value === 'string') {
    // Remove currency symbols, commas, and whitespace
    const cleaned = value.replace(/[£$,\s%]/g, '');
    if (cleaned === '') return defaultValue;
    
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) || !isFinite(parsed) ? defaultValue : Math.max(0, parsed);
  }
  
  // Handle boolean (edge case)
  if (typeof value === 'boolean') return value ? 1 : 0;
  
  // Default case
  return defaultValue;
}

/**
 * Safely parse string values with trimming
 */
export function parseStringValue(value: any, defaultValue: string = ''): string {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value.toString();
  return defaultValue;
}

/**
 * Safely parse integer values
 */
export function parseIntegerValue(value: any, defaultValue: number = 0): number {
  const parsed = parseInt(String(value), 10);
  return isNaN(parsed) ? defaultValue : Math.max(0, parsed);
}

/**
 * Safely parse boolean values
 */
export function parseBooleanValue(value: any, defaultValue: boolean = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return lower === 'true' || lower === '1' || lower === 'yes' || lower === 'on';
  }
  if (typeof value === 'number') return value > 0;
  return defaultValue;
}

/**
 * Safely parse array values
 */
export function parseArrayValue<T>(value: any, defaultValue: T[] = []): T[] {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return defaultValue;
  // Handle single values by wrapping in array
  return [value];
}

/**
 * Safely parse date values
 */
export function parseDateValue(value: any, defaultValue?: string): string {
  if (!value) return defaultValue || new Date().toISOString();
  
  if (typeof value === 'string') {
    try {
      const date = new Date(value);
      return isNaN(date.getTime()) ? (defaultValue || new Date().toISOString()) : date.toISOString();
    } catch {
      return defaultValue || new Date().toISOString();
    }
  }
  
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? (defaultValue || new Date().toISOString()) : value.toISOString();
  }
  
  return defaultValue || new Date().toISOString();
}

// ===================================================================
// FORMATTING UTILITIES - ERROR PROOF
// ===================================================================

/**
 * Format currency values safely
 */
export function formatCurrency(
  amount: number | null | undefined, 
  currency: string = 'GBP',
  options: Intl.NumberFormatOptions = {}
): string {
  const safeAmount = parseNumericValue(amount, 0);
  
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      ...options
    }).format(safeAmount);
  } catch (error) {
    // Fallback formatting if Intl fails
    return `£${safeAmount.toLocaleString()}`;
  }
}

/**
 * Format numbers safely with locale support
 */
export function formatNumber(
  value: number | null | undefined,
  options: Intl.NumberFormatOptions = {}
): string {
  const safeValue = parseNumericValue(value, 0);
  
  try {
    return new Intl.NumberFormat('en-GB', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      ...options
    }).format(safeValue);
  } catch (error) {
    // Fallback formatting if Intl fails
    return safeValue.toLocaleString();
  }
}

// UUID helper
export function isUUID(value?: string | null): boolean {
  if (!value) return false
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(value)
}

/**
 * Generate a UUID v4 safely across browsers (Safari may expose `crypto.randomUUID`
 * but throw "Not implemented on this platform").
 */
export function safeUUID(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch {
    // fall through to other strategies
  }

  try {
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(16)
      crypto.getRandomValues(bytes)
      // RFC4122 v4
      bytes[6] = (bytes[6] & 0x0f) | 0x40
      bytes[8] = (bytes[8] & 0x3f) | 0x80
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
    }
  } catch {
    // fall through to Math.random
  }

  // Last-resort non-crypto fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Best-effort clipboard write that won't throw/reject in unsupported browsers.
 * Returns `true` if the copy likely succeeded.
 */
export async function safeWriteToClipboard(text: string): Promise<boolean> {
  try {
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to legacy approach
  }

  try {
    if (typeof document === 'undefined') return false
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.top = '0'
    textarea.style.left = '0'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    textarea.setSelectionRange(0, textarea.value.length)
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}

/**
 * Format percentage values safely
 */
export function formatPercentage(
  value: number | null | undefined,
  decimals: number = 1
): string {
  const safeValue = parseNumericValue(value, 0);
  
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(safeValue / 100);
  } catch (error) {
    // Fallback formatting
    return `${safeValue.toFixed(decimals)}%`;
  }
}

/**
 * Format dates safely with locale support
 */
export function formatDate(
  dateValue: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {}
): string {
  if (!dateValue) return 'Not specified';
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    return new Intl.DateTimeFormat('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options
    }).format(date);
  } catch (error) {
    return 'Invalid date';
  }
}

/**
 * Format date as short string
 */
export function formatDateShort(dateValue: string | Date | null | undefined): string {
  return formatDate(dateValue, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format time safely
 */
export function formatTime(
  dateValue: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {}
): string {
  if (!dateValue) return 'Not specified';
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return 'Invalid time';
    
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      ...options
    }).format(date);
  } catch (error) {
    return 'Invalid time';
  }
}

/**
 * Format relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(dateValue: string | Date | null | undefined): string {
  if (!dateValue) return 'Never';
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffDays > 0) {
      return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
    } else if (diffHours > 0) {
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    } else if (diffMinutes > 0) {
      return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
    } else {
      return 'Just now';
    }
  } catch (error) {
    return 'Invalid date';
  }
}

// ===================================================================
// VALIDATION UTILITIES
// ===================================================================

/**
 * Validate email format
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate UK phone number
 */
export function isValidUKPhone(phone: string | null | undefined): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const ukPhoneRegex = /^(\+44|0)[1-9]\d{8,9}$/;
  return ukPhoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Validate UK postcode
 */
export function isValidUKPostcode(postcode: string | null | undefined): boolean {
  if (!postcode || typeof postcode !== 'string') return false;
  const postcodeRegex = /^[A-Z]{1,2}[0-9R][0-9A-Z]?\s?[0-9][A-Z]{2}$/i;
  return postcodeRegex.test(postcode.trim());
}

/**
 * Validate National Insurance number
 */
export function isValidNINumber(ni: string | null | undefined): boolean {
  if (!ni || typeof ni !== 'string') return false;
  const niRegex = /^[A-Z]{2}[0-9]{6}[A-Z]$/;
  return niRegex.test(ni.replace(/\s/g, '').toUpperCase());
}

/**
 * Check if a value is not empty
 */
export function isNotEmpty(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

// ===================================================================
// TEXT UTILITIES
// ===================================================================

/**
 * Capitalize first letter of a string
 */
export function capitalizeFirstLetter(str: string | null | undefined): string {
  if (!str || typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert text to title case
 */
export function toTitleCase(str: string | null | undefined): string {
  if (!str || typeof str !== 'string') return '';
  return str.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string | null | undefined, maxLength: number = 100): string {
  if (!text || typeof text !== 'string') return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Generate initials from a name
 */
export function getInitials(name: string | null | undefined): string {
  if (!name || typeof name !== 'string') return '';
  
  const words = name.trim().split(/\s+/);
  if (words.length === 0) return '';
  
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

/**
 * Clean and format phone number
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone || typeof phone !== 'string') return '';
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Handle UK mobile numbers
  if (digits.startsWith('44') && digits.length === 13) {
    const formatted = digits.replace(/^44/, '0');
    return formatted.replace(/(\d{5})(\d{3})(\d{3})/, '$1 $2 $3');
  }
  
  // Handle UK landline/mobile
  if (digits.startsWith('0') && digits.length === 11) {
    return digits.replace(/(\d{5})(\d{3})(\d{3})/, '$1 $2 $3');
  }
  
  // Return original if no pattern matches
  return phone;
}

// ===================================================================
// ARRAY UTILITIES
// ===================================================================

/**
 * Remove duplicates from array
 */
export function uniqueArray<T>(array: T[]): T[] {
  if (!Array.isArray(array)) return [];
  return [...new Set(array)];
}

/**
 * Group array by key
 */
export function groupBy<T, K extends keyof T>(array: T[], key: K): Record<string, T[]> {
  if (!Array.isArray(array)) return {};
  
  return array.reduce((groups, item) => {
    const groupKey = String(item[key]);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

/**
 * Sort array by key
 */
export function sortBy<T>(array: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] {
  if (!Array.isArray(array)) return [];
  
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

// ===================================================================
// OBJECT UTILITIES
// ===================================================================

/**
 * Deep merge objects safely
 */
export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target } as T;
  
  (Object.keys(source) as Array<keyof T>).forEach(key => {
    const sourceValue = source[key];
    const targetValue = target[key];
    
    if (sourceValue === undefined || sourceValue === null) {
      return;
    }
    
    if (typeof sourceValue === 'object' && !Array.isArray(sourceValue) && sourceValue !== null) {
      (result as any)[key] = deepMerge(targetValue as any || {}, sourceValue as any);
    } else {
      (result as any)[key] = sourceValue;
    }
  });
  
  return result;
}

/**
 * Pick properties from object
 */
export function pick<T extends Record<string, any>, K extends keyof T>(
  obj: T, 
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

/**
 * Omit properties from object
 */
export function omit<T extends Record<string, any>, K extends keyof T>(
  obj: T, 
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach(key => {
    delete (result as any)[key];
  });
  return result as Omit<T, K>;
}

// ===================================================================
// ASYNC UTILITIES
// ===================================================================

/**
 * Create a delay promise
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let attempt = 1;
  
  while (attempt <= maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      
      const delayMs = baseDelay * Math.pow(2, attempt - 1);
      await delay(delayMs);
      attempt++;
    }
  }
  
  throw new Error('Retry failed');
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// ===================================================================
// URL AND QUERY UTILITIES
// ===================================================================

/**
 * Build query string from object
 */
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(v => searchParams.append(key, String(v)));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });
  
  return searchParams.toString();
}

/**
 * Parse query string to object
 */
export function parseQueryString(queryString: string): Record<string, string | string[]> {
  const params = new URLSearchParams(queryString);
  const result: Record<string, string | string[]> = {};
  
  for (const [key, value] of params.entries()) {
    if (result[key]) {
      if (Array.isArray(result[key])) {
        (result[key] as string[]).push(value);
      } else {
        result[key] = [result[key] as string, value];
      }
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

// ===================================================================
// ERROR HANDLING UTILITIES
// ===================================================================

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Get error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message);
  }
  
  return 'An unknown error occurred';
}

/**
 * Check if error is a specific type
 */
export function isErrorOfType(error: unknown, type: string): boolean {
  return error instanceof Error && error.name === type;
}

// ===================================================================
// DEVELOPMENT UTILITIES
// ===================================================================

/**
 * Log values only in development
 */
export function devLog(...args: any[]): void {
  if (process.env.NODE_ENV === 'development') {
  }
}

/**
 * Assert condition in development
 */
export function devAssert(condition: boolean, message: string): void {
  if (process.env.NODE_ENV === 'development' && !condition) {
    clientLogger.error('Assertion failed:', message);
  }
}
